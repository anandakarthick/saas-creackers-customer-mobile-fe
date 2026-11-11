import messaging, { FirebaseMessagingTypes } from '@react-native-firebase/messaging';
import notifee, { AndroidImportance, AndroidVisibility, EventType, AuthorizationStatus } from '@notifee/react-native';
import { Platform, PermissionsAndroid, NativeModules, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNotificationStore } from '@/store/notification.store';
import { useThemeStore, defaultThemeConfig } from '@/store/theme.store';
import { navigateFromOutside } from '@/navigation/navigationRef';
import { STORAGE_KEYS } from '@/constants';

export interface NotificationPayload {
  title?: string;
  body?: string;
  data?: Record<string, string>;
  orderId?: string;
  type?: 'order' | 'stock' | 'promotion' | 'system';
}

/**
 * Android channel ID — MUST match the one created in index.js.
 *
 * IMPORTANT: Android caches channel settings permanently. If you ever
 * change the sound, importance, or vibration you MUST bump the channel
 * ID (e.g. _v3, _v4) — otherwise the OS silently ignores the update.
 */
const CHANNEL_ID = 'orders_channel_v2';

/**
 * TTS module — speaks "New order received!" just like the web app's
 * SpeechSynthesis. Uses the native TtsModule (Kotlin) registered in
 * MainApplication so there's no third-party library dependency.
 */
const TtsModule = NativeModules.TtsModule;

/**
 * Native AlertModule — plays notification_sound.mp3 from res/raw,
 * vibrates, wakes the screen, and manages battery optimization.
 */
const AlertModule = NativeModules.AlertModule;

function speakText(text: string) {
  try {
    if (TtsModule?.speak) {
      TtsModule.speak(text);
    }
  } catch (e) {
    console.warn('TTS speak failed:', e);
  }
}

/**
 * Play the native notification sound (res/raw/notification_sound.mp3)
 * using Android's MediaPlayer with ALARM audio stream. This is
 * independent of the notification channel sound and ALWAYS plays,
 * even if notification volume is muted.
 */
function playNativeSound() {
  try {
    if (AlertModule?.playNotificationSound) {
      console.log('[NotificationService] Playing native sound via AlertModule');
      AlertModule.playNotificationSound();
    } else {
      console.warn('[NotificationService] AlertModule.playNotificationSound not available');
    }
  } catch (e) {
    console.warn('playNativeSound failed:', e);
  }
}

/**
 * Wake the device screen (even when locked / screen off).
 */
function wakeScreen() {
  try {
    if (AlertModule?.wakeScreen) {
      AlertModule.wakeScreen();
    }
  } catch (e) {
    console.warn('wakeScreen failed:', e);
  }
}

/**
 * Get the current theme colors from the store (works outside React).
 */
function getThemeColors(): { primaryColor: string; secondaryColor: string } {
  try {
    const config = useThemeStore.getState().themeConfig ?? defaultThemeConfig;
    return {
      primaryColor: config.primaryColor || '#DC2626',
      secondaryColor: config.secondaryColor || '#9333EA',
    };
  } catch (_) {
    return { primaryColor: '#DC2626', secondaryColor: '#9333EA' };
  }
}

/**
 * Show a call-screen-style overlay popup that works everywhere:
 * over other apps, on lock screen, in background.
 * Uses native WindowManager overlay via AlertModule.
 */
function showOrderOverlay(options: {
  title?: string;
  body?: string;
  orderNumber?: string;
  orderId?: string;
  total?: string;
  customerName?: string;
  itemsCount?: number;
  paymentMethod?: string;
}) {
  try {
    if (Platform.OS === 'android' && AlertModule?.showOrderOverlay) {
      const theme = getThemeColors();
      console.log('[NotificationService] Showing order overlay:', options.orderNumber, 'orderId:', options.orderId, 'theme:', theme);
      AlertModule.showOrderOverlay({
        title: options.title || 'New Order!',
        body: options.body || '',
        orderNumber: options.orderNumber || '',
        orderId: options.orderId || '',
        total: options.total || '',
        customerName: options.customerName || 'Customer',
        itemsCount: options.itemsCount || 1,
        paymentMethod: options.paymentMethod || '',
        primaryColor: theme.primaryColor,
        secondaryColor: theme.secondaryColor,
      });
    } else {
      // Fallback: just play sound + vibrate + wake screen
      playNativeSound();
      wakeScreen();
      if (AlertModule?.vibrate) AlertModule.vibrate();
    }
  } catch (e) {
    console.warn('showOrderOverlay failed:', e);
    // Fallback
    playNativeSound();
    wakeScreen();
  }
}

