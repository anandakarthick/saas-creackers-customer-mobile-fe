import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Chip } from 'react-native-paper';
import { ScreenWrapper, Header } from '@/components/layout';
import { Empty } from '@/components/common';
import { useTheme } from '@/theme';
import { spacing, borderRadius } from '@/theme/spacing';
import { usePOSStore } from '@/store';
import { formatCurrency } from '@/utils';
import { format } from 'date-fns';
import type { POSSale } from '@/types';

type FilterType = 'all' | 'completed' | 'draft' | 'cancelled';

export const POSSalesHistoryScreen: React.FC = () => {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<FilterType>('all');

  const { salesHistory, draftOrders, loadDraft, deleteDraft, cancelSale } = usePOSStore();

  // Combine and filter sales
  const allSales = [...draftOrders, ...salesHistory];
  const filteredSales = filter === 'all'
    ? allSales
    : allSales.filter((s) => s.status === filter);

  const getStatusColor = (status: POSSale['status']) => {
    switch (status) {
      case 'completed':
        return colors.success.main;
      case 'draft':
        return colors.warning.main;
      case 'cancelled':
        return colors.error.main;
      default:
        return colors.neutral[400];
    }
  };

  const getStatusIcon = (status: POSSale['status']) => {
    switch (status) {
      case 'completed':
        return 'check-circle';
      case 'draft':
        return 'file-edit-outline';
      case 'cancelled':
        return 'close-circle';
      default:
        return 'circle';
    }
  };

  const handleLoadDraft = (draft: POSSale) => {
    Alert.alert(
      'Load Draft',
      'This will replace your current cart. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Load',
          onPress: () => {
            loadDraft(draft.id);
            navigation.goBack();
          },
        },
      ]
    );
  };

  const handleDeleteDraft = (draftId: string) => {
    Alert.alert(
      'Delete Draft',
      'Are you sure you want to delete this draft?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteDraft(draftId),
        },
      ]
    );
  };

  const handleCancelSale = (saleId: string) => {
    Alert.alert(
      'Cancel Sale',
      'Are you sure you want to cancel this sale?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: () => cancelSale(saleId),
        },
      ]
    );
  };

  const renderSaleItem = ({ item }: { item: POSSale }) => (
    <TouchableOpacity
      style={[styles.saleCard, { backgroundColor: colors.surface.default }]}
      activeOpacity={0.7}
      onPress={() => {
        if (item.status === 'draft') {
          handleLoadDraft(item);
        }
      }}
    >
      <View style={styles.saleHeader}>
        <View style={styles.receiptInfo}>
          <Text style={[styles.receiptNumber, { color: colors.text.primary }]}>{item.receiptNumber}</Text>
          <Text style={[styles.saleDate, { color: colors.text.tertiary }]}>
            {item.createdAt ? format(new Date(item.createdAt), 'dd MMM yyyy, hh:mm a') : '—'}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
          <Icon name={getStatusIcon(item.status)} size={14} color={getStatusColor(item.status)} />
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {(item.status || 'unknown').charAt(0).toUpperCase() + (item.status || 'unknown').slice(1)}
          </Text>
        </View>
      </View>

      <View style={[styles.saleBody, { borderBottomColor: colors.border.default }]}>
        <View style={styles.itemsPreview}>
          <Text style={[styles.itemsCount, { color: colors.text.secondary }]}>{(item.items || []).length} items</Text>
          <Text style={[styles.itemsList, { color: colors.text.tertiary }]} numberOfLines={1}>
            {(item.items || []).map((i) => i.product?.name || 'Unknown').join(', ')}
          </Text>
        </View>

        {item.customerName && (
          <View style={styles.customerRow}>
            <Icon name="account" size={14} color={colors.text.tertiary} />
            <Text style={[styles.customerName, { color: colors.text.tertiary }]}>{item.customerName}</Text>
          </View>
        )}
      </View>

      <View style={styles.saleFooter}>
        <View style={styles.totalSection}>
          <Text style={[styles.totalLabel, { color: colors.text.tertiary }]}>Total</Text>
          <Text style={[styles.totalValue, { color: colors.primary.main }]}>{formatCurrency(item.total)}</Text>
        </View>

        <View style={styles.actions}>
          {item.status === 'draft' && (
            <>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: colors.primary.light }]}
                onPress={() => handleLoadDraft(item)}
              >
                <Icon name="cart-arrow-up" size={18} color={colors.primary.main} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: colors.error.light }]}
                onPress={() => handleDeleteDraft(item.id)}
              >
                <Icon name="trash-can-outline" size={18} color={colors.error.main} />
              </TouchableOpacity>
            </>
          )}
          {item.status === 'completed' && (
            <>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: colors.primary.light }]}
                onPress={() => Alert.alert('Print', 'Reprinting receipt...')}
              >
                <Icon name="printer" size={18} color={colors.primary.main} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: colors.error.light }]}
                onPress={() => handleCancelSale(item.id)}
              >
                <Icon name="close-circle-outline" size={18} color={colors.error.main} />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  const filters: { key: FilterType; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'completed', label: 'Completed' },
    { key: 'draft', label: 'Drafts' },
    { key: 'cancelled', label: 'Cancelled' },
  ];

  return (
    <ScreenWrapper scrollable={false} padding={false}>
      <Header title="Sales History" showBack />

      {/* Filter Chips */}
      <View style={[styles.filtersContainer, { backgroundColor: colors.surface.default, borderBottomColor: colors.border.default }]}>
        <FlatList
          horizontal
          data={filters}
          keyExtractor={(item) => item.key}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersList}
          renderItem={({ item }) => (
            <Chip
              selected={filter === item.key}
              onPress={() => setFilter(item.key)}
              style={[
                styles.filterChip,
                { backgroundColor: colors.surface.variant },
                filter === item.key && { backgroundColor: colors.primary.main },
              ]}
              textStyle={[
                styles.filterChipText,
                { color: colors.text.secondary },
                filter === item.key && { color: colors.neutral[0] },
              ]}
            >
              {item.label}
            </Chip>
          )}
        />
      </View>

      {/* Sales List */}
      <FlatList
        data={filteredSales}
        renderItem={renderSaleItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: spacing[4] + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <Empty
            icon="receipt"
            title="No sales found"
            description={
              filter === 'all'
                ? 'Your sales history will appear here'
                : `No ${filter} sales found`
            }
          />
        }
      />
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  filtersContainer: {
    borderBottomWidth: 1,
  },
  filtersList: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    gap: spacing[2],
  },
  filterChip: {
    marginRight: spacing[2],
  },
  filterChipText: {
    fontSize: 13,
  },
  listContent: {
    padding: spacing[4],
  },
  saleCard: {
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    marginBottom: spacing[3],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  saleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing[3],
  },
  receiptInfo: {
    flex: 1,
  },
  receiptNumber: {
    fontSize: 16,
    fontWeight: '600',
  },
  saleDate: {
    fontSize: 12,
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.sm,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  saleBody: {
    paddingBottom: spacing[3],
    borderBottomWidth: 1,
  },
  itemsPreview: {
    marginBottom: spacing[2],
  },
  itemsCount: {
    fontSize: 13,
    fontWeight: '500',
  },
  itemsList: {
    fontSize: 12,
    marginTop: 2,
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },
  customerName: {
    fontSize: 12,
  },
  saleFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing[3],
  },
  totalSection: {
    flex: 1,
  },
  totalLabel: {
    fontSize: 12,
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
