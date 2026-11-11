import React, { useEffect, useState } from 'react';
import { StyleSheet, View, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { Header } from '@/components/layout/Header';
import { FormInput, FormSelect, FormSwitch, FormImagePicker } from '@/components/forms';
import { useTheme } from '@/theme';
import { spacing, borderRadius } from '@/theme/spacing';
import { marketingApi } from '@/services/api';
import apiClient from '@/services/api/client';
import { ENDPOINTS } from '@/config/api';
import type { BannersStackParamList } from '@/types/navigation';

interface BannerFormData {
  title: string;
  image: any;
  link: string;
  position: string;
  sortOrder: string;
  isActive: boolean;
  startDate: string;
  endDate: string;
}

type NavigationProp = NativeStackNavigationProp<BannersStackParamList, 'BannerForm'>;
type RouteProps = RouteProp<BannersStackParamList, 'BannerForm'>;

const positionOptions = [
  { label: 'Home Top', value: 'HOME_TOP' },
  { label: 'Home Middle', value: 'HOME_MIDDLE' },
  { label: 'Home Bottom', value: 'HOME_BOTTOM' },
  { label: 'Category Page', value: 'CATEGORY' },
  { label: 'Product Page', value: 'PRODUCT' },
];

export const BannerFormScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const qc = useQueryClient();

  const bannerId = route.params?.id;
  const isEdit = !!bannerId;

  const { data: existingBanner } = useQuery({
    queryKey: ['banner', bannerId],
    queryFn: () => marketingApi.getBanner(bannerId!),
    enabled: isEdit,
  });

  const {
    control,
    handleSubmit,
    reset,
  } = useForm<BannerFormData>({
    defaultValues: {
      title: '',
      image: '',
      link: '',
      position: 'HOME_TOP',
      sortOrder: '0',
      isActive: true,
      startDate: '',
      endDate: '',
    },
  });

  useEffect(() => {
    if (existingBanner) {
      reset({
        title: existingBanner.title || '',
        image: existingBanner.imageUrl || '',
        link: existingBanner.linkUrl || '',
        position: existingBanner.position || 'HOME_TOP',
        sortOrder: String(existingBanner.sortOrder || 0),
        isActive: existingBanner.isActive ?? true,
        startDate: existingBanner.startsAt ? existingBanner.startsAt.split('T')[0] : '',
        endDate: existingBanner.endsAt ? existingBanner.endsAt.split('T')[0] : '',
      });
    }
  }, [existingBanner, reset]);

  const mutation = useMutation({
    mutationFn: async (data: BannerFormData) => {
      const formData = new FormData();
      formData.append('title', data.title.trim());
      if (data.link.trim()) formData.append('linkUrl', data.link.trim());
      formData.append('position', data.position);
      formData.append('sortOrder', data.sortOrder || '0');
      formData.append('isActive', String(data.isActive));
      if (data.startDate) formData.append('startsAt', data.startDate);
      if (data.endDate) formData.append('endsAt', data.endDate);

      if (data.image && typeof data.image === 'object' && data.image.uri) {
        formData.append('image', {
          uri: Platform.OS === 'android' ? data.image.uri : data.image.uri.replace('file://', ''),
          type: data.image.type || 'image/jpeg',
          name: data.image.fileName || `banner_${Date.now()}.jpg`,
        } as any);
      }

      const url = isEdit
        ? `${ENDPOINTS.BANNERS}/${bannerId}`
        : ENDPOINTS.BANNERS;

      const res = await apiClient({
        method: isEdit ? 'PUT' : 'POST',
        url,
        data: formData,
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      return res.data?.data ?? res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['banners'] });
      navigation.goBack();
    },
    onError: (e: any) => Alert.alert('Error', e?.message || 'Failed to save banner'),
  });

  const onSubmit = async (data: BannerFormData) => {
    if (!data.title.trim()) {
      Alert.alert('Validation', 'Banner title is required');
      return;
    }
    if (!isEdit && !(data.image && typeof data.image === 'object' && data.image.uri)) {
      Alert.alert('Validation', 'Banner image is required');
      return;
    }
    setIsSubmitting(true);
    try {
      await mutation.mutateAsync(data);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScreenWrapper scrollable={false}>
      <Header
        title={isEdit ? 'Edit Banner' : 'Create Banner'}
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
          {/* Banner Image */}
          <View style={[styles.section, { backgroundColor: colors.surface.default }]}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
              Banner Image
            </Text>

            <FormImagePicker
              name="image"
              control={control}
              label="Banner Image *"
              hint="Recommended size: 1200x400px"
            />
          </View>

          {/* Basic Info */}
          <View style={[styles.section, { backgroundColor: colors.surface.default }]}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
              Basic Information
            </Text>

            <FormInput
              name="title"
              control={control}
              label="Banner Title *"
              placeholder="Enter banner title"
            />

            <FormInput
              name="link"
              control={control}
              label="Link URL"
              placeholder="Enter destination URL (optional)"
              autoCapitalize="none"
            />

            <FormSelect
              name="position"
              control={control}
              label="Display Position *"
              options={positionOptions}
              placeholder="Select position"
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
              description="Banner will be visible to customers"
            />
          </View>

          {/* Schedule */}
          <View style={[styles.section, { backgroundColor: colors.surface.default }]}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
              Schedule (Optional)
            </Text>

            <FormInput
              name="startDate"
              control={control}
              label="Start Date"
              placeholder="YYYY-MM-DD"
            />

            <FormInput
              name="endDate"
              control={control}
              label="End Date"
              placeholder="YYYY-MM-DD"
            />

            <Text style={[styles.scheduleNote, { color: colors.text.tertiary }]}>
              Leave dates empty for the banner to display indefinitely when active.
            </Text>
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
              {isEdit ? 'Update Banner' : 'Create Banner'}
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
  scheduleNote: {
    fontSize: 12,
    marginTop: spacing[2],
    fontStyle: 'italic',
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
