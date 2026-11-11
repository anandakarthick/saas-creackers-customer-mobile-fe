import React, { useState, useCallback } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Searchbar } from 'react-native-paper';
import { ScreenWrapper, Header } from '@/components/layout';
import { Badge, Empty, SafeAreaFAB } from '@/components/common';
import { useTheme } from '@/theme';
import { spacing, borderRadius } from '@/theme/spacing';
import { mockSuppliers } from '@/data/mock';
import { formatPhoneNumber } from '@/utils';
import type { Supplier } from '@/types';
import type { SuppliersStackParamList } from '@/types/navigation';

type NavigationProp = NativeStackNavigationProp<SuppliersStackParamList, 'SuppliersList'>;

export const SuppliersListScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { colors } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const handleSupplierPress = (supplier: Supplier) => {
    navigation.navigate('SupplierDetail', { id: supplier.id });
  };

  const handleAddSupplier = () => {
    navigation.navigate('SupplierForm', {});
  };

  const filteredSuppliers = mockSuppliers.filter((supplier) =>
    supplier.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    supplier.contactPerson.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await new Promise<void>((resolve) => setTimeout(resolve, 1000));
    setRefreshing(false);
  }, []);

  const renderSupplier = ({ item }: { item: Supplier }) => (
    <TouchableOpacity
      style={[styles.supplierCard, { backgroundColor: colors.surface.default }]}
      onPress={() => handleSupplierPress(item)}
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

      <FlatList
        data={filteredSuppliers}
        renderItem={renderSupplier}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshing={refreshing}
        onRefresh={onRefresh}
        ListEmptyComponent={
          <Empty
            icon="truck-outline"
            title="No suppliers found"
            description="No suppliers match your search"
          />
        }
      />

      <SafeAreaFAB icon="plus" onPress={handleAddSupplier} />
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
