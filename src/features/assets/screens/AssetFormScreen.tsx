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
import { FormInput, FormSelect } from '@/components/forms';
import { useTheme } from '@/theme';
import { spacing, borderRadius } from '@/theme/spacing';
import { assetsApi } from '@/services/api';
import type { AssetsStackParamList } from '@/types/navigation';

type Nav = NativeStackNavigationProp<AssetsStackParamList, 'AssetForm'>;
type RouteProps = RouteProp<AssetsStackParamList, 'AssetForm'>;

interface AssetFormData {
  name: string;
  assetTag: string;
  category: string;
  description: string;
  serialNumber: string;
  purchaseDate: string;
  purchasePrice: string;
  currentValue: string;
  salvageValue: string;
  depreciationMethod: string;
  depreciationRate: string;
  usefulLifeYears: string;
  location: string;
  status: string;
  vendorName: string;
  warrantyExpiresAt: string;
  notes: string;
}

const STATUS_OPTIONS = [
  { label: 'Active', value: 'ACTIVE' },
  { label: 'Under Maintenance', value: 'UNDER_MAINTENANCE' },
  { label: 'Disposed', value: 'DISPOSED' },
  { label: 'Sold', value: 'SOLD' },
  { label: 'Lost', value: 'LOST' },
];

const DEPRECIATION_OPTIONS = [
  { label: 'None', value: 'NONE' },
  { label: 'Straight Line', value: 'STRAIGHT_LINE' },
  { label: 'Reducing Balance', value: 'REDUCING_BALANCE' },
];

const Section: React.FC<{ title: string; children: React.ReactNode; colors: any }> = ({
  title, children, colors,
}) => (
  <View style={[styles.section, { backgroundColor: colors.surface.default }]}>
    <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>{title}</Text>
    {children}
  </View>
);

