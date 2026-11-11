import React, { useEffect, useState, useMemo } from 'react';
import { StyleSheet, View, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity, Modal, FlatList, TextInput, Alert } from 'react-native';
import { Button, Text, Divider, Searchbar } from 'react-native-paper';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { Header } from '@/components/layout/Header';
import { FormInput, FormSelect } from '@/components/forms';
import { useTheme } from '@/theme';
import { spacing, borderRadius } from '@/theme/spacing';
import { suppliersApi, productsApi } from '@/services/api';
import { formatCurrency } from '@/utils';
import type { PurchaseOrdersStackParamList } from '@/types/navigation';

interface LineItem {
  id: string;
  productId?: number;
  productName: string;
  sku?: string;
  quantity: number;
  price: number;
}

interface POFormData {
  supplierId: string;
  status: string;
  expectedDate: string;
  notes: string;
}

type NavigationProp = NativeStackNavigationProp<PurchaseOrdersStackParamList, 'PurchaseOrderForm'>;
type RouteProps = RouteProp<PurchaseOrdersStackParamList, 'PurchaseOrderForm'>;

const STATUS_OPTIONS = [
  { label: 'Pending', value: 'PENDING' },
  { label: 'Approved', value: 'APPROVED' },
  { label: 'Partially Received', value: 'PARTIALLY_RECEIVED' },
  { label: 'Received', value: 'RECEIVED' },
  { label: 'Cancelled', value: 'CANCELLED' },
];

