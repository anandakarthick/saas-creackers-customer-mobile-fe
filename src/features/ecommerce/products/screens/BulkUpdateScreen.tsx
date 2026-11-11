import React, { useState, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Searchbar, Chip, Switch } from 'react-native-paper';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ScreenWrapper, Header } from '@/components/layout';
import { useTheme } from '@/theme';
import { spacing, borderRadius } from '@/theme/spacing';
import { formatCurrency } from '@/utils';
import { productsApi, categoriesApi } from '@/services/api';
import { safeImageUri } from '@/utils/imageUrl';
import type { ProductsStackParamList } from '@/types/navigation';

type NavigationProp = NativeStackNavigationProp<ProductsStackParamList, 'BulkUpdate'>;

interface EditableProduct {
  id: number;
  name: string;
  image: string | undefined;
  categoryId: number | null;
  categoryName: string;
  price: string;
  gstPercent: string;
  hsn: string;
  quantity: string;
  sortOrder: string;
  isActive: boolean;
  originalPrice: string;
  originalGstPercent: string;
  originalHsn: string;
  originalQuantity: string;
  originalSortOrder: string;
  originalIsActive: boolean;
}

function toEditable(p: any): EditableProduct {
  const rawImg = Array.isArray(p.images) && p.images.length > 0 ? p.images[0] : null;
  return {
    id: p.id,
    name: p.name || '',
    image: safeImageUri(rawImg),
    categoryId: p.categoryId || p.category?.id || null,
    categoryName: p.category?.name || '',
    price: String(p.price ?? ''),
    gstPercent: String(p.gstPercent ?? '0'),
    hsn: p.hsn || '',
    quantity: String(p.quantity ?? 0),
    sortOrder: String(p.sortOrder ?? 0),
    isActive: p.status === 'ACTIVE',
    originalPrice: String(p.price ?? ''),
    originalGstPercent: String(p.gstPercent ?? '0'),
    originalHsn: p.hsn || '',
    originalQuantity: String(p.quantity ?? 0),
    originalSortOrder: String(p.sortOrder ?? 0),
    originalIsActive: p.status === 'ACTIVE',
  };
}

function hasChanges(p: EditableProduct): boolean {
  return (
    p.price !== p.originalPrice ||
    p.gstPercent !== p.originalGstPercent ||
    p.hsn !== p.originalHsn ||
    p.quantity !== p.originalQuantity ||
    p.sortOrder !== p.originalSortOrder ||
    p.isActive !== p.originalIsActive
  );
}

