import React, { useState, useCallback } from 'react';
import { StyleSheet, View, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { Header } from '@/components/layout/Header';
import { Badge } from '@/components/common/Badge';
import { ConfirmationModal } from '@/components/common/ConfirmationModal';
import { useTheme } from '@/theme';
import { spacing, borderRadius } from '@/theme/spacing';
import { expensesApi } from '@/services/api';
import { formatCurrency } from '@/utils';
import type { ExpensesStackParamList } from '@/types/navigation';

type Nav = NativeStackNavigationProp<ExpensesStackParamList, 'ExpenseDetail'>;
type RouteProps = RouteProp<ExpensesStackParamList, 'ExpenseDetail'>;

const DetailRow: React.FC<{ icon: string; label: string; value: string }> = ({ icon, label, value }) => {
  const { colors } = useTheme();
  return (
    <View style={styles.detailRow}>
      <Icon name={icon} size={16} color={colors.neutral[400]} />
      <View style={{ flex: 1, marginLeft: spacing[2] }}>
        <Text style={[styles.detailLabel, { color: colors.text.secondary }]}>{label}</Text>
        <Text style={[styles.detailValue, { color: colors.text.primary }]}>{value}</Text>
      </View>
    </View>
  );
};

const statusVariant = (s: string): 'success' | 'warning' | 'error' => {
  if (s === 'PAID') return 'success';
  if (s === 'PARTIAL') return 'warning';
  return 'error';
};

export const ExpenseDetailScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteProps>();
  const { colors } = useTheme();
  const qc = useQueryClient();
  const [deleteVisible, setDeleteVisible] = useState(false);

  const expenseId = route.params.id;

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['expense', expenseId],
    queryFn: () => expensesApi.getExpense(expenseId),
    enabled: !!expenseId,
  });

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [])
  );

  const deleteMutation = useMutation({
    mutationFn: () => expensesApi.deleteExpense(expenseId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses'] });
      setDeleteVisible(false);
      navigation.goBack();
    },
    onError: (err: any) => Alert.alert('Error', err?.message || 'Failed to delete'),
  });

  if (isLoading) {
    return (
      <ScreenWrapper>
        <Header title="Expense" showBack />
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary.main} /></View>
      </ScreenWrapper>
    );
  }

  if (isError || !data) {
    return (
      <ScreenWrapper>
        <Header title="Not Found" showBack />
        <View style={styles.center}>
          <Icon name="alert-circle-outline" size={64} color={colors.neutral[300]} />
          <Text style={[styles.notFoundText, { color: colors.text.secondary }]}>
            {isError ? String((error as any)?.message || 'Failed to load') : 'Expense not found'}
          </Text>
        </View>
      </ScreenWrapper>
    );
  }

  const e = data as any;
  const handleEdit = () => navigation.navigate('ExpenseForm', { id: String(e.id) });

  return (
    <ScreenWrapper scrollable={false}>
      <Header
        title="Expense"
        showBack
        actions={[
          { icon: 'pencil', onPress: handleEdit },
          { icon: 'delete', onPress: () => setDeleteVisible(true) },
        ]}
      />

      <ScrollView contentContainerStyle={styles.content}>
        {/* Header card */}
        <View style={[styles.section, { backgroundColor: colors.surface.default }]}>
          <View style={styles.headerRow}>
            <View style={[styles.iconWrap, { backgroundColor: colors.error.light + '20' }]}>
              <Icon name="cash-minus" size={28} color={colors.error.main} />
            </View>
            <View style={{ flex: 1, marginLeft: spacing[3] }}>
              <Text style={[styles.name, { color: colors.text.primary }]}>
                {e.description || e.category}
              </Text>
              <Text style={[styles.number, { color: colors.text.secondary }]}>
                {e.expenseNumber || `EXP-${e.id}`}
              </Text>
              <Badge variant={statusVariant(e.paymentStatus || 'PENDING')} size="small">
                {e.paymentStatus || 'PENDING'}
              </Badge>
            </View>
            <Text style={[styles.totalAmount, { color: colors.primary.main }]}>
              {formatCurrency(Number(e.totalAmount || e.amount || 0))}
            </Text>
          </View>
        </View>

        {/* Details */}
        <View style={[styles.section, { backgroundColor: colors.surface.default }]}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Details</Text>
          <DetailRow icon="shape" label="Category" value={e.category || '—'} />
          <DetailRow icon="calendar" label="Date" value={e.date ? new Date(e.date).toLocaleDateString() : '—'} />
          <DetailRow icon="cash" label="Amount" value={formatCurrency(Number(e.amount || 0))} />
          <DetailRow icon="percent" label="Tax" value={formatCurrency(Number(e.taxAmount || 0))} />
          <DetailRow icon="cash-check" label="Total" value={formatCurrency(Number(e.totalAmount || 0))} />
          <DetailRow icon="cash-fast" label="Paid" value={formatCurrency(Number(e.paidAmount || 0))} />
          {e.paymentMethod && <DetailRow icon="credit-card" label="Payment Method" value={e.paymentMethod} />}
        </View>

        {/* Vendor */}
        {(e.vendorName || e.supplierName) && (
          <View style={[styles.section, { backgroundColor: colors.surface.default }]}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Vendor / Supplier</Text>
            <DetailRow icon="account" label="Name" value={e.vendorName || e.supplierName || '—'} />
            {(e.vendorPhone || e.supplierPhone) && (
              <DetailRow icon="phone" label="Phone" value={e.vendorPhone || e.supplierPhone} />
            )}
            {e.invoiceNumber && <DetailRow icon="file-document" label="Invoice #" value={e.invoiceNumber} />}
          </View>
        )}

        {/* Notes */}
        {e.notes && (
          <View style={[styles.section, { backgroundColor: colors.surface.default }]}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Notes</Text>
            <Text style={[styles.notesText, { color: colors.text.secondary }]}>{e.notes}</Text>
          </View>
        )}

        <Button mode="contained" icon="pencil" onPress={handleEdit} style={{ marginTop: spacing[2] }}>
          Edit Expense
        </Button>
      </ScrollView>

      <ConfirmationModal
        visible={deleteVisible}
        title="Delete expense?"
        message="This will permanently remove this expense record."
        confirmText="Delete"
        confirmVariant="danger"
        loading={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate()}
        onCancel={() => setDeleteVisible(false)}
      />
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  content: { padding: spacing[4], paddingBottom: spacing[8] },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  section: { borderRadius: borderRadius.lg, padding: spacing[4], marginBottom: spacing[3] },
  sectionTitle: { fontSize: 14, fontWeight: '700', marginBottom: spacing[3] },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  iconWrap: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center' },
  name: { fontSize: 18, fontWeight: '700', marginBottom: spacing[1] },
  number: { fontSize: 13, marginBottom: spacing[1] },
  totalAmount: { fontSize: 20, fontWeight: '700' },
  detailRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: spacing[2] },
  detailLabel: { fontSize: 12 },
  detailValue: { fontSize: 14, fontWeight: '500', marginTop: 2 },
  notesText: { fontSize: 13, lineHeight: 20 },
  notFoundText: { fontSize: 16, marginTop: spacing[3] },
});
