import React, { useState, useCallback } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity, ActivityIndicator, Modal, Platform, TextInput, ScrollView } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Searchbar, Chip } from 'react-native-paper';
import { useQuery } from '@tanstack/react-query';
import { ScreenWrapper, Header } from '@/components/layout';
import { Card, Badge, Empty } from '@/components/common';
import { useTheme } from '@/theme';
import { spacing, borderRadius } from '@/theme/spacing';
import { ordersApi } from '@/services/api';
import { formatCurrency, formatDateTime, getStatusText } from '@/utils';
import type { Order, OrderStatus } from '@/types';

function normalizeOrder(o: any): Order & { itemCount: number } {
  return {
    id: String(o.id),
    orderNumber: o.orderNumber || '',
    customerId: String(o.customerId || ''),
    customer: o.customer ? {
      id: String(o.customer.id),
      name: o.shippingAddress?.name || `${o.customer.firstName || ''} ${o.customer.lastName || ''}`.trim() || o.customer.name || 'Guest',
      email: o.customer.email || '',
      phone: o.shippingAddress?.phone || o.customer.phone || '',
    } : undefined,
    items: o.items || [],
    // Use _count.items from Prisma (list endpoint) or fall back to items array length
    itemCount: o._count?.items ?? o.items?.length ?? 0,
    subtotal: Number(o.subtotal || 0),
    discount: Number(o.discount || 0),
    tax: Number(o.tax || 0),
    total: Number(o.total || 0),
    status: (o.status || 'pending').toLowerCase() as OrderStatus,
    paymentStatus: (o.paymentStatus || 'pending').toLowerCase(),
    paymentMethod: o.paymentMethod,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
  } as Order & { itemCount: number };
}

const statusFilters: { label: string; value: OrderStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Confirmed', value: 'confirmed' as OrderStatus },
  { label: 'Processing', value: 'processing' },
  { label: 'Shipped', value: 'shipped' },
  { label: 'Delivered', value: 'delivered' },
  { label: 'Cancelled', value: 'cancelled' as OrderStatus },
  { label: 'Refunded', value: 'refunded' as OrderStatus },
];

