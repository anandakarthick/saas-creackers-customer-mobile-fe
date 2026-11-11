import React, { useState, useCallback, useMemo } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Searchbar, SegmentedButtons } from 'react-native-paper';
import { useQuery } from '@tanstack/react-query';
import { ScreenWrapper, Header } from '@/components/layout';
import { Badge, Empty, ProductImagePlaceholder } from '@/components/common';
import { useTheme } from '@/theme';
import { spacing, borderRadius } from '@/theme/spacing';
import { inventoryApi } from '@/services/api';
import { resolveImageUrl, safeImageUri } from '@/utils/imageUrl';
import { formatCurrency } from '@/utils';
import { getStockStatus, getStockStatusColor } from '@/utils/helpers';

type StockFilter = 'all' | 'low' | 'out';

interface StockRow {
  id: string;
  name: string;
  sku: string;
  stock: number;
  minStock: number;
  price: number;
  costPrice: number;
  images: string[];
  value: number;
}

function normalizeStock(p: any): StockRow {
  const imgs: string[] = Array.isArray(p.images)
    ? p.images.map((img: any) => (typeof img === 'string' ? img : img?.url)).filter(Boolean)
    : [];
  const stock = Number(p.quantity ?? p.stock ?? p.currentStock ?? 0);
  const costPrice = Number(p.costPrice || p.purchasePrice || p.buyingPrice || p.cost || 0);
  const retailPrice = Number(p.price || p.sellingPrice || p.retailPrice || 0);
  // Use costPrice for value if available, otherwise fall back to retail price
  const unitValue = costPrice > 0 ? costPrice : retailPrice;
  return {
    id: String(p.id),
    name: p.name || '',
    sku: p.sku || '',
    stock,
    minStock: Number(p.lowStockAlert ?? p.minStock ?? 0),
    price: retailPrice,
    costPrice,
    images: imgs.map(resolveImageUrl).filter((u): u is string => !!u),
    value: stock * unitValue,
  };
}

