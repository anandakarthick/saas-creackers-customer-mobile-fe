import React, { useState, useCallback } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Searchbar } from 'react-native-paper';
import { ScreenWrapper, Header } from '@/components/layout';
import { Avatar, Badge, Empty, SafeAreaFAB } from '@/components/common';
import { useTheme } from '@/theme';
import { spacing, borderRadius } from '@/theme/spacing';
import { mockCustomers } from '@/data/mock';
import { formatCurrency, formatPhoneNumber } from '@/utils';
import type { Customer } from '@/types';
import type { CustomersStackParamList } from '@/types/navigation';

type NavigationProp = NativeStackNavigationProp<CustomersStackParamList, 'CustomersList'>;

export const CustomersListScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { colors } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const handleCustomerPress = (customer: Customer) => {
    navigation.navigate('CustomerDetail', { id: customer.id });
  };

  const handleAddCustomer = () => {
    navigation.navigate('CustomerForm', {});
  };

  const filteredCustomers = mockCustomers.filter((customer) =>
    customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.phone.includes(searchQuery) ||
    customer.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setRefreshing(false);
  }, []);

  const renderCustomer = ({ item }: { item: Customer }) => (
    <TouchableOpacity
      style={[styles.customerCard, { backgroundColor: colors.surface.default }]}
      onPress={() => handleCustomerPress(item)}
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

      <FlatList
        data={filteredCustomers}
        renderItem={renderCustomer}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshing={refreshing}
        onRefresh={onRefresh}
        ListEmptyComponent={
          <Empty
            icon="account-off-outline"
            title="No customers found"
            description="No customers match your search"
          />
        }
      />

      <SafeAreaFAB icon="plus" onPress={handleAddCustomer} />
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
