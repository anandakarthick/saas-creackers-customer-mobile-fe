import React, { useState } from 'react';
import { StyleSheet, View, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { Text } from 'react-native-paper';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { ScreenWrapper, Header } from '@/components/layout';
import { Badge, ConfirmationModal } from '@/components/common';
import { useTheme } from '@/theme';
import { spacing, borderRadius } from '@/theme/spacing';
import { usersApi } from '@/services/api';
import type { RolesStackParamList } from '@/types/navigation';

type NavigationProp = NativeStackNavigationProp<RolesStackParamList, 'RoleDetail'>;
type RouteType = RouteProp<RolesStackParamList, 'RoleDetail'>;

const formatModuleName = (module: string) =>
  module
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');

const getActionColor = (action: string, colors: any) => {
  switch (action) {
    case 'create': return colors.success.main;
    case 'read': return colors.info.main;
    case 'update': return colors.warning.main;
    case 'delete': return colors.error.main;
    default: return colors.neutral[500];
  }
};

const getActionIcon = (action: string) => {
  switch (action) {
    case 'create': return 'plus';
    case 'read': return 'eye';
    case 'update': return 'pencil';
    case 'delete': return 'delete';
    default: return 'checkbox-blank-circle';
  }
};

export const RoleDetailScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteType>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const roleId = route.params.id;

  const { data: role, isLoading, isError } = useQuery({
    queryKey: ['role', roleId],
    queryFn: () => usersApi.getRole(roleId),
    enabled: !!roleId,
  });

  const { data: usersData } = useQuery({
    queryKey: ['users', { roleId }],
    queryFn: () => usersApi.getUsers({ limit: 100 }),
    enabled: !!roleId,
  });

  const deleteMutation = useMutation({
    mutationFn: () => usersApi.deleteRole(roleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      setShowDeleteModal(false);
      navigation.goBack();
    },
    onError: (err: any) => Alert.alert('Error', err?.message || 'Failed to delete role'),
  });

  if (isLoading) {
    return (
      <ScreenWrapper>
        <Header title="Role Details" showBack />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary.main} />
        </View>
      </ScreenWrapper>
    );
  }

  if (isError || !role) {
    return (
      <ScreenWrapper>
        <Header title="Role Not Found" showBack />
        <View style={styles.center}>
          <Icon name="alert-circle-outline" size={64} color={colors.neutral[300]} />
          <Text style={{ fontSize: 16, color: colors.text.secondary, marginTop: spacing[4] }}>
            Role not found
          </Text>
        </View>
      </ScreenWrapper>
    );
  }

  const permissions: any[] = role.permissions || [];
  const allUsers: any[] = Array.isArray(usersData)
    ? usersData
    : usersData?.data || [];
  const roleUsers = allUsers.filter(
    (u: any) => String(u.roleId) === String(roleId) || String(u.role?.id) === String(roleId),
  );

  const permissionsByModule = permissions.reduce<Record<string, any[]>>((acc, perm) => {
    const mod = perm.module || 'general';
    if (!acc[mod]) acc[mod] = [];
    acc[mod].push(perm);
    return acc;
  }, {});

  const handleEdit = () => navigation.navigate('RoleForm', { id: roleId });

  return (
    <ScreenWrapper scrollable={false} padding={false}>
      <Header
        title="Role Details"
        showBack
        actions={[
          { icon: 'pencil', onPress: handleEdit },
          { icon: 'delete', onPress: () => setShowDeleteModal(true) },
        ]}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: spacing[8] + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Role Header */}
        <View style={[styles.headerCard, { backgroundColor: colors.surface.default }]}>
          <View style={[styles.roleIconBox, { backgroundColor: colors.primary.light + '20' }]}>
            <Icon name="shield-account" size={32} color={colors.primary.main} />
          </View>
          <Text style={[styles.roleName, { color: colors.text.primary }]}>{role.name}</Text>
          {role.description ? (
            <Text style={{ fontSize: 13, color: colors.text.secondary, textAlign: 'center', marginBottom: spacing[3] }}>
              {role.description}
            </Text>
          ) : null}
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={[styles.statValue, { color: colors.primary.main }]}>
                {roleUsers.length}
              </Text>
              <Text style={[styles.statLabel, { color: colors.text.secondary }]}>Users</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border.default }]} />
            <View style={styles.stat}>
              <Text style={[styles.statValue, { color: colors.success.main }]}>
                {permissions.length}
              </Text>
              <Text style={[styles.statLabel, { color: colors.text.secondary }]}>Permissions</Text>
            </View>
          </View>
        </View>

        {/* Users with this role */}
        <View style={[styles.section, { backgroundColor: colors.surface.default }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
              Users with this Role
            </Text>
            <Text style={{ fontSize: 13, color: colors.text.tertiary }}>{roleUsers.length}</Text>
          </View>
          {roleUsers.length === 0 ? (
            <Text style={{ fontSize: 14, color: colors.text.tertiary, textAlign: 'center', paddingVertical: spacing[4] }}>
              No users assigned to this role
            </Text>
          ) : (
            roleUsers.slice(0, 5).map((employee: any) => {
              const name = employee.name || `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || 'User';
              const email = employee.email || '';
              const isActive = employee.isActive !== false && employee.status !== 'INACTIVE';
              return (
                <View
                  key={employee.id}
                  style={[styles.userRow, { borderBottomColor: colors.border.default }]}
                >
                  <View style={[styles.userAvatar, { backgroundColor: colors.primary.light + '20' }]}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: colors.primary.main }}>
                      {name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: spacing[3] }}>
                    <Text style={{ fontSize: 14, fontWeight: '500', color: colors.text.primary }}>
                      {name}
                    </Text>
                    {email ? (
                      <Text style={{ fontSize: 12, color: colors.text.secondary, marginTop: 2 }}>
                        {email}
                      </Text>
                    ) : null}
                  </View>
                  <Badge variant={isActive ? 'success' : 'error'} size="small">
                    {isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </View>
              );
            })
          )}
          {roleUsers.length > 5 && (
            <Text style={{ fontSize: 12, color: colors.text.tertiary, textAlign: 'center', marginTop: spacing[2] }}>
              +{roleUsers.length - 5} more users
            </Text>
          )}
        </View>

        {/* Permissions */}
        <View style={[styles.section, { backgroundColor: colors.surface.default }]}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Permissions</Text>
          {Object.keys(permissionsByModule).length === 0 ? (
            <Text style={{ fontSize: 14, color: colors.text.tertiary, textAlign: 'center', paddingVertical: spacing[4] }}>
              No permissions assigned
            </Text>
          ) : (
            Object.entries(permissionsByModule).map(([module, perms]) => (
              <View key={module} style={styles.moduleSection}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text.primary, marginBottom: spacing[2] }}>
                  {formatModuleName(module)}
                </Text>
                <View style={styles.permissionList}>
                  {perms.map((perm: any) => {
                    const action = perm.action || 'read';
                    const actionColor = getActionColor(action, colors);
                    return (
                      <View
                        key={perm.id}
                        style={[styles.permissionBadge, { backgroundColor: actionColor + '20' }]}
                      >
                        <Icon name={getActionIcon(action)} size={12} color={actionColor} />
                        <Text style={{ fontSize: 11, fontWeight: '500', marginLeft: spacing[1], color: actionColor }}>
                          {action.charAt(0).toUpperCase() + action.slice(1)}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      <ConfirmationModal
        visible={showDeleteModal}
        title="Delete Role"
        message={`Are you sure you want to delete "${role.name}"? Users with this role will need to be reassigned.`}
        confirmText="Delete"
        cancelText="Cancel"
        confirmVariant="danger"
        onConfirm={() => deleteMutation.mutate()}
        onCancel={() => setShowDeleteModal(false)}
        loading={deleteMutation.isPending}
      />
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollView: { flex: 1 },
  scrollContent: { padding: spacing[4] },
  headerCard: {
    alignItems: 'center',
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    marginBottom: spacing[3],
  },
  roleIconBox: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  roleName: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: spacing[3],
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stat: {
    alignItems: 'center',
    paddingHorizontal: spacing[6],
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
    marginTop: spacing[1],
  },
  statDivider: {
    width: 1,
    height: 32,
  },
  section: {
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    marginBottom: spacing[3],
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: spacing[3],
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
  },
  userAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  moduleSection: {
    marginBottom: spacing[4],
  },
  permissionList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  permissionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.sm,
  },
});
