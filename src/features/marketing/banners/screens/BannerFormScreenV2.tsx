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
import { marketingApi } from '@/services/api';
import type { BannersStackParamList } from '@/types/navigation';

interface BannerFormData {
  title: string;
  image: string;
  link: string;
  position: string;
  sortOrder: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

type NavigationProp = NativeStackNavigationProp<BannersStackParamList, 'BannerForm'>;
type RouteProps = RouteProp<BannersStackParamList, 'BannerForm'>;

const POSITION_OPTIONS = [
  { label: 'Home Top', value: 'HOME_TOP' },
  { label: 'Home Middle', value: 'HOME_MIDDLE' },
  { label: 'Home Bottom', value: 'HOME_BOTTOM' },
  { label: 'Category', value: 'CATEGORY' },
  { label: 'Product', value: 'PRODUCT' },
];

export const BannerFormScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [submitting, setSubmitting] = useState(false);

  const id = route.params?.id;
  const isEdit = !!id;
  const qc = useQueryClient();

  const { data: existing } = useQuery<any>({
    queryKey: ['banner', id],
    queryFn: () => marketingApi.getBanner(id as any),
    enabled: isEdit,
  });

  const { control, handleSubmit, reset } = useForm<BannerFormData>({
    defaultValues: {
      title: '',
      image: '',
      link: '',
      position: 'HOME_TOP',
      sortOrder: 0,
      startDate: '',
      endDate: '',
      isActive: true,
    },
  });

  useEffect(() => {
    if (existing) {
      reset({
        title: existing.title || '',
        image: existing.imageUrl || existing.image || '',
        link: existing.link || existing.linkUrl || '',
        position: existing.position || 'home',
        sortOrder: Number(existing.sortOrder || 0),
        startDate: existing.startsAt ? String(existing.startsAt).slice(0, 10) : existing.startDate ? String(existing.startDate).slice(0, 10) : '',
        endDate: existing.expiresAt ? String(existing.expiresAt).slice(0, 10) : existing.endsAt ? String(existing.endsAt).slice(0, 10) : existing.endDate ? String(existing.endDate).slice(0, 10) : '',
        isActive: existing.isActive !== false,
      });
    }
  }, [existing, reset]);

  const submit = useMutation({
    mutationFn: (data: BannerFormData) => {
      const payload: any = {
        title: data.title.trim(),
        imageUrl: data.image || undefined,
        link: data.link || undefined,
        position: data.position,
        sortOrder: Number(data.sortOrder) || 0,
        startsAt: data.startDate || undefined,
        expiresAt: data.endDate || undefined,
        isActive: data.isActive,
      };
      return isEdit
        ? marketingApi.updateBanner(id as any, payload)
        : marketingApi.createBanner(payload);
    },
    onSuccess: async () => {
      if (isEdit) await qc.invalidateQueries({ queryKey: ['banner', id] });
      qc.invalidateQueries({ queryKey: ['banners'] });
      navigation.goBack();
    },
    onError: (e: any) => Alert.alert('Error', e?.message || 'Failed to save banner'),
  });

  const onSubmit = async (data: BannerFormData) => {
    if (!data.title.trim()) { Alert.alert('Validation', 'Title is required'); return; }
    if (!data.image) { Alert.alert('Validation', 'Image is required'); return; }
    if (data.startDate && data.endDate && data.endDate < data.startDate) {
      Alert.alert('Validation', 'End date cannot be before start date'); return;
    }
    setSubmitting(true);
    try { await submit.mutateAsync(data); } finally { setSubmitting(false); }
  };

  return (
    <ScreenWrapper scrollable={false}>
      <Header title={isEdit ? 'Edit Banner' : 'New Banner'} showBack />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: spacing[8] + insets.bottom }]}
        >
          <Section title="Banner Image" colors={colors}>
            <FormImagePicker name="image" control={control} label="Image *" />
          </Section>

          <Section title="Details" colors={colors}>
            <FormInput name="title" control={control} label="Title *" />
            <FormInput
              name="link"
              control={control}
              label="Link URL"
              placeholder="/offers"
              autoCapitalize="none"
            />
            <FormSelect
              name="position"
              control={control}
              label="Position *"
              options={POSITION_OPTIONS}
            />
            <FormInput
              name="sortOrder"
              control={control}
              label="Sort Order"
              placeholder="0"
              keyboardType="numeric"
            />
          </Section>

          <Section title="Schedule" colors={colors}>
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
            <FormSwitch name="isActive" control={control} label="Active" />
          </Section>

          <View style={styles.buttonRow}>
            <Button mode="outlined" onPress={() => navigation.goBack()} style={{ flex: 1 }}>
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={handleSubmit(onSubmit)}
              loading={submitting}
              disabled={submitting}
              style={{ flex: 2 }}
            >
              {isEdit ? 'Update' : 'Create Banner'}
            </Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
};

const Section: React.FC<{ title: string; children: React.ReactNode; colors: any }> = ({
  title,
  children,
  colors,
}) => (
  <View style={[styles.section, { backgroundColor: colors.surface.default }]}>
    <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>{title}</Text>
    {children}
  </View>
);

const styles = StyleSheet.create({
  content: { padding: spacing[4] },
  section: { borderRadius: borderRadius.lg, padding: spacing[4], marginBottom: spacing[3] },
  sectionTitle: { fontSize: 14, fontWeight: '700', marginBottom: spacing[3] },
  buttonRow: { flexDirection: 'row', gap: spacing[3], marginTop: spacing[2] },
});
