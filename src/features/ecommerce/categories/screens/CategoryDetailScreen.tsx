import React, { useState } from 'react';
import { StyleSheet, View, ScrollView, Image, Alert, ActivityIndicator } from 'react-native';
import { Text, Button, Chip } from 'react-native-paper';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { Header } from '@/components/layout/Header';
import { Badge } from '@/components/common/Badge';
import { ConfirmationModal } from '@/components/common/ConfirmationModal';
import { useTheme } from '@/theme';
import { spacing, borderRadius } from '@/theme/spacing';
import { categoriesApi } from '@/services/api';
import { resolveImageUrl } from '@/utils/imageUrl';
import type { CategoriesStackParamList } from '@/types/navigation';

type NavigationProp = NativeStackNavigationProp<CategoriesStackParamList, 'CategoryDetail'>;
type RouteProps = RouteProp<CategoriesStackParamList, 'CategoryDetail'>;

interface DetailRowProps {
  label: string;
  value: string | React.ReactNode;
  icon?: string;
}

const DetailRow: React.FC<DetailRowProps> = ({ label, value, icon }) => {
  const { colors } = useTheme();

  return (
    <View style={styles.detailRow}>
      {icon && (
        <Icon name={icon} size={20} color={colors.neutral[400]} style={styles.detailIcon} />
      )}
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

function normalizeCategory(c: any) {
  return {
    id: String(c.id),
    name: c.name || '',
    slug: c.slug || '',
    description: c.description || '',
    image: resolveImageUrl(c.imageUrl || c.image),
    sortOrder: Number(c.sortOrder || 0),
    productCount: Number(c._count?.products ?? c.productCount ?? 0),
    parent: c.parent ? { id: String(c.parent.id), name: c.parent.name } : null,
    isActive: c.isActive !== false,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
}

export const CategoryDetailScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);

  const categoryId = route.params?.id;

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['category', categoryId],
    queryFn: () => categoriesApi.getCategory(categoryId),
    enabled: !!categoryId,
  });

  const deleteMutation = useMutation({
    mutationFn: () => categoriesApi.deleteCategory(categoryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setDeleteModalVisible(false);
      navigation.goBack();
    },
    onError: (err: any) => Alert.alert('Error', err?.message || 'Failed to delete'),
  });

  if (isLoading) {
    return (
      <ScreenWrapper>
        <Header title="Category" showBack />
        <View style={styles.notFound}>
          <ActivityIndicator size="large" color={colors.primary.main} />
        </View>
      </ScreenWrapper>
    );
  }

  if (isError || !data) {
    return (
      <ScreenWrapper>
        <Header title="Category Not Found" showBack />
        <View style={styles.notFound}>
          <Icon name="alert-circle-outline" size={64} color={colors.neutral[300]} />
          <Text style={[styles.notFoundText, { color: colors.text.secondary }]}>
            {isError ? String(error?.message || 'Failed to load') : 'Category not found'}
          </Text>
        </View>
      </ScreenWrapper>
    );
  }

  const category = normalizeCategory(data);
  const parentCategory = category.parent;

  const handleEdit = () => navigation.navigate('CategoryForm', { id: category.id });

  return (
    <ScreenWrapper scrollable={false}>
      <Header
        title="Category Details"
        showBack
        actions={[
          {
            icon: 'pencil',
            onPress: handleEdit,
          },
          {
            icon: 'delete',
            onPress: () => setDeleteModalVisible(true),
          },
        ]}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingBottom: spacing[8] + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Category Image & Name */}
        <View style={[styles.headerCard, { backgroundColor: colors.surface.default }]}>
          {category.image ? (
            <Image source={{ uri: category.image }} style={styles.categoryImage} />
          ) : (
            <View style={[styles.imagePlaceholder, { backgroundColor: colors.surface.variant }]}>
              <Icon name="shape-outline" size={48} color={colors.neutral[300]} />
            </View>
          )}

          <View style={styles.headerInfo}>
            <Text style={[styles.categoryName, { color: colors.text.primary }]}>
              {category.name}
            </Text>
            <Badge variant={category.isActive ? 'success' : 'default'}>
              {category.isActive ? 'Active' : 'Inactive'}
            </Badge>
          </View>
        </View>

        {/* Basic Information */}
        <View style={[styles.section, { backgroundColor: colors.surface.default }]}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
            Basic Information
          </Text>

          {parentCategory && (
            <DetailRow
              label="Parent Category"
              value={parentCategory.name}
              icon="folder-outline"
            />
          )}

          <DetailRow
            label="Description"
            value={category.description || 'No description'}
            icon="text"
          />

          <DetailRow
            label="Product Count"
            value={`${category.productCount} products`}
            icon="package-variant"
          />

          <DetailRow
            label="Sort Order"
            value={category.sortOrder.toString()}
            icon="sort-numeric-ascending"
          />

          <DetailRow
            label="Status"
            value={
              <Chip
                mode="flat"
                style={{
                  backgroundColor: category.isActive
                    ? colors.success.main + '20'
                    : colors.neutral[200],
                }}
                textStyle={{
                  color: category.isActive ? colors.success.dark : colors.text.secondary,
                  fontSize: 12,
                }}
              >
                {category.isActive ? 'Active' : 'Inactive'}
              </Chip>
            }
            icon="check-circle-outline"
          />
        </View>

        {/* Timestamps */}
        <View style={[styles.section, { backgroundColor: colors.surface.default }]}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
            Timestamps
          </Text>

          <DetailRow
            label="Created At"
            value={category.createdAt ? new Date(category.createdAt).toLocaleString() : '—'}
            icon="calendar-plus"
          />

          <DetailRow
            label="Updated At"
            value={category.updatedAt ? new Date(category.updatedAt).toLocaleString() : '—'}
            icon="calendar-edit"
          />
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <Button
            mode="outlined"
            onPress={handleEdit}
            style={styles.editButton}
            icon="pencil"
            labelStyle={{ color: colors.primary.main }}
          >
            Edit Category
          </Button>

          <Button
            mode="outlined"
            onPress={() => setDeleteModalVisible(true)}
            style={[styles.deleteButton, { borderColor: colors.error.main }]}
            icon="delete"
            labelStyle={{ color: colors.error.main }}
          >
            Delete Category
          </Button>
        </View>
      </ScrollView>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        visible={deleteModalVisible}
        title="Delete Category"
        message={`Are you sure you want to delete "${category.name}"? This action cannot be undone.`}
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
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing[4],
  },
  headerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    marginBottom: spacing[4],
  },
  categoryImage: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.md,
  },
  imagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: {
    flex: 1,
    marginLeft: spacing[4],
  },
  categoryName: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: spacing[2],
  },
  section: {
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    marginBottom: spacing[4],
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: spacing[4],
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: spacing[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
  },
  detailIcon: {
    marginRight: spacing[3],
    marginTop: 2,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    marginBottom: spacing[1],
  },
  detailValue: {
    fontSize: 15,
  },
  actionButtons: {
    gap: spacing[3],
    marginTop: spacing[2],
  },
  editButton: {
    borderRadius: borderRadius.md,
  },
  deleteButton: {
    borderRadius: borderRadius.md,
  },
  notFound: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notFoundText: {
    fontSize: 16,
    marginTop: spacing[4],
  },
});
