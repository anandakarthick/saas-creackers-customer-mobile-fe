import React from 'react';
import { StyleSheet, View, Text, ScrollView } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { ScreenWrapper, Header } from '@/components/layout';
import { Badge } from '@/components/common';
import { useTheme } from '@/theme';
import { spacing, borderRadius } from '@/theme/spacing';
import { formatDateTime } from '@/utils';
import { inventoryApi } from '@/services/api';
import type { StockAdjustmentsStackParamList } from '@/types/navigation';

type NavigationProp = NativeStackNavigationProp<StockAdjustmentsStackParamList, 'StockAdjustmentDetail'>;
type RouteType = RouteProp<StockAdjustmentsStackParamList, 'StockAdjustmentDetail'>;

function normalizeLog(log: any) {
  return {
    id: String(log.id),
    type: String(log.type || 'ADJUSTMENT').toUpperCase(),
    reference: log.reference || '—',
    productName: log.product?.name || 'Product',
    productSku: log.product?.sku || '',
    delta: Number(log.quantity || 0),
    prevQty: Number(log.prevQty || 0),
    newQty: Number(log.newQty || 0),
    notes: log.notes || '',
    createdAt: log.createdAt,
    branchName: log.branch?.name || '',
    userName: log.user?.name || log.createdBy?.name || '',
  };
}