export const AssetFormScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteProps>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [submitting, setSubmitting] = useState(false);

  const id = route.params?.id;
  const isEdit = !!id;
  const qc = useQueryClient();

  const { data: existing } = useQuery<any>({
    queryKey: ['asset', id],
    queryFn: () => assetsApi.getAsset(id as any),
    enabled: isEdit,
  });

  const { control, handleSubmit, reset } = useForm<AssetFormData>({
    defaultValues: {
      name: '', assetTag: '', category: '', description: '', serialNumber: '',
      purchaseDate: '', purchasePrice: '', currentValue: '', salvageValue: '0',
      depreciationMethod: 'NONE', depreciationRate: '0', usefulLifeYears: '',
      location: '', status: 'ACTIVE', vendorName: '', warrantyExpiresAt: '', notes: '',
    },
  });

  useEffect(() => {
    if (existing) {
      reset({
        name: existing.name || '',
        assetTag: existing.assetTag || '',
        category: existing.category || '',
        description: existing.description || '',
        serialNumber: existing.serialNumber || '',
        purchaseDate: existing.purchaseDate || '',
        purchasePrice: String(existing.purchasePrice || ''),
        currentValue: String(existing.currentValue || ''),
        salvageValue: String(existing.salvageValue || '0'),
        depreciationMethod: existing.depreciationMethod || 'NONE',
        depreciationRate: String(existing.depreciationRate || '0'),
        usefulLifeYears: existing.usefulLifeYears ? String(existing.usefulLifeYears) : '',
        location: existing.location || '',
        status: existing.status || 'ACTIVE',
        vendorName: existing.vendorName || existing.supplierName || '',
        warrantyExpiresAt: existing.warrantyExpiresAt || '',
        notes: existing.notes || '',
      });
    }
  }, [existing, reset]);

  const submit = useMutation({
    mutationFn: (data: AssetFormData) => {
      const payload: any = {
        name: data.name.trim(),
        assetTag: data.assetTag.trim() || undefined,
        category: data.category.trim() || undefined,
        description: data.description.trim() || undefined,
        serialNumber: data.serialNumber.trim() || undefined,
        purchaseDate: data.purchaseDate || undefined,
        purchasePrice: Number(data.purchasePrice) || 0,
        currentValue: data.currentValue !== '' && data.currentValue != null ? Number(data.currentValue) : undefined,
        salvageValue: Number(data.salvageValue) || 0,
        depreciationMethod: data.depreciationMethod,
        depreciationRate: Number(data.depreciationRate) || 0,
        usefulLifeYears: data.usefulLifeYears ? Number(data.usefulLifeYears) : undefined,
        location: data.location.trim() || undefined,
        status: data.status,
        vendorName: data.vendorName.trim() || undefined,
        warrantyExpiresAt: data.warrantyExpiresAt || undefined,
        notes: data.notes.trim() || undefined,
      };
      return isEdit
        ? assetsApi.updateAsset(id as any, payload)
        : assetsApi.createAsset(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assets'] });
      navigation.goBack();
    },
    onError: (e: any) => Alert.alert('Error', e?.message || 'Failed to save'),
  });

  const onSubmit = async (data: AssetFormData) => {
    if (!data.name.trim()) { Alert.alert('Validation', 'Asset name is required'); return; }
    const price = Number((data as any).purchasePrice || (data as any).value);
    if (price !== undefined && price < 0) {
      Alert.alert('Validation', 'Purchase price cannot be negative'); return;
    }
    if ((data as any).depreciationRate) {
      const rate = Number((data as any).depreciationRate);
      if (rate < 0 || rate > 100) { Alert.alert('Validation', 'Depreciation rate must be between 0 and 100%'); return; }
    }
    if ((data as any).warrantyExpiry && (data as any).purchaseDate && (data as any).warrantyExpiry < (data as any).purchaseDate) {
      Alert.alert('Validation', 'Warranty expiry cannot be before purchase date'); return;
    }
    setSubmitting(true);
    try { await submit.mutateAsync(data); } finally { setSubmitting(false); }
  };

  return (
    <ScreenWrapper scrollable={false}>
      <Header title={isEdit ? 'Edit Asset' : 'New Asset'} showBack />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: spacing[8] + insets.bottom }]}>
          <Section title="Basic Info" colors={colors}>
            <FormInput name="name" control={control} label="Asset Name *" />
            <FormInput name="assetTag" control={control} label="Asset Tag" placeholder="Auto-generated if empty" />
            <FormSelect name="category" control={control} label="Category" options={[
              { label: 'Equipment', value: 'EQUIPMENT' },
              { label: 'Furniture', value: 'FURNITURE' },
              { label: 'Vehicle', value: 'VEHICLE' },
              { label: 'Electronics', value: 'ELECTRONICS' },
              { label: 'Real Estate', value: 'REAL_ESTATE' },
              { label: 'Software', value: 'SOFTWARE' },
              { label: 'Intangible', value: 'INTANGIBLE' },
              { label: 'Other', value: 'OTHER' },
            ]} />
            <FormInput name="serialNumber" control={control} label="Serial Number" />
            <FormInput name="description" control={control} label="Description" multiline numberOfLines={2} />
          </Section>

          <Section title="Financial" colors={colors}>
            <FormInput name="purchaseDate" control={control} label="Purchase Date" placeholder="YYYY-MM-DD" />
            <FormInput name="purchasePrice" control={control} label="Purchase Price *" keyboardType="decimal-pad" />
            <FormInput name="currentValue" control={control} label="Current Value" keyboardType="decimal-pad" />
            <FormInput name="salvageValue" control={control} label="Salvage Value" keyboardType="decimal-pad" />
          </Section>

          <Section title="Depreciation" colors={colors}>
            <FormSelect name="depreciationMethod" control={control} label="Method" options={DEPRECIATION_OPTIONS} />
            <View style={styles.row}>
              <View style={styles.half}>
                <FormInput name="depreciationRate" control={control} label="Rate (%)" keyboardType="decimal-pad" />
              </View>
              <View style={styles.half}>
                <FormInput name="usefulLifeYears" control={control} label="Useful Life (Yrs)" keyboardType="numeric" />
              </View>
            </View>
          </Section>

          <Section title="Status & Location" colors={colors}>
            <FormSelect name="status" control={control} label="Status" options={STATUS_OPTIONS} />
            <FormInput name="location" control={control} label="Location" />
            <FormInput name="vendorName" control={control} label="Vendor / Supplier" />
            <FormInput name="warrantyExpiresAt" control={control} label="Warranty Expires" placeholder="YYYY-MM-DD" />
          </Section>

          <Section title="Notes" colors={colors}>
            <FormInput name="notes" control={control} label="Notes" multiline numberOfLines={3} />
          </Section>

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
  scrollContent: { padding: spacing[4] },
  section: { borderRadius: borderRadius.lg, padding: spacing[4], marginBottom: spacing[3] },
  sectionTitle: { fontSize: 14, fontWeight: '700', marginBottom: spacing[3] },
  row: { flexDirection: 'row', gap: spacing[3] },
  half: { flex: 1 },
  buttonRow: { flexDirection: 'row', gap: spacing[3], marginTop: spacing[2] },
});
