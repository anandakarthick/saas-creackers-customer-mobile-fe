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
import { formatCurrency, formatDate } from '@/utils';
import type { DebitNotesStackParamList } from '@/types/navigation';
import { styles, StatRow, ChipRow, StatusBadge } from '../../../returns/shared';

type Nav = NativeStackNavigationProp<DebitNotesStackParamList, 'DebitNotesList'>;
const STATUS = [{ label: 'All', value: 'all' }, { label: 'Open', value: 'OPEN' }, { label: 'Partly used', value: 'PARTIALLY_USED' }, { label: 'Used', value: 'USED' }, { label: 'Cancelled', value: 'CANCELLED' }];

export const DebitNotesListScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const { colors } = useTheme();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const stats = useQuery({ queryKey: ['debitNoteStats'], queryFn: returnsApi.getDebitNoteStats });
  const { data, isLoading, isError, error, isFetching, refetch } = useQuery({
    queryKey: ['debitNotes', search, status],
    queryFn: () => returnsApi.getDebitNotes({ page: 1, limit: 100, search: search || undefined, status: status !== 'all' ? status : undefined }),
  });
  useFocusEffect(useCallback(() => { refetch(); }, []));
  const rows: any[] = data?.data || [];
  const s: any = stats.data || {};

  return (
    <ScreenWrapper scrollable={false} padding={false}>
      <Header title="Debit Notes" subtitle={`${rows.length} records`} showDrawer />
      <View style={styles.searchContainer}>
        <Searchbar placeholder="Note #, supplier, PO #…" value={search} onChangeText={setSearch} style={[styles.searchBar, { backgroundColor: colors.surface.default }]} inputStyle={{ fontSize: 14 }} />
        <ChipRow options={STATUS} value={status} onChange={setStatus} />
      </View>
      {isLoading ? <View style={styles.center}><ActivityIndicator size="large" color={colors.primary.main} /></View>
        : isError ? <Empty icon="cloud-alert" title="Couldn't load debit notes" description={String((error as any)?.message || '')} />
        : (
          <FlatList data={rows} keyExtractor={(r) => String(r.id)} contentContainerStyle={styles.listContent} refreshing={isFetching} onRefresh={refetch}
            ListHeaderComponent={<StatRow stats={[
              { label: 'Receivable', value: formatCurrency(s.openBalance ?? 0), icon: 'wallet', color: '#F59E0B' },
              { label: 'Raised', value: formatCurrency(s.issuedAmount ?? 0), icon: 'file-document-plus', color: colors.primary.main },
              { label: 'This month', value: formatCurrency(s.thisMonthAmount ?? 0), icon: 'calendar-month', color: '#10B981' },
              { label: 'Settled', value: formatCurrency(s.usedAmount ?? 0), icon: 'check-circle', color: '#6366F1' },
            ]} />}
            ListEmptyComponent={<Empty icon="file-document-plus" title="No debit notes" description="Amounts suppliers owe you show up here" />}
            renderItem={({ item }) => (
              <TouchableOpacity style={[styles.card, { backgroundColor: colors.surface.default }]} onPress={() => navigation.navigate('DebitNoteDetail', { id: String(item.id) })} activeOpacity={0.7}>
                <View style={[styles.iconWrap, { backgroundColor: '#F59E0B20' }]}><Icon name="file-document-plus" size={22} color="#F59E0B" /></View>
                <View style={styles.info}>
                  <View style={styles.headerRow}><Text style={[styles.name, { color: colors.text.primary }]} numberOfLines={1}>{item.noteNumber}</Text><StatusBadge status={item.status} kind="note" /></View>
                  <View style={styles.metaRow}><Icon name="truck" size={14} color={colors.text.tertiary} /><Text style={[styles.metaText, { color: colors.text.secondary }]} numberOfLines={1}>{item.supplier?.name}{item.purchaseReturn ? ` · ${item.purchaseReturn.returnNumber}` : item.purchaseOrder ? ` · ${item.purchaseOrder.orderNumber}` : ''}</Text></View>
                  <View style={styles.metaRow}>
                    <Icon name="calendar" size={14} color={colors.text.tertiary} />
                    <Text style={[styles.metaText, { color: colors.text.secondary }]}>{formatDate(item.issueDate)} · of {formatCurrency(Number(item.amount))}</Text>
                    <Text style={[styles.amount, { color: colors.primary.main }]}>{formatCurrency(Number(item.balance))}</Text>
                  </View>
                </View>
                <Icon name="chevron-right" size={24} color={colors.neutral[400]} />
              </TouchableOpacity>
            )} />
        )}
      <SafeAreaFAB icon="plus" onPress={() => navigation.navigate('DebitNoteForm', {})} />
    </ScreenWrapper>
  );
};
