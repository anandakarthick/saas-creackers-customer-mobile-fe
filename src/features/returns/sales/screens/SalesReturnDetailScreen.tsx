import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { Button } from 'react-native-paper';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { Header } from '@/components/layout/Header';
import { useTheme } from '@/theme';
import { spacing } from '@/theme/spacing';
import { returnsApi } from '@/services/api';
import { customerLabel, methodLabel, REFUND_METHODS, errorMessage } from '@/services/api/returns.api';
import { formatCurrency, formatDateTime } from '@/utils';
import type { SalesReturnsStackParamList } from '@/types/navigation';
import { styles, Section, DetailRow, ReasonModal, StatusBadge } from '../../shared';

type Nav = NativeStackNavigationProp<SalesReturnsStackParamList, 'SalesReturnDetail'>;
type Route = RouteProp<SalesReturnsStackParamList, 'SalesReturnDetail'>;

export const SalesReturnDetailScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { colors } = useTheme();
  const qc = useQueryClient();
  const [cancelVisible, setCancelVisible] = useState(false);
  const id = route.params.id;

  const { data, isLoading, isError, error, refetch } = useQuery({ queryKey: ['salesReturn', id], queryFn: () => returnsApi.getSalesReturn(id), enabled: !!id });
  useFocusEffect(useCallback(() => { refetch(); }, []));

  const cancel = useMutation({
    mutationFn: (reason: string) => returnsApi.cancelSalesReturn(id, reason || undefined),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['salesReturn', id] }); qc.invalidateQueries({ queryKey: ['salesReturns'] }); qc.invalidateQueries({ queryKey: ['salesReturnStats'] }); qc.invalidateQueries({ queryKey: ['creditNotes'] }); setCancelVisible(false); },
    onError: (e: any) => { setCancelVisible(false); Alert.alert('Cannot cancel', errorMessage(e)); },
  });

  if (isLoading) return <ScreenWrapper><Header title="Sales Return" showBack /><View style={styles.center}><ActivityIndicator size="large" color={colors.primary.main} /></View></ScreenWrapper>;
  if (isError || !data) return <ScreenWrapper><Header title="Not Found" showBack /><View style={styles.center}><Icon name="alert-circle-outline" size={64} color={colors.neutral[300]} /><Text style={{ color: colors.text.secondary, marginTop: spacing[3] }}>{isError ? errorMessage(error) : 'Return not found'}</Text></View></ScreenWrapper>;

  const r: any = data;
  return (
    <ScreenWrapper scrollable={false}>
      <Header title={r.returnNumber} showBack actions={r.status !== 'CANCELLED' ? [{ icon: 'cancel', onPress: () => setCancelVisible(true) }] : []} />
      <ScrollView contentContainerStyle={styles.content}>
        <Section>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={[styles.iconWrap, { backgroundColor: colors.primary.light + '25' }]}><Icon name="undo-variant" size={26} color={colors.primary.main} /></View>
            <View style={{ flex: 1, marginLeft: spacing[3] }}>
              <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text.primary }}>{customerLabel(r.customer, r.customerName)}</Text>
              <Text style={{ fontSize: 12.5, color: colors.text.secondary, marginBottom: 4 }}>{formatDateTime(r.returnDate)}</Text>
              <StatusBadge status={r.status} kind="return" />
            </View>
            <Text style={[styles.bigNumber, { color: colors.primary.main }]}>{formatCurrency(Number(r.total))}</Text>
          </View>
        </Section>

        <Section title="Details">
          <DetailRow icon="receipt" label={r.order?.internalNotes?.startsWith('POS ') ? 'POS bill' : 'Order'} value={r.order?.orderNumber || 'Manual return (no bill)'} />
          <DetailRow icon="phone" label="Phone" value={r.customer?.phone || '—'} />
          <DetailRow icon="store" label="Branch" value={r.branch?.name || '—'} />
          <DetailRow icon="comment-text-outline" label="Reason" value={r.reason || '—'} />
        </Section>

        <Section title={`Items (${(r.items || []).length})`}>
          {(r.items || []).map((it: any) => (
            <View key={it.id} style={[styles.itemRow, { borderBottomColor: colors.border.default }]}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '600', color: colors.text.primary }}>{it.name}</Text>
                <Text style={{ fontSize: 12, color: colors.text.tertiary }}>{it.quantity} × {formatCurrency(Number(it.unitPrice))}{it.condition === 'DAMAGED' ? ' · damaged' : ''}{it.restocked ? ' · restocked' : ' · not restocked'}</Text>
                {it.reason ? <Text style={{ fontSize: 12, color: colors.text.secondary }}>{it.reason}</Text> : null}
              </View>
              <Text style={{ fontWeight: '700', color: colors.text.primary }}>{formatCurrency(Number(it.subtotal))}</Text>
            </View>
          ))}
          <View style={[styles.totalsRow, { marginTop: spacing[2] }]}><Text style={[styles.totalsLabel, { color: colors.text.secondary }]}>Subtotal</Text><Text style={[styles.totalsValue, { color: colors.text.primary }]}>{formatCurrency(Number(r.subtotal))}</Text></View>
          {Number(r.deduction) > 0 && <View style={styles.totalsRow}><Text style={[styles.totalsLabel, { color: colors.error.main }]}>Deduction</Text><Text style={[styles.totalsValue, { color: colors.error.main }]}>- {formatCurrency(Number(r.deduction))}</Text></View>}
          <View style={styles.totalsRow}><Text style={[styles.grandTotal, { color: colors.text.primary }]}>Refund total</Text><Text style={[styles.grandTotal, { color: colors.primary.main }]}>{formatCurrency(Number(r.total))}</Text></View>
        </Section>

        <Section title="Refund">
          <DetailRow icon="cash-refund" label="Method" value={methodLabel(r.refundMethod, REFUND_METHODS)} />
          <DetailRow icon="cash-check" label="Refunded" value={formatCurrency(Number(r.refundedAmount))} />
          {r.refundReference ? <DetailRow icon="pound" label="Reference" value={r.refundReference} /> : null}
          {r.creditNote && (
            <DetailRow icon="file-document-minus" label="Credit note" value={
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontWeight: '600', color: colors.primary.main }} onPress={() => (navigation as any).navigate('CreditNotes', { screen: 'CreditNoteDetail', params: { id: String(r.creditNote.id) } })}>{r.creditNote.noteNumber}</Text>
                <StatusBadge status={r.creditNote.status} kind="note" />
                <Text style={{ fontSize: 12, color: colors.text.secondary }}>balance {formatCurrency(Number(r.creditNote.balance))}</Text>
              </View>
            } />
          )}
        </Section>

        {(r.notes || r.cancelReason) ? (
          <Section title="Notes">
            {r.notes ? <Text style={{ color: colors.text.secondary, lineHeight: 20 }}>{r.notes}</Text> : null}
            {r.status === 'CANCELLED' ? <Text style={{ color: colors.error.main, marginTop: 6 }}>Cancelled {formatDateTime(r.cancelledAt)}{r.cancelReason ? `: ${r.cancelReason}` : ''}</Text> : null}
          </Section>
        ) : null}

        {r.status !== 'CANCELLED' && <Button mode="outlined" icon="cancel" textColor={colors.error.main} onPress={() => setCancelVisible(true)}>Cancel return</Button>}
      </ScrollView>

      <ReasonModal visible={cancelVisible} title={`Cancel ${r.returnNumber}?`} message="Returned units go back out of stock, customer totals are restored and any unused credit note is cancelled." confirmText="Cancel return" loading={cancel.isPending} onConfirm={(reason) => cancel.mutate(reason)} onCancel={() => setCancelVisible(false)} />
    </ScreenWrapper>
  );
};
