import { useEffect, useRef, useState } from 'react';
import { Platform, NativeModules } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth.store';
import { useNotificationStore } from '@/store/notification.store';
import { notificationsApi } from '@/services/api';
import { connectSocket, disconnectSocket, setupAppStateHandler } from '@/services/socket';
import { notificationService } from '@/services/notifications';
import { getStoreInfo } from '@/services/api/store.api';

export function useNotificationSocket() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const addNotification = useNotificationStore((s) => s.addNotification);
  const queryClient = useQueryClient();
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Resolve tenantId ──
  // The user object may lack tenantId if the user logged in on an older
  // version of the app. In that case, we fetch /store/info to get the
  // tenant ID and patch the user so future boots have it.
  const [resolvedTenantId, setResolvedTenantId] = useState<number | string | null>(
    (user as any)?.tenantId || (user as any)?.tenant_id || null
  );

  useEffect(() => {
    if (!isAuthenticated || !user) {
      setResolvedTenantId(null);
      return;
    }

    const tid = (user as any)?.tenantId || (user as any)?.tenant_id;
    if (tid) {
      console.log('[useNotificationSocket] tenantId found on user:', tid);
      setResolvedTenantId(tid);
      return;
    }

    // User has no tenantId — fetch it from /store/info
    console.log('[useNotificationSocket] No tenantId on user, fetching from store info...');
    getStoreInfo()
      .then((info) => {
        if (info?.id) {
          console.log('[useNotificationSocket] Got tenantId from store info:', info.id);
          setResolvedTenantId(info.id);
          // Patch the user object so the tenantId persists for next boot
          if (user) {
            setUser({ ...user, tenantId: info.id });
          }
        } else {
          console.warn('[useNotificationSocket] Store info returned no id');
        }
      })
      .catch((err) => {
        console.error('[useNotificationSocket] Failed to fetch store info for tenantId:', err);
      });
  }, [isAuthenticated, user, setUser]);

  useEffect(() => {
    if (!isAuthenticated || !token || !user || !resolvedTenantId) {
      if (isAuthenticated && !resolvedTenantId) {
        console.warn('[useNotificationSocket] Waiting for tenantId to be resolved...');
      }
      if (!isAuthenticated) {
        disconnectSocket();
        if (pollRef.current) clearInterval(pollRef.current);
      }
      return;
    }

    console.log('[useNotificationSocket] Connecting socket for tenant:', resolvedTenantId);
    const socket = connectSocket(token, resolvedTenantId);
    const cleanupAppState = setupAppStateHandler();

    // Log socket connection state
    socket.on('connect', () => {
      console.log('[useNotificationSocket] Socket connected, id:', socket.id);
    });
    socket.on('connect_error', (err: any) => {
      console.warn('[useNotificationSocket] Socket connect error:', err?.message || err);
    });
    socket.on('disconnect', (reason: string) => {
      console.log('[useNotificationSocket] Socket disconnected:', reason);
    });

    const handleNotification = (data: any) => {
      if (!data) return;

      console.log('[useNotificationSocket] Received new-notification:', JSON.stringify(data).slice(0, 300));

      const title = data.title || 'Notification';
      const message = data.message || '';
      const type = (data.type || 'system').toLowerCase();
      const notifData = data.data || {};

      // Add to in-app notification store
      addNotification({
        id: String(data.id || Date.now()),
        type: type as any,
        title,
        message,
        isRead: false,
        data: notifData,
        createdAt: data.createdAt || new Date().toISOString(),
      });

      // Show a system notification + native overlay (heads-up popup + lock screen + sound)
      const orderId = notifData.orderId || data.orderId || '';
      const orderNumber = notifData.orderNumber || data.orderNumber || '';
      const totalVal = notifData.total || data.total || '';
      const currency = notifData.currency || '₹';
      const formattedTotal = totalVal
        ? `${currency}${Number(totalVal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
        : '';

      notificationService.showLocalNotification(
        title,
        message,
        {
          ...notifData,
          type,
          orderId,
          orderNumber,
          total: formattedTotal,
          customerName: notifData.customerName || data.customerName || 'Customer',
          customerPhone: notifData.customerPhone || data.customerPhone || '',
          itemsCount: String(notifData.itemsCount || notifData.distinctItems || data.itemsCount || 1),
          paymentMethod: (notifData.paymentMethod || data.paymentMethod || '').toUpperCase(),
        },
      );
    };

    socket.on('new-notification', handleNotification);

    // Also listen for new-order events specifically (some backends emit
    // a dedicated event for new online orders)
    const handleNewOrder = (data: any) => {
      if (!data) return;

      console.log('[useNotificationSocket] Received new-order:', JSON.stringify(data).slice(0, 300));

      const orderNumber = data.orderNumber || data.order_number || '';
      const totalRaw = data.total || 0;
      const totalFormatted = totalRaw
        ? `₹${Number(totalRaw).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
        : '';
      const title = 'New Order Received!';
      const message = orderNumber
        ? `Order ${orderNumber}${totalFormatted ? ` - ${totalFormatted}` : ''}`
        : 'A new online order has been placed.';

      const orderId = String(data.id || data.orderId || '');

      addNotification({
        id: String(data.id || Date.now()),
        type: 'order',
        title,
        message,
        isRead: false,
        data: { orderId },
        createdAt: new Date().toISOString(),
      });

      const customerName =
        data.customerName ||
        (data.customer
          ? `${data.customer.firstName || ''} ${data.customer.lastName || ''}`.trim()
          : 'Customer');

      notificationService.showLocalNotification(title, message, {
        orderId,
        type: 'order',
        orderNumber,
        total: totalFormatted,
        customerName,
        customerPhone: data.customerPhone || data.customer?.phone || '',
        itemsCount: String(data.itemsCount || data.items?.length || 1),
        paymentMethod: (data.paymentMethod || '').toUpperCase(),
      });
    };

    socket.on('new-order', handleNewOrder);

    // Listen for order-status-updated so the orders list and detail
    // pages refresh automatically when a status change happens (from
    // web admin or another device).
    const handleOrderStatusUpdated = (data: any) => {
      console.log('[useNotificationSocket] Received order-status-updated:', JSON.stringify(data).slice(0, 200));
      // Invalidate React Query caches so the UI refreshes
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      if (data?.orderId || data?.id) {
        queryClient.invalidateQueries({ queryKey: ['order', String(data.orderId || data.id)] });
      }
    };
    socket.on('order-status-updated', handleOrderStatusUpdated);

    // Also invalidate orders on any notification (status updates may
    // arrive as generic notifications depending on backend config)
    const handleGenericRefresh = () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    };
    socket.on('order-updated', handleGenericRefresh);

    // Polling fallback for unread count (every 30s)
    pollRef.current = setInterval(async () => {
      try {
        await notificationsApi.getUnreadCount();
      } catch {}
    }, 30000);

    return () => {
      socket.off('connect');
      socket.off('connect_error');
      socket.off('disconnect');
      socket.off('new-notification', handleNotification);
      socket.off('new-order', handleNewOrder);
      socket.off('order-status-updated', handleOrderStatusUpdated);
      socket.off('order-updated', handleGenericRefresh);
      cleanupAppState();
      if (pollRef.current) clearInterval(pollRef.current);
      disconnectSocket();
    };
  }, [isAuthenticated, token, resolvedTenantId, addNotification, queryClient]);
}