/**
 * Stop the looping alert sound and dismiss the native overlay.
 * Call this when the user taps "View Order" or "Dismiss" on the
 * in-app React Native popup (OrderAlertPopup).
 */
function stopOrderAlert() {
  try {
    if (Platform.OS === 'android') {
      if (AlertModule?.stopAlert) AlertModule.stopAlert();
      if (AlertModule?.dismissOrderOverlay) AlertModule.dismissOrderOverlay();
    }
  } catch (e) {
    console.warn('stopOrderAlert failed:', e);
  }
}

/**
 * Request the "Display over other apps" permission and check if
 * battery optimization is disabled. Should be called after login.
 */
async function requestOverlayAndBatteryPermissions() {
  if (Platform.OS !== 'android') return;
  try {
    // Check overlay permission
    if (AlertModule?.canDrawOverlays) {
      const canOverlay = await AlertModule.canDrawOverlays();
      if (!canOverlay && AlertModule?.requestOverlayPermission) {
        console.log('[NotificationService] Requesting overlay permission');
        AlertModule.requestOverlayPermission();
        // Wait a bit before showing battery optimization dialog
        await new Promise((r) => setTimeout(r, 3000));
      }
    }

    // Check battery optimization
    if (AlertModule?.isBatteryOptimizationDisabled) {
      const isDisabled = await AlertModule.isBatteryOptimizationDisabled();
      if (!isDisabled && AlertModule?.openBatteryOptimization) {
        console.log('[NotificationService] Opening battery optimization dialog');
        AlertModule.openBatteryOptimization();
      }
    }
  } catch (e) {
    console.warn('requestOverlayAndBatteryPermissions failed:', e);
  }
}

class NotificationService {
  private isInitialized = false;

