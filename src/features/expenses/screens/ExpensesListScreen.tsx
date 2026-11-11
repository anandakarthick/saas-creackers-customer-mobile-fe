import React, { useState, useCallback } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity, ActivityIndicator, Modal, ScrollView, TextInput, Platform, Alert } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Searchbar, Chip } from 'react-native-paper';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ScreenWrapper, Header } from '@/components/layout';
import { Badge, Empty, SafeAreaFAB } from '@/components/common';
import { useTheme } from '@/theme';
import { spacing, borderRadius } from '@/theme/spacing';
import { expensesApi } from '@/services/api';
import { formatCurrency } from '@/utils';
import type { ExpensesStackParamList } from '@/types/navigation';

type Nav = NativeStackNavigationProp<ExpensesStackParamList, 'ExpensesList'>;

function normalizeExpense(e: any) {
  return {
    id: String(e.id),
    expenseNumber: e.expenseNumber || `EXP-${e.id}`,
    category: e.category || 'MISC',
    description: e.description || '',
    totalAmount: Number(e.totalAmount || e.amount || 0),
    paymentStatus: e.paymentStatus || 'PENDING',
    date: e.date || e.createdAt,
    vendorName: e.vendorName || e.supplierName || '',
  };
}

const statusVariant = (s: string): 'success' | 'warning' | 'error' => {
  if (s === 'PAID') return 'success';
  if (s === 'PARTIAL') return 'warning';
  return 'error';
};

