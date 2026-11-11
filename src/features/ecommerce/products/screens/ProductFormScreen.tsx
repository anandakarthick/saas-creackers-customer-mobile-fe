import React, { useEffect, useState } from 'react';
import { StyleSheet, View, ScrollView, KeyboardAvoidingView, Platform, Alert, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { Header } from '@/components/layout/Header';
import { FormInput, FormSelect, FormSwitch, FormImagePicker } from '@/components/forms';
import { useTheme } from '@/theme';
import { spacing, borderRadius } from '@/theme/spacing';
import { productsApi, categoriesApi } from '@/services/api';
import type { ProductsStackParamList } from '@/types/navigation';
import { SUPPORTED_LANGUAGES, autoTranslate } from '@/lib/i18n/languages';

/** An image value can be a server URL string or a local pick object */
type ImageValue = string | { uri: string; type: string; fileName: string };

interface ProductFormData {
  name: string;
  categoryId: string;
  shortDescription: string;
  description: string;
  price: number;
  comparePrice: number;
  costPrice: number;
  taxRate: number;
  gstInclusive: boolean;
  hsn: string;
  salesChannel: string;
  stock: number;
  sku: string;
  weight: number;
  weightUnit: string;
  featuredImage: ImageValue;
  additionalImages: ImageValue[];
  sortOrder: number;
  isActive: boolean;
  isFeatured: boolean;
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string;
}

type NavigationProp = NativeStackNavigationProp<ProductsStackParamList, 'ProductForm'>;
type RouteProps = RouteProp<ProductsStackParamList, 'ProductForm'>;

const WEIGHT_UNITS = [
  { label: 'Pieces (Pcs)', value: 'Pcs' },
  { label: 'Kilograms (kg)', value: 'kg' },
  { label: 'Grams (g)', value: 'g' },
  { label: 'Liters (L)', value: 'L' },
  { label: 'Milliliters (ml)', value: 'ml' },
  { label: 'Meters (m)', value: 'm' },
  { label: 'Box', value: 'Box' },
  { label: 'Pack', value: 'Pack' },
];

const SALES_CHANNELS = [
  { label: 'Both (Online + POS)', value: 'BOTH' },
  { label: 'Online Only', value: 'ONLINE' },
  { label: 'POS Only', value: 'POS' },
];

const productSchema = z.object({
  name: z.string().min(2, 'Product name is required'),
  categoryId: z.string().min(1, 'Category is required'),
  shortDescription: z.string().optional().default(''),
  description: z.string().optional().default(''),
  price: z.coerce.number().min(0.01, 'Price must be greater than 0'),
  comparePrice: z.coerce.number().min(0).default(0),
  costPrice: z.coerce.number().min(0).default(0),
  taxRate: z.coerce.number().min(0).default(0),
  gstInclusive: z.boolean().default(false),
  hsn: z.string().optional().default(''),
  salesChannel: z.string().default('BOTH'),
  stock: z.coerce.number().min(0, 'Stock cannot be negative').default(0),
  sku: z.string().optional().default(''),
  weight: z.coerce.number().min(0).default(0),
  weightUnit: z.string().default('Pcs'),
  featuredImage: z.any().optional(),
  additionalImages: z.array(z.any()).optional().default([]),
  sortOrder: z.coerce.number().min(0).default(0),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  metaTitle: z.string().optional().default(''),
  metaDescription: z.string().optional().default(''),
  metaKeywords: z.string().optional().default(''),
});

export const ProductFormScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [nameTranslations, setNameTranslations] = useState<Record<string, string>>({});
  const [translatingRow, setTranslatingRow] = useState<Record<string, boolean>>({});
  const [translatingAll, setTranslatingAll] = useState(false);

  const productId = route.params?.id;
  const isEdit = !!productId;
  const qc = useQueryClient();

  const { data: categoriesRaw = [] } = useQuery<any[]>({
    queryKey: ['categories', 'all'],
    queryFn: () => categoriesApi.getCategories(),
  });

  const { data: existingProduct } = useQuery<any>({
    queryKey: ['product', productId],
    queryFn: () => productsApi.getProduct(productId as any),
    enabled: isEdit,
  });

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
    watch,
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema) as any,
    defaultValues: {
      name: '',
      categoryId: '',
      shortDescription: '',
      description: '',
      price: 0,
      comparePrice: 0,
      costPrice: 0,
      taxRate: 0,
      gstInclusive: false,
      hsn: '',
      salesChannel: 'BOTH',
      stock: 0,
      sku: '',
      weight: 0,
      weightUnit: 'Pcs',
      featuredImage: '',
      additionalImages: [],
      sortOrder: 0,
      isActive: true,
      isFeatured: false,
      metaTitle: '',
      metaDescription: '',
      metaKeywords: '',
    },
  });

  useEffect(() => {
    if (existingProduct) {
      const imgs: string[] = Array.isArray(existingProduct.images)
        ? existingProduct.images.map((i: any) => (typeof i === 'string' ? i : i?.url)).filter(Boolean)
        : [];
      reset({
        name: existingProduct.name || '',
        categoryId: existingProduct.categoryId ? String(existingProduct.categoryId) : '',
        shortDescription: existingProduct.shortDescription || '',
        description: existingProduct.description || '',
        price: Number(existingProduct.price || 0),
        comparePrice: Number(existingProduct.comparePrice || existingProduct.compareAtPrice || 0),
        costPrice: Number(existingProduct.costPrice || existingProduct.purchasePrice || 0),
        taxRate: Number(existingProduct.gstPercent ?? existingProduct.taxRate ?? 0),
        gstInclusive: !!existingProduct.gstInclusive,
        hsn: existingProduct.hsn || '',
        salesChannel: existingProduct.salesChannel || 'BOTH',
        stock: Number(existingProduct.quantity ?? existingProduct.stock ?? 0),
        sku: existingProduct.sku || '',
        weight: Number(existingProduct.weight || 0),
        weightUnit: existingProduct.unit || 'Pcs',
        featuredImage: imgs[0] || '',
        additionalImages: imgs.slice(1),
        sortOrder: Number(existingProduct.sortOrder || 0),
        isActive: existingProduct.status !== 'INACTIVE' && existingProduct.isActive !== false,
        isFeatured: !!existingProduct.isFeatured,
        metaTitle: existingProduct.metaTitle || '',
        metaDescription: existingProduct.metaDescription || '',
        metaKeywords: existingProduct.metaKeywords || '',
      });
      if (existingProduct.nameTranslations && typeof existingProduct.nameTranslations === 'object') {
        setNameTranslations(existingProduct.nameTranslations as Record<string, string>);
      }
    }
  }, [existingProduct, reset]);

  const watchedName = watch('name');

  const handleTranslateRow = async (code: string) => {
    const baseName = watchedName?.trim();
    if (!baseName) {
      Alert.alert('Missing Name', 'Type a product name first');
      return;
    }
    setTranslatingRow((b) => ({ ...b, [code]: true }));
    try {
      const result = await autoTranslate(baseName, code);
      if (result.ok && result.text) {
        setNameTranslations((prev) => ({ ...prev, [code]: result.text }));
      } else {
        Alert.alert('Translation Failed', result.error || 'All providers failed. Type manually.');
      }
    } finally {
      setTranslatingRow((b) => ({ ...b, [code]: false }));
    }
  };

  const handleTranslateAll = async () => {
    const baseName = watchedName?.trim();
    if (!baseName) {
      Alert.alert('Missing Name', 'Type a product name first');
      return;
    }
    setTranslatingAll(true);
    try {
      const targets = SUPPORTED_LANGUAGES.filter(
        (l) => l.code !== 'en' && !nameTranslations[l.code]?.trim(),
      );
      const results = await Promise.all(
        targets.map(async (l) => ({ code: l.code, result: await autoTranslate(baseName, l.code) })),
      );
      const draft = { ...nameTranslations };
      let ok = 0;
      for (const { code, result } of results) {
        if (result.ok && result.text && result.text !== baseName) {
          draft[code] = result.text;
          ok++;
        }
      }
      setNameTranslations(draft);
      if (ok > 0) Alert.alert('Done', `Translated ${ok} language${ok > 1 ? 's' : ''}`);
      else Alert.alert('Failed', 'Could not translate. Type manually.');
    } finally {
      setTranslatingAll(false);
    }
  };

  const categoryOptions = categoriesRaw.map((c: any) => ({
    label: c.name,
    value: String(c.id),
  }));

  const submit = useMutation({
    mutationFn: (data: ProductFormData) => {
      // Collect all images — can be URL strings or { uri, type, fileName } objects
      const images = [data.featuredImage, ...(data.additionalImages || [])].filter(Boolean);
      const payload: any = {
        name: data.name.trim(),
        categoryId: data.categoryId ? Number(data.categoryId) : undefined,
        shortDesc: data.shortDescription || undefined,
        description: data.description || undefined,
        price: Number(data.price) || 0,
        comparePrice: Number(data.comparePrice) || 0,
        costPrice: Number(data.costPrice) || 0,
        gstPercent: Number(data.taxRate) || 0,
        gstInclusive: !!data.gstInclusive,
        hsn: data.hsn || undefined,
        salesChannel: data.salesChannel || 'BOTH',
        quantity: Number(data.stock) || 0,
        sku: data.sku || undefined,
        weight: Number(data.weight) || 0,
        unit: data.weightUnit || 'Pcs',
        images,
        sortOrder: Number(data.sortOrder) || 0,
        status: data.isActive ? 'ACTIVE' : 'INACTIVE',
        isFeatured: !!data.isFeatured,
        metaTitle: data.metaTitle || undefined,
        metaDescription: data.metaDescription || undefined,
        metaKeywords: data.metaKeywords || undefined,
        nameTranslations: Object.keys(nameTranslations).length > 0
          ? JSON.stringify(nameTranslations) : undefined,
      };
      return isEdit
        ? productsApi.updateProduct(productId as any, payload)
        : productsApi.createProduct(payload);
    },
    onSuccess: async () => {
      if (isEdit) await qc.invalidateQueries({ queryKey: ['product', productId] });
      qc.invalidateQueries({ queryKey: ['products'] });
      navigation.goBack();
    },
    onError: (e: any) => Alert.alert('Error', e?.message || 'Failed to save'),
  });

  const onSubmit = async (data: ProductFormData) => {
    setIsSubmitting(true);
    try { await submit.mutateAsync(data); } finally { setIsSubmitting(false); }
  };

  return (
    <ScreenWrapper scrollable={false}>
      <Header
        title={isEdit ? 'Edit Product' : 'Create Product'}
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
              label="Product Name *"
              placeholder="Enter product name"
            />

            <FormSelect
              name="categoryId"
              control={control}
              label="Category *"
              options={categoryOptions}
              placeholder="Select Category"
            />

            <FormInput
              name="shortDescription"
              control={control}
              label="Short Description"
              placeholder="Brief product description"
              multiline
              numberOfLines={2}
            />

            <FormInput
              name="description"
              control={control}
              label="Description *"
              placeholder="Detailed product description"
              multiline
              numberOfLines={4}
            />
          </View>

          {/* Regional Language Names */}
          <View style={[styles.section, { backgroundColor: colors.surface.default }]}>
            <View style={styles.translationHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.sectionTitle, { color: colors.text.primary, marginBottom: 0 }]}>
                  Regional Names
                </Text>
                <Text style={[styles.translationHint, { color: colors.text.tertiary }]}>
                  Optional — storefront shows translated names
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.translateAllBtn, { borderColor: '#8b5cf6' }]}
                onPress={handleTranslateAll}
                disabled={translatingAll || !watchedName?.trim()}
              >
                {translatingAll ? (
                  <ActivityIndicator size={14} color="#8b5cf6" />
                ) : (
                  <Icon name="auto-fix" size={14} color="#8b5cf6" />
                )}
                <Text style={styles.translateAllText}>Translate all</Text>
              </TouchableOpacity>
            </View>

            {SUPPORTED_LANGUAGES.filter((l) => l.code !== 'en').map((lang) => (
              <View key={lang.code} style={styles.translationRow}>
                <View style={styles.translationLabelCol}>
                  <Text style={[styles.translationNative, { color: colors.text.primary }]}>
                    {lang.flag} {lang.nativeLabel}
                  </Text>
                  <Text style={[styles.translationEnglish, { color: colors.text.tertiary }]}>
                    {lang.englishLabel}
                  </Text>
                </View>
                <TextInput
                  style={[styles.translationInput, { borderColor: colors.border.default, color: colors.text.primary }]}
                  value={nameTranslations[lang.code] || ''}
                  onChangeText={(t) => {
                    const draft = { ...nameTranslations };
                    if (t.trim()) draft[lang.code] = t;
                    else delete draft[lang.code];
                    setNameTranslations(draft);
                  }}
                  placeholder={`${lang.englishLabel} name...`}
                  placeholderTextColor={colors.text.tertiary}
                  editable={!translatingRow[lang.code]}
                />
                <TouchableOpacity
                  style={styles.translateRowBtn}
                  onPress={() => handleTranslateRow(lang.code)}
                  disabled={translatingRow[lang.code] || !watchedName?.trim()}
                >
                  {translatingRow[lang.code] ? (
                    <ActivityIndicator size={16} color="#8b5cf6" />
                  ) : (
                    <Icon name="auto-fix" size={18} color="#8b5cf6" />
                  )}
                </TouchableOpacity>
              </View>
            ))}
          </View>

          {/* Pricing & Stock */}
          <View style={[styles.section, { backgroundColor: colors.surface.default }]}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
              Pricing & Stock
            </Text>

            <View style={styles.row}>
              <View style={styles.halfField}>
                <FormInput
                  name="price"
                  control={control}
                  label="Selling Price (₹) *"
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                  leftIcon="currency-inr"
                />
              </View>
              <View style={styles.halfField}>
                <FormInput
                  name="comparePrice"
                  control={control}
                  label="Compare Price (₹)"
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                  leftIcon="currency-inr"
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={styles.halfField}>
                <FormInput
                  name="taxRate"
                  control={control}
                  label="GST Tax (%)"
                  placeholder="0"
                  keyboardType="numeric"
                />
              </View>
            </View>

            <FormSwitch
              name="gstInclusive"
              control={control}
              label="GST Inclusive"
              description="Price includes GST"
            />

            <FormInput
              name="hsn"
              control={control}
              label="HSN Code"
              placeholder="e.g. 36041000"
              maxLength={20}
            />

            <FormSelect
              name="salesChannel"
              control={control}
              label="Sales Channel"
              options={SALES_CHANNELS}
              placeholder="Select Channel"
            />

            <View style={styles.row}>
              <View style={styles.halfField}>
                <FormInput
                  name="stock"
                  control={control}
                  label="Stock *"
                  placeholder="0"
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.halfField}>
                <FormInput
                  name="sku"
                  control={control}
                  label="SKU"
                  placeholder="Product SKU"
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={styles.halfField}>
                <FormInput
                  name="weight"
                  control={control}
                  label="Weight"
                  placeholder="0"
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={styles.halfField}>
                <FormSelect
                  name="weightUnit"
                  control={control}
                  label="Weight Unit"
                  options={WEIGHT_UNITS}
                  placeholder="Select Unit"
                />
              </View>
            </View>
          </View>

          {/* Images */}
          <View style={[styles.section, { backgroundColor: colors.surface.default }]}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
              Product Images
            </Text>

            <FormImagePicker
              name="featuredImage"
              control={control}
              label="Featured Image"
              hint="Main product image"
            />

            <FormImagePicker
              name="additionalImages"
              control={control}
              label="Additional Images"
              multiple
              hint="You can select multiple images"
            />
          </View>

          {/* Settings */}
          <View style={[styles.section, { backgroundColor: colors.surface.default }]}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
              Settings
            </Text>

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
              description="Product will be visible in the store"
            />

            <FormSwitch
              name="isFeatured"
              control={control}
              label="Featured"
              description="Product will appear in featured section"
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
              onPress={handleSubmit(onSubmit, (validationErrors) => {
                const firstError = Object.values(validationErrors)[0];
                if (firstError?.message) {
                  Alert.alert('Validation Error', String(firstError.message));
                }
              })}
              style={[styles.submitButton, { backgroundColor: colors.primary.main }]}
              loading={isSubmitting}
              disabled={isSubmitting}
            >
              {isEdit ? 'Update Product' : 'Create Product'}
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
  row: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  halfField: {
    flex: 1,
  },
  translationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[3],
  },
  translationHint: {
    fontSize: 11,
    marginTop: 2,
  },
  translateAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
  },
  translateAllText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#8b5cf6',
  },
  translationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[2],
  },
  translationLabelCol: {
    width: 80,
  },
  translationNative: {
    fontSize: 12,
    fontWeight: '600',
  },
  translationEnglish: {
    fontSize: 10,
  },
  translationInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing[2],
    paddingVertical: Platform.OS === 'ios' ? spacing[2] : spacing[1],
    fontSize: 13,
  },
  translateRowBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
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
