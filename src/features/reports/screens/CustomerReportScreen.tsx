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
import { formatCurrency, formatDate } from '@/utils';
import { ReportDateRange, presetToRange, type RangePreset } from '../components/ReportDateRange';

export const CustomerReportScreen: React.FC = () => {
  const { colors } = useTheme();
  const [range, setRange] = useState<RangePreset>('30d');
  const { data = [], isLoading, isError, error, isFetching, refetch } = useQuery({
    queryKey: ['report', 'customers', range],
    queryFn: () => reportsApi.getCustomerReport(presetToRange(range)),
  });

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [])
  );

  const onRefresh = useCallback(async () => { await refetch(); }, [refetch]);

  const totalCustomers = data.length;
  const totalRevenue = data.reduce((s, c) => s + c.totalSpent, 0);
  const totalOrders = data.reduce((s, c) => s + c.totalOrders, 0);

  return (
    <ScreenWrapper scrollable={false} padding={false}>
      <Header title="Customer Report" showBack />
      <ReportDateRange value={range} onChange={setRange} />

      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: colors.surface.default }]}>
          <Text style={[styles.statValue, { color: colors.text.primary }]}>{totalCustomers}</Text>
          <Text style={[styles.statLabel, { color: colors.text.secondary }]}>Customers</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.surface.default }]}>
          <Text style={[styles.statValue, { color: colors.text.primary }]}>{totalOrders}</Text>
          <Text style={[styles.statLabel, { color: colors.text.secondary }]}>Orders</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.surface.default }]}>
          <Text style={[styles.statValue, { color: colors.text.primary }]}>{formatCurrency(totalRevenue)}</Text>
          <Text style={[styles.statLabel, { color: colors.text.secondary }]}>Revenue</Text>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loadingCenter}><ActivityIndicator color={colors.primary.main} /></View>
      ) : isError ? (
        <Empty icon="cloud-alert" title="Couldn't load report" description={String((error as any)?.message || '')} />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(it) => String(it.id)}
          contentContainerStyle={styles.list}
          refreshing={isFetching}
          onRefresh={onRefresh}
          renderItem={({ item }) => (
            <View style={[styles.row, { backgroundColor: colors.surface.default }]}>
              <View style={[styles.rowIcon, { backgroundColor: colors.primary.light + '20' }]}>
                <Icon name="account" size={20} color={colors.primary.main} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: colors.text.primary }]} numberOfLines={1}>{item.name}</Text>
                <Text style={[styles.rowSub, { color: colors.text.secondary }]} numberOfLines={1}>{item.email || item.phone || '—'}</Text>
                <Text style={[styles.rowMeta, { color: colors.text.tertiary }]}>Joined {formatDate(item.joinedDate)}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[styles.amount, { color: colors.success.main }]}>{formatCurrency(item.totalSpent)}</Text>
                <Text style={[styles.rowMeta, { color: colors.text.tertiary }]}>{item.totalOrders} orders</Text>
              </View>
            </View>
          )}
          ListEmptyComponent={<Empty icon="account-off" title="No customers" description="No data for this range" />}
        />
      )}
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  loadingCenter: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  statsRow: { flexDirection: 'row', paddingHorizontal: spacing[4], marginBottom: spacing[2], gap: spacing[2] },
  statCard: { flex: 1, borderRadius: borderRadius.md, padding: spacing[3], alignItems: 'center' },
  statValue: { fontSize: 16, fontWeight: '700' },
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
  amount: { fontSize: 14, fontWeight: '700' },
});
