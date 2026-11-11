import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Text } from 'react-native-paper';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useForm } from 'react-hook-form';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from 'react-native-paper';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { ScreenWrapper, Header } from '@/components/layout';
import { FormInput } from '@/components/forms';
import { useTheme } from '@/theme';
import { spacing, borderRadius } from '@/theme/spacing';
import { usersApi } from '@/services/api';
import type { RolesStackParamList } from '@/types/navigation';

type NavigationProp = NativeStackNavigationProp<RolesStackParamList, 'RoleForm'>;
type RouteType = RouteProp<RolesStackParamList, 'RoleForm'>;

interface RoleFormData {
  name: string;
  description: string;
}

const formatModuleName = (module: string) =>
  module
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');

const getActionIcon = (action: string) => {
  switch (action) {
    case 'create': return 'plus-circle';
    case 'read': return 'eye';
    case 'update': return 'pencil';
    case 'delete': return 'delete';
    default: return 'checkbox-blank-circle';
  }
};

export const RoleFormScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteType>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  const isEditing = !!route.params?.id;
  const roleId = route.params?.id;

  const { data: existingRole, isLoading: roleLoading } = useQuery({
    queryKey: ['role', roleId],
    queryFn: () => usersApi.getRole(roleId!),
    enabled: isEditing,
  });

  const { data: permissionsData, isLoading: permsLoading } = useQuery({
    queryKey: ['permissionsGrouped'],
    queryFn: () => usersApi.getPermissionsGrouped(),
  });

  const { control, handleSubmit, reset } = useForm<RoleFormData>({
    defaultValues: { name: '', description: '' },
  });

  useEffect(() => {
    if (existingRole) {
      reset({
        name: existingRole.name || '',
        description: existingRole.description || '',
      });
      const existingPerms = (existingRole.permissions || []).map((p: any) => String(p.id));
      setSelectedPermissions(existingPerms);
    }
  }, [existingRole, reset]);

  const submitMutation = useMutation({
    mutationFn: (data: RoleFormData) => {
      const payload = {
        name: data.name.trim(),
        description: data.description.trim() || undefined,
        permissionIds: selectedPermissions.map((id) => Number(id)),
      };
      return isEditing
        ? usersApi.updateRole(roleId!, payload)
        : usersApi.createRole(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      if (isEditing) queryClient.invalidateQueries({ queryKey: ['role', roleId] });
      navigation.goBack();
    },
    onError: (err: any) => Alert.alert('Error', err?.message || 'Failed to save role'),
  });

  const onSubmit = (data: RoleFormData) => {
    if (!data.name.trim()) {
      Alert.alert('Validation', 'Role name is required');
      return;
    }
    submitMutation.mutate(data);
  };

  const permissionsByModule: Record<string, any[]> =
    permissionsData && typeof permissionsData === 'object' && !Array.isArray(permissionsData)
      ? (permissionsData as Record<string, any[]>)
      : {};

  // If API returns flat array instead of grouped object, group it ourselves
  const flatPerms: any[] = Array.isArray(permissionsData) ? permissionsData : [];
  const groupedPerms: Record<string, any[]> =
    Object.keys(permissionsByModule).length > 0
      ? permissionsByModule
      : flatPerms.reduce<Record<string, any[]>>((acc, perm) => {
          const mod = perm.module || 'general';
          if (!acc[mod]) acc[mod] = [];
          acc[mod].push(perm);
          return acc;
        }, {});

  const togglePermission = (permissionId: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(permissionId)
        ? prev.filter((id) => id !== permissionId)
        : [...prev, permissionId],
    );
  };

  const toggleModule = (module: string) => {
    const modulePermissionIds = (groupedPerms[module] || []).map((p: any) => String(p.id));
    const allSelected = modulePermissionIds.every((id) => selectedPermissions.includes(id));

    if (allSelected) {
      setSelectedPermissions((prev) => prev.filter((id) => !modulePermissionIds.includes(id)));
    } else {
      setSelectedPermissions((prev) => [...new Set([...prev, ...modulePermissionIds])]);
    }
  };

  const isDataLoading = (isEditing && roleLoading) || permsLoading;

  if (isDataLoading) {
    return (
      <ScreenWrapper>
        <Header title={isEditing ? 'Edit Role' : 'Create Role'} showBack />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary.main} />
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper scrollable={false} padding={false}>
      <Header title={isEditing ? 'Edit Role' : 'Create Role'} showBack />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: spacing[8] + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Basic Info */}
        <View style={[styles.section, { backgroundColor: colors.surface.default }]}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Role Information</Text>
          <FormInput name="name" control={control} label="Role Name *" placeholder="e.g., Branch Manager" />
          <FormInput name="description" control={control} label="Description" placeholder="Optional description" multiline numberOfLines={2} />
        </View>

        {/* Permissions */}
        <View style={[styles.section, { backgroundColor: colors.surface.default }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary, marginBottom: 0 }]}>
              Permissions
            </Text>
            <Text style={{ fontSize: 13, color: colors.text.tertiary }}>
              {selectedPermissions.length} selected
            </Text>
          </View>

          {Object.keys(groupedPerms).length === 0 ? (
            <Text style={{ fontSize: 14, color: colors.text.tertiary, textAlign: 'center', paddingVertical: spacing[4] }}>
              No permissions available
            </Text>
          ) : (
            Object.entries(groupedPerms).map(([module, permissions]) => {
              const modulePermissionIds = permissions.map((p: any) => String(p.id));
              const selectedCount = modulePermissionIds.filter((id) =>
                selectedPermissions.includes(id),
              ).length;
              const allSelected = selectedCount === modulePermissionIds.length && selectedCount > 0;

              return (
                <View key={module} style={styles.moduleSection}>
                  <TouchableOpacity
                    style={styles.moduleHeader}
                    onPress={() => toggleModule(module)}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Icon
                        name={
                          allSelected
                            ? 'checkbox-marked'
                            : selectedCount > 0
                            ? 'minus-box'
                            : 'checkbox-blank-outline'
                        }
                        size={22}
                        color={selectedCount > 0 ? colors.primary.main : colors.neutral[400]}
                      />
                      <Text style={{ fontSize: 14, fontWeight: '600', marginLeft: spacing[2], color: colors.text.primary }}>
                        {formatModuleName(module)}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 12, color: colors.text.tertiary }}>
                      {selectedCount}/{modulePermissionIds.length}
                    </Text>
                  </TouchableOpacity>

                  <View style={styles.permissionGrid}>
                    {permissions.map((permission: any) => {
                      const permId = String(permission.id);
                      const isSelected = selectedPermissions.includes(permId);
                      const action = permission.action || 'read';
                      return (
                        <TouchableOpacity
                          key={permId}
                          style={[
                            styles.permissionItem,
                            {
                              backgroundColor: isSelected
                                ? colors.primary.light + '20'
                                : colors.surface.variant,
                            },
                          ]}
                          onPress={() => togglePermission(permId)}
                        >
                          <Icon
                            name={getActionIcon(action)}
                            size={16}
                            color={isSelected ? colors.primary.main : colors.neutral[400]}
                          />
                          <Text
                            style={{
                              fontSize: 12,
                              fontWeight: '500',
                              marginLeft: spacing[1],
                              color: isSelected ? colors.primary.main : colors.text.secondary,
                            }}
                          >
                            {action.charAt(0).toUpperCase() + action.slice(1)}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* Submit */}
        <View style={styles.buttonRow}>
          <Button mode="outlined" onPress={() => navigation.goBack()} style={{ flex: 1 }}>
            Cancel
          </Button>
          <Button
            mode="contained"
            onPress={handleSubmit(onSubmit)}
            loading={submitMutation.isPending}
            disabled={submitMutation.isPending}
            style={{ flex: 2 }}
          >
            {isEditing ? 'Update Role' : 'Create Role'}
          </Button>
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollView: { flex: 1 },
  scrollContent: { padding: spacing[4] },
  section: {
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    marginBottom: spacing[3],
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: spacing[3],
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  moduleSection: {
    marginBottom: spacing[4],
  },
  moduleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  permissionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
    marginLeft: spacing[7],
  },
  permissionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.md,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing[3],
    marginTop: spacing[2],
  },
});
