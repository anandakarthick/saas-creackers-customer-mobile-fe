import React, { useEffect, useState } from 'react';
import { StyleSheet, View, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity, Alert } from 'react-native';
import { Button, Text, Checkbox } from 'react-native-paper';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { Header } from '@/components/layout/Header';
import { FormInput } from '@/components/forms';
import { useTheme } from '@/theme';
import { spacing, borderRadius } from '@/theme/spacing';
import { usersApi } from '@/services/api';
import type { RolesStackParamList } from '@/types/navigation';

interface RoleFormData {
  name: string;
  description: string;
}

type NavigationProp = NativeStackNavigationProp<RolesStackParamList, 'RoleForm'>;
type RouteProps = RouteProp<RolesStackParamList, 'RoleForm'>;

export const RoleFormScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const [submitting, setSubmitting] = useState(false);
  const [selectedPermissions, setSelectedPermissions] = useState<Set<number>>(new Set());

  const id = route.params?.id;
  const isEdit = !!id;

  const { data: grouped } = useQuery({
    queryKey: ['permissions', 'grouped'],
    queryFn: () => usersApi.getPermissionsGrouped(),
  });

  const { data: existing } = useQuery({
    queryKey: ['role', id],
    queryFn: () => usersApi.getRole(id as any),
    enabled: isEdit,
  });

  const { control, handleSubmit, reset } = useForm<RoleFormData>({
    defaultValues: { name: '', description: '' },
  });

  useEffect(() => {
    if (existing) {
      reset({
        name: (existing as any).name || '',
        description: (existing as any).description || '',
      });
      const permIds: number[] = ((existing as any).permissions || []).map((p: any) =>
        typeof p === 'object' ? p.id : p
      );
      setSelectedPermissions(new Set(permIds));
    }
  }, [existing, reset]);

  const groupedSafe: Record<string, any[]> = (grouped as any) || {};

  const togglePermission = (permId: number) => {
    setSelectedPermissions((prev) => {
      const next = new Set(prev);
      if (next.has(permId)) next.delete(permId);
      else next.add(permId);
      return next;
    });
  };

  const toggleModule = (module: string) => {
    const modulePerms: number[] = groupedSafe[module].map((p) => p.id);
    const allSelected = modulePerms.every((pid) => selectedPermissions.has(pid));
    setSelectedPermissions((prev) => {
      const next = new Set(prev);
      if (allSelected) modulePerms.forEach((pid) => next.delete(pid));
      else modulePerms.forEach((pid) => next.add(pid));
      return next;
    });
  };

  const submit = useMutation({
    mutationFn: (data: RoleFormData) => {
      const payload = {
        name: data.name.trim(),
        description: data.description || undefined,
        permissionIds: Array.from(selectedPermissions),
      };
      return isEdit ? usersApi.updateRole(id as any, payload) : usersApi.createRole(payload);
    },
    onSuccess: async () => {
      if (isEdit) await qc.invalidateQueries({ queryKey: ['role', id] });
      qc.invalidateQueries({ queryKey: ['roles'] });
      navigation.goBack();
    },
    onError: (e: any) => Alert.alert('Error', e?.message || 'Failed to save role'),
  });

  const onSubmit = async (data: RoleFormData) => {
    if (!data.name.trim()) { Alert.alert('Validation', 'Role name is required'); return; }
    setSubmitting(true);
    try { await submit.mutateAsync(data); } finally { setSubmitting(false); }
  };

  return (
    <ScreenWrapper scrollable={false}>
      <Header title={isEdit ? 'Edit Role' : 'New Role'} showBack />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: spacing[8] + insets.bottom }]}
        >
          <Section title="Role Info" colors={colors}>
            <FormInput name="name" control={control} label="Role Name *" placeholder="e.g. Manager" />
            <FormInput
              name="description"
              control={control}
              label="Description"
              multiline
              numberOfLines={2}
            />
          </Section>

          <View style={[styles.section, { backgroundColor: colors.surface.default }]}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
              Permissions ({selectedPermissions.size} selected)
            </Text>
            {Object.entries(groupedSafe).map(([module, perms]) => {
              const allSelected = perms.every((p: any) => selectedPermissions.has(p.id));
              const someSelected = perms.some((p: any) => selectedPermissions.has(p.id));
              return (
                <View key={module} style={styles.moduleBlock}>
                  <TouchableOpacity onPress={() => toggleModule(module)} style={styles.moduleHeader}>
                    <Checkbox
                      status={allSelected ? 'checked' : someSelected ? 'indeterminate' : 'unchecked'}
                    />
                    <Text style={[styles.moduleLabel, { color: colors.text.primary }]}>
                      {module.replace(/_/g, ' ').toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                  <View style={styles.permissionsGrid}>
                    {perms.map((p: any) => (
                      <TouchableOpacity
                        key={p.id}
                        onPress={() => togglePermission(p.id)}
                        style={styles.permissionItem}
                      >
                        <Checkbox
                          status={selectedPermissions.has(p.id) ? 'checked' : 'unchecked'}
                        />
                        <Text style={[styles.permLabel, { color: colors.text.secondary }]}>
                          {p.action}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              );
            })}
          </View>

          <View style={styles.buttonRow}>
            <Button mode="outlined" onPress={() => navigation.goBack()} style={{ flex: 1 }}>
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={handleSubmit(onSubmit)}
              loading={submitting}
              disabled={submitting}
              style={{ flex: 2 }}
            >
              {isEdit ? 'Update' : 'Create Role'}
            </Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
};

const Section: React.FC<{ title: string; children: React.ReactNode; colors: any }> = ({
  title,
  children,
  colors,
}) => (
  <View style={[styles.section, { backgroundColor: colors.surface.default }]}>
    <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>{title}</Text>
    {children}
  </View>
);

const styles = StyleSheet.create({
  content: { padding: spacing[4] },
  section: { borderRadius: borderRadius.lg, padding: spacing[4], marginBottom: spacing[3] },
  sectionTitle: { fontSize: 14, fontWeight: '700', marginBottom: spacing[3] },
  moduleBlock: { marginBottom: spacing[3] },
  moduleHeader: { flexDirection: 'row', alignItems: 'center' },
  moduleLabel: { fontSize: 13, fontWeight: '700', letterSpacing: 0.5, marginLeft: spacing[1] },
  permissionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingLeft: spacing[6],
  },
  permissionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: spacing[3],
    marginVertical: 2,
  },
  permLabel: { fontSize: 12, textTransform: 'capitalize' },
  buttonRow: { flexDirection: 'row', gap: spacing[3], marginTop: spacing[2] },
});
