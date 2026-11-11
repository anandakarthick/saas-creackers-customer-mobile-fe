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
import { returnsApi, customersApi } from '@/services/api';
import { customerLabel, errorMessage } from '@/services/api/returns.api';
import { formatCurrency } from '@/utils';
import type { CreditNotesStackParamList } from '@/types/navigation';
import { styles, Section, LabeledInput, PickerSheet } from '../../../returns/shared';

type Nav = NativeStackNavigationProp<CreditNotesStackParamList, 'CreditNoteForm'>;

export const CreditNoteFormScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const [customer, setCustomer] = useState<any | null>(null);
  const [picker, setPicker] = useState(false);
  const [search, setSearch] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [expiryDate, setExpiryDate] = useState('');

  const customers = useQuery({ queryKey: ['cnCustomerPick', search], queryFn: () => customersApi.getCustomers({ search: search || undefined, limit: 30 } as any), enabled: picker });
  const create = useMutation({
    mutationFn: (payload: any) => returnsApi.createCreditNote(payload),
    onSuccess: (n: any) => { qc.invalidateQueries({ queryKey: ['creditNotes'] }); qc.invalidateQueries({ queryKey: ['creditNoteStats'] }); Alert.alert(`${n.noteNumber} issued`, `${formatCurrency(Number(n.amount))} store credit for ${customerLabel(n.customer, n.customerName)}`); navigation.replace('CreditNoteDetail', { id: String(n.id) }); },
    onError: (e: any) => Alert.alert('Could not issue credit note', errorMessage(e)),
  });

  const submit = () => {
    const amt = Number(amount);
    if (!amt || amt <= 0) { Alert.alert('Validation', 'Enter an amount greater than zero'); return; }
    if (!customer && !customerName.trim()) { Alert.alert('Validation', 'Pick a customer or enter a name'); return; }
    if (expiryDate && !/^\d{4}-\d{2}-\d{2}$/.test(expiryDate)) { Alert.alert('Validation', 'Expiry date must be YYYY-MM-DD'); return; }
    create.mutate({ customerId: customer?.id ?? null, customerName: customer ? null : customerName.trim(), amount: amt, reason: reason || null, notes: notes || null, expiryDate: expiryDate || null });
  };

  return (
    <ScreenWrapper scrollable={false}>
      <Header title="Issue Credit Note" showBack />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: spacing[8] + insets.bottom }]} keyboardShouldPersistTaps="handled">
          <Section title="Customer">
            {customer ? (
              <View><Text style={{ fontWeight: '700', color: colors.text.primary }}>{customerLabel(customer)}</Text><Text style={{ color: colors.text.secondary }}>{customer.phone || customer.email}</Text><Button mode="text" compact onPress={() => setCustomer(null)} style={{ alignSelf: 'flex-start' }}>Change</Button></View>
            ) : (
              <View>
                <Button mode="outlined" icon="account-search" onPress={() => setPicker(true)}>Find existing customer</Button>
                <View style={{ marginTop: spacing[3] }}><LabeledInput label="…or a walk-in name" value={customerName} onChangeText={setCustomerName} placeholder="Customer name" /></View>
              </View>
            )}
          </Section>
          <Section title="Credit">
            <LabeledInput label="Amount (₹)" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" />
            <LabeledInput label="Expiry date (optional)" value={expiryDate} onChangeText={setExpiryDate} placeholder="YYYY-MM-DD" />
            <LabeledInput label="Reason" value={reason} onChangeText={setReason} placeholder="Goodwill, price difference, overpayment…" />
            <LabeledInput label="Notes" value={notes} onChangeText={setNotes} multiline />
            <View style={styles.buttonRow}>
              <Button mode="outlined" onPress={() => navigation.goBack()} style={{ flex: 1 }}>Cancel</Button>
              <Button mode="contained" onPress={submit} loading={create.isPending} disabled={create.isPending} style={{ flex: 1 }}>Issue</Button>
            </View>
          </Section>
        </ScrollView>
      </KeyboardAvoidingView>
      <PickerSheet visible={picker} title="Find customer" onClose={() => setPicker(false)} search={search} onSearch={setSearch}
        items={((customers.data as any)?.data as any[]) || []} keyOf={(c: any) => String(c.id)} loading={customers.isFetching}
        onPick={(c: any) => { setCustomer(c); setPicker(false); }}
        render={(c: any) => <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ fontWeight: '600', color: colors.text.primary }}>{customerLabel(c)}</Text><Text style={{ color: colors.text.secondary, fontSize: 12 }}>{c.phone || c.email}</Text></View>} />
    </ScreenWrapper>
  );
};
