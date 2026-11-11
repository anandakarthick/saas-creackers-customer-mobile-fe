import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Image, Alert } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenWrapper, Header } from '@/components/layout';
import { Card, Button, ProductImagePlaceholder } from '@/components/common';
import { safeImageUri } from '@/utils/imageUrl';
import { FormInput, FormSelect } from '@/components/forms';
import { useTheme } from '@/theme';
import { spacing, borderRadius } from '@/theme/spacing';
import { suppliersApi } from '@/services/api';
import { mockPurchaseOrders, mockSuppliers, mockProducts, mockBranches } from '@/data/mock';
import { formatCurrency } from '@/utils';
import { generateId } from '@/utils/helpers';
import type { PurchaseOrdersStackParamList } from '@/types/navigation';
import type { PurchaseOrderStatus, PurchaseOrderItem } from '@/types';

type NavigationProp = NativeStackNavigationProp<PurchaseOrdersStackParamList, 'PurchaseOrderForm'>;
type RouteType = RouteProp<PurchaseOrdersStackParamList, 'PurchaseOrderForm'>;

interface POFormData {
  supplierId: string;
  branchId: string;
  status: PurchaseOrderStatus;
  expectedDate: string;
  notes: string;
}

interface POItemFormData {
  productId: string;
  quantity: string;
  price: string;
}

const statusOptions = [
  { label: 'Draft', value: 'draft' },
  { label: 'Pending', value: 'pending' },
  { label: 'Approved', value: 'approved' },
  { label: 'Ordered', value: 'ordered' },
  { label: 'Partially Received', value: 'partially_received' },
  { label: 'Received', value: 'received' },
  { label: 'Cancelled', value: 'cancelled' },
];

