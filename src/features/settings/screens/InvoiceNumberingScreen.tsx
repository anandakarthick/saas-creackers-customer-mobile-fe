import React, { useEffect, useState } from 'react';
import {
  StyleSheet, View, ScrollView, KeyboardAvoidingView, Platform, Alert,
  ActivityIndicator,
} from 'react-native';
import { Button, Text } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Control, useForm } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { Header } from '@/components/layout/Header';
import { FormInput, FormSwitch, FormSelect } from '@/components/forms';
import { useTheme } from '@/theme';
import { spacing, borderRadius } from '@/theme/spacing';
import { settingsApi } from '@/services/api';

const ENTITY_TYPES = [
  { key: 'orders', title: 'Orders', defaultPrefix: 'ORD' },
  { key: 'pos', title: 'POS Sales', defaultPrefix: 'POS' },
  { key: 'estimate', title: 'Estimate', defaultPrefix: 'EST' },
  { key: 'customers', title: 'Customers', defaultPrefix: 'CUS' },
  { key: 'products', title: 'Products', defaultPrefix: 'PRD' },
  { key: 'users', title: 'Users', defaultPrefix: 'USR' },
] as const;

type EntityKey = (typeof ENTITY_TYPES)[number]['key'];

type NumberingFields = {
  [K in EntityKey as `${K}Prefix`]: string;
} & {
  [K in EntityKey as `${K}Separator`]: string;
} & {
  [K in EntityKey as `${K}Digits`]: string;
} & {
  [K in EntityKey as `${K}IncludeYear`]: boolean;
} & {
  [K in EntityKey as `${K}IncludeMonth`]: boolean;
};

const SEPARATOR_OPTIONS = [
  { label: '- (dash)', value: '-' },
  { label: '/ (slash)', value: '/' },
  { label: '. (dot)', value: '.' },
  { label: '_ (underscore)', value: '_' },
];

const DIGITS_OPTIONS = [
  { label: '3 digits', value: '3' },
  { label: '4 digits', value: '4' },
  { label: '5 digits', value: '5' },
  { label: '6 digits', value: '6' },
];

/* ── Reusable section for each entity type ──────────────── */

interface NumberingSectionProps {
  entityKey: EntityKey;
  title: string;
  control: Control<NumberingFields>;
  colors: any;
}

const NumberingSection: React.FC<NumberingSectionProps> = ({
  entityKey,
  title,
  control,
  colors,
}) => (
  <View style={[styles.section, { backgroundColor: colors.surface.default }]}>
    <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>{title}</Text>

    <FormInput
      name={`${entityKey}Prefix` as keyof NumberingFields}
      control={control}
      label="Prefix"
      placeholder="e.g. ORD"
      autoCapitalize="characters"
      leftIcon="tag-text-outline"
    />

    <FormSelect
      name={`${entityKey}Separator` as keyof NumberingFields}
      control={control}
      label="Separator"
      options={SEPARATOR_OPTIONS}
      placeholder="Select separator"
    />

    <FormSelect
      name={`${entityKey}Digits` as keyof NumberingFields}
      control={control}
      label="Number of Digits"
      options={DIGITS_OPTIONS}
      placeholder="Select digits"
    />

    <FormSwitch
      name={`${entityKey}IncludeYear` as keyof NumberingFields}
      control={control}
      label="Include Year"
      description="Add year to the numbering format"
    />

    <FormSwitch
      name={`${entityKey}IncludeMonth` as keyof NumberingFields}
      control={control}
      label="Include Month"
      description="Add month to the numbering format"
    />
  </View>
);

/* ── Main screen ────────────────────────────────────────── */

const buildDefaults = (): NumberingFields => {
  const defaults = {} as any;
  for (const entity of ENTITY_TYPES) {
    defaults[`${entity.key}Prefix`] = entity.defaultPrefix;
    defaults[`${entity.key}Separator`] = '-';
    defaults[`${entity.key}Digits`] = '4';
    defaults[`${entity.key}IncludeYear`] = false;
    defaults[`${entity.key}IncludeMonth`] = false;
  }
  return defaults as NumberingFields;
};

export const InvoiceNumberingScreen: React.FC = () => {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: settingsApi.getSettings,
  });

  const { control, handleSubmit, reset } = useForm<NumberingFields>({
    defaultValues: buildDefaults(),
  });

  useEffect(() => {
    if (settings?.invoiceNumbering) {
      const n = settings.invoiceNumbering;
      const vals = {} as any;
      for (const entity of ENTITY_TYPES) {
        vals[`${entity.key}Prefix`] = n[`${entity.key}Prefix`] || entity.defaultPrefix;
        vals[`${entity.key}Separator`] = n[`${entity.key}Separator`] || '-';
        vals[`${entity.key}Digits`] = n[`${entity.key}Digits`]?.toString() || '4';
        vals[`${entity.key}IncludeYear`] = n[`${entity.key}IncludeYear`] ?? false;
        vals[`${entity.key}IncludeMonth`] = n[`${entity.key}IncludeMonth`] ?? false;
      }
      reset(vals as NumberingFields);
    }
  }, [settings, reset]);

  const updateMutation = useMutation({
    mutationFn: (data: NumberingFields) =>
      settingsApi.updateSettings({
        ...settings,
        invoiceNumbering: data,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings'] });
      Alert.alert('Success', 'Invoice numbering settings updated');
      navigation.goBack();
    },
    onError: (e: any) =>
      Alert.alert('Error', e?.message || 'Failed to update invoice numbering settings'),
  });

  const onSubmit = async (data: NumberingFields) => {
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
        <Header title="Invoice Numbering" showBack />
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={colors.primary.main} />
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper scrollable={false}>
      <Header title="Invoice Numbering" showBack />

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.content, { paddingBottom: spacing[8] + insets.bottom }]}
          showsVerticalScrollIndicator={false}
        >
          {ENTITY_TYPES.map((entity) => (
            <NumberingSection
              key={entity.key}
              entityKey={entity.key}
              title={entity.title}
              control={control}
              colors={colors}
            />
          ))}

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
    marginBottom: spacing[4],
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: spacing[3],
    marginTop: spacing[2],
  },
  cancelButton: { flex: 1 },
  submitButton: { flex: 2 },
});
