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
import { returnsApi, posApi, ordersApi } from '@/services/api';
import { customerLabel, errorMessage } from '@/services/api/returns.api';
import { formatCurrency, formatDate, formatDateTime } from '@/utils';
import type { CreditNotesStackParamList } from '@/types/navigation';
import { styles, Section, DetailRow, ReasonModal, StatusBadge, LabeledInput, PickerSheet } from '../../../returns/shared';

type Route = RouteProp<CreditNotesStackParamList, 'CreditNoteDetail'>;

export const CreditNoteDetailScreen: React.FC = () => {
  const route = useRoute<Route>();
  const { colors } = useTheme();
  const qc = useQueryClient();
  const id = route.params.id;
  const [cancelVisible, setCancelVisible] = useState(false);
  const [applyVisible, setApplyVisible] = useState(false);
  const [amount, setAmount] = useState('');
  const [reference, setReference] = useState('');
  const [applyNotes, setApplyNotes] = useState('');
  const [order, setOrder] = useState<any | null>(null);
  const [orderPicker, setOrderPicker] = useState(false);
  const [orderSearch, setOrderSearch] = useState('');

  const { data, isLoading, isError, error, refetch } = useQuery({ queryKey: ['creditNote', id], queryFn: () => returnsApi.getCreditNote(id), enabled: !!id });
  useFocusEffect(useCallback(() => { refetch(); }, []));
  const orders = useQuery({
    queryKey: ['cnOrderPick', orderSearch],
    queryFn: async () => {
      const [pos, online] = await Promise.all([posApi.getPOSSales({ search: orderSearch, limit: 10 } as any), ordersApi.getOrders({ search: orderSearch, limit: 10 } as any)]);
      return [...((pos as any)?.data || []), ...((online as any)?.data || [])].filter((o: any) => o.status !== 'CANCELLED' && o.status !== 'ESTIMATE' && o.paymentStatus !== 'PAID' && o.paymentStatus !== 'REFUNDED');
    },
    enabled: orderPicker && orderSearch.trim().length >= 2,
  });

  const invalidate = () => { qc.invalidateQueries({ queryKey: ['creditNote', id] }); qc.invalidateQueries({ queryKey: ['creditNotes'] }); qc.invalidateQueries({ queryKey: ['creditNoteStats'] }); qc.invalidateQueries({ queryKey: ['posSales'] }); qc.invalidateQueries({ queryKey: ['orders'] }); };
  const apply = useMutation({
    mutationFn: () => returnsApi.applyCreditNote(id, { orderId: order?.id ?? null, amount: Number(amount), reference: reference || undefined, notes: applyNotes || undefined }),
    onSuccess: (r: any) => { invalidate(); setApplyVisible(false); setAmount(''); setOrder(null); setReference(''); setApplyNotes(''); Alert.alert('Credit applied', `Remaining balance ${formatCurrency(Number(r.balance))}`); },
    onError: (e: any) => Alert.alert('Cannot apply', errorMessage(e)),
  });
  const cancel = useMutation({
    mutationFn: (reason: string) => returnsApi.cancelCreditNote(id, reason || undefined),
    onSuccess: () => { invalidate(); setCancelVisible(false); },
    onError: (e: any) => { setCancelVisible(false); Alert.alert('Cannot cancel', errorMessage(e)); },
  });

  if (isLoading) return <ScreenWrapper><Header title="Credit Note" showBack /><View style={styles.center}><ActivityIndicator size="large" color={colors.primary.main} /></View></ScreenWrapper>;
  if (isError || !data) return <ScreenWrapper><Header title="Not Found" showBack /><View style={styles.center}><Icon name="alert-circle-outline" size={64} color={colors.neutral[300]} /><Text style={{ color: colors.text.secondary, marginTop: spacing[3] }}>{isError ? errorMessage(error) : 'Credit note not found'}</Text></View></ScreenWrapper>;

  const n: any = data;
  const usable = (n.status === 'OPEN' || n.status === 'PARTIALLY_USED') && Number(n.balance) > 0;

  return (
    <ScreenWrapper scrollable={false}>
      <Header title={n.noteNumber} showBack actions={n.status === 'OPEN' ? [{ icon: 'cancel', onPress: () => setCancelVisible(true) }] : []} />
      <ScrollView contentContainerStyle={styles.content}>
        <Section>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={[styles.iconWrap, { backgroundColor: '#6366F120' }]}><Icon name="file-document-minus" size={26} color="#6366F1" /></View>
            <View style={{ flex: 1, marginLeft: spacing[3] }}>
              <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text.primary }}>{customerLabel(n.customer, n.customerName)}</Text>
              <Text style={{ fontSize: 12.5, color: colors.text.secondary, marginBottom: 4 }}>Issued {formatDate(n.issueDate)}{n.expiryDate ? ` · expires ${formatDate(n.expiryDate)}` : ''}</Text>
              <StatusBadge status={n.status} kind="note" />
            </View>
          </View>
          <View style={{ flexDirection: 'row', marginTop: spacing[4], gap: spacing[2] }}>
            {[{ l: 'Issued', v: n.amount, c: colors.text.primary }, { l: 'Used', v: n.usedAmount, c: colors.text.secondary }, { l: 'Balance', v: n.balance, c: '#059669' }].map((b) => (
              <View key={b.l} style={{ flex: 1, alignItems: 'center', paddingVertical: spacing[2], borderRadius: 12, backgroundColor: colors.surface.variant }}>
                <Text style={{ fontSize: 11, color: colors.text.tertiary }}>{b.l}</Text><Text style={{ fontSize: 16, fontWeight: '800', color: b.c }}>{formatCurrency(Number(b.v))}</Text>
              </View>
            ))}
          </View>
        </Section>
        <Section title="Details">
          <DetailRow icon="phone" label="Phone" value={n.customer?.phone || '—'} />
          <DetailRow icon="undo-variant" label="From sales return" value={n.salesReturn?.returnNumber || '—'} />
          <DetailRow icon="receipt" label="Original order" value={n.order?.orderNumber || '—'} />
          <DetailRow icon="comment-text-outline" label="Reason" value={n.reason || '—'} />
          {n.notes ? <DetailRow icon="note-text" label="Notes" value={n.notes} /> : null}
        </Section>
        <Section title="Usage history">
          {(n.applications || []).length === 0 ? <Text style={{ color: colors.text.secondary }}>Not used yet.</Text> : (n.applications || []).map((a: any) => (
            <View key={a.id} style={[styles.itemRow, { borderBottomColor: colors.border.default }]}>
              <View style={{ flex: 1 }}><Text style={{ fontWeight: '600', color: colors.text.primary }}>{a.order?.orderNumber || 'Ad-hoc use'}</Text><Text style={{ fontSize: 12, color: colors.text.tertiary }}>{formatDateTime(a.appliedAt)}{a.reference ? ` · ${a.reference}` : ''}</Text>{a.notes ? <Text style={{ fontSize: 12, color: colors.text.secondary }}>{a.notes}</Text> : null}</View>
              <Text style={{ fontWeight: '700', color: colors.text.primary }}>{formatCurrency(Number(a.amount))}</Text>
            </View>
          ))}
        </Section>
        {usable && <Button mode="contained" icon="wallet" onPress={() => { setAmount(String(n.balance)); setApplyVisible(true); }} style={{ marginBottom: spacing[2] }}>Apply credit</Button>}
        {n.status === 'OPEN' && <Button mode="outlined" icon="cancel" textColor={colors.error.main} onPress={() => setCancelVisible(true)}>Cancel note</Button>}
      </ScrollView>

      <Modal visible={applyVisible} animationType="fade" transparent onRequestClose={() => setApplyVisible(false)}>
        <View style={[styles.modalOverlay, { justifyContent: 'center', padding: spacing[6] }]}>
          <View style={[styles.dialog, { backgroundColor: colors.surface.default }]}>
            <Text style={[styles.modalTitle, { color: colors.text.primary }]}>Apply credit from {n.noteNumber}</Text>
            <Text style={{ fontSize: 12, color: colors.text.secondary, marginBottom: spacing[2] }}>Bill / order to pay (optional)</Text>
            <Button mode="outlined" icon="magnify" onPress={() => setOrderPicker(true)} style={{ marginBottom: spacing[3] }}>{order ? `${order.orderNumber} · ${formatCurrency(Number(order.total))}` : 'Find unpaid bill / order'}</Button>
            {order ? <Button mode="text" compact onPress={() => setOrder(null)} style={{ alignSelf: 'flex-start', marginTop: -spacing[3] }}>Clear</Button> : null}
            <LabeledInput label={`Amount (max ${formatCurrency(Number(n.balance))})`} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" />
            <LabeledInput label="Reference" value={reference} onChangeText={setReference} />
            <LabeledInput label="Notes" value={applyNotes} onChangeText={setApplyNotes} />
            <View style={styles.dialogButtons}>
              <Button mode="outlined" onPress={() => setApplyVisible(false)} style={{ flex: 1 }}>Close</Button>
              <Button mode="contained" onPress={() => apply.mutate()} loading={apply.isPending} disabled={apply.isPending || !Number(amount)} style={{ flex: 1 }}>Apply</Button>
            </View>
          </View>
        </View>
      </Modal>
      <PickerSheet visible={orderPicker} title="Find unpaid bill / order" onClose={() => setOrderPicker(false)} search={orderSearch} onSearch={setOrderSearch}
        items={(orders.data as any[]) || []} keyOf={(o: any) => `${o.id}-${o.orderNumber}`} loading={orders.isFetching} emptyText={orderSearch.length < 2 ? 'Type a bill number, name or phone' : 'No unpaid bills found'}
        onPick={(o: any) => { setOrder(o); setOrderPicker(false); setOrderSearch(''); }}
        render={(o: any) => <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ fontWeight: '600', color: colors.text.primary }}>{o.orderNumber}</Text><Text style={{ color: colors.text.secondary }}>{formatCurrency(Number(o.total))} · {o.paymentStatus}</Text></View>} />
      <ReasonModal visible={cancelVisible} title={`Cancel ${n.noteNumber}?`} message="The customer will no longer be able to use this credit." confirmText="Cancel note" loading={cancel.isPending} onConfirm={(reason) => cancel.mutate(reason)} onCancel={() => setCancelVisible(false)} />
    </ScreenWrapper>
  );
};
