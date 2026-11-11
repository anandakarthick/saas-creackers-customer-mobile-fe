import React, { useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useQuery } from '@tanstack/react-query';

import { ScreenWrapper, Header } from '@/components/layout';
import { Badge, Empty, ProductImagePlaceholder } from '@/components/common';
import { useTheme } from '@/theme';
import { spacing, borderRadius } from '@/theme/spacing';
import { inventoryApi } from '@/services/api';
import { resolveImageUrl } from '@/utils/imageUrl';
import { formatCurrency } from '@/utils';

interface LowStockRow {
  id: string;
  name: string;
  sku: string;
  quantity: number;
  lowStockAlert: number;
  price: number;
  image?: string;
  isOutOfStock: boolean;
  reorderAmount: number;
}

function normalize(p: any): LowStockRow {
  const imgs: string[] = Array.isArray(p.images)
    ? p.images.map((img: any) => (typeof img === 'string' ? img : img?.url)).filter(Boolean)
    : [];
  const quantity = Number(p.quantity ?? 0);
  const lowStockAlert = Number(p.lowStockAlert ?? 0);
  return {
    id: String(p.id),
    name: p.name || '',
    sku: p.sku || '',
    quantity,
    lowStockAlert,
    price: Number(p.price || 0),
    image: resolveImageUrl(imgs[0]),
    isOutOfStock: quantity <= 0,
    // Suggest reorder to 2× the low-stock alert so you're not immediately back in warning territory.
    reorderAmount: Math.max(0, lowStockAlert * 2 - quantity),
  };
}

/**
 * Phase 3: Lists every product where current stock <= low-stock alert threshold.
 * The backend endpoint GET /admin/inventory/low-stock already does the filtering;
 * mobile just renders the list with quick-adjust actions.
 */
export const LowStockAlertScreen: React.FC = () => {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();

  const { data, isLoading, isError, error, isFetching, refetch } = useQuery({
    queryKey: ['lowStock'],
    queryFn: () => inventoryApi.getLowStockProducts(),
  });

  const rows: LowStockRow[] = ((data as any[]) || []).map(normalize);

  const onRefresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const outOfStockCount = rows.filter((r) => r.isOutOfStock).length;
  const lowStockCount = rows.length - outOfStockCount;

  const renderRow = ({ item }: { item: LowStockRow }) => (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.surface.default }]}
      onPress={() =>
        // Jump straight into the stock-adjust form for this product, pre-filled.
        navigation.navigate('StockAdjustmentForm', { productId: item.id })
      }
      activeOpacity={0.7}
    >
      {item.image ? (
        <Image source={{ uri: item.image }} style={[styles.image, { backgroundColor: colors.neutral[100] }]} />
      ) : (
        <ProductImagePlaceholder size={48} style={styles.image} />
      )}
      <View style={styles.info}>
        <View style={styles.headerRow}>
          <Text style={[styles.name, { color: colors.text.primary }]} numberOfLines={1}>
            {item.name}
          </Text>
          <Badge variant={item.isOutOfStock ? 'error' : 'warning'} size="small">
            {item.isOutOfStock ? 'Out' : 'Low'}
          </Badge>
        </View>
        <Text style={[styles.sku, { color: colors.text.tertiary }]}>{item.sku}</Text>
        <View style={styles.stockRow}>
          <Icon
            name={item.isOutOfStock ? 'alert-circle' : 'alert'}
            size={14}
            color={item.isOutOfStock ? colors.error.main : colors.warning.main}
          />
          <Text style={[styles.stockText, { color: colors.text.secondary }]}>
            {item.quantity} left · threshold {item.lowStockAlert}
          </Text>
        </View>
        <Text style={[styles.reorder, { color: colors.text.tertiary }]}>
          Suggest reorder: <Text style={[styles.reorderAmount, { color: colors.primary.main }]}>{item.reorderAmount} units</Text>
          {'  ·  '}
          {formatCurrency(item.price * item.reorderAmount)}
        </Text>
      </View>
      <Icon name="chevron-right" size={22} color={colors.neutral[400]} />
    </TouchableOpacity>
  );

  return (
    <ScreenWrapper scrollable={false} padding={false}>
      <Header title="Low Stock Alerts" subtitle={`${rows.length} items need attention`} showBack />

      {/* Summary tiles */}
      <View style={styles.statsRow}>
        <View style={[styles.statTile, { backgroundColor: colors.error.light + '20' }]}>
          <Text style={[styles.statNumber, { color: colors.error.main }]}>{outOfStockCount}</Text>
          <Text style={[styles.statLabel, { color: colors.text.secondary }]}>Out of Stock</Text>
        </View>
        <View style={[styles.statTile, { backgroundColor: colors.warning.light + '20' }]}>
          <Text style={[styles.statNumber, { color: colors.warning.main }]}>{lowStockCount}</Text>
          <Text style={[styles.statLabel, { color: colors.text.secondary }]}>Low Stock</Text>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loadingCenter}>
          <ActivityIndicator size="large" color={colors.primary.main} />
        </View>
      ) : isError ? (
        <Empty
          icon="cloud-alert"
          title="Couldn't load low-stock products"
          description={String(error?.message || 'Network error')}
        />
      ) : (
        <FlatList
          data={rows}
          renderItem={renderRow}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshing={isFetching}
          onRefresh={onRefresh}
          ListEmptyComponent={
            <Empty
              icon="check-circle-outline"
              title="No low-stock items"
              description="All products are stocked above their alert threshold"
            />
          }
        />
      )}
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  loadingCenter: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  statsRow: {
    flexDirection: 'row',
    gap: spacing[3],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  statTile: {
    flex: 1,
    borderRadius: borderRadius.md,
    padding: spacing[3],
    alignItems: 'center',
  },
  statNumber: { fontSize: 24, fontWeight: '800' },
  statLabel: { fontSize: 11, marginTop: 2 },
  listContent: { padding: spacing[4], paddingBottom: spacing[8] },
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
  image: { width: 56, height: 56, borderRadius: borderRadius.md },
  imagePlaceholder: { justifyContent: 'center', alignItems: 'center' },
  info: { flex: 1, marginLeft: spacing[3] },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  name: { fontSize: 14, fontWeight: '600', flex: 1, marginRight: spacing[2] },
  sku: { fontSize: 11, marginTop: 2 },
  stockRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing[1], gap: spacing[1] },
  stockText: { fontSize: 12 },
  reorder: { fontSize: 11, marginTop: 4 },
  reorderAmount: { fontWeight: '700' },
});
