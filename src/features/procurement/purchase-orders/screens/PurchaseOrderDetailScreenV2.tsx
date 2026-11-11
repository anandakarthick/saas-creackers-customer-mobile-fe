import React, { useState, useCallback } from 'react';
import { StyleSheet, View, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { Text, Button, Divider } from 'react-native-paper';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { Header } from '@/components/layout/Header';
import { Badge } from '@/components/common/Badge';
import { ConfirmationModal } from '@/components/common/ConfirmationModal';
import { useTheme } from '@/theme';
import { spacing, borderRadius } from '@/theme/spacing';
import { suppliersApi } from '@/services/api';
import type { PurchaseOrdersStackParamList } from '@/types/navigation';

type NavigationProp = NativeStackNavigationProp<PurchaseOrdersStackParamList, 'PurchaseOrderDetail'>;
type RouteProps = RouteProp<PurchaseOrdersStackParamList, 'PurchaseOrderDetail'>;

const formatCurrency = (n: number) =>
  `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

const STATUS_VARIANTS: Record<string, 'success' | 'warning' | 'error' | 'info'> = {
  received: 'success',
  partially_received: 'info',
  approved: 'info',
  pending: 'warning',
  draft: 'warning',
  cancelled: 'error',
};

/** Normalize backend PO row into UI shape. */
function normalizePO(p: any) {
  return {
    id: String(p.id),
    poNumber: p.orderNumber || p.poNumber || '',
    status: (p.status || 'pending').toLowerCase(),
    expectedDate: p.expectedDate,
    createdAt: p.createdAt,
    subtotal: Number(p.subtotal || 0),
    tax: Number(p.tax || 0),
    total: Number(p.total || 0),
    notes: p.notes || '',
    supplier: p.supplier
      ? {
          id: String(p.supplier.id),
          name: p.supplier.name || '',
          contactPerson: p.supplier.contactPerson || '',
          phone: p.supplier.phone || p.supplier.mobile || '',
        }
      : null,
    items: (p.items || []).map((it: any) => ({
      id: String(it.id),
      quantity: Number(it.quantity || 0),
      receivedQuantity: it.receivedQty != null ? Number(it.receivedQty) : undefined,
      price: Number(it.unitPrice ?? it.price ?? 0),
      total: Number(it.subtotal ?? it.total ?? 0),
      product: it.product
        ? { id: String(it.product.id), name: it.product.name }
        : { id: '', name: it.name || 'Product' },
    })),
  };
}

export const PurchaseOrderDetailScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const [deleteVisible, setDeleteVisible] = useState(false);

  const poId = route.params.id;

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['purchaseOrder', poId],
    queryFn: () => suppliersApi.getPurchaseOrder(poId),
    enabled: !!poId,
  });

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [])
  );

  const deleteMutation = useMutation({
    mutationFn: () => suppliersApi.deletePurchaseOrder(poId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      setDeleteVisible(false);
      navigation.goBack();
    },
    onError: (e: any) => Alert.alert('Error', e?.message || 'Failed to delete purchase order'),
  });

  if (isLoading) {
    return (
      <ScreenWrapper>
        <Header title="Purchase Order" showBack />
        <View style={styles.notFound}>
          <ActivityIndicator size="large" color={colors.primary.main} />
        </View>
      </ScreenWrapper>
    );
  }

  if (isError || !data) {
    return (
      <ScreenWrapper>
        <Header title="Not Found" showBack />
        <View style={styles.notFound}>
          <Icon name="alert-circle-outline" size={64} color={colors.neutral[300]} />
          <Text style={[styles.notFoundText, { color: colors.text.secondary }]}>
            {isError ? String(error?.message || 'Failed to load') : 'PO not found'}
          </Text>
        </View>
      </ScreenWrapper>
    );
  }

  const po = normalizePO(data);

  return (
    <ScreenWrapper scrollable={false}>
      <Header
        title={po.poNumber}
        showBack
        actions={[
          {
            icon: 'pencil',
            onPress: () => navigation.navigate('PurchaseOrderForm', { id: po.id }),
          },
          {
            icon: 'delete',
            onPress: () => setDeleteVisible(true),
          },
        ]}
      />

      <ScrollView contentContainerStyle={styles.content}>
        {/* Summary */}
        <View style={[styles.section, { backgroundColor: colors.surface.default }]}>
          <View style={styles.row}>
            <Text style={[styles.label, { color: colors.text.secondary }]}>Status</Text>
            <Badge variant={STATUS_VARIANTS[po.status] || 'info'}>
              {po.status.replace('_', ' ').toUpperCase()}
            </Badge>
          </View>
          <View style={styles.row}>
            <Text style={[styles.label, { color: colors.text.secondary }]}>Expected</Text>
            <Text style={[styles.value, { color: colors.text.primary }]}>
              {po.expectedDate
                ? new Date(po.expectedDate).toLocaleDateString('en-IN')
                : '—'}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={[styles.label, { color: colors.text.secondary }]}>Created</Text>
            <Text style={[styles.value, { color: colors.text.primary }]}>
              {new Date(po.createdAt).toLocaleDateString('en-IN')}
            </Text>
          </View>
        </View>

        {/* Supplier */}
        {po.supplier && (
          <View style={[styles.section, { backgroundColor: colors.surface.default }]}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Supplier</Text>
            <Text style={[styles.supplierName, { color: colors.text.primary }]}>
              {po.supplier.name}
            </Text>
            <Text style={[styles.subtle, { color: colors.text.secondary }]}>
              <Icon name="account" size={12} /> {po.supplier.contactPerson}
            </Text>
            <Text style={[styles.subtle, { color: colors.text.secondary }]}>
              <Icon name="phone" size={12} /> {po.supplier.phone}
            </Text>
          </View>
        )}

        {/* Items */}
        <View style={[styles.section, { backgroundColor: colors.surface.default }]}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
            Items ({po.items.length})
          </Text>
          {po.items.map((item: any, idx: number) => (
            <View key={item.id}>
              {idx > 0 && <Divider style={styles.divider} />}
              <View style={styles.itemBlock}>
                <Text style={[styles.itemName, { color: colors.text.primary }]}>
                  {item.product?.name || 'Product'}
                </Text>
                <View style={styles.itemMeta}>
                  <Text style={[styles.subtle, { color: colors.text.secondary }]}>
                    {item.quantity} × {formatCurrency(item.price)}
                  </Text>
                  <Text style={[styles.itemTotal, { color: colors.text.primary }]}>
                    {formatCurrency(item.total)}
                  </Text>
                </View>
                {item.receivedQuantity !== undefined && (
                  <Text style={[styles.subtle, { color: colors.info.main }]}>
                    Received: {item.receivedQuantity} / {item.quantity}
                  </Text>
                )}
              </View>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={[styles.section, { backgroundColor: colors.surface.default }]}>
          <View style={styles.row}>
            <Text style={[styles.label, { color: colors.text.secondary }]}>Subtotal</Text>
            <Text style={[styles.value, { color: colors.text.primary }]}>
              {formatCurrency(po.subtotal)}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={[styles.label, { color: colors.text.secondary }]}>Tax</Text>
            <Text style={[styles.value, { color: colors.text.primary }]}>
              {formatCurrency(po.tax)}
            </Text>
          </View>
          <Divider style={styles.divider} />
          <View style={styles.row}>
            <Text style={[styles.totalLabel, { color: colors.text.primary }]}>Total</Text>
            <Text style={[styles.totalValue, { color: colors.primary.main }]}>
              {formatCurrency(po.total)}
            </Text>
          </View>
        </View>

        {po.notes && (
          <View style={[styles.section, { backgroundColor: colors.surface.default }]}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Notes</Text>
            <Text style={[styles.subtle, { color: colors.text.secondary }]}>{po.notes}</Text>
          </View>
        )}

        <Button
          mode="contained"
          icon="pencil"
          onPress={() => navigation.navigate('PurchaseOrderForm', { id: po.id })}
          style={{ marginTop: spacing[2] }}
        >
          Edit PO
        </Button>
      </ScrollView>

      <ConfirmationModal
        visible={deleteVisible}
        title="Delete purchase order?"
        message={`This will remove ${po.poNumber} permanently.`}
        confirmText="Delete"
        confirmVariant="danger"
        loading={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate()}
        onCancel={() => setDeleteVisible(false)}
      />
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  content: { padding: spacing[4], paddingBottom: spacing[8] },
  section: { borderRadius: borderRadius.lg, padding: spacing[4], marginBottom: spacing[3] },
  sectionTitle: { fontSize: 14, fontWeight: '700', marginBottom: spacing[3] },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing[1] },
  label: { fontSize: 13 },
  value: { fontSize: 13, fontWeight: '500' },
  totalLabel: { fontSize: 15, fontWeight: '700' },
  totalValue: { fontSize: 18, fontWeight: '800' },
  supplierName: { fontSize: 15, fontWeight: '600', marginBottom: spacing[1] },
  subtle: { fontSize: 12, marginTop: 2 },
  divider: { marginVertical: spacing[2] },
  itemBlock: { paddingVertical: spacing[2] },
  itemName: { fontSize: 14, fontWeight: '500', marginBottom: 4 },
  itemMeta: { flexDirection: 'row', justifyContent: 'space-between' },
  itemTotal: { fontSize: 14, fontWeight: '600' },
  notFound: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  notFoundText: { fontSize: 16, marginTop: spacing[3] },
});
