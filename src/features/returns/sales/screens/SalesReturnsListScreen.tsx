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
import { customerLabel, methodLabel, REFUND_METHODS } from '@/services/api/returns.api';
import { formatCurrency, formatDate } from '@/utils';
import type { SalesReturnsStackParamList } from '@/types/navigation';
import { styles, StatRow, ChipRow, StatusBadge } from '../../shared';

type Nav = NativeStackNavigationProp<SalesReturnsStackParamList, 'SalesReturnsList'>;

const STATUS = [{ label: 'All', value: 'all' }, { label: 'Completed', value: 'COMPLETED' }, { label: 'Cancelled', value: 'CANCELLED' }];
const CHANNEL = [{ label: 'POS + Online', value: 'all' }, { label: 'POS bills', value: 'POS' }, { label: 'Online orders', value: 'ONLINE' }, { label: 'No bill', value: 'MANUAL' }];
const channelLabel = (c?: string) => (c === 'POS' ? 'POS' : c === 'ONLINE' ? 'Online' : 'No bill');

export const SalesReturnsListScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const { colors } = useTheme();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [channel, setChannel] = useState('all');

  const stats = useQuery({ queryKey: ['salesReturnStats'], queryFn: returnsApi.getSalesReturnStats });
  const { data, isLoading, isError, error, isFetching, refetch } = useQuery({
    queryKey: ['salesReturns', search, status, channel],
    queryFn: () => returnsApi.getSalesReturns({ page: 1, limit: 100, search: search || undefined, status: status !== 'all' ? status : undefined, channel: channel !== 'all' ? channel : undefined }),
  });
  useFocusEffect(useCallback(() => { refetch(); }, []));

  const rows: any[] = data?.data || [];
  const s: any = stats.data || {};

  return (
    <ScreenWrapper scrollable={false} padding={false}>
      <Header title="Sales Returns" subtitle={`${rows.length} records`} showDrawer />
      <View style={styles.searchContainer}>
        <Searchbar placeholder="Return #, bill #, customer…" value={search} onChangeText={setSearch} style={[styles.searchBar, { backgroundColor: colors.surface.default }]} inputStyle={{ fontSize: 14 }} />
        <ChipRow options={CHANNEL} value={channel} onChange={setChannel} />
        <ChipRow options={STATUS} value={status} onChange={setStatus} />
      </View>
      {isLoading ? <View style={styles.center}><ActivityIndicator size="large" color={colors.primary.main} /></View>
        : isError ? <Empty icon="cloud-alert" title="Couldn't load returns" description={String((error as any)?.message || '')} />
        : (
          <FlatList
            data={rows}
            keyExtractor={(r) => String(r.id)}
            contentContainerStyle={styles.listContent}
            refreshing={isFetching}
            onRefresh={refetch}
            ListHeaderComponent={<StatRow stats={[
              { label: 'Returned', value: formatCurrency(s.totalAmount ?? 0), icon: 'undo-variant', color: colors.primary.main },
              { label: 'POS / Online', value: `${s.byChannel?.POS?.count ?? 0} / ${s.byChannel?.ONLINE?.count ?? 0}`, icon: 'swap-horizontal', color: '#0EA5E9' },
              { label: 'This month', value: formatCurrency(s.thisMonthAmount ?? 0), icon: 'calendar-month', color: '#10B981' },
              { label: 'Credit notes', value: formatCurrency(s.creditNoteAmount ?? 0), icon: 'file-document-minus', color: '#F59E0B' },
              { label: 'Cancelled', value: s.cancelledCount ?? 0, icon: 'cancel', color: '#EF4444' },
            ]} />}
            ListEmptyComponent={<Empty icon="undo-variant" title="No sales returns" description="Returns from POS bills and orders show up here" />}
            renderItem={({ item }) => (
              <TouchableOpacity style={[styles.card, { backgroundColor: colors.surface.default }]} onPress={() => navigation.navigate('SalesReturnDetail', { id: String(item.id) })} activeOpacity={0.7}>
                <View style={[styles.iconWrap, { backgroundColor: colors.primary.light + '25' }]}><Icon name="undo-variant" size={22} color={colors.primary.main} /></View>
                <View style={styles.info}>
                  <View style={styles.headerRow}>
                    <Text style={[styles.name, { color: colors.text.primary }]} numberOfLines={1}>{item.returnNumber}</Text>
                    <StatusBadge status={item.status} kind="return" />
                  </View>
                  <View style={styles.metaRow}><Icon name={item.channel === 'ONLINE' ? 'web' : item.channel === 'POS' ? 'cash-register' : 'receipt'} size={14} color={colors.text.tertiary} /><Text style={[styles.metaText, { color: colors.text.secondary }]} numberOfLines={1}>{channelLabel(item.channel)}{item.order?.orderNumber ? ` ${item.order.orderNumber}` : ''} · {customerLabel(item.customer, item.customerName)}</Text></View>
                  <View style={styles.metaRow}>
                    <Icon name="calendar" size={14} color={colors.text.tertiary} />
                    <Text style={[styles.metaText, { color: colors.text.secondary }]}>{formatDate(item.returnDate)} · {methodLabel(item.refundMethod, REFUND_METHODS)}</Text>
                    <Text style={[styles.amount, { color: colors.primary.main }]}>{formatCurrency(Number(item.total))}</Text>
                  </View>
                </View>
                <Icon name="chevron-right" size={24} color={colors.neutral[400]} />
              </TouchableOpacity>
            )}
          />
        )}
      <SafeAreaFAB icon="plus" onPress={() => navigation.navigate('SalesReturnForm', {})} />
    </ScreenWrapper>
  );
};
