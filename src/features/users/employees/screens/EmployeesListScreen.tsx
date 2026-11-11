import React, { useState, useCallback } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Searchbar, Chip } from 'react-native-paper';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ScreenWrapper, Header } from '@/components/layout';
import { Avatar, Badge, Empty, SafeAreaFAB } from '@/components/common';
import { useTheme } from '@/theme';
import { spacing, borderRadius } from '@/theme/spacing';
import { usersApi } from '@/services/api';
import type { Employee } from '@/types';
import type { EmployeesStackParamList } from '@/types/navigation';

type NavigationProp = NativeStackNavigationProp<EmployeesStackParamList, 'EmployeesList'>;

/**
 * Backend /admin/users rows use a flat shape (firstName, lastName, email,
 * active, role, branch) — normalize into the Employee shape the card
 * layout expects without touching the styles below.
 */
function normalizeEmployee(u: any): Employee {
  const name = u.name
    || [u.firstName, u.lastName].filter(Boolean).join(' ')
    || u.email?.split('@')[0]
    || 'Unnamed';
  return {
    id: String(u.id),
    name,
    employeeId: u.employeeId || u.code || `U-${u.id}`,
    email: u.email || '',
    phone: u.phone || '',
    isActive: u.active !== false && u.isActive !== false,
    role: u.role || (u.roleName ? { id: u.roleId, name: u.roleName } : undefined),
    branch: u.branch || (u.branchName ? { id: u.branchId, name: u.branchName } : undefined),
  } as Employee;
}

