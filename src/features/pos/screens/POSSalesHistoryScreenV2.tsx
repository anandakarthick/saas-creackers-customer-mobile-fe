import React, { useCallback, useState } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity, ActivityIndicator, Modal, ScrollView, TextInput, Platform } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Searchbar, Chip, Button } from 'react-native-paper';
import { useQuery } from '@tanstack/react-query';

import { ScreenWrapper, Header } from '@/components/layout';
import { Badge, Empty } from '@/components/common';
import { useTheme } from '@/theme';
import { spacing, borderRadius } from '@/theme/spacing';
import { posApi } from '@/services/api';
import { formatCurrency } from '@/utils';
import type { POSStackParamList } from '@/types/navigation';

type NavigationProp = NativeStackNavigationProp<POSStackParamList, 'POSSalesHistory'>;

const PAYMENT_FILTERS: { label: string; value: string | 'ALL' }[] = [
  { label: 'All', value: 'ALL' },
  { label: 'Cash', value: 'CASH' },
  { label: 'UPI', value: 'UPI' },
  { label: 'Card', value: 'CARD' },
];

const formatDateTime = (d: string) =>
  new Date(d).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

function normalizeSale(s: any) {
  const total = Number(s.total || 0);
  const payments = s.payments || [];
  const paidFromPayments = payments.reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);
  const amountPaid = s.amountPaid != null ? Number(s.amountPaid) : undefined;
  const totalPaid = paidFromPayments > 0 ? paidFromPayments : (amountPaid ?? total);
  const balance = Math.max(0, total - totalPaid);
  const paymentStatus = (s.paymentStatus || '').toLowerCase();

  return {
    id: String(s.id),
    orderNumber: s.orderNumber || '',
    total,
    totalPaid,
    balance,
    paymentMethod: s.paymentMethod || '',
    paymentStatus,
    createdAt: s.createdAt || new Date().toISOString(),
    itemsCount: s._count?.items ?? (Array.isArray(s.items) ? s.items.length : 0),
    customerName: s.customer
      ? `${s.customer.firstName || ''} ${s.customer.lastName || ''}`.trim() || 'Walk-in'
      : 'Walk-in',
    status: (s.status || 'DELIVERED').toString(),
  };
}

const STATUS_FILTERS = [
  { label: 'All', value: 'ALL' },
  { label: 'Completed', value: 'DELIVERED' },
  { label: 'Cancelled', value: 'CANCELLED' },
  { label: 'Estimate', value: 'ESTIMATE' },
];