const paymentFilters = [
  { label: 'All', value: 'all' },
  { label: 'Paid', value: 'PAID' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Partial', value: 'PARTIAL' },
];

const categoryFilters = [
  { label: 'All', value: 'all' },
  { label: 'Rent', value: 'RENT' },
  { label: 'Utilities', value: 'UTILITIES' },
  { label: 'Salary', value: 'SALARY' },
  { label: 'Transport', value: 'TRANSPORT' },
  { label: 'Office', value: 'OFFICE' },
  { label: 'Misc', value: 'MISC' },
];

export const ExpensesListScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPayment, setSelectedPayment] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [filterOpen, setFilterOpen] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const { data: statsData } = useQuery({
    queryKey: ['expenseStats'],
    queryFn: () => expensesApi.getExpenseStats(),
  });

  const { data, isLoading, isError, error, isFetching, refetch } = useQuery({
    queryKey: ['expenses', searchQuery, selectedPayment, selectedCategory, dateFrom, dateTo],
    queryFn: () => expensesApi.getExpenses({
      page: 1,
      limit: 100,
      search: searchQuery || undefined,
      paymentStatus: selectedPayment !== 'all' ? selectedPayment : undefined,
      category: selectedCategory !== 'all' ? selectedCategory : undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => expensesApi.deleteExpense(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['expenseStats'] });
    },
  });

  const handleDelete = (id: string, label: string) => {
    Alert.alert('Delete Expense', `Delete "${label}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteMutation.mutate(id) },
    ]);
  };

  const expenses = (data?.data || []).map(normalizeExpense);
  const hasActiveFilters = selectedPayment !== 'all' || selectedCategory !== 'all' || dateFrom || dateTo;

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [])
  );

  const onRefresh = useCallback(async () => { await refetch(); }, [refetch]);

  const renderItem = ({ item }: { item: ReturnType<typeof normalizeExpense> }) => (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.surface.default }]}
      onPress={() => navigation.navigate('ExpenseDetail', { id: item.id })}
      onLongPress={() => handleDelete(item.id, item.description || item.category)}
      activeOpacity={0.7}
    >
      <View style={[styles.iconWrap, { backgroundColor: colors.error.light + '20' }]}>
        <Icon name="cash-minus" size={24} color={colors.error.main} />
      </View>
      <View style={styles.info}>
        <View style={styles.headerRow}>
          <Text style={[styles.name, { color: colors.text.primary }]} numberOfLines={1}>
            {item.description || item.category}
          </Text>
          <Badge variant={statusVariant(item.paymentStatus)} size="small">
            {item.paymentStatus}
          </Badge>
        </View>
        <View style={styles.metaRow}>
          <Icon name="pound" size={14} color={colors.text.tertiary} />
          <Text style={[styles.metaText, { color: colors.text.secondary }]}>
            {item.expenseNumber}
          </Text>
        </View>
        {item.vendorName ? (
          <View style={styles.metaRow}>
            <Icon name="account" size={14} color={colors.text.tertiary} />
            <Text style={[styles.metaText, { color: colors.text.secondary }]}>
              {item.vendorName}
            </Text>
          </View>
        ) : null}
        <View style={styles.metaRow}>
          <Icon name="calendar" size={14} color={colors.text.tertiary} />
          <Text style={[styles.metaText, { color: colors.text.secondary }]}>
            {item.date ? new Date(item.date).toLocaleDateString() : '—'}
          </Text>
          <Text style={[styles.amount, { color: colors.primary.main }]}>
            {formatCurrency(item.totalAmount)}
          </Text>
        </View>
      </View>
      <Icon name="chevron-right" size={24} color={colors.neutral[400]} />
    </TouchableOpacity>
  );

  const stats: any = statsData || {};
  const statCards = [
    { label: 'Total', value: formatCurrency(stats.totalAmount ?? 0), icon: 'cash-minus', color: colors.primary.main },
    { label: 'Paid', value: formatCurrency(stats.paidAmount ?? 0), icon: 'check-circle', color: '#10B981' },
    { label: 'Pending', value: formatCurrency(stats.pendingAmount ?? 0), icon: 'clock-outline', color: '#F59E0B' },
    { label: 'Count', value: stats.totalExpenses ?? expenses.length, icon: 'receipt', color: '#6366F1' },
  ];

  return (
    <ScreenWrapper scrollable={false} padding={false}>
      <Header
        title="Expenses"
        subtitle={`${expenses.length} records`}
        showDrawer
        actions={[
          { icon: hasActiveFilters ? 'filter-check' : 'filter-variant', onPress: () => setFilterOpen(true) },
        ]}
      />

      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Search expenses..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={[styles.searchBar, { backgroundColor: colors.surface.default }]}
          inputStyle={styles.searchInput}
        />
      </View>

      <View style={[styles.filtersContainer, { borderBottomColor: colors.border.default }]}>
        <FlatList
          horizontal
          data={paymentFilters}
          keyExtractor={(item) => item.value}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersList}
          renderItem={({ item }) => (
            <Chip
              selected={selectedPayment === item.value}
              onPress={() => setSelectedPayment(item.value)}
              style={[styles.filterChip, { backgroundColor: colors.surface.variant }, selectedPayment === item.value && { backgroundColor: colors.primary.main }]}
              textStyle={[styles.filterChipText, { color: colors.text.secondary }, selectedPayment === item.value && { color: colors.neutral[0] }]}
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
        <Empty icon="cloud-alert" title="Couldn't load expenses" description={String((error as any)?.message || 'Network error')} />
      ) : (
        <FlatList
          data={expenses}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
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
          ListEmptyComponent={
            <Empty icon="cash-remove" title="No expenses found" description="No expenses match your search" />
          }
        />
      )}

      <SafeAreaFAB icon="plus" onPress={() => navigation.navigate('ExpenseForm', {})} />

      <Modal visible={filterOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface.default }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text.primary }]}>Filters</Text>
              <TouchableOpacity onPress={() => setFilterOpen(false)}>
                <Icon name="close" size={24} color={colors.text.secondary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              <Text style={[styles.filterLabel, { color: colors.text.secondary }]}>Category</Text>
              <View style={styles.chipGrid}>
                {categoryFilters.map((c) => (
                  <Chip
                    key={c.value}
                    selected={selectedCategory === c.value}
                    onPress={() => setSelectedCategory(c.value)}
                    style={[styles.filterChip, { backgroundColor: colors.surface.variant }, selectedCategory === c.value && { backgroundColor: colors.primary.main }]}
                    textStyle={[styles.filterChipText, { color: colors.text.secondary }, selectedCategory === c.value && { color: colors.neutral[0] }]}
                  >
                    {c.label}
                  </Chip>
                ))}
              </View>

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
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.neutral[200] }]}
                onPress={() => { setSelectedCategory('all'); setSelectedPayment('all'); setDateFrom(''); setDateTo(''); }}
              >
                <Text style={{ color: colors.text.primary }}>Clear All</Text>
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
  searchContainer: { paddingHorizontal: spacing[4], paddingVertical: spacing[2] },
  searchBar: { borderRadius: borderRadius.lg, elevation: 0 },
  searchInput: { fontSize: 14 },
  listContent: { padding: spacing[4], paddingBottom: spacing[20] },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    marginBottom: spacing[3],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  info: { flex: 1, marginLeft: spacing[3] },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[2],
  },
  name: { fontSize: 15, fontWeight: '600', flex: 1, marginRight: spacing[2] },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 3 },
  metaText: { fontSize: 13, marginLeft: spacing[2] },
  amount: { fontSize: 14, fontWeight: '700', marginLeft: 'auto' },
  filtersContainer: { borderBottomWidth: 1 },
  filtersList: { paddingHorizontal: spacing[4], paddingVertical: spacing[2], gap: spacing[2] },
  filterChip: { marginRight: spacing[2] },
  filterChipText: { fontSize: 13 },
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
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2], marginTop: spacing[1] },
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
