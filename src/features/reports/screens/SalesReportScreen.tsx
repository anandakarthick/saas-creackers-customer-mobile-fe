import React, { useCallback, useState } from 'react';
import { StyleSheet, View, Text, FlatList, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useFocusEffect } from '@react-navigation/native';
import { ScreenWrapper, Header } from '@/components/layout';
import { Badge, Empty } from '@/components/common';
import { useTheme } from '@/theme';
import { spacing, borderRadius } from '@/theme/spacing';
import { reportsApi } from '@/services/api';
import { formatCurrency, formatDate } from '@/utils';
import { ReportDateRange, presetToRange, type RangePreset } from '../components/ReportDateRange';

export const SalesReportScreen: React.FC = () => {
  const { colors } = useTheme();
  const [range, setRange] = useState<RangePreset>('30d');
  const { data, isLoading, isError, error, isFetching, refetch } = useQuery({
    queryKey: ['report', 'sales', range],
    queryFn: () => reportsApi.getSalesReport(presetToRange(range)),
  });

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [])
  );

  const onRefresh = useCallback(async () => { await refetch(); }, [refetch]);
  const orders = data?.orders || [];
  const summary = data?.summary;

  return (
    <ScreenWrapper scrollable={false} padding={false}>
      <Header title="Sales Report" showBack />
      <ReportDateRange value={range} onChange={setRange} />

      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: colors.surface.default }]}>
          <Text style={[styles.statValue, { color: colors.text.primary }]}>{summary?.totalOrders ?? 0}</Text>
          <Text style={[styles.statLabel, { color: colors.text.secondary }]}>Orders</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.surface.default }]}>
          <Text style={[styles.statValue, { color: colors.text.primary }]}>{formatCurrency(summary?.totalRevenue ?? 0)}</Text>
          <Text style={[styles.statLabel, { color: colors.text.secondary }]}>Revenue</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.surface.default }]}>
          <Text style={[styles.statValue, { color: colors.text.primary }]}>{formatCurrency(summary?.avgOrderValue ?? 0)}</Text>
          <Text style={[styles.statLabel, { color: colors.text.secondary }]}>Avg Order</Text>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loadingCenter}><ActivityIndicator color={colors.primary.main} /></View>
      ) : isError ? (
        <Empty icon="cloud-alert" title="Couldn't load report" description={String((error as any)?.message || '')} />
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(it) => String(it.id)}
          contentContainerStyle={styles.list}
          refreshing={isFetching}
          onRefresh={onRefresh}
          renderItem={({ item }) => (
            <View style={[styles.row, { backgroundColor: colors.surface.default }]}>
              <View style={{ flex: 1 }}>
                <View style={styles.rowHeader}>
                  <Text style={[styles.rowTitle, { color: colors.text.primary }]}>{item.orderNumber}</Text>
                  <Badge variant={item.status === 'COMPLETED' || item.status === 'DELIVERED' ? 'success' : item.status === 'CANCELLED' ? 'error' : 'info'} size="small">
                    {item.status}
                  </Badge>
                </View>
                <Text style={[styles.rowSub, { color: colors.text.secondary }]}>{item.customer} • {item.items} items</Text>
                <Text style={[styles.rowMeta, { color: colors.text.tertiary }]}>{formatDate(item.date)} • {item.paymentMethod}</Text>
              </View>
              <Text style={[styles.amount, { color: colors.success.main }]}>{formatCurrency(item.total)}</Text>
            </View>
          )}
          ListEmptyComponent={<Empty icon="cart-off" title="No sales" description="No data for this range" />}
        />
      )}
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  loadingCenter: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  statsRow: { flexDirection: 'row', paddingHorizontal: spacing[4], marginBottom: spacing[2], gap: spacing[2] },
  statCard: { flex: 1, borderRadius: borderRadius.md, padding: spacing[3], alignItems: 'center' },
  statValue: { fontSize: 14, fontWeight: '700' },
  statLabel: { fontSize: 11, marginTop: 2 },
  list: { padding: spacing[4], paddingBottom: spacing[8] },
  row: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: borderRadius.md,
    padding: spacing[3], marginBottom: spacing[2],
  },
  rowHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing[2] },
  rowTitle: { fontSize: 14, fontWeight: '600' },
  rowSub: { fontSize: 12, marginTop: 2 },
  rowMeta: { fontSize: 11, marginTop: 2 },
  amount: { fontSize: 14, fontWeight: '700', marginLeft: spacing[2] },
});
