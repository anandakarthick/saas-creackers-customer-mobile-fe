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

interface AdjustmentRow {
  id: string;
  reference: string;
  productName: string;
  delta: number;
  prevQty: number;
  newQty: number;
  reason: string;
  notes: string;
  createdAt: string;
}

function normalizeAdjustment(log: any): AdjustmentRow {
  return {
    id: String(log.id),
    reference: log.reference || '—',
    productName: log.product?.name || 'Product',
    delta: Number(log.quantity || 0),
    prevQty: Number(log.prevQty || 0),
    newQty: Number(log.newQty || 0),
    reason: log.reason || log.type || '',
    notes: log.notes || '',
    createdAt: log.createdAt,
  };
}

export const StockAdjustmentsListScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');

  const { data, isLoading, isError, error, isFetching, refetch } = useQuery({
    queryKey: ['adjustmentLogs', searchQuery],
    queryFn: () =>
      inventoryApi.getStockAdjustments({ page: 1, limit: 100, search: searchQuery || undefined }),
  });

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [])
  );

  const adjustments = useMemo<AdjustmentRow[]>(
    () => ((data?.data || []) as any[]).map(normalizeAdjustment),
    [data]
  );

  const onRefresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const renderAdjustment = ({ item }: { item: AdjustmentRow }) => {
    const isPositive = item.delta >= 0;
    return (
      <TouchableOpacity
        style={[styles.adjustmentCard, { backgroundColor: colors.surface.default }]}
        activeOpacity={0.7}
        onPress={() => navigation.navigate('StockAdjustmentDetail', { id: item.id })}
      >
        <View style={[styles.adjustmentIcon, { backgroundColor: (isPositive ? colors.success.light : colors.error.light) + '20' }]}>
          <Icon
            name={isPositive ? 'plus-circle' : 'minus-circle'}
            size={24}
            color={isPositive ? colors.success.main : colors.error.main}
          />
        </View>
        <View style={styles.adjustmentInfo}>
          <View style={styles.adjustmentHeader}>
            <Text style={[styles.adjustmentNumber, { color: colors.text.primary }]} numberOfLines={1}>
              {item.productName}
            </Text>
            <Badge variant={isPositive ? 'success' : 'error'} size="small">
              {isPositive ? '+' : ''}
              {item.delta}
            </Badge>
          </View>
          {(!!item.notes || !!item.reason) && (
            <Text style={[styles.reason, { color: colors.text.secondary }]} numberOfLines={1}>
              {item.notes || item.reason}
            </Text>
          )}
          <View style={styles.adjustmentDetails}>
            <Text style={[styles.detailText, { color: colors.text.tertiary }]}>
              {item.prevQty} → {item.newQty}
            </Text>
            <Text style={[styles.detailText, { color: colors.text.tertiary }]}>Ref: {item.reference}</Text>
          </View>
          <Text style={[styles.dateText, { color: colors.text.tertiary }]}>{formatDate(item.createdAt)}</Text>
        </View>
        <Icon name="chevron-right" size={24} color={colors.neutral[400]} />
      </TouchableOpacity>
    );
  };

  return (
    <ScreenWrapper scrollable={false} padding={false}>
      <Header
        title="Stock Adjustments"
        subtitle={`${adjustments.length} adjustments`}
        showDrawer
      />

      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Search adjustments..."
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
        <Empty icon="cloud-alert" title="Couldn't load adjustments" description={String(error?.message || 'Network error')} />
      ) : (
        <FlatList
          data={adjustments}
          renderItem={renderAdjustment}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshing={isFetching}
          onRefresh={onRefresh}
          ListEmptyComponent={
            <Empty
              icon="swap-horizontal"
              title="No adjustments found"
              description="Stock adjustments will appear here"
            />
          }
        />
      )}

      <SafeAreaFAB icon="plus" onPress={() => navigation.navigate('StockAdjustmentForm', {})} />
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
  adjustmentCard: {
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
  adjustmentIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  adjustmentInfo: {
    flex: 1,
    marginLeft: spacing[3],
  },
  adjustmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  adjustmentNumber: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginRight: spacing[2],
  },
  reason: {
    fontSize: 14,
    marginBottom: spacing[1],
  },
  adjustmentDetails: {
    flexDirection: 'row',
    gap: spacing[3],
    marginBottom: 4,
  },
  detailText: {
    fontSize: 12,
  },
  dateText: {
    fontSize: 12,
  },
});