export const StockAdjustmentDetailScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteType>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const logId = route.params.id;

  const { data, isLoading, isError } = useQuery({
    queryKey: ['adjustmentLogs'],
    queryFn: () => inventoryApi.getStockAdjustments({ page: 1, limit: 500 }),
  });

  const allLogs = ((data?.data || []) as any[]).map(normalizeLog);
  const log = allLogs.find((l) => l.id === String(logId));

  if (isLoading) {
    return (
      <ScreenWrapper>
        <Header title="Adjustment Details" showBack />
        <View style={styles.center}>
          <Text style={[styles.loadingText, { color: colors.text.secondary }]}>Loading...</Text>
        </View>
      </ScreenWrapper>
    );
  }

  if (isError || !log) {
    return (
      <ScreenWrapper>
        <Header title="Adjustment Details" showBack />
        <View style={styles.center}>
          <Icon name="alert-circle-outline" size={64} color={colors.neutral[300]} />
          <Text style={[styles.notFoundText, { color: colors.text.secondary }]}>
            Record not found
          </Text>
        </View>
      </ScreenWrapper>
    );
  }

  const isPositive = log.delta >= 0;

  return (
    <ScreenWrapper scrollable={false} padding={false}>
      <Header title="Adjustment Details" showBack />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: spacing[8] + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Card */}
        <View style={[styles.headerCard, { backgroundColor: colors.surface.default }]}>
          <View style={[styles.iconWrap, { backgroundColor: colors.warning.light + '20' }]}>
            <Icon name="swap-horizontal" size={32} color={colors.warning.main} />
          </View>
          <Text style={[styles.productName, { color: colors.text.primary }]}>
            {log.productName}
          </Text>
          {!!log.productSku && (
            <Text style={[styles.sku, { color: colors.text.tertiary }]}>{log.productSku}</Text>
          )}
          <View style={styles.badgeRow}>
            <Badge variant={isPositive ? 'success' : 'error'} size="medium">
              {isPositive ? '+' : ''}{log.delta}
            </Badge>
          </View>
          <View style={styles.dateRow}>
            <Icon name="calendar" size={16} color={colors.text.tertiary} />
            <Text style={[styles.dateText, { color: colors.text.secondary }]}>
              {formatDateTime(log.createdAt)}
            </Text>
          </View>
        </View>

        {/* Stock Change */}
        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, { backgroundColor: colors.surface.default }]}>
            <Icon name="arrow-down" size={20} color={colors.text.secondary} />
            <Text style={[styles.summaryLabel, { color: colors.text.secondary }]}>Previous</Text>
            <Text style={[styles.summaryValue, { color: colors.text.primary }]}>{log.prevQty}</Text>
          </View>
          <View style={[styles.arrowWrap]}>
            <Icon name="arrow-right" size={24} color={colors.neutral[400]} />
          </View>
          <View style={[styles.summaryCard, { backgroundColor: colors.surface.default }]}>
            <Icon name="arrow-up" size={20} color={isPositive ? colors.success.main : colors.error.main} />
            <Text style={[styles.summaryLabel, { color: colors.text.secondary }]}>New</Text>
            <Text style={[styles.summaryValue, { color: isPositive ? colors.success.main : colors.error.main }]}>
              {log.newQty}
            </Text>
          </View>
        </View>

        {/* Details */}
        <View style={[styles.section, { backgroundColor: colors.surface.default }]}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Details</Text>

          <View style={styles.detailRow}>
            <Icon name="tag" size={18} color={colors.neutral[400]} />
            <Text style={[styles.detailLabel, { color: colors.text.secondary }]}>Type</Text>
            <Text style={[styles.detailValue, { color: colors.text.primary }]}>{log.type}</Text>
          </View>

          <View style={[styles.detailRow, { borderTopColor: colors.border.default, borderTopWidth: 1 }]}>
            <Icon name="file-document-outline" size={18} color={colors.neutral[400]} />
            <Text style={[styles.detailLabel, { color: colors.text.secondary }]}>Reference</Text>
            <Text style={[styles.detailValue, { color: colors.primary.main }]}>{log.reference}</Text>
          </View>

          <View style={[styles.detailRow, { borderTopColor: colors.border.default, borderTopWidth: 1 }]}>
            <Icon name="swap-horizontal" size={18} color={colors.neutral[400]} />
            <Text style={[styles.detailLabel, { color: colors.text.secondary }]}>Change</Text>
            <Text style={[styles.detailValue, { color: isPositive ? colors.success.main : colors.error.main }]}>
              {isPositive ? '+' : ''}{log.delta}
            </Text>
          </View>

          {!!log.branchName && (
            <View style={[styles.detailRow, { borderTopColor: colors.border.default, borderTopWidth: 1 }]}>
              <Icon name="store" size={18} color={colors.neutral[400]} />
              <Text style={[styles.detailLabel, { color: colors.text.secondary }]}>Branch</Text>
              <Text style={[styles.detailValue, { color: colors.text.primary }]}>{log.branchName}</Text>
            </View>
          )}

          {!!log.userName && (
            <View style={[styles.detailRow, { borderTopColor: colors.border.default, borderTopWidth: 1 }]}>
              <Icon name="account" size={18} color={colors.neutral[400]} />
              <Text style={[styles.detailLabel, { color: colors.text.secondary }]}>Adjusted By</Text>
              <Text style={[styles.detailValue, { color: colors.text.primary }]}>{log.userName}</Text>
            </View>
          )}
        </View>

        {/* Notes */}
        {!!log.notes && (
          <View style={[styles.section, { backgroundColor: colors.surface.default }]}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Notes</Text>
            <Text style={[styles.notesText, { color: colors.text.secondary }]}>{log.notes}</Text>
          </View>
        )}
      </ScrollView>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: spacing[4] },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { fontSize: 14, marginTop: spacing[2] },
  notFoundText: { fontSize: 16, marginTop: spacing[4] },
  headerCard: {
    alignItems: 'center',
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    marginBottom: spacing[4],
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  productName: { fontSize: 20, fontWeight: '700', textAlign: 'center' },
  sku: { fontSize: 12, marginTop: spacing[1] },
  badgeRow: { marginTop: spacing[2] },
  dateRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing[2] },
  dateText: { fontSize: 13, marginLeft: spacing[2] },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[4],
  },
  summaryCard: {
    flex: 1,
    alignItems: 'center',
    borderRadius: borderRadius.lg,
    padding: spacing[4],
  },
  arrowWrap: { paddingTop: spacing[4] },
  summaryLabel: { fontSize: 12, marginTop: spacing[1] },
  summaryValue: { fontSize: 24, fontWeight: '700', marginTop: spacing[1] },
  section: {
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    marginBottom: spacing[4],
  },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: spacing[3] },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[3],
    gap: spacing[3],
  },
  detailLabel: { flex: 1, fontSize: 13 },
  detailValue: { fontSize: 14, fontWeight: '600' },
  notesText: { fontSize: 14, lineHeight: 22 },
});
