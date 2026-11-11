import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenWrapper, Header } from '@/components/layout';
import { Card, Button } from '@/components/common';
import { FormInput, FormSelect } from '@/components/forms';
import { TextInput } from 'react-native-paper';
import { useTheme } from '@/theme';
import { spacing, borderRadius } from '@/theme/spacing';
import { inventoryApi } from '@/services/api';
import { mockProducts } from '@/data/mock';
import type { StockAdjustmentsStackParamList } from '@/types/navigation';

type NavigationProp = NativeStackNavigationProp<StockAdjustmentsStackParamList, 'StockAdjustmentForm'>;
type RouteType = RouteProp<StockAdjustmentsStackParamList, 'StockAdjustmentForm'>;

interface AdjustmentFormData {
  reason: string;
  notes: string;
}

const reasonOptions = [
  { label: 'Physical Count Discrepancy', value: 'Physical count discrepancy' },
  { label: 'Damaged Goods', value: 'Damaged goods' },
  { label: 'Expired Products', value: 'Expired products' },
  { label: 'Theft/Loss', value: 'Theft or loss' },
  { label: 'Data Entry Error', value: 'Data entry error' },
  { label: 'Other', value: 'Other' },
];

interface AdjustmentItem {
  productId: string;
  productName: string;
  sku: string;
  currentStock: number;
  newStock: number;
}

