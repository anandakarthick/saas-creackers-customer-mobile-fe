import React, { useState, useCallback } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Searchbar, Chip } from 'react-native-paper';
import { ScreenWrapper, Header } from '@/components/layout';
import { Badge, Empty, SafeAreaFAB } from '@/components/common';
import { useTheme } from '@/theme';
import { spacing, borderRadius } from '@/theme/spacing';
import { mockPurchaseOrders } from '@/data/mock';
import { formatCurrency, formatDate, getStatusText } from '@/utils';
import type { PurchaseOrder, PurchaseOrderStatus } from '@/types';
import type { PurchaseOrdersStackParamList } from '@/types/navigation';

type NavigationProp = NativeStackNavigationProp<PurchaseOrdersStackParamList, 'PurchaseOrdersList'>;

const statusFilters: { label: string; value: PurchaseOrderStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Draft', value: 'draft' },
  { label: 'Pending', value: 'pending' },
  { label: 'Approved', value: 'approved' },
  { label: 'Received', value: 'received' },
];

export const PurchaseOrdersListScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { colors } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<PurchaseOrderStatus | 'all'>('all');
  const [refreshing, setRefreshing] = useState(false);

  const filteredOrders = mockPurchaseOrders.filter((po) => {
    const matchesSearch =
      po.poNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      po.supplier?.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = selectedStatus === 'all' || po.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await new Promise<void>((resolve) => setTimeout(resolve, 1000));
    setRefreshing(false);
  }, []);

  const handlePOPress = (po: PurchaseOrder) => {
    navigation.navigate('PurchaseOrderDetail', { id: po.id });
  };

  const handleAddPO = () => {
    navigation.navigate('PurchaseOrderForm', {});
  };

  const getStatusBadgeVariant = (status: PurchaseOrderStatus) => {
    switch (status) {
      case 'received':
        return 'success';
      case 'pending':
      case 'draft':
        return 'warning';
      case 'cancelled':
        return 'error';
      default:
        return 'info';
    }
  };

  const renderPurchaseOrder = ({ item }: { item: PurchaseOrder }) => (
    <TouchableOpacity
      style={[styles.poCard, { backgroundColor: colors.surface.default }]}
      onPress={() => handlePOPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.poHeader}>
        <View>
          <Text style={[styles.poNumber, { color: colors.text.primary }]}>{item.poNumber}</Text>
          <Text style={[styles.poDate, { color: colors.text.tertiary }]}>
            Created: {formatDate(item.createdAt)}
          </Text>
        </View>
        <Badge variant={getStatusBadgeVariant(item.status)}>
          {getStatusText(item.status)}
        </Badge>
      </View>

      <View style={[styles.poBody, { borderTopColor: colors.border.default }]}>
        <View style={styles.supplierInfo}>
          <Icon name="truck" size={16} color={colors.text.secondary} />
          <Text style={[styles.supplierName, { color: colors.text.secondary }]}>
            {item.supplier?.name}
          </Text>
        </View>
        <Text style={[styles.itemCount, { color: colors.text.tertiary }]}>
          {item.items.length} items
        </Text>
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
        <Text style={[styles.poTotal, { color: colors.text.primary }]}>
          {formatCurrency(item.total)}
        </Text>
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

      <FlatList
        data={filteredOrders}
        renderItem={renderPurchaseOrder}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshing={refreshing}
        onRefresh={onRefresh}
        ListEmptyComponent={
          <Empty
            icon="clipboard-text-off-outline"
            title="No purchase orders found"
            description="No orders match your criteria"
          />
        }
      />

      <SafeAreaFAB icon="plus" onPress={handleAddPO} />
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
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