export const StockListScreen: React.FC = () => {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const [searchQuery, setSearchQuery] = useState('');
  const [stockFilter, setStockFilter] = useState<StockFilter>('all');

  const { data, isLoading, isError, error, isFetching, refetch } = useQuery({
    queryKey: ['stock', searchQuery, stockFilter],
    queryFn: () =>
      inventoryApi.getStock({
        page: 1,
        limit: 200,
        search: searchQuery || undefined,
        lowStock: stockFilter === 'low' || stockFilter === 'out' ? true : undefined,
      }),
  });

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [])
  );

  const allProducts = useMemo(
    () => ((data?.data || []) as any[]).map(normalizeStock),
    [data]
  );

  const filteredProducts = useMemo(
    () =>
      allProducts.filter((p) => {
        const status = getStockStatus(p.stock, p.minStock);
        if (stockFilter === 'low') return status === 'low_stock';
        if (stockFilter === 'out') return status === 'out_of_stock';
        return true;
      }),
    [allProducts, stockFilter]
  );

  const onRefresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  // Stats (computed from the fetched set)
  const totalProducts = allProducts.length;
  const totalStockQty = allProducts.reduce((sum, p) => sum + p.stock, 0);
  const totalStockValue = allProducts.reduce((sum, p) => sum + p.value, 0);
  const lowStockCount = allProducts.filter(
    (p) => getStockStatus(p.stock, p.minStock) === 'low_stock'
  ).length;
  const outOfStockCount = allProducts.filter(
    (p) => getStockStatus(p.stock, p.minStock) === 'out_of_stock'
  ).length;

  const renderProduct = ({ item }: { item: StockRow }) => {
    const status = getStockStatus(item.stock, item.minStock);
    const statusColor = getStockStatusColor(item.stock, item.minStock);

    return (
      <TouchableOpacity
        style={[styles.productCard, { backgroundColor: colors.surface.default }]}
        onPress={() => navigation.navigate('StockDetail', { id: item.id })}
        activeOpacity={0.7}
      >
        {safeImageUri(item.images?.[0]) ? (
          <Image source={{ uri: safeImageUri(item.images?.[0])! }} style={[styles.productImage, { backgroundColor: colors.neutral[100] }]} />
        ) : (
          <ProductImagePlaceholder size={48} style={styles.productImage} />
        )}
        <View style={styles.productInfo}>
          <Text style={[styles.productName, { color: colors.text.primary }]} numberOfLines={1}>{item.name}</Text>
          <Text style={[styles.productSku, { color: colors.text.tertiary }]}>{item.sku}</Text>
          <View style={styles.stockInfo}>
            <View style={[styles.stockIndicator, { backgroundColor: statusColor }]} />
            <Text style={[styles.stockText, { color: colors.text.secondary }]}>
              {item.stock} / {item.minStock} min
            </Text>
          </View>
        </View>
        <View style={styles.stockActions}>
          <Badge
            variant={status === 'out_of_stock' ? 'error' : status === 'low_stock' ? 'warning' : 'success'}
            size="small"
          >
            {status === 'out_of_stock' ? 'Out' : status === 'low_stock' ? 'Low' : 'OK'}
          </Badge>
          <Text style={[styles.productValue, { color: colors.text.secondary }]}>{formatCurrency(item.value)}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <ScreenWrapper scrollable={false} padding={false}>
      <Header
        title="Inventory"
        showDrawer
        actions={[
          { icon: 'alert-circle-outline', onPress: () => navigation.navigate('LowStock') },
          { icon: 'chart-pie', onPress: () => navigation.navigate('StockValuation') },
        ]}
      />

      {/* Stats Cards */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: colors.surface.default }]}>
          <Text style={[styles.statValue, { color: colors.text.primary }]}>{totalStockQty}</Text>
          <Text style={[styles.statLabel, { color: colors.text.secondary }]}>Total Stock</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.primary.light + '20' }]}>
          <Text style={[styles.statValue, { color: colors.primary.main, fontSize: 16 }]}>{formatCurrency(totalStockValue)}</Text>
          <Text style={[styles.statLabel, { color: colors.text.secondary }]}>Stock Value</Text>
        </View>
        <View style={[styles.statCard, styles.statCardWarning, { backgroundColor: colors.warning.light + '20' }]}>
          <Text style={[styles.statValue, { color: colors.warning.main }]}>{lowStockCount}</Text>
          <Text style={[styles.statLabel, { color: colors.text.secondary }]}>Low Stock</Text>
        </View>
        <View style={[styles.statCard, styles.statCardError, { backgroundColor: colors.error.light + '20' }]}>
          <Text style={[styles.statValue, { color: colors.error.main }]}>{outOfStockCount}</Text>
          <Text style={[styles.statLabel, { color: colors.text.secondary }]}>Out of Stock</Text>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Search products..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={[styles.searchBar, { backgroundColor: colors.surface.default }]}
          inputStyle={styles.searchInput}
        />
      </View>

      <View style={styles.filtersContainer}>
        <SegmentedButtons
          value={stockFilter}
          onValueChange={(value) => setStockFilter(value as StockFilter)}
          buttons={[
            { value: 'all', label: 'All' },
            { value: 'low', label: 'Low Stock' },
            { value: 'out', label: 'Out of Stock' },
          ]}
          style={[styles.segmentedButtons, { backgroundColor: colors.surface.variant }]}
        />
      </View>

      {isLoading ? (
        <View style={styles.loadingCenter}>
          <ActivityIndicator size="large" color={colors.primary.main} />
        </View>
      ) : isError ? (
        <Empty icon="cloud-alert" title="Couldn't load stock" description={String(error?.message || 'Network error')} />
      ) : (
        <FlatList
          data={filteredProducts}
          renderItem={renderProduct}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshing={isFetching}
          onRefresh={onRefresh}
          ListEmptyComponent={
            <Empty
              icon="package-variant-closed-remove"
              title="No products found"
              description="No products match your filter criteria"
            />
          }
        />
      )}
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  loadingCenter: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  imagePlaceholder: { justifyContent: 'center', alignItems: 'center' },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    gap: spacing[3],
  },
  statCard: {
    flex: 1,
    borderRadius: borderRadius.md,
    padding: spacing[3],
    alignItems: 'center',
  },
  statCardWarning: {},
  statCardError: {},
  statValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 11,
    marginTop: 2,
    textAlign: 'center',
  },
  searchContainer: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[2],
  },
  searchBar: {
    borderRadius: borderRadius.lg,
    elevation: 0,
  },
  searchInput: {
    fontSize: 14,
  },
  filtersContainer: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[3],
  },
  segmentedButtons: {},
  listContent: {
    padding: spacing[4],
    paddingBottom: spacing[20],
  },
  productCard: {
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
  productImage: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.md,
  },
  productInfo: {
    flex: 1,
    marginLeft: spacing[3],
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
  },
  productSku: {
    fontSize: 12,
    marginTop: 2,
  },
  stockInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing[1],
  },
  stockIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing[2],
  },
  stockText: {
    fontSize: 12,
  },
  stockActions: {
    alignItems: 'flex-end',
    gap: spacing[2],
  },
  productValue: {
    fontSize: 12,
  },
});
