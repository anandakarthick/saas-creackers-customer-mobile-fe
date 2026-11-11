/**
 * @format
 */

import { AppRegistry, Platform, NativeModules } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import notifee, { AndroidImportance, AndroidVisibility, EventType } from '@notifee/react-native';
import App from './App';
import { name as appName } from './app.json';

// ── Channel ID must match the one in notificationService.ts ──
// IMPORTANT: Bump this whenever you change sound/importance/vibration.
// Android caches channel settings permanently and ignores createChannel
// updates on an existing ID.
const CHANNEL_ID = 'orders_channel_v2';

/**
 * Ensure the Android notification channel exists.
 * Called once at module load so it's ready before any notification arrives
 * — including when the app is killed and a data-only FCM message triggers
 * the background handler below.
 */
async function ensureChannel() {
  if (Platform.OS !== 'android') return;
  try {
    // Delete the old channel (its sound setting is permanently cached
    // by Android and can't be updated — we need a fresh channel ID).
    try { await notifee.deleteChannel('orders_channel'); } catch {}

    await notifee.createChannel({
      id: CHANNEL_ID,
      name: 'Orders & Alerts',
      description: 'Notifications for new orders, stock alerts, and general updates',
      importance: AndroidImportance.HIGH,
      visibility: AndroidVisibility.PUBLIC,
      sound: 'notification_sound',
      vibration: true,
      lights: true,
      badge: true,
    });
    console.log('[ensureChannel] Channel created:', CHANNEL_ID, 'with sound: notification_sound');
  } catch (e) {
    console.warn('ensureChannel failed:', e);
  }
}
ensureChannel();

/**
 * Display a heads-up notification via Notifee.
 * Used by both the background handler and the foreground handler so the
 * same custom sound / wake-screen / lock-screen behaviour applies in
 * EVERY app state (foreground, background, killed, locked).
 */
async function showNotification(title, body, data) {
  try {
    await notifee.displayNotification({
      title: title || 'New Notification',
      body: body || '',
      data: data || {},
      android: {
        channelId: CHANNEL_ID,
        importance: AndroidImportance.HIGH,
        visibility: AndroidVisibility.PUBLIC,
        sound: 'notification_sound',
        pressAction: { id: 'default' },
        smallIcon: 'ic_launcher',
        showTimestamp: true,
        fullScreenAction: { id: 'default' },
        // Wake the device and light up the screen
        lights: ['#FF6600', 300, 600],
        vibrationPattern: [300, 500],
      },
    });
  } catch (err) {
    console.warn('showNotification failed:', err);
  }
}

// ── FCM Background & Killed-state handler ──────────────────────────
// This MUST be registered before AppRegistry.registerComponent.
// It runs in a headless JS context when the app is killed or in the
// background and a data-only FCM message arrives.
messaging().setBackgroundMessageHandler(async (remoteMessage) => {
  console.log('[BGHandler] FCM data message:', remoteMessage.messageId);

  const data = remoteMessage.data || {};
  const title =
    remoteMessage.notification?.title ||
    data.title ||
    'New Notification';
  const body =
    remoteMessage.notification?.body ||
    data.body ||
    data.message ||
    '';

  // Display the notification (custom sound + wake screen)
  await showNotification(title, body, data);

  // Show call-screen overlay + play sound natively (works in killed state)
  try {
    const AlertModule = NativeModules.AlertModule;
    const notifType = (data.type || '').toLowerCase();

    if (notifType === 'order' && AlertModule?.showOrderOverlay) {
      // Format the total with currency
      const totalRaw = data.total || '';
      const currency = data.currency || '₹';
      const formattedTotal = totalRaw
        ? `${currency}${Number(totalRaw).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
        : '';
      // Full overlay popup for order notifications
      AlertModule.showOrderOverlay({
        title: title,
        body: body,
        orderNumber: data.orderNumber || data.order_number || '',
        orderId: data.orderId || data.order_id || data.id || '',
        total: formattedTotal,
        customerName: data.customerName || data.customer_name || 'Customer',
        itemsCount: parseInt(data.itemsCount || data.distinctItems || '1', 10),
        paymentMethod: (data.paymentMethod || 'COD').toUpperCase(),
        primaryColor: data.primaryColor || '#DC2626',
        secondaryColor: data.secondaryColor || '#9333EA',
      });
    } else {
      // Non-order: wake screen + sound
      if (AlertModule?.wakeScreen) AlertModule.wakeScreen();
      if (AlertModule?.playNotificationSound) AlertModule.playNotificationSound();
    }
  } catch (e) {
    console.warn('[BGHandler] Native alert failed:', e);
  }
});

// ── Notifee background event handler (user taps notification) ──────
notifee.onBackgroundEvent(async ({ type, detail }) => {
  if (type === EventType.PRESS && detail.notification?.data) {
    console.log('Background notifee press:', detail.notification.data);
  }
});

AppRegistry.registerComponent(appName, () => App);
