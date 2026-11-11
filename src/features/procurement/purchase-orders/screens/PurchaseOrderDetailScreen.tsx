import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenWrapper, Header } from '@/components/layout';
import { Card, Badge, ConfirmationModal, ProductImagePlaceholder } from '@/components/common';
import { safeImageUri } from '@/utils/imageUrl';
import { useTheme } from '@/theme';
import { spacing, borderRadius } from '@/theme/spacing';
import { mockPurchaseOrders } from '@/data/mock';
import { formatCurrency, formatDateTime, formatDate, getStatusText } from '@/utils';
import type { PurchaseOrdersStackParamList } from '@/types/navigation';
import type { PurchaseOrderItem, PurchaseOrderStatus } from '@/types';

type NavigationProp = NativeStackNavigationProp<PurchaseOrdersStackParamList, 'PurchaseOrderDetail'>;
type RouteType = RouteProp<PurchaseOrdersStackParamList, 'PurchaseOrderDetail'>;

export const PurchaseOrderDetailScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteType>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const purchaseOrder = mockPurchaseOrders.find((po) => po.id === route.params.id);

  if (!purchaseOrder) {
    return (
      <ScreenWrapper>
        <Header title="PO Not Found" showBack />
        <View style={styles.errorContainer}>
          <Icon name="alert-circle-outline" size={64} color={colors.error.main} />
          <Text style={[styles.errorText, { color: colors.text.primary }]}>
            Purchase order not found
          </Text>
        </View>
      </ScreenWrapper>
    );
  }

  const getStatusBadgeVariant = (status: PurchaseOrderStatus) => {
    switch (status) {
      case 'received':
        return 'success';
      case 'pending':
      case 'draft':
        return 'warning';
      case 'cancelled':
        return 'error';
      case 'partially_received':
        return 'info';
      default:
        return 'info';
    }
  };

  const handleEdit = () => {
    navigation.navigate('PurchaseOrderForm', { id: purchaseOrder.id });
  };

  const handleDelete = () => {
    setShowDeleteModal(false);
    navigation.goBack();
  };

  const totalReceivedQuantity = purchaseOrder.items.reduce(
    (sum, item) => sum + item.receivedQuantity,
    0
  );
  const totalOrderedQuantity = purchaseOrder.items.reduce(
    (sum, item) => sum + item.quantity,
    0
  );
  const receivedPercentage = totalOrderedQuantity > 0
    ? Math.round((totalReceivedQuantity / totalOrderedQuantity) * 100)
    : 0;

  const renderOrderItem = (item: PurchaseOrderItem, index: number) => (
    <View
      key={item.id}
      style={[
        styles.itemRow,
        { borderBottomColor: colors.border.default },
        index === purchaseOrder.items.length - 1 && styles.lastItemRow,
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
        <View style={styles.itemQuantityRow}>
          <Text style={[styles.itemPrice, { color: colors.text.secondary }]}>
            {formatCurrency(item.price)} x {item.quantity}
          </Text>
          {item.receivedQuantity > 0 && (
            <Text style={[styles.receivedText, { color: colors.success.main }]}>
              ({item.receivedQuantity} received)
            </Text>
          )}
        </View>
      </View>
      <Text style={[styles.itemTotal, { color: colors.text.primary }]}>
        {formatCurrency(item.total)}
      </Text>
    </View>
  );

  return (
    <ScreenWrapper scrollable={false} padding={false}>
      <Header
        title={purchaseOrder.poNumber}
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
              <Text style={[styles.label, { color: colors.text.tertiary }]}>PO Status</Text>
              <Badge variant={getStatusBadgeVariant(purchaseOrder.status)} size="medium">
                {getStatusText(purchaseOrder.status)}
              </Badge>
            </View>
            <View style={styles.statusRight}>
              <Text style={[styles.label, { color: colors.text.tertiary }]}>Received</Text>
              <Text style={[styles.receivedPercentage, { color: colors.primary.main }]}>
                {receivedPercentage}%
              </Text>
            </View>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border.default }]} />
          <View style={styles.dateRow}>
            <Icon name="calendar" size={16} color={colors.text.tertiary} />
            <Text style={[styles.dateText, { color: colors.text.secondary }]}>
              Created: {formatDateTime(purchaseOrder.createdAt)}
            </Text>
          </View>
          {purchaseOrder.expectedDate && (
            <View style={[styles.dateRow, { marginTop: spacing[2] }]}>
              <Icon name="calendar-clock" size={16} color={colors.text.tertiary} />
              <Text style={[styles.dateText, { color: colors.text.secondary }]}>
                Expected: {formatDate(purchaseOrder.expectedDate)}
              </Text>
            </View>
          )}
        </Card>

        {/* Supplier Info */}
        <Card>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Supplier</Text>
          <View style={styles.supplierRow}>
            <View style={[styles.supplierIcon, { backgroundColor: colors.primary.light + '20' }]}>
              <Icon name="truck" size={24} color={colors.primary.main} />
            </View>
            <View style={styles.supplierInfo}>
              <Text style={[styles.supplierName, { color: colors.text.primary }]}>
                {purchaseOrder.supplier?.name}
              </Text>
              <Text style={[styles.supplierContact, { color: colors.text.secondary }]}>
                {purchaseOrder.supplier?.contactPerson}
              </Text>
              {purchaseOrder.supplier?.phone && (
                <Text style={[styles.supplierContact, { color: colors.text.secondary }]}>
                  {purchaseOrder.supplier.phone}
                </Text>
              )}
            </View>
          </View>
          {purchaseOrder.supplier?.address && (
            <>
              <View style={[styles.divider, { backgroundColor: colors.border.default }]} />
              <Text style={[styles.addressLabel, { color: colors.text.tertiary }]}>
                Supplier Address
              </Text>
              <Text style={[styles.addressText, { color: colors.text.secondary }]}>
                {purchaseOrder.supplier.address.line1}
                {purchaseOrder.supplier.address.line2 && `, ${purchaseOrder.supplier.address.line2}`}
              </Text>
              <Text style={[styles.addressText, { color: colors.text.secondary }]}>
                {purchaseOrder.supplier.address.city}, {purchaseOrder.supplier.address.state} - {purchaseOrder.supplier.address.pincode}
              </Text>
            </>
          )}
        </Card>

        {/* Order Items */}
        <Card>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
            Items ({purchaseOrder.items.length})
          </Text>
          {purchaseOrder.items.map(renderOrderItem)}
        </Card>

        {/* Payment Summary */}
        <Card>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Order Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.text.secondary }]}>Subtotal</Text>
            <Text style={[styles.summaryValue, { color: colors.text.primary }]}>
              {formatCurrency(purchaseOrder.subtotal)}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.text.secondary }]}>Tax</Text>
            <Text style={[styles.summaryValue, { color: colors.text.primary }]}>
              {formatCurrency(purchaseOrder.tax)}
            </Text>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border.default }]} />
          <View style={styles.summaryRow}>
            <Text style={[styles.totalLabel, { color: colors.text.primary }]}>Total</Text>
            <Text style={[styles.totalValue, { color: colors.primary.main }]}>
              {formatCurrency(purchaseOrder.total)}
            </Text>
          </View>
        </Card>

        {/* Notes */}
        {purchaseOrder.notes && (
          <Card>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Notes</Text>
            <Text style={[styles.notesText, { color: colors.text.secondary }]}>
              {purchaseOrder.notes}
            </Text>
          </Card>
        )}

        {/* Quick Actions */}
        {purchaseOrder.status !== 'received' && purchaseOrder.status !== 'cancelled' && (
          <Card>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Quick Actions</Text>
            <View style={styles.actionsRow}>
              {purchaseOrder.status === 'draft' && (
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: colors.info.light + '20' }]}
                >
                  <Icon name="send" size={20} color={colors.info.main} />
                  <Text style={[styles.actionText, { color: colors.info.main }]}>Submit for Approval</Text>
                </TouchableOpacity>
              )}
              {purchaseOrder.status === 'pending' && (
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: colors.success.light + '20' }]}
                >
                  <Icon name="check-circle" size={20} color={colors.success.main} />
                  <Text style={[styles.actionText, { color: colors.success.main }]}>Approve</Text>
                </TouchableOpacity>
              )}
              {(purchaseOrder.status === 'approved' || purchaseOrder.status === 'ordered') && (
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: colors.primary.light + '20' }]}
                >
                  <Icon name="package-down" size={20} color={colors.primary.main} />
                  <Text style={[styles.actionText, { color: colors.primary.main }]}>Receive Items</Text>
                </TouchableOpacity>
              )}
            </View>
          </Card>
        )}
      </ScrollView>

      <ConfirmationModal
        visible={showDeleteModal}
        title="Cancel Purchase Order"
        message={`Are you sure you want to cancel ${purchaseOrder.poNumber}? This action cannot be undone.`}
        confirmText="Cancel PO"
        cancelText="Keep PO"
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
  receivedPercentage: {
    fontSize: 20,
    fontWeight: '700',
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
  supplierRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  supplierIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  supplierInfo: {
    marginLeft: spacing[3],
    flex: 1,
  },
  supplierName: {
    fontSize: 15,
    fontWeight: '600',
  },
  supplierContact: {
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
  itemQuantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  itemPrice: {
    fontSize: 12,
  },
  receivedText: {
    fontSize: 11,
    marginLeft: spacing[2],
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
  notesText: {
    fontSize: 14,
    lineHeight: 22,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[3],
    borderRadius: borderRadius.md,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: spacing[2],
  },
});
