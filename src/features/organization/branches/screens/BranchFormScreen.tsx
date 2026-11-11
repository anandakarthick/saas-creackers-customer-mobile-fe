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
import { FormInput, FormSwitch } from '@/components/forms';
import { useTheme } from '@/theme';
import { spacing, borderRadius } from '@/theme/spacing';
import { branchesApi } from '@/services/api';
import type { BranchesStackParamList } from '@/types/navigation';

interface BranchFormData {
  name: string;
  code: string;
  email: string;
  phone: string;
  isActive: boolean;
  isMainBranch: boolean;
  description: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  latitude: string;
  longitude: string;
  managerName: string;
  managerEmail: string;
  managerPhone: string;
}

type NavigationProp = NativeStackNavigationProp<BranchesStackParamList, 'BranchForm'>;
type RouteProps = RouteProp<BranchesStackParamList, 'BranchForm'>;

export const BranchFormScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const branchId = route.params?.id;
  const isEdit = !!branchId;
  const qc = useQueryClient();

  const { data: existingBranch } = useQuery<any>({
    queryKey: ['branch', branchId],
    queryFn: () => branchesApi.getBranch(branchId as any),
    enabled: isEdit,
  });

  const {
    control,
    handleSubmit,
    reset,
  } = useForm<BranchFormData>({
    defaultValues: {
      name: '',
      code: '',
      email: '',
      phone: '',
      isActive: true,
      isMainBranch: false,
      description: '',
      addressLine1: '',
      addressLine2: '',
      city: '',
      state: '',
      country: '',
      pincode: '',
      latitude: '',
      longitude: '',
      managerName: '',
      managerEmail: '',
      managerPhone: '',
    },
  });

  useEffect(() => {
    if (existingBranch) {
      reset({
        name: existingBranch.name || '',
        code: existingBranch.code || '',
        email: existingBranch.email || '',
        phone: existingBranch.phone || '',
        isActive: existingBranch.isActive !== false,
        isMainBranch: !!existingBranch.isMainBranch,
        description: existingBranch.description || '',
        addressLine1: existingBranch.addressLine1 || existingBranch.address?.line1 || '',
        addressLine2: existingBranch.addressLine2 || existingBranch.address?.line2 || '',
        city: existingBranch.city || existingBranch.address?.city || '',
        state: existingBranch.state || existingBranch.address?.state || '',
        country: existingBranch.country || existingBranch.address?.country || '',
        pincode: existingBranch.pincode || existingBranch.address?.pincode || '',
        latitude: existingBranch.latitude != null ? String(existingBranch.latitude) : '',
        longitude: existingBranch.longitude != null ? String(existingBranch.longitude) : '',
        managerName: existingBranch.managerName || '',
        managerEmail: existingBranch.managerEmail || '',
        managerPhone: existingBranch.managerPhone || '',
      });
    }
  }, [existingBranch, reset]);

  const submit = useMutation({
    mutationFn: (data: BranchFormData) => {
      const payload: any = {
        name: data.name.trim(),
        code: data.code.trim(),
        email: data.email || undefined,
        phone: data.phone || undefined,
        isActive: data.isActive,
        isMainBranch: data.isMainBranch,
        description: data.description || undefined,
        addressLine1: data.addressLine1 || undefined,
        addressLine2: data.addressLine2 || undefined,
        city: data.city || undefined,
        state: data.state || undefined,
        country: data.country || undefined,
        pincode: data.pincode || undefined,
        latitude: data.latitude ? Number(data.latitude) : undefined,
        longitude: data.longitude ? Number(data.longitude) : undefined,
        managerName: data.managerName || undefined,
        managerEmail: data.managerEmail || undefined,
        managerPhone: data.managerPhone || undefined,
      };
      return isEdit
        ? branchesApi.updateBranch(branchId as any, payload)
        : branchesApi.createBranch(payload);
    },
    onSuccess: async () => {
      if (isEdit) await qc.invalidateQueries({ queryKey: ['branch', branchId] });
      qc.invalidateQueries({ queryKey: ['branches'] });
      navigation.goBack();
    },
    onError: (e: any) => Alert.alert('Error', e?.message || 'Failed to save'),
  });

  const onSubmit = async (data: BranchFormData) => {
    if (!data.name.trim()) { Alert.alert('Validation', 'Branch name is required'); return; }
    if (!data.code.trim()) { Alert.alert('Validation', 'Branch code is required'); return; }
    setIsSubmitting(true);
    try { await submit.mutateAsync(data); } finally { setIsSubmitting(false); }
  };

  return (
    <ScreenWrapper scrollable={false}>
      <Header
        title={isEdit ? 'Edit Branch' : 'Create Branch'}
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
          {/* Basic Information */}
          <View style={[styles.section, { backgroundColor: colors.surface.default }]}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
              Basic Information
            </Text>

            <FormInput
              name="name"
              control={control}
              label="Branch Name *"
              placeholder="Enter branch name"
            />

            <FormInput
              name="code"
              control={control}
              label="Branch Code *"
              placeholder="BR002"
              autoCapitalize="characters"
            />

            <FormInput
              name="email"
              control={control}
              label="Branch Email"
              placeholder="branch@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <FormInput
              name="phone"
              control={control}
              label="Branch Phone"
              placeholder="+1234567890"
              keyboardType="phone-pad"
            />

            <FormSwitch
              name="isActive"
              control={control}
              label="Status"
              description="Branch is active and operational"
            />

            <FormSwitch
              name="isMainBranch"
              control={control}
              label="Main Branch"
              description="Set as the main/headquarters branch"
            />

            <FormInput
              name="description"
              control={control}
              label="Description"
              placeholder="Brief description about this branch"
              multiline
              numberOfLines={3}
            />
          </View>

          {/* Address Information */}
          <View style={[styles.section, { backgroundColor: colors.surface.default }]}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
              Address Information
            </Text>

            <FormInput
              name="addressLine1"
              control={control}
              label="Address"
              placeholder="Enter complete address"
              multiline
              numberOfLines={2}
            />

            <FormInput
              name="addressLine2"
              control={control}
              label="Address Line 2"
              placeholder="Apartment, suite, unit, etc. (optional)"
            />

            <View style={styles.row}>
              <View style={styles.halfField}>
                <FormInput
                  name="city"
                  control={control}
                  label="City"
                  placeholder="Enter city"
                />
              </View>
              <View style={styles.halfField}>
                <FormInput
                  name="state"
                  control={control}
                  label="State"
                  placeholder="Enter state"
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={styles.halfField}>
                <FormInput
                  name="country"
                  control={control}
                  label="Country"
                  placeholder="Enter country"
                />
              </View>
              <View style={styles.halfField}>
                <FormInput
                  name="pincode"
                  control={control}
                  label="Postal Code"
                  placeholder="Enter postal code"
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={styles.halfField}>
                <FormInput
                  name="latitude"
                  control={control}
                  label="Latitude"
                  placeholder="e.g., 40.7128"
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={styles.halfField}>
                <FormInput
                  name="longitude"
                  control={control}
                  label="Longitude"
                  placeholder="e.g., -74.0060"
                  keyboardType="decimal-pad"
                />
              </View>
            </View>
          </View>

          {/* Manager Information */}
          <View style={[styles.section, { backgroundColor: colors.surface.default }]}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
              Manager Information
            </Text>

            <FormInput
              name="managerName"
              control={control}
              label="Manager Name"
              placeholder="Enter manager name"
            />

            <FormInput
              name="managerEmail"
              control={control}
              label="Manager Email"
              placeholder="manager@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <FormInput
              name="managerPhone"
              control={control}
              label="Manager Phone"
              placeholder="+1234567890"
              keyboardType="phone-pad"
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
              {isEdit ? 'Update Branch' : 'Create Branch'}
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
