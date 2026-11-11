import React, { useEffect, useState } from 'react';
import { StyleSheet, View, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { ScreenWrapper, Header } from '@/components/layout';
import { FormInput, FormSelect, FormSwitch } from '@/components/forms';
import { useTheme } from '@/theme';
import { spacing, borderRadius } from '@/theme/spacing';
import { marketingApi } from '@/services/api';
import type { SocialMediaStackParamList } from '@/types/navigation';

type RouteProps = RouteProp<SocialMediaStackParamList, 'SocialMediaForm'>;

interface FormData {
  platform: string;
  url: string;
  sortOrder: string;
  isActive: boolean;
}

const platformOptions = [
  { label: 'Facebook', value: 'facebook' },
  { label: 'Instagram', value: 'instagram' },
  { label: 'Twitter / X', value: 'twitter' },
  { label: 'YouTube', value: 'youtube' },
  { label: 'LinkedIn', value: 'linkedin' },
  { label: 'WhatsApp', value: 'whatsapp' },
  { label: 'Telegram', value: 'telegram' },
  { label: 'Pinterest', value: 'pinterest' },
  { label: 'TikTok', value: 'tiktok' },
  { label: 'Other', value: 'other' },
];

export const SocialMediaFormScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProps>();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const qc = useQueryClient();
  const [submitting, setSubmitting] = useState(false);

  const id = route.params?.id;
  const isEdit = !!id;

  const { data: existing } = useQuery({
    queryKey: ['social-link', id],
    queryFn: () => marketingApi.getSocialLink(id as any),
    enabled: isEdit,
  });

  const { control, handleSubmit, reset } = useForm<FormData>({
    defaultValues: { platform: 'facebook', url: '', sortOrder: '0', isActive: true },
  });

  useEffect(() => {
    if (existing) {
      reset({
        platform: existing.platform || 'facebook',
        url: existing.url || '',
        sortOrder: String(existing.sortOrder ?? 0),
        isActive: existing.isActive !== false,
      });
    }
  }, [existing, reset]);

  const submit = useMutation({
    mutationFn: (data: FormData) => {
      const payload = {
        platform: data.platform,
        url: data.url.trim(),
        sortOrder: Number(data.sortOrder) || 0,
        isActive: data.isActive,
      };
      return isEdit
        ? marketingApi.updateSocialLink(id as any, payload)
        : marketingApi.createSocialLink(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['social-links'] });
      navigation.goBack();
    },
    onError: (e: any) => Alert.alert('Error', e?.message || 'Failed to save'),
  });

  const onSubmit = async (data: FormData) => {
    if (!data.url.trim()) { Alert.alert('Validation', 'URL is required'); return; }
    try { new URL(data.url.trim()); } catch { Alert.alert('Validation', 'Please enter a valid URL'); return; }
    setSubmitting(true);
    try { await submit.mutateAsync(data); } finally { setSubmitting(false); }
  };

  return (
    <ScreenWrapper scrollable={false}>
      <Header title={isEdit ? 'Edit Social Link' : 'New Social Link'} showBack />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: spacing[8] + insets.bottom }]}>
          <View style={[styles.section, { backgroundColor: colors.surface.default }]}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Link Details</Text>
            <FormSelect name="platform" control={control} label="Platform *" options={platformOptions} />
            <FormInput name="url" control={control} label="URL *" placeholder="https://..." autoCapitalize="none" />
            <FormInput name="sortOrder" control={control} label="Sort Order" keyboardType="numeric" />
            <FormSwitch name="isActive" control={control} label="Active" />
          </View>

          <View style={styles.buttonRow}>
            <Button mode="outlined" onPress={() => navigation.goBack()} style={{ flex: 1 }}>Cancel</Button>
            <Button
              mode="contained"
              onPress={handleSubmit(onSubmit)}
              loading={submitting}
              disabled={submitting}
              style={{ flex: 2 }}
            >
              {isEdit ? 'Update' : 'Create'}
            </Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  content: { padding: spacing[4] },
  section: {
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    marginBottom: spacing[3],
  },
  sectionTitle: { fontSize: 14, fontWeight: '700', marginBottom: spacing[3] },
  buttonRow: { flexDirection: 'row', gap: spacing[3], marginTop: spacing[2] },
});
