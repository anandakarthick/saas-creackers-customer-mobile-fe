import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, KeyboardAvoidingView, Platform, Alert, TouchableOpacity, Switch } from 'react-native';
import { Button } from 'react-native-paper';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { Header } from '@/components/layout/Header';
import { useTheme } from '@/theme';
import { spacing } from '@/theme/spacing';
import { returnsApi, posApi, ordersApi, productsApi } from '@/services/api';
import { REFUND_METHODS, customerLabel, errorMessage } from '@/services/api/returns.api';
import { formatCurrency, formatDate } from '@/utils';
import type { SalesReturnsStackParamList } from '@/types/navigation';
import { styles, Section, ChipRow, Stepper, LabeledInput, PickerSheet } from '../../shared';

type Nav = NativeStackNavigationProp<SalesReturnsStackParamList, 'SalesReturnForm'>;
type Route = RouteProp<SalesReturnsStackParamList, 'SalesReturnForm'>;

interface Line { key: string; orderItemId?: number; productId?: number; name: string; sku: string; unitPrice: number; max: number | null; quantity: number; damaged: boolean }

export const SalesReturnFormScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();

  const [orderId, setOrderId] = useState<number | undefined>(route.params?.orderId ? Number(route.params.orderId) : undefined);
  const [salePicker, setSalePicker] = useState(false);
  const [saleSearch, setSaleSearch] = useState('');
  const [productPicker, setProductPicker] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [lines, setLines] = useState<Line[]>([]);
  const [refundMethod, setRefundMethod] = useState('CASH');
  const [refundReference, setRefundReference] = useState('');
  const [deduction, setDeduction] = useState('0');
  const [restock, setRestock] = useState(true);
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [customerName, setCustomerName] = useState('');

  const source = useQuery({ queryKey: ['returnableSale', orderId], queryFn: () => returnsApi.getReturnableSale(orderId!), enabled: !!orderId });
  const sales = useQuery({
    queryKey: ['saleSearchMobile', saleSearch],
    queryFn: async () => {
      const [pos, online] = await Promise.all([posApi.getPOSSales({ search: saleSearch, limit: 10 } as any), ordersApi.getOrders({ search: saleSearch, limit: 10 } as any)]);
      return [...((pos as any)?.data || []).map((s: any) => ({ ...s, channel: 'POS' })), ...((online as any)?.data || []).map((o: any) => ({ ...o, channel: 'ONLINE' }))]
        .filter((s: any) => s.status !== 'CANCELLED' && s.status !== 'ESTIMATE');
    },
    enabled: salePicker && saleSearch.trim().length >= 2,
  });
  const products = useQuery({ queryKey: ['returnProductSearch', productSearch], queryFn: () => productsApi.getProducts({ search: productSearch, limit: 10 } as any), enabled: productPicker && productSearch.trim().length >= 2 });

  useEffect(() => {
    const d: any = source.data;
    if (!d) return;
    setLines(d.items.filter((i: any) => i.returnable > 0).map((i: any) => ({
      key: `oi-${i.orderItemId}`, orderItemId: i.orderItemId, productId: i.productId ?? undefined, name: i.name, sku: i.sku, unitPrice: i.unitPrice, max: i.returnable, quantity: 0, damaged: false,
    })));
    if (d.order.channel === 'ONLINE') setRefundMethod('BANK_TRANSFER');
  }, [source.data]);

  const update = (key: string, patch: Partial<Line>) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  const active = lines.filter((l) => l.quantity > 0);
  const subtotal = useMemo(() => active.reduce((s, l) => s + l.quantity * l.unitPrice, 0), [active]);
  const ded = Math.max(0, Number(deduction) || 0);
  const total = Math.max(0, subtotal - ded);

  const create = useMutation({
    mutationFn: (payload: any) => returnsApi.createSalesReturn(payload),
    onSuccess: (r: any) => {
      qc.invalidateQueries({ queryKey: ['salesReturns'] }); qc.invalidateQueries({ queryKey: ['salesReturnStats'] });
      qc.invalidateQueries({ queryKey: ['creditNotes'] }); qc.invalidateQueries({ queryKey: ['posSale'] }); qc.invalidateQueries({ queryKey: ['posSales'] });
      Alert.alert(`${r.returnNumber} recorded`, r.creditNote ? `Credit note ${r.creditNote.noteNumber} issued for ${formatCurrency(Number(r.creditNote.balance))}` : `Refund ${formatCurrency(Number(r.total))}`);
      navigation.goBack();
    },
    onError: (e: any) => Alert.alert('Could not record return', errorMessage(e)),
  });

  const submit = () => {
    if (active.length === 0) { Alert.alert('Validation', 'Enter a quantity for at least one item'); return; }
    create.mutate({
      orderId: orderId ?? null,
      customerName: !orderId && customerName.trim() ? customerName.trim() : null,
      items: active.map((l) => ({ orderItemId: l.orderItemId, productId: l.orderItemId ? undefined : l.productId, quantity: l.quantity, unitPrice: l.orderItemId ? undefined : l.unitPrice, condition: l.damaged ? 'DAMAGED' : 'GOOD' })),
      refundMethod, refundReference: refundReference || null, deduction: ded, restock, reason: reason || null, notes: notes || null,
    });
  };

  const order: any = (source.data as any)?.order;

  return (
    <ScreenWrapper scrollable={false}>
      <Header title="New Sales Return" showBack />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: spacing[8] + insets.bottom }]} keyboardShouldPersistTaps="handled">
          <Section title="1. Bill / order">
            {order ? (
              <View>
                <Text style={{ fontWeight: '700', color: colors.text.primary }}>{order.orderNumber} <Text style={{ fontWeight: '400', color: colors.text.tertiary }}>· {order.channel}</Text></Text>
                <Text style={{ color: colors.text.secondary, marginTop: 2 }}>{customerLabel(order.customer)} · {formatDate(order.createdAt)} · {formatCurrency(order.total)}</Text>
                {(source.data as any).previousReturns?.length > 0 && <Text style={{ color: '#B45309', fontSize: 12, marginTop: 4 }}>Earlier returns: {(source.data as any).previousReturns.map((r: any) => r.returnNumber).join(', ')}</Text>}
                <Button mode="text" compact onPress={() => { setOrderId(undefined); setLines([]); }} style={{ alignSelf: 'flex-start' }}>Change</Button>
              </View>
            ) : source.isLoading ? <Text style={{ color: colors.text.secondary }}>Loading bill…</Text>
              : source.isError ? <Text style={{ color: colors.error.main }}>{errorMessage(source.error, 'Could not load bill')}</Text>
              : (
                <View>
                  <Button mode="outlined" icon="magnify" onPress={() => setSalePicker(true)}>Find bill / order</Button>
                  <View style={{ marginTop: spacing[3] }}>
                    <LabeledInput label="Or customer name (return without a bill)" value={customerName} onChangeText={setCustomerName} placeholder="Walk-in customer" />
                  </View>
                </View>
              )}
          </Section>

          <Section title="2. Items">
            {lines.length === 0 && order ? <Text style={{ color: colors.text.secondary }}>Every unit on this bill has already been returned.</Text> : null}
            {lines.map((l) => (
              <View key={l.key} style={[styles.itemRow, { borderBottomColor: colors.border.default }]}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '600', color: colors.text.primary }} numberOfLines={2}>{l.name}</Text>
                  <Text style={{ fontSize: 12, color: colors.text.tertiary }}>{formatCurrency(l.unitPrice)}{l.max != null ? ` · returnable ${l.max}` : ''}</Text>
                  <TouchableOpacity onPress={() => update(l.key, { damaged: !l.damaged })} style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                    <Icon name={l.damaged ? 'checkbox-marked' : 'checkbox-blank-outline'} size={18} color={l.damaged ? colors.error.main : colors.neutral[400]} />
                    <Text style={{ fontSize: 12, marginLeft: 4, color: l.damaged ? colors.error.main : colors.text.secondary }}>Damaged (don't restock)</Text>
                  </TouchableOpacity>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Stepper value={l.quantity} max={l.max} onChange={(v) => update(l.key, { quantity: v })} />
                  <Text style={{ fontWeight: '700', color: colors.text.primary, marginTop: 4 }}>{formatCurrency(l.quantity * l.unitPrice)}</Text>
                </View>
              </View>
            ))}
            <Button mode="text" icon="plus" compact onPress={() => setProductPicker(true)} style={{ alignSelf: 'flex-start', marginTop: spacing[2] }}>Add product not on the bill</Button>
          </Section>

          <Section title="3. Refund">
            <ChipRow options={REFUND_METHODS} value={refundMethod} onChange={setRefundMethod} />
            {refundMethod === 'CREDIT_NOTE' && <Text style={{ fontSize: 12, color: colors.primary.main, marginVertical: spacing[2] }}>A credit note for the refund amount will be issued to the customer.</Text>}
            <View style={{ height: spacing[3] }} />
            <LabeledInput label="Reference (UPI ref / txn id)" value={refundReference} onChangeText={setRefundReference} />
            <LabeledInput label="Deduction (restocking / damage charge)" value={deduction} onChangeText={setDeduction} keyboardType="decimal-pad" />
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing[3] }}>
              <Text style={{ color: colors.text.primary }}>Put good units back in stock</Text>
              <Switch value={restock} onValueChange={setRestock} />
            </View>
            <LabeledInput label="Reason" value={reason} onChangeText={setReason} placeholder="Damaged, wrong item, changed mind…" />
            <LabeledInput label="Notes" value={notes} onChangeText={setNotes} multiline />
          </Section>

          <Section>
            <View style={styles.totalsRow}><Text style={[styles.totalsLabel, { color: colors.text.secondary }]}>Items</Text><Text style={[styles.totalsValue, { color: colors.text.primary }]}>{active.reduce((s, l) => s + l.quantity, 0)}</Text></View>
            <View style={styles.totalsRow}><Text style={[styles.totalsLabel, { color: colors.text.secondary }]}>Subtotal</Text><Text style={[styles.totalsValue, { color: colors.text.primary }]}>{formatCurrency(subtotal)}</Text></View>
            {ded > 0 && <View style={styles.totalsRow}><Text style={[styles.totalsLabel, { color: colors.error.main }]}>Deduction</Text><Text style={[styles.totalsValue, { color: colors.error.main }]}>- {formatCurrency(ded)}</Text></View>}
            <View style={styles.totalsRow}><Text style={[styles.grandTotal, { color: colors.text.primary }]}>Refund</Text><Text style={[styles.grandTotal, { color: colors.primary.main }]}>{formatCurrency(total)}</Text></View>
            <View style={styles.buttonRow}>
              <Button mode="outlined" onPress={() => navigation.goBack()} style={{ flex: 1 }}>Cancel</Button>
              <Button mode="contained" onPress={submit} loading={create.isPending} disabled={create.isPending || active.length === 0} style={{ flex: 1 }}>Record return</Button>
            </View>
          </Section>
        </ScrollView>
      </KeyboardAvoidingView>

      <PickerSheet visible={salePicker} title="Find bill / order" onClose={() => setSalePicker(false)} search={saleSearch} onSearch={setSaleSearch}
        items={(sales.data as any[]) || []} keyOf={(s: any) => `${s.channel}-${s.id}`} loading={sales.isFetching} emptyText={saleSearch.length < 2 ? 'Type a bill number, name or phone' : 'No matching bills'}
        onPick={(s: any) => { setOrderId(s.id); setSalePicker(false); setSaleSearch(''); }}
        render={(s: any) => (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <View><Text style={{ fontWeight: '600', color: colors.text.primary }}>{s.orderNumber} <Text style={{ color: colors.text.tertiary, fontWeight: '400' }}>· {s.channel}</Text></Text><Text style={{ color: colors.text.secondary, fontSize: 12 }}>{customerLabel(s.customer)} · {formatDate(s.createdAt)}</Text></View>
            <Text style={{ fontWeight: '700', color: colors.text.primary }}>{formatCurrency(Number(s.total))}</Text>
          </View>
        )} />
      <PickerSheet visible={productPicker} title="Add product" onClose={() => setProductPicker(false)} search={productSearch} onSearch={setProductSearch}
        items={((products.data as any)?.data as any[]) || []} keyOf={(p: any) => String(p.id)} loading={products.isFetching} emptyText={productSearch.length < 2 ? 'Type a product name or SKU' : 'No products'}
        onPick={(p: any) => { if (!lines.some((l) => !l.orderItemId && l.productId === p.id)) setLines((ls) => [...ls, { key: `p-${p.id}-${Date.now()}`, productId: p.id, name: p.name, sku: p.sku, unitPrice: Number(p.price), max: null, quantity: 1, damaged: false }]); setProductPicker(false); setProductSearch(''); }}
        render={(p: any) => <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: colors.text.primary, flex: 1 }}>{p.name}</Text><Text style={{ color: colors.text.secondary }}>{formatCurrency(Number(p.price))}</Text></View>} />
    </ScreenWrapper>
  );
};
