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
import { methodLabel, SETTLEMENT_METHODS, errorMessage } from '@/services/api/returns.api';
import { formatCurrency, formatDateTime } from '@/utils';
import type { PurchaseReturnsStackParamList } from '@/types/navigation';
import { styles, Section, DetailRow, ReasonModal, StatusBadge } from '../../shared';

type Nav = NativeStackNavigationProp<PurchaseReturnsStackParamList, 'PurchaseReturnDetail'>;
type Route = RouteProp<PurchaseReturnsStackParamList, 'PurchaseReturnDetail'>;

export const PurchaseReturnDetailScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { colors } = useTheme();
  const qc = useQueryClient();
  const [cancelVisible, setCancelVisible] = useState(false);
  const id = route.params.id;
  const { data, isLoading, isError, error, refetch } = useQuery({ queryKey: ['purchaseReturn', id], queryFn: () => returnsApi.getPurchaseReturn(id), enabled: !!id });
  useFocusEffect(useCallback(() => { refetch(); }, []));
  const cancel = useMutation({
    mutationFn: (reason: string) => returnsApi.cancelPurchaseReturn(id, reason || undefined),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['purchaseReturn', id] }); qc.invalidateQueries({ queryKey: ['purchaseReturns'] }); qc.invalidateQueries({ queryKey: ['purchaseReturnStats'] }); qc.invalidateQueries({ queryKey: ['debitNotes'] }); setCancelVisible(false); },
    onError: (e: any) => { setCancelVisible(false); Alert.alert('Cannot cancel', errorMessage(e)); },
  });

  if (isLoading) return <ScreenWrapper><Header title="Purchase Return" showBack /><View style={styles.center}><ActivityIndicator size="large" color={colors.primary.main} /></View></ScreenWrapper>;
  if (isError || !data) return <ScreenWrapper><Header title="Not Found" showBack /><View style={styles.center}><Icon name="alert-circle-outline" size={64} color={colors.neutral[300]} /><Text style={{ color: colors.text.secondary, marginTop: spacing[3] }}>{isError ? errorMessage(error) : 'Return not found'}</Text></View></ScreenWrapper>;

  const r: any = data;
  return (
    <ScreenWrapper scrollable={false}>
      <Header title={r.returnNumber} showBack actions={r.status !== 'CANCELLED' ? [{ icon: 'cancel', onPress: () => setCancelVisible(true) }] : []} />
      <ScrollView contentContainerStyle={styles.content}>
        <Section>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={[styles.iconWrap, { backgroundColor: '#F59E0B20' }]}><Icon name="package-variant-closed-minus" size={26} color="#F59E0B" /></View>
            <View style={{ flex: 1, marginLeft: spacing[3] }}>
              <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text.primary }}>{r.supplier?.name}</Text>
              <Text style={{ fontSize: 12.5, color: colors.text.secondary, marginBottom: 4 }}>{formatDateTime(r.returnDate)}</Text>
              <StatusBadge status={r.status} kind="return" />
            </View>
            <Text style={[styles.bigNumber, { color: colors.primary.main }]}>{formatCurrency(Number(r.total))}</Text>
          </View>
        </Section>
        <Section title="Details">
          <DetailRow icon="clipboard-text" label="Purchase order" value={r.purchaseOrder?.orderNumber || 'Manual (no PO)'} />
          <DetailRow icon="phone" label="Supplier contact" value={r.supplier?.phone || r.supplier?.email || '—'} />
          <DetailRow icon="store" label="Branch" value={r.branch?.name || '—'} />
          <DetailRow icon="comment-text-outline" label="Reason" value={r.reason || '—'} />
        </Section>
        <Section title={`Items (${(r.items || []).length})`}>
          {(r.items || []).map((it: any) => (
            <View key={it.id} style={[styles.itemRow, { borderBottomColor: colors.border.default }]}>
              <View style={{ flex: 1 }}><Text style={{ fontWeight: '600', color: colors.text.primary }}>{it.name}</Text><Text style={{ fontSize: 12, color: colors.text.tertiary }}>{it.quantity} × {formatCurrency(Number(it.unitCost))}</Text>{it.reason ? <Text style={{ fontSize: 12, color: colors.text.secondary }}>{it.reason}</Text> : null}</View>
              <Text style={{ fontWeight: '700', color: colors.text.primary }}>{formatCurrency(Number(it.subtotal))}</Text>
            </View>
          ))}
          <View style={[styles.totalsRow, { marginTop: spacing[2] }]}><Text style={[styles.grandTotal, { color: colors.text.primary }]}>Return value</Text><Text style={[styles.grandTotal, { color: colors.primary.main }]}>{formatCurrency(Number(r.total))}</Text></View>
        </Section>
        <Section title="Settlement">
          <DetailRow icon="handshake" label="Method" value={methodLabel(r.settlementMethod, SETTLEMENT_METHODS)} />
          <DetailRow icon="cash-check" label="Settled" value={formatCurrency(Number(r.settledAmount))} />
          {r.settlementReference ? <DetailRow icon="pound" label="Reference" value={r.settlementReference} /> : null}
          {r.debitNote && (
            <DetailRow icon="file-document-plus" label="Debit note" value={
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontWeight: '600', color: colors.primary.main }} onPress={() => (navigation as any).navigate('DebitNotes', { screen: 'DebitNoteDetail', params: { id: String(r.debitNote.id) } })}>{r.debitNote.noteNumber}</Text>
                <StatusBadge status={r.debitNote.status} kind="note" />
                <Text style={{ fontSize: 12, color: colors.text.secondary }}>balance {formatCurrency(Number(r.debitNote.balance))}</Text>
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
      <ReasonModal visible={cancelVisible} title={`Cancel ${r.returnNumber}?`} message="The returned units are added back to stock and any unused debit note is cancelled." confirmText="Cancel return" loading={cancel.isPending} onConfirm={(reason) => cancel.mutate(reason)} onCancel={() => setCancelVisible(false)} />
    </ScreenWrapper>
  );
};
