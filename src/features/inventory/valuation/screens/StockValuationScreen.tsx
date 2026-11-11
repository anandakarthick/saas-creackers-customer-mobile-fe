import React, { useCallback, useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { SegmentedButtons } from 'react-native-paper';

import { ScreenWrapper, Header } from '@/components/layout';
import { Empty } from '@/components/common';
import { useTheme } from '@/theme';
import { spacing, borderRadius } from '@/theme/spacing';
import { inventoryApi } from '@/services/api';
import { formatCurrency } from '@/utils';

type GroupBy = 'product' | 'category';

/**
 * Phase 3: Shows the total value of current inventory — split into cost value,
 * retail value and margin. Data comes from GET /admin/inventory/valuation
 * which already aggregates it server-side.
 */
export const StockValuationScreen: React.FC = () => {
  const { colors } = useTheme();
  const [groupBy, setGroupBy] = useState<GroupBy>('product');

  const { data, isLoading, isError, error, isFetching, refetch } = useQuery({
    queryKey: ['stockValuation'],
    queryFn: () => inventoryApi.getStockValuation(),
  });

  const onRefresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const summary = data?.summary;
  const items = data?.items || [];

  // Aggregate items by category for the "by category" view.
  const byCategory = useMemo(() => {
    const map = new Map<
      string,
      {
        name: string;
        productCount: number;
        itemCount: number;
        costValue: number;
        retailValue: number;
        margin: number;
      }
    >();
    for (const item of items as any[]) {
      const key = item.category?.name || 'Uncategorized';
      const existing = map.get(key) || {
        name: key,
        productCount: 0,
        itemCount: 0,
        costValue: 0,
        retailValue: 0,
        margin: 0,
      };
      existing.productCount += 1;
      existing.itemCount += Number(item.quantity || 0);
      existing.costValue += Number(item.costValue || 0);
      existing.retailValue += Number(item.retailValue || 0);
      existing.margin += Number(item.margin || 0);
      map.set(key, existing);
    }
    return Array.from(map.values()).sort((a, b) => b.retailValue - a.retailValue);
  }, [items]);

  if (isLoading) {
    return (
      <ScreenWrapper>
        <Header title="Stock Valuation" showBack />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary.main} />
        </View>
      </ScreenWrapper>
    );
  }

  if (isError || !data) {
    return (
      <ScreenWrapper>
        <Header title="Stock Valuation" showBack />
        <Empty
          icon="cloud-alert"
          title="Couldn't load valuation"
          description={String(error?.message || 'Network error')}
        />
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper scrollable={false} padding={false}>
      <Header title="Stock Valuation" subtitle="Current inventory worth" showBack />

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={onRefresh} />}
      >
        {/* Hero summary */}
        {summary && (
          <View style={[styles.heroCard, { backgroundColor: colors.primary.main }]}>
            <Text style={styles.heroLabel}>Total Retail Value</Text>
            <Text style={styles.heroAmount}>{formatCurrency(summary.totalRetailValue)}</Text>
            <View style={styles.heroMetrics}>
              <View style={styles.heroMetric}>
                <Text style={styles.heroMetricLabel}>Cost Value</Text>
                <Text style={styles.heroMetricValue}>
                  {formatCurrency(summary.totalCostValue)}
                </Text>
              </View>
              <View style={styles.heroDivider} />
              <View style={styles.heroMetric}>
                <Text style={styles.heroMetricLabel}>Margin</Text>
                <Text style={styles.heroMetricValue}>
                  {formatCurrency(summary.totalMargin)}
                </Text>
              </View>
            </View>
            <View style={styles.heroMetricsBottom}>
              <View style={styles.heroChip}>
                <Icon name="package-variant" size={14} color="#fff" />
                <Text style={styles.heroChipText}>{summary.totalProducts} products</Text>
              </View>
              <View style={styles.heroChip}>
                <Icon name="counter" size={14} color="#fff" />
                <Text style={styles.heroChipText}>{summary.totalItems} items in stock</Text>
              </View>
            </View>
          </View>
        )}

        {/* Group-by toggle */}
        <View style={styles.groupByWrap}>
          <SegmentedButtons
            value={groupBy}
            onValueChange={(v) => setGroupBy(v as GroupBy)}
            buttons={[
              { value: 'product', label: 'By Product' },
              { value: 'category', label: 'By Category' },
            ]}
          />
        </View>

        {/* Rows */}
        {groupBy === 'product' ? (
          <View style={styles.rowsWrap}>
            {items.length === 0 ? (
              <Empty icon="package-variant-closed-remove" title="No products in stock" />
            ) : (
              items.map((item: any) => (
                <View
                  key={item.id}
                  style={[styles.row, { backgroundColor: colors.surface.default }]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.rowTitle, { color: colors.text.primary }]} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={[styles.rowSub, { color: colors.text.secondary }]}>
                      {item.quantity} × {formatCurrency(Number(item.costPrice || 0))} cost
                    </Text>
                  </View>
                  <View style={styles.rowRight}>
                    <Text style={[styles.rowValue, { color: colors.text.primary }]}>{formatCurrency(Number(item.retailValue || 0))}</Text>
                    <Text style={[styles.rowMargin, { color: colors.success.main }]}>
                      +{formatCurrency(Number(item.margin || 0))}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>
        ) : (
          <View style={styles.rowsWrap}>
            {byCategory.length === 0 ? (
              <Empty icon="shape-outline" title="No categories" />
            ) : (
              byCategory.map((cat) => (
                <View
                  key={cat.name}
                  style={[styles.row, { backgroundColor: colors.surface.default }]}
                >
                  <View style={[styles.catIcon, { backgroundColor: colors.primary.light + '25' }]}>
                    <Icon name="shape" size={20} color={colors.primary.main} />
                  </View>
                  <View style={{ flex: 1, marginLeft: spacing[3] }}>
                    <Text style={[styles.rowTitle, { color: colors.text.primary }]} numberOfLines={1}>
                      {cat.name}
                    </Text>
                    <Text style={[styles.rowSub, { color: colors.text.secondary }]}>
                      {cat.productCount} products · {cat.itemCount} items
                    </Text>
                  </View>
                  <View style={styles.rowRight}>
                    <Text style={[styles.rowValue, { color: colors.text.primary }]}>{formatCurrency(cat.retailValue)}</Text>
                    <Text style={[styles.rowMargin, { color: colors.success.main }]}>+{formatCurrency(cat.margin)}</Text>
                  </View>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: spacing[4], paddingBottom: spacing[8] },

  heroCard: {
    borderRadius: borderRadius.xl,
    padding: spacing[5],
    marginBottom: spacing[4],
  },
  heroLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '500' },
  heroAmount: { color: '#fff', fontSize: 32, fontWeight: '800', marginTop: 4 },
  heroMetrics: { flexDirection: 'row', marginTop: spacing[4], alignItems: 'center' },
  heroMetric: { flex: 1 },
  heroMetricLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 11 },
  heroMetricValue: { color: '#fff', fontSize: 18, fontWeight: '700', marginTop: 2 },
  heroDivider: { width: 1, height: '100%', backgroundColor: 'rgba(255,255,255,0.2)', marginHorizontal: spacing[3] },
  heroMetricsBottom: { flexDirection: 'row', gap: spacing[2], marginTop: spacing[4] },
  heroChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: spacing[2],
    paddingVertical: 4,
    borderRadius: 999,
  },
  heroChipText: { color: '#fff', fontSize: 11, fontWeight: '600' },

  groupByWrap: { marginBottom: spacing[3] },

  rowsWrap: { gap: spacing[2] },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.md,
    padding: spacing[3],
    marginBottom: spacing[2],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  rowTitle: { fontSize: 14, fontWeight: '600' },
  rowSub: { fontSize: 12, marginTop: 2 },
  rowRight: { alignItems: 'flex-end' },
  rowValue: { fontSize: 14, fontWeight: '700' },
  rowMargin: { fontSize: 11, marginTop: 2 },
  catIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
