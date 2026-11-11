import React, { useCallback } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ScreenWrapper, Header } from '@/components/layout';
import { Empty } from '@/components/common';
import { useTheme } from '@/theme';
import { spacing, borderRadius } from '@/theme/spacing';
import { notificationsApi } from '@/services/api';
import { formatRelativeTime } from '@/utils';
import type { Notification } from '@/services/api/notifications.api';

const typeIconMap: Record<string, { icon: string; colorKey: 'primary' | 'success' | 'warning' | 'info' | 'error' }> = {
  ORDER: { icon: 'cart', colorKey: 'primary' },
  PAYMENT: { icon: 'currency-inr', colorKey: 'success' },
  LOW_STOCK: { icon: 'package-variant', colorKey: 'warning' },
  STOCK: { icon: 'package-variant', colorKey: 'warning' },
  CUSTOMER: { icon: 'account', colorKey: 'info' },
  SYSTEM: { icon: 'information', colorKey: 'info' },
};

export const NotificationsListScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const qc = useQueryClient();

  const { data, isLoading, isError, error, isFetching, refetch } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsApi.getNotifications({ limit: 100 }),
  });

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [])
  );

  const items: Notification[] = data?.notifications || [];
  const unread = items.filter((n) => !n.isRead).length;

  const markRead = useMutation({
    mutationFn: (id: number) => notificationsApi.markAsRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAllRead = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const dismiss = useMutation({
    mutationFn: (id: number) => notificationsApi.dismissNotification(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const onRefresh = useCallback(async () => { await refetch(); }, [refetch]);

  const handleDismiss = (id: number) => {
    Alert.alert('Dismiss notification?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Dismiss', style: 'destructive', onPress: () => dismiss.mutate(id) },
    ]);
  };

  return (
    <ScreenWrapper scrollable={false} padding={false}>
      <Header
        title="Notifications"
        subtitle={unread > 0 ? `${unread} unread` : 'All caught up'}
        showBack
        actions={unread > 0 ? [{ icon: 'email-open', onPress: () => markAllRead.mutate() }] : []}
      />

      {isLoading ? (
        <View style={styles.loadingCenter}><ActivityIndicator color={colors.primary.main} /></View>
      ) : isError ? (
        <Empty icon="cloud-alert" title="Couldn't load" description={String((error as any)?.message || '')} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(it) => String(it.id)}
          contentContainerStyle={styles.list}
          refreshing={isFetching}
          onRefresh={onRefresh}
          renderItem={({ item }) => {
            const t = typeIconMap[item.type] || typeIconMap.SYSTEM;
            const iconColor = colors[t.colorKey].main;
            return (
              <TouchableOpacity
                style={[
                  styles.row,
                  { backgroundColor: item.isRead ? colors.surface.default : colors.primary.light + '10' },
                ]}
                onPress={() => {
                  if (!item.isRead) markRead.mutate(item.id);
                  // Navigate to order detail if this is an order notification
                  const notifType = (item.type || '').toUpperCase();
                  if (notifType === 'ORDER' && (item as any).link) {
                    const orderId = String((item as any).link).replace(/.*\//, '');
                    if (orderId) {
                      navigation.navigate('Orders', { screen: 'OrderDetail', params: { id: orderId } });
                    }
                  } else if (notifType === 'ORDER') {
                    navigation.navigate('Orders');
                  }
                }}
                onLongPress={() => handleDismiss(item.id)}
                activeOpacity={0.7}
              >
                <View style={[styles.icon, { backgroundColor: iconColor + '20' }]}>
                  <Icon name={t.icon} size={20} color={iconColor} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.rowHeader}>
                    <Text
                      style={[styles.title, { color: colors.text.primary }, !item.isRead && styles.titleUnread]}
                      numberOfLines={1}
                    >
                      {item.title}
                    </Text>
                    {!item.isRead && (
                      <View style={[styles.dot, { backgroundColor: colors.primary.main }]} />
                    )}
                  </View>
                  <Text style={[styles.message, { color: colors.text.secondary }]} numberOfLines={2}>
                    {item.message}
                  </Text>
                  <Text style={[styles.time, { color: colors.text.tertiary }]}>
                    {formatRelativeTime(item.createdAt)}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <Empty icon="bell-off-outline" title="No notifications" description="You're all caught up" />
          }
        />
      )}
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  loadingCenter: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: spacing[4], paddingBottom: spacing[8] },
  row: {
    flexDirection: 'row',
    borderRadius: borderRadius.md,
    padding: spacing[3],
    marginBottom: spacing[2],
    alignItems: 'flex-start',
  },
  icon: {
    width: 40, height: 40, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center',
    marginRight: spacing[3],
  },
  rowHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 14, flex: 1 },
  titleUnread: { fontWeight: '700' },
  dot: { width: 8, height: 8, borderRadius: 4, marginLeft: spacing[2] },
  message: { fontSize: 13, marginTop: 2 },
  time: { fontSize: 11, marginTop: spacing[1] },
});