export const BulkUpdateScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { colors } = useTheme();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [products, setProducts] = useState<EditableProduct[]>([]);
  const [initialized, setInitialized] = useState(false);

  const productsQuery = useQuery({
    queryKey: ['products', 'bulk-all'],
    queryFn: () => productsApi.getProducts({ page: 1, limit: 500 }),
  });

  const categoriesQuery = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.getCategories(),
  });

  if (!initialized && productsQuery.data?.data) {
    setProducts(productsQuery.data.data.map(toEditable));
    setInitialized(true);
  }

  const backendCategories = (categoriesQuery.data as any[]) || [];
  const categories = [
    { id: 'all', name: 'All Categories' },
    ...backendCategories.map((c: any) => ({ id: String(c.id), name: c.name })),
  ];

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (searchQuery && !p.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (selectedCategory !== 'all' && String(p.categoryId) !== selectedCategory) return false;
      return true;
    });
  }, [products, searchQuery, selectedCategory]);

  const changedCount = useMemo(() => products.filter(hasChanges).length, [products]);

  const updateField = useCallback((id: number, field: keyof EditableProduct, value: any) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)),
    );
  }, []);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const changed = products.filter(hasChanges);
      const payload = changed.map((p) => ({
        id: p.id,
        price: parseFloat(p.price) || undefined,
        gstPercent: parseFloat(p.gstPercent) || 0,
        hsn: p.hsn !== p.originalHsn ? (p.hsn || undefined) : undefined,
        quantity: parseInt(p.quantity, 10) || 0,
        sortOrder: parseInt(p.sortOrder, 10) || 0,
        status: p.isActive ? 'ACTIVE' : 'INACTIVE',
      }));
      return productsApi.bulkUpdateProducts(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      Alert.alert('Success', `${changedCount} products updated successfully`);
      navigation.goBack();
    },
    onError: (err: any) => {
      Alert.alert('Error', err?.message || 'Failed to update products');
    },
  });

  const handleSave = () => {
    if (changedCount === 0) {
      Alert.alert('No Changes', 'No products have been modified');
      return;
    }
    Alert.alert(
      'Confirm Update',
      `Save changes to ${changedCount} product(s)?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Save', onPress: () => saveMutation.mutate() },
      ],
    );
  };

  const renderProduct = ({ item }: { item: EditableProduct }) => {
    const changed = hasChanges(item);
    return (
      <View
        style={[
          styles.productRow,
          { backgroundColor: colors.surface.default },
          changed && { borderLeftWidth: 3, borderLeftColor: colors.primary.main },
        ]}
      >
        <View style={styles.productHeader}>
          <Image
            source={{ uri: item.image || 'https://via.placeholder.com/40' }}
            style={styles.thumbnail}
          />
          <View style={styles.nameContainer}>
            <Text style={[styles.productName, { color: colors.text.primary }]} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={[styles.categoryLabel, { color: colors.text.tertiary }]}>
              {item.categoryName || 'Uncategorized'}
            </Text>
          </View>
          <View style={styles.activeToggle}>
            <Switch
              value={item.isActive}
              onValueChange={(val) => updateField(item.id, 'isActive', val)}
              color={colors.primary.main}
            />
          </View>
        </View>

        <View style={styles.fieldsRow}>
          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: colors.text.tertiary }]}>Price</Text>
            <TextInput
              style={[styles.fieldInput, { color: colors.text.primary, borderColor: colors.border.default, backgroundColor: colors.surface.variant }]}
              value={item.price}
              onChangeText={(v) => updateField(item.id, 'price', v)}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor={colors.text.tertiary}
            />
          </View>
          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: colors.text.tertiary }]}>GST %</Text>
            <TextInput
              style={[styles.fieldInput, { color: colors.text.primary, borderColor: colors.border.default, backgroundColor: colors.surface.variant }]}
              value={item.gstPercent}
              onChangeText={(v) => updateField(item.id, 'gstPercent', v)}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor={colors.text.tertiary}
            />
          </View>
          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: colors.text.tertiary }]}>HSN</Text>
            <TextInput
              style={[styles.fieldInput, { color: colors.text.primary, borderColor: colors.border.default, backgroundColor: colors.surface.variant }]}
              value={item.hsn}
              onChangeText={(v) => updateField(item.id, 'hsn', v)}
              placeholder="HSN"
              placeholderTextColor={colors.text.tertiary}
              maxLength={20}
            />
          </View>
          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: colors.text.tertiary }]}>Stock</Text>
            <TextInput
              style={[styles.fieldInput, { color: colors.text.primary, borderColor: colors.border.default, backgroundColor: colors.surface.variant }]}
              value={item.quantity}
              onChangeText={(v) => updateField(item.id, 'quantity', v)}
              keyboardType="number-pad"
              placeholder="0"
              placeholderTextColor={colors.text.tertiary}
            />
          </View>
          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: colors.text.tertiary }]}>Sort</Text>
            <TextInput
              style={[styles.fieldInput, { color: colors.text.primary, borderColor: colors.border.default, backgroundColor: colors.surface.variant }]}
              value={item.sortOrder}
              onChangeText={(v) => updateField(item.id, 'sortOrder', v)}
              keyboardType="number-pad"
              placeholder="0"
              placeholderTextColor={colors.text.tertiary}
            />
          </View>
        </View>
      </View>
    );
  };

  const isLoading = productsQuery.isLoading || categoriesQuery.isLoading;

  return (
    <ScreenWrapper scrollable={false} padding={false}>
      <Header
        title="Bulk Update"
        subtitle={`${changedCount} changed`}
        onBack={() => navigation.goBack()}
        actions={[
          {
            icon: 'content-save',
            onPress: handleSave,
            disabled: changedCount === 0 || saveMutation.isPending,
          },
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

      {isLoading ? (
        <View style={styles.loadingCenter}>
          <ActivityIndicator size="large" color={colors.primary.main} />
        </View>
      ) : (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <FlatList
            data={filteredProducts}
            renderItem={renderProduct}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          />
        </KeyboardAvoidingView>
      )}

      {changedCount > 0 && (
        <TouchableOpacity
          style={[styles.saveBar, { backgroundColor: colors.primary.main }]}
          onPress={handleSave}
          disabled={saveMutation.isPending}
          activeOpacity={0.8}
        >
          {saveMutation.isPending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Icon name="content-save-outline" size={20} color="#fff" />
              <Text style={styles.saveBarText}>
                Save {changedCount} Product{changedCount !== 1 ? 's' : ''}
              </Text>
            </>
          )}
        </TouchableOpacity>
      )}
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
    padding: spacing[3],
    paddingBottom: spacing[20],
  },
  productRow: {
    borderRadius: borderRadius.lg,
    padding: spacing[3],
    marginBottom: spacing[2],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  productHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  thumbnail: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.sm,
  },
  nameContainer: {
    flex: 1,
    marginLeft: spacing[2],
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
  },
  categoryLabel: {
    fontSize: 11,
    marginTop: 1,
  },
  activeToggle: {
    marginLeft: spacing[2],
  },
  fieldsRow: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  fieldGroup: {
    flex: 1,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '500',
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  fieldInput: {
    borderWidth: 1,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing[2],
    paddingVertical: Platform.OS === 'ios' ? spacing[2] : spacing[1],
    fontSize: 14,
    textAlign: 'center',
  },
  loadingCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    gap: spacing[2],
    margin: spacing[3],
    borderRadius: borderRadius.lg,
  },
  saveBarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