  /**
   * Initialize the notification service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Request permission
      const hasPermission = await this.requestPermission();
      if (!hasPermission) {
        console.log('Notification permission denied');
        return;
      }

      // Get FCM token
      await this.getFCMToken();

      // Create Android notification channel (also created in index.js
      // for the killed-state handler, but re-creating is idempotent)
      if (Platform.OS === 'android') {
        await this.createNotificationChannel();
      }

      // Log battery optimization status for debugging.
      // The actual exemption dialog is shown after login (useAuth.ts).
      if (Platform.OS === 'android') {
        try {
          const isDisabled = await AlertModule?.isBatteryOptimizationDisabled?.();
          console.log('[NotificationService] Battery optimization disabled:', isDisabled);
        } catch (e) {
          // Non-critical
        }
      }

      // Set up FCM foreground + tap handlers.
      // NOTE: setBackgroundMessageHandler is registered in index.js
      // (must be at the top-level for killed-state to work).
      this.setupMessageHandlers();

      // Set up notifee foreground event handler (tap on displayed notification)
      this.setupNotifeeEventHandlers();

      this.isInitialized = true;
      console.log('Notification service initialized');
    } catch (error) {
      console.error('Failed to initialize notification service:', error);
    }
  }

  /**
   * Request notification permission
   */
  async requestPermission(): Promise<boolean> {
    try {
      if (Platform.OS === 'android' && Platform.Version >= 33) {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      }

      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      return enabled;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }

  /**
   * Get FCM token and store it
   */
  async getFCMToken(): Promise<string | null> {
    try {
      await messaging().registerDeviceForRemoteMessages();

      const token = await messaging().getToken();
      console.log('FCM Token:', token);

      useNotificationStore.getState().setFCMToken(token);

      messaging().onTokenRefresh((newToken) => {
        console.log('FCM Token refreshed:', newToken);
        useNotificationStore.getState().setFCMToken(newToken);
      });

      return token;
    } catch (error) {
      console.error('Error getting FCM token:', error);
      return null;
    }
  }

  /**
   * Create Android notification channel with custom sound and heads-up.
   */
  async createNotificationChannel(): Promise<void> {
    try {
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
      console.log('Notification channel created');
    } catch (error) {
      console.error('Error creating notification channel:', error);
    }
  }

  /**
   * Set up FCM message handlers for foreground and tap events.
   * Background/killed handler is in index.js.
   */
  setupMessageHandlers(): void {
    // ── Foreground ──
    messaging().onMessage(async (remoteMessage) => {
      console.log('Foreground message received:', remoteMessage);
      this.handleNotification(remoteMessage, 'foreground');
    });

    // ── Background / quit → user tapped the notification ──
    messaging().onNotificationOpenedApp((remoteMessage) => {
      console.log('Notification opened app:', remoteMessage);
      this.handleNotificationOpen(remoteMessage);
    });

    // ── App opened from quit state via notification tap ──
    messaging()
      .getInitialNotification()
      .then((remoteMessage) => {
        if (remoteMessage) {
          console.log('App opened from quit state:', remoteMessage);
          this.handleNotificationOpen(remoteMessage);
        }
      });

    // NOTE: setBackgroundMessageHandler is registered in index.js
    // (must be at top-level, before AppRegistry.registerComponent)
  }

  /**
   * Listen for notifee events (user tapping on a displayed local notification).
   */
  setupNotifeeEventHandlers(): void {
    notifee.onForegroundEvent(({ type, detail }) => {
      if (type === EventType.PRESS && detail.notification?.data) {
        const data = detail.notification.data as Record<string, string>;
        this.navigateToOrder(data);
      }
    });
  }

  /**
   * Display a heads-up local notification using notifee.
   * Works identically in foreground, background, and from the
   * killed-state background handler (index.js).
   */
  async displayLocalNotification(
    remoteMessage: FirebaseMessagingTypes.RemoteMessage,
  ): Promise<void> {
    const data = remoteMessage.data || {};
    const title =
      remoteMessage.notification?.title ||
      (data.title as string) ||
      'New Notification';
    const body =
      remoteMessage.notification?.body ||
      (data.body as string) ||
      (data.message as string) ||
      '';

    try {
      // Wake screen for FCM messages too
      wakeScreen();

      await notifee.displayNotification({
        title,
        body,
        data: (remoteMessage.data as Record<string, string>) || {},
        android: {
          channelId: CHANNEL_ID,
          importance: AndroidImportance.HIGH,
          visibility: AndroidVisibility.PUBLIC,
          sound: 'notification_sound',
          pressAction: { id: 'default' },
          smallIcon: 'ic_launcher',
          showTimestamp: true,
          fullScreenAction: { id: 'default' },
          lights: ['#FF6600', 300, 600],
          vibrationPattern: [300, 500],
        },
      });

    } catch (err) {
      console.warn('Failed to display local notification:', err);
    }

    // For order types, show native overlay with looping TTS
    const d = (remoteMessage.data as Record<string, string>) || {};
    const notifType = (d.type || '').toLowerCase();
    if (notifType === 'order' && Platform.OS === 'android') {
      try {
        const totalVal = d.total || '';
        const currency = d.currency || '₹';
        const formattedTotal = totalVal
          ? `${currency}${Number(totalVal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
          : '';
        showOrderOverlay({
          title: remoteMessage.notification?.title || (d.title as string) || 'New Order!',
          orderNumber: d.orderNumber || d.order_number || '',
          orderId: d.orderId || d.order_id || d.id || '',
          total: formattedTotal,
          customerName: d.customerName || d.customer_name || 'Customer',
          itemsCount: parseInt(d.itemsCount || d.distinctItems || '1', 10) || 1,
          paymentMethod: (d.paymentMethod || '').toUpperCase(),
        });
      } catch (_) {
        try { playNativeSound(); } catch (__) {}
      }
    } else {
      // Non-order: play sound once
      try { playNativeSound(); } catch (_) {}
    }
  }

  /**
   * Handle incoming notification (foreground).
   * Adds to Zustand store, shows a heads-up banner with sound,
   * and speaks "New order received!" via TTS (like the web app).
   */
  handleNotification(
    remoteMessage: FirebaseMessagingTypes.RemoteMessage,
    state: 'foreground' | 'background',
  ): void {
    const data = remoteMessage.data || {};
    const notification: NotificationPayload = {
      title: remoteMessage.notification?.title || (data.title as string),
      body: remoteMessage.notification?.body || (data.body as string) || (data.message as string),
      data: data as Record<string, string>,
      orderId: data.orderId as string | undefined,
      type: (data.type as NotificationPayload['type']) || 'system',
    };

    // Add to notification store
    useNotificationStore.getState().addNotification({
      id: remoteMessage.messageId || Date.now().toString(),
      type: notification.type || 'system',
      title: notification.title || 'New Notification',
      message: notification.body || '',
      isRead: false,
      data: notification.data,
      createdAt: new Date().toISOString(),
    });

    // Display a real heads-up notification with sound + native overlay
    if (state === 'foreground') {
      this.displayLocalNotification(remoteMessage);
    }
  }

  /**
   * Speak "New order received!" via TTS — mirrors the web app's
   * SpeechSynthesis announcement for new order notifications.
   */
  speakOrderAnnouncement(type?: string): void {
    if (type === 'order' || type === 'ORDER') {
      speakText('New order received!');
    }
  }

  /**
   * Handle notification tap/open — navigate to the relevant order.
   */
  handleNotificationOpen(remoteMessage: FirebaseMessagingTypes.RemoteMessage): void {
    const data = remoteMessage.data;

    // Store the navigation intent (consumed by screens)
    useNotificationStore.getState().setNavigationIntent({
      screen: data?.screen as string,
      params: data as Record<string, any>,
    });

    // Actually navigate
    this.navigateToOrder(data as Record<string, string> | undefined);
  }

  /**
   * Navigate to the order detail screen when an order notification is tapped.
   */
  private navigateToOrder(data?: Record<string, string>): void {
    if (!data) return;

    const orderId = data.orderId || data.order_id || data.id;
    if (orderId) {
      navigateFromOutside('Orders', undefined);
      // Small delay so the Orders stack mounts before pushing detail
      setTimeout(() => {
        navigateFromOutside('OrderDetail', { id: orderId });
      }, 300);
    }
  }

  /**
   * Show a local notification from in-app data (e.g. socket event).
   * Use this when a real-time event arrives via WebSocket and we
   * want the same heads-up + lock-screen + sound behaviour as FCM.
   *
   * This is the PRIMARY notification path for the mobile app because
   * Socket.IO events arrive in all app states where the JS thread
   * is alive (foreground + background). FCM is a backup for when
   * the app is killed.
   *
   * For ORDER type notifications, this shows a call-screen-style
   * overlay popup via the native OrderOverlayService — visible over
   * any app and on the lock screen, with sound and vibration.
   */
  async showLocalNotification(
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<void> {
    const type = data?.type?.toLowerCase();

    // ── STEP 1: Show the system notification FIRST (most important) ──
    // This MUST succeed before any overlay attempt. If the overlay
    // crashes, the user still gets the notification in the tray.
    try {
      if (Platform.OS === 'android') {
        await this.createNotificationChannel();
      }

      await notifee.displayNotification({
        title,
        body,
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
          lights: ['#FF6600', 300, 600],
          vibrationPattern: [300, 500],
        },
      });
      console.log('[NotificationService] Notification displayed:', title);
    } catch (err) {
      console.warn('[NotificationService] Failed to display notification:', err);
    }

    // ── STEP 2: Wake screen + play sound (always, for all types) ──
    try {
      wakeScreen();
    } catch (_) {}

    // ── STEP 3: For ORDER notifications, try overlay + looping TTS ──
    // Wrapped in its own try-catch so a crash here NEVER kills the app
    if (type === 'order' && Platform.OS === 'android') {
      try {
        showOrderOverlay({
          title,
          body,
          orderNumber: data?.orderNumber || data?.order_number || '',
          orderId: data?.orderId || data?.order_id || data?.id || '',
          total: data?.total || '',
          customerName: data?.customerName || data?.customer_name || 'Customer',
          itemsCount: parseInt(data?.itemsCount || data?.distinctItems || '1', 10) || 1,
          paymentMethod: (data?.paymentMethod || '').toUpperCase(),
        });
      } catch (overlayErr) {
        console.warn('[NotificationService] Overlay failed (non-fatal):', overlayErr);
        // Fallback: just play sound
        try { playNativeSound(); } catch (_) {}
      }
    } else {
      // Non-order: just play sound
      try { playNativeSound(); } catch (_) {}
    }
  }

  /**
   * Subscribe to a topic
   */
  async subscribeToTopic(topic: string): Promise<void> {
    try {
      await messaging().subscribeToTopic(topic);
      console.log(`Subscribed to topic: ${topic}`);
    } catch (error) {
      console.error(`Error subscribing to topic ${topic}:`, error);
    }
  }

  /**
   * Unsubscribe from a topic
   */
  async unsubscribeFromTopic(topic: string): Promise<void> {
    try {
      await messaging().unsubscribeFromTopic(topic);
      console.log(`Unsubscribed from topic: ${topic}`);
    } catch (error) {
      console.error(`Error unsubscribing from topic ${topic}:`, error);
    }
  }

  /**
   * Get the current FCM token
   */
  getCurrentToken(): string | null {
    return useNotificationStore.getState().fcmToken;
  }

  /**
   * Register device token with backend API.
   * Call this after user logs in.
   */
  async registerWithBackend(userId: string, branchId?: string): Promise<void> {
    const fcmToken = this.getCurrentToken();
    if (!fcmToken) {
      console.log('No FCM token available');
      return;
    }

    try {
      const { API_CONFIG } = require('@/config/api');
      const token = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
      const tenantSlug = await AsyncStorage.getItem(STORAGE_KEYS.TENANT_SLUG);

      console.log('Registering device — token:', !!token, 'slug:', tenantSlug, 'fcm:', fcmToken?.slice(0, 20));

      // Backend route is /admin/device-tokens/register
      const response = await fetch(`${API_CONFIG.BASE_URL}/admin/device-tokens/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(tenantSlug ? { 'X-Tenant-Slug': tenantSlug } : {}),
        },
        body: JSON.stringify({
          token: fcmToken,
          platform: Platform.OS,
          deviceId: `${Platform.OS}_${userId}`,
        }),
      });

      if (response.ok) {
        console.log('Device registered with backend');
      } else {
        console.warn('Device registration returned status:', response.status);
      }
    } catch (error) {
      // Non-fatal — the app works without push registration
      console.warn('Could not register device with backend:', error);
    }
  }

  /**
   * Unregister device from backend (call on logout)
   */
  async unregisterFromBackend(userId: string): Promise<void> {
    const fcmToken = this.getCurrentToken();
    if (!fcmToken) return;

    try {
      const { API_CONFIG } = require('@/config/api');
      const token = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
      const tenantSlug = await AsyncStorage.getItem(STORAGE_KEYS.TENANT_SLUG);

      // Backend route is /admin/device-tokens/unregister
      await fetch(`${API_CONFIG.BASE_URL}/admin/device-tokens/unregister`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(tenantSlug ? { 'X-Tenant-Slug': tenantSlug } : {}),
        },
        body: JSON.stringify({
          token: fcmToken,
        }),
      });

      console.log('Device unregistered from backend');
    } catch (error) {
      console.warn('Could not unregister device:', error);
    }
  }
}

export const notificationService = new NotificationService();
