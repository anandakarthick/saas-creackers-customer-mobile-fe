import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenWrapper, Header } from '@/components/layout';
import { Card, Badge, Avatar, ConfirmationModal, ProductImagePlaceholder } from '@/components/common';
import { safeImageUri } from '@/utils/imageUrl';
import { useTheme } from '@/theme';
import { spacing, borderRadius } from '@/theme/spacing';
import { mockOrders } from '@/data/mock';
import { formatCurrency, formatDateTime, getStatusText } from '@/utils';
import type { OrdersStackParamList } from '@/types/navigation';
import type { OrderItem, OrderStatus } from '@/types';

type NavigationProp = NativeStackNavigationProp<OrdersStackParamList, 'OrderDetail'>;
type RouteType = RouteProp<OrdersStackParamList, 'OrderDetail'>;

export const OrderDetailScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteType>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const order = mockOrders.find((o) => o.id === route.params.id);

  if (!order) {
    return (
      <ScreenWrapper>
        <Header title="Order Not Found" showBack />
        <View style={styles.errorContainer}>
          <Icon name="alert-circle-outline" size={64} color={colors.error.main} />
          <Text style={[styles.errorText, { color: colors.text.primary }]}>Order not found</Text>
        </View>
      </ScreenWrapper>
    );
  }

  const getStatusBadgeVariant = (status: OrderStatus) => {
    switch (status) {
      case 'delivered': return 'success';
      case 'pending': return 'warning';
      case 'cancelled':
      case 'refunded': return 'error';
      default: return 'info';
    }
  };

  const handleEdit = () => {
    navigation.navigate('OrderForm', { id: order.id });
  };

  const handleDelete = () => {
    setShowDeleteModal(false);
    navigation.goBack();
  };

  const renderOrderItem = (item: OrderItem, index: number) => (
    <View
      key={item.id}
      style={[
        styles.itemRow,
        { borderBottomColor: colors.border.default },
        index === order.items.length - 1 && styles.lastItemRow,
      ]}
    >
      {safeImageUri(item.product?.images?.[0]) ? (
        <Image source={{ uri: safeImageUri(item.product?.images?.[0])! }} style={styles.itemImage} />
      ) : (
        <ProductImagePlaceholder size={40} style={styles.itemImage} />
      )}
      <View style={styles.itemInfo}>
        <Text style={[styles.itemName, { color: colors.text.primary }]}>
          {item.product?.name || 'Unknown Product'}
        </Text>
        <Text style={[styles.itemSku, { color: colors.text.tertiary }]}>
          {item.product?.sku}
        </Text>
        <Text style={[styles.itemPrice, { color: colors.text.secondary }]}>
          {formatCurrency(item.price)} x {item.quantity}
        </Text>
      </View>
      <Text style={[styles.itemTotal, { color: colors.text.primary }]}>
        {formatCurrency(item.total)}
      </Text>
    </View>
  );

  return (
    <ScreenWrapper scrollable={false} padding={false}>
      <Header
        title={order.orderNumber}
        showBack
        actions={[
          { icon: 'pencil', onPress: handleEdit },
          { icon: 'delete', onPress: () => setShowDeleteModal(true) },
        ]}
      />

      <ScrollView
        style={styles.content}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: spacing[8] + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Status Card */}
        <Card style={styles.statusCard}>
          <View style={styles.statusRow}>
            <View>
              <Text style={[styles.label, { color: colors.text.tertiary }]}>Order Status</Text>
              <Badge variant={getStatusBadgeVariant(order.status)} size="medium">
                {getStatusText(order.status)}
              </Badge>
            </View>
            <View style={styles.statusRight}>
              <Text style={[styles.label, { color: colors.text.tertiary }]}>Payment</Text>
              <Badge
                variant={order.paymentStatus === 'paid' ? 'success' : 'warning'}
                size="medium"
              >
                {getStatusText(order.paymentStatus)}
              </Badge>
            </View>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border.default }]} />
          <View style={styles.dateRow}>
            <Icon name="calendar" size={16} color={colors.text.tertiary} />
            <Text style={[styles.dateText, { color: colors.text.secondary }]}>
              Placed on {formatDateTime(order.createdAt)}
            </Text>
          </View>
        </Card>

        {/* Customer Info */}
        <Card>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Customer</Text>
          <View style={styles.customerRow}>
            <Avatar name={order.customer?.name || 'Customer'} size="medium" />
            <View style={styles.customerInfo}>
              <Text style={[styles.customerName, { color: colors.text.primary }]}>
                {order.customer?.name}
              </Text>
              <Text style={[styles.customerContact, { color: colors.text.secondary }]}>
                {order.customer?.phone}
              </Text>
              {order.customer?.email && (
                <Text style={[styles.customerContact, { color: colors.text.secondary }]}>
                  {order.customer?.email}
                </Text>
              )}
            </View>
          </View>
          {order.shippingAddress && (
            <>
              <View style={[styles.divider, { backgroundColor: colors.border.default }]} />
              <Text style={[styles.addressLabel, { color: colors.text.tertiary }]}>
                Shipping Address
              </Text>
              <Text style={[styles.addressText, { color: colors.text.secondary }]}>
                {order.shippingAddress.line1}
                {order.shippingAddress.line2 && `, ${order.shippingAddress.line2}`}
              </Text>
              <Text style={[styles.addressText, { color: colors.text.secondary }]}>
                {order.shippingAddress.city}, {order.shippingAddress.state} - {order.shippingAddress.pincode}
              </Text>
            </>
          )}
        </Card>

        {/* Order Items */}
        <Card>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
            Items ({order.items.length})
          </Text>
          {order.items.map(renderOrderItem)}
        </Card>

        {/* Payment Summary */}
        <Card>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Payment Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.text.secondary }]}>Subtotal</Text>
            <Text style={[styles.summaryValue, { color: colors.text.primary }]}>
              {formatCurrency(order.subtotal)}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.text.secondary }]}>Discount</Text>
            <Text style={[styles.summaryValue, { color: colors.success.main }]}>
              -{formatCurrency(order.discount)}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.text.secondary }]}>Tax</Text>
            <Text style={[styles.summaryValue, { color: colors.text.primary }]}>
              {formatCurrency(order.tax)}
            </Text>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border.default }]} />
          <View style={styles.summaryRow}>
            <Text style={[styles.totalLabel, { color: colors.text.primary }]}>Total</Text>
            <Text style={[styles.totalValue, { color: colors.primary.main }]}>
              {formatCurrency(order.total)}
            </Text>
          </View>
          {!!order.paymentMethod && (
          <View style={[styles.paymentMethodRow, { backgroundColor: colors.surface.variant }]}>
            <Icon name="credit-card" size={18} color={colors.text.tertiary} />
            <Text style={[styles.paymentMethod, { color: colors.text.secondary }]}>
              Paid via {order.paymentMethod.toUpperCase()}
            </Text>
          </View>
          )}
        </Card>

        {/* Notes */}
        {order.notes && (
          <Card>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Notes</Text>
            <Text style={[styles.notesText, { color: colors.text.secondary }]}>
              {order.notes}
            </Text>
          </Card>
        )}
      </ScrollView>

      <ConfirmationModal
        visible={showDeleteModal}
        title="Cancel Order"
        message={`Are you sure you want to cancel order ${order.orderNumber}? This action cannot be undone.`}
        confirmText="Cancel Order"
        cancelText="Keep Order"
        confirmVariant="danger"
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteModal(false)}
      />
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing[4],
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    marginTop: spacing[4],
  },
  statusCard: {
    marginBottom: spacing[4],
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statusRight: {
    alignItems: 'flex-end',
  },
  label: {
    fontSize: 12,
    marginBottom: spacing[1],
  },
  divider: {
    height: 1,
    marginVertical: spacing[3],
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 13,
    marginLeft: spacing[2],
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: spacing[3],
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  customerInfo: {
    marginLeft: spacing[3],
  },
  customerName: {
    fontSize: 15,
    fontWeight: '600',
  },
  customerContact: {
    fontSize: 13,
    marginTop: 2,
  },
  addressLabel: {
    fontSize: 12,
    marginBottom: spacing[1],
  },
  addressText: {
    fontSize: 13,
    lineHeight: 20,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
  },
  lastItemRow: {
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
  itemImage: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
  },
  itemImagePlaceholder: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemInfo: {
    flex: 1,
    marginLeft: spacing[3],
  },
  itemName: {
    fontSize: 14,
    fontWeight: '500',
  },
  itemSku: {
    fontSize: 11,
    marginTop: 2,
  },
  itemPrice: {
    fontSize: 12,
    marginTop: 4,
  },
  itemTotal: {
    fontSize: 14,
    fontWeight: '600',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing[2],
  },
  summaryLabel: {
    fontSize: 14,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  paymentMethodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing[3],
    padding: spacing[3],
    borderRadius: borderRadius.md,
  },
  paymentMethod: {
    fontSize: 13,
    marginLeft: spacing[2],
  },
  notesText: {
    fontSize: 14,
    lineHeight: 22,
  },
});
