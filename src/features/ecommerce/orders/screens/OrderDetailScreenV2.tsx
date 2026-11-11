import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  TouchableOpacity,
  FlatList,
  Platform,
} from 'react-native';
import ReactNativeBlobUtil from 'react-native-blob-util';
import { printInvoice } from '@/utils/printInvoice';
import { Text, Button, Divider, TextInput, Checkbox } from 'react-native-paper';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { Header } from '@/components/layout/Header';
import { Badge } from '@/components/common/Badge';
import { ConfirmationModal } from '@/components/common/ConfirmationModal';
import { useTheme } from '@/theme';
import { spacing, borderRadius } from '@/theme/spacing';
import { ordersApi, productsApi } from '@/services/api';
import { API_CONFIG, ENDPOINTS } from '@/config/api';
import { STORAGE_KEYS } from '@/constants';
import type { OrdersStackParamList } from '@/types/navigation';

type NavigationProp = NativeStackNavigationProp<OrdersStackParamList, 'OrderDetail'>;
type RouteProps = RouteProp<OrdersStackParamList, 'OrderDetail'>;

const formatCurrency = (amount: number) =>
  `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

const STATUS_VARIANTS: Record<string, 'success' | 'warning' | 'error' | 'info'> = {
  delivered: 'success',
  shipped: 'info',
  processing: 'info',
  confirmed: 'info',
  pending: 'warning',
  cancelled: 'error',
  refunded: 'error',
};

const ORDER_STATUSES = [
  { label: 'Pending', value: 'pending' },
  { label: 'Confirmed', value: 'confirmed' },
  { label: 'Processing', value: 'processing' },
  { label: 'Shipped', value: 'shipped' },
  { label: 'Delivered', value: 'delivered' },
  { label: 'Cancelled', value: 'cancelled' },
];

const PAYMENT_METHODS = [
  { label: 'Cash', value: 'CASH' },
  { label: 'Card', value: 'CARD' },
  { label: 'UPI', value: 'UPI' },
  { label: 'Bank Transfer', value: 'BANK_TRANSFER' },
  { label: 'Razorpay', value: 'RAZORPAY' },
];

function normalizeOrder(o: any) {
  return {
    id: String(o.id),
    orderNumber: o.orderNumber || '',
    status: (o.status || 'pending').toLowerCase(),
    paymentStatus: (o.paymentStatus || 'pending').toLowerCase(),
    paymentMethod: o.paymentMethod,
    createdAt: o.createdAt,
    subtotal: Number(o.subtotal || 0),
    discount: Number(o.discount || 0),
    tax: Number(o.tax || 0),
    shipping: Number(o.shipping || 0),
    packingCharges: Number(o.packingCharges || 0),
    total: Number(o.total || 0),
    couponCode: o.couponCode || '',
    amountPaid: o.amountPaid != null ? Number(o.amountPaid) : undefined,
    notes: o.notes || o.internalNotes || '',
    customer: o.customer
      ? {
          id: String(o.customer.id),
          name:
            o.shippingAddress?.name ||
            `${o.customer.firstName || ''} ${o.customer.lastName || ''}`.trim() ||
            o.customer.name ||
            'Guest',
          email: o.customer.email || '',
          phone: o.shippingAddress?.phone || o.customer.phone || '',
        }
      : null,
    shippingAddress: o.shippingAddress || o.address || null,
    commission: o.commission != null ? Number(o.commission) : null,
    statusHistory: o.statusHistory || o.timeline || [],
    items: (o.items || []).map((it: any) => ({
      id: String(it.id),
      productId: it.productId || it.product?.id || null,
      quantity: Number(it.quantity || 0),
      price: Number(it.price || 0),
      total: Number(it.total ?? it.subtotal ?? 0),
      status: it.status || 'active',
      product: it.product
        ? { id: String(it.product.id), name: it.name || it.product.name || 'Product' }
        : { id: '', name: it.name || 'Product' },
    })),
  };
}

export const OrderDetailScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { colors } = useTheme();
  const queryClient = useQueryClient();

  const orderId = route.params?.id;

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => ordersApi.getOrder(orderId),
    enabled: !!orderId,
  });

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [])
  );

  const [downloading, setDownloading] = useState(false);
  const [printingInvoice, setPrintingInvoice] = useState(false);
  const [sharingWhatsApp, setSharingWhatsApp] = useState(false);
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [cancelOrderModalVisible, setCancelOrderModalVisible] = useState(false);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [cancelNotes, setCancelNotes] = useState('');
  const [cancelRefundAmount, setCancelRefundAmount] = useState('');
  const [statusNotes, setStatusNotes] = useState('');
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editQty, setEditQty] = useState('');
  const [addItemModalVisible, setAddItemModalVisible] = useState(false);
  const [addItemSearch, setAddItemSearch] = useState('');
  const [cancelOrderRefund, setCancelOrderRefund] = useState('');

  // Payment modal state
  const [payMethod, setPayMethod] = useState('CASH');
  const [payAmount, setPayAmount] = useState('');
  const [payReference, setPayReference] = useState('');
  const [payNotes, setPayNotes] = useState('');
  const [payMethodPickerVisible, setPayMethodPickerVisible] = useState(false);

  const invalidateOrder = () => {
    queryClient.invalidateQueries({ queryKey: ['orders'] });
    queryClient.invalidateQueries({ queryKey: ['order', orderId] });
    queryClient.invalidateQueries({ queryKey: ['orderStats'] });
    queryClient.invalidateQueries({ queryKey: ['posSales'] });
    queryClient.invalidateQueries({ queryKey: ['posSale', orderId] });
  };

  const statusMutation = useMutation({
    mutationFn: (status: string) => ordersApi.updateOrderStatus(orderId, status, statusNotes),
    onSuccess: (res: any, status: string) => {
      if (res?.__offline) {
        setStatusModalVisible(false);
        Alert.alert('Queued', 'You are offline. The status change will sync when you are back online.');
        return;
      }
      // Show the new status immediately, then refetch the order and lists.
      queryClient.setQueryData(['order', orderId], (old: any) =>
        old ? { ...old, status: String(status).toUpperCase() } : old,
      );
      invalidateOrder();
      setStatusNotes('');
      setStatusModalVisible(false);
      Alert.alert('Status Updated', 'Order status has been updated successfully.');
    },
    onError: (err: any) => Alert.alert('Error', err?.message || 'Failed to update status'),
  });

  const paymentMutation = useMutation({
    mutationFn: () =>
      ordersApi.addOrderPayment(orderId, {
        method: payMethod,
        amount: Number(payAmount),
        reference: payReference.trim() || undefined,
        notes: payNotes.trim() || undefined,
      }),
    onSuccess: () => {
      invalidateOrder();
      setPaymentModalVisible(false);
      setPayAmount('');
      setPayReference('');
      setPayNotes('');
      Alert.alert('Payment Recorded', 'Payment has been added to the order.');
    },
    onError: (err: any) => Alert.alert('Error', err?.message || 'Failed to record payment'),
  });

  const cancelItemsMutation = useMutation({
    mutationFn: () =>
      ordersApi.cancelOrderItems(
        orderId,
        selectedItemIds.map((id) => Number(id)),
        {
          refundAmount: cancelRefundAmount ? Number(cancelRefundAmount) : undefined,
          notes: cancelNotes.trim() || undefined,
        },
      ),
    onSuccess: () => {
      invalidateOrder();
      setCancelModalVisible(false);
      setSelectedItemIds([]);
      setCancelNotes('');
      Alert.alert('Items Cancelled', 'Selected items have been cancelled and stock restored.');
    },
    onError: (err: any) => Alert.alert('Error', err?.message || 'Failed to cancel items'),
  });

  const updateQtyMutation = useMutation({
    mutationFn: ({ itemId, quantity }: { itemId: string; quantity: number }) =>
      ordersApi.updateOrderItemQuantity(orderId, itemId, quantity),
    onSuccess: () => {
      invalidateOrder();
      setEditingItemId(null);
      setEditQty('');
    },
    onError: (err: any) => Alert.alert('Error', err?.message || 'Failed to update quantity'),
  });

  const addItemMutation = useMutation({
    mutationFn: ({ productId, quantity }: { productId: number; quantity: number }) =>
      ordersApi.addOrderItem(orderId, productId, quantity),
    onSuccess: () => {
      invalidateOrder();
      setAddItemModalVisible(false);
      setAddItemSearch('');
      Alert.alert('Item Added', 'Product added to the order.');
    },
    onError: (err: any) => Alert.alert('Error', err?.message || 'Failed to add item'),
  });

  const { data: searchProducts } = useQuery({
    queryKey: ['productSearch', addItemSearch],
    queryFn: () => productsApi.getProducts({ search: addItemSearch, limit: 10 }),
    enabled: addItemModalVisible && addItemSearch.length >= 2,
  });

  const handleDownloadInvoice = async () => {
    setDownloading(true);
    try {
      const [token, tenantSlug] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN),
        AsyncStorage.getItem(STORAGE_KEYS.TENANT_SLUG),
      ]);
      if (!token) throw new Error('Not authenticated. Please log in again.');
      const base = API_CONFIG.BASE_URL.replace(/\/$/, '');
      const url = `${base}${ENDPOINTS.ORDERS}/${encodeURIComponent(String(orderId))}/invoice`;
      const headers: Record<string, string> = {
        Authorization: `Bearer ${token}`,
      };
      if (tenantSlug) headers['X-Tenant-Slug'] = tenantSlug;

      const res = await ReactNativeBlobUtil.config({
        fileCache: true,
        appendExt: 'pdf',
        addAndroidDownloads: {
          useDownloadManager: true,
          notification: true,
          title: `Invoice-Order-${orderId}.pdf`,
          description: 'Downloading invoice...',
          mime: 'application/pdf',
        },
      }).fetch('GET', url, headers);

      if (Platform.OS === 'ios') {
        ReactNativeBlobUtil.ios.openDocument(res.path());
      } else {
        Alert.alert('Invoice Downloaded', 'The invoice has been saved to your Downloads folder.');
      }
    } catch (err: any) {
      Alert.alert('Download Failed', err?.message || 'Could not download invoice');
    } finally {
      setDownloading(false);
    }
  };

  const handlePrintInvoice = async () => {
    setPrintingInvoice(true);
    try {
      await printInvoice(String(orderId));
    } catch (err: any) {
      Alert.alert('Print Failed', err?.message || 'Could not print invoice');
    } finally {
      setPrintingInvoice(false);
    }
  };

  const handleWhatsAppInvoice = async () => {
    setSharingWhatsApp(true);
    try {
      await ordersApi.sendWhatsAppInvoice(orderId);
      Alert.alert('Sent', 'Invoice sent to customer\'s WhatsApp');
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Could not send invoice via WhatsApp';
      Alert.alert('WhatsApp Failed', msg);
    } finally {
      setSharingWhatsApp(false);
    }
  };

  const toggleItemSelection = (itemId: string) => {
    setSelectedItemIds((prev) =>
      prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId],
    );
  };

  const openPaymentModal = (total: number, amountPaid?: number) => {
    const remaining = total - (amountPaid || 0);
    setPayAmount(remaining > 0 ? remaining.toFixed(2) : '');
    setPayMethod('CASH');
    setPayReference('');
    setPayNotes('');
    setPaymentModalVisible(true);
  };

  if (isLoading) {
    return (
      <ScreenWrapper>
        <Header title="Order" showBack />
        <View style={styles.notFound}>
          <ActivityIndicator size="large" color={colors.primary.main} />
        </View>
      </ScreenWrapper>
    );
  }

  if (isError || !data) {
    return (
      <ScreenWrapper>
        <Header title="Order Not Found" showBack />
        <View style={styles.notFound}>
          <Icon name="alert-circle-outline" size={64} color={colors.neutral[300]} />
          <Text style={[styles.notFoundText, { color: colors.text.secondary }]}>
            {isError ? String(error?.message || 'Failed to load') : 'Order not found'}
          </Text>
        </View>
      </ScreenWrapper>
    );
  }

  const order = normalizeOrder(data);
  const isCancelled = order.status === 'cancelled';
  const isDelivered = order.status === 'delivered';
  const canUpdateStatus = !isCancelled;
  const canRecordPayment = order.paymentStatus !== 'paid' && !isCancelled;
  const activeItems = order.items.filter(
    (it: any) => (it.status || 'active').toLowerCase() !== 'cancelled',
  );
  const canCancelItems = activeItems.length > 0 && !isCancelled;

  return (
    <ScreenWrapper scrollable={false}>
      <Header title={order.orderNumber} showBack />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {/* Status Timeline */}
        <View style={[styles.section, { backgroundColor: colors.surface.default }]}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Order Timeline</Text>
          <View style={styles.timeline}>
            {ORDER_STATUSES.map((s, idx) => {
              const statusIdx = ORDER_STATUSES.findIndex((os) => os.value === order.status);
              const isPast = idx <= statusIdx;
              const isCurrent = s.value === order.status;
              const dotColor = isCurrent
                ? colors.primary.main
                : isPast
                ? colors.success.main
                : colors.neutral[300];
              return (
                <View key={s.value} style={styles.timelineStep}>
                  <View style={styles.timelineTrack}>
                    <View style={[styles.timelineDot, { backgroundColor: dotColor }]}>
                      {isPast && !isCurrent && (
                        <Icon name="check" size={10} color="#fff" />
                      )}
                    </View>
                    {idx < ORDER_STATUSES.length - 1 && (
                      <View
                        style={[
                          styles.timelineLine,
                          { backgroundColor: isPast ? colors.success.main : colors.neutral[200] },
                        ]}
                      />
                    )}
                  </View>
                  <Text
                    style={[
                      styles.timelineLabel,
                      { color: isCurrent ? colors.primary.main : isPast ? colors.text.primary : colors.text.tertiary },
                      isCurrent && { fontWeight: '700' },
                    ]}
                  >
                    {s.label}
                  </Text>
                </View>
              );
            })}
          </View>
          <View style={[styles.row, { marginTop: spacing[3] }]}>
            <Text style={[styles.label, { color: colors.text.secondary }]}>Payment</Text>
            <Badge variant={order.paymentStatus === 'paid' ? 'success' : 'warning'}>
              {order.paymentStatus.toUpperCase()}
            </Badge>
          </View>
        </View>

        {/* Status block */}
        <View style={[styles.section, { backgroundColor: colors.surface.default }]}>
          <View style={styles.row}>
            <Text style={[styles.label, { color: colors.text.secondary }]}>Status</Text>
            <TouchableOpacity
              style={styles.statusTouchable}
              onPress={() => canUpdateStatus && setStatusModalVisible(true)}
              disabled={!canUpdateStatus}
            >
              <Badge variant={STATUS_VARIANTS[order.status] || 'info'}>
                {order.status.toUpperCase()}
              </Badge>
              {canUpdateStatus && (
                <Icon name="pencil" size={14} color={colors.text.tertiary} style={{ marginLeft: 4 }} />
              )}
            </TouchableOpacity>
          </View>
          <View style={styles.row}>
            <Text style={[styles.label, { color: colors.text.secondary }]}>Method</Text>
            <Text style={[styles.value, { color: colors.text.primary }]}>
              {order.paymentMethod?.toUpperCase() || '—'}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={[styles.label, { color: colors.text.secondary }]}>Placed</Text>
            <Text style={[styles.value, { color: colors.text.primary }]}>
              {new Date(order.createdAt).toLocaleDateString('en-IN')}
            </Text>
          </View>
        </View>

        {/* Customer */}
        <View style={[styles.section, { backgroundColor: colors.surface.default }]}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Customer</Text>
          <Text style={[styles.customerName, { color: colors.text.primary }]}>
            {order.customer?.name || '—'}
          </Text>
          {order.customer?.phone && (
            <Text style={[styles.subtle, { color: colors.text.secondary }]}>
              <Icon name="phone" size={12} /> {order.customer.phone}
            </Text>
          )}
          {order.customer?.email && (
            <Text style={[styles.subtle, { color: colors.text.secondary }]}>
              <Icon name="email" size={12} /> {order.customer.email}
            </Text>
          )}
        </View>

        {/* Shipping Address */}
        {order.shippingAddress && (
          <View style={[styles.section, { backgroundColor: colors.surface.default }]}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Shipping Address</Text>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
              <Icon name="map-marker" size={16} color={colors.text.tertiary} style={{ marginTop: 2 }} />
              <Text style={[styles.subtle, { color: colors.text.secondary, marginLeft: spacing[2], flex: 1 }]}>
                {typeof order.shippingAddress === 'string'
                  ? order.shippingAddress
                  : [
                      order.shippingAddress.address1 || order.shippingAddress.line1 || order.shippingAddress.address,
                      order.shippingAddress.address2 || order.shippingAddress.line2,
                      order.shippingAddress.city,
                      order.shippingAddress.state,
                      order.shippingAddress.pincode || order.shippingAddress.postalCode,
                    ]
                      .filter(Boolean)
                      .join(', ')}
              </Text>
            </View>
          </View>
        )}

        {/* Commission */}
        {order.commission != null && order.commission > 0 && (
          <View style={[styles.section, { backgroundColor: colors.surface.default }]}>
            <View style={styles.row}>
              <Text style={[styles.label, { color: colors.text.secondary }]}>Commission</Text>
              <Text style={[styles.value, { color: colors.primary.main, fontWeight: '700' }]}>
                {formatCurrency(order.commission)}
              </Text>
            </View>
          </View>
        )}

        {/* Items */}
        <View style={[styles.section, { backgroundColor: colors.surface.default }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
              Items ({order.items.length})
            </Text>
            <View style={{ flexDirection: 'row', gap: spacing[3] }}>
              {!isCancelled && (
                <TouchableOpacity onPress={() => setAddItemModalVisible(true)}>
                  <Text style={{ fontSize: 13, color: colors.primary.main }}>+ Add Item</Text>
                </TouchableOpacity>
              )}
              {canCancelItems && (
                <TouchableOpacity
                  onPress={() => {
                    setSelectedItemIds([]);
                    setCancelNotes('');
                    setCancelRefundAmount('');
                    setCancelModalVisible(true);
                  }}
                >
                  <Text style={{ fontSize: 13, color: colors.error.main }}>Cancel Items</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
          {order.items.map((item: any, idx: number) => {
            const itemCancelled = (item.status || 'active').toLowerCase() === 'cancelled';
            const isEditing = editingItemId === item.id;
            return (
              <View key={item.id}>
                {idx > 0 && <Divider style={styles.divider} />}
                <View style={[styles.itemRow, itemCancelled && { opacity: 0.5 }]}>
                  <View style={styles.itemInfo}>
                    <Text style={[styles.itemName, { color: colors.text.primary }]}>
                      {item.product?.name || 'Product'}
                      {itemCancelled ? ' (Cancelled)' : ''}
                    </Text>
                    {isEditing ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2], marginTop: 4 }}>
                        <TextInput
                          mode="outlined"
                          value={editQty}
                          onChangeText={setEditQty}
                          keyboardType="number-pad"
                          style={{ width: 60, height: 36, fontSize: 14 }}
                          dense
                        />
                        <Text style={[styles.subtle, { color: colors.text.secondary }]}>× {formatCurrency(item.price)}</Text>
                        <TouchableOpacity
                          onPress={() => {
                            const q = parseInt(editQty, 10);
                            if (!q || q < 1) { Alert.alert('Invalid', 'Enter a valid quantity'); return; }
                            updateQtyMutation.mutate({ itemId: item.id, quantity: q });
                          }}
                        >
                          <Icon name="check-circle" size={24} color={colors.success.main} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setEditingItemId(null)}>
                          <Icon name="close-circle" size={24} color={colors.neutral[400]} />
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <TouchableOpacity
                        onPress={() => {
                          if (!itemCancelled && !isCancelled) {
                            setEditingItemId(item.id);
                            setEditQty(String(item.quantity));
                          }
                        }}
                        disabled={itemCancelled || isCancelled}
                      >
                        <Text style={[styles.subtle, { color: colors.text.secondary }]}>
                          {item.quantity} × {formatCurrency(item.price)}
                          {!itemCancelled && !isCancelled ? '  ✏️' : ''}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  <Text style={[styles.itemTotal, { color: colors.text.primary }]}>
                    {formatCurrency(item.total)}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* Totals */}
        <View style={[styles.section, { backgroundColor: colors.surface.default }]}>
          <View style={styles.row}>
            <Text style={[styles.label, { color: colors.text.secondary }]}>Subtotal</Text>
            <Text style={[styles.value, { color: colors.text.primary }]}>
              {formatCurrency(order.subtotal)}
            </Text>
          </View>
          {order.discount > 0 && (
            <View style={styles.row}>
              <Text style={[styles.label, { color: colors.text.secondary }]}>
                Discount{order.couponCode ? ` (${order.couponCode})` : ''}
              </Text>
              <Text style={[styles.value, { color: colors.success.main }]}>
                -{formatCurrency(order.discount)}
              </Text>
            </View>
          )}
          {order.tax > 0 && (
            <View style={styles.row}>
              <Text style={[styles.label, { color: colors.text.secondary }]}>Tax</Text>
              <Text style={[styles.value, { color: colors.text.primary }]}>
                {formatCurrency(order.tax)}
              </Text>
            </View>
          )}
          {order.shipping > 0 && (
            <View style={styles.row}>
              <Text style={[styles.label, { color: colors.text.secondary }]}>Delivery</Text>
              <Text style={[styles.value, { color: colors.text.primary }]}>
                {formatCurrency(order.shipping)}
              </Text>
            </View>
          )}
          {order.packingCharges > 0 && (
            <View style={styles.row}>
              <Text style={[styles.label, { color: colors.text.secondary }]}>Packing Charges</Text>
              <Text style={[styles.value, { color: colors.text.primary }]}>
                {formatCurrency(order.packingCharges)}
              </Text>
            </View>
          )}
          <Divider style={styles.divider} />
          <View style={styles.row}>
            <Text style={[styles.totalLabel, { color: colors.text.primary }]}>Total</Text>
            <Text style={[styles.totalValue, { color: colors.primary.main }]}>
              {formatCurrency(order.total)}
            </Text>
          </View>
          {order.amountPaid != null && order.amountPaid < order.total && (
            <>
              <View style={styles.row}>
                <Text style={[styles.label, { color: colors.text.secondary }]}>Paid</Text>
                <Text style={[styles.value, { color: colors.success.main }]}>
                  {formatCurrency(order.amountPaid)}
                </Text>
              </View>
              <View style={styles.row}>
                <Text style={[styles.label, { color: colors.text.secondary }]}>Balance Due</Text>
                <Text style={[styles.value, { color: colors.error.main, fontWeight: '700' }]}>
                  {formatCurrency(order.total - order.amountPaid)}
                </Text>
              </View>
            </>
          )}
        </View>

        {/* Notes */}
        {order.notes && (
          <View style={[styles.section, { backgroundColor: colors.surface.default }]}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Notes</Text>
            <Text style={[styles.subtle, { color: colors.text.secondary }]}>{order.notes}</Text>
          </View>
        )}

        {/* Actions */}
        <View style={styles.actions}>
          {canRecordPayment && (
            <Button
              mode="contained"
              icon="cash-plus"
              onPress={() => openPaymentModal(order.total, order.amountPaid)}
            >
              Record Payment
            </Button>
          )}
          <Button
            mode={canRecordPayment ? 'outlined' : 'contained'}
            icon="download"
            onPress={handleDownloadInvoice}
            loading={downloading}
            disabled={downloading}
          >
            Download Invoice (PDF)
          </Button>
          <Button
            mode="outlined"
            icon="printer"
            onPress={handlePrintInvoice}
            loading={printingInvoice}
            disabled={printingInvoice || downloading}
          >
            Print Invoice
          </Button>
          <Button
            mode="outlined"
            icon="whatsapp"
            onPress={handleWhatsAppInvoice}
            loading={sharingWhatsApp}
            disabled={sharingWhatsApp}
          >
            WhatsApp Invoice
          </Button>
          {canUpdateStatus && !isCancelled && (
            <Button
              mode="outlined"
              icon="cancel"
              textColor={colors.error.main}
              onPress={() => {
                setCancelOrderRefund(String(order.total));
                setCancelOrderModalVisible(true);
              }}
            >
              Cancel Entire Order
            </Button>
          )}
        </View>
      </ScrollView>

      {/* Update Status Modal */}
      <Modal
        visible={statusModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setStatusModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setStatusModalVisible(false)}
        >
          <View style={[styles.modalContent, { backgroundColor: colors.surface.default }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border.default }]}>
              <Text style={[styles.modalTitle, { color: colors.text.primary }]}>
                Update Order Status
              </Text>
              <TouchableOpacity onPress={() => setStatusModalVisible(false)}>
                <Icon name="close" size={24} color={colors.text.secondary} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              <View style={{ padding: spacing[4] }}>
                <Text style={[styles.fieldLabel, { color: colors.text.secondary }]}>Internal Notes (optional)</Text>
                <TextInput
                  mode="outlined"
                  value={statusNotes}
                  onChangeText={setStatusNotes}
                  placeholder="Reason for status change"
                  multiline
                  numberOfLines={2}
                  style={styles.textInput}
                />
              </View>
              {ORDER_STATUSES.map((item) => {
                const isCurrentStatus = item.value === order.status;
                return (
                  <TouchableOpacity
                    key={item.value}
                    style={[
                      styles.optionItem,
                      { borderBottomColor: colors.border.default },
                      isCurrentStatus && { backgroundColor: colors.primary.light + '20' },
                    ]}
                    onPress={() => {
                      if (!isCurrentStatus) statusMutation.mutate(item.value);
                    }}
                    disabled={statusMutation.isPending}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
                      <Badge variant={STATUS_VARIANTS[item.value] || 'info'}>
                        {item.label.toUpperCase()}
                      </Badge>
                      {isCurrentStatus && (
                        <Text style={{ fontSize: 12, color: colors.text.tertiary }}>Current</Text>
                      )}
                    </View>
                    {statusMutation.isPending &&
                      statusMutation.variables === item.value && (
                        <ActivityIndicator size="small" color={colors.primary.main} />
                      )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Record Payment Modal */}
      <Modal
        visible={paymentModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPaymentModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setPaymentModalVisible(false)}
        >
          <View
            style={[styles.modalContent, { backgroundColor: colors.surface.default }]}
            onStartShouldSetResponder={() => true}
          >
            <View style={[styles.modalHeader, { borderBottomColor: colors.border.default }]}>
              <Text style={[styles.modalTitle, { color: colors.text.primary }]}>
                Record Payment
              </Text>
              <TouchableOpacity onPress={() => setPaymentModalVisible(false)}>
                <Icon name="close" size={24} color={colors.text.secondary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ padding: spacing[4] }}>
              <Text style={[styles.fieldLabel, { color: colors.text.secondary }]}>
                Payment Method
              </Text>
              <TouchableOpacity
                style={[styles.pickerButton, { borderColor: colors.border.default, backgroundColor: colors.surface.default }]}
                onPress={() => setPayMethodPickerVisible(true)}
              >
                <Text style={{ color: colors.text.primary, fontSize: 16 }}>
                  {PAYMENT_METHODS.find((m) => m.value === payMethod)?.label || payMethod}
                </Text>
                <Icon name="chevron-down" size={20} color={colors.text.tertiary} />
              </TouchableOpacity>

              <Text style={[styles.fieldLabel, { color: colors.text.secondary }]}>Amount *</Text>
              <TextInput
                mode="outlined"
                value={payAmount}
                onChangeText={setPayAmount}
                keyboardType="decimal-pad"
                placeholder="0.00"
                style={styles.textInput}
              />

              <Text style={[styles.fieldLabel, { color: colors.text.secondary }]}>
                Reference / Transaction ID
              </Text>
              <TextInput
                mode="outlined"
                value={payReference}
                onChangeText={setPayReference}
                placeholder="Optional"
                style={styles.textInput}
              />

              <Text style={[styles.fieldLabel, { color: colors.text.secondary }]}>Notes</Text>
              <TextInput
                mode="outlined"
                value={payNotes}
                onChangeText={setPayNotes}
                placeholder="Optional"
                multiline
                numberOfLines={2}
                style={styles.textInput}
              />

              <View style={styles.modalActions}>
                <Button
                  mode="outlined"
                  onPress={() => setPaymentModalVisible(false)}
                  style={{ flex: 1 }}
                >
                  Cancel
                </Button>
                <Button
                  mode="contained"
                  onPress={() => {
                    if (!payAmount || Number(payAmount) <= 0) {
                      Alert.alert('Validation', 'Please enter a valid amount.');
                      return;
                    }
                    paymentMutation.mutate();
                  }}
                  loading={paymentMutation.isPending}
                  disabled={paymentMutation.isPending}
                  style={{ flex: 2 }}
                >
                  Record Payment
                </Button>
              </View>
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Payment Method Picker Sub-modal */}
      <Modal
        visible={payMethodPickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPayMethodPickerVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setPayMethodPickerVisible(false)}
        >
          <View style={[styles.modalContent, { backgroundColor: colors.surface.default }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border.default }]}>
              <Text style={[styles.modalTitle, { color: colors.text.primary }]}>
                Payment Method
              </Text>
              <TouchableOpacity onPress={() => setPayMethodPickerVisible(false)}>
                <Icon name="close" size={24} color={colors.text.secondary} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={PAYMENT_METHODS}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.optionItem,
                    { borderBottomColor: colors.border.default },
                    item.value === payMethod && { backgroundColor: colors.primary.light + '20' },
                  ]}
                  onPress={() => {
                    setPayMethod(item.value);
                    setPayMethodPickerVisible(false);
                  }}
                >
                  <Text
                    style={{
                      fontSize: 16,
                      color: item.value === payMethod ? colors.primary.main : colors.text.primary,
                      fontWeight: item.value === payMethod ? '600' : '400',
                    }}
                  >
                    {item.label}
                  </Text>
                  {item.value === payMethod && (
                    <Icon name="check" size={20} color={colors.primary.main} />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Cancel Items Modal */}
      <Modal
        visible={cancelModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCancelModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setCancelModalVisible(false)}
        >
          <View
            style={[styles.modalContent, { backgroundColor: colors.surface.default }]}
            onStartShouldSetResponder={() => true}
          >
            <View style={[styles.modalHeader, { borderBottomColor: colors.border.default }]}>
              <Text style={[styles.modalTitle, { color: colors.text.primary }]}>
                Cancel Items
              </Text>
              <TouchableOpacity onPress={() => setCancelModalVisible(false)}>
                <Icon name="close" size={24} color={colors.text.secondary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ padding: spacing[4] }}>
              <Text style={{ fontSize: 13, color: colors.text.secondary, marginBottom: spacing[3] }}>
                Select items to cancel. Stock will be restored for cancelled items.
              </Text>
              {activeItems.map((item: any) => (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.cancelItem,
                    { borderColor: colors.border.default },
                    selectedItemIds.includes(item.id) && {
                      borderColor: colors.error.main,
                      backgroundColor: colors.error.main + '10',
                    },
                  ]}
                  onPress={() => toggleItemSelection(item.id)}
                >
                  <Checkbox.Android
                    status={selectedItemIds.includes(item.id) ? 'checked' : 'unchecked'}
                    onPress={() => toggleItemSelection(item.id)}
                    color={colors.error.main}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '500', color: colors.text.primary }}>
                      {item.product?.name || 'Product'}
                    </Text>
                    <Text style={{ fontSize: 12, color: colors.text.secondary }}>
                      {item.quantity} × {formatCurrency(item.price)} = {formatCurrency(item.total)}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}

              <Text style={[styles.fieldLabel, { color: colors.text.secondary, marginTop: spacing[3] }]}>
                Refund Amount (optional)
              </Text>
              <TextInput
                mode="outlined"
                value={cancelRefundAmount}
                onChangeText={setCancelRefundAmount}
                keyboardType="decimal-pad"
                placeholder="0.00"
                style={styles.textInput}
              />

              <Text style={[styles.fieldLabel, { color: colors.text.secondary }]}>
                Notes (optional)
              </Text>
              <TextInput
                mode="outlined"
                value={cancelNotes}
                onChangeText={setCancelNotes}
                placeholder="Reason for cancellation"
                multiline
                numberOfLines={2}
                style={styles.textInput}
              />

              <View style={styles.modalActions}>
                <Button
                  mode="outlined"
                  onPress={() => setCancelModalVisible(false)}
                  style={{ flex: 1 }}
                >
                  Close
                </Button>
                <Button
                  mode="contained"
                  buttonColor={colors.error.main}
                  onPress={() => {
                    if (selectedItemIds.length === 0) {
                      Alert.alert('Validation', 'Please select at least one item to cancel.');
                      return;
                    }
                    cancelItemsMutation.mutate();
                  }}
                  loading={cancelItemsMutation.isPending}
                  disabled={cancelItemsMutation.isPending || selectedItemIds.length === 0}
                  style={{ flex: 2 }}
                >
                  Cancel {selectedItemIds.length} Item{selectedItemIds.length !== 1 ? 's' : ''}
                </Button>
              </View>
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
      {/* Cancel Entire Order Modal */}
      <Modal
        visible={cancelOrderModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCancelOrderModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setCancelOrderModalVisible(false)}
        >
          <View
            style={[styles.modalContent, { backgroundColor: colors.surface.default }]}
            onStartShouldSetResponder={() => true}
          >
            <View style={[styles.modalHeader, { borderBottomColor: colors.border.default }]}>
              <Text style={[styles.modalTitle, { color: colors.text.primary }]}>Cancel Order</Text>
              <TouchableOpacity onPress={() => setCancelOrderModalVisible(false)}>
                <Icon name="close" size={24} color={colors.text.secondary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ padding: spacing[4] }}>
              <Text style={{ fontSize: 14, color: colors.text.secondary, marginBottom: spacing[3] }}>
                This will cancel the entire order and restore all stock.
              </Text>
              <Text style={[styles.fieldLabel, { color: colors.text.secondary }]}>Refund Amount</Text>
              <TextInput
                mode="outlined"
                value={cancelOrderRefund}
                onChangeText={setCancelOrderRefund}
                keyboardType="decimal-pad"
                placeholder="0.00"
                style={styles.textInput}
              />
              <Text style={[styles.fieldLabel, { color: colors.text.secondary }]}>Notes</Text>
              <TextInput
                mode="outlined"
                value={cancelNotes}
                onChangeText={setCancelNotes}
                placeholder="Reason for cancellation"
                multiline
                numberOfLines={2}
                style={styles.textInput}
              />
              <View style={styles.modalActions}>
                <Button mode="outlined" onPress={() => setCancelOrderModalVisible(false)} style={{ flex: 1 }}>
                  Back
                </Button>
                <Button
                  mode="contained"
                  buttonColor={colors.error.main}
                  onPress={() => {
                    setCancelOrderModalVisible(false);
                    statusMutation.mutate('cancelled');
                  }}
                  loading={statusMutation.isPending}
                  style={{ flex: 2 }}
                >
                  Cancel Order
                </Button>
              </View>
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Add Item Modal */}
      <Modal
        visible={addItemModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAddItemModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setAddItemModalVisible(false)}
        >
          <View
            style={[styles.modalContent, { backgroundColor: colors.surface.default }]}
            onStartShouldSetResponder={() => true}
          >
            <View style={[styles.modalHeader, { borderBottomColor: colors.border.default }]}>
              <Text style={[styles.modalTitle, { color: colors.text.primary }]}>Add Item</Text>
              <TouchableOpacity onPress={() => setAddItemModalVisible(false)}>
                <Icon name="close" size={24} color={colors.text.secondary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ padding: spacing[4] }}>
              <TextInput
                mode="outlined"
                value={addItemSearch}
                onChangeText={setAddItemSearch}
                placeholder="Search products..."
                style={styles.textInput}
                left={<TextInput.Icon icon="magnify" />}
              />
              {(searchProducts?.data || []).map((p: any) => (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.cancelItem, { borderColor: colors.border.default }]}
                  onPress={() => {
                    Alert.alert(
                      'Add to Order',
                      `Add "${p.name}" to this order?`,
                      [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Add (Qty 1)',
                          onPress: () => addItemMutation.mutate({ productId: p.id, quantity: 1 }),
                        },
                      ],
                    );
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '500', color: colors.text.primary }}>
                      {p.name}
                    </Text>
                    <Text style={{ fontSize: 12, color: colors.text.secondary }}>
                      {p.sku} · {formatCurrency(Number(p.price || 0))}
                    </Text>
                  </View>
                  <Icon name="plus-circle" size={24} color={colors.primary.main} />
                </TouchableOpacity>
              ))}
              {addItemSearch.length >= 2 && (searchProducts?.data || []).length === 0 && (
                <Text style={{ textAlign: 'center', color: colors.text.tertiary, marginTop: spacing[4] }}>
                  No products found
                </Text>
              )}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: spacing[4], paddingBottom: spacing[8] },
  section: {
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    marginBottom: spacing[3],
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  sectionTitle: { fontSize: 14, fontWeight: '700', marginBottom: spacing[3] },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing[1],
  },
  statusTouchable: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  label: { fontSize: 13 },
  value: { fontSize: 13, fontWeight: '500' },
  totalLabel: { fontSize: 15, fontWeight: '700' },
  totalValue: { fontSize: 18, fontWeight: '800' },
  customerName: { fontSize: 15, fontWeight: '600', marginBottom: spacing[1] },
  subtle: { fontSize: 12, marginTop: 2 },
  divider: { marginVertical: spacing[2] },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing[2],
  },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 14, fontWeight: '500', marginBottom: 2 },
  itemTotal: { fontSize: 14, fontWeight: '600' },
  actions: { gap: spacing[2], marginTop: spacing[2] },
  notFound: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  notFoundText: { fontSize: 16, marginTop: spacing[3] },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing[4],
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing[4],
    borderBottomWidth: 1,
  },
  fieldLabel: {
    fontSize: 12,
    marginBottom: spacing[1],
    marginLeft: spacing[1],
  },
  textInput: {
    marginBottom: spacing[3],
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    marginBottom: spacing[3],
    minHeight: 48,
  },
  cancelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing[2],
    marginBottom: spacing[2],
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing[3],
    marginTop: spacing[4],
    marginBottom: spacing[4],
  },
  timeline: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[1],
  },
  timelineStep: {
    alignItems: 'center',
    flex: 1,
  },
  timelineTrack: {
    alignItems: 'center',
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: spacing[1],
  },
  timelineDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  timelineLine: {
    position: 'absolute',
    height: 2,
    width: '100%',
    left: '50%',
    top: 9,
  },
  timelineLabel: {
    fontSize: 9,
    textAlign: 'center',
  },
});
