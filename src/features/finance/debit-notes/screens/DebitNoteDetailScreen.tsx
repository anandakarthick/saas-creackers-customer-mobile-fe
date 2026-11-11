import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, ActivityIndicator, Alert, Modal } from 'react-native';
import { Button } from 'react-native-paper';
import { useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { Header } from '@/components/layout/Header';
import { useTheme } from '@/theme';
import { spacing } from '@/theme/spacing';
import { returnsApi, suppliersApi } from '@/services/api';
import { errorMessage } from '@/services/api/returns.api';
import { formatCurrency, formatDate, formatDateTime } from '@/utils';
import type { DebitNotesStackParamList } from '@/types/navigation';
import { styles, Section, DetailRow, ReasonModal, StatusBadge, LabeledInput, PickerSheet } from '../../../returns/shared';

type Route = RouteProp<DebitNotesStackParamList, 'DebitNoteDetail'>;

export const DebitNoteDetailScreen: React.FC = () => {
  const route = useRoute<Route>();
  const { colors } = useTheme();
  const qc = useQueryClient();
  const id = route.params.id;
  const [cancelVisible, setCancelVisible] = useState(false);
  const [applyVisible, setApplyVisible] = useState(false);
  const [amount, setAmount] = useState('');
  const [reference, setReference] = useState('');
  const [applyNotes, setApplyNotes] = useState('');
  const [po, setPo] = useState<any | null>(null);
  const [poPicker, setPoPicker] = useState(false);
  const [poSearch, setPoSearch] = useState('');

  const { data, isLoading, isError, error, refetch } = useQuery({ queryKey: ['debitNote', id], queryFn: () => returnsApi.getDebitNote(id), enabled: !!id });
  useFocusEffect(useCallback(() => { refetch(); }, []));
  const n: any = data;
  const pos = useQuery({ queryKey: ['dnApplyPoPick', poSearch, n?.supplierId], queryFn: () => suppliersApi.getPurchaseOrders({ search: poSearch || undefined, limit: 30, supplierId: n?.supplierId } as any), enabled: poPicker && !!n?.supplierId });

  const invalidate = () => { qc.invalidateQueries({ queryKey: ['debitNote', id] }); qc.invalidateQueries({ queryKey: ['debitNotes'] }); qc.invalidateQueries({ queryKey: ['debitNoteStats'] }); };
  const apply = useMutation({
    mutationFn: () => returnsApi.applyDebitNote(id, { purchaseOrderId: po?.id ?? null, amount: Number(amount), reference: reference || undefined, notes: applyNotes || undefined }),
    onSuccess: (r: any) => { invalidate(); setApplyVisible(false); setAmount(''); setPo(null); setReference(''); setApplyNotes(''); Alert.alert('Debit note applied', `Remaining balance ${formatCurrency(Number(r.balance))}`); },
    onError: (e: any) => Alert.alert('Cannot apply', errorMessage(e)),
  });
  const cancel = useMutation({
    mutationFn: (reason: string) => returnsApi.cancelDebitNote(id, reason || undefined),
    onSuccess: () => { invalidate(); setCancelVisible(false); },
    onError: (e: any) => { setCancelVisible(false); Alert.alert('Cannot cancel', errorMessage(e)); },
  });

  if (isLoading) return <ScreenWrapper><Header title="Debit Note" showBack /><View style={styles.center}><ActivityIndicator size="large" color={colors.primary.main} /></View></ScreenWrapper>;
  if (isError || !n) return <ScreenWrapper><Header title="Not Found" showBack /><View style={styles.center}><Icon name="alert-circle-outline" size={64} color={colors.neutral[300]} /><Text style={{ color: colors.text.secondary, marginTop: spacing[3] }}>{isError ? errorMessage(error) : 'Debit note not found'}</Text></View></ScreenWrapper>;

  const usable = (n.status === 'OPEN' || n.status === 'PARTIALLY_USED') && Number(n.balance) > 0;
  return (
    <ScreenWrapper scrollable={false}>
      <Header title={n.noteNumber} showBack actions={n.status === 'OPEN' ? [{ icon: 'cancel', onPress: () => setCancelVisible(true) }] : []} />
      <ScrollView contentContainerStyle={styles.content}>
        <Section>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={[styles.iconWrap, { backgroundColor: '#F59E0B20' }]}><Icon name="file-document-plus" size={26} color="#F59E0B" /></View>
            <View style={{ flex: 1, marginLeft: spacing[3] }}>
              <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text.primary }}>{n.supplier?.name}</Text>
              <Text style={{ fontSize: 12.5, color: colors.text.secondary, marginBottom: 4 }}>Issued {formatDate(n.issueDate)}</Text>
              <StatusBadge status={n.status} kind="note" />
            </View>
          </View>
          <View style={{ flexDirection: 'row', marginTop: spacing[4], gap: spacing[2] }}>
            {[{ l: 'Raised', v: n.amount, c: colors.text.primary }, { l: 'Set off', v: n.usedAmount, c: colors.text.secondary }, { l: 'Balance', v: n.balance, c: '#059669' }].map((b) => (
              <View key={b.l} style={{ flex: 1, alignItems: 'center', paddingVertical: spacing[2], borderRadius: 12, backgroundColor: colors.surface.variant }}>
                <Text style={{ fontSize: 11, color: colors.text.tertiary }}>{b.l}</Text><Text style={{ fontSize: 16, fontWeight: '800', color: b.c }}>{formatCurrency(Number(b.v))}</Text>
              </View>
            ))}
          </View>
        </Section>
        <Section title="Details">
          <DetailRow icon="phone" label="Supplier contact" value={n.supplier?.phone || n.supplier?.email || '—'} />
          <DetailRow icon="package-variant-closed-minus" label="From purchase return" value={n.purchaseReturn?.returnNumber || '—'} />
          <DetailRow icon="clipboard-text" label="Purchase order" value={n.purchaseOrder?.orderNumber || '—'} />
          <DetailRow icon="comment-text-outline" label="Reason" value={n.reason || '—'} />
          {n.notes ? <DetailRow icon="note-text" label="Notes" value={n.notes} /> : null}
        </Section>
        <Section title="Set-off history">
          {(n.applications || []).length === 0 ? <Text style={{ color: colors.text.secondary }}>Not used yet.</Text> : (n.applications || []).map((a: any) => (
            <View key={a.id} style={[styles.itemRow, { borderBottomColor: colors.border.default }]}>
              <View style={{ flex: 1 }}><Text style={{ fontWeight: '600', color: colors.text.primary }}>{a.purchaseOrder?.orderNumber || 'Supplier payment / ad-hoc'}</Text><Text style={{ fontSize: 12, color: colors.text.tertiary }}>{formatDateTime(a.appliedAt)}{a.reference ? ` · ${a.reference}` : ''}</Text>{a.notes ? <Text style={{ fontSize: 12, color: colors.text.secondary }}>{a.notes}</Text> : null}</View>
              <Text style={{ fontWeight: '700', color: colors.text.primary }}>{formatCurrency(Number(a.amount))}</Text>
            </View>
          ))}
        </Section>
        {usable && <Button mode="contained" icon="wallet" onPress={() => { setAmount(String(n.balance)); setApplyVisible(true); }} style={{ marginBottom: spacing[2] }}>Apply / set off</Button>}
        {n.status === 'OPEN' && <Button mode="outlined" icon="cancel" textColor={colors.error.main} onPress={() => setCancelVisible(true)}>Cancel note</Button>}
      </ScrollView>
      <Modal visible={applyVisible} animationType="fade" transparent onRequestClose={() => setApplyVisible(false)}>
        <View style={[styles.modalOverlay, { justifyContent: 'center', padding: spacing[6] }]}>
          <View style={[styles.dialog, { backgroundColor: colors.surface.default }]}>
            <Text style={[styles.modalTitle, { color: colors.text.primary }]}>Set off {n.noteNumber}</Text>
            <Button mode="outlined" icon="clipboard-text" onPress={() => setPoPicker(true)} style={{ marginBottom: spacing[3] }}>{po ? `${po.orderNumber} · ${formatCurrency(Number(po.total))}` : 'Against purchase order (optional)'}</Button>
            {po ? <Button mode="text" compact onPress={() => setPo(null)} style={{ alignSelf: 'flex-start', marginTop: -spacing[3] }}>Clear</Button> : null}
            <LabeledInput label={`Amount (max ${formatCurrency(Number(n.balance))})`} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" />
            <LabeledInput label="Reference" value={reference} onChangeText={setReference} placeholder="Supplier credit / payment ref" />
            <LabeledInput label="Notes" value={applyNotes} onChangeText={setApplyNotes} />
            <View style={styles.dialogButtons}>
              <Button mode="outlined" onPress={() => setApplyVisible(false)} style={{ flex: 1 }}>Close</Button>
              <Button mode="contained" onPress={() => apply.mutate()} loading={apply.isPending} disabled={apply.isPending || !Number(amount)} style={{ flex: 1 }}>Apply</Button>
            </View>
          </View>
        </View>
      </Modal>
      <PickerSheet visible={poPicker} title="Pick purchase order" onClose={() => setPoPicker(false)} search={poSearch} onSearch={setPoSearch}
        items={((pos.data as any)?.data as any[]) || []} keyOf={(p: any) => String(p.id)} loading={pos.isFetching}
        onPick={(p: any) => { setPo(p); setPoPicker(false); }}
        render={(p: any) => <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ fontWeight: '600', color: colors.text.primary }}>{p.orderNumber}</Text><Text style={{ color: colors.text.secondary }}>{formatCurrency(Number(p.total))} · {p.status}</Text></View>} />
      <ReasonModal visible={cancelVisible} title={`Cancel ${n.noteNumber}?`} message="This debit note will no longer be set off against the supplier." confirmText="Cancel note" loading={cancel.isPending} onConfirm={(reason) => cancel.mutate(reason)} onCancel={() => setCancelVisible(false)} />
    </ScreenWrapper>
  );
};
