import React, { useCallback } from 'react';
import { StyleSheet, View, Text, FlatList, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useFocusEffect } from '@react-navigation/native';
import { ScreenWrapper, Header } from '@/components/layout';
import { Badge, Empty } from '@/components/common';
import { useTheme } from '@/theme';
import { spacing, borderRadius } from '@/theme/spacing';
import { reportsApi } from '@/services/api';
import { formatCurrency } from '@/utils';
import { getStockStatus } from '@/utils/helpers';

export const InventoryReportScreen: React.FC = () => {
  const { colors } = useTheme();
  const { data, isLoading, isError, error, isFetching, refetch } = useQuery({
    queryKey: ['report', 'inventory'],
    queryFn: () => reportsApi.getInventoryReport(),
  });

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [])
  );

  const onRefresh = useCallback(async () => { await refetch(); }, [refetch]);
  const products = data?.products || [];
  const s = data?.summary;

  return (
    <ScreenWrapper scrollable={false} padding={false}>
      <Header title="Inventory Report" showBack />

      <View style={[styles.summaryCard, { backgroundColor: colors.surface.default }]}>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: colors.text.primary }]}>{s?.totalProducts ?? 0}</Text>
            <Text style={[styles.summaryLabel, { color: colors.text.secondary }]}>Products</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: colors.text.primary }]}>{s?.totalStock ?? 0}</Text>
            <Text style={[styles.summaryLabel, { color: colors.text.secondary }]}>Units</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: colors.warning.main }]}>{s?.lowStock ?? 0}</Text>
            <Text style={[styles.summaryLabel, { color: colors.text.secondary }]}>Low</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: colors.error.main }]}>{s?.outOfStock ?? 0}</Text>
            <Text style={[styles.summaryLabel, { color: colors.text.secondary }]}>Out</Text>
          </View>
        </View>
        <View style={[styles.valueRow, { borderTopColor: colors.border.default }]}>
          <Text style={[styles.valueLabel, { color: colors.text.secondary }]}>Stock Value</Text>
          <Text style={[styles.valueAmount, { color: colors.success.main }]}>{formatCurrency(s?.totalValue || 0)}</Text>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loadingCenter}><ActivityIndicator color={colors.primary.main} /></View>
      ) : isError ? (
        <Empty icon="cloud-alert" title="Couldn't load report" description={String((error as any)?.message || '')} />
      ) : (
        <FlatList
          data={products}
          keyExtractor={(it) => String(it.id)}
          contentContainerStyle={styles.list}
          refreshing={isFetching}
          onRefresh={onRefresh}
          renderItem={({ item }) => {
            const status = getStockStatus(item.stock, item.lowStockAlert);
            return (
              <View style={[styles.row, { backgroundColor: colors.surface.default }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.rowTitle, { color: colors.text.primary }]} numberOfLines={1}>{item.name}</Text>
                  <Text style={[styles.rowSub, { color: colors.text.secondary }]}>{item.category} • SKU {item.sku || '—'}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Badge variant={status === 'out_of_stock' ? 'error' : status === 'low_stock' ? 'warning' : 'success'} size="small">
                    {item.stock}
                  </Badge>
                  <Text style={[styles.rowMeta, { color: colors.text.tertiary }]}>{formatCurrency(item.stockValue)}</Text>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={<Empty icon="package-variant" title="No products" description="Inventory is empty" />}
        />
      )}
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  loadingCenter: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  summaryCard: {
    marginHorizontal: spacing[4], marginBottom: spacing[3],
    borderRadius: borderRadius.md,
    padding: spacing[3],
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryItem: { alignItems: 'center', flex: 1 },
  summaryValue: { fontSize: 16, fontWeight: '700' },
  summaryLabel: { fontSize: 11, marginTop: 2 },
  valueRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: spacing[3], paddingTop: spacing[3],
    borderTopWidth: 1,
  },
  valueLabel: { fontSize: 13 },
  valueAmount: { fontSize: 16, fontWeight: '700' },
  list: { padding: spacing[4], paddingBottom: spacing[8] },
  row: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: borderRadius.md,
    padding: spacing[3], marginBottom: spacing[2],
  },
  rowTitle: { fontSize: 14, fontWeight: '600' },
  rowSub: { fontSize: 12, marginTop: 2 },
  rowMeta: { fontSize: 11, marginTop: 4 },
});