export const StockAdjustmentFormScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteType>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const qc = useQueryClient();
  const [items, setItems] = useState<AdjustmentItem[]>([]);
  const { control: productControl, watch: watchProduct, setValue: setProductValue } = useForm<{ selectedProduct: string }>({
    defaultValues: { selectedProduct: '' },
  });

  const isEditing = !!route.params?.id;

  const productOptions = mockProducts.map((p) => ({
    label: `${p.name} (${p.stock} in stock)`,
    value: p.id,
  }));

  const { control, handleSubmit } = useForm<AdjustmentFormData>({
    defaultValues: {
      reason: '',
      notes: '',
    },
  });

  const selectedProduct = watchProduct('selectedProduct');

  const addProduct = () => {
    if (!selectedProduct) return;

    const product = mockProducts.find((p: { id: string }) => p.id === selectedProduct);
    if (!product || items.find((i: AdjustmentItem) => i.productId === selectedProduct)) return;

    setItems([
      ...items,
      {
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        currentStock: product.stock,
        newStock: product.stock,
      },
    ]);
    setProductValue('selectedProduct', '');
  };

  const updateItemStock = (productId: string, newStock: number) => {
    setItems(items.map((item: AdjustmentItem) =>
      item.productId === productId ? { ...item, newStock } : item
    ));
  };

  const removeItem = (productId: string) => {
    setItems(items.filter((item: AdjustmentItem) => item.productId !== productId));
  };

  const mutation = useMutation({
    mutationFn: (data: AdjustmentFormData) => {
      const payload = {
        reason: data.reason,
        notes: data.notes,
        items: items.map((item) => ({
          productId: item.productId,
          currentStock: item.currentStock,
          newStock: item.newStock,
          adjustment: item.newStock - item.currentStock,
        })),
      };
      return isEditing
        ? inventoryApi.updateStockAdjustment(route.params!.id, payload)
        : inventoryApi.createStockAdjustment(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stockAdjustments'] });
      qc.invalidateQueries({ queryKey: ['stock-adjustments'] });
      qc.invalidateQueries({ queryKey: ['inventory'] });
      qc.invalidateQueries({ queryKey: ['stock'] });
      navigation.goBack();
    },
    onError: (e: any) => Alert.alert('Error', e?.message || 'Failed to save adjustment'),
  });

  const onSubmit = async (data: AdjustmentFormData) => {
    setIsSubmitting(true);
    try {
      await mutation.mutateAsync(data);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScreenWrapper scrollable={false} padding={false}>
      <Header
        title={isEditing ? 'Edit Adjustment' : 'New Adjustment'}
        showBack
      />

      <ScrollView
        style={styles.content}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: spacing[8] + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Reason */}
        <Card>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Adjustment Reason</Text>
          <FormSelect
            name="reason"
            control={control}
            label="Reason"
            placeholder="Select a reason"
            options={reasonOptions}
          />
        </Card>

        {/* Add Products */}
        <Card>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Products</Text>
          <View style={styles.addProductRow}>
            <View style={styles.productSelect}>
              <FormSelect
                name="selectedProduct"
                control={productControl}
                label="Add Product"
                placeholder="Select product"
                options={productOptions}
              />
            </View>
            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: colors.primary.main }]}
              onPress={addProduct}
            >
              <Icon name="plus" size={24} color={colors.neutral[0]} />
            </TouchableOpacity>
          </View>

          {/* Items List */}
          {items.map((item) => (
            <View
              key={item.productId}
              style={[styles.itemCard, { backgroundColor: colors.surface.variant }]}
            >
              <View style={styles.itemHeader}>
                <View style={styles.itemInfo}>
                  <Text style={[styles.itemName, { color: colors.text.primary }]}>
                    {item.productName}
                  </Text>
                  <Text style={[styles.itemSku, { color: colors.text.tertiary }]}>
                    {item.sku}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => removeItem(item.productId)}>
                  <Icon name="close" size={20} color={colors.error.main} />
                </TouchableOpacity>
              </View>
              <View style={styles.stockInputs}>
                <View style={styles.stockField}>
                  <Text style={[styles.stockLabel, { color: colors.text.tertiary }]}>
                    Current Stock
                  </Text>
                  <Text style={[styles.currentStock, { color: colors.text.secondary }]}>
                    {item.currentStock}
                  </Text>
                </View>
                <Icon name="arrow-right" size={20} color={colors.text.tertiary} />
                <View style={styles.stockField}>
                  <TextInput
                    label="New Stock"
                    placeholder="0"
                    keyboardType="numeric"
                    value={String(item.newStock)}
                    onChangeText={(val: string) => updateItemStock(item.productId, parseInt(val) || 0)}
                    mode="outlined"
                  />
                </View>
              </View>
              <View style={styles.differenceRow}>
                <Text style={[styles.differenceLabel, { color: colors.text.tertiary }]}>
                  Difference:
                </Text>
                <Text
                  style={[
                    styles.differenceValue,
                    {
                      color: item.newStock - item.currentStock > 0
                        ? colors.success.main
                        : item.newStock - item.currentStock < 0
                        ? colors.error.main
                        : colors.text.secondary,
                    },
                  ]}
                >
                  {item.newStock - item.currentStock > 0 ? '+' : ''}
                  {item.newStock - item.currentStock}
                </Text>
              </View>
            </View>
          ))}

          {items.length === 0 && (
            <Text style={[styles.emptyText, { color: colors.text.tertiary }]}>
              Add products to adjust their stock
            </Text>
          )}
        </Card>

        {/* Notes */}
        <Card>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Additional Info</Text>
          <FormInput
            name="notes"
            control={control}
            label="Notes"
            placeholder="Add any notes..."
            multiline
            numberOfLines={4}
          />
        </Card>

        {/* Submit Button */}
        <Button
          onPress={handleSubmit(onSubmit)}
          loading={isSubmitting}
          disabled={items.length === 0}
          style={styles.submitButton}
        >
          {isEditing ? 'Update Adjustment' : 'Submit for Approval'}
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
  addProductRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing[2],
  },
  productSelect: {
    flex: 1,
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  itemCard: {
    padding: spacing[3],
    borderRadius: borderRadius.md,
    marginBottom: spacing[3],
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing[3],
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
  },
  itemSku: {
    fontSize: 11,
    marginTop: 2,
  },
  stockInputs: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  stockField: {
    flex: 1,
  },
  stockLabel: {
    fontSize: 12,
    marginBottom: spacing[1],
  },
  currentStock: {
    fontSize: 18,
    fontWeight: '600',
  },
  differenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing[2],
    paddingTop: spacing[2],
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  differenceLabel: {
    fontSize: 12,
  },
  differenceValue: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: spacing[2],
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: spacing[4],
  },
  submitButton: {
    marginTop: spacing[2],
  },
});
