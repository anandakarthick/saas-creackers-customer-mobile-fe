import React, { useState, useCallback } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Searchbar } from 'react-native-paper';
import { useQuery } from '@tanstack/react-query';
import { ScreenWrapper, Header } from '@/components/layout';
import { Badge, Empty, SafeAreaFAB } from '@/components/common';
import { useTheme } from '@/theme';
import { spacing, borderRadius } from '@/theme/spacing';
import { suppliersApi } from '@/services/api';
import { formatAddress, formatPhoneNumber } from '@/utils';
import type { Supplier } from '@/types';

function normalizeSupplier(s: any): Supplier {
  return {
    id: String(s.id),
    name: s.name || '',
    contactPerson: s.contactPerson || '',
    email: s.email || '',
    phone: s.phone || s.mobile || '',
    gstNumber: s.gstNumber,
    paymentTerms: s.creditDays ? `Net ${s.creditDays}` : '',
    isActive: s.isActive !== false,
  } as Supplier;
}

export const SuppliersListScreen: React.FC = () => {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const [searchQuery, setSearchQuery] = useState('');

  const { data, isLoading, isError, error, isFetching, refetch } = useQuery({
    queryKey: ['suppliers', searchQuery],
    queryFn: () => suppliersApi.getSuppliers({ page: 1, limit: 100, search: searchQuery || undefined }),
  });

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [])
  );

  const filteredSuppliers: Supplier[] = (data?.data || []).map(normalizeSupplier);

  const onRefresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const renderSupplier = ({ item }: { item: Supplier }) => (
    <TouchableOpacity
      style={[styles.supplierCard, { backgroundColor: colors.surface.default }]}
      onPress={() => navigation.navigate('SupplierDetail', { id: item.id })}
      activeOpacity={0.7}
    >
      <View style={[styles.supplierIcon, { backgroundColor: colors.info.light + '20' }]}>
        <Icon name="truck" size={24} color={colors.info.main} />
      </View>
      <View style={styles.supplierInfo}>
        <View style={styles.supplierHeader}>
          <Text style={[styles.supplierName, { color: colors.text.primary }]}>{item.name}</Text>
          <Badge variant={item.isActive ? 'success' : 'error'} size="small">
            {item.isActive ? 'Active' : 'Inactive'}
          </Badge>
        </View>
        <View style={styles.contactRow}>
          <Icon name="account" size={14} color={colors.text.tertiary} />
          <Text style={[styles.contactText, { color: colors.text.secondary }]}>{item.contactPerson}</Text>
        </View>
        <View style={styles.contactRow}>
          <Icon name="phone" size={14} color={colors.text.tertiary} />
          <Text style={[styles.contactText, { color: colors.text.secondary }]}>{formatPhoneNumber(item.phone)}</Text>
        </View>
        {item.gstNumber && (
          <View style={styles.contactRow}>
            <Icon name="file-document" size={14} color={colors.text.tertiary} />
            <Text style={[styles.contactText, { color: colors.text.secondary }]}>GST: {item.gstNumber}</Text>
          </View>
        )}
        {item.paymentTerms && (
          <Text style={[styles.paymentTerms, { color: colors.info.main }]}>Payment: {item.paymentTerms}</Text>
        )}
      </View>
      <Icon name="chevron-right" size={24} color={colors.neutral[400]} />
    </TouchableOpacity>
  );

  return (
    <ScreenWrapper scrollable={false} padding={false}>
      <Header
        title="Suppliers"
        subtitle={`${filteredSuppliers.length} suppliers`}
        showDrawer
      />

      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Search suppliers..."
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
        <Empty icon="cloud-alert" title="Couldn't load suppliers" description={String(error?.message || 'Network error')} />
      ) : (
        <FlatList
          data={filteredSuppliers}
          renderItem={renderSupplier}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshing={isFetching}
          onRefresh={onRefresh}
          ListEmptyComponent={
            <Empty
              icon="truck-outline"
              title="No suppliers found"
              description="No suppliers match your search"
            />
          }
        />
      )}

      <SafeAreaFAB icon="plus" onPress={() => navigation.navigate('SupplierForm', {})} />
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
  supplierCard: {
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
  supplierIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  supplierInfo: {
    flex: 1,
    marginLeft: spacing[3],
  },
  supplierHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[2],
  },
  supplierName: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  contactText: {
    fontSize: 13,
    marginLeft: spacing[2],
  },
  paymentTerms: {
    fontSize: 12,
    marginTop: spacing[2],
    fontWeight: '500',
  },
});
