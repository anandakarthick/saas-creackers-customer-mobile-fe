import React, { useState } from 'react';
import { StyleSheet, View, ScrollView, Alert, Linking, ActivityIndicator } from 'react-native';
import { Text, Button, Chip } from 'react-native-paper';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { Header } from '@/components/layout/Header';
import { Avatar, Badge } from '@/components/common';
import { ConfirmationModal } from '@/components/common/ConfirmationModal';
import { useTheme } from '@/theme';
import { spacing, borderRadius } from '@/theme/spacing';
import { usersApi } from '@/services/api';
import { formatPhoneNumber, formatCurrency } from '@/utils';
import type { EmployeesStackParamList } from '@/types/navigation';

type NavigationProp = NativeStackNavigationProp<EmployeesStackParamList, 'EmployeeDetail'>;
type RouteProps = RouteProp<EmployeesStackParamList, 'EmployeeDetail'>;

interface DetailRowProps {
  label: string;
  value: string | React.ReactNode;
  icon?: string;
}

const DetailRow: React.FC<DetailRowProps> = ({ label, value, icon }) => {
  const { colors } = useTheme();

  return (
    <View style={styles.detailRow}>
      {icon && (
        <Icon name={icon} size={20} color={colors.neutral[400]} style={styles.detailIcon} />
      )}
      <View style={styles.detailContent}>
        <Text style={[styles.detailLabel, { color: colors.text.secondary }]}>{label}</Text>
        {typeof value === 'string' ? (
          <Text style={[styles.detailValue, { color: colors.text.primary }]}>{value}</Text>
        ) : (
          value
        )}
      </View>
    </View>
  );
};

function normalizeEmployee(e: any) {
  return {
    id: String(e.id),
    name: e.name || `${e.firstName || ''} ${e.lastName || ''}`.trim() || e.email || 'User',
    email: e.email || '',
    phone: e.phone || '',
    role: e.role || null,
    branchId: e.branchId,
    branch: e.branch || null,
    isActive: e.isActive !== false,
    salary: e.salary,
    joinedDate: e.joinedDate || e.createdAt,
    address: e.address,
  };
}

