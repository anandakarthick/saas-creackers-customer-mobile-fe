import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Text, Searchbar } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useQuery } from '@tanstack/react-query';

import { ScreenWrapper, Header } from '@/components/layout';
import { Empty, SafeAreaFAB } from '@/components/common';
import { useTheme } from '@/theme';
import { spacing, borderRadius } from '@/theme/spacing';
import { usersApi } from '@/services/api';
import type { RolesStackParamList } from '@/types/navigation';

type NavigationProp = NativeStackNavigationProp<RolesStackParamList, 'RolesList'>;

export const RolesListScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { colors } = useTheme();
  const [search, setSearch] = useState('');

  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['roles'],
    queryFn: () => usersApi.getRoles(),
  });

  const roles: any[] = Array.isArray(data) ? data : (data as any)?.data || [];

  const filtered = search.trim()
    ? roles.filter((r: any) =>
        (r.name || '').toLowerCase().includes(search.toLowerCase()),
      )
    : roles;

  const handleRolePress = (role: any) => {
    navigation.navigate('RoleDetail', { id: String(role.id) });
  };

  const renderRole = ({ item }: { item: any }) => {
    const permissionCount = item.permissions?.length || item._count?.permissions || 0;
    const userCount = item.userCount || item._count?.users || 0;

    return (
      <TouchableOpacity
        style={[styles.roleCard, { backgroundColor: colors.surface.default }]}
        onPress={() => handleRolePress(item)}
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
                {userCount} users
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
      />

      <View style={{ paddingHorizontal: spacing[4], paddingTop: spacing[3] }}>
        <Searchbar
          placeholder="Search roles..."
          value={search}
          onChangeText={setSearch}
          style={[styles.searchBar, { backgroundColor: colors.surface.default }]}
          inputStyle={{ fontSize: 14 }}
        />
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary.main} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          renderItem={renderRole}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              colors={[colors.primary.main]}
            />
          }
          ListEmptyComponent={
            <Empty
              icon="shield-off-outline"
              title="No roles found"
              description={search ? 'Try a different search' : 'Create your first role'}
              actionLabel="Add Role"
              onAction={() => navigation.navigate('RoleForm', {})}
            />
          }
        />
      )}

      <SafeAreaFAB icon="plus" onPress={() => navigation.navigate('RoleForm', {})} />
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  searchBar: {
    elevation: 0,
    borderRadius: borderRadius.md,
    marginBottom: spacing[2],
  },
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
