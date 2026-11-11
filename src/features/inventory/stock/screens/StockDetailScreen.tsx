import React from 'react';
import { StyleSheet, View, Text, FlatList, ActivityIndicator } from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useQuery } from '@tanstack/react-query';
import { ScreenWrapper, Header } from '@/components/layout';
import { Badge, Empty, ProductImagePlaceholder } from '@/components/common';
import { useTheme } from '@/theme';
import { spacing, borderRadius } from '@/theme/spacing';
import { productsApi } from '@/services/api';
import { formatCurrency, formatDateTime } from '@/utils';
import { resolveImageUrl } from '@/utils/imageUrl';
import { getStockStatus, getStockStatusColor } from '@/utils/helpers';
import type { InventoryStackParamList } from '@/types/navigation';
import { Image } from 'react-native';

type RouteProps = RouteProp<InventoryStackParamList, 'StockDetail'>;

function normalizeMovement(m: any) {
  return {
    id: String(m.id),
    type: m.type || m.movementType || 'ADJUSTMENT',
    quantity: Number(m.quantity || 0),
    reference: m.reference || m.referenceNumber || '',
    notes: m.notes || m.reason || '',
    createdAt: m.createdAt || m.date,
    createdBy: m.createdBy?.name || m.userName || '',
  };
}

const movementIcon = (type: string) => {
  switch (type.toUpperCase()) {
    case 'IN': case 'PURCHASE': case 'GRN': return { name: 'arrow-down-circle', color: '#10B981' };
    case 'OUT': case 'SALE': case 'ORDER': return { name: 'arrow-up-circle', color: '#EF4444' };
    case 'ADJUSTMENT': return { name: 'swap-horizontal-circle', color: '#6366F1' };
    case 'TRANSFER': return { name: 'truck-delivery', color: '#F59E0B' };
    default: return { name: 'circle', color: '#9CA3AF' };
  }
};

