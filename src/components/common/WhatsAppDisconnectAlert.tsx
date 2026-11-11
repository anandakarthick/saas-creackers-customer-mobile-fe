import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@/theme';
import { spacing, borderRadius } from '@/theme/spacing';
import { http } from '@/services/api/client';
import { useAuthStore } from '@/store';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHECK_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Checks WhatsApp connection status every 30 minutes.
 * If disconnected, shows a floating alert popup matching the OrderAlertPopup style.
 * Once dismissed, won't reappear until the next 30-minute check.
 */
export const WhatsAppDisconnectAlert: React.FC = () => {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const [showAlert, setShowAlert] = useState(false);
  const dismissedRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const slideAnim = useRef(new Animated.Value(-300)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  const checkStatus = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      // Company setting (web Settings → Notifications → WhatsApp
      // Disconnected Popup). Off unless the company turns it on.
      const s = await http.get<any>('/admin/settings');
      const nf = s?.settings?.notifications || s?.notifications || {};
      if (nf.whatsappDisconnectPopup !== true) {
        setShowAlert(false);
        return;
      }
      const data = await http.get<any>('/admin/whatsapp/status');
      if (data?.status !== 'ready') {
        if (!dismissedRef.current) {
          setShowAlert(true);
        }
      } else {
        setShowAlert(false);
        dismissedRef.current = false;
      }
    } catch {
      // API error — don't show alert for network issues
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;

    // Initial check after a short delay so the alert shows
    // immediately if WhatsApp is already disconnected.
    const initialTimer = setTimeout(() => {
      checkStatus();
    }, 3000);

    // Then check every 30 minutes
    intervalRef.current = setInterval(() => {
      dismissedRef.current = false;
      checkStatus();
    }, CHECK_INTERVAL_MS);

    return () => {
      clearTimeout(initialTimer);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isAuthenticated, checkStatus]);

  // Animate in/out
  useEffect(() => {
    if (showAlert) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 80,
          friction: 12,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -300,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [showAlert, slideAnim, opacityAnim]);

  const handleDismiss = () => {
    setShowAlert(false);
    dismissedRef.current = true;
  };

  const handleReconnect = () => {
    setShowAlert(false);
    dismissedRef.current = true;
    navigation.navigate('Settings', { screen: 'WhatsAppConnection' });
  };

  if (!showAlert) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
        },
      ]}
      pointerEvents="box-none"
    >
      <View style={styles.card}>
        {/* Header gradient - red for warning */}
        <LinearGradient
          colors={['#ef4444', '#dc2626']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.header}
        >
          <View style={styles.headerLeft}>
            <View style={styles.iconContainer}>
              <Icon name="alert-circle" size={20} color="#fff" />
              <View style={styles.pulseDot} />
            </View>
            <View style={{ marginLeft: spacing[2] }}>
              <Text style={styles.headerTitle}>WHATSAPP DISCONNECTED</Text>
              <Text style={styles.headerTime}>Action Required</Text>
            </View>
          </View>
          <TouchableOpacity onPress={handleDismiss} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Icon name="close" size={20} color="rgba(255,255,255,0.8)" />
          </TouchableOpacity>
        </LinearGradient>

        {/* Body */}
        <View style={[styles.body, { backgroundColor: colors.surface.default }]}>
          {/* Icon + message */}
          <View style={styles.messageRow}>
            <View style={styles.wifiOffIcon}>
              <Icon name="wifi-off" size={28} color="#ef4444" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.messageTitle, { color: colors.text.primary }]}>
                WhatsApp is Not Connected
              </Text>
              <Text style={[styles.messageDesc, { color: colors.text.secondary }]}>
                Order notifications are not being sent to customers via WhatsApp.
              </Text>
            </View>
          </View>

          {/* Warning box */}
          <View style={styles.warningBox}>
            <Text style={styles.warningText}>
              <Text style={{ fontWeight: '700' }}>Impact: </Text>
              Customers won't receive order confirmations, shipping updates, or invoices via WhatsApp until reconnected.
            </Text>
          </View>

          {/* Action buttons */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.reconnectButton}
              onPress={handleReconnect}
              activeOpacity={0.8}
            >
              <Icon name="wifi" size={18} color="#fff" />
              <Text style={styles.reconnectButtonText}>Reconnect Now</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.dismissButton, { backgroundColor: colors.surface.variant, borderColor: colors.border.default }]}
              onPress={handleDismiss}
              activeOpacity={0.8}
            >
              <Text style={[styles.dismissButtonText, { color: colors.text.secondary }]}>Dismiss</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 40,
    left: 0,
    right: 0,
    zIndex: 9999,
    elevation: 9999,
    alignItems: 'center',
    paddingHorizontal: spacing[3],
  },
  card: {
    width: SCREEN_WIDTH - spacing[3] * 2,
    maxWidth: 420,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    position: 'relative',
  },
  pulseDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#facc15',
  },
  headerTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.5,
  },
  headerTime: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
  },
  body: {
    padding: spacing[4],
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[3],
    gap: spacing[3],
  },
  wifiOffIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fef2f2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  messageDesc: {
    fontSize: 12,
  },
  warningBox: {
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    marginBottom: spacing[4],
  },
  warningText: {
    fontSize: 11,
    color: '#92400e',
    lineHeight: 16,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  reconnectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[3],
    borderRadius: borderRadius.lg,
    gap: spacing[2],
    backgroundColor: '#10b981',
  },
  reconnectButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  dismissButton: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dismissButtonText: {
    fontSize: 13,
    fontWeight: '500',
  },
});
