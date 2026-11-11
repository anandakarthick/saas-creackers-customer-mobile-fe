import React, { useState, useCallback } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Searchbar } from 'react-native-paper';
import { useQuery } from '@tanstack/react-query';
import { ScreenWrapper, Header } from '@/components/layout';
import { Badge, Empty, SafeAreaFAB } from '@/components/common';
import { useTheme } from '@/theme';
import { spacing, borderRadius } from '@/theme/spacing';
import { branchesApi } from '@/services/api';
import { formatAddress, formatPhoneNumber } from '@/utils';
import type { Branch } from '@/types';
import type { BranchesStackParamList } from '@/types/navigation';

type NavigationProp = NativeStackNavigationProp<BranchesStackParamList, 'BranchesList'>;

function normalizeBranch(b: any): Branch {
  return {
    id: String(b.id),
    name: b.name || '',
    code: b.code || '',
    address: {
      line1: b.address || '',
      city: b.city || '',
      state: b.state || '',
      pincode: b.postalCode || '',
      country: b.country || 'India',
    },
    phone: b.phone || '',
    email: b.email || '',
    managerId: b.managerId ? String(b.managerId) : undefined,
    isActive: b.isActive !== false,
    isMainBranch: !!b.isDefault,
    createdAt: b.createdAt,
    updatedAt: b.updatedAt,
  } as unknown as Branch;
}

export const BranchesListScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { colors } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');

  const { data, isLoading, isError, error, isFetching, refetch } = useQuery({
    queryKey: ['branches', searchQuery],
    queryFn: () => branchesApi.getBranches({ page: 1, limit: 100, search: searchQuery || undefined }),
  });

  const filteredBranches: Branch[] = (data?.data || []).map(normalizeBranch);

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [])
  );

  const onRefresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const handleBranchPress = (branch: Branch) => {
    navigation.navigate('BranchDetail', { id: branch.id });
  };

  const handleAddBranch = () => {
    navigation.navigate('BranchForm', {});
  };

  const renderBranch = ({ item }: { item: Branch }) => (
    <TouchableOpacity
      style={[styles.branchCard, { backgroundColor: colors.surface.default }]}
      onPress={() => handleBranchPress(item)}
      activeOpacity={0.7}
    >
      <View style={[styles.branchIcon, { backgroundColor: colors.primary.light + '20' }]}>
        <Icon
          name={item.isMainBranch ? 'store' : 'store-outline'}
          size={24}
          color={item.isMainBranch ? colors.primary.main : colors.neutral[600]}
        />
      </View>
      <View style={styles.branchInfo}>
        <View style={styles.branchHeader}>
          <Text style={[styles.branchName, { color: colors.text.primary }]}>{item.name}</Text>
          {item.isMainBranch && (
            <Badge variant="primary" size="small">Main</Badge>
          )}
        </View>
        <Text style={[styles.branchCode, { color: colors.text.tertiary }]}>{item.code}</Text>
        <View style={styles.contactRow}>
          <Icon name="map-marker" size={14} color={colors.text.tertiary} />
          <Text style={[styles.contactText, { color: colors.text.secondary }]} numberOfLines={2}>
            {formatAddress(item.address)}
          </Text>
        </View>
        <View style={styles.contactRow}>
          <Icon name="phone" size={14} color={colors.text.tertiary} />
          <Text style={[styles.contactText, { color: colors.text.secondary }]}>{formatPhoneNumber(item.phone)}</Text>
        </View>
      </View>
      <View style={styles.branchActions}>
        <Badge variant={item.isActive ? 'success' : 'error'} size="small">
          {item.isActive ? 'Active' : 'Inactive'}
        </Badge>
        <Icon name="chevron-right" size={24} color={colors.neutral[400]} />
      </View>
    </TouchableOpacity>
  );

  return (
    <ScreenWrapper scrollable={false} padding={false}>
      <Header
        title="Branches"
        subtitle={`${filteredBranches.length} branches`}
        showDrawer
      />

      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Search branches..."
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
        <Empty icon="cloud-alert" title="Couldn't load branches" description={String(error?.message || 'Network error')} />
      ) : (
        <FlatList
          data={filteredBranches}
          renderItem={renderBranch}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshing={isFetching}
          onRefresh={onRefresh}
          ListEmptyComponent={
            <Empty
              icon="store-off-outline"
              title="No branches found"
              description="No branches match your search"
            />
          }
        />
      )}

      <SafeAreaFAB icon="plus" onPress={handleAddBranch} />
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
  branchCard: {
    flexDirection: 'row',
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    marginBottom: spacing[3],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  branchIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  branchInfo: {
    flex: 1,
    marginLeft: spacing[3],
  },
  branchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: 2,
  },
  branchName: {
    fontSize: 16,
    fontWeight: '600',
  },
  branchCode: {
    fontSize: 12,
    marginBottom: spacing[2],
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 4,
  },
  contactText: {
    fontSize: 13,
    marginLeft: spacing[2],
    flex: 1,
  },
  branchActions: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
});
