import React, { useEffect, useState } from 'react';
import {
  StyleSheet, View, ScrollView, KeyboardAvoidingView, Platform, Alert,
  ActivityIndicator, TouchableOpacity,
} from 'react-native';
import { Button, Text } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { Header } from '@/components/layout/Header';
import { FormInput, FormSwitch, FormSelect } from '@/components/forms';
import { useTheme } from '@/theme';
import { spacing, borderRadius } from '@/theme/spacing';
import { settingsApi } from '@/services/api';

interface BillFormatFormData {
  templateId: string;
  defaultFormat: string;
  thermalEnabled: boolean;
  thermalWidth: string;
  autoCut: boolean;
  a4Enabled: boolean;
  paperOrientation: string;
  showLogo: boolean;
  showCompanyInfo: boolean;
  showGst: boolean;
  footerText: string;
}

const BILL_TEMPLATES = [
  { id: 'classic', name: 'Classic', desc: 'Traditional retail bill', colors: { primary: '#1f2937', accent: '#059669', headerBg: '#f3f4f6', border: '#000000' } },
  { id: 'modern', name: 'Modern', desc: 'Bright blue, softer grid', colors: { primary: '#3b82f6', accent: '#10b981', headerBg: '#eff6ff', border: '#cbd5e1' } },
  { id: 'minimal', name: 'Minimal', desc: 'Monochrome, no watermark', colors: { primary: '#000000', accent: '#374151', headerBg: '#ffffff', border: '#9ca3af' } },
  { id: 'boxed', name: 'Boxed', desc: 'Heavy borders, red accents', colors: { primary: '#1f2937', accent: '#dc2626', headerBg: '#e5e7eb', border: '#000000' } },
  { id: 'royal', name: 'Royal', desc: 'Purple + gold, luxury', colors: { primary: '#6b21a8', accent: '#d97706', headerBg: '#faf5ff', border: '#6b21a8' } },
  { id: 'eco', name: 'Eco', desc: 'Earthy emerald + brown', colors: { primary: '#047857', accent: '#b45309', headerBg: '#ecfdf5', border: '#10b981' } },
  { id: 'mono', name: 'Mono', desc: 'Cash-register tape look', colors: { primary: '#000000', accent: '#000000', headerBg: '#f9fafb', border: '#000000' } },
  { id: 'sunset', name: 'Sunset', desc: 'Warm orange + rose', colors: { primary: '#ea580c', accent: '#be123c', headerBg: '#fff7ed', border: '#fb923c' } },
  { id: 'ocean', name: 'Ocean', desc: 'Cool teal + sky blue', colors: { primary: '#0e7490', accent: '#0284c7', headerBg: '#ecfeff', border: '#22d3ee' } },
  { id: 'heritage', name: 'Heritage', desc: 'Burgundy + gold, serif', colors: { primary: '#9f1239', accent: '#92400e', headerBg: '#fef3c7', border: '#92400e' } },
];

const FORMAT_OPTIONS = [
  { label: 'Thermal', value: 'thermal' },
  { label: 'A4 Sheet', value: 'a4' },
];

const THERMAL_WIDTH_OPTIONS = [
  { label: '48 mm', value: '48' },
  { label: '57 mm', value: '57' },
  { label: '58 mm', value: '58' },
  { label: '72 mm', value: '72' },
  { label: '76 mm', value: '76' },
  { label: '80 mm', value: '80' },
  { label: '110 mm', value: '110' },
  { label: '112 mm', value: '112' },
];

const ORIENTATION_OPTIONS = [
  { label: 'Portrait', value: 'portrait' },
  { label: 'Landscape', value: 'landscape' },
];

