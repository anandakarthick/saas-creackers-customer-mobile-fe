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
import type { GRNStackParamList } from '@/types/navigation';

type NavigationProp = NativeStackNavigationProp<GRNStackParamList, 'GRNList'>;

// Mock GRN data
const mockGRNs = [
  {
    id: 'grn-1',
    grnNumber: 'GRN-2024-001',
    purchaseOrderNumber: 'PO-2024-001',
    supplierName: 'Sri Lakshmi Fireworks',
    itemsCount: 2,
    receivedDate: '2024-05-15T00:00:00Z',
    status: 'completed',
  },
  {
    id: 'grn-2',
    grnNumber: 'GRN-2024-002',
    purchaseOrderNumber: 'PO-2024-002',
    supplierName: 'Ganesh Crackers Pvt Ltd',
    itemsCount: 1,
    receivedDate: '2024-06-08T00:00:00Z',
    status: 'partial',
  },
];

export const GRNListScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { colors } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const handleGRNPress = (grn: typeof mockGRNs[0]) => {
    navigation.navigate('GRNDetail', { id: grn.id });
  };

  const handleAddGRN = () => {
    navigation.navigate('GRNForm', {});
  };

  const filteredGRNs = mockGRNs.filter((grn) =>
    grn.grnNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    grn.purchaseOrderNumber.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await new Promise<void>((resolve) => setTimeout(resolve, 1000));
    setRefreshing(false);
  }, []);

  const renderGRN = ({ item }: { item: typeof mockGRNs[0] }) => (
    <TouchableOpacity
      style={[styles.grnCard, { backgroundColor: colors.surface.default }]}
      onPress={() => handleGRNPress(item)}
      activeOpacity={0.7}
    >
      <View style={[styles.grnIcon, { backgroundColor: colors.success.light + '20' }]}>
        <Icon name="clipboard-check" size={24} color={colors.success.main} />
      </View>
      <View style={styles.grnInfo}>
        <View style={styles.grnHeader}>
          <Text style={[styles.grnNumber, { color: colors.text.primary }]}>{item.grnNumber}</Text>
          <Badge variant={item.status === 'completed' ? 'success' : 'warning'} size="small">
            {item.status === 'completed' ? 'Complete' : 'Partial'}
          </Badge>
        </View>
        <Text style={[styles.poReference, { color: colors.primary.main }]}>PO: {item.purchaseOrderNumber}</Text>
        <View style={styles.grnDetails}>
          <Text style={[styles.supplierName, { color: colors.text.secondary }]}>{item.supplierName}</Text>
          <Text style={[styles.itemCount, { color: colors.text.tertiary }]}>{item.itemsCount} items</Text>
        </View>
        <Text style={[styles.receivedDate, { color: colors.text.tertiary }]}>Received: {formatDate(item.receivedDate)}</Text>
      </View>
      <Icon name="chevron-right" size={24} color={colors.neutral[400]} />
    </TouchableOpacity>
  );

  return (
    <ScreenWrapper scrollable={false} padding={false}>
      <Header
        title="Goods Receipt (GRN)"
        subtitle={`${filteredGRNs.length} receipts`}
        showDrawer
      />

      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Search GRN..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={[styles.searchBar, { backgroundColor: colors.surface.default }]}
          inputStyle={styles.searchInput}
        />
      </View>

      <FlatList
        data={filteredGRNs}
        renderItem={renderGRN}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshing={refreshing}
        onRefresh={onRefresh}
        ListEmptyComponent={
          <Empty
            icon="clipboard-check-outline"
            title="No GRN found"
            description="No goods receipts match your search"
          />
        }
      />

      <SafeAreaFAB icon="plus" onPress={handleAddGRN} />
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
  grnCard: {
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
  grnIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  grnInfo: {
    flex: 1,
    marginLeft: spacing[3],
  },
  grnHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  grnNumber: {
    fontSize: 16,
    fontWeight: '600',
  },
  poReference: {
    fontSize: 12,
    marginBottom: spacing[1],
  },
  grnDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  supplierName: {
    fontSize: 13,
  },
  itemCount: {
    fontSize: 12,
  },
  receivedDate: {
    fontSize: 12,
  },
});
