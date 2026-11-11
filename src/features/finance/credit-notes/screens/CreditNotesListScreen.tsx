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
import { customerLabel } from '@/services/api/returns.api';
import { formatCurrency, formatDate } from '@/utils';
import type { CreditNotesStackParamList } from '@/types/navigation';
import { styles, StatRow, ChipRow, StatusBadge } from '../../../returns/shared';

type Nav = NativeStackNavigationProp<CreditNotesStackParamList, 'CreditNotesList'>;
const STATUS = [{ label: 'All', value: 'all' }, { label: 'Open', value: 'OPEN' }, { label: 'Partly used', value: 'PARTIALLY_USED' }, { label: 'Used', value: 'USED' }, { label: 'Cancelled', value: 'CANCELLED' }];

export const CreditNotesListScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const { colors } = useTheme();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const stats = useQuery({ queryKey: ['creditNoteStats'], queryFn: returnsApi.getCreditNoteStats });
  const { data, isLoading, isError, error, isFetching, refetch } = useQuery({
    queryKey: ['creditNotes', search, status],
    queryFn: () => returnsApi.getCreditNotes({ page: 1, limit: 100, search: search || undefined, status: status !== 'all' ? status : undefined }),
  });
  useFocusEffect(useCallback(() => { refetch(); }, []));
  const rows: any[] = data?.data || [];
  const s: any = stats.data || {};

  return (
    <ScreenWrapper scrollable={false} padding={false}>
      <Header title="Credit Notes" subtitle={`${rows.length} records`} showDrawer />
      <View style={styles.searchContainer}>
        <Searchbar placeholder="Note #, customer, phone…" value={search} onChangeText={setSearch} style={[styles.searchBar, { backgroundColor: colors.surface.default }]} inputStyle={{ fontSize: 14 }} />
        <ChipRow options={STATUS} value={status} onChange={setStatus} />
      </View>
      {isLoading ? <View style={styles.center}><ActivityIndicator size="large" color={colors.primary.main} /></View>
        : isError ? <Empty icon="cloud-alert" title="Couldn't load credit notes" description={String((error as any)?.message || '')} />
        : (
          <FlatList data={rows} keyExtractor={(r) => String(r.id)} contentContainerStyle={styles.listContent} refreshing={isFetching} onRefresh={refetch}
            ListHeaderComponent={<StatRow stats={[
              { label: 'Open balance', value: formatCurrency(s.openBalance ?? 0), icon: 'wallet', color: '#F59E0B' },
              { label: 'Issued', value: formatCurrency(s.issuedAmount ?? 0), icon: 'file-document-minus', color: colors.primary.main },
              { label: 'This month', value: formatCurrency(s.thisMonthAmount ?? 0), icon: 'calendar-month', color: '#10B981' },
              { label: 'Used', value: formatCurrency(s.usedAmount ?? 0), icon: 'check-circle', color: '#6366F1' },
            ]} />}
            ListEmptyComponent={<Empty icon="file-document-minus" title="No credit notes" description="Store credit from sales returns or issued manually shows up here" />}
            renderItem={({ item }) => (
              <TouchableOpacity style={[styles.card, { backgroundColor: colors.surface.default }]} onPress={() => navigation.navigate('CreditNoteDetail', { id: String(item.id) })} activeOpacity={0.7}>
                <View style={[styles.iconWrap, { backgroundColor: '#6366F120' }]}><Icon name="file-document-minus" size={22} color="#6366F1" /></View>
                <View style={styles.info}>
                  <View style={styles.headerRow}><Text style={[styles.name, { color: colors.text.primary }]} numberOfLines={1}>{item.noteNumber}</Text><StatusBadge status={item.status} kind="note" /></View>
                  <View style={styles.metaRow}><Icon name="account" size={14} color={colors.text.tertiary} /><Text style={[styles.metaText, { color: colors.text.secondary }]} numberOfLines={1}>{customerLabel(item.customer, item.customerName)}{item.salesReturn ? ` · ${item.salesReturn.returnNumber}` : ''}</Text></View>
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
      <SafeAreaFAB icon="plus" onPress={() => navigation.navigate('CreditNoteForm', {})} />
    </ScreenWrapper>
  );
};
