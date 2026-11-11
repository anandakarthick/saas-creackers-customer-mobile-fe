import React, { useEffect, useState } from 'react';
import { StyleSheet, View, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { Header } from '@/components/layout/Header';
import { FormInput, FormSelect, FormSwitch, FormImagePicker } from '@/components/forms';
import { useTheme } from '@/theme';
import { spacing, borderRadius } from '@/theme/spacing';
import { categoriesApi, marketingApi } from '@/services/api';
import type { CategoriesStackParamList } from '@/types/navigation';

interface CategoryFormData {
  name: string;
  parentId: string;
  description: string;
  image: any;
  sortOrder: number;
  isActive: boolean;
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string;
}

type NavigationProp = NativeStackNavigationProp<CategoriesStackParamList, 'CategoryForm'>;
type RouteProps = RouteProp<CategoriesStackParamList, 'CategoryForm'>;

export const CategoryFormScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const categoryId = route.params?.id;
  const isEdit = !!categoryId;
  const qc = useQueryClient();

  const { data: allCategories = [] } = useQuery<any[]>({
    queryKey: ['categories', 'all'],
    queryFn: () => categoriesApi.getCategories(),
  });

  const { data: existingCategory } = useQuery<any>({
    queryKey: ['category', categoryId],
    queryFn: () => categoriesApi.getCategory(categoryId as any),
    enabled: isEdit,
  });

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CategoryFormData>({
    defaultValues: {
      name: '',
      parentId: '',
      description: '',
      image: '',
      sortOrder: 0,
      isActive: true,
      metaTitle: '',
      metaDescription: '',
      metaKeywords: '',
    },
  });

  useEffect(() => {
    if (existingCategory) {
      reset({
        name: existingCategory.name || '',
        parentId: existingCategory.parentId ? String(existingCategory.parentId) : '',
        description: existingCategory.description || '',
        image: existingCategory.image || existingCategory.imageUrl || '',
        sortOrder: Number(existingCategory.sortOrder || 0),
        isActive: existingCategory.isActive !== false,
        metaTitle: existingCategory.metaTitle || '',
        metaDescription: existingCategory.metaDescription || '',
        metaKeywords: existingCategory.metaKeywords || '',
      });
    }
  }, [existingCategory, reset]);

  const parentCategoryOptions = allCategories
    .filter((c: any) => String(c.id) !== String(categoryId))
    .map((c: any) => ({ label: c.name, value: String(c.id) }));

  const submit = useMutation({
    mutationFn: async (data: CategoryFormData) => {
      let imageUrl: string | undefined;

      if (data.image && typeof data.image === 'object' && (data.image as any).uri) {
        const img = data.image as any;
        const uploaded = await marketingApi.uploadCategoryImage(
          Platform.OS === 'android' ? img.uri : img.uri.replace('file://', ''),
          img.fileName || `category_${Date.now()}.jpg`,
          img.type || 'image/jpeg',
        );
        imageUrl = (uploaded as any)?.imageUrl || (uploaded as any)?.url;
      } else if (typeof data.image === 'string' && (data.image.startsWith('http') || data.image.startsWith('/'))) {
        imageUrl = data.image;
      }

      const payload: any = {
        name: data.name.trim(),
        parentId: data.parentId ? Number(data.parentId) : null,
        description: data.description || undefined,
        imageUrl: imageUrl || undefined,
        sortOrder: Number(data.sortOrder) || 0,
        isActive: data.isActive,
        metaTitle: data.metaTitle || undefined,
        metaDescription: data.metaDescription || undefined,
        metaKeywords: data.metaKeywords || undefined,
      };
      return isEdit
        ? categoriesApi.updateCategory(categoryId as any, payload)
        : categoriesApi.createCategory(payload);
    },
    onSuccess: async () => {
      if (isEdit) await qc.invalidateQueries({ queryKey: ['category', categoryId] });
      qc.invalidateQueries({ queryKey: ['categories'] });
      navigation.goBack();
    },
    onError: (e: any) => Alert.alert('Error', e?.message || 'Failed to save'),
  });

  const onSubmit = async (data: CategoryFormData) => {
    if (!data.name.trim()) { Alert.alert('Validation', 'Name is required'); return; }
    setIsSubmitting(true);
    try { await submit.mutateAsync(data); } finally { setIsSubmitting(false); }
  };

  return (
    <ScreenWrapper scrollable={false}>
      <Header
        title={isEdit ? 'Edit Category' : 'Create Category'}
        showBack
      />

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.content, { paddingBottom: spacing[8] + insets.bottom }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Basic Info */}
          <View style={[styles.section, { backgroundColor: colors.surface.default }]}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
              Basic Information
            </Text>

            <FormInput
              name="name"
              control={control}
              label="Category Name *"
              placeholder="Enter category name"
            />

            <FormSelect
              name="parentId"
              control={control}
              label="Parent Category"
              options={[{ label: 'None (Top Level)', value: '' }, ...parentCategoryOptions]}
              placeholder="Select Parent Category (Optional)"
            />

            <FormInput
              name="description"
              control={control}
              label="Description"
              placeholder="Enter category description"
              multiline
              numberOfLines={3}
            />

            <FormImagePicker
              name="image"
              control={control}
              label="Category Image"
              hint="Recommended size: 400x300px"
            />

            <FormInput
              name="sortOrder"
              control={control}
              label="Sort Order"
              placeholder="0"
              keyboardType="numeric"
            />

            <FormSwitch
              name="isActive"
              control={control}
              label="Active"
              description="Category will be visible to customers"
            />
          </View>

          {/* SEO Settings */}
          <View style={[styles.section, { backgroundColor: colors.surface.default }]}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
              SEO Settings
            </Text>

            <FormInput
              name="metaTitle"
              control={control}
              label="Meta Title"
              placeholder="Enter meta title"
              maxLength={60}
            />

            <FormInput
              name="metaDescription"
              control={control}
              label="Meta Description"
              placeholder="Enter meta description"
              multiline
              numberOfLines={2}
              maxLength={160}
            />

            <FormInput
              name="metaKeywords"
              control={control}
              label="Meta Keywords"
              placeholder="keyword1, keyword2, keyword3"
            />
          </View>

          {/* Submit Button */}
          <View style={styles.buttonContainer}>
            <Button
              mode="outlined"
              onPress={() => navigation.goBack()}
              style={styles.cancelButton}
              labelStyle={{ color: colors.text.primary }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={handleSubmit(onSubmit)}
              style={[styles.submitButton, { backgroundColor: colors.primary.main }]}
              loading={isSubmitting}
              disabled={isSubmitting}
            >
              {isEdit ? 'Update Category' : 'Create Category'}
            </Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing[4],
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
  buttonContainer: {
    flexDirection: 'row',
    gap: spacing[3],
    marginTop: spacing[2],
  },
  cancelButton: {
    flex: 1,
  },
  submitButton: {
    flex: 2,
  },
});
