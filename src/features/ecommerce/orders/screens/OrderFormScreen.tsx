import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, ScrollView, Alert } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenWrapper, Header } from '@/components/layout';
import { Card, Button } from '@/components/common';
import { FormInput, FormSelect } from '@/components/forms';
import { useTheme } from '@/theme';
import { spacing, borderRadius } from '@/theme/spacing';
import { ordersApi } from '@/services/api';
import type { OrdersStackParamList } from '@/types/navigation';

type NavigationProp = NativeStackNavigationProp<OrdersStackParamList, 'OrderForm'>;
type RouteType = RouteProp<OrdersStackParamList, 'OrderForm'>;

interface OrderFormData {
  status: string;
  notes: string;
}

const statusOptions = [
  { label: 'Pending', value: 'PENDING' },
  { label: 'Confirmed', value: 'CONFIRMED' },
  { label: 'Processing', value: 'PROCESSING' },
  { label: 'Shipped', value: 'SHIPPED' },
  { label: 'Delivered', value: 'DELIVERED' },
  { label: 'Cancelled', value: 'CANCELLED' },
  { label: 'Refunded', value: 'REFUNDED' },
];

export const OrderFormScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteType>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const qc = useQueryClient();

  const isEditing = !!route.params?.id;
  const orderId = route.params?.id;

  const { data: existingOrder } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => ordersApi.getOrder(orderId!),
    enabled: isEditing,
  });

  const { control, handleSubmit, reset } = useForm<OrderFormData>({
    defaultValues: {
      status: 'PENDING',
      notes: '',
    },
  });

  useEffect(() => {
    if (existingOrder) {
      reset({
        status: existingOrder.status || 'PENDING',
        notes: existingOrder.notes || '',
      });
    }
  }, [existingOrder, reset]);

  const mutation = useMutation({
    mutationFn: (data: OrderFormData) => {
      return ordersApi.updateOrderStatus(orderId!, data.status);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] });
      qc.invalidateQueries({ queryKey: ['order', orderId] });
      navigation.goBack();
    },
    onError: (e: any) => Alert.alert('Error', e?.message || 'Failed to update order'),
  });

  const onSubmit = async (data: OrderFormData) => {
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
        title={isEditing ? 'Edit Order' : 'New Order'}
        showBack
      />

      <ScrollView
        style={styles.content}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: spacing[8] + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Order Info */}
        {existingOrder && (
          <Card>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Order Info</Text>
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.text.tertiary }]}>Order #</Text>
              <Text style={[styles.infoValue, { color: colors.text.primary }]}>{existingOrder.orderNumber}</Text>
            </View>
            {existingOrder.customer && (
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: colors.text.tertiary }]}>Customer</Text>
                <Text style={[styles.infoValue, { color: colors.text.primary }]}>
                  {existingOrder.shippingAddress?.name || `${existingOrder.customer.firstName} ${existingOrder.customer.lastName}`}
                </Text>
              </View>
            )}
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.text.tertiary }]}>Payment</Text>
              <Text style={[styles.infoValue, { color: colors.text.primary }]}>
                {existingOrder.paymentStatus}{existingOrder.paymentMethod ? ` (${existingOrder.paymentMethod})` : ''}
              </Text>
            </View>
          </Card>
        )}

        {/* Order Status */}
        {isEditing && (
          <Card>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Update Status</Text>
            <FormSelect
              name="status"
              control={control}
              label="Order Status"
              options={statusOptions}
            />
          </Card>
        )}

        {/* Notes */}
        <Card>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Additional Info</Text>
          <FormInput
            name="notes"
            control={control}
            label="Notes"
            placeholder="Add any notes about this order..."
            multiline
            numberOfLines={4}
          />
        </Card>

        {/* Info Banner for New Orders */}
        {!isEditing && (
          <View style={[styles.infoBanner, { backgroundColor: colors.info.light + '20' }]}>
            <Icon name="information" size={20} color={colors.info.main} />
            <Text style={[styles.infoText, { color: colors.info.main }]}>
              To add items to the order, use the POS system for a complete checkout experience.
            </Text>
          </View>
        )}

        {/* Submit Button */}
        {isEditing && (
          <Button
            onPress={handleSubmit(onSubmit)}
            loading={isSubmitting}
            style={styles.submitButton}
          >
            Update Order
          </Button>
        )}
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
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing[2],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
  },
  infoLabel: {
    fontSize: 13,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing[4],
    borderRadius: borderRadius.lg,
    marginBottom: spacing[4],
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    marginLeft: spacing[2],
    lineHeight: 20,
  },
  submitButton: {
    marginTop: spacing[2],
  },
});
