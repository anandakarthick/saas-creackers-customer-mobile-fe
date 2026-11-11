import React, { useState, useCallback } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Searchbar, Chip } from 'react-native-paper';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { ScreenWrapper, Header } from '@/components/layout';
import { Empty, SafeAreaFAB } from '@/components/common';
import { useTheme } from '@/theme';
import { spacing, borderRadius } from '@/theme/spacing';
import { formatCurrency } from '@/utils';
import { getStockStatusColor } from '@/utils/helpers';
import { productsApi, categoriesApi } from '@/services/api';
import { resolveImageUrls, safeImageUri } from '@/utils/imageUrl';
import type { ProductsStackParamList } from '@/types/navigation';

type NavigationProp = NativeStackNavigationProp<ProductsStackParamList, 'ProductsList'>;

/**
 * Normalize a backend product row (from /api/admin/products) into the shape
 * the UI expects. The backend uses `quantity`/`lowStockAlert`/`images[{url}]`
 * while mock data used `stock`/`minStock`/`images[string]`.
 */
function normalizeProduct(p: any) {
  const rawImgs: string[] = Array.isArray(p.images)
    ? p.images.map((img: any) => (typeof img === 'string' ? img : img?.url)).filter(Boolean)
    : [];
  // Backend returns relative paths (/uploads/...); convert to absolute URLs.
  const imgs = resolveImageUrls(rawImgs);
  const deal = p.deal ? {
    offerPrice: Number(p.deal.offerPrice),
    originalPrice: Number(p.deal.originalPrice || p.price || 0),
    label: p.deal.label || '',
  } : null;
  return {
    id: String(p.id),
    name: p.name || '',
    sku: p.sku || '',
    categoryId: p.categoryId ? String(p.categoryId) : '',
    price: deal ? deal.offerPrice : Number(p.price || 0),
    originalPrice: deal ? deal.originalPrice : null,
    deal,
    stock: Number(p.quantity ?? p.stock ?? 0),
    minStock: Number(p.lowStockAlert ?? p.minStock ?? 0),
    isFeatured: !!p.isFeatured,
    images: imgs,
    status: p.status,
  };
}

const statusFilters = [
  { label: 'All', value: 'all' },
  { label: 'Active', value: 'ACTIVE' },
  { label: 'Inactive', value: 'INACTIVE' },
  { label: 'Out of Stock', value: 'OUT_OF_STOCK' },
];

