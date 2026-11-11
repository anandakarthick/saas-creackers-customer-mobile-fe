import React, { useEffect, useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
  Modal,
  ActivityIndicator,
  FlatList,
  TextInput,
} from 'react-native';
import { Button, Text, Divider } from 'react-native-paper';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useForm } from 'react-hook-form';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { Header } from '@/components/layout/Header';
import { FormInput } from '@/components/forms';
import { useTheme } from '@/theme';
import { spacing, borderRadius } from '@/theme/spacing';
import { estimatesApi, productsApi } from '@/services/api';
import { formatCurrency } from '@/utils';
import type { EstimatesStackParamList } from '@/types/navigation';

type NavigationProp = NativeStackNavigationProp<EstimatesStackParamList, 'EstimateForm'>;
type RouteProps = RouteProp<EstimatesStackParamList, 'EstimateForm'>;

interface LineItem {
  id: string;           // local UUID
  productId?: number;
  name: string;
  quantity: number;
  unitPrice: number;
}

interface EstimateFormData {
  customerName: string;
  email: string;
  phone: string;
  address: string;
  estimateDate: string;
  validUntil: string;
  discount: string;
  tax: string;
  notes: string;
  terms: string;
}

const toDateInput = (iso?: string) => {
  if (!iso) return '';
  try {
    return new Date(iso).toISOString().split('T')[0];
  } catch {
    return '';
  }
};

const today = () => new Date().toISOString().split('T')[0];

