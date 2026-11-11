import React, { useCallback } from 'react';
import { StyleSheet, View, Text, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useQuery } from '@tanstack/react-query';
import { ScreenWrapper, Header } from '@/components/layout';
import { Empty } from '@/components/common';
import { useTheme } from '@/theme';
import { spacing, borderRadius } from '@/theme/spacing';
import { usersApi } from '@/services/api';

interface PermissionRow {
  id: number;
  name: string;
  action: string;
  module: string;
  description?: string;
}

export const PermissionsScreen: React.FC = () => {
  const { colors } = useTheme();
  const { data, isLoading, isError, error, isFetching, refetch } = useQuery({
    queryKey: ['permissions', 'grouped'],
    queryFn: () => usersApi.getPermissionsGrouped(),
  });

  const onRefresh = useCallback(async () => { await refetch(); }, [refetch]);
  const grouped: Record<string, PermissionRow[]> = (data as any) || {};
  const moduleNames = Object.keys(grouped);
  const totalCount = moduleNames.reduce((s, m) => s + grouped[m].length, 0);

  return (
    <ScreenWrapper scrollable={false} padding={false}>
      <Header title="Permissions" subtitle={`${totalCount} permissions`} showBack />

      {isLoading ? (
        <View style={styles.loadingCenter}>
          <ActivityIndicator size="large" color={colors.primary.main} />
        </View>
      ) : isError ? (
        <Empty icon="cloud-alert" title="Couldn't load permissions" description={String((error as any)?.message || '')} />
      ) : moduleNames.length === 0 ? (
        <Empty icon="key-off" title="No permissions" description="Permissions have not been seeded yet" />
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={isFetching} onRefresh={onRefresh} />}
        >
          {moduleNames.map((module) => (
            <View key={module} style={[styles.moduleCard, { backgroundColor: colors.surface.default }]}>
              <View style={[styles.moduleHeader, { backgroundColor: colors.primary.light + '15' }]}>
                <Icon name="folder-key" size={18} color={colors.primary.main} />
                <Text style={[styles.moduleName, { color: colors.text.primary }]}>
                  {module.replace(/_/g, ' ').toUpperCase()}
                </Text>
                <Text style={[styles.moduleCount, { color: colors.primary.main }]}>{grouped[module].length}</Text>
              </View>
              <View style={styles.permissionList}>
                {grouped[module].map((p) => (
                  <View key={p.id} style={styles.permissionRow}>
                    <Icon name="check-circle" size={14} color={colors.success.main} />
                    <View style={{ flex: 1, marginLeft: spacing[2] }}>
                      <Text style={[styles.permAction, { color: colors.text.primary }]}>{p.action}</Text>
                      {p.description ? (
                        <Text style={[styles.permDesc, { color: colors.text.secondary }]}>{p.description}</Text>
                      ) : null}
                    </View>
                  </View>
                ))}
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  loadingCenter: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: spacing[4], paddingBottom: spacing[8] },
  moduleCard: {
    borderRadius: borderRadius.md,
    marginBottom: spacing[3],
    overflow: 'hidden',
  },
  moduleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[3],
    gap: spacing[2],
  },
  moduleName: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  moduleCount: {
    fontSize: 12,
    fontWeight: '700',
  },
  permissionList: {
    padding: spacing[3],
  },
  permissionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: spacing[2],
  },
  permAction: {
    fontSize: 13,
    textTransform: 'capitalize',
  },
  permDesc: {
    fontSize: 11,
    marginTop: 2,
  },
});
