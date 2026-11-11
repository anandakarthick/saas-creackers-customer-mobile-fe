import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Searchbar } from 'react-native-paper';
import { useQuery } from '@tanstack/react-query';
import { ScreenWrapper, Header } from '@/components/layout';
import { Empty, SafeAreaFAB } from '@/components/common';
import { useTheme } from '@/theme';
import { returnsApi } from '@/services/api';
import { methodLabel, SETTLEMENT_METHODS } from '@/services/api/returns.api';
import { formatCurrency, formatDate } from '@/utils';
import type { PurchaseReturnsStackParamList } from '@/types/navigation';
import { styles, StatRow, ChipRow, StatusBadge } from '../../shared';

type Nav = NativeStackNavigationProp<PurchaseReturnsStackParamList, 'PurchaseReturnsList'>;
const STATUS = [{ label: 'All', value: 'all' }, { label: 'Completed', value: 'COMPLETED' }, { label: 'Cancelled', value: 'CANCELLED' }];

export const PurchaseReturnsListScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const { colors } = useTheme();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const stats = useQuery({ queryKey: ['purchaseReturnStats'], queryFn: returnsApi.getPurchaseReturnStats });
  const { data, isLoading, isError, error, isFetching, refetch } = useQuery({
    queryKey: ['purchaseReturns', search, status],
    queryFn: () => returnsApi.getPurchaseReturns({ page: 1, limit: 100, search: search || undefined, status: status !== 'all' ? status : undefined }),
  });
  useFocusEffect(useCallback(() => { refetch(); }, []));
  const rows: any[] = data?.data || [];
  const s: any = stats.data || {};

  return (
    <ScreenWrapper scrollable={false} padding={false}>
      <Header title="Purchase Returns" subtitle={`${rows.length} records`} showDrawer />
      <View style={styles.searchContainer}>
        <Searchbar placeholder="Return #, PO #, supplier…" value={search} onChangeText={setSearch} style={[styles.searchBar, { backgroundColor: colors.surface.default }]} inputStyle={{ fontSize: 14 }} />
        <ChipRow options={STATUS} value={status} onChange={setStatus} />
      </View>
      {isLoading ? <View style={styles.center}><ActivityIndicator size="large" color={colors.primary.main} /></View>
        : isError ? <Empty icon="cloud-alert" title="Couldn't load returns" description={String((error as any)?.message || '')} />
        : (
          <FlatList data={rows} keyExtractor={(r) => String(r.id)} contentContainerStyle={styles.listContent} refreshing={isFetching} onRefresh={refetch}
            ListHeaderComponent={<StatRow stats={[
              { label: 'Returned', value: formatCurrency(s.totalAmount ?? 0), icon: 'package-variant-closed-minus', color: colors.primary.main },
              { label: 'This month', value: formatCurrency(s.thisMonthAmount ?? 0), icon: 'calendar-month', color: '#10B981' },
              { label: 'Debit notes', value: formatCurrency(s.debitNoteAmount ?? 0), icon: 'file-document-plus', color: '#F59E0B' },
              { label: 'Cancelled', value: s.cancelledCount ?? 0, icon: 'cancel', color: '#EF4444' },
            ]} />}
            ListEmptyComponent={<Empty icon="package-variant-closed-minus" title="No purchase returns" description="Goods sent back to suppliers show up here" />}
            renderItem={({ item }) => (
              <TouchableOpacity style={[styles.card, { backgroundColor: colors.surface.default }]} onPress={() => navigation.navigate('PurchaseReturnDetail', { id: String(item.id) })} activeOpacity={0.7}>
                <View style={[styles.iconWrap, { backgroundColor: '#F59E0B20' }]}><Icon name="package-variant-closed-minus" size={22} color="#F59E0B" /></View>
                <View style={styles.info}>
                  <View style={styles.headerRow}><Text style={[styles.name, { color: colors.text.primary }]} numberOfLines={1}>{item.returnNumber}</Text><StatusBadge status={item.status} kind="return" /></View>
                  <View style={styles.metaRow}><Icon name="truck" size={14} color={colors.text.tertiary} /><Text style={[styles.metaText, { color: colors.text.secondary }]} numberOfLines={1}>{item.supplier?.name} · {item.purchaseOrder?.orderNumber || 'manual'}</Text></View>
                  <View style={styles.metaRow}>
                    <Icon name="calendar" size={14} color={colors.text.tertiary} />
                    <Text style={[styles.metaText, { color: colors.text.secondary }]}>{formatDate(item.returnDate)} · {methodLabel(item.settlementMethod, SETTLEMENT_METHODS)}</Text>
                    <Text style={[styles.amount, { color: colors.primary.main }]}>{formatCurrency(Number(item.total))}</Text>
                  </View>
                </View>
                <Icon name="chevron-right" size={24} color={colors.neutral[400]} />
              </TouchableOpacity>
            )} />
        )}
      <SafeAreaFAB icon="plus" onPress={() => navigation.navigate('PurchaseReturnForm', {})} />
    </ScreenWrapper>
  );
};
