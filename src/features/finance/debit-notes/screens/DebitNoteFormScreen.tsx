import React, { useState } from 'react';
import { View, Text, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Button } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { Header } from '@/components/layout/Header';
import { useTheme } from '@/theme';
import { spacing } from '@/theme/spacing';
import { returnsApi, suppliersApi } from '@/services/api';
import { errorMessage } from '@/services/api/returns.api';
import { formatCurrency } from '@/utils';
import type { DebitNotesStackParamList } from '@/types/navigation';
import { styles, Section, LabeledInput, PickerSheet } from '../../../returns/shared';

type Nav = NativeStackNavigationProp<DebitNotesStackParamList, 'DebitNoteForm'>;

export const DebitNoteFormScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const [supplier, setSupplier] = useState<any | null>(null);
  const [supplierPicker, setSupplierPicker] = useState(false);
  const [supplierSearch, setSupplierSearch] = useState('');
  const [po, setPo] = useState<any | null>(null);
  const [poPicker, setPoPicker] = useState(false);
  const [poSearch, setPoSearch] = useState('');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');

  const suppliers = useQuery({ queryKey: ['dnSupplierPick', supplierSearch], queryFn: () => suppliersApi.getSuppliers({ search: supplierSearch || undefined, limit: 30 }), enabled: supplierPicker });
  const pos = useQuery({ queryKey: ['dnPoPick', poSearch, supplier?.id], queryFn: () => suppliersApi.getPurchaseOrders({ search: poSearch || undefined, limit: 30, supplierId: supplier?.id } as any), enabled: poPicker && !!supplier });
  const create = useMutation({
    mutationFn: (payload: any) => returnsApi.createDebitNote(payload),
    onSuccess: (n: any) => { qc.invalidateQueries({ queryKey: ['debitNotes'] }); qc.invalidateQueries({ queryKey: ['debitNoteStats'] }); Alert.alert(`${n.noteNumber} raised`, `${formatCurrency(Number(n.amount))} against ${n.supplier?.name}`); navigation.replace('DebitNoteDetail', { id: String(n.id) }); },
    onError: (e: any) => Alert.alert('Could not raise debit note', errorMessage(e)),
  });
  const submit = () => {
    const amt = Number(amount);
    if (!supplier) { Alert.alert('Validation', 'Pick a supplier'); return; }
    if (!amt || amt <= 0) { Alert.alert('Validation', 'Enter an amount greater than zero'); return; }
    create.mutate({ supplierId: supplier.id, purchaseOrderId: po?.id ?? null, amount: amt, reason: reason || null, notes: notes || null });
  };

  return (
    <ScreenWrapper scrollable={false}>
      <Header title="Raise Debit Note" showBack />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: spacing[8] + insets.bottom }]} keyboardShouldPersistTaps="handled">
          <Section title="Supplier">
            <Button mode="outlined" icon="truck" onPress={() => setSupplierPicker(true)}>{supplier ? supplier.name : 'Pick supplier'}</Button>
            <View style={{ height: spacing[2] }} />
            <Button mode="outlined" icon="clipboard-text" disabled={!supplier} onPress={() => setPoPicker(true)}>{po ? `${po.orderNumber} · ${formatCurrency(Number(po.total))}` : 'Link purchase order (optional)'}</Button>
            {po ? <Button mode="text" compact onPress={() => setPo(null)} style={{ alignSelf: 'flex-start' }}>Clear PO</Button> : null}
          </Section>
          <Section title="Amount">
            <LabeledInput label="Amount (₹)" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" />
            <LabeledInput label="Reason" value={reason} onChangeText={setReason} placeholder="Short delivery, damaged goods, price difference…" />
            <LabeledInput label="Notes" value={notes} onChangeText={setNotes} multiline />
            <View style={styles.buttonRow}>
              <Button mode="outlined" onPress={() => navigation.goBack()} style={{ flex: 1 }}>Cancel</Button>
              <Button mode="contained" onPress={submit} loading={create.isPending} disabled={create.isPending} style={{ flex: 1 }}>Raise</Button>
            </View>
          </Section>
          <Text style={{ color: colors.text.tertiary, fontSize: 12, paddingHorizontal: spacing[1] }}>A debit note records money the supplier owes you; set it off against later purchases from the note's detail screen.</Text>
        </ScrollView>
      </KeyboardAvoidingView>
      <PickerSheet visible={supplierPicker} title="Pick supplier" onClose={() => setSupplierPicker(false)} search={supplierSearch} onSearch={setSupplierSearch}
        items={((suppliers.data as any)?.data as any[]) || []} keyOf={(s: any) => String(s.id)} loading={suppliers.isFetching}
        onPick={(s: any) => { setSupplier(s); setPo(null); setSupplierPicker(false); }}
        render={(s: any) => <View><Text style={{ fontWeight: '600', color: colors.text.primary }}>{s.name}</Text>{s.companyName ? <Text style={{ fontSize: 12, color: colors.text.secondary }}>{s.companyName}</Text> : null}</View>} />
      <PickerSheet visible={poPicker} title="Pick purchase order" onClose={() => setPoPicker(false)} search={poSearch} onSearch={setPoSearch}
        items={((pos.data as any)?.data as any[]) || []} keyOf={(p: any) => String(p.id)} loading={pos.isFetching}
        onPick={(p: any) => { setPo(p); setPoPicker(false); }}
        render={(p: any) => <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ fontWeight: '600', color: colors.text.primary }}>{p.orderNumber}</Text><Text style={{ color: colors.text.secondary }}>{formatCurrency(Number(p.total))} · {p.status}</Text></View>} />
    </ScreenWrapper>
  );
};