export const ProductsListScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { colors } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | 'all'>('all');
  const [selectedStatus, setSelectedStatus] = useState('all');

  const { data: statsData } = useQuery({
    queryKey: ['productStats'],
    queryFn: () => productsApi.getProductStats(),
  });

  // Paged list: the API caps a page at 500 rows, and stores carry many more
  // products than one page, so "All" used to stop after the first 100. Pages
  // are loaded as the user scrolls (see onEndReached below).
  const PAGE_SIZE = 100;
  const productsQuery = useInfiniteQuery({
    queryKey: ['products', searchQuery, selectedCategory, selectedStatus],
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      productsApi.getProducts({
        page: pageParam,
        limit: PAGE_SIZE,
        search: searchQuery || undefined,
        categoryId: selectedCategory !== 'all' ? Number(selectedCategory) : undefined,
        status: selectedStatus !== 'all' ? selectedStatus : undefined,
      }),
    getNextPageParam: (lastPage, allPages) => {
      const meta = lastPage?.meta;
      if (meta?.totalPages != null) return meta.page < meta.totalPages ? meta.page + 1 : undefined;
      // No meta from the server: keep paging while a full page came back.
      return (lastPage?.data?.length || 0) >= PAGE_SIZE ? allPages.length + 1 : undefined;
    },
  });
  const loadMoreProducts = useCallback(() => {
    if (productsQuery.hasNextPage && !productsQuery.isFetchingNextPage) productsQuery.fetchNextPage();
  }, [productsQuery.hasNextPage, productsQuery.isFetchingNextPage, productsQuery.fetchNextPage]);

  const categoriesQuery = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.getCategories(),
  });

  const backendProducts = productsQuery.data?.pages.flatMap((pg) => pg?.data || []) || [];
  const filteredProducts = backendProducts.map(normalizeProduct);

  const backendCategories = (categoriesQuery.data as any[]) || [];
  const categories = [
    { id: 'all', name: 'All' },
    ...backendCategories.map((c: any) => ({ id: String(c.id), name: c.name })),
  ];

  useFocusEffect(
    useCallback(() => {
      productsQuery.refetch();
      categoriesQuery.refetch();
    }, [])
  );

  const onRefresh = useCallback(async () => {
    await Promise.all([productsQuery.refetch(), categoriesQuery.refetch()]);
  }, [productsQuery, categoriesQuery]);

  const handleProductPress = (product: { id: string }) => {
    navigation.navigate('ProductDetail', { id: product.id });
  };

  const handleAddProduct = () => {
    navigation.navigate('ProductForm', {});
  };

  const renderProduct = ({ item }: { item: ReturnType<typeof normalizeProduct> }) => {
    const stockColor = getStockStatusColor(item.stock, item.minStock);

    return (
      <TouchableOpacity
        style={[styles.productCard, { backgroundColor: colors.surface.default }]}
        onPress={() => handleProductPress(item)}
        activeOpacity={0.7}
      >
        <Image
          source={{ uri: safeImageUri(item.images?.[0]) || 'https://via.placeholder.com/100' }}
          style={styles.productImage}
        />
        <View style={styles.productInfo}>
          <Text style={[styles.productName, { color: colors.text.primary }]} numberOfLines={2}>{item.name}</Text>
          <Text style={[styles.productSku, { color: colors.text.tertiary }]}>{item.sku}</Text>
          <View style={styles.productMeta}>
            <View style={styles.priceRow}>
              <Text style={[styles.productPrice, { color: item.deal ? '#10B981' : colors.primary.main }]}>{formatCurrency(item.price)}</Text>
              {item.originalPrice != null && item.originalPrice > item.price && (
                <Text style={[styles.originalPrice, { color: colors.text.tertiary }]}>{formatCurrency(item.originalPrice)}</Text>
              )}
              {item.deal?.label ? (
                <View style={[styles.dealBadge, { backgroundColor: '#10B981' + '20' }]}>
                  <Text style={styles.dealBadgeText}>{item.deal.label}</Text>
                </View>
              ) : null}
            </View>
            <View style={[styles.stockBadge, { backgroundColor: stockColor + '20' }]}>
              <Text style={[styles.stockText, { color: stockColor }]}>
                {item.stock} in stock
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.productActions}>
          {item.isFeatured && (
            <Icon name="star" size={18} color={colors.secondary.main} />
          )}
          <Icon name="chevron-right" size={24} color={colors.neutral[400]} />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <ScreenWrapper scrollable={false} padding={false}>
      <Header
        title="Products"
        subtitle={`${filteredProducts.length} products`}
        showDrawer
        actions={[
          { icon: 'table-edit', onPress: () => navigation.navigate('BulkUpdate') },
          { icon: 'filter-variant', onPress: () => {} },
        ]}
      />

      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Search products..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={[styles.searchBar, { backgroundColor: colors.surface.default }]}
          inputStyle={styles.searchInput}
        />
      </View>

      <View style={[styles.filtersContainer, { borderBottomColor: colors.border.default }]}>
        <FlatList
          horizontal
          data={categories}
          keyExtractor={(item) => item.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersList}
          renderItem={({ item }) => (
            <Chip
              selected={selectedCategory === item.id}
              onPress={() => setSelectedCategory(item.id)}
              style={[
                styles.filterChip,
                { backgroundColor: colors.surface.variant },
                selectedCategory === item.id && { backgroundColor: colors.primary.main },
              ]}
              textStyle={[
                styles.filterChipText,
                { color: colors.text.secondary },
                selectedCategory === item.id && { color: colors.neutral[0] },
              ]}
            >
              {item.name}
            </Chip>
          )}
        />
      </View>

      <View style={[styles.filtersContainer, { borderBottomColor: colors.border.default }]}>
        <FlatList
          horizontal
          data={statusFilters}
          keyExtractor={(item) => item.value}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersList}
          renderItem={({ item }) => (
            <Chip
              selected={selectedStatus === item.value}
              onPress={() => setSelectedStatus(item.value)}
              style={[
                styles.filterChip,
                { backgroundColor: colors.surface.variant },
                selectedStatus === item.value && { backgroundColor: '#10B981' },
              ]}
              textStyle={[
                styles.filterChipText,
                { color: colors.text.secondary },
                selectedStatus === item.value && { color: colors.neutral[0] },
              ]}
            >
              {item.label}
            </Chip>
          )}
        />
      </View>

      {productsQuery.isLoading ? (
        <View style={styles.loadingCenter}>
          <ActivityIndicator size="large" color={colors.primary.main} />
        </View>
      ) : productsQuery.isError ? (
        <Empty
          icon="cloud-alert"
          title="Couldn't load products"
          description={String(productsQuery.error?.message || 'Check your connection and try again')}
        />
      ) : (
        <FlatList
          data={filteredProducts}
          renderItem={renderProduct}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshing={productsQuery.isRefetching && !productsQuery.isFetchingNextPage}
          onRefresh={onRefresh}
          onEndReached={loadMoreProducts}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            productsQuery.isFetchingNextPage ? (
              <View style={{ paddingVertical: 16 }}>
                <ActivityIndicator color={colors.primary.main} />
              </View>
            ) : null
          }
          ListHeaderComponent={
            statsData ? (
              <View style={styles.statsRow}>
                {[
                  { label: 'Total', value: (statsData as any).totalProducts ?? filteredProducts.length, icon: 'package-variant', color: colors.primary.main },
                  { label: 'Active', value: (statsData as any).activeProducts ?? 0, icon: 'check-circle', color: '#10B981' },
                  { label: 'Low Stock', value: (statsData as any).lowStockProducts ?? 0, icon: 'alert', color: '#F59E0B' },
                  { label: 'Out of Stock', value: (statsData as any).outOfStockProducts ?? 0, icon: 'close-circle', color: '#EF4444' },
                ].map((s) => (
                  <View key={s.label} style={[styles.statCard, { backgroundColor: colors.surface.default }]}>
                    <Icon name={s.icon} size={20} color={s.color} />
                    <Text style={[styles.statValue, { color: colors.text.primary }]}>{s.value}</Text>
                    <Text style={[styles.statLabel, { color: colors.text.tertiary }]}>{s.label}</Text>
                  </View>
                ))}
              </View>
            ) : null
          }
          ListEmptyComponent={
            <Empty
              icon="package-variant-closed-remove"
              title="No products found"
              description="No products match your search criteria"
            />
          }
        />
      )}

      <SafeAreaFAB icon="plus" onPress={handleAddProduct} />
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
    paddingBottom: spacing[20],
  },
  productCard: {
    flexDirection: 'row',
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
    width: 80,
    height: 80,
    borderRadius: borderRadius.md,
  },
  productInfo: {
    flex: 1,
    marginLeft: spacing[3],
    justifyContent: 'center',
  },
  productName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  productSku: {
    fontSize: 12,
    marginBottom: spacing[2],
  },
  productMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    flexWrap: 'wrap',
  },
  productPrice: {
    fontSize: 16,
    fontWeight: '700',
  },
  originalPrice: {
    fontSize: 12,
    textDecorationLine: 'line-through',
  },
  dealBadge: {
    paddingHorizontal: spacing[1],
    paddingVertical: 1,
    borderRadius: borderRadius.sm,
  },
  dealBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#10B981',
  },
  stockBadge: {
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  stockText: {
    fontSize: 11,
    fontWeight: '500',
  },
  productActions: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing[2],
  },
  loadingCenter: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
    marginBottom: spacing[4],
  },
  statCard: {
    flex: 1,
    minWidth: '46%',
    alignItems: 'center',
    paddingVertical: spacing[3],
    borderRadius: borderRadius.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: spacing[1],
  },
  statLabel: {
    fontSize: 11,
    marginTop: 2,
  },
});
