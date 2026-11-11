import React, { useEffect, useState } from 'react';
import { StyleSheet, View, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity, Alert } from 'react-native';
import { Button, Text, Divider } from 'react-native-paper';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useForm, useWatch } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { Header } from '@/components/layout/Header';
import { FormInput, FormSelect } from '@/components/forms';
import { useTheme } from '@/theme';
import { spacing, borderRadius } from '@/theme/spacing';
import { suppliersApi, inventoryApi } from '@/services/api';
import type { GRNStackParamList } from '@/types/navigation';

interface GRNLine {
  id: string;
  purchaseOrderItemId: number;
  productId: number;
  productName: string;
  orderedQty: number;
  receivedQty: number;
}

interface GRNFormData {
  purchaseOrderId: string;
  supplierId: string;
  receiptDate: string;
  invoiceNumber: string;
  notes: string;
}

type NavigationProp = NativeStackNavigationProp<GRNStackParamList, 'GRNForm'>;
type RouteProps = RouteProp<GRNStackParamList, 'GRNForm'>;

export const GRNFormScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [submitting, setSubmitting] = useState(false);
  const [lines, setLines] = useState<GRNLine[]>([]);

  const poIdFromRoute = route.params?.purchaseOrderId;
  const qc = useQueryClient();

  const { control, handleSubmit, setValue } = useForm<GRNFormData>({
    defaultValues: {
      purchaseOrderId: poIdFromRoute ? String(poIdFromRoute) : '',
      supplierId: '',
      receiptDate: new Date().toISOString().split('T')[0],
      invoiceNumber: '',
      notes: '',
    },
  });

  // Load approved / partially-received POs for the picker
  const { data: posRes } = useQuery<any>({
    queryKey: ['purchase-orders', 'grn-picker'],
    queryFn: () => suppliersApi.getPurchaseOrders({ page: 1, limit: 200 }),
  });
  const poList: any[] = posRes?.data || [];
  const poOptions = poList
    .filter((p: any) => {
      const s = String(p.status || '').toUpperCase();
      return s === 'APPROVED' || s === 'PARTIALLY_RECEIVED' || s === 'PENDING';
    })
    .map((p: any) => ({
      label: `${p.orderNumber || `PO-${p.id}`} — ${p.supplier?.name || ''}`,
      value: String(p.id),
    }));

  // Watch the selected PO and load its line items whenever it changes
  const selectedPoId = useWatch({ control, name: 'purchaseOrderId' });

  const { data: selectedPo } = useQuery<any>({
    queryKey: ['purchase-order', selectedPoId],
    queryFn: () => suppliersApi.getPurchaseOrder(selectedPoId as any),
    enabled: !!selectedPoId,
  });

  useEffect(() => {
    if (selectedPo) {
      setValue('supplierId', selectedPo.supplierId ? String(selectedPo.supplierId) : '');
      setLines(
        (selectedPo.items || []).map((item: any) => {
          const ordered = Number(item.quantity || 0);
          const already = Number(item.receivedQuantity || 0);
          return {
            id: `line-${item.id}`,
            purchaseOrderItemId: Number(item.id),
            productId: Number(item.productId),
            productName: item.product?.name || 'Product',
            orderedQty: ordered,
            receivedQty: Math.max(0, ordered - already),
          };
        })
      );
    } else {
      setLines([]);
    }
  }, [selectedPo, setValue]);

  const updateLineQty = (id: string, qty: number) => {
    setLines(lines.map((l) => (l.id === id ? { ...l, receivedQty: qty } : l)));
  };

  const submit = useMutation({
    mutationFn: (data: GRNFormData) => {
      const payload = {
        purchaseOrderId: Number(data.purchaseOrderId),
        notes: data.notes || undefined,
        invoiceNumber: data.invoiceNumber || undefined,
        receiptDate: data.receiptDate || undefined,
        items: lines
          .filter((l) => l.receivedQty > 0)
          .map((l) => ({
            purchaseOrderItemId: l.purchaseOrderItemId,
            receivedQty: l.receivedQty,
          })),
      };
      return inventoryApi.createGRN(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['grnLogs'] });
      qc.invalidateQueries({ queryKey: ['inventoryLogs'] });
      qc.invalidateQueries({ queryKey: ['purchase-orders'] });
      navigation.goBack();
    },
    onError: (e: any) => Alert.alert('Error', e?.message || 'Failed to receive goods'),
  });

  const onSubmit = async (data: GRNFormData) => {
    if (!data.purchaseOrderId) { Alert.alert('Validation', 'Select a purchase order'); return; }
    const totalReceiving = lines.reduce((s, l) => s + l.receivedQty, 0);
    if (totalReceiving === 0) { Alert.alert('Validation', 'Enter at least one received quantity'); return; }
    setSubmitting(true);
    try { await submit.mutateAsync(data); } finally { setSubmitting(false); }
  };

  return (
    <ScreenWrapper scrollable={false}>
      <Header title="New GRN" showBack />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: spacing[8] + insets.bottom }]}
        >
          <Section title="Receipt Details" colors={colors}>
            <FormSelect
              name="purchaseOrderId"
              control={control}
              label="Purchase Order *"
              options={poOptions}
            />
            <FormInput
              name="receiptDate"
              control={control}
              label="Receipt Date"
              placeholder="YYYY-MM-DD"
            />
            <FormInput
              name="invoiceNumber"
              control={control}
              label="Supplier Invoice #"
            />
            <FormInput
              name="notes"
              control={control}
              label="Notes"
              multiline
              numberOfLines={2}
            />
          </Section>

          <View style={[styles.section, { backgroundColor: colors.surface.default }]}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
              Items to Receive ({lines.length})
            </Text>
            {lines.length === 0 ? (
              <Text style={[styles.empty, { color: colors.text.secondary }]}>
                Select a Purchase Order above to load items.
              </Text>
            ) : (
              lines.map((line, idx) => (
                <View key={line.id}>
                  {idx > 0 && <Divider style={styles.divider} />}
                  <View style={styles.lineRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.lineName, { color: colors.text.primary }]}>
                        {line.productName}
                      </Text>
                      <Text style={[styles.subtle, { color: colors.text.secondary }]}>
                        Pending: {line.orderedQty}
                      </Text>
                    </View>
                    <View style={styles.qtyControl}>
                      <TouchableOpacity
                        onPress={() => updateLineQty(line.id, Math.max(0, line.receivedQty - 1))}
                        style={[styles.qtyBtn, { backgroundColor: colors.neutral[100] }]}
                      >
                        <Icon name="minus" size={16} color={colors.text.primary} />
                      </TouchableOpacity>
                      <Text style={[styles.qtyValue, { color: colors.text.primary }]}>
                        {line.receivedQty}
                      </Text>
                      <TouchableOpacity
                        onPress={() =>
                          updateLineQty(line.id, Math.min(line.orderedQty, line.receivedQty + 1))
                        }
                        style={[styles.qtyBtn, { backgroundColor: colors.neutral[100] }]}
                      >
                        <Icon name="plus" size={16} color={colors.text.primary} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))
            )}
          </View>

          <View style={styles.buttonRow}>
            <Button mode="outlined" onPress={() => navigation.goBack()} style={{ flex: 1 }}>
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={handleSubmit(onSubmit)}
              loading={submitting}
              disabled={submitting || lines.length === 0}
              style={{ flex: 2 }}
            >
              Receive Goods
            </Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
};

const Section: React.FC<{ title: string; children: React.ReactNode; colors: any }> = ({
  title,
  children,
  colors,
}) => (
  <View style={[styles.section, { backgroundColor: colors.surface.default }]}>
    <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>{title}</Text>
    {children}
  </View>
);

const styles = StyleSheet.create({
  content: { padding: spacing[4] },
  section: { borderRadius: borderRadius.lg, padding: spacing[4], marginBottom: spacing[3] },
  sectionTitle: { fontSize: 14, fontWeight: '700', marginBottom: spacing[3] },
  empty: { fontSize: 13, textAlign: 'center', paddingVertical: spacing[3] },
  divider: { marginVertical: spacing[1] },
  lineRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing[2] },
  lineName: { fontSize: 14, fontWeight: '500' },
  subtle: { fontSize: 12, marginTop: 2 },
  qtyControl: { flexDirection: 'row', alignItems: 'center' },
  qtyBtn: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyValue: { minWidth: 40, textAlign: 'center', fontWeight: '700' },
  buttonRow: { flexDirection: 'row', gap: spacing[3], marginTop: spacing[2] },
});