function genId() {
  return `line-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

export const EstimateFormScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const id = route.params?.id;
  const isEdit = !!id;

  const [items, setItems] = useState<LineItem[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [productSearch, setProductSearch] = useState('');

  const existingQuery = useQuery({
    queryKey: ['estimate', id],
    queryFn: () => estimatesApi.getEstimate(id!),
    enabled: isEdit,
  });

  const productsQuery = useQuery({
    queryKey: ['estimateFormProducts', productSearch],
    queryFn: () =>
      productsApi.getProducts({ page: 1, limit: 50, search: productSearch || undefined }),
    enabled: pickerOpen,
  });

  const { control, handleSubmit, reset } = useForm<EstimateFormData>({
    defaultValues: {
      customerName: '',
      email: '',
      phone: '',
      address: '',
      estimateDate: today(),
      validUntil: '',
      discount: '0',
      tax: '0',
      notes: '',
      terms: '',
    },
  });

  // Populate form + items when editing.
  useEffect(() => {
    const existing = existingQuery.data;
    if (existing) {
      reset({
        customerName: existing.customerName || '',
        email: existing.email || '',
        phone: existing.phone || '',
        address: existing.address || '',
        estimateDate: toDateInput(existing.estimateDate) || today(),
        validUntil: toDateInput(existing.validUntil),
        discount: String(Number(existing.discount || 0)),
        tax: String(Number(existing.tax || 0)),
        notes: existing.notes || '',
        terms: existing.terms || '',
      });
      setItems(
        (existing.items || []).map((it: any) => ({
          id: genId(),
          productId: it.productId ?? undefined,
          name: it.product?.name || it.name || 'Item',
          quantity: Number(it.quantity || 0),
          unitPrice: Number(it.unitPrice || 0),
        }))
      );
    }
  }, [existingQuery.data, reset]);

  const addProduct = (p: any) => {
    setItems((prev) => [
      ...prev,
      {
        id: genId(),
        productId: Number(p.id),
        name: p.name,
        quantity: 1,
        unitPrice: Number(p.price || 0),
      },
    ]);
    setPickerOpen(false);
    setProductSearch('');
  };

  const addBlankLine = () => {
    setItems((prev) => [
      ...prev,
      { id: genId(), name: 'Custom item', quantity: 1, unitPrice: 0 },
    ]);
  };

  const updateItem = (lineId: string, patch: Partial<LineItem>) =>
    setItems((prev) => prev.map((it) => (it.id === lineId ? { ...it, ...patch } : it)));

  const removeItem = (lineId: string) =>
    setItems((prev) => prev.filter((it) => it.id !== lineId));

  const subtotal = useMemo(
    () => items.reduce((sum, it) => sum + it.quantity * it.unitPrice, 0),
    [items]
  );

  const submitMutation = useMutation({
    mutationFn: (data: EstimateFormData) => {
      const discount = Number(data.discount) || 0;
      const tax = Number(data.tax) || 0;
      const total = Math.max(0, subtotal - discount) + tax;
      const payload = {
        customerName: data.customerName.trim(),
        email: data.email || undefined,
        phone: data.phone || undefined,
        address: data.address || undefined,
        estimateDate: data.estimateDate || undefined,
        validUntil: data.validUntil || undefined,
        subtotal,
        discount,
        tax,
        total,
        notes: data.notes || undefined,
        terms: data.terms || undefined,
        items: items.map((it) => ({
          productId: it.productId,
          name: it.name,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
        })),
      };
      return isEdit
        ? estimatesApi.updateEstimate(id!, payload)
        : estimatesApi.createEstimate(payload);
    },
    onSuccess: (result: any) => {
      queryClient.invalidateQueries({ queryKey: ['estimates'] });
      if (isEdit) queryClient.invalidateQueries({ queryKey: ['estimate', id] });
      // If creating, jump to the new estimate's detail page. If editing, go back.
      if (!isEdit && result?.id) {
        navigation.replace('EstimateDetail', { id: String(result.id) });
      } else {
        navigation.goBack();
      }
    },
    onError: (err: any) => Alert.alert('Error', err?.message || 'Failed to save estimate'),
  });

  const onSubmit = (data: EstimateFormData) => {
    if (!data.customerName.trim()) {
      Alert.alert('Customer required', 'Please enter a customer name.');
      return;
    }
    if (data.validUntil && data.estimateDate && data.validUntil < data.estimateDate) {
      Alert.alert('Validation', 'Valid until date cannot be before estimate date.');
      return;
    }
    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      Alert.alert('Validation', 'Please enter a valid email address.');
      return;
    }
    if (Number(data.discount) < 0) {
      Alert.alert('Validation', 'Discount cannot be negative.');
      return;
    }
    if (Number(data.tax) < 0) {
      Alert.alert('Validation', 'Tax cannot be negative.');
      return;
    }
    if (items.length === 0) {
      Alert.alert('Items required', 'Add at least one line item to the estimate.');
      return;
    }
    const negPrice = items.find((i) => i.unitPrice < 0);
    if (negPrice) {
      Alert.alert('Validation', 'Item price cannot be negative.');
      return;
    }
    submitMutation.mutate(data);
  };

  const products = productsQuery.data?.data || [];

  return (
    <ScreenWrapper scrollable={false}>
      <Header title={isEdit ? 'Edit Estimate' : 'New Estimate'} showBack />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: spacing[8] + insets.bottom }]}
        >
          {/* Customer */}
          <Section title="Customer" colors={colors}>
            <FormInput
              name="customerName"
              control={control}
              label="Customer Name *"
              placeholder="John Doe"
            />
            <FormInput
              name="phone"
              control={control}
              label="Phone"
              keyboardType="phone-pad"
            />
            <FormInput
              name="email"
              control={control}
              label="Email"
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <FormInput
              name="address"
              control={control}
              label="Address"
              multiline
              numberOfLines={2}
            />
          </Section>

          {/* Dates */}
          <Section title="Dates" colors={colors}>
            <View style={styles.row}>
              <View style={styles.half}>
                <FormInput
                  name="estimateDate"
                  control={control}
                  label="Estimate Date *"
                  placeholder="YYYY-MM-DD"
                />
              </View>
              <View style={styles.half}>
                <FormInput
                  name="validUntil"
                  control={control}
                  label="Valid Until"
                  placeholder="YYYY-MM-DD"
                />
              </View>
            </View>
          </Section>

          {/* Items */}
          <View style={[styles.section, { backgroundColor: colors.surface.default }]}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
              Line Items ({items.length})
            </Text>

            {items.length === 0 ? (
              <Text style={[styles.empty, { color: colors.text.secondary }]}>
                Add items from your product catalog or create custom lines.
              </Text>
            ) : (
              items.map((line, idx) => (
                <View key={line.id}>
                  {idx > 0 && <Divider style={styles.divider} />}
                  <View style={styles.lineRow}>
                    <View style={{ flex: 1 }}>
                      <TextInput
                        value={line.name}
                        onChangeText={(v) => updateItem(line.id, { name: v })}
                        style={[styles.lineName, { color: colors.text.primary }]}
                        placeholder="Item name"
                        placeholderTextColor={colors.text.tertiary}
                      />
                      <View style={styles.lineQtyRow}>
                        <View style={styles.qtyBox}>
                          <TouchableOpacity
                            onPress={() =>
                              updateItem(line.id, { quantity: Math.max(1, line.quantity - 1) })
                            }
                            style={[styles.qtyBtn, { backgroundColor: colors.neutral[100] }]}
                          >
                            <Icon name="minus" size={14} color={colors.text.primary} />
                          </TouchableOpacity>
                          <Text style={[styles.qtyValue, { color: colors.text.primary }]}>
                            {line.quantity}
                          </Text>
                          <TouchableOpacity
                            onPress={() => updateItem(line.id, { quantity: line.quantity + 1 })}
                            style={[styles.qtyBtn, { backgroundColor: colors.neutral[100] }]}
                          >
                            <Icon name="plus" size={14} color={colors.text.primary} />
                          </TouchableOpacity>
                        </View>
                        <Text style={[styles.subtle, { color: colors.text.tertiary }]}>×</Text>
                        <TextInput
                          value={String(line.unitPrice)}
                          onChangeText={(v) =>
                            updateItem(line.id, { unitPrice: parseFloat(v) || 0 })
                          }
                          keyboardType="decimal-pad"
                          style={[styles.priceInput, { color: colors.text.primary }]}
                          placeholder="0.00"
                          placeholderTextColor={colors.text.tertiary}
                        />
                        <Text style={[styles.lineTotal, { color: colors.text.primary }]}>
                          = {formatCurrency(line.quantity * line.unitPrice)}
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      onPress={() => removeItem(line.id)}
                      style={styles.removeBtn}
                    >
                      <Icon name="delete-outline" size={20} color={colors.error.main} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}

            <View style={styles.itemActions}>
              <Button mode="outlined" icon="magnify" onPress={() => setPickerOpen(true)}>
                Pick Product
              </Button>
              <Button mode="outlined" icon="plus" onPress={addBlankLine}>
                Custom Line
              </Button>
            </View>
          </View>

          {/* Totals */}
          <Section title="Totals" colors={colors}>
            <View style={styles.totalRow}>
              <Text style={{ color: colors.text.secondary }}>Subtotal</Text>
              <Text style={{ color: colors.text.primary, fontWeight: '600' }}>
                {formatCurrency(subtotal)}
              </Text>
            </View>
            <View style={styles.twoCol}>
              <View style={styles.half}>
                <FormInput
                  name="discount"
                  control={control}
                  label="Discount (₹)"
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={styles.half}>
                <FormInput name="tax" control={control} label="Tax (₹)" keyboardType="decimal-pad" />
              </View>
            </View>
          </Section>

          {/* Notes & Terms */}
          <Section title="Notes & Terms" colors={colors}>
            <FormInput
              name="notes"
              control={control}
              label="Internal Notes"
              multiline
              numberOfLines={3}
            />
            <FormInput
              name="terms"
              control={control}
              label="Terms & Conditions"
              multiline
              numberOfLines={3}
              placeholder="e.g. Valid for 30 days. GST extra."
            />
          </Section>

          <View style={styles.buttonRow}>
            <Button mode="outlined" onPress={() => navigation.goBack()} style={{ flex: 1 }}>
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={handleSubmit(onSubmit)}
              loading={submitMutation.isPending}
              disabled={submitMutation.isPending}
              style={{ flex: 2 }}
            >
              {isEdit ? 'Update Estimate' : 'Create Estimate'}
            </Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Product picker modal */}
      <Modal
        visible={pickerOpen}
        animationType="slide"
        onRequestClose={() => setPickerOpen(false)}
      >
        <ScreenWrapper scrollable={false} padding={false}>
          <Header
            title="Pick Product"
            showBack
            onBackPress={() => setPickerOpen(false)}
          />
          <View style={{ padding: spacing[4] }}>
            <TextInput
              value={productSearch}
              onChangeText={setProductSearch}
              placeholder="Search products..."
              placeholderTextColor={colors.text.tertiary}
              style={[
                styles.searchInput,
                {
                  backgroundColor: colors.surface.default,
                  color: colors.text.primary,
                  borderColor: colors.border.default,
                },
              ]}
            />
          </View>
          {productsQuery.isLoading ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <ActivityIndicator color={colors.primary.main} size="large" />
            </View>
          ) : (
            <FlatList
              data={products}
              keyExtractor={(p) => String(p.id)}
              contentContainerStyle={{ padding: spacing[4] }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => addProduct(item)}
                  style={[styles.productRow, { backgroundColor: colors.surface.default }]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.text.primary, fontWeight: '600' }}>
                      {item.name}
                    </Text>
                    <Text style={{ color: colors.text.tertiary, fontSize: 12 }}>
                      {item.sku}
                    </Text>
                  </View>
                  <Text style={{ color: colors.primary.main, fontWeight: '700' }}>
                    {formatCurrency(Number(item.price || 0))}
                  </Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={{ color: colors.text.secondary, textAlign: 'center', marginTop: 40 }}>
                  No products found
                </Text>
              }
            />
          )}
        </ScreenWrapper>
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
  row: { flexDirection: 'row', gap: spacing[3] },
  half: { flex: 1 },
  empty: { fontSize: 13, textAlign: 'center', paddingVertical: spacing[3] },
  divider: { marginVertical: spacing[1] },
  lineRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: spacing[2] },
  lineName: {
    fontSize: 14,
    fontWeight: '600',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingVertical: 4,
  },
  lineQtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing[2],
    gap: spacing[2],
    flexWrap: 'wrap',
  },
  qtyBox: { flexDirection: 'row', alignItems: 'center' },
  qtyBtn: {
    width: 26,
    height: 26,
    borderRadius: borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyValue: { minWidth: 32, textAlign: 'center', fontWeight: '700' },
  priceInput: {
    minWidth: 64,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'right',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingVertical: 2,
  },
  lineTotal: { fontSize: 13, fontWeight: '700', marginLeft: spacing[1] },
  removeBtn: { padding: spacing[1], marginTop: 2 },
  itemActions: { flexDirection: 'row', gap: spacing[2], marginTop: spacing[3] },
  subtle: { fontSize: 12 },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing[2],
  },
  twoCol: { flexDirection: 'row', gap: spacing[3], marginTop: spacing[2] },
  buttonRow: { flexDirection: 'row', gap: spacing[3], marginTop: spacing[2] },
  searchInput: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
    fontSize: 14,
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[3],
    borderRadius: borderRadius.md,
    marginBottom: spacing[2],
  },
});
