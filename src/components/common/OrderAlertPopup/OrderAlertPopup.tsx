import React, { useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Animated,
  Dimensions,
  Platform,
  NativeModules,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { useNotificationStore, type OrderAlertData } from '@/store/notification.store';
import { useTheme } from '@/theme';
import { spacing, borderRadius } from '@/theme/spacing';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const AUTO_DISMISS_MS = 15000; // 15 seconds

/**
 * Floating "NEW ORDER" popup that mirrors the web admin's order alert modal.
 * Renders on top of every screen when `orderAlert` is set in the store.
 */
export const OrderAlertPopup: React.FC = () => {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const alert = useNotificationStore((s) => s.orderAlert);
  const dismiss = useNotificationStore((s) => s.dismissOrderAlert);

  const slideAnim = useRef(new Animated.Value(-300)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (alert) {
      // Slide in from top
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

      // Auto-dismiss after 15s (also stop native alert loop)
      timerRef.current = setTimeout(() => {
        dismiss();
        if (Platform.OS === 'android') {
          try {
            const AlertModule = NativeModules.AlertModule;
            if (AlertModule?.stopAlert) AlertModule.stopAlert();
            if (AlertModule?.dismissOrderOverlay) AlertModule.dismissOrderOverlay();
          } catch (_) {}
        }
      }, AUTO_DISMISS_MS);
    } else {
      // Slide out
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

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [alert, slideAnim, opacityAnim, dismiss]);

  if (!alert) return null;

  const handleViewOrder = () => {
    dismiss();
    // Stop the native looping alert sound and overlay
    stopNativeAlert();
    // Navigate to Orders stack → OrderDetail screen
    navigation.navigate('Orders', { screen: 'OrderDetail', params: { id: alert.orderId } });
  };

  const handleDismiss = () => {
    dismiss();
    // Stop the native looping alert sound and overlay
    stopNativeAlert();
  };

  /** Stop the native TTS loop + dismiss overlay on Android */
  function stopNativeAlert() {
    if (Platform.OS === 'android') {
      try {
        const AlertModule = NativeModules.AlertModule;
        if (AlertModule?.stopAlert) AlertModule.stopAlert();
        if (AlertModule?.dismissOrderOverlay) AlertModule.dismissOrderOverlay();
      } catch (_) {}
    }
  }

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
        {/* Header gradient */}
        <LinearGradient
          colors={[colors.primary.main, colors.primary.dark || colors.secondary.main]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.header}
        >
          <View style={styles.headerLeft}>
            <Icon name="bell-ring" size={20} color="#fff" />
            <View style={{ marginLeft: spacing[2] }}>
              <Text style={styles.headerTitle}>NEW ORDER</Text>
              <Text style={styles.headerTime}>just now</Text>
            </View>
          </View>
          <TouchableOpacity onPress={handleDismiss} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Icon name="close" size={20} color="rgba(255,255,255,0.8)" />
          </TouchableOpacity>
        </LinearGradient>

        {/* Body */}
        <View style={[styles.body, { backgroundColor: colors.surface.default }]}>
          {/* Order number + total */}
          <View style={styles.orderRow}>
            <View>
              <Text style={[styles.orderLabel, { color: colors.text.tertiary }]}>ORDER</Text>
              <Text style={[styles.orderNumber, { color: colors.text.primary }]}>
                #{alert.orderNumber}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[styles.orderLabel, { color: colors.text.tertiary }]}>TOTAL</Text>
              <Text style={[styles.totalAmount, { color: colors.primary.main }]}>
                {alert.total}
              </Text>
            </View>
          </View>

          {/* Customer info */}
          <View style={[styles.customerRow, { backgroundColor: colors.background.default, borderColor: colors.border.default }]}>
            <Icon name="account-outline" size={18} color={colors.text.secondary} />
            <Text style={[styles.customerName, { color: colors.text.primary }]}>
              {alert.customerName}
            </Text>
            {alert.customerPhone ? (
              <>
                <Icon name="phone-outline" size={14} color={colors.text.tertiary} style={{ marginLeft: spacing[2] }} />
                <Text style={[styles.customerPhone, { color: colors.text.secondary }]}>
                  {alert.customerPhone}
                </Text>
              </>
            ) : null}
          </View>

          {/* Items + payment info */}
          <View style={styles.metaRow}>
            <View style={[styles.metaItem, { backgroundColor: colors.background.default, borderColor: colors.border.default }]}>
              <Icon name="package-variant-closed" size={16} color={colors.text.tertiary} />
              <View style={{ marginLeft: spacing[1] }}>
                <Text style={[styles.metaLabel, { color: colors.text.tertiary }]}>Items</Text>
                <Text style={[styles.metaValue, { color: colors.text.primary }]}>
                  {alert.itemsCount} unit{alert.itemsCount !== 1 ? 's' : ''}
                </Text>
              </View>
            </View>
            {!!alert.paymentMethod && (
            <View style={[styles.metaItem, { backgroundColor: colors.background.default, borderColor: colors.border.default }]}>
              <Icon name="credit-card-outline" size={16} color={colors.text.tertiary} />
              <View style={{ marginLeft: spacing[1] }}>
                <Text style={[styles.metaLabel, { color: colors.text.tertiary }]}>Payment</Text>
                <Text style={[styles.metaValue, { color: colors.text.primary }]}>
                  {alert.paymentMethod}
                </Text>
              </View>
            </View>
            )}
          </View>

          {/* Action buttons */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.viewButton, { backgroundColor: colors.primary.main }]}
              onPress={handleViewOrder}
              activeOpacity={0.8}
            >
              <Icon name="eye-outline" size={18} color="#fff" />
              <Text style={styles.viewButtonText}>View Order</Text>
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
  headerTitle: {
    fontSize: 14,
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
  orderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing[3],
  },
  orderLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  orderNumber: {
    fontSize: 18,
    fontWeight: '700',
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: '800',
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    marginBottom: spacing[3],
  },
  customerName: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: spacing[2],
  },
  customerPhone: {
    fontSize: 12,
    marginLeft: spacing[1],
  },
  metaRow: {
    flexDirection: 'row',
    gap: spacing[2],
    marginBottom: spacing[3],
  },
  metaItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  metaLabel: {
    fontSize: 10,
    fontWeight: '500',
  },
  metaValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  viewButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[3],
    borderRadius: borderRadius.lg,
    gap: spacing[2],
  },
  viewButtonText: {
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
