import React, { useCallback, useState } from 'react';
import { StyleSheet, View, Text, FlatList, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useQuery } from '@tanstack/react-query';
import { useFocusEffect } from '@react-navigation/native';
import { ScreenWrapper, Header } from '@/components/layout';
import { Empty } from '@/components/common';
import { useTheme } from '@/theme';
import { spacing, borderRadius } from '@/theme/spacing';
import { reportsApi } from '@/services/api';
import { formatDate } from '@/utils';
import { ReportDateRange, presetToRange, type RangePreset } from '../components/ReportDateRange';

export const GRNReportScreen: React.FC = () => {
  const { colors } = useTheme();
  const [range, setRange] = useState<RangePreset>('30d');
  const { data = [], isLoading, isError, error, isFetching, refetch } = useQuery({
    queryKey: ['report', 'grn', range],
    queryFn: () => reportsApi.getGrnReport(presetToRange(range)),
  });

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [])
  );

  const onRefresh = useCallback(async () => { await refetch(); }, [refetch]);
  const items = Array.isArray(data) ? data : (data as any)?.data ?? [];
  const totalUnits = items.reduce((s: number, r: any) => s + (Number(r.quantity) || 0), 0);

  return (
    <ScreenWrapper scrollable={false} padding={false}>
      <Header title="GRN Report" showBack />
      <ReportDateRange value={range} onChange={setRange} />

      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: colors.surface.default }]}>
          <Text style={[styles.statValue, { color: colors.text.primary }]}>{items.length}</Text>
          <Text style={[styles.statLabel, { color: colors.text.secondary }]}>Receipts</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.surface.default }]}>
          <Text style={[styles.statValue, { color: colors.text.primary }]}>{totalUnits}</Text>
          <Text style={[styles.statLabel, { color: colors.text.secondary }]}>Units Received</Text>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loadingCenter}><ActivityIndicator color={colors.primary.main} /></View>
      ) : isError ? (
        <Empty icon="cloud-alert" title="Couldn't load report" description={String((error as any)?.message || '')} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(it: any) => String(it.id)}
          contentContainerStyle={styles.list}
          refreshing={isFetching}
          onRefresh={onRefresh}
          renderItem={({ item }) => (
            <View style={[styles.row, { backgroundColor: colors.surface.default }]}>
              <View style={[styles.rowIcon, { backgroundColor: colors.success.light + '20' }]}>
                <Icon name="clipboard-check" size={20} color={colors.success.main} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: colors.text.primary }]} numberOfLines={1}>{item.product?.name || 'Unknown Product'}</Text>
                <Text style={[styles.rowSub, { color: colors.text.secondary }]}>SKU {item.product?.sku || '—'} • Ref {item.reference || '—'}</Text>
                <Text style={[styles.rowMeta, { color: colors.text.tertiary }]}>{formatDate(item.createdAt)}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[styles.qty, { color: colors.success.main }]}>+{item.quantity}</Text>
                <Text style={[styles.rowMeta, { color: colors.text.tertiary }]}>{item.prevQty} → {item.newQty}</Text>
              </View>
            </View>
          )}
          ListEmptyComponent={<Empty icon="clipboard-off" title="No GRN entries" description="No data for this range" />}
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
  rowIcon: {
    width: 36, height: 36, borderRadius: 18,
    justifyContent: 'center', alignItems: 'center', marginRight: spacing[3],
  },
  rowTitle: { fontSize: 14, fontWeight: '600' },
  rowSub: { fontSize: 12, marginTop: 2 },
  rowMeta: { fontSize: 11, marginTop: 2 },
  qty: { fontSize: 16, fontWeight: '700' },
});
