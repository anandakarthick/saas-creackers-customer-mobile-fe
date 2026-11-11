import React, { useState, useCallback } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Searchbar } from 'react-native-paper';
import { useQuery } from '@tanstack/react-query';
import { ScreenWrapper, Header } from '@/components/layout';
import { Avatar, Badge, Empty, SafeAreaFAB } from '@/components/common';
import { useTheme } from '@/theme';
import { spacing, borderRadius } from '@/theme/spacing';
import { customersApi } from '@/services/api';
import { formatCurrency, formatPhoneNumber } from '@/utils';
import type { Customer } from '@/types';

function normalizeCustomer(c: any): Customer {
  return {
    id: String(c.id),
    name: `${c.firstName || ''} ${c.lastName || ''}`.trim() || c.name || 'Guest',
    email: c.email || '',
    phone: c.phone || '',
    totalOrders: c.totalOrders ?? c._count?.orders ?? 0,
    totalSpent: Number(c.totalSpent || 0),
    isActive: c.isActive !== false,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  } as Customer;
}

export const CustomersListScreen: React.FC = () => {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const [searchQuery, setSearchQuery] = useState('');

  const { data, isLoading, isError, error, isFetching, refetch } = useQuery({
    queryKey: ['customers', searchQuery],
    queryFn: () => customersApi.getCustomers({ page: 1, limit: 100, search: searchQuery || undefined }),
  });

  const filteredCustomers: Customer[] = (data?.data || []).map(normalizeCustomer);

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [])
  );

  const onRefresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const renderCustomer = ({ item }: { item: Customer }) => (
    <TouchableOpacity
      style={[styles.customerCard, { backgroundColor: colors.surface.default }]}
      onPress={() => navigation.navigate('CustomerDetail', { id: item.id })}
      activeOpacity={0.7}
    >
      <Avatar name={item.name} size="large" />
      <View style={styles.customerInfo}>
        <View style={styles.customerHeader}>
          <Text style={[styles.customerName, { color: colors.text.primary }]}>{item.name}</Text>
          <Badge variant={item.isActive ? 'success' : 'default'} size="small">
            {item.isActive ? 'Active' : 'Inactive'}
          </Badge>
        </View>
        <View style={styles.contactRow}>
          <Icon name="phone" size={14} color={colors.text.tertiary} />
          <Text style={[styles.contactText, { color: colors.text.secondary }]}>{formatPhoneNumber(item.phone)}</Text>
        </View>
        {item.email && (
          <View style={styles.contactRow}>
            <Icon name="email" size={14} color={colors.text.tertiary} />
            <Text style={[styles.contactText, { color: colors.text.secondary }]}>{item.email}</Text>
          </View>
        )}
        <View style={[styles.customerStats, { borderTopColor: colors.border.default }]}>
          <View style={styles.stat}>
            <Text style={[styles.statValue, { color: colors.text.primary }]}>{item.totalOrders}</Text>
            <Text style={[styles.statLabel, { color: colors.text.tertiary }]}>Orders</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border.default }]} />
          <View style={styles.stat}>
            <Text style={[styles.statValue, { color: colors.text.primary }]}>{formatCurrency(item.totalSpent)}</Text>
            <Text style={[styles.statLabel, { color: colors.text.tertiary }]}>Spent</Text>
          </View>
        </View>
      </View>
      <Icon name="chevron-right" size={24} color={colors.neutral[400]} />
    </TouchableOpacity>
  );

  return (
    <ScreenWrapper scrollable={false} padding={false}>
      <Header
        title="Customers"
        subtitle={`${filteredCustomers.length} customers`}
        showDrawer
      />

      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Search customers..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={[styles.searchBar, { backgroundColor: colors.surface.default }]}
          inputStyle={styles.searchInput}
        />
      </View>

      {isLoading ? (
        <View style={styles.loadingCenter}>
          <ActivityIndicator size="large" color={colors.primary.main} />
        </View>
      ) : isError ? (
        <Empty icon="cloud-alert" title="Couldn't load customers" description={String(error?.message || 'Network error')} />
      ) : (
        <FlatList
          data={filteredCustomers}
          renderItem={renderCustomer}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshing={isFetching}
          onRefresh={onRefresh}
          ListEmptyComponent={
            <Empty
              icon="account-off-outline"
              title="No customers found"
              description="No customers match your search"
            />
          }
        />
      )}

      <SafeAreaFAB icon="plus" onPress={() => navigation.navigate('CustomerForm', {})} />
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
  listContent: {
    padding: spacing[4],
    paddingBottom: spacing[20],
  },
  customerCard: {
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
  customerInfo: {
    flex: 1,
    marginLeft: spacing[3],
  },
  customerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[2],
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  contactText: {
    fontSize: 13,
    marginLeft: spacing[2],
  },
  customerStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing[2],
    paddingTop: spacing[2],
    borderTopWidth: 1,
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  statLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 24,
    marginHorizontal: spacing[4],
  },
});
