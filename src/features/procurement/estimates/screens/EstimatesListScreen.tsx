import React, { useCallback, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Searchbar, Chip } from 'react-native-paper';
import { useQuery } from '@tanstack/react-query';

import { ScreenWrapper, Header } from '@/components/layout';
import { Badge, Empty, SafeAreaFAB } from '@/components/common';
import { useTheme } from '@/theme';
import { spacing, borderRadius } from '@/theme/spacing';
import { estimatesApi } from '@/services/api';
import { formatCurrency, formatDate } from '@/utils';
import type { EstimatesStackParamList } from '@/types/navigation';

type NavigationProp = NativeStackNavigationProp<EstimatesStackParamList, 'EstimatesList'>;

const STATUS_FILTERS: { label: string; value: string }[] = [
  { label: 'All', value: 'ALL' },
  { label: 'Draft', value: 'draft' },
  { label: 'Sent', value: 'sent' },
  { label: 'Accepted', value: 'accepted' },
  { label: 'Declined', value: 'declined' },
];

const STATUS_VARIANTS: Record<string, 'success' | 'warning' | 'error' | 'info'> = {
  draft: 'warning',
  sent: 'info',
  accepted: 'success',
  declined: 'error',
  expired: 'error',
};

interface EstimateRow {
  id: string;
  estimateNumber: string;
  customerName: string;
  total: number;
  status: string;
  estimateDate?: string;
  validUntil?: string;
  itemsCount: number;
  createdAt: string;
}

function normalizeEstimate(e: any): EstimateRow {
  return {
    id: String(e.id),
    estimateNumber: e.estimateNumber || '',
    customerName: e.customerName || 'Customer',
    total: Number(e.total || 0),
    status: (e.status || 'draft').toLowerCase(),
    estimateDate: e.estimateDate,
    validUntil: e.validUntil,
    itemsCount: e._count?.items ?? (Array.isArray(e.items) ? e.items.length : 0),
    createdAt: e.createdAt,
  };
}

export const EstimatesListScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { colors } = useTheme();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('ALL');

  const { data, isLoading, isError, error, isFetching, refetch } = useQuery({
    queryKey: ['estimates', search, status],
    queryFn: () =>
      estimatesApi.getEstimates({
        page: 1,
        limit: 100,
        search: search || undefined,
        status: status !== 'ALL' ? status : undefined,
      }),
  });

  const estimates: EstimateRow[] = (data?.data || []).map(normalizeEstimate);

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [])
  );

  const onRefresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const renderEstimate = ({ item }: { item: EstimateRow }) => (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.surface.default }]}
      onPress={() => navigation.navigate('EstimateDetail', { id: item.id })}
      activeOpacity={0.7}
    >
      <View style={[styles.iconWrap, { backgroundColor: colors.primary.light + '20' }]}>
        <Icon name="file-document-outline" size={22} color={colors.primary.main} />
      </View>
      <View style={styles.info}>
        <View style={styles.rowBetween}>
          <Text style={[styles.title, { color: colors.text.primary }]} numberOfLines={1}>
            {item.estimateNumber}
          </Text>
          <Badge variant={STATUS_VARIANTS[item.status] || 'info'} size="small">
            {item.status.toUpperCase()}
          </Badge>
        </View>
        <Text style={[styles.subtle, { color: colors.text.secondary }]} numberOfLines={1}>
          {item.customerName} · {item.itemsCount} item{item.itemsCount === 1 ? '' : 's'}
        </Text>
        <View style={styles.rowBetween}>
          <Text style={[styles.subtle, { color: colors.text.tertiary }]}>
            {item.estimateDate ? formatDate(item.estimateDate) : formatDate(item.createdAt)}
            {item.validUntil ? `  ·  Valid till ${formatDate(item.validUntil)}` : ''}
          </Text>
          <Text style={[styles.amount, { color: colors.primary.main }]}>
            {formatCurrency(item.total)}
          </Text>
        </View>
      </View>
      <Icon name="chevron-right" size={22} color={colors.neutral[400]} />
    </TouchableOpacity>
  );

  return (
    <ScreenWrapper scrollable={false} padding={false}>
      <Header
        title="Estimates"
        subtitle={`${estimates.length} quote${estimates.length === 1 ? '' : 's'}`}
        showDrawer
      />

      <View style={styles.searchRow}>
        <Searchbar
          placeholder="Search estimate # or customer..."
          value={search}
          onChangeText={setSearch}
          style={[styles.searchBar, { backgroundColor: colors.surface.default }]}
          inputStyle={{ fontSize: 14 }}
        />
      </View>

      <View style={styles.filterRow}>
        <FlatList
          horizontal
          data={STATUS_FILTERS}
          keyExtractor={(i) => i.value}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: spacing[4] }}
          renderItem={({ item }) => (
            <Chip
              selected={status === item.value}
              onPress={() => setStatus(item.value)}
              style={{ marginRight: spacing[2] }}
            >
              {item.label}
            </Chip>
          )}
        />
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary.main} />
        </View>
      ) : isError ? (
        <Empty
          icon="cloud-alert"
          title="Couldn't load estimates"
          description={String(error?.message || 'Network error')}
        />
      ) : (
        <FlatList
          data={estimates}
          renderItem={renderEstimate}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshing={isFetching}
          onRefresh={onRefresh}
          ListEmptyComponent={
            <Empty
              icon="file-document-outline"
              title="No estimates yet"
              description="Tap + to create your first customer quote"
            />
          }
        />
      )}

      <SafeAreaFAB icon="plus" onPress={() => navigation.navigate('EstimateForm', {})} />
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  searchRow: { paddingHorizontal: spacing[4], paddingVertical: spacing[2] },
  searchBar: { borderRadius: borderRadius.lg, elevation: 0 },
  filterRow: { paddingVertical: spacing[1] },
  listContent: { padding: spacing[4], paddingBottom: spacing[20] },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.lg,
    padding: spacing[3],
    marginBottom: spacing[3],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing[3],
  },
  info: { flex: 1 },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  title: { fontSize: 14, fontWeight: '700', flex: 1, marginRight: spacing[2] },
  subtle: { fontSize: 12 },
  amount: { fontSize: 14, fontWeight: '700' },
});
