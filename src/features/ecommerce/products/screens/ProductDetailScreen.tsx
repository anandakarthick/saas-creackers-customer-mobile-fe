import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  Image,
  Alert,
  Dimensions,
  ActivityIndicator,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { Text, Button, Chip } from 'react-native-paper';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { Header } from '@/components/layout/Header';
import { Badge } from '@/components/common/Badge';
import { ConfirmationModal } from '@/components/common/ConfirmationModal';
import { ProductImagePlaceholder } from '@/components/common/ProductImagePlaceholder';
import { useTheme } from '@/theme';
import { spacing, borderRadius } from '@/theme/spacing';
import { productsApi } from '@/services/api';
import { resolveImageUrls } from '@/utils/imageUrl';
import { formatCurrency } from '@/utils';
import { API_CONFIG, ENDPOINTS } from '@/config/api';
import { STORAGE_KEYS } from '@/constants';
import type { ProductsStackParamList } from '@/types/navigation';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type NavigationProp = NativeStackNavigationProp<ProductsStackParamList, 'ProductDetail'>;
type RouteProps = RouteProp<ProductsStackParamList, 'ProductDetail'>;

interface DetailRowProps {
  label: string;
  value: string | React.ReactNode;
  icon?: string;
}

const DetailRow: React.FC<DetailRowProps> = ({ label, value, icon }) => {
  const { colors } = useTheme();
  return (
    <View style={styles.detailRow}>
      {icon && <Icon name={icon} size={20} color={colors.neutral[400]} style={styles.detailIcon} />}
      <View style={styles.detailContent}>
        <Text style={[styles.detailLabel, { color: colors.text.secondary }]}>{label}</Text>
        {typeof value === 'string' ? (
          <Text style={[styles.detailValue, { color: colors.text.primary }]}>{value}</Text>
        ) : (
          value
        )}
      </View>
    </View>
  );
};

const getStockStatus = (stock: number, minStock: number) => {
  if (stock === 0) return { label: 'Out of Stock', variant: 'error' as const };
  if (stock <= minStock) return { label: 'Low Stock', variant: 'warning' as const };
  return { label: 'In Stock', variant: 'success' as const };
};

const MOVEMENT_TYPE_LABELS: Record<string, { label: string; icon: string; color: 'success' | 'error' | 'info' | 'warning' }> = {
  PURCHASE: { label: 'Purchase', icon: 'cart-arrow-down', color: 'success' },
  SALE: { label: 'Sale', icon: 'cart-arrow-up', color: 'error' },
  ADJUSTMENT: { label: 'Adjustment', icon: 'swap-horizontal', color: 'info' },
  RETURN: { label: 'Return', icon: 'keyboard-return', color: 'warning' },
  GRN: { label: 'GRN', icon: 'clipboard-check', color: 'success' },
  VOID: { label: 'Cancelled', icon: 'close-circle', color: 'warning' },
  CANCEL: { label: 'Cancelled', icon: 'cancel', color: 'error' },
  TRANSFER: { label: 'Transfer', icon: 'transfer', color: 'info' },
};