export const BillFormatSettingsScreen: React.FC = () => {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('classic');

  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: settingsApi.getSettings,
  });

  const { control, handleSubmit, reset } = useForm<BillFormatFormData>({
    defaultValues: {
      templateId: 'classic',
      defaultFormat: 'thermal',
      thermalEnabled: false,
      thermalWidth: '80',
      autoCut: false,
      a4Enabled: false,
      paperOrientation: 'portrait',
      showLogo: false,
      showCompanyInfo: false,
      showGst: false,
      footerText: '',
    },
  });

  useEffect(() => {
    if (settings?.billFormat) {
      const b = settings.billFormat;
      const tid = b.templateId || 'classic';
      setSelectedTemplate(tid);
      reset({
        templateId: tid,
        defaultFormat: b.defaultFormat || 'thermal',
        thermalEnabled: b.thermalEnabled ?? false,
        thermalWidth: b.thermalWidth?.toString() || '80',
        autoCut: b.autoCut ?? false,
        a4Enabled: b.a4Enabled ?? false,
        paperOrientation: b.paperOrientation || 'portrait',
        showLogo: b.showLogo ?? false,
        showCompanyInfo: b.showCompanyInfo ?? false,
        showGst: b.showGst ?? false,
        footerText: b.footerText || '',
      });
    }
  }, [settings, reset]);

  const updateMutation = useMutation({
    mutationFn: (data: BillFormatFormData) =>
      settingsApi.updateSettings({
        ...settings,
        billFormat: { ...data, templateId: selectedTemplate },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings'] });
      Alert.alert('Success', 'Bill format settings updated');
      navigation.goBack();
    },
    onError: (e: any) => Alert.alert('Error', e?.message || 'Failed to update bill format settings'),
  });

  const onSubmit = async (data: BillFormatFormData) => {
    setIsSubmitting(true);
    try {
      await updateMutation.mutateAsync(data);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <ScreenWrapper>
        <Header title="Bill Format" showBack />
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={colors.primary.main} />
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper scrollable={false}>
      <Header title="Bill Format" showBack />

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.content, { paddingBottom: spacing[8] + insets.bottom }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Bill Template */}
          <View style={[styles.section, { backgroundColor: colors.surface.default }]}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
              Bill Template
            </Text>
            <Text style={[styles.sectionHint, { color: colors.text.tertiary }]}>
              Choose a visual style for your bills
            </Text>

            <View style={styles.templateGrid}>
              {BILL_TEMPLATES.map((t) => {
                const isSelected = selectedTemplate === t.id;
                return (
                  <TouchableOpacity
                    key={t.id}
                    style={[
                      styles.templateCard,
                      { borderColor: isSelected ? colors.primary.main : colors.border.default },
                      isSelected && { borderWidth: 2 },
                    ]}
                    onPress={() => setSelectedTemplate(t.id)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.templateSwatches}>
                      <View style={[styles.swatch, { backgroundColor: t.colors.primary }]} />
                      <View style={[styles.swatch, { backgroundColor: t.colors.accent }]} />
                      <View style={[styles.swatch, { backgroundColor: t.colors.headerBg, borderWidth: 1, borderColor: '#ddd' }]} />
                      <View style={[styles.swatch, { backgroundColor: t.colors.border }]} />
                    </View>
                    <Text style={[styles.templateName, { color: colors.text.primary }]} numberOfLines={1}>
                      {t.name}
                    </Text>
                    <Text style={[styles.templateDesc, { color: colors.text.tertiary }]} numberOfLines={1}>
                      {t.desc}
                    </Text>
                    {isSelected && (
                      <View style={[styles.templateCheck, { backgroundColor: colors.primary.main }]}>
                        <Icon name="check" size={12} color="#fff" />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Default Format */}
          <View style={[styles.section, { backgroundColor: colors.surface.default }]}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
              Default Format
            </Text>

            <FormSelect
              name="defaultFormat"
              control={control}
              label="Default Bill Format"
              options={FORMAT_OPTIONS}
              placeholder="Select format"
            />
          </View>

          {/* Thermal Settings */}
          <View style={[styles.section, { backgroundColor: colors.surface.default }]}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
              Thermal Printing
            </Text>

            <FormSwitch
              name="thermalEnabled"
              control={control}
              label="Enable Thermal"
              description="Allow thermal printer bill format"
            />

            <FormSelect
              name="thermalWidth"
              control={control}
              label="Thermal Paper Width"
              options={THERMAL_WIDTH_OPTIONS}
              placeholder="Select width"
            />

            <FormSwitch
              name="autoCut"
              control={control}
              label="Auto Cut"
              description="Automatically cut paper after printing"
            />
          </View>

          {/* A4 Settings */}
          <View style={[styles.section, { backgroundColor: colors.surface.default }]}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
              A4 Sheet
            </Text>

            <FormSwitch
              name="a4Enabled"
              control={control}
              label="Enable A4"
              description="Allow A4 sheet bill format"
            />

            <FormSelect
              name="paperOrientation"
              control={control}
              label="Paper Orientation"
              options={ORIENTATION_OPTIONS}
              placeholder="Select orientation"
            />
          </View>

          {/* Display Options */}
          <View style={[styles.section, { backgroundColor: colors.surface.default }]}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
              Display Options
            </Text>

            <FormSwitch
              name="showLogo"
              control={control}
              label="Show Logo"
              description="Display store logo on bills"
            />

            <FormSwitch
              name="showCompanyInfo"
              control={control}
              label="Show Company Info"
              description="Display company name and address"
            />

            <FormSwitch
              name="showGst"
              control={control}
              label="Show GST"
              description="Display GST number on bills"
            />
          </View>

          {/* Footer */}
          <View style={[styles.section, { backgroundColor: colors.surface.default }]}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
              Footer
            </Text>

            <FormInput
              name="footerText"
              control={control}
              label="Footer Text"
              placeholder="Thank you for your purchase!"
              multiline
              numberOfLines={3}
              leftIcon="text-box-outline"
            />
          </View>

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
              Save Settings
            </Button>
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
  section: {
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    marginBottom: spacing[4],
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: spacing[1],
  },
  sectionHint: {
    fontSize: 12,
    marginBottom: spacing[3],
  },
  templateGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  templateCard: {
    width: '48%' as any,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing[2],
    position: 'relative',
  },
  templateSwatches: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: spacing[1],
  },
  swatch: {
    width: 18,
    height: 18,
    borderRadius: 4,
  },
  templateName: {
    fontSize: 13,
    fontWeight: '600',
  },
  templateDesc: {
    fontSize: 10,
    marginTop: 1,
  },
  templateCheck: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: spacing[3],
    marginTop: spacing[2],
  },
  cancelButton: { flex: 1 },
  submitButton: { flex: 2 },
});