export const EmployeeDetailScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);

  const employeeId = route.params.id;

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['employee', employeeId],
    queryFn: () => usersApi.getUser(employeeId),
    enabled: !!employeeId,
  });

  const resetPasswordMutation = useMutation({
    mutationFn: () => usersApi.resetUserPassword(employeeId),
    onSuccess: () =>
      Alert.alert('Password Reset', 'A password reset has been triggered for this employee.'),
    onError: (err: any) =>
      Alert.alert('Error', err?.message || 'Failed to reset password'),
  });

  const handleResetPassword = () => {
    Alert.alert(
      'Reset Password',
      'Are you sure you want to reset this employee\'s password?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reset', style: 'destructive', onPress: () => resetPasswordMutation.mutate() },
      ],
    );
  };

  const deleteMutation = useMutation({
    mutationFn: () => usersApi.deleteUser(employeeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setDeleteModalVisible(false);
      navigation.goBack();
    },
    onError: (err: any) => Alert.alert('Error', err?.message || 'Failed to delete'),
  });

  if (isLoading) {
    return (
      <ScreenWrapper>
        <Header title="Employee" showBack />
        <View style={styles.notFound}>
          <ActivityIndicator size="large" color={colors.primary.main} />
        </View>
      </ScreenWrapper>
    );
  }

  if (isError || !data) {
    return (
      <ScreenWrapper>
        <Header title="Employee Not Found" showBack />
        <View style={styles.notFound}>
          <Icon name="alert-circle-outline" size={64} color={colors.neutral[300]} />
          <Text style={[styles.notFoundText, { color: colors.text.secondary }]}>
            {isError ? String(error?.message || 'Failed to load') : 'Employee not found'}
          </Text>
        </View>
      </ScreenWrapper>
    );
  }

  const employee = normalizeEmployee(data);

  const handleEdit = () => navigation.navigate('EmployeeForm', { id: employee.id });
  const handleCall = () => employee.phone && Linking.openURL(`tel:${employee.phone}`);
  const handleEmail = () => employee.email && Linking.openURL(`mailto:${employee.email}`);

  return (
    <ScreenWrapper scrollable={false}>
      <Header
        title="Employee Details"
        showBack
        actions={[
          {
            icon: 'pencil',
            onPress: handleEdit,
          },
          {
            icon: 'delete',
            onPress: () => setDeleteModalVisible(true),
          },
        ]}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingBottom: spacing[8] + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Employee Header */}
        <View style={[styles.headerCard, { backgroundColor: colors.surface.default }]}>
          <Avatar name={employee.name} size="xlarge" />

          <View style={styles.headerInfo}>
            <Text style={[styles.employeeName, { color: colors.text.primary }]}>
              {employee.name}
            </Text>
            <Text style={[styles.employeeId, { color: colors.text.secondary }]}>
              {(employee as any).employeeId || employee.email}
            </Text>
            <View style={styles.badgeRow}>
              <Badge variant={employee.isActive ? 'success' : 'error'}>
                {employee.isActive ? 'Active' : 'Inactive'}
              </Badge>
              {employee.role && (
                <Chip
                  mode="flat"
                  style={{ backgroundColor: colors.primary.light + '20' }}
                  textStyle={{ color: colors.primary.main, fontSize: 12 }}
                  icon="shield-account"
                >
                  {employee.role.name}
                </Chip>
              )}
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <Button
            mode="outlined"
            icon="phone"
            onPress={handleCall}
            style={[styles.quickActionButton, { borderColor: colors.primary.main }]}
            labelStyle={{ color: colors.primary.main }}
          >
            Call
          </Button>
          <Button
            mode="outlined"
            icon="email"
            onPress={handleEmail}
            style={[styles.quickActionButton, { borderColor: colors.primary.main }]}
            labelStyle={{ color: colors.primary.main }}
          >
            Email
          </Button>
        </View>

        {/* Contact Information */}
        <View style={[styles.section, { backgroundColor: colors.surface.default }]}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
            Contact Information
          </Text>

          <DetailRow
            label="Email"
            value={employee.email}
            icon="email"
          />

          <DetailRow
            label="Phone"
            value={formatPhoneNumber(employee.phone)}
            icon="phone"
          />

          {employee.address && (
            <DetailRow
              label="Address"
              value={`${employee.address.line1}, ${employee.address.city}, ${employee.address.state} ${employee.address.pincode}`}
              icon="map-marker"
            />
          )}
        </View>

        {/* Employment Information */}
        <View style={[styles.section, { backgroundColor: colors.surface.default }]}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
            Employment Information
          </Text>

          <DetailRow
            label="Employee ID"
            value={(employee as any).employeeId || employee.email}
            icon="badge-account"
          />

          <DetailRow
            label="Role"
            value={employee.role?.name || 'Not Assigned'}
            icon="shield-account"
          />

          <DetailRow
            label="Branch"
            value={employee.branch?.name || 'Not Assigned'}
            icon="office-building"
          />

          <DetailRow
            label="Joining Date"
            value={employee.joinedDate ? new Date(employee.joinedDate).toLocaleDateString() : '—'}
            icon="calendar-check"
          />

          {employee.salary && (
            <DetailRow
              label="Salary"
              value={formatCurrency(employee.salary)}
              icon="cash"
            />
          )}

          <DetailRow
            label="Status"
            value={
              <Chip
                mode="flat"
                style={{
                  backgroundColor: employee.isActive
                    ? colors.success.main + '20'
                    : colors.neutral[200],
                }}
                textStyle={{
                  color: employee.isActive ? colors.success.dark : colors.text.secondary,
                  fontSize: 12,
                }}
              >
                {employee.isActive ? 'Active' : 'Inactive'}
              </Chip>
            }
            icon="check-circle-outline"
          />
        </View>

        {/* Role Permissions */}
        {employee.role && employee.role.permissions && (
          <View style={[styles.section, { backgroundColor: colors.surface.default }]}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
              Role Permissions
            </Text>
            <Text style={[styles.sectionDescription, { color: colors.text.secondary }]}>
              Permissions granted through "{employee.role.name}" role
            </Text>

            <View style={styles.permissionsGrid}>
              {(employee.role.permissions || []).slice(0, 8).map((permission: any) => (
                <View
                  key={permission.id}
                  style={[styles.permissionChip, { backgroundColor: colors.surface.variant }]}
                >
                  <Icon
                    name="check-circle"
                    size={14}
                    color={colors.success.main}
                    style={styles.permissionIcon}
                  />
                  <Text style={[styles.permissionText, { color: colors.text.primary }]}>
                    {permission.name}
                  </Text>
                </View>
              ))}
              {employee.role.permissions.length > 8 && (
                <View
                  style={[styles.permissionChip, { backgroundColor: colors.primary.light + '20' }]}
                >
                  <Text style={[styles.permissionText, { color: colors.primary.main }]}>
                    +{employee.role.permissions.length - 8} more
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Timestamps */}
        <View style={[styles.section, { backgroundColor: colors.surface.default }]}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
            Timestamps
          </Text>

          <DetailRow
            label="Created At"
            value={(employee as any).createdAt ? new Date((employee as any).createdAt).toLocaleString() : '—'}
            icon="calendar-plus"
          />

          <DetailRow
            label="Updated At"
            value={(employee as any).updatedAt ? new Date((employee as any).updatedAt).toLocaleString() : '—'}
            icon="calendar-edit"
          />
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <Button
            mode="outlined"
            onPress={handleResetPassword}
            style={styles.editButton}
            icon="lock-reset"
            loading={resetPasswordMutation.isPending}
            disabled={resetPasswordMutation.isPending}
          >
            Reset Password
          </Button>
          <Button
            mode="outlined"
            onPress={handleEdit}
            style={styles.editButton}
            icon="pencil"
            labelStyle={{ color: colors.primary.main }}
          >
            Edit Employee
          </Button>

          <Button
            mode="outlined"
            onPress={() => setDeleteModalVisible(true)}
            style={[styles.deleteButton, { borderColor: colors.error.main }]}
            icon="delete"
            labelStyle={{ color: colors.error.main }}
          >
            Delete Employee
          </Button>
        </View>
      </ScrollView>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        visible={deleteModalVisible}
        title="Delete Employee"
        message={`Are you sure you want to delete "${employee.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        confirmVariant="danger"
        icon="delete-alert"
        onConfirm={() => deleteMutation.mutate()}
        onCancel={() => setDeleteModalVisible(false)}
        loading={deleteMutation.isPending}
      />
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing[4],
  },
  headerCard: {
    alignItems: 'center',
    borderRadius: borderRadius.lg,
    padding: spacing[5],
    marginBottom: spacing[4],
  },
  headerInfo: {
    alignItems: 'center',
    marginTop: spacing[3],
  },
  employeeName: {
    fontSize: 22,
    fontWeight: '600',
    marginBottom: spacing[1],
  },
  employeeId: {
    fontSize: 14,
    marginBottom: spacing[3],
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  quickActions: {
    flexDirection: 'row',
    gap: spacing[3],
    marginBottom: spacing[4],
  },
  quickActionButton: {
    flex: 1,
    borderRadius: borderRadius.md,
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
    marginBottom: spacing[3],
    marginTop: -spacing[2],
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: spacing[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
  },
  detailIcon: {
    marginRight: spacing[3],
    marginTop: 2,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    marginBottom: spacing[1],
  },
  detailValue: {
    fontSize: 15,
  },
  permissionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  permissionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.full,
  },
  permissionIcon: {
    marginRight: spacing[1],
  },
  permissionText: {
    fontSize: 12,
  },
  actionButtons: {
    gap: spacing[3],
    marginTop: spacing[2],
  },
  editButton: {
    borderRadius: borderRadius.md,
  },
  deleteButton: {
    borderRadius: borderRadius.md,
  },
  notFound: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notFoundText: {
    fontSize: 16,
    marginTop: spacing[4],
  },
});
