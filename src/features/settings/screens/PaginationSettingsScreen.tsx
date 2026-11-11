import React, { useEffect, useState } from 'react';
import {
  StyleSheet, View, ScrollView, KeyboardAvoidingView, Platform, Alert,
  ActivityIndicator,
} from 'react-native';
import { Button, Text } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { Header } from '@/components/layout/Header';
import { FormInput, FormSwitch } from '@/components/forms';
import { useTheme } from '@/theme';
import { spacing, borderRadius } from '@/theme/spacing';
import { settingsApi } from '@/services/api';

interface PaginationFormData {
  frontendEnabled: boolean;
  productsPerPage: string;
  adminEnabled: boolean;
  recordsPerPage: string;
  showPerPageSelector: boolean;
}

export const PaginationSettingsScreen: React.FC = () => {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: settings, isLoading } = useQuery({
    queryKey: ['adminSettings'],
    queryFn: settingsApi.getAdminSettings,
  });

  const { control, handleSubmit, reset } = useForm<PaginationFormData>({
    defaultValues: {
      frontendEnabled: true,
      productsPerPage: '30',
      adminEnabled: true,
      recordsPerPage: '30',
      showPerPageSelector: true,
    },
  });

  useEffect(() => {
    if (settings) {
      const s = (settings as any)?.settings || settings;
      const pg = s?.pagination || {};
      reset({
        frontendEnabled: pg.frontendEnabled ?? true,
        productsPerPage: pg.productsPerPage?.toString() || '30',
        adminEnabled: pg.adminEnabled ?? true,
        recordsPerPage: pg.recordsPerPage?.toString() || '30',
        showPerPageSelector: pg.showPerPageSelector ?? true,
      });
    }
  }, [settings, reset]);

  const updateMutation = useMutation({
    mutationFn: (data: PaginationFormData) => {
      const s = (settings as any)?.settings || settings || {};
      return settingsApi.updateAdminSettings({
        settings: {
          ...s,
          pagination: {
            ...s.pagination,
            frontendEnabled: data.frontendEnabled,
            productsPerPage: parseInt(data.productsPerPage) || 30,
            adminEnabled: data.adminEnabled,
            recordsPerPage: parseInt(data.recordsPerPage) || 30,
            showPerPageSelector: data.showPerPageSelector,
          },
        },
      } as any);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['adminSettings'] });
      Alert.alert('Success', 'Pagination settings updated');
      navigation.goBack();
    },
    onError: (e: any) => Alert.alert('Error', e?.message || 'Failed to update pagination settings'),
  });

  const onSubmit = async (data: PaginationFormData) => {
    setIsSubmitting(true);
    try { await updateMutation.mutateAsync(data); } finally { setIsSubmitting(false); }
  };

  if (isLoading) {
    return (
      <ScreenWrapper>
        <Header title="Pagination" showBack />
        <View style={styles.loader}><ActivityIndicator size="large" color={colors.primary.main} /></View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper scrollable={false}>
      <Header title="Pagination" showBack />
      <KeyboardAvoidingView style={styles.keyboardView} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={styles.scrollView} contentContainerStyle={[styles.content, { paddingBottom: spacing[8] + insets.bottom }]} showsVerticalScrollIndicator={false}>

          {/* Frontend Pagination */}
          <View style={[styles.section, { backgroundColor: colors.surface.default }]}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Customer Storefront</Text>
            <FormSwitch name="frontendEnabled" control={control} label="Enable Pagination" description="Paginate products on customer-facing website" />
            <FormInput name="productsPerPage" control={control} label="Products Per Page" placeholder="30" keyboardType="numeric" leftIcon="view-grid-outline" />
          </View>

          {/* Admin Pagination */}
          <View style={[styles.section, { backgroundColor: colors.surface.default }]}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Admin Dashboard</Text>
            <FormSwitch name="adminEnabled" control={control} label="Enable Pagination" description="Paginate records in admin tables" />
            <FormInput name="recordsPerPage" control={control} label="Records Per Page" placeholder="30" keyboardType="numeric" leftIcon="table" />
            <FormSwitch name="showPerPageSelector" control={control} label="Show Per-Page Selector" description="Allow changing items per page in admin" />
          </View>

          <View style={styles.buttonContainer}>
            <Button mode="outlined" onPress={() => navigation.goBack()} style={styles.cancelButton} labelStyle={{ color: colors.text.primary }} disabled={isSubmitting}>Cancel</Button>
            <Button mode="contained" onPress={handleSubmit(onSubmit)} style={[styles.submitButton, { backgroundColor: colors.primary.main }]} loading={isSubmitting} disabled={isSubmitting}>Save Settings</Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  keyboardView: { flex: 1 },
  scrollView: { flex: 1 },
  content: { padding: spacing[4] },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  section: { borderRadius: borderRadius.lg, padding: spacing[4], marginBottom: spacing[4] },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: spacing[4] },
  buttonContainer: { flexDirection: 'row', gap: spacing[3], marginTop: spacing[2] },
  cancelButton: { flex: 1 },
  submitButton: { flex: 2 },
});