const paymentStatusFilters = [
  { label: 'All', value: 'all' },
  { label: 'Paid', value: 'PAID' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Partial', value: 'PARTIALLY_PAID' },
  { label: 'Failed', value: 'FAILED' },
  { label: 'Refunded', value: 'REFUNDED' },
];

export const OrdersListScreen: React.FC = () => {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus | 'all'>('all');
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState('all');
  const [filterOpen, setFilterOpen] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const { data: statsData } = useQuery({
    queryKey: ['orderStats'],
    queryFn: () => ordersApi.getOrderStats(),
  });

  const { data, isLoading, isError, error, isFetching, refetch } = useQuery({
    queryKey: ['orders', searchQuery, selectedStatus, selectedPaymentStatus, dateFrom, dateTo],
    queryFn: () =>
      ordersApi.getOrders({
        page: 1,
        limit: 100,
        search: searchQuery || undefined,
        status: selectedStatus !== 'all' ? selectedStatus : undefined,
        paymentStatus: selectedPaymentStatus !== 'all' ? selectedPaymentStatus : undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      }),
  });

  const filteredOrders: Order[] = (data?.data || []).map(normalizeOrder);
  const orderStats: any = statsData || {};
  const hasActiveFilters = selectedPaymentStatus !== 'all' || dateFrom || dateTo;

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [])
  );

  const onRefresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const clearAllFilters = () => {
    setSelectedStatus('all');
    setSelectedPaymentStatus('all');
    setDateFrom('');
    setDateTo('');
    setSearchQuery('');
  };

  const getStatusBadgeVariant = (status: OrderStatus) => {
    switch (status) {
      case 'delivered': return 'success';
      case 'pending': return 'warning';
      case 'cancelled':
      case 'refunded': return 'error';
      default: return 'info';
    }
  };

  const renderOrder = ({ item }: { item: Order }) => (
    <TouchableOpacity
      style={[styles.orderCard, { backgroundColor: colors.surface.default }]}
      onPress={() => navigation.navigate('OrderDetail', { id: item.id })}
      activeOpacity={0.7}
    >
      <View style={styles.orderHeader}>
        <View>
          <Text style={[styles.orderNumber, { color: colors.text.primary }]}>{item.orderNumber}</Text>
          <Text style={[styles.orderDate, { color: colors.text.tertiary }]}>{formatDateTime(item.createdAt)}</Text>
        </View>
        <Badge variant={getStatusBadgeVariant(item.status)}>
          {getStatusText(item.status)}
        </Badge>
      </View>

      <View style={[styles.orderBody, { borderTopColor: colors.border.default }]}>
        <View style={styles.customerInfo}>
          <Icon name="account" size={16} color={colors.text.secondary} />
          <Text style={[styles.customerName, { color: colors.text.secondary }]}>{item.customer?.name || 'Guest'}</Text>
        </View>
        <Text style={[styles.itemCount, { color: colors.text.tertiary }]}>{(item as any).itemCount ?? item.items.length} items</Text>
      </View>

      <View style={[styles.orderFooter, { borderTopColor: colors.border.default }]}>
        <View style={styles.paymentInfo}>
          <Text style={[styles.paymentStatus, { color: item.paymentStatus === 'paid' ? (colors.success?.main || '#4CAF50') : item.paymentStatus === 'failed' ? (colors.error?.main || '#F44336') : (colors.warning?.main || '#FF9800') }]}>
            {getStatusText(item.paymentStatus)}
          </Text>
          <Text style={[styles.paymentMethod, { color: colors.text.tertiary, backgroundColor: colors.neutral[100] }]}>
            {(item.paymentMethod || '—').toUpperCase()}
          </Text>
        </View>
        <Text style={[styles.orderTotal, { color: colors.text.primary }]}>{formatCurrency(item.total)}</Text>
      </View>
    </TouchableOpacity>
  );

  const statCards = [
    { label: 'Total Orders', value: orderStats.totalOrders ?? filteredOrders.length, icon: 'clipboard-list', color: colors.primary.main },
    { label: 'Pending', value: orderStats.pendingOrders ?? 0, icon: 'clock-outline', color: '#F59E0B' },
    { label: 'Revenue', value: formatCurrency(orderStats.totalRevenue ?? 0), icon: 'currency-inr', color: '#10B981' },
    { label: 'Due', value: formatCurrency(orderStats.totalDue ?? 0), icon: 'alert-circle-outline', color: '#EF4444' },
  ];

  return (
    <ScreenWrapper scrollable={false} padding={false}>
      <Header
        title="Orders"
        showDrawer
        actions={[
          {
            icon: hasActiveFilters ? 'filter-check' : 'filter-variant',
            onPress: () => setFilterOpen(true),
          },
        ]}
      />

      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Search orders..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={[styles.searchBar, { backgroundColor: colors.surface.default }]}
          inputStyle={styles.searchInput}
        />
      </View>

      <View style={[styles.filtersContainer, { borderBottomColor: colors.border.default }]}>
        <FlatList
          horizontal
          data={statusFilters}
          keyExtractor={(item) => item.value}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersList}
          renderItem={({ item }) => (
            <Chip
              selected={selectedStatus === item.value}
              onPress={() => setSelectedStatus(item.value)}
              style={[
                styles.filterChip,
                { backgroundColor: colors.surface.variant },
                selectedStatus === item.value && { backgroundColor: colors.primary.main },
              ]}
              textStyle={[
                styles.filterChipText,
                { color: colors.text.secondary },
                selectedStatus === item.value && { color: colors.neutral[0] },
              ]}
            >
              {item.label}
            </Chip>
          )}
        />
      </View>

      <View style={[styles.filtersContainer, { borderBottomColor: colors.border.default }]}>
        <FlatList
          horizontal
          data={paymentStatusFilters}
          keyExtractor={(item) => item.value}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersList}
          renderItem={({ item }) => (
            <Chip
              selected={selectedPaymentStatus === item.value}
              onPress={() => setSelectedPaymentStatus(item.value)}
              style={[
                styles.filterChip,
                { backgroundColor: colors.surface.variant },
                selectedPaymentStatus === item.value && { backgroundColor: '#10B981' },
              ]}
              textStyle={[
                styles.filterChipText,
                { color: colors.text.secondary },
                selectedPaymentStatus === item.value && { color: colors.neutral[0] },
              ]}
            >
              {item.label}
            </Chip>
          )}
        />
      </View>

      {isLoading ? (
        <View style={styles.loadingCenter}>
          <ActivityIndicator size="large" color={colors.primary.main} />
        </View>
      ) : isError ? (
        <Empty icon="cloud-alert" title="Couldn't load orders" description={String(error?.message || 'Network error')} />
      ) : (
        <FlatList
          data={filteredOrders}
          renderItem={renderOrder}
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
            <Empty
              icon="clipboard-text-off-outline"
              title="No orders found"
              description="No orders match your search criteria"
            />
          }
        />
      )}

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
              <Text style={[styles.filterLabel, { color: colors.text.secondary }]}>Date From (YYYY-MM-DD)</Text>
              <TextInput
                style={[styles.dateInput, { borderColor: colors.border.default, color: colors.text.primary }]}
                value={dateFrom}
                onChangeText={setDateFrom}
                placeholder="e.g. 2025-01-01"
                placeholderTextColor={colors.text.tertiary}
              />

              <Text style={[styles.filterLabel, { color: colors.text.secondary }]}>Date To (YYYY-MM-DD)</Text>
              <TextInput
                style={[styles.dateInput, { borderColor: colors.border.default, color: colors.text.primary }]}
                value={dateTo}
                onChangeText={setDateTo}
                placeholder="e.g. 2025-12-31"
                placeholderTextColor={colors.text.tertiary}
              />
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.neutral[200] }]} onPress={clearAllFilters}>
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
  loadingCenter: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  searchContainer: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
  },
  searchBar: {
    borderRadius: borderRadius.lg,
    elevation: 0,
  },
  searchInput: {
    fontSize: 14,
  },
  filtersContainer: {
    borderBottomWidth: 1,
  },
  filtersList: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    gap: spacing[2],
  },
  filterChip: {
    marginRight: spacing[2],
  },
  filterChipText: {
    fontSize: 13,
  },
  listContent: {
    padding: spacing[4],
    paddingBottom: spacing[20],
  },
  orderCard: {
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    marginBottom: spacing[3],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing[3],
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: '600',
  },
  orderDate: {
    fontSize: 12,
    marginTop: 2,
  },
  orderBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing[2],
    borderTopWidth: 1,
  },
  customerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  customerName: {
    fontSize: 14,
    marginLeft: spacing[2],
  },
  itemCount: {
    fontSize: 13,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing[2],
    borderTopWidth: 1,
  },
  paymentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  paymentStatus: {
    fontSize: 12,
    fontWeight: '500',
  },
  paymentMethod: {
    fontSize: 11,
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  orderTotal: {
    fontSize: 18,
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
    marginBottom: spacing[4],
  },
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
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: spacing[1],
  },
  statLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingBottom: spacing[6],
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalBody: {
    padding: spacing[4],
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: spacing[1],
    marginTop: spacing[3],
  },
  dateInput: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing[3],
    paddingVertical: Platform.OS === 'ios' ? spacing[3] : spacing[2],
    fontSize: 14,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: spacing[3],
    paddingHorizontal: spacing[4],
    paddingTop: spacing[3],
  },
  modalBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing[3],
    borderRadius: borderRadius.md,
  },
});
