import React, { useCallback } from 'react';
import { StyleSheet, View, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Text } from 'react-native-paper';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useQuery } from '@tanstack/react-query';
import { ScreenWrapper, Header } from '@/components/layout';
import { Badge, Empty, SafeAreaFAB } from '@/components/common';
import { useTheme } from '@/theme';
import { spacing, borderRadius } from '@/theme/spacing';
import { usersApi } from '@/services/api';
import type { Role } from '@/types';

function normalizeRole(r: any): Role & { _employeeCount?: number } {
  return {
    id: String(r.id),
    name: r.name || '',
    permissions: r.permissions || [],
    _employeeCount: r._count?.users ?? r.userCount ?? 0,
  } as Role & { _employeeCount?: number };
}

export const RolesListScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();

  const { data, isLoading, isError, error, isFetching, refetch } = useQuery({
    queryKey: ['roles'],
    queryFn: () => usersApi.getRoles(),
  });

  const roles = ((data as any[]) || []).map(normalizeRole);

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [])
  );

  const onRefresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const getEmployeeCount = (role: any) => role._employeeCount ?? 0;

  const renderRole = ({ item }: { item: Role }) => {
    const employeeCount = getEmployeeCount(item);
    const permissionCount = item.permissions?.length || 0;

    return (
      <TouchableOpacity
        style={[styles.roleCard, { backgroundColor: colors.surface.default }]}
        onPress={() => navigation.navigate('RoleDetail', { id: item.id })}
        activeOpacity={0.7}
      >
        <View style={[styles.roleIcon, { backgroundColor: colors.primary.light + '20' }]}>
          <Icon name="shield-account" size={24} color={colors.primary.main} />
        </View>
        <View style={styles.roleInfo}>
          <Text style={[styles.roleName, { color: colors.text.primary }]}>{item.name}</Text>
          <View style={styles.roleStats}>
            <View style={styles.stat}>
              <Icon name="account-group" size={14} color={colors.text.tertiary} />
              <Text style={[styles.statText, { color: colors.text.secondary }]}>
                {employeeCount} users
              </Text>
            </View>
            <View style={styles.stat}>
              <Icon name="key" size={14} color={colors.text.tertiary} />
              <Text style={[styles.statText, { color: colors.text.secondary }]}>
                {permissionCount} permissions
              </Text>
            </View>
          </View>
        </View>
        <Icon name="chevron-right" size={24} color={colors.neutral[400]} />
      </TouchableOpacity>
    );
  };

  return (
    <ScreenWrapper scrollable={false} padding={false}>
      <Header
        title="Roles & Permissions"
        subtitle={`${roles.length} roles`}
        showDrawer
        actions={[{ icon: 'key', onPress: () => navigation.navigate('Permissions') }]}
      />

      {isLoading ? (
        <View style={styles.loadingCenter}>
          <ActivityIndicator size="large" color={colors.primary.main} />
        </View>
      ) : isError ? (
        <Empty icon="cloud-alert" title="Couldn't load roles" description={String(error?.message || 'Network error')} />
      ) : (
        <FlatList
          data={roles}
          renderItem={renderRole}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshing={isFetching}
          onRefresh={onRefresh}
          ListEmptyComponent={
            <Empty
              icon="shield-off-outline"
              title="No roles found"
              description="Create your first role"
            />
          }
        />
      )}

      <SafeAreaFAB icon="plus" onPress={() => navigation.navigate('RoleForm', {})} />
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  loadingCenter: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: {
    padding: spacing[4],
    paddingBottom: spacing[20],
  },
  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    marginBottom: spacing[3],
  },
  roleIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  roleInfo: {
    flex: 1,
    marginLeft: spacing[3],
  },
  roleName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: spacing[2],
  },
  roleStats: {
    flexDirection: 'row',
    gap: spacing[4],
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    fontSize: 12,
    marginLeft: spacing[1],
  },
});
