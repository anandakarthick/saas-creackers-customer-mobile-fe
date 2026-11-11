import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Button } from 'react-native-paper';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { Header } from '@/components/layout/Header';
import { useTheme } from '@/theme';
import { spacing } from '@/theme/spacing';
import { returnsApi, suppliersApi, productsApi } from '@/services/api';
import { SETTLEMENT_METHODS, errorMessage } from '@/services/api/returns.api';
import { formatCurrency, formatDate } from '@/utils';
import type { PurchaseReturnsStackParamList } from '@/types/navigation';
import { styles, Section, ChipRow, Stepper, LabeledInput, PickerSheet } from '../../shared';

type Nav = NativeStackNavigationProp<PurchaseReturnsStackParamList, 'PurchaseReturnForm'>;
type Route = RouteProp<PurchaseReturnsStackParamList, 'PurchaseReturnForm'>;
interface Line { key: string; purchaseOrderItemId?: number; productId?: number; name: string; sku: string; unitCost: number; max: number | null; quantity: number }

export const PurchaseReturnFormScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();

  const [purchaseOrderId, setPurchaseOrderId] = useState<number | undefined>(route.params?.purchaseOrderId ? Number(route.params.purchaseOrderId) : undefined);
  const [supplier, setSupplier] = useState<any | null>(null);
  const [supplierPicker, setSupplierPicker] = useState(false);
  const [supplierSearch, setSupplierSearch] = useState('');
  const [poPicker, setPoPicker] = useState(false);
  const [poSearch, setPoSearch] = useState('');
  const [productPicker, setProductPicker] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [lines, setLines] = useState<Line[]>([]);
  const [settlementMethod, setSettlementMethod] = useState('DEBIT_NOTE');
  const [settlementReference, setSettlementReference] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');

  const source = useQuery({ queryKey: ['returnablePurchase', purchaseOrderId], queryFn: () => returnsApi.getReturnablePurchase(purchaseOrderId!), enabled: !!purchaseOrderId });
  const suppliers = useQuery({ queryKey: ['supplierPick', supplierSearch], queryFn: () => suppliersApi.getSuppliers({ search: supplierSearch || undefined, limit: 30 }), enabled: supplierPicker });
  const pos = useQuery({ queryKey: ['poPick', poSearch, supplier?.id], queryFn: () => suppliersApi.getPurchaseOrders({ search: poSearch || undefined, limit: 30, ...(supplier ? { supplierId: supplier.id } : {}) } as any), enabled: poPicker });
  const products = useQuery({ queryKey: ['prProductSearch', productSearch], queryFn: () => productsApi.getProducts({ search: productSearch, limit: 10 } as any), enabled: productPicker && productSearch.trim().length >= 2 });

  useEffect(() => {
    const d: any = source.data;
    if (!d) return;
    setSupplier(d.purchaseOrder.supplier);
    setLines(d.items.filter((i: any) => i.returnable > 0).map((i: any) => ({ key: `poi-${i.purchaseOrderItemId}`, purchaseOrderItemId: i.purchaseOrderItemId, productId: i.productId ?? undefined, name: i.name, sku: i.sku, unitCost: i.unitCost, max: i.returnable, quantity: 0 })));
  }, [source.data]);

  const update = (key: string, patch: Partial<Line>) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  const active = lines.filter((l) => l.quantity > 0);
  const total = useMemo(() => active.reduce((s, l) => s + l.quantity * l.unitCost, 0), [active]);

  const create = useMutation({
    mutationFn: (payload: any) => returnsApi.createPurchaseReturn(payload),
    onSuccess: (r: any) => {
      qc.invalidateQueries({ queryKey: ['purchaseReturns'] }); qc.invalidateQueries({ queryKey: ['purchaseReturnStats'] }); qc.invalidateQueries({ queryKey: ['debitNotes'] });
      Alert.alert(`${r.returnNumber} recorded`, r.debitNote ? `Debit note ${r.debitNote.noteNumber} raised for ${formatCurrency(Number(r.debitNote.balance))}` : `Return value ${formatCurrency(Number(r.total))}`);
      navigation.goBack();
    },
    onError: (e: any) => Alert.alert('Could not record return', errorMessage(e)),
  });

  const submit = () => {
    if (active.length === 0) { Alert.alert('Validation', 'Enter a quantity for at least one item'); return; }
    if (!purchaseOrderId && !supplier) { Alert.alert('Validation', 'Pick a supplier'); return; }
    create.mutate({
      purchaseOrderId: purchaseOrderId ?? null, supplierId: supplier?.id ?? null,
      items: active.map((l) => ({ purchaseOrderItemId: l.purchaseOrderItemId, productId: l.purchaseOrderItemId ? undefined : l.productId, quantity: l.quantity, unitCost: l.unitCost })),
      settlementMethod, settlementReference: settlementReference || null, reason: reason || null, notes: notes || null,
    });
  };

  const po: any = (source.data as any)?.purchaseOrder;

  return (
    <ScreenWrapper scrollable={false}>
      <Header title="New Purchase Return" showBack />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: spacing[8] + insets.bottom }]} keyboardShouldPersistTaps="handled">
          <Section title="1. Supplier & purchase order">
            {po ? (
              <View>
                <Text style={{ fontWeight: '700', color: colors.text.primary }}>{po.orderNumber}</Text>
                <Text style={{ color: colors.text.secondary, marginTop: 2 }}>{po.supplier?.name} · {po.status} · {formatCurrency(po.total)}{po.receivedDate ? ` · received ${formatDate(po.receivedDate)}` : ''}</Text>
                <Button mode="text" compact onPress={() => { setPurchaseOrderId(undefined); setLines([]); }} style={{ alignSelf: 'flex-start' }}>Change</Button>
              </View>
            ) : source.isLoading ? <Text style={{ color: colors.text.secondary }}>Loading purchase order…</Text> : (
              <View style={{ gap: spacing[2] }}>
                <Button mode="outlined" icon="truck" onPress={() => setSupplierPicker(true)}>{supplier ? supplier.name : 'Pick supplier'}</Button>
                <Button mode="outlined" icon="clipboard-text" onPress={() => setPoPicker(true)}>Pick purchase order (optional)</Button>
              </View>
            )}
          </Section>

          <Section title="2. Items">
            {lines.length === 0 && po ? <Text style={{ color: colors.text.secondary }}>Nothing left to return on this purchase order.</Text> : null}
            {lines.map((l) => (
              <View key={l.key} style={[styles.itemRow, { borderBottomColor: colors.border.default }]}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '600', color: colors.text.primary }} numberOfLines={2}>{l.name}</Text>
                  <Text style={{ fontSize: 12, color: colors.text.tertiary }}>cost {formatCurrency(l.unitCost)}{l.max != null ? ` · returnable ${l.max}` : ''}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Stepper value={l.quantity} max={l.max} onChange={(v) => update(l.key, { quantity: v })} />
                  <Text style={{ fontWeight: '700', color: colors.text.primary, marginTop: 4 }}>{formatCurrency(l.quantity * l.unitCost)}</Text>
                </View>
              </View>
            ))}
            <Button mode="text" icon="plus" compact onPress={() => setProductPicker(true)} style={{ alignSelf: 'flex-start', marginTop: spacing[2] }}>Add product not on the PO</Button>
          </Section>

          <Section title="3. Settlement">
            <ChipRow options={SETTLEMENT_METHODS} value={settlementMethod} onChange={setSettlementMethod} />
            {settlementMethod === 'DEBIT_NOTE' && <Text style={{ fontSize: 12, color: colors.primary.main, marginVertical: spacing[2] }}>A debit note for the return value is raised against the supplier.</Text>}
            <View style={{ height: spacing[3] }} />
            <LabeledInput label="Reference" value={settlementReference} onChangeText={setSettlementReference} placeholder="Supplier credit ref / txn id" />
            <LabeledInput label="Reason" value={reason} onChangeText={setReason} placeholder="Damaged in transit, wrong item…" />
            <LabeledInput label="Notes" value={notes} onChangeText={setNotes} multiline />
          </Section>

          <Section>
            <View style={styles.totalsRow}><Text style={[styles.grandTotal, { color: colors.text.primary }]}>Return value</Text><Text style={[styles.grandTotal, { color: colors.primary.main }]}>{formatCurrency(total)}</Text></View>
            <View style={styles.buttonRow}>
              <Button mode="outlined" onPress={() => navigation.goBack()} style={{ flex: 1 }}>Cancel</Button>
              <Button mode="contained" onPress={submit} loading={create.isPending} disabled={create.isPending || active.length === 0} style={{ flex: 1 }}>Record return</Button>
            </View>
          </Section>
        </ScrollView>
      </KeyboardAvoidingView>

      <PickerSheet visible={supplierPicker} title="Pick supplier" onClose={() => setSupplierPicker(false)} search={supplierSearch} onSearch={setSupplierSearch}
        items={((suppliers.data as any)?.data as any[]) || []} keyOf={(s: any) => String(s.id)} loading={suppliers.isFetching}
        onPick={(s: any) => { setSupplier(s); setSupplierPicker(false); }}
        render={(s: any) => <View><Text style={{ fontWeight: '600', color: colors.text.primary }}>{s.name}</Text>{s.companyName ? <Text style={{ fontSize: 12, color: colors.text.secondary }}>{s.companyName}</Text> : null}</View>} />
      <PickerSheet visible={poPicker} title="Pick purchase order" onClose={() => setPoPicker(false)} search={poSearch} onSearch={setPoSearch}
        items={((pos.data as any)?.data as any[]) || []} keyOf={(p: any) => String(p.id)} loading={pos.isFetching}
        onPick={(p: any) => { setPurchaseOrderId(p.id); setPoPicker(false); }}
        render={(p: any) => <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><View><Text style={{ fontWeight: '600', color: colors.text.primary }}>{p.orderNumber}</Text><Text style={{ fontSize: 12, color: colors.text.secondary }}>{p.supplier?.name} · {p.status}</Text></View><Text style={{ fontWeight: '700', color: colors.text.primary }}>{formatCurrency(Number(p.total))}</Text></View>} />
      <PickerSheet visible={productPicker} title="Add product" onClose={() => setProductPicker(false)} search={productSearch} onSearch={setProductSearch}
        items={((products.data as any)?.data as any[]) || []} keyOf={(p: any) => String(p.id)} loading={products.isFetching} emptyText={productSearch.length < 2 ? 'Type a product name or SKU' : 'No products'}
        onPick={(p: any) => { if (!lines.some((l) => !l.purchaseOrderItemId && l.productId === p.id)) setLines((ls) => [...ls, { key: `p-${p.id}-${Date.now()}`, productId: p.id, name: p.name, sku: p.sku, unitCost: Number(p.costPrice ?? p.price ?? 0), max: Number(p.quantity ?? 0) || null, quantity: 1 }]); setProductPicker(false); setProductSearch(''); }}
        render={(p: any) => <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: colors.text.primary, flex: 1 }}>{p.name}</Text><Text style={{ color: colors.text.secondary }}>stock {p.quantity}</Text></View>} />
    </ScreenWrapper>
  );
};
