import React, { useState, useCallback, useMemo } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Searchbar } from 'react-native-paper';
import { useQuery } from '@tanstack/react-query';
import { ScreenWrapper, Header } from '@/components/layout';
import { Badge, Empty, SafeAreaFAB } from '@/components/common';
import { useTheme } from '@/theme';
import { spacing, borderRadius } from '@/theme/spacing';
import { inventoryApi } from '@/services/api';
import { formatDate } from '@/utils';

interface GRNRow {
  id: string;
  reference: string;
  productName: string;
  quantity: number;
  receivedDate: string;
  notes: string;
}

function normalizeGRN(log: any): GRNRow {
  return {
    id: String(log.id),
    reference: log.reference || '—',
    productName: log.product?.name || 'Product',
    quantity: Number(log.quantity || 0),
    receivedDate: log.createdAt,
    notes: log.notes || '',
  };
}

export const GRNListScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');

  const { data, isLoading, isError, error, isFetching, refetch } = useQuery({
    queryKey: ['grnLogs', searchQuery],
    queryFn: () => inventoryApi.getGRNs({ page: 1, limit: 100, search: searchQuery || undefined }),
  });

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [])
  );

  const grns = useMemo<GRNRow[]>(
    () => ((data?.data || []) as any[]).map(normalizeGRN),
    [data]
  );

  const onRefresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const renderGRN = ({ item }: { item: GRNRow }) => (
    <TouchableOpacity
      style={[styles.grnCard, { backgroundColor: colors.surface.default }]}
      activeOpacity={0.7}
      onPress={() => navigation.navigate('GRNDetail', { id: item.id })}
    >
      <View style={[styles.grnIcon, { backgroundColor: colors.success.light + '20' }]}>
        <Icon name="clipboard-check" size={24} color={colors.success.main} />
      </View>
      <View style={styles.grnInfo}>
        <View style={styles.grnHeader}>
          <Text style={[styles.grnNumber, { color: colors.text.primary }]} numberOfLines={1}>
            {item.productName}
          </Text>
          <Badge variant="success" size="small">
            +{item.quantity}
          </Badge>
        </View>
        <Text style={[styles.poReference, { color: colors.primary.main }]}>Ref: {item.reference}</Text>
        {!!item.notes && (
          <Text style={[styles.supplierName, { color: colors.text.secondary }]} numberOfLines={1}>
            {item.notes}
          </Text>
        )}
        <Text style={[styles.receivedDate, { color: colors.text.tertiary }]}>
          Received: {formatDate(item.receivedDate)}
        </Text>
      </View>
      <Icon name="chevron-right" size={24} color={colors.neutral[400]} />
    </TouchableOpacity>
  );

  return (
    <ScreenWrapper scrollable={false} padding={false}>
      <Header
        title="Goods Receipt (GRN)"
        subtitle={`${grns.length} receipts`}
        showDrawer
      />

      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Search GRN..."
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
        <Empty icon="cloud-alert" title="Couldn't load GRN" description={String(error?.message || 'Network error')} />
      ) : (
        <FlatList
          data={grns}
          renderItem={renderGRN}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshing={isFetching}
          onRefresh={onRefresh}
          ListEmptyComponent={
            <Empty
              icon="clipboard-check-outline"
              title="No GRN found"
              description="Goods receipts will appear here once you receive stock"
            />
          }
        />
      )}

      <SafeAreaFAB icon="plus" onPress={() => navigation.navigate('GRNForm', {})} />
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
  grnCard: {
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
  grnIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  grnInfo: {
    flex: 1,
    marginLeft: spacing[3],
  },
  grnHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  grnNumber: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginRight: spacing[2],
  },
  poReference: {
    fontSize: 12,
    marginBottom: spacing[1],
  },
  supplierName: {
    fontSize: 13,
  },
  receivedDate: {
    fontSize: 12,
    marginTop: 2,
  },
});