export const EmployeesListScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState('all');

  const { data: statsData } = useQuery({
    queryKey: ['userStats'],
    queryFn: () => usersApi.getUserStats(),
  });

  const { data: rolesData } = useQuery({
    queryKey: ['roles'],
    queryFn: () => usersApi.getRoles(),
  });

  const { data, isLoading, isError, error, isFetching, refetch } = useQuery({
    queryKey: ['admin-users', searchQuery],
    queryFn: () => usersApi.getUsers({ search: searchQuery || undefined, limit: 100 }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => usersApi.deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['userStats'] });
    },
  });

  const handleDeleteUser = (id: string, name: string) => {
    Alert.alert('Delete User', `Delete "${name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteMutation.mutate(id) },
    ]);
  };

  const rawUsers: any[] = Array.isArray(data) ? data : (data as any)?.data || [];
  const employees: Employee[] = rawUsers.map(normalizeEmployee);

  const roleFilters = [
    { label: 'All', value: 'all' },
    ...((rolesData as any[]) || []).map((r: any) => ({ label: r.name, value: String(r.id) })),
  ];

  const q = searchQuery.toLowerCase();
  let filteredEmployees = q
    ? employees.filter((employee) =>
        employee.name.toLowerCase().includes(q) ||
        String(employee.employeeId || '').toLowerCase().includes(q) ||
        String(employee.email || '').toLowerCase().includes(q)
      )
    : employees;

  if (selectedRole !== 'all') {
    filteredEmployees = filteredEmployees.filter((e: any) => String(e.role?.id) === selectedRole);
  }

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [])
  );

  const onRefresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const handleEmployeePress = (employee: Employee) => {
    navigation.navigate('EmployeeDetail', { id: employee.id });
  };

  const handleAddEmployee = () => {
    navigation.navigate('EmployeeForm', {});
  };

  const renderEmployee = ({ item }: { item: Employee }) => (
    <TouchableOpacity
      style={[styles.employeeCard, { backgroundColor: colors.surface.default }]}
      onPress={() => handleEmployeePress(item)}
      onLongPress={() => handleDeleteUser(item.id, item.name)}
      activeOpacity={0.7}
    >
      <Avatar name={item.name} size="large" />
      <View style={styles.employeeInfo}>
        <View style={styles.employeeHeader}>
          <Text style={[styles.employeeName, { color: colors.text.primary }]}>{item.name}</Text>
          <Badge variant={item.isActive ? 'success' : 'error'} size="small">
            {item.isActive ? 'Active' : 'Inactive'}
          </Badge>
        </View>
        <Text style={[styles.employeeId, { color: colors.text.tertiary }]}>{item.employeeId}</Text>
        <View style={styles.roleContainer}>
          <Icon name="shield-account" size={14} color={colors.primary.main} />
          <Text style={[styles.roleText, { color: colors.primary.main }]}>{item.role?.name}</Text>
        </View>
        <View style={styles.contactRow}>
          <Icon name="office-building" size={14} color={colors.text.tertiary} />
          <Text style={[styles.contactText, { color: colors.text.secondary }]}>{item.branch?.name}</Text>
        </View>
        <View style={styles.contactRow}>
          <Icon name="email" size={14} color={colors.text.tertiary} />
          <Text style={[styles.contactText, { color: colors.text.secondary }]}>{item.email}</Text>
        </View>
      </View>
      <Icon name="chevron-right" size={24} color={colors.neutral[400]} />
    </TouchableOpacity>
  );

  const stats: any = statsData || {};
  const statCards = [
    { label: 'Total', value: stats.totalUsers ?? filteredEmployees.length, icon: 'account-group', color: colors.primary.main },
    { label: 'Active', value: stats.activeUsers ?? 0, icon: 'check-circle', color: '#10B981' },
    { label: 'Inactive', value: stats.inactiveUsers ?? 0, icon: 'account-off', color: '#EF4444' },
    { label: 'Roles', value: (rolesData as any[])?.length ?? 0, icon: 'shield-account', color: '#6366F1' },
  ];

  return (
    <ScreenWrapper scrollable={false} padding={false}>
      <Header
        title="Employees"
        subtitle={`${filteredEmployees.length} employees`}
        showDrawer
      />

      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Search employees..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={[styles.searchBar, { backgroundColor: colors.surface.default }]}
          inputStyle={styles.searchInput}
        />
      </View>

      <View style={[styles.filtersContainer, { borderBottomColor: colors.border.default }]}>
        <FlatList
          horizontal
          data={roleFilters}
          keyExtractor={(item) => item.value}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersList}
          renderItem={({ item }) => (
            <Chip
              selected={selectedRole === item.value}
              onPress={() => setSelectedRole(item.value)}
              style={[styles.filterChip, { backgroundColor: colors.surface.variant }, selectedRole === item.value && { backgroundColor: colors.primary.main }]}
              textStyle={[styles.filterChipText, { color: colors.text.secondary }, selectedRole === item.value && { color: colors.neutral[0] }]}
            >
              {item.label}
            </Chip>
          )}
        />
      </View>

      {isLoading ? (
        <View style={styles.loadingCenter}>
          <ActivityIndicator size="large" color={colors.primary.main} />
        </View>
      ) : isError ? (
        <Empty icon="cloud-alert" title="Couldn't load employees" description={String((error as any)?.message || 'Network error')} />
      ) : (
        <FlatList
          data={filteredEmployees}
          renderItem={renderEmployee}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshing={isFetching}
          onRefresh={onRefresh}
          ListHeaderComponent={
            <View style={styles.statsRow}>
              {statCards.map((s) => (
                <View key={s.label} style={[styles.statCard, { backgroundColor: colors.surface.default }]}>
                  <Icon name={s.icon} size={20} color={s.color} />
                  <Text style={[styles.statValue, { color: colors.text.primary }]}>{s.value}</Text>
                  <Text style={[styles.statLabel, { color: colors.text.tertiary }]}>{s.label}</Text>
                </View>
              ))}
            </View>
          }
          ListEmptyComponent={
            <Empty
              icon="account-off-outline"
              title="No employees found"
              description={searchQuery ? "No employees match your search" : "Add your first employee to get started"}
            />
          }
        />
      )}

      <SafeAreaFAB icon="plus" onPress={handleAddEmployee} />
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  loadingCenter: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  searchContainer: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
  },
  searchBar: {
    borderRadius: borderRadius.lg,
    elevation: 0,
  },
  searchInput: {
    fontSize: 14,
  },
  listContent: {
    padding: spacing[4],
    paddingBottom: spacing[20],
  },
  employeeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    marginBottom: spacing[3],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  employeeInfo: {
    flex: 1,
    marginLeft: spacing[3],
  },
  employeeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  employeeName: {
    fontSize: 16,
    fontWeight: '600',
  },
  employeeId: {
    fontSize: 12,
    marginBottom: spacing[1],
  },
  roleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[1],
  },
  roleText: {
    fontSize: 13,
    fontWeight: '500',
    marginLeft: spacing[1],
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  contactText: {
    fontSize: 12,
    marginLeft: spacing[2],
  },
  filtersContainer: { borderBottomWidth: 1 },
  filtersList: { paddingHorizontal: spacing[4], paddingVertical: spacing[2], gap: spacing[2] },
  filterChip: { marginRight: spacing[2] },
  filterChipText: { fontSize: 13 },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2], marginBottom: spacing[4] },
  statCard: {
    flex: 1,
    minWidth: '46%',
    alignItems: 'center',
    paddingVertical: spacing[3],
    borderRadius: borderRadius.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  statValue: { fontSize: 18, fontWeight: '700', marginTop: spacing[1] },
  statLabel: { fontSize: 11, marginTop: 2 },
});