export const PurchaseOrderFormScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteType>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAddItem, setShowAddItem] = useState(false);
  const qc = useQueryClient();

  const isEditing = !!route.params?.id;
  const existingPO = isEditing
    ? mockPurchaseOrders.find((po) => po.id === route.params.id)
    : null;

  const [items, setItems] = useState<PurchaseOrderItem[]>(existingPO?.items || []);

  const supplierOptions = mockSuppliers
    .filter((s) => s.isActive)
    .map((s) => ({
      label: s.name,
      value: s.id,
    }));

  const branchOptions = mockBranches
    .filter((b) => b.isActive)
    .map((b) => ({
      label: b.name,
      value: b.id,
    }));

  const productOptions = mockProducts
    .filter((p) => p.isActive)
    .map((p) => ({
      label: `${p.name} (${p.sku})`,
      value: p.id,
    }));

  const { control, handleSubmit } = useForm<POFormData>({
    defaultValues: {
      supplierId: existingPO?.supplierId || '',
      branchId: existingPO?.branchId || 'branch-1',
      status: existingPO?.status || 'draft',
      expectedDate: existingPO?.expectedDate || '',
      notes: existingPO?.notes || '',
    },
  });

  const {
    control: itemControl,
    handleSubmit: handleItemSubmit,
    reset: resetItemForm,
  } = useForm<POItemFormData>({
    defaultValues: {
      productId: '',
      quantity: '',
      price: '',
    },
  });

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const tax = items.reduce((sum, item) => sum + item.tax, 0);
    const total = subtotal + tax;
    return { subtotal, tax, total };
  };

  const handleAddItem = (data: POItemFormData) => {
    const product = mockProducts.find((p) => p.id === data.productId);
    if (!product) return;

    const quantity = parseInt(data.quantity, 10);
    const price = parseFloat(data.price) || product.costPrice;
    const itemSubtotal = price * quantity;
    const tax = itemSubtotal * (product.taxRate / 100);

    const newItem: PurchaseOrderItem = {
      id: generateId(),
      productId: product.id,
      product,
      quantity,
      receivedQuantity: 0,
      price,
      tax,
      total: itemSubtotal + tax,
    };

    setItems([...items, newItem]);
    resetItemForm();
    setShowAddItem(false);
  };

  const handleRemoveItem = (itemId: string) => {
    setItems(items.filter((item) => item.id !== itemId));
  };

  const handleUpdateQuantity = (itemId: string, change: number) => {
    setItems(
      items.map((item) => {
        if (item.id === itemId) {
          const newQuantity = Math.max(1, item.quantity + change);
          const itemSubtotal = item.price * newQuantity;
          const tax = itemSubtotal * ((item.product?.taxRate || 18) / 100);
          return {
            ...item,
            quantity: newQuantity,
            tax,
            total: itemSubtotal + tax,
          };
        }
        return item;
      })
    );
  };

  const mutation = useMutation({
    mutationFn: (payload: any) => {
      return isEditing
        ? suppliersApi.updatePurchaseOrder(route.params.id!, payload)
        : suppliersApi.createPurchaseOrder(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchaseOrders'] });
      qc.invalidateQueries({ queryKey: ['purchase-orders'] });
      navigation.goBack();
    },
    onError: (e: any) => Alert.alert('Error', e?.message || 'Failed to save purchase order'),
  });

  const onSubmit = async (data: POFormData) => {
    if (items.length === 0) {
      return;
    }

    setIsSubmitting(true);
    const totals = calculateTotals();

    const purchaseOrderData = {
      ...data,
      items: items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        price: item.price,
        tax: item.tax,
        total: item.total,
      })),
      ...totals,
    };

    try {
      await mutation.mutateAsync(purchaseOrderData);
    } finally {
      setIsSubmitting(false);
    }
  };

  const { subtotal, tax, total } = calculateTotals();

  const renderItem = (item: PurchaseOrderItem) => (
    <View
      key={item.id}
      style={[styles.itemCard, { backgroundColor: colors.surface.variant }]}
    >
      <View style={styles.itemHeader}>
        {safeImageUri(item.product?.images?.[0]) ? (
          <Image source={{ uri: safeImageUri(item.product?.images?.[0])! }} style={styles.itemImage} />
        ) : (
          <ProductImagePlaceholder size={40} style={styles.itemImage} />
        )}
        <View style={styles.itemInfo}>
          <Text style={[styles.itemName, { color: colors.text.primary }]} numberOfLines={1}>
            {item.product?.name}
          </Text>
          <Text style={[styles.itemSku, { color: colors.text.tertiary }]}>
            {item.product?.sku}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => handleRemoveItem(item.id)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Icon name="close-circle" size={22} color={colors.error.main} />
        </TouchableOpacity>
      </View>

      <View style={styles.itemDetails}>
        <View style={styles.quantityControl}>
          <TouchableOpacity
            style={[styles.quantityButton, { backgroundColor: colors.neutral[200] }]}
            onPress={() => handleUpdateQuantity(item.id, -1)}
          >
            <Icon name="minus" size={18} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={[styles.quantityText, { color: colors.text.primary }]}>
            {item.quantity}
          </Text>
          <TouchableOpacity
            style={[styles.quantityButton, { backgroundColor: colors.neutral[200] }]}
            onPress={() => handleUpdateQuantity(item.id, 1)}
          >
            <Icon name="plus" size={18} color={colors.text.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.itemPriceInfo}>
          <Text style={[styles.itemPriceLabel, { color: colors.text.tertiary }]}>
            {formatCurrency(item.price)} x {item.quantity}
          </Text>
          <Text style={[styles.itemTotalPrice, { color: colors.text.primary }]}>
            {formatCurrency(item.total)}
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <ScreenWrapper scrollable={false} padding={false}>
      <Header
        title={isEditing ? 'Edit Purchase Order' : 'New Purchase Order'}
        showBack
      />

      <ScrollView
        style={styles.content}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: spacing[8] + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Supplier & Branch Selection */}
        <Card>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Order Details</Text>
          <FormSelect
            name="supplierId"
            control={control}
            label="Supplier"
            placeholder="Select a supplier"
            options={supplierOptions}
          />
          <FormSelect
            name="branchId"
            control={control}
            label="Destination Branch"
            placeholder="Select branch"
            options={branchOptions}
          />
          <FormInput
            name="expectedDate"
            control={control}
            label="Expected Delivery Date"
            placeholder="YYYY-MM-DD"
          />
        </Card>

        {/* Order Status */}
        <Card>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Status</Text>
          <FormSelect
            name="status"
            control={control}
            label="Order Status"
            options={statusOptions}
          />
        </Card>

        {/* Items Section */}
        <Card>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
              Items ({items.length})
            </Text>
            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: colors.primary.main }]}
              onPress={() => setShowAddItem(!showAddItem)}
            >
              <Icon name={showAddItem ? 'close' : 'plus'} size={18} color={colors.neutral[0]} />
              <Text style={[styles.addButtonText, { color: colors.neutral[0] }]}>
                {showAddItem ? 'Cancel' : 'Add Item'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Add Item Form */}
          {showAddItem && (
            <View style={[styles.addItemForm, { borderColor: colors.border.default }]}>
              <FormSelect
                name="productId"
                control={itemControl}
                label="Product"
                placeholder="Select a product"
                options={productOptions}
              />
              <View style={styles.row}>
                <View style={styles.halfField}>
                  <FormInput
                    name="quantity"
                    control={itemControl}
                    label="Quantity"
                    placeholder="0"
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.halfField}>
                  <FormInput
                    name="price"
                    control={itemControl}
                    label="Unit Price"
                    placeholder="0.00"
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>
              <Button
                onPress={handleItemSubmit(handleAddItem)}
                variant="outlined"
                size="small"
                style={styles.addItemButton}
              >
                Add to Order
              </Button>
            </View>
          )}

          {/* Items List */}
          {items.length === 0 ? (
            <View style={styles.emptyItems}>
              <Icon name="package-variant" size={48} color={colors.neutral[300]} />
              <Text style={[styles.emptyText, { color: colors.text.tertiary }]}>
                No items added yet
              </Text>
              <Text style={[styles.emptySubtext, { color: colors.text.tertiary }]}>
                Add products to this purchase order
              </Text>
            </View>
          ) : (
            <View style={styles.itemsList}>
              {items.map(renderItem)}
            </View>
          )}
        </Card>

        {/* Order Summary */}
        {items.length > 0 && (
          <Card>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Order Summary</Text>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.text.secondary }]}>Subtotal</Text>
              <Text style={[styles.summaryValue, { color: colors.text.primary }]}>
                {formatCurrency(subtotal)}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.text.secondary }]}>Tax</Text>
              <Text style={[styles.summaryValue, { color: colors.text.primary }]}>
                {formatCurrency(tax)}
              </Text>
            </View>
            <View style={[styles.divider, { backgroundColor: colors.border.default }]} />
            <View style={styles.summaryRow}>
              <Text style={[styles.totalLabel, { color: colors.text.primary }]}>Total</Text>
              <Text style={[styles.totalValue, { color: colors.primary.main }]}>
                {formatCurrency(total)}
              </Text>
            </View>
          </Card>
        )}

        {/* Notes */}
        <Card>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Additional Info</Text>
          <FormInput
            name="notes"
            control={control}
            label="Notes"
            placeholder="Add any notes about this purchase order..."
            multiline
            numberOfLines={4}
          />
        </Card>

        {/* Validation Warning */}
        {items.length === 0 && (
          <View style={[styles.warningBanner, { backgroundColor: colors.warning.light + '20' }]}>
            <Icon name="alert" size={20} color={colors.warning.main} />
            <Text style={[styles.warningText, { color: colors.warning.main }]}>
              Please add at least one item to the purchase order before saving.
            </Text>
          </View>
        )}

        {/* Submit Button */}
        <Button
          onPress={handleSubmit(onSubmit)}
          loading={isSubmitting}
          disabled={items.length === 0}
          style={styles.submitButton}
        >
          {isEditing ? 'Update Purchase Order' : 'Create Purchase Order'}
        </Button>
      </ScrollView>
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: spacing[3],
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.md,
  },
  addButtonText: {
    fontSize: 13,
    fontWeight: '600',
    marginLeft: spacing[1],
  },
  addItemForm: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing[3],
    marginBottom: spacing[3],
  },
  row: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  halfField: {
    flex: 1,
  },
  addItemButton: {
    marginTop: spacing[2],
  },
  emptyItems: {
    alignItems: 'center',
    paddingVertical: spacing[6],
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '500',
    marginTop: spacing[3],
  },
  emptySubtext: {
    fontSize: 13,
    marginTop: spacing[1],
  },
  itemsList: {
    gap: spacing[2],
  },
  itemCard: {
    borderRadius: borderRadius.md,
    padding: spacing[3],
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemImage: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.sm,
  },
  itemImagePlaceholder: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.sm,
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
  itemDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing[3],
    paddingTop: spacing[3],
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  quantityControl: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantityButton: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityText: {
    fontSize: 16,
    fontWeight: '600',
    minWidth: 40,
    textAlign: 'center',
  },
  itemPriceInfo: {
    alignItems: 'flex-end',
  },
  itemPriceLabel: {
    fontSize: 12,
  },
  itemTotalPrice: {
    fontSize: 15,
    fontWeight: '600',
    marginTop: 2,
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
  divider: {
    height: 1,
    marginVertical: spacing[2],
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing[4],
    borderRadius: borderRadius.lg,
    marginBottom: spacing[4],
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    marginLeft: spacing[2],
    lineHeight: 20,
  },
  submitButton: {
    marginTop: spacing[2],
  },
});