function normalizeProduct(p: any) {
  const rawImages: string[] = Array.isArray(p.images)
    ? p.images
        .map((img: any) => (typeof img === 'string' ? img : img?.url))
        .filter(Boolean)
    : [];
  const images = resolveImageUrls(rawImages);
  const deal = p.deal ? {
    offerPrice: Number(p.deal.offerPrice),
    originalPrice: Number(p.deal.originalPrice || p.price || 0),
    label: p.deal.label || '',
    code: p.deal.code || '',
  } : null;
  return {
    id: String(p.id),
    name: p.name || '',
    sku: p.sku || '',
    barcode: p.barcode || '',
    description: p.description || '',
    shortDesc: p.shortDesc || '',
    price: Number(p.price || 0),
    costPrice: Number(p.costPrice || 0),
    comparePrice: p.comparePrice ? Number(p.comparePrice) : null,
    deal,
    stock: Number(p.quantity ?? 0),
    minStock: Number(p.lowStockAlert ?? 0),
    taxRate: Number(p.gstPercent || 0),
    gstInclusive: p.gstInclusive !== false,
    hsn: p.hsn || '',
    weight: p.weight ? Number(p.weight) : null,
    isActive: p.status === 'ACTIVE',
    status: p.status,
    isFeatured: !!p.isFeatured,
    category: p.category || null,
    images,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

export const ProductDetailScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [movementsExpanded, setMovementsExpanded] = useState(false);
  const [printingBarcode, setPrintingBarcode] = useState(false);

  const productId = route.params?.id;

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['product', productId],
    queryFn: () => productsApi.getProduct(productId),
    enabled: !!productId,
  });

  const { data: movements, isLoading: movementsLoading, refetch: refetchMovements } = useQuery({
    queryKey: ['productMovements', productId],
    queryFn: () => productsApi.getProductMovements(productId),
    enabled: !!productId && movementsExpanded,
  });

  useFocusEffect(
    useCallback(() => {
      refetch();
      refetchMovements();
    }, [])
  );

  const deleteMutation = useMutation({
    mutationFn: () => productsApi.deleteProduct(productId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setDeleteModalVisible(false);
      navigation.goBack();
    },
    onError: (err: any) => {
      Alert.alert('Error', err?.message || 'Failed to delete product');
    },
  });

  const barcodeMutation = useMutation({
    mutationFn: () =>
      productsApi.createBarcodePrintJob({
        productIds: [Number(productId)],
        quantityPerProduct: 1,
      }),
    onSuccess: async (result: any) => {
      const jobId = result?.id;
      if (jobId) {
        try {
          const [token, tenantSlug] = await Promise.all([
            AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN),
            AsyncStorage.getItem(STORAGE_KEYS.TENANT_SLUG),
          ]);
          if (token) {
            const base = API_CONFIG.BASE_URL.replace(/\/$/, '');
            const url =
              `${base}${ENDPOINTS.BARCODE_PRINT_JOBS}/${jobId}/download` +
              `?token=${encodeURIComponent(token)}` +
              (tenantSlug ? `&tenant=${encodeURIComponent(tenantSlug)}` : '');
            await Linking.openURL(url);
          }
        } catch {
          Alert.alert('Barcode Created', 'Print job created. View it in Barcode Print Jobs.');
        }
      } else {
        Alert.alert('Barcode Created', 'Print job created successfully.');
      }
    },
    onError: (err: any) => Alert.alert('Error', err?.message || 'Failed to create barcode job'),
  });

  const handlePrintBarcode = () => {
    Alert.alert(
      'Print Barcode',
      'Create a barcode print job for this product?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Create & Download',
          onPress: () => barcodeMutation.mutate(),
        },
      ],
    );
  };

  if (isLoading) {
    return (
      <ScreenWrapper>
        <Header title="Product Details" showBack />
        <View style={styles.notFound}>
          <ActivityIndicator size="large" color={colors.primary.main} />
        </View>
      </ScreenWrapper>
    );
  }

  if (isError || !data) {
    return (
      <ScreenWrapper>
        <Header title="Product Not Found" showBack />
        <View style={styles.notFound}>
          <Icon name="alert-circle-outline" size={64} color={colors.neutral[300]} />
          <Text style={[styles.notFoundText, { color: colors.text.secondary }]}>
            {isError ? String(error?.message || 'Failed to load product') : 'Product not found'}
          </Text>
        </View>
      </ScreenWrapper>
    );
  }

  const product = normalizeProduct(data);
  const stockStatus = getStockStatus(product.stock, product.minStock);
  const movementsList: any[] = Array.isArray(movements) ? movements : movements?.data || [];

  const handleEdit = () => navigation.navigate('ProductForm', { id: product.id });

  return (
    <ScreenWrapper scrollable={false}>
      <Header
        title="Product Details"
        showBack
        actions={[
          { icon: 'barcode', onPress: handlePrintBarcode },
          { icon: 'pencil', onPress: handleEdit },
          { icon: 'delete', onPress: () => setDeleteModalVisible(true) },
        ]}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingBottom: spacing[8] + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Product Images */}
        {product.images.length > 0 ? (
          <View style={styles.imageContainer}>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e) => {
                const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
                setCurrentImageIndex(index);
              }}
            >
              {product.images.map((image, index) => (
                <Image
                  key={index}
                  source={{ uri: image }}
                  style={styles.productImage}
                  resizeMode="cover"
                />
              ))}
            </ScrollView>
            {product.images.length > 1 && (
              <View style={styles.imagePagination}>
                {product.images.map((_, index) => (
                  <View
                    key={index}
                    style={[
                      styles.paginationDot,
                      {
                        backgroundColor:
                          index === currentImageIndex ? colors.primary.main : colors.neutral[300],
                      },
                    ]}
                  />
                ))}
              </View>
            )}
          </View>
        ) : (
          <View style={[styles.imagePlaceholder, { backgroundColor: colors.surface.variant }]}>
            <ProductImagePlaceholder size={200} borderRadius={0} />
          </View>
        )}

        {/* Product Header */}
        <View style={[styles.headerCard, { backgroundColor: colors.surface.default }]}>
          <View style={styles.headerTop}>
            <View style={styles.badges}>
              <Badge variant={stockStatus.variant}>{stockStatus.label}</Badge>
              {product.isFeatured && <Badge variant="info">Featured</Badge>}
            </View>
            <Text style={[styles.sku, { color: colors.text.secondary }]}>SKU: {product.sku}</Text>
          </View>

          <Text style={[styles.productName, { color: colors.text.primary }]}>{product.name}</Text>

          <View style={styles.priceRow}>
            {product.deal ? (
              <>
                <Text style={[styles.price, { color: '#10B981' }]}>
                  {formatCurrency(product.deal.offerPrice)}
                </Text>
                <Text style={[styles.originalPriceStrike, { color: colors.text.tertiary }]}>
                  {formatCurrency(product.deal.originalPrice)}
                </Text>
                {product.deal.label ? (
                  <View style={[styles.dealLabel, { backgroundColor: '#10B981' + '20' }]}>
                    <Text style={styles.dealLabelText}>{product.deal.label}</Text>
                  </View>
                ) : null}
              </>
            ) : (
              <Text style={[styles.price, { color: colors.primary.main }]}>
                {formatCurrency(product.price)}
              </Text>
            )}
            {product.taxRate > 0 && (
              <Text style={[styles.tax, { color: colors.text.secondary }]}>
                {product.gstInclusive ? `incl. ${product.taxRate}% GST` : `+ ${product.taxRate}% GST`}
              </Text>
            )}
            {product.hsn ? (
              <Text style={[styles.tax, { color: colors.text.secondary }]}>
                HSN: {product.hsn}
              </Text>
            ) : null}
          </View>

        </View>

        {/* Stock Information */}
        <View style={[styles.section, { backgroundColor: colors.surface.default }]}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Stock Information</Text>
          <View style={styles.stockCards}>
            <View style={[styles.stockCard, { backgroundColor: colors.surface.variant }]}>
              <Text style={[styles.stockCardValue, { color: colors.text.primary }]}>
                {product.stock}
              </Text>
              <Text style={[styles.stockCardLabel, { color: colors.text.secondary }]}>
                Current Stock
              </Text>
            </View>
            <View style={[styles.stockCard, { backgroundColor: colors.surface.variant }]}>
              <Text style={[styles.stockCardValue, { color: colors.warning.main }]}>
                {product.minStock}
              </Text>
              <Text style={[styles.stockCardLabel, { color: colors.text.secondary }]}>
                Low-stock Alert
              </Text>
            </View>
          </View>
        </View>

        {/* Stock Movements */}
        <View style={[styles.section, { backgroundColor: colors.surface.default }]}>
          <TouchableOpacity
            style={styles.expandableHeader}
            onPress={() => setMovementsExpanded(!movementsExpanded)}
            activeOpacity={0.7}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
              <Icon name="history" size={20} color={colors.primary.main} />
              <Text style={[styles.sectionTitle, { color: colors.text.primary, marginBottom: 0 }]}>
                Stock Movements
              </Text>
            </View>
            <Icon
              name={movementsExpanded ? 'chevron-up' : 'chevron-down'}
              size={24}
              color={colors.text.tertiary}
            />
          </TouchableOpacity>

          {movementsExpanded && (
            <View style={{ marginTop: spacing[3] }}>
              {movementsLoading ? (
                <ActivityIndicator size="small" color={colors.primary.main} style={{ padding: spacing[4] }} />
              ) : movementsList.length === 0 ? (
                <Text style={{ fontSize: 13, color: colors.text.tertiary, textAlign: 'center', padding: spacing[4] }}>
                  No stock movements recorded yet.
                </Text>
              ) : (
                movementsList.slice(0, 20).map((mv: any, idx: number) => {
                  const type = (mv.type || mv.movementType || 'ADJUSTMENT').toUpperCase();
                  const meta = MOVEMENT_TYPE_LABELS[type] || MOVEMENT_TYPE_LABELS.ADJUSTMENT;
                  const qty = Number(mv.quantity || mv.quantityChange || 0);
                  const isPositive = qty > 0;
                  return (
                    <View
                      key={mv.id || idx}
                      style={[styles.movementRow, { borderBottomColor: colors.border.default }]}
                    >
                      <View style={[styles.movementIcon, { backgroundColor: colors[meta.color].main + '15' }]}>
                        <Icon name={meta.icon} size={18} color={colors[meta.color].main} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 13, fontWeight: '500', color: colors.text.primary }}>
                          {meta.label}
                        </Text>
                        {mv.reference || mv.notes ? (
                          <Text style={{ fontSize: 11, color: colors.text.tertiary }} numberOfLines={1}>
                            {mv.reference || mv.notes}
                          </Text>
                        ) : null}
                        <Text style={{ fontSize: 11, color: colors.text.tertiary }}>
                          {mv.createdAt ? new Date(mv.createdAt).toLocaleString('en-IN') : ''}
                        </Text>
                      </View>
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: '700',
                          color: isPositive ? colors.success.main : colors.error.main,
                        }}
                      >
                        {isPositive ? '+' : ''}{qty}
                      </Text>
                    </View>
                  );
                })
              )}
              {movementsList.length > 20 && (
                <Text style={{ fontSize: 12, color: colors.text.tertiary, textAlign: 'center', marginTop: spacing[2] }}>
                  Showing first 20 of {movementsList.length} movements
                </Text>
              )}
            </View>
          )}
        </View>

        {/* Product Details */}
        <View style={[styles.section, { backgroundColor: colors.surface.default }]}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Product Details</Text>

          <DetailRow label="Category" value={product.category?.name || 'Uncategorized'} icon="folder-outline" />
          {product.barcode && <DetailRow label="Barcode" value={product.barcode} icon="barcode" />}
          {product.weight && <DetailRow label="Weight" value={`${product.weight} kg`} icon="weight" />}
          <DetailRow
            label="Status"
            value={
              <Chip
                mode="flat"
                style={{
                  backgroundColor: product.isActive ? colors.success.main + '20' : colors.neutral[200],
                }}
                textStyle={{
                  color: product.isActive ? colors.success.dark : colors.text.secondary,
                  fontSize: 12,
                }}
              >
                {product.status || (product.isActive ? 'Active' : 'Inactive')}
              </Chip>
            }
            icon="check-circle-outline"
          />
        </View>

        {/* Description */}
        {product.description ? (
          <View style={[styles.section, { backgroundColor: colors.surface.default }]}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Description</Text>
            <Text style={[styles.description, { color: colors.text.secondary }]}>
              {product.description}
            </Text>
          </View>
        ) : null}

        {/* Timestamps */}
        {product.createdAt ? (
          <View style={[styles.section, { backgroundColor: colors.surface.default }]}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Timestamps</Text>
            <DetailRow
              label="Created At"
              value={new Date(product.createdAt).toLocaleString()}
              icon="calendar-plus"
            />
            {product.updatedAt && (
              <DetailRow
                label="Updated At"
                value={new Date(product.updatedAt).toLocaleString()}
                icon="calendar-edit"
              />
            )}
          </View>
        ) : null}

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          {product.barcode && (
            <Button
              mode="outlined"
              onPress={handlePrintBarcode}
              style={styles.editButton}
              icon="barcode"
              loading={barcodeMutation.isPending}
              disabled={barcodeMutation.isPending}
            >
              Print Barcode
            </Button>
          )}
          <Button
            mode="outlined"
            onPress={() => navigation.navigate('BarcodePrintJobs' as any)}
            style={styles.editButton}
            icon="printer"
          >
            Barcode Print Jobs
          </Button>
          <Button
            mode="outlined"
            onPress={handleEdit}
            style={styles.editButton}
            icon="pencil"
            labelStyle={{ color: colors.primary.main }}
          >
            Edit Product
          </Button>
          <Button
            mode="outlined"
            onPress={() => setDeleteModalVisible(true)}
            style={[styles.deleteButton, { borderColor: colors.error.main }]}
            icon="delete"
            labelStyle={{ color: colors.error.main }}
          >
            Delete Product
          </Button>
        </View>
      </ScrollView>

      <ConfirmationModal
        visible={deleteModalVisible}
        title="Delete Product"
        message={`Are you sure you want to delete "${product.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        confirmVariant="danger"
        icon="delete-alert"
        onConfirm={() => deleteMutation.mutate()}
        onCancel={() => setDeleteModalVisible(false)}
        loading={deleteMutation.isPending}
      />
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  scrollView: { flex: 1 },
  content: {},
  imageContainer: { position: 'relative' },
  productImage: { width: SCREEN_WIDTH, height: 250 },
  imagePlaceholder: {
    width: SCREEN_WIDTH,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noImageText: { fontSize: 13, marginTop: spacing[2] },
  imagePagination: {
    position: 'absolute',
    bottom: spacing[3],
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing[2],
  },
  paginationDot: { width: 8, height: 8, borderRadius: 4 },
  headerCard: {
    padding: spacing[4],
    marginHorizontal: spacing[4],
    marginTop: spacing[4],
    borderRadius: borderRadius.lg,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  badges: { flexDirection: 'row', gap: spacing[2] },
  sku: { fontSize: 12 },
  productName: { fontSize: 22, fontWeight: '600', marginBottom: spacing[2] },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', gap: spacing[2] },
  price: { fontSize: 24, fontWeight: '700' },
  originalPriceStrike: { fontSize: 16, textDecorationLine: 'line-through' },
  dealLabel: { paddingHorizontal: spacing[2], paddingVertical: 2, borderRadius: borderRadius.sm },
  dealLabelText: { fontSize: 12, fontWeight: '700', color: '#10B981' },
  tax: { fontSize: 14 },
  comparePrice: { fontSize: 13, marginTop: 4 },
  section: {
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    marginHorizontal: spacing[4],
    marginTop: spacing[4],
  },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: spacing[4] },
  expandableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stockCards: { flexDirection: 'row', gap: spacing[3] },
  stockCard: {
    flex: 1,
    alignItems: 'center',
    padding: spacing[3],
    borderRadius: borderRadius.md,
  },
  stockCardValue: { fontSize: 24, fontWeight: '700' },
  stockCardLabel: { fontSize: 12, marginTop: spacing[1] },
  movementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[2],
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: spacing[3],
  },
  movementIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: spacing[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
  },
  detailIcon: { marginRight: spacing[3], marginTop: 2 },
  detailContent: { flex: 1 },
  detailLabel: { fontSize: 12, marginBottom: spacing[1] },
  detailValue: { fontSize: 15 },
  description: { fontSize: 14, lineHeight: 22 },
  actionButtons: { gap: spacing[3], marginTop: spacing[4], marginHorizontal: spacing[4] },
  editButton: { borderRadius: borderRadius.md },
  deleteButton: { borderRadius: borderRadius.md },
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFoundText: { fontSize: 16, marginTop: spacing[4], textAlign: 'center', paddingHorizontal: spacing[6] },
});