export const StockDetailScreen: React.FC = () => {
  const { colors } = useTheme();
  const route = useRoute<RouteProps>();
  const { id } = route.params;

  const { data: product, isLoading: loadingProduct } = useQuery({
    queryKey: ['product', id],
    queryFn: () => productsApi.getProduct(id),
  });

  const { data: movements, isLoading: loadingMovements, refetch } = useQuery({
    queryKey: ['productMovements', id],
    queryFn: () => productsApi.getProductMovements(id),
  });

  if (loadingProduct) {
    return (
      <ScreenWrapper scrollable={false} padding={false}>
        <Header title="Stock Detail" showBack />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary.main} />
        </View>
      </ScreenWrapper>
    );
  }

  const p = product || {};
  const stock = Number(p.quantity ?? p.stock ?? 0);
  const minStock = Number(p.lowStockAlert ?? p.minStock ?? 0);
  const costPrice = Number(p.costPrice || 0);
  const price = Number(p.price || 0);
  const statusText = getStockStatus(stock, minStock);
  const statusColor = getStockStatusColor(stock, minStock);
  const imageUrl = Array.isArray(p.images) && p.images.length > 0
    ? resolveImageUrl(typeof p.images[0] === 'string' ? p.images[0] : p.images[0]?.url)
    : null;

  const movementList = Array.isArray(movements) ? movements.map(normalizeMovement) : [];

  const renderMovement = ({ item }: { item: ReturnType<typeof normalizeMovement> }) => {
    const iconInfo = movementIcon(item.type);
    const isPositive = ['IN', 'PURCHASE', 'GRN'].includes(item.type.toUpperCase());
    return (
      <View style={[styles.movementCard, { backgroundColor: colors.surface.default }]}>
        <Icon name={iconInfo.name} size={28} color={iconInfo.color} />
        <View style={styles.movementInfo}>
          <Text style={[styles.movementType, { color: colors.text.primary }]}>{item.type}</Text>
          {item.reference ? <Text style={[styles.movementRef, { color: colors.text.tertiary }]}>{item.reference}</Text> : null}
          {item.notes ? <Text style={[styles.movementNotes, { color: colors.text.secondary }]} numberOfLines={1}>{item.notes}</Text> : null}
          <Text style={[styles.movementDate, { color: colors.text.tertiary }]}>{formatDateTime(item.createdAt)}</Text>
        </View>
        <Text style={[styles.movementQty, { color: isPositive ? '#10B981' : '#EF4444' }]}>
          {isPositive ? '+' : '-'}{Math.abs(item.quantity)}
        </Text>
      </View>
    );
  };

  return (
    <ScreenWrapper scrollable={false} padding={false}>
      <Header title="Stock Detail" showBack />

      <View style={[styles.productHeader, { backgroundColor: colors.surface.default }]}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.productImage} />
        ) : (
          <ProductImagePlaceholder size={80} />
        )}
        <View style={styles.productMeta}>
          <Text style={[styles.productName, { color: colors.text.primary }]}>{p.name}</Text>
          <Text style={[styles.productSku, { color: colors.text.tertiary }]}>SKU: {p.sku}</Text>
          <View style={styles.priceRow}>
            <Text style={[styles.priceLabel, { color: colors.text.secondary }]}>Price: {formatCurrency(price)}</Text>
            {costPrice > 0 && <Text style={[styles.priceLabel, { color: colors.text.tertiary }]}>Cost: {formatCurrency(costPrice)}</Text>}
          </View>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: colors.surface.default }]}>
          <Text style={[styles.statValue, { color: colors.text.primary }]}>{stock}</Text>
          <Text style={[styles.statLabel, { color: colors.text.tertiary }]}>Current Stock</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.surface.default }]}>
          <Text style={[styles.statValue, { color: colors.text.primary }]}>{minStock}</Text>
          <Text style={[styles.statLabel, { color: colors.text.tertiary }]}>Min Stock</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: statusColor + '20' }]}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={[styles.statLabel, { color: statusColor, fontWeight: '600' }]}>
            {statusText === 'out_of_stock' ? 'Out of Stock' : statusText === 'low_stock' ? 'Low Stock' : 'In Stock'}
          </Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.surface.default }]}>
          <Text style={[styles.statValue, { color: colors.primary.main, fontSize: 14 }]}>{formatCurrency(stock * (costPrice || price))}</Text>
          <Text style={[styles.statLabel, { color: colors.text.tertiary }]}>Value</Text>
        </View>
      </View>

      <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Movement History</Text>

      {loadingMovements ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary.main} />
        </View>
      ) : (
        <FlatList
          data={movementList}
          renderItem={renderMovement}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshing={false}
          onRefresh={() => refetch()}
          ListEmptyComponent={
            <Empty icon="swap-horizontal" title="No movements" description="No stock movements recorded yet" />
          }
        />
      )}
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  productHeader: {
    flexDirection: 'row',
    padding: spacing[4],
    marginHorizontal: spacing[4],
    marginTop: spacing[3],
    borderRadius: borderRadius.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  productImage: { width: 80, height: 80, borderRadius: borderRadius.md },
  productMeta: { flex: 1, marginLeft: spacing[3], justifyContent: 'center' },
  productName: { fontSize: 18, fontWeight: '700' },
  productSku: { fontSize: 12, marginTop: 2 },
  priceRow: { flexDirection: 'row', gap: spacing[3], marginTop: spacing[1] },
  priceLabel: { fontSize: 13 },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
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
  statValue: { fontSize: 22, fontWeight: '700' },
  statLabel: { fontSize: 11, marginTop: 2 },
  statusDot: { width: 10, height: 10, borderRadius: 5, marginBottom: spacing[1] },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    paddingHorizontal: spacing[4],
    paddingTop: spacing[2],
    paddingBottom: spacing[2],
  },
  listContent: { padding: spacing[4], paddingBottom: spacing[20] },
  movementCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[3],
    borderRadius: borderRadius.lg,
    marginBottom: spacing[2],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  movementInfo: { flex: 1, marginLeft: spacing[3] },
  movementType: { fontSize: 14, fontWeight: '600' },
  movementRef: { fontSize: 11, marginTop: 1 },
  movementNotes: { fontSize: 12, marginTop: 2 },
  movementDate: { fontSize: 11, marginTop: 2 },
  movementQty: { fontSize: 18, fontWeight: '700' },
});
