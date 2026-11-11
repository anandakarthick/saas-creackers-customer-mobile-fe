import React, { useState, useCallback } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Searchbar } from 'react-native-paper';
import { ScreenWrapper, Header } from '@/components/layout';
import { Badge, Empty, SafeAreaFAB } from '@/components/common';
import { useTheme } from '@/theme';
import { spacing, borderRadius } from '@/theme/spacing';
import { formatDate } from '@/utils';
import type { StockAdjustmentsStackParamList } from '@/types/navigation';

type NavigationProp = NativeStackNavigationProp<StockAdjustmentsStackParamList, 'StockAdjustmentsList'>;

// Mock adjustments data
const mockAdjustments = [
  {
    id: 'adj-1',
    adjustmentNumber: 'ADJ-2024-001',
    reason: 'Physical count variance',
    itemsCount: 5,
    status: 'approved',
    adjustedBy: 'Suresh Kannan',
    createdAt: '2024-06-01T00:00:00Z',
  },
  {
    id: 'adj-2',
    adjustmentNumber: 'ADJ-2024-002',
    reason: 'Damaged goods',
    itemsCount: 2,
    status: 'pending',
    adjustedBy: 'Senthil Kumar',
    createdAt: '2024-06-10T00:00:00Z',
  },
  {
    id: 'adj-3',
    adjustmentNumber: 'ADJ-2024-003',
    reason: 'Stock correction',
    itemsCount: 3,
    status: 'rejected',
    adjustedBy: 'Meena Lakshmi',
    createdAt: '2024-06-12T00:00:00Z',
  },
];

export const StockAdjustmentsListScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { colors } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const handleAdjustmentPress = (adjustment: typeof mockAdjustments[0]) => {
    navigation.navigate('StockAdjustmentDetail', { id: adjustment.id });
  };

  const handleAddAdjustment = () => {
    navigation.navigate('StockAdjustmentForm', {});
  };

  const filteredAdjustments = mockAdjustments.filter((adj) =>
    adj.adjustmentNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (adj.reason || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await new Promise<void>((resolve) => setTimeout(resolve, 1000));
    setRefreshing(false);
  }, []);

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'approved': return 'success';
      case 'pending': return 'warning';
      case 'rejected': return 'error';
      default: return 'default';
    }
  };

  const renderAdjustment = ({ item }: { item: typeof mockAdjustments[0] }) => (
    <TouchableOpacity
      style={[styles.adjustmentCard, { backgroundColor: colors.surface.default }]}
      onPress={() => handleAdjustmentPress(item)}
      activeOpacity={0.7}
    >
      <View style={[styles.adjustmentIcon, { backgroundColor: colors.secondary.light + '20' }]}>
        <Icon name="swap-horizontal" size={24} color={colors.secondary.main} />
      </View>
      <View style={styles.adjustmentInfo}>
        <View style={styles.adjustmentHeader}>
          <Text style={[styles.adjustmentNumber, { color: colors.text.primary }]}>{item.adjustmentNumber}</Text>
          <Badge variant={getStatusVariant(item.status)} size="small">
            {(item.status || '').charAt(0).toUpperCase() + (item.status || '').slice(1)}
          </Badge>
        </View>
        <Text style={[styles.reason, { color: colors.text.secondary }]}>{item.reason}</Text>
        <View style={styles.adjustmentDetails}>
          <Text style={[styles.detailText, { color: colors.text.tertiary }]}>{item.itemsCount} items</Text>
          <Text style={[styles.detailText, { color: colors.text.tertiary }]}>by {item.adjustedBy}</Text>
        </View>
        <Text style={[styles.dateText, { color: colors.text.tertiary }]}>{formatDate(item.createdAt)}</Text>
      </View>
      <Icon name="chevron-right" size={24} color={colors.neutral[400]} />
    </TouchableOpacity>
  );

  return (
    <ScreenWrapper scrollable={false} padding={false}>
      <Header
        title="Stock Adjustments"
        subtitle={`${filteredAdjustments.length} adjustments`}
        showDrawer
      />

      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Search adjustments..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={[styles.searchBar, { backgroundColor: colors.surface.default }]}
          inputStyle={styles.searchInput}
        />
      </View>

      <FlatList
        data={filteredAdjustments}
        renderItem={renderAdjustment}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshing={refreshing}
        onRefresh={onRefresh}
        ListEmptyComponent={
          <Empty
            icon="swap-horizontal"
            title="No adjustments found"
            description="No stock adjustments match your search"
          />
        }
      />

      <SafeAreaFAB icon="plus" onPress={handleAddAdjustment} />
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  searchContainer: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
  },
  searchBar: {
    borderRadius: borderRadius.lg,
    elevation: 0,
  },
  searchInput: {
    fontSize: 14,
  },
  listContent: {
    padding: spacing[4],
    paddingBottom: spacing[20],
  },
  adjustmentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    marginBottom: spacing[3],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  adjustmentIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  adjustmentInfo: {
    flex: 1,
    marginLeft: spacing[3],
  },
  adjustmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  adjustmentNumber: {
    fontSize: 16,
    fontWeight: '600',
  },
  reason: {
    fontSize: 14,
    marginBottom: spacing[1],
  },
  adjustmentDetails: {
    flexDirection: 'row',
    gap: spacing[3],
    marginBottom: 4,
  },
  detailText: {
    fontSize: 12,
  },
  dateText: {
    fontSize: 12,
  },
});
