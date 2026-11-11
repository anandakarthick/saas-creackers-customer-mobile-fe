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
import { mockOrders } from '@/data/mock';
import { formatCurrency, formatDateTime, getStatusText } from '@/utils';
import type { Order, OrderStatus } from '@/types';
import type { OrdersStackParamList } from '@/types/navigation';

type NavigationProp = NativeStackNavigationProp<OrdersStackParamList, 'OrdersList'>;

const statusFilters: { label: string; value: OrderStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Processing', value: 'processing' },
  { label: 'Shipped', value: 'shipped' },
  { label: 'Delivered', value: 'delivered' },
];

export const OrdersListScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { colors } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus | 'all'>('all');
  const [refreshing, setRefreshing] = useState(false);

  const handleOrderPress = (order: Order) => {
    navigation.navigate('OrderDetail', { id: order.id });
  };

  const handleAddOrder = () => {
    navigation.navigate('OrderForm', {});
  };

  const filteredOrders = mockOrders.filter((order) => {
    const matchesSearch =
      order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (order.customer?.name || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = selectedStatus === 'all' || order.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setRefreshing(false);
  }, []);

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
      onPress={() => handleOrderPress(item)}
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
          <Text style={[styles.customerName, { color: colors.text.secondary }]}>{item.customer?.name}</Text>
        </View>
        <Text style={[styles.itemCount, { color: colors.text.tertiary }]}>{item.items.length} items</Text>
      </View>

      <View style={[styles.orderFooter, { borderTopColor: colors.border.default }]}>
        <View style={styles.paymentInfo}>
          <Text style={[styles.paymentStatus, { color: colors.success.main }]}>
            {getStatusText(item.paymentStatus)}
          </Text>
          {!!item.paymentMethod && (
          <Text style={[styles.paymentMethod, { color: colors.text.tertiary, backgroundColor: colors.neutral[100] }]}>
            {item.paymentMethod.toUpperCase()}
          </Text>
          )}
        </View>
        <Text style={[styles.orderTotal, { color: colors.text.primary }]}>{formatCurrency(item.total)}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <ScreenWrapper scrollable={false} padding={false}>
      <Header
        title="Orders"
        showDrawer
        actions={[
          { icon: 'filter-variant', onPress: () => {} },
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
                { backgroundColor: selectedStatus === item.value ? colors.primary.main : colors.surface.variant },
              ]}
              textStyle={[
                styles.filterChipText,
                { color: selectedStatus === item.value ? colors.neutral[0] : colors.text.secondary },
              ]}
            >
              {item.label}
            </Chip>
          )}
        />
      </View>

      <FlatList
        data={filteredOrders}
        renderItem={renderOrder}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshing={refreshing}
        onRefresh={onRefresh}
        ListEmptyComponent={
          <Empty
            icon="clipboard-text-off-outline"
            title="No orders found"
            description="No orders match your search criteria"
          />
        }
      />

      <SafeAreaFAB icon="plus" onPress={handleAddOrder} />
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
});