export const POSSalesHistoryScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { colors } = useTheme();
  const [search, setSearch] = useState('');
  const [payment, setPayment] = useState<string | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [filterOpen, setFilterOpen] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const { data: statsData } = useQuery({
    queryKey: ['posStats'],
    queryFn: () => posApi.getPOSStats(),
  });

  const { data, isLoading, isError, error, isFetching, refetch } = useQuery({
    queryKey: ['posSales', search, payment, dateFrom, dateTo],
    queryFn: () =>
      posApi.getPOSSales({
        page: 1,
        limit: 100,
        search: search || undefined,
        paymentMethod: payment !== 'ALL' ? payment : undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      }),
  });

  let sales = (data?.data || []).map(normalizeSale);
  if (statusFilter !== 'ALL') {
    if (statusFilter === 'ESTIMATE') {
      sales = sales.filter((s: any) => s.status === 'ESTIMATE');
    } else {
      sales = sales.filter((s: any) => s.status === statusFilter);
    }
  }

  const hasActiveFilters = dateFrom || dateTo;

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  const onRefresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const renderSale = ({ item }: { item: ReturnType<typeof normalizeSale> }) => {
    const hasBalance = item.balance > 0 && item.status !== 'CANCELLED';
    const isUnpaid = item.paymentStatus === 'unpaid' || (item.totalPaid === 0 && item.status !== 'CANCELLED');

    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: colors.surface.default }]}
        onPress={() => navigation.navigate('POSReceipt', { id: item.id })}
        activeOpacity={0.7}
      >
        <View style={[styles.iconWrap, { backgroundColor: colors.primary.light + '20' }]}>
          <Icon name="receipt" size={22} color={colors.primary.main} />
        </View>
        <View style={styles.info}>
          <View style={styles.rowBetween}>
            <Text style={[styles.orderNumber, { color: colors.text.primary }]}>
              {item.orderNumber}
            </Text>
            <Text style={[styles.amount, { color: colors.success.main }]}>
              {formatCurrency(item.total)}
            </Text>
          </View>
          <View style={styles.rowBetween}>
            <Text style={[styles.subtle, { color: colors.text.secondary }]} numberOfLines={1}>
              {item.customerName} · {item.itemsCount} item{item.itemsCount === 1 ? '' : 's'}
            </Text>
            <Text style={[styles.subtle, { color: colors.text.tertiary }]}>
              {formatDateTime(item.createdAt)}
            </Text>
          </View>
          {/* Balance info for underpaid/partially paid */}
          {hasBalance && (
            <View style={[styles.rowBetween, { marginTop: 2 }]}>
              <Text style={[styles.subtle, { color: colors.success.main }]}>
                Paid: {formatCurrency(item.totalPaid)}
              </Text>
              <Text style={[styles.subtle, { color: colors.error.main, fontWeight: '600' }]}>
                Due: {formatCurrency(item.balance)}
              </Text>
            </View>
          )}
          <View style={styles.badgeRow}>
            <Badge variant="info" size="small">
              {item.paymentMethod}
            </Badge>
            {item.status === 'ESTIMATE' && (
              <Badge variant="warning" size="small">
                ESTIMATE
              </Badge>
            )}
            {item.status === 'CANCELLED' && (
              <Badge variant="error" size="small">
                CANCELLED
              </Badge>
            )}
            {hasBalance && !isUnpaid && (
              <Badge variant="warning" size="small">
                PARTIAL
              </Badge>
            )}
            {isUnpaid && (
              <Badge variant="error" size="small">
                UNPAID
              </Badge>
            )}
            {item.status === 'ESTIMATE' && (
              <TouchableOpacity
                style={[styles.payButton, { backgroundColor: '#6366F1' }]}
                onPress={() => {
                  navigation.navigate('POSMain', { editEstimateId: Number(item.id) });
                }}
                activeOpacity={0.7}
              >
                <Icon name="pencil" size={14} color="#FFFFFF" />
                <Text style={styles.payButtonText}>Edit</Text>
              </TouchableOpacity>
            )}
            {(hasBalance || isUnpaid) && (
              <TouchableOpacity
                style={[styles.payButton, { backgroundColor: colors.primary.main }]}
                onPress={() => {
                  navigation.navigate('POSReceipt', { id: item.id });
                }}
                activeOpacity={0.7}
              >
                <Icon name="cash-plus" size={14} color="#FFFFFF" />
                <Text style={styles.payButtonText}>Pay</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
        <Icon name="chevron-right" size={22} color={colors.neutral[400]} />
      </TouchableOpacity>
    );
  };

  const stats: any = statsData || {};
  const statCards = [
    { label: 'Total Sales', value: stats.totalSales ?? sales.length, icon: 'receipt', color: colors.primary.main },
    { label: 'Revenue', value: formatCurrency(stats.totalRevenue ?? 0), icon: 'currency-inr', color: '#10B981' },
    { label: 'Today', value: stats.todaySales ?? 0, icon: 'calendar-today', color: '#6366F1' },
    { label: 'Due', value: formatCurrency(stats.totalDue ?? 0), icon: 'alert-circle-outline', color: '#EF4444' },
  ];

  return (
    <ScreenWrapper scrollable={false} padding={false}>
      <Header
        title="POS Sales History"
        subtitle={`${sales.length} sales`}
        showBack
        actions={[
          { icon: hasActiveFilters ? 'filter-check' : 'filter-variant', onPress: () => setFilterOpen(true) },
        ]}
      />

      <View style={styles.searchRow}>
        <Searchbar
          placeholder="Search by order # or customer..."
          value={search}
          onChangeText={setSearch}
          style={[styles.searchBar, { backgroundColor: colors.surface.default }]}
          inputStyle={{ fontSize: 14 }}
        />
      </View>

      <View style={styles.filterRow}>
        <FlatList
          horizontal
          data={PAYMENT_FILTERS}
          keyExtractor={(i) => i.value}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: spacing[4] }}
          renderItem={({ item }) => (
            <Chip
              selected={payment === item.value}
              onPress={() => setPayment(item.value)}
              style={{ marginRight: spacing[2] }}
            >
              {item.label}
            </Chip>
          )}
        />
      </View>

      <View style={styles.filterRow}>
        <FlatList
          horizontal
          data={STATUS_FILTERS}
          keyExtractor={(i) => i.value}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: spacing[4] }}
          renderItem={({ item }) => (
            <Chip
              selected={statusFilter === item.value}
              onPress={() => setStatusFilter(item.value)}
              style={[{ marginRight: spacing[2] }, statusFilter === item.value && { backgroundColor: '#10B981' }]}
              textStyle={statusFilter === item.value ? { color: '#fff' } : undefined}
            >
              {item.label}
            </Chip>
          )}
        />
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary.main} />
        </View>
      ) : isError ? (
        <Empty icon="cloud-alert" title="Couldn't load sales" description={String(error?.message || 'Network error')} />
      ) : (
        <FlatList
          data={sales}
          renderItem={renderSale}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshing={isFetching}
          onRefresh={onRefresh}
          ListHeaderComponent={
            <View style={styles.statsRow}>
              {statCards.map((s) => (
                <View key={s.label} style={[styles.statCard, { backgroundColor: colors.surface.default }]}>
                  <Icon name={s.icon} size={20} color={s.color} />
                  <Text style={[styles.statValue, { color: colors.text.primary }]}>{s.value}</Text>
                  <Text style={[styles.statLabel, { color: colors.text.tertiary }]}>{s.label}</Text>
                </View>
              ))}
            </View>
          }
          ListEmptyComponent={<Empty icon="cart-off" title="No POS sales yet" description="Completed sales will show up here" />}
        />
      )}

      <Modal visible={filterOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface.default }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text.primary }]}>Date Filter</Text>
              <TouchableOpacity onPress={() => setFilterOpen(false)}>
                <Icon name="close" size={24} color={colors.text.secondary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              <Text style={[styles.filterLabel, { color: colors.text.secondary }]}>Date From</Text>
              <TextInput
                style={[styles.dateInput, { borderColor: colors.border.default, color: colors.text.primary }]}
                value={dateFrom}
                onChangeText={setDateFrom}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.text.tertiary}
              />
              <Text style={[styles.filterLabel, { color: colors.text.secondary }]}>Date To</Text>
              <TextInput
                style={[styles.dateInput, { borderColor: colors.border.default, color: colors.text.primary }]}
                value={dateTo}
                onChangeText={setDateTo}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.text.tertiary}
              />
            </ScrollView>
            <View style={styles.modalFooter}>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.neutral[200] }]} onPress={() => { setDateFrom(''); setDateTo(''); }}>
                <Text style={{ color: colors.text.primary }}>Clear</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.primary.main }]} onPress={() => setFilterOpen(false)}>
                <Text style={{ color: '#fff' }}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  searchRow: { paddingHorizontal: spacing[4], paddingVertical: spacing[2] },
  searchBar: { borderRadius: borderRadius.lg, elevation: 0 },
  filterRow: { paddingVertical: spacing[1] },
  listContent: { padding: spacing[4], paddingBottom: spacing[20] },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.lg,
    padding: spacing[3],
    marginBottom: spacing[3],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing[3],
  },
  info: { flex: 1 },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  orderNumber: { fontSize: 14, fontWeight: '700' },
  amount: { fontSize: 14, fontWeight: '700' },
  subtle: { fontSize: 12 },
  badgeRow: { flexDirection: 'row', gap: spacing[2], marginTop: 4, alignItems: 'center', flexWrap: 'wrap' },
  payButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[2],
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
    gap: 4,
    marginLeft: 'auto',
  },
  payButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2], marginBottom: spacing[4] },
  statCard: {
    flex: 1,
    minWidth: '46%',
    alignItems: 'center',
    paddingVertical: spacing[3],
    borderRadius: borderRadius.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  statValue: { fontSize: 16, fontWeight: '700', marginTop: spacing[1] },
  statLabel: { fontSize: 11, marginTop: 2 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: borderRadius.xl, borderTopRightRadius: borderRadius.xl, paddingBottom: spacing[6] },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing[4], borderBottomWidth: 1, borderBottomColor: '#eee' },
  modalTitle: { fontSize: 18, fontWeight: '600' },
  modalBody: { padding: spacing[4] },
  filterLabel: { fontSize: 13, fontWeight: '500', marginBottom: spacing[1], marginTop: spacing[3] },
  dateInput: { borderWidth: 1, borderRadius: borderRadius.md, paddingHorizontal: spacing[3], paddingVertical: Platform.OS === 'ios' ? spacing[3] : spacing[2], fontSize: 14 },
  modalFooter: { flexDirection: 'row', gap: spacing[3], paddingHorizontal: spacing[4], paddingTop: spacing[3] },
  modalBtn: { flex: 1, alignItems: 'center', paddingVertical: spacing[3], borderRadius: borderRadius.md },
});
