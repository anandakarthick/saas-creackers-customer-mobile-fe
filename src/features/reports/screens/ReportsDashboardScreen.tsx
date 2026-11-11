import React, { useCallback } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useQuery } from '@tanstack/react-query';
import { ScreenWrapper, Header } from '@/components/layout';
import { StatCard } from '@/components/common';
import { useTheme } from '@/theme';
import { spacing, borderRadius } from '@/theme/spacing';
import { reportsApi } from '@/services/api';
import { presetToRange } from '../components/ReportDateRange';
import type { ReportsStackParamList } from '@/types/navigation';

type ReportKey = keyof ReportsStackParamList;

export const ReportsDashboardScreen: React.FC = () => {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();

  const reportTypes: Array<{
    id: Exclude<ReportKey, 'ReportsDashboard'>;
    title: string;
    description: string;
    icon: string;
    color: string;
  }> = [
    { id: 'SalesReport', title: 'Sales Report', description: 'Orders, revenue & trends', icon: 'chart-line', color: colors.success.main },
    { id: 'ProductReport', title: 'Product Performance', description: 'Top-selling products', icon: 'trending-up', color: colors.info.main },
    { id: 'InventoryReport', title: 'Inventory Report', description: 'Stock levels & valuation', icon: 'package-variant-closed', color: colors.primary.main },
    { id: 'CustomerReport', title: 'Customer Report', description: 'Customer analytics', icon: 'account-group', color: colors.secondary.main },
    { id: 'PurchaseOrderReport', title: 'Purchase Orders', description: 'Supplier purchases', icon: 'truck', color: colors.accent.main },
    { id: 'GRNReport', title: 'GRN Report', description: 'Goods received history', icon: 'clipboard-check', color: colors.success.main },
    { id: 'AdjustmentsReport', title: 'Stock Adjustments', description: 'Manual stock changes', icon: 'swap-horizontal', color: colors.warning.main },
    { id: 'FinancialReport', title: 'Financial Report', description: 'Profit, loss & margins', icon: 'currency-inr', color: colors.error.main },
  ];

  // Today's snapshot from the sales report
  const salesTodayQuery = useQuery({
    queryKey: ['report', 'sales', 'today'],
    queryFn: () => reportsApi.getSalesReport(presetToRange('today')),
    staleTime: 60_000,
  });
  const salesToday = salesTodayQuery.data;

  useFocusEffect(
    useCallback(() => {
      salesTodayQuery.refetch();
    }, [])
  );

  const revenue = salesToday?.summary?.totalRevenue || 0;
  const orders = salesToday?.summary?.totalOrders || 0;

  return (
    <ScreenWrapper scrollable padding={false}>
      <Header title="Reports" subtitle="Business Analytics" showDrawer />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.statsSection}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Today's Overview</Text>
          <View style={styles.statsRow}>
            <StatCard title="Revenue" value={revenue} type="currency" icon="cash" iconColor={colors.success.main} />
            <View style={styles.statSpacer} />
            <StatCard title="Orders" value={orders} type="number" icon="clipboard-list" iconColor={colors.info.main} />
          </View>
        </View>

        <View style={styles.reportsSection}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Reports</Text>
          <View style={styles.reportsGrid}>
            {reportTypes.map((report) => (
              <TouchableOpacity
                key={report.id}
                style={styles.reportCard}
                onPress={() => navigation.navigate(report.id as string)}
                activeOpacity={0.7}
              >
                <View style={[styles.reportIcon, { backgroundColor: report.color + '20' }]}>
                  <Icon name={report.icon} size={26} color={report.color} />
                </View>
                <Text style={[styles.reportTitle, { color: colors.text.primary }]}>{report.title}</Text>
                <Text style={[styles.reportDescription, { color: colors.text.secondary }]}>{report.description}</Text>
                <Icon name="chevron-right" size={18} color={colors.neutral[400]} style={styles.chevron} />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  content: { padding: spacing[4], paddingBottom: spacing[8] },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: spacing[3] },
  statsSection: { marginBottom: spacing[6] },
  statsRow: { flexDirection: 'row' },
  statSpacer: { width: spacing[3] },
  reportsSection: { marginBottom: spacing[6] },
  reportsGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -spacing[2] },
  reportCard: {
    width: '50%',
    padding: spacing[2],
  },
  reportIcon: {
    width: 52, height: 52, borderRadius: borderRadius.lg,
    justifyContent: 'center', alignItems: 'center', marginBottom: spacing[3],
  },
  reportTitle: { fontSize: 14, fontWeight: '600', marginBottom: spacing[1] },
  reportDescription: { fontSize: 11, lineHeight: 15 },
  chevron: { position: 'absolute', top: spacing[2], right: spacing[2] },
});
