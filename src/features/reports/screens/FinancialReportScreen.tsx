import React, { useCallback, useState } from 'react';
import { StyleSheet, View, Text, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useQuery } from '@tanstack/react-query';
import { useFocusEffect } from '@react-navigation/native';
import { ScreenWrapper, Header } from '@/components/layout';
import { Empty } from '@/components/common';
import { useTheme } from '@/theme';
import { spacing, borderRadius } from '@/theme/spacing';
import { reportsApi } from '@/services/api';
import { formatCurrency } from '@/utils';
import { ReportDateRange, presetToRange, type RangePreset } from '../components/ReportDateRange';

export const FinancialReportScreen: React.FC = () => {
  const { colors } = useTheme();
  const [range, setRange] = useState<RangePreset>('30d');
  const { data, isLoading, isError, error, isFetching, refetch } = useQuery({
    queryKey: ['report', 'financial', range],
    queryFn: () => reportsApi.getFinancialReport(presetToRange(range)),
  });

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [])
  );

  const onRefresh = useCallback(async () => { await refetch(); }, [refetch]);
  const profit = data?.netProfitLoss || 0;
  const isProfit = profit >= 0;

  const Row: React.FC<{ label: string; value: number; bold?: boolean; color?: string }> = ({ label, value, bold, color }) => (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, { color: colors.text.secondary }, bold && { fontWeight: '700', color: colors.text.primary }]}>{label}</Text>
      <Text style={[styles.rowValue, { color: colors.text.primary }, bold && { fontWeight: '700' }, color ? { color } : null]}>{formatCurrency(value)}</Text>
    </View>
  );

  const Divider: React.FC = () => <View style={[styles.divider, { backgroundColor: colors.border.default }]} />;

  return (
    <ScreenWrapper scrollable={false} padding={false}>
      <Header title="Financial Report" showBack />
      <ReportDateRange value={range} onChange={setRange} />

      {isLoading ? (
        <View style={styles.loadingCenter}><ActivityIndicator color={colors.primary.main} /></View>
      ) : isError ? (
        <Empty icon="cloud-alert" title="Couldn't load report" description={String((error as any)?.message || '')} />
      ) : !data ? (
        <Empty icon="chart-box" title="No data" description="No financial data available" />
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={isFetching} onRefresh={onRefresh} />}
        >
          {/* Net P&L Hero */}
          <View style={[styles.heroCard, { backgroundColor: isProfit ? colors.success.light + '20' : colors.error.light + '20' }]}>
            <Icon name={isProfit ? 'trending-up' : 'trending-down'} size={32} color={isProfit ? colors.success.main : colors.error.main} />
            <Text style={[styles.heroLabel, { color: colors.text.secondary }]}>{isProfit ? 'Net Profit' : 'Net Loss'}</Text>
            <Text style={[styles.heroValue, { color: isProfit ? colors.success.main : colors.error.main }]}>
              {formatCurrency(Math.abs(profit))}
            </Text>
            <Text style={[styles.heroSub, { color: colors.text.tertiary }]}>Margin: {Number(data?.profitMargin ?? 0).toFixed(1)}%</Text>
          </View>

          {/* Income */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Income</Text>
            <View style={[styles.card, { backgroundColor: colors.surface.default }]}>
              <Row label="Online Sales" value={data?.income?.onlineSales ?? 0} />
              <Row label="POS Sales" value={data?.income?.posSales ?? 0} />
              <Divider />
              <Row label="Total Income" value={data?.income?.total ?? 0} bold color={colors.success.main} />
            </View>
          </View>

          {/* Expenses */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Expenses</Text>
            <View style={[styles.card, { backgroundColor: colors.surface.default }]}>
              <Row label="Purchases" value={data?.expenses?.purchases ?? 0} />
              <Row label="Stock Loss" value={data?.expenses?.stockLoss ?? 0} />
              <Divider />
              <Row label="Total Expenses" value={data?.expenses?.total ?? 0} bold color={colors.error.main} />
            </View>
          </View>
        </ScrollView>
      )}
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  loadingCenter: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: spacing[4], paddingBottom: spacing[8] },
  heroCard: {
    borderRadius: borderRadius.lg, padding: spacing[5],
    alignItems: 'center', marginBottom: spacing[4],
  },
  heroLabel: { fontSize: 13, marginTop: spacing[2] },
  heroValue: { fontSize: 28, fontWeight: '800', marginTop: spacing[1] },
  heroSub: { fontSize: 12, marginTop: spacing[1] },
  section: { marginBottom: spacing[4] },
  sectionTitle: { fontSize: 14, fontWeight: '700', marginBottom: spacing[2] },
  card: { borderRadius: borderRadius.md, padding: spacing[3] },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing[2] },
  rowLabel: { fontSize: 13 },
  rowValue: { fontSize: 13, fontWeight: '600' },
  divider: { height: 1, marginVertical: spacing[1] },
});
