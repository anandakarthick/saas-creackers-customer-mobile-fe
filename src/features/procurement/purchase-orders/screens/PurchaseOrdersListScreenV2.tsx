import React, { useState, useCallback } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Searchbar, Chip } from 'react-native-paper';
import { useQuery } from '@tanstack/react-query';
import { ScreenWrapper, Header } from '@/components/layout';
import { Badge, Empty, SafeAreaFAB } from '@/components/common';
import { useTheme } from '@/theme';
import { spacing, borderRadius } from '@/theme/spacing';
import { suppliersApi } from '@/services/api';
import { formatCurrency, formatDate, getStatusText } from '@/utils';
import { getPOStatusColor } from '@/utils/helpers';
import type { PurchaseOrder, PurchaseOrderStatus } from '@/types';

function normalizePO(p: any): PurchaseOrder {
  return {
    id: String(p.id),
    poNumber: p.orderNumber || p.poNumber || '',
    supplierId: String(p.supplierId || ''),
    supplier: p.supplier ? { id: String(p.supplier.id), name: p.supplier.name, code: p.supplier.code } : undefined,
    items: p.items || [],
    subtotal: Number(p.subtotal || 0),
    tax: Number(p.tax || 0),
    total: Number(p.total || 0),
    status: (p.status || 'pending').toLowerCase() as PurchaseOrderStatus,
    expectedDate: p.expectedDate,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  } as PurchaseOrder;
}

const statusFilters: { label: string; value: PurchaseOrderStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Approved', value: 'approved' },
  { label: 'Received', value: 'received' },
];

export const PurchaseOrdersListScreen: React.FC = () => {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<PurchaseOrderStatus | 'all'>('all');

  const { data, isLoading, isError, error, isFetching, refetch } = useQuery({
    queryKey: ['purchaseOrders', searchQuery, selectedStatus],
    queryFn: () =>
      suppliersApi.getPurchaseOrders({
        page: 1,
        limit: 100,
        search: searchQuery || undefined,
        status: selectedStatus !== 'all' ? selectedStatus : undefined,
      }),
  });

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [])
  );

  const filteredOrders: PurchaseOrder[] = (data?.data || []).map(normalizePO);

  const onRefresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const getStatusBadgeVariant = (status: PurchaseOrderStatus) => {
    switch (status) {
      case 'received': return 'success';
      case 'pending':
      case 'draft': return 'warning';
      case 'cancelled': return 'error';
      default: return 'info';
    }
  };

  const renderPurchaseOrder = ({ item }: { item: PurchaseOrder }) => (
    <TouchableOpacity
      style={[styles.poCard, { backgroundColor: colors.surface.default }]}
      onPress={() => navigation.navigate('PurchaseOrderDetail', { id: item.id })}
      activeOpacity={0.7}
    >
      <View style={styles.poHeader}>
        <View>
          <Text style={[styles.poNumber, { color: colors.text.primary }]}>{item.poNumber}</Text>
          <Text style={[styles.poDate, { color: colors.text.tertiary }]}>Created: {formatDate(item.createdAt)}</Text>
        </View>
        <Badge variant={getStatusBadgeVariant(item.status)}>
          {getStatusText(item.status)}
        </Badge>
      </View>

      <View style={[styles.poBody, { borderTopColor: colors.border.default }]}>
        <View style={styles.supplierInfo}>
          <Icon name="truck" size={16} color={colors.text.secondary} />
          <Text style={[styles.supplierName, { color: colors.text.secondary }]}>{item.supplier?.name}</Text>
        </View>
        <Text style={[styles.itemCount, { color: colors.text.tertiary }]}>{item.items.length} items</Text>
      </View>

      {item.expectedDate && (
        <View style={styles.expectedDate}>
          <Icon name="calendar-clock" size={14} color={colors.text.tertiary} />
          <Text style={[styles.expectedDateText, { color: colors.text.tertiary }]}>
            Expected: {formatDate(item.expectedDate)}
          </Text>
        </View>
      )}

      <View style={[styles.poFooter, { borderTopColor: colors.border.default }]}>
        <Text style={[styles.poTotal, { color: colors.text.primary }]}>{formatCurrency(item.total)}</Text>
        <Icon name="chevron-right" size={24} color={colors.neutral[400]} />
      </View>
    </TouchableOpacity>
  );

  return (
    <ScreenWrapper scrollable={false} padding={false}>
      <Header
        title="Purchase Orders"
        subtitle={`${filteredOrders.length} orders`}
        showDrawer
      />

      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Search purchase orders..."
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

      {isLoading ? (
        <View style={styles.loadingCenter}>
          <ActivityIndicator size="large" color={colors.primary.main} />
        </View>
      ) : isError ? (
        <Empty icon="cloud-alert" title="Couldn't load POs" description={String(error?.message || 'Network error')} />
      ) : (
        <FlatList
          data={filteredOrders}
          renderItem={renderPurchaseOrder}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshing={isFetching}
          onRefresh={onRefresh}
          ListEmptyComponent={
            <Empty
              icon="clipboard-text-off-outline"
              title="No purchase orders found"
              description="No orders match your criteria"
            />
          }
        />
      )}

      <SafeAreaFAB icon="plus" onPress={() => navigation.navigate('PurchaseOrderForm', {})} />
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
  poCard: {
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    marginBottom: spacing[3],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  poHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing[3],
  },
  poNumber: {
    fontSize: 16,
    fontWeight: '600',
  },
  poDate: {
    fontSize: 12,
    marginTop: 2,
  },
  poBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing[2],
    borderTopWidth: 1,
  },
  supplierInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  supplierName: {
    fontSize: 14,
    marginLeft: spacing[2],
  },
  itemCount: {
    fontSize: 13,
  },
  expectedDate: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: spacing[2],
  },
  expectedDateText: {
    fontSize: 12,
    marginLeft: spacing[1],
  },
  poFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing[2],
    borderTopWidth: 1,
    marginTop: spacing[2],
  },
  poTotal: {
    fontSize: 18,
    fontWeight: '700',
  },
});
