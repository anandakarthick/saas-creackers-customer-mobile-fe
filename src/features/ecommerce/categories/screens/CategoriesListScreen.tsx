import React, { useState, useCallback } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Searchbar } from 'react-native-paper';
import { useQuery } from '@tanstack/react-query';
import { ScreenWrapper, Header } from '@/components/layout';
import { Badge, Empty, SafeAreaFAB } from '@/components/common';
import { useTheme } from '@/theme';
import { spacing, borderRadius } from '@/theme/spacing';
import { categoriesApi } from '@/services/api';
import { resolveImageUrl } from '@/utils/imageUrl';
import type { CategoriesStackParamList } from '@/types/navigation';

type NavigationProp = NativeStackNavigationProp<CategoriesStackParamList, 'CategoriesList'>;

interface CategoryRow {
  id: string;
  name: string;
  description?: string;
  image?: string;
  productCount: number;
  isActive: boolean;
}

function normalizeCategory(c: any): CategoryRow {
  return {
    id: String(c.id),
    name: c.name || '',
    description: c.description || '',
    image: resolveImageUrl(c.imageUrl || c.image),
    productCount: c._count?.products ?? c.productCount ?? 0,
    isActive: c.isActive !== false,
  };
}

export const CategoriesListScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { colors } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');

  const { data, isLoading, isError, error, isFetching, refetch } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.getCategories(),
  });

  const allCategories = (Array.isArray(data) ? data : (data as any)?.data || []).map(normalizeCategory);
  const filteredCategories = allCategories.filter((category) =>
    category.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [])
  );

  const onRefresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const handleCategoryPress = (category: CategoryRow) => {
    navigation.navigate('CategoryDetail', { id: category.id });
  };

  const handleAddCategory = () => {
    navigation.navigate('CategoryForm', {});
  };

  const renderCategory = ({ item }: { item: CategoryRow }) => (
    <TouchableOpacity
      style={[styles.categoryCard, { backgroundColor: colors.surface.default }]}
      onPress={() => handleCategoryPress(item)}
      activeOpacity={0.7}
    >
      <Image
        source={{ uri: item.image || 'https://via.placeholder.com/80' }}
        style={styles.categoryImage}
      />
      <View style={styles.categoryInfo}>
        <Text style={[styles.categoryName, { color: colors.text.primary }]}>{item.name}</Text>
        {item.description && (
          <Text style={[styles.categoryDescription, { color: colors.text.secondary }]} numberOfLines={2}>
            {item.description}
          </Text>
        )}
        <View style={styles.categoryMeta}>
          <View style={styles.productCount}>
            <Icon name="package-variant" size={14} color={colors.text.tertiary} />
            <Text style={[styles.productCountText, { color: colors.text.tertiary }]}>{item.productCount} products</Text>
          </View>
          <Badge variant={item.isActive ? 'success' : 'default'} size="small">
            {item.isActive ? 'Active' : 'Inactive'}
          </Badge>
        </View>
      </View>
      <Icon name="chevron-right" size={24} color={colors.neutral[400]} />
    </TouchableOpacity>
  );

  return (
    <ScreenWrapper scrollable={false} padding={false}>
      <Header
        title="Categories"
        subtitle={`${filteredCategories.length} categories`}
        showDrawer
      />

      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Search categories..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={[styles.searchBar, { backgroundColor: colors.surface.default }]}
          inputStyle={styles.searchInput}
        />
      </View>

      {isLoading ? (
        <View style={styles.loadingCenter}>
          <ActivityIndicator size="large" color={colors.primary.main} />
        </View>
      ) : isError ? (
        <Empty
          icon="cloud-alert"
          title="Couldn't load categories"
          description={String(error?.message || 'Check your connection')}
        />
      ) : (
        <FlatList
          data={filteredCategories}
          renderItem={renderCategory}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshing={isFetching}
          onRefresh={onRefresh}
          ListEmptyComponent={
            <Empty
              icon="shape-outline"
              title="No categories found"
              description="No categories match your search"
            />
          }
        />
      )}

      <SafeAreaFAB icon="plus" onPress={handleAddCategory} />
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
  categoryCard: {
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
  categoryImage: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.md,
  },
  categoryInfo: {
    flex: 1,
    marginLeft: spacing[3],
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  categoryDescription: {
    fontSize: 13,
    marginBottom: spacing[2],
  },
  categoryMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  productCount: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  productCountText: {
    fontSize: 12,
    marginLeft: spacing[1],
  },
  loadingCenter: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