export const PurchaseOrderFormScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const [submitting, setSubmitting] = useState(false);
  const [items, setItems] = useState<LineItem[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [productSearch, setProductSearch] = useState('');

  const id = route.params?.id;
  const isEdit = !!id;

  const { data: suppliersRes } = useQuery<any>({
    queryKey: ['suppliers', 'all'],
    queryFn: () => suppliersApi.getSuppliers({ page: 1, limit: 200, isActive: true }),
  });
  const suppliersList: any[] = suppliersRes?.data || [];

  const { data: productsRes } = useQuery<any>({
    queryKey: ['products', 'po-picker', productSearch],
    queryFn: () => productsApi.getProducts({ page: 1, limit: 50, search: productSearch || undefined }),
    enabled: pickerOpen,
  });
  const productsList: any[] = productsRes?.data || [];

  const { data: existing } = useQuery<any>({
    queryKey: ['purchase-order', id],
    queryFn: () => suppliersApi.getPurchaseOrder(id as any),
    enabled: isEdit,
  });

  const { control, handleSubmit, reset } = useForm<POFormData>({
    defaultValues: { supplierId: '', status: 'PENDING', expectedDate: '', notes: '' },
  });

  useEffect(() => {
    if (existing) {
      reset({
        supplierId: existing.supplierId ? String(existing.supplierId) : '',
        status: (existing.status || 'PENDING').toUpperCase(),
        expectedDate: existing.expectedDate ? String(existing.expectedDate).slice(0, 10) : '',
        notes: existing.notes || '',
      });
      setItems(
        (existing.items || []).map((i: any, idx: number) => ({
          id: `line-${i.id || idx}`,
          productId: i.productId,
          productName: i.product?.name || i.name || 'Product',
          sku: i.product?.sku || '',
          quantity: Number(i.quantity || 0),
          price: Number(i.price || i.unitPrice || 0),
        }))
      );
    }
  }, [existing, reset]);

  const supplierOptions = suppliersList.map((s: any) => ({
    label: s.name,
    value: String(s.id),
  }));

  const addProduct = (prod: any) => {
    setItems((prev) => [
      ...prev,
      {
        id: `line-${Date.now()}`,
        productId: Number(prod.id),
        productName: prod.name,
        sku: prod.sku || '',
        quantity: 1,
        price: Number(prod.costPrice || prod.price || 0),
      },
    ]);
    setPickerOpen(false);
    setProductSearch('');
  };

  const updateItem = (itemId: string, patch: Partial<LineItem>) => {
    setItems(items.map((i) => (i.id === itemId ? { ...i, ...patch } : i)));
  };

  const removeItem = (itemId: string) => {
    setItems(items.filter((i) => i.id !== itemId));
  };

  const subtotal = useMemo(
    () => items.reduce((sum, i) => sum + i.quantity * i.price, 0),
    [items]
  );
  const tax = Math.round(subtotal * 0.18);
  const total = subtotal + tax;

  const submit = useMutation({
    mutationFn: (data: POFormData) => {
      const payload: any = {
        supplierId: Number(data.supplierId),
        status: data.status,
        expectedDate: data.expectedDate || undefined,
        notes: data.notes || undefined,
        subtotal,
        tax,
        total,
        items: items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          price: i.price,
        })),
      };
      return isEdit
        ? suppliersApi.updatePurchaseOrder(id as any, payload)
        : suppliersApi.createPurchaseOrder(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchase-orders'] });
      navigation.goBack();
    },
    onError: (e: any) => Alert.alert('Error', e?.message || 'Failed to save'),
  });

  const onSubmit = async (data: POFormData) => {
    if (!data.supplierId) { Alert.alert('Validation', 'Please select a supplier'); return; }
    if (items.length === 0) { Alert.alert('Validation', 'Add at least one line item'); return; }
    setSubmitting(true);
    try { await submit.mutateAsync(data); } finally { setSubmitting(false); }
  };

  return (
    <ScreenWrapper scrollable={false}>
      <Header title={isEdit ? 'Edit PO' : 'New Purchase Order'} showBack />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: spacing[8] + insets.bottom }]}
          keyboardShouldPersistTaps="handled"
        >
          <Section title="PO Details" colors={colors}>
            <FormSelect
              name="supplierId"
              control={control}
              label="Supplier *"
              options={supplierOptions}
              placeholder="Select supplier"
            />
            <FormSelect name="status" control={control} label="Status" options={STATUS_OPTIONS} />
            <FormInput
              name="expectedDate"
              control={control}
              label="Expected Date"
              placeholder="YYYY-MM-DD"
            />
            <FormInput
              name="notes"
              control={control}
              label="Notes"
              multiline
              numberOfLines={3}
            />
          </Section>

          <Section title={`Line Items (${items.length})`} colors={colors}>
            {items.map((item, idx) => (
              <View key={item.id}>
                {idx > 0 && <Divider style={styles.divider} />}
                <View style={styles.itemRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.itemName, { color: colors.text.primary }]} numberOfLines={1}>
                      {item.productName}
                    </Text>
                    {item.sku ? (
                      <Text style={[styles.subtle, { color: colors.text.tertiary }]}>SKU {item.sku}</Text>
                    ) : null}
                  </View>
                  <TouchableOpacity onPress={() => removeItem(item.id)} style={styles.trashBtn}>
                    <Icon name="delete-outline" size={20} color={colors.error.main} />
                  </TouchableOpacity>
                </View>
                <View style={styles.qtyRow}>
                  <Text style={[styles.subtle, { color: colors.text.secondary, flex: 1 }]}>Qty</Text>
                  <TextInput
                    style={[styles.numInput, { borderColor: colors.border.default, color: colors.text.primary }]}
                    keyboardType="numeric"
                    value={String(item.quantity)}
                    onChangeText={(v) => updateItem(item.id, { quantity: Math.max(0, Number(v) || 0) })}
                  />
                  <Text style={[styles.subtle, { color: colors.text.secondary, marginHorizontal: spacing[2] }]}>×</Text>
                  <TextInput
                    style={[styles.numInput, { borderColor: colors.border.default, color: colors.text.primary, flex: 1 }]}
                    keyboardType="numeric"
                    value={String(item.price)}
                    onChangeText={(v) => updateItem(item.id, { price: Math.max(0, Number(v) || 0) })}
                  />
                  <Text style={[styles.lineTotal, { color: colors.success.main }]}>
                    {formatCurrency(item.quantity * item.price)}
                  </Text>
                </View>
              </View>
            ))}
            {items.length === 0 && (
              <Text style={[styles.emptyText, { color: colors.text.secondary }]}>
                No items yet. Add one below.
              </Text>
            )}
            <Button
              mode="outlined"
              icon="plus"
              onPress={() => setPickerOpen(true)}
              style={{ marginTop: spacing[2] }}
            >
              Add Product
            </Button>
          </Section>

          <Section title="Totals" colors={colors}>
            <View style={styles.row}>
              <Text style={{ color: colors.text.secondary }}>Subtotal</Text>
              <Text style={{ color: colors.text.primary, fontWeight: '500' }}>
                {formatCurrency(subtotal)}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={{ color: colors.text.secondary }}>Tax (18%)</Text>
              <Text style={{ color: colors.text.primary, fontWeight: '500' }}>
                {formatCurrency(tax)}
              </Text>
            </View>
            <Divider style={styles.divider} />
            <View style={styles.row}>
              <Text style={{ color: colors.text.primary, fontWeight: '700', fontSize: 16 }}>Total</Text>
              <Text style={{ color: colors.primary.main, fontWeight: '800', fontSize: 18 }}>
                {formatCurrency(total)}
              </Text>
            </View>
          </Section>

          <View style={styles.buttonRow}>
            <Button mode="outlined" onPress={() => navigation.goBack()} style={{ flex: 1 }}>
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={handleSubmit(onSubmit)}
              loading={submitting}
              disabled={submitting || items.length === 0}
              style={{ flex: 2 }}
            >
              {isEdit ? 'Update' : 'Create PO'}
            </Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={pickerOpen} animationType="slide" onRequestClose={() => setPickerOpen(false)}>
        <View style={{ flex: 1, backgroundColor: colors.background.default }}>
          <Header title="Select Product" showBack onBackPress={() => setPickerOpen(false)} />
          <View style={{ padding: spacing[3] }}>
            <Searchbar
              placeholder="Search products..."
              value={productSearch}
              onChangeText={setProductSearch}
            />
          </View>
          <FlatList
            data={productsList}
            keyExtractor={(it) => String(it.id)}
            contentContainerStyle={{ padding: spacing[3] }}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.pickerItem, { backgroundColor: colors.surface.default }]}
                onPress={() => addProduct(item)}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text.primary, fontWeight: '600' }} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={{ color: colors.text.tertiary, fontSize: 12, marginTop: 2 }}>
                    {item.sku ? `SKU ${item.sku} • ` : ''}
                    {formatCurrency(Number(item.costPrice || item.price || 0))}
                  </Text>
                </View>
                <Icon name="plus-circle" size={22} color={colors.primary.main} />
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <Text style={{ textAlign: 'center', color: colors.text.secondary, paddingVertical: spacing[6] }}>
                No products found
              </Text>
            }
          />
        </View>
      </Modal>
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
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing[1] },
  divider: { marginVertical: spacing[2] },
  itemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing[2] },
  itemName: { fontSize: 14, fontWeight: '500' },
  subtle: { fontSize: 12, marginTop: 2 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing[1] },
  numInput: {
    borderWidth: 1,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    minWidth: 60,
    textAlign: 'center',
    fontSize: 13,
  },
  lineTotal: { fontSize: 13, fontWeight: '700', marginLeft: spacing[2], minWidth: 70, textAlign: 'right' },
  trashBtn: { padding: spacing[2] },
  emptyText: { fontSize: 13, textAlign: 'center', paddingVertical: spacing[3] },
  buttonRow: { flexDirection: 'row', gap: spacing[3], marginTop: spacing[2] },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.md,
    padding: spacing[3],
    marginBottom: spacing[2],
  },
});
