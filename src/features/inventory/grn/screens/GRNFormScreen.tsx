import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, ScrollView, Alert } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenWrapper, Header } from '@/components/layout';
import { Card, Button } from '@/components/common';
import { FormInput, FormSelect } from '@/components/forms';
import { TextInput } from 'react-native-paper';
import { useTheme } from '@/theme';
import { spacing } from '@/theme/spacing';
import { inventoryApi, suppliersApi } from '@/services/api';
import type { GRNStackParamList } from '@/types/navigation';

type NavigationProp = NativeStackNavigationProp<GRNStackParamList, 'GRNForm'>;
type RouteType = RouteProp<GRNStackParamList, 'GRNForm'>;

interface GRNFormData {
  purchaseOrderId: string;
  notes: string;
}

interface GRNItem {
  productId: number;
  name: string;
  ordered: number;
  received: number;
  pending: number;
  receivingQty: string;
  rejectedQty: string;
}

export const GRNFormScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteType>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [items, setItems] = useState<GRNItem[]>([]);
  const qc = useQueryClient();

  const { data: purchaseOrdersData } = useQuery({
    queryKey: ['purchaseOrders', 'grn-select'],
    queryFn: () => suppliersApi.getPurchaseOrders({ limit: 100 }),
  });

  const poList = (purchaseOrdersData as any)?.data || [];

  const purchaseOrderOptions = poList
    .filter((po: any) => po.status !== 'RECEIVED' && po.status !== 'CANCELLED')
    .map((po: any) => ({
      label: `${po.orderNumber} - ${po.supplier?.name || 'Unknown'}`,
      value: String(po.id),
    }));

  const { control, handleSubmit, watch } = useForm<GRNFormData>({
    defaultValues: {
      purchaseOrderId: route.params?.purchaseOrderId || '',
      notes: '',
    },
  });

  const selectedPOId = watch('purchaseOrderId');

  const { data: selectedPO } = useQuery({
    queryKey: ['purchaseOrder', selectedPOId],
    queryFn: () => suppliersApi.getPurchaseOrder(selectedPOId),
    enabled: !!selectedPOId,
  });

  useEffect(() => {
    if (selectedPO && (selectedPO as any).items) {
      const poItems = (selectedPO as any).items;
      setItems(
        poItems.map((item: any) => {
          const pending = (item.quantity || 0) - (item.receivedQuantity || 0);
          return {
            productId: item.productId,
            name: item.product?.name || `Product #${item.productId}`,
            ordered: item.quantity || 0,
            received: item.receivedQuantity || 0,
            pending,
            receivingQty: String(Math.max(0, pending)),
            rejectedQty: '0',
          };
        })
      );
    }
  }, [selectedPO]);

  const updateItem = (index: number, field: 'receivingQty' | 'rejectedQty', value: string) => {
    setItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const mutation = useMutation({
    mutationFn: (data: GRNFormData) => {
      const payload = {
        purchaseOrderId: parseInt(data.purchaseOrderId, 10),
        notes: data.notes || undefined,
        items: items
          .filter((item) => parseInt(item.receivingQty, 10) > 0)
          .map((item) => ({
            productId: item.productId,
            quantity: parseInt(item.receivingQty, 10) || 0,
            rejectedQuantity: parseInt(item.rejectedQty, 10) || 0,
          })),
      };
      if (payload.items.length === 0) {
        throw new Error('Enter a receiving quantity for at least one item');
      }
      return inventoryApi.createGRN(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['grn'] });
      qc.invalidateQueries({ queryKey: ['inventory'] });
      qc.invalidateQueries({ queryKey: ['purchaseOrders'] });
      qc.invalidateQueries({ queryKey: ['purchase-orders'] });
      navigation.goBack();
    },
    onError: (e: any) => Alert.alert('Error', e?.message || 'Failed to create GRN'),
  });

  const onSubmit = async (data: GRNFormData) => {
    if (!data.purchaseOrderId) {
      Alert.alert('Validation', 'Please select a purchase order');
      return;
    }
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
        title="Create GRN"
        showBack
      />

      <ScrollView
        style={styles.content}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: spacing[8] + insets.bottom }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Purchase Order Selection */}
        <Card>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Purchase Order</Text>
          <FormSelect
            name="purchaseOrderId"
            control={control}
            label="Select Purchase Order"
            placeholder="Choose a PO"
            options={purchaseOrderOptions}
          />
        </Card>

        {/* PO Items */}
        {items.length > 0 && (
          <Card>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
              Items to Receive ({items.length})
            </Text>
            {items.map((item, index) => (
              <View
                key={`${item.productId}-${index}`}
                style={[
                  styles.itemCard,
                  { backgroundColor: colors.surface.variant },
                ]}
              >
                <Text style={[styles.itemName, { color: colors.text.primary }]}>
                  {item.name}
                </Text>
                <View style={styles.itemQuantities}>
                  <View style={styles.quantityInput}>
                    <Text style={[styles.quantityLabel, { color: colors.text.tertiary }]}>
                      Ordered
                    </Text>
                    <Text style={[styles.quantityValue, { color: colors.text.primary }]}>
                      {item.ordered}
                    </Text>
                  </View>
                  <View style={styles.quantityInput}>
                    <Text style={[styles.quantityLabel, { color: colors.text.tertiary }]}>
                      Received
                    </Text>
                    <Text style={[styles.quantityValue, { color: colors.info.main }]}>
                      {item.received}
                    </Text>
                  </View>
                  <View style={styles.quantityInput}>
                    <Text style={[styles.quantityLabel, { color: colors.text.tertiary }]}>
                      Pending
                    </Text>
                    <Text style={[styles.quantityValue, { color: colors.warning.main }]}>
                      {item.pending}
                    </Text>
                  </View>
                </View>
                <TextInput
                  label="Receiving Quantity"
                  placeholder="Enter quantity"
                  keyboardType="numeric"
                  value={item.receivingQty}
                  onChangeText={(val) => updateItem(index, 'receivingQty', val)}
                  mode="outlined"
                />
                <TextInput
                  label="Rejected Quantity"
                  placeholder="0"
                  keyboardType="numeric"
                  value={item.rejectedQty}
                  onChangeText={(val) => updateItem(index, 'rejectedQty', val)}
                  mode="outlined"
                  style={{ marginTop: spacing[2] }}
                />
              </View>
            ))}
          </Card>
        )}

        {/* Notes */}
        <Card>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Additional Info</Text>
          <FormInput
            name="notes"
            control={control}
            label="Notes"
            placeholder="Add any notes about this receipt..."
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
          Create GRN
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
  itemCard: {
    padding: spacing[3],
    borderRadius: 8,
    marginBottom: spacing[3],
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: spacing[2],
  },
  itemQuantities: {
    flexDirection: 'row',
    marginBottom: spacing[3],
    gap: spacing[4],
  },
  quantityInput: {
    alignItems: 'center',
  },
  quantityLabel: {
    fontSize: 11,
    marginBottom: 4,
  },
  quantityValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    marginTop: spacing[2],
  },
});
