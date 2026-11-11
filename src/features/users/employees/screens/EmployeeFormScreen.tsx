import React, { useEffect, useState } from 'react';
import { StyleSheet, View, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Button, Text, Checkbox } from 'react-native-paper';
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
import { usersApi, branchesApi } from '@/services/api';
import type { EmployeesStackParamList } from '@/types/navigation';

interface EmployeeFormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  employeeId: string;
  phone: string;
  roleId: string;
  branchId: string;
  department: string;
  designation: string;
  joiningDate: string;
  salary: string;
  isActive: boolean;
  profileImage: string;
  // Permissions
  canUpdateBilling: boolean;
  canViewBilling: boolean;
}

type NavigationProp = NativeStackNavigationProp<EmployeesStackParamList, 'EmployeeForm'>;
type RouteProps = RouteProp<EmployeesStackParamList, 'EmployeeForm'>;

export const EmployeeFormScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const employeeId = route.params?.id;
  const isEdit = !!employeeId;
  const qc = useQueryClient();

  const { data: rolesRaw = [] } = useQuery<any[]>({
    queryKey: ['roles'],
    queryFn: () => usersApi.getRoles(),
  });
  const { data: branchesRes } = useQuery<any>({
    queryKey: ['branches', 'all'],
    queryFn: () => branchesApi.getBranches({ page: 1, limit: 200 }),
  });
  const branchesRaw: any[] = branchesRes?.data || [];

  const { data: existingEmployee } = useQuery<any>({
    queryKey: ['user', employeeId],
    queryFn: () => usersApi.getUser(employeeId as any),
    enabled: isEdit,
  });

  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
  } = useForm<EmployeeFormData>({
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      employeeId: '',
      phone: '',
      roleId: '',
      branchId: '',
      department: '',
      designation: '',
      joiningDate: '',
      salary: '',
      isActive: true,
      profileImage: '',
      canUpdateBilling: false,
      canViewBilling: false,
    },
  });

  const canUpdateBilling = watch('canUpdateBilling');
  const canViewBilling = watch('canViewBilling');

  useEffect(() => {
    if (existingEmployee) {
      reset({
        name: existingEmployee.name || '',
        email: existingEmployee.email || '',
        password: '',
        confirmPassword: '',
        employeeId: existingEmployee.employeeId || '',
        phone: existingEmployee.phone || '',
        roleId: existingEmployee.roleId ? String(existingEmployee.roleId) : '',
        branchId: existingEmployee.branchId ? String(existingEmployee.branchId) : '',
        department: existingEmployee.department || '',
        designation: existingEmployee.designation || '',
        joiningDate: existingEmployee.joiningDate || '',
        salary: existingEmployee.salary?.toString() || '',
        isActive: existingEmployee.isActive !== false,
        profileImage: existingEmployee.profileImage || existingEmployee.avatar || '',
        canUpdateBilling: !!existingEmployee.canUpdateBilling,
        canViewBilling: !!existingEmployee.canViewBilling,
      });
    }
  }, [existingEmployee, reset]);

  const roleOptions = rolesRaw.map((role: any) => ({
    label: role.name,
    value: String(role.id),
  }));

  const branchOptions = branchesRaw.map((branch: any) => ({
    label: branch.name,
    value: String(branch.id),
  }));

  const submit = useMutation({
    mutationFn: (data: EmployeeFormData) => {
      const payload: any = {
        name: data.name.trim(),
        email: data.email.trim(),
        phone: data.phone || undefined,
        employeeId: data.employeeId || undefined,
        roleId: data.roleId ? Number(data.roleId) : undefined,
        branchId: data.branchId ? Number(data.branchId) : null,
        department: data.department || undefined,
        designation: data.designation || undefined,
        joiningDate: data.joiningDate || undefined,
        salary: data.salary ? Number(data.salary) : undefined,
        isActive: data.isActive,
        profileImage: data.profileImage || undefined,
        canUpdateBilling: data.canUpdateBilling,
        canViewBilling: data.canViewBilling,
      };
      if (!isEdit) payload.password = data.password;
      return isEdit
        ? usersApi.updateUser(employeeId as any, payload)
        : usersApi.createUser(payload);
    },
    onSuccess: async () => {
      if (isEdit) await qc.invalidateQueries({ queryKey: ['user', employeeId] });
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      navigation.goBack();
    },
    onError: (e: any) => Alert.alert('Error', e?.message || 'Failed to save'),
  });

  const onSubmit = async (data: EmployeeFormData) => {
    if (!data.name.trim()) { Alert.alert('Validation', 'Name is required'); return; }
    if (!data.email.trim()) { Alert.alert('Validation', 'Email is required'); return; }
    if (!isEdit) {
      if (!data.password) { Alert.alert('Validation', 'Password is required'); return; }
      if (data.password !== data.confirmPassword) { Alert.alert('Validation', 'Passwords do not match'); return; }
    }
    setIsSubmitting(true);
    try { await submit.mutateAsync(data); } finally { setIsSubmitting(false); }
  };

  return (
    <ScreenWrapper scrollable={false}>
      <Header
        title={isEdit ? 'Edit Employee' : 'Add New Employee'}
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
              label="Full Name *"
              placeholder="Enter full name"
            />

            <FormInput
              name="email"
              control={control}
              label="Email *"
              placeholder="admin@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
            />

            {!isEdit && (
              <>
                <FormInput
                  name="password"
                  control={control}
                  label="Password *"
                  placeholder="Enter password"
                  secureTextEntry
                />

                <FormInput
                  name="confirmPassword"
                  control={control}
                  label="Confirm Password *"
                  placeholder="Confirm password"
                  secureTextEntry
                />
              </>
            )}

            <FormInput
              name="employeeId"
              control={control}
              label="Employee ID"
              placeholder="Auto-generated if left empty"
            />

            <FormInput
              name="phone"
              control={control}
              label="Phone Number"
              placeholder="+1234567890"
              keyboardType="phone-pad"
            />
          </View>

          {/* Role & Branch */}
          <View style={[styles.section, { backgroundColor: colors.surface.default }]}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
              Role & Assignment
            </Text>

            <FormSelect
              name="roleId"
              control={control}
              label="Role *"
              options={roleOptions}
              placeholder="Select Role"
            />

            <FormSelect
              name="branchId"
              control={control}
              label="Branch"
              options={branchOptions}
              placeholder="Select Branch"
            />

            <FormInput
              name="department"
              control={control}
              label="Department"
              placeholder="Enter department"
            />

            <FormInput
              name="designation"
              control={control}
              label="Designation"
              placeholder="Enter designation"
            />
          </View>

          {/* Employment Details */}
          <View style={[styles.section, { backgroundColor: colors.surface.default }]}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
              Employment Details
            </Text>

            <FormInput
              name="joiningDate"
              control={control}
              label="Hire Date"
              placeholder="dd-mm-yyyy"
            />

            <FormInput
              name="salary"
              control={control}
              label="Salary"
              placeholder="Enter salary"
              keyboardType="numeric"
            />

            <FormSwitch
              name="isActive"
              control={control}
              label="Status"
              description="Employee account is active"
            />
          </View>

          {/* Profile Picture */}
          <View style={[styles.section, { backgroundColor: colors.surface.default }]}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
              Profile Picture
            </Text>

            <FormImagePicker
              name="profileImage"
              control={control}
              label="Profile Picture"
              hint="Max file size: 2MB. Formats: JPG, PNG, GIF"
            />
          </View>

          {/* Individual Permissions */}
          <View style={[styles.section, { backgroundColor: colors.surface.default }]}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
              Individual Permissions
            </Text>
            <Text style={[styles.sectionDescription, { color: colors.text.secondary }]}>
              Grant additional permissions to this employee beyond their role permissions.
            </Text>

            {/* Billing Permissions */}
            <View style={[styles.permissionGroup, { borderColor: colors.border.default }]}>
              <Text style={[styles.permissionGroupTitle, { color: colors.text.primary }]}>
                Billing Permissions
              </Text>

              <View style={styles.checkboxRow}>
                <Checkbox
                  status={canUpdateBilling ? 'checked' : 'unchecked'}
                  onPress={() => setValue('canUpdateBilling', !canUpdateBilling)}
                  color={colors.primary.main}
                />
                <Text style={[styles.checkboxLabel, { color: colors.text.primary }]}>
                  Update Billing
                </Text>
              </View>

              <View style={styles.checkboxRow}>
                <Checkbox
                  status={canViewBilling ? 'checked' : 'unchecked'}
                  onPress={() => setValue('canViewBilling', !canViewBilling)}
                  color={colors.primary.main}
                />
                <Text style={[styles.checkboxLabel, { color: colors.text.primary }]}>
                  View Billing
                </Text>
              </View>
            </View>
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
              {isEdit ? 'Update Employee' : 'Create Employee'}
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
  sectionDescription: {
    fontSize: 13,
    marginBottom: spacing[4],
    marginTop: -spacing[2],
  },
  permissionGroup: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing[3],
    marginTop: spacing[2],
  },
  permissionGroupTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: spacing[2],
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing[1],
  },
  checkboxLabel: {
    fontSize: 14,
    marginLeft: spacing[1],
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
