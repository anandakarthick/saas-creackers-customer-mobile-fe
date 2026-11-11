import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ScreenWrapper, Header } from '@/components/layout';
import { Empty } from '@/components/common';
import { useTheme } from '@/theme';
import { spacing, borderRadius } from '@/theme/spacing';
import { notificationsApi } from '@/services/api';
import { useNotificationStore } from '@/store/notification.store';
import { formatRelativeTime } from '@/utils';

type FilterType = 'all' | 'unread';

interface NotificationItem {
  id: number | string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  link?: string | null;
  createdAt: string;
}

const getNotificationIcon = (type: string): string => {
  switch (type?.toLowerCase()) {
    case 'order':
      return 'clipboard-list';
    case 'stock':
      return 'package-variant';
    case 'system':
      return 'cog';
    case 'promotion':
      return 'tag-multiple';
    case 'payment':
      return 'credit-card';
    default:
      return 'bell';
  }
};

const getNotificationColor = (type: string, colors: ReturnType<typeof useTheme>['colors']): string => {
  switch (type?.toLowerCase()) {
    case 'order':
      return colors.info.main;
    case 'stock':
      return colors.warning.main;
    case 'system':
      return colors.neutral[500];
    case 'promotion':
      return colors.secondary.main;
    case 'payment':
      return colors.success.main;
    default:
      return colors.primary.main;
  }
};

export const NotificationsScreen: React.FC = () => {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<FilterType>('all');
  const markAllStoreRead = useNotificationStore((s) => s.markAllAsRead);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['notifications', filter === 'unread'],
    queryFn: () =>
      notificationsApi.getNotifications({
        unread: filter === 'unread' ? true : undefined,
        limit: 50,
      }),
  });

  const notifications: NotificationItem[] = (data?.notifications || []).map((n: any) => ({
    id: n.id,
    type: n.type || 'system',
    title: n.title || 'Notification',
    message: n.message || n.body || '',
    isRead: !!n.isRead,
    link: n.link,
    createdAt: n.createdAt,
  }));

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const markReadMutation = useMutation({
    mutationFn: (id: number | string) => notificationsApi.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => {
      markAllStoreRead();
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const onRefresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const handleNotificationPress = (notification: NotificationItem) => {
    if (!notification.isRead) {
      markReadMutation.mutate(notification.id);
    }

    // Navigate to the relevant screen based on notification type / link
    const notifType = notification.type?.toLowerCase();
    if (notifType === 'order' && notification.link) {
      // link is typically the order ID or a path like "/orders/123"
      const orderId = notification.link.replace(/.*\//, ''); // extract last segment
      if (orderId) {
        (navigation as any).navigate('Orders', {
          screen: 'OrderDetail',
          params: { id: orderId },
        });
      }
    } else if (notifType === 'order') {
      // No specific link — just go to orders list
      (navigation as any).navigate('Orders');
    }
  };

  const renderNotification = ({ item }: { item: NotificationItem }) => {
    const iconColor = getNotificationColor(item.type, colors);

    return (
      <TouchableOpacity
        style={[
          styles.notificationCard,
          { backgroundColor: colors.surface.default },
          !item.isRead && {
            backgroundColor: colors.primary.light + '10',
            borderLeftWidth: 3,
            borderLeftColor: colors.primary.main,
          },
        ]}
        onPress={() => handleNotificationPress(item)}
        activeOpacity={0.7}
      >
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: iconColor + '20' },
          ]}
        >
          <Icon
            name={getNotificationIcon(item.type)}
            size={22}
            color={iconColor}
          />
        </View>

        <View style={styles.contentContainer}>
          <View style={styles.headerRow}>
            <Text
              style={[
                styles.title,
                { color: colors.text.primary },
                !item.isRead && styles.titleUnread,
              ]}
              numberOfLines={1}
            >
              {item.title}
            </Text>
            {!item.isRead && (
              <View style={[styles.unreadDot, { backgroundColor: colors.primary.main }]} />
            )}
          </View>

          <Text
            style={[styles.message, { color: colors.text.secondary }]}
            numberOfLines={2}
          >
            {item.message}
          </Text>

          <Text style={[styles.time, { color: colors.text.tertiary }]}>
            {formatRelativeTime(item.createdAt)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const FilterTab: React.FC<{ label: string; value: FilterType; count?: number }> = ({
    label,
    value,
    count,
  }) => {
    const isActive = filter === value;
    return (
      <TouchableOpacity
        style={[
          styles.filterTab,
          isActive && { backgroundColor: colors.primary.main },
        ]}
        onPress={() => setFilter(value)}
      >
        <Text
          style={[
            styles.filterLabel,
            { color: isActive ? colors.neutral[0] : colors.text.secondary },
          ]}
        >
          {label}
        </Text>
        {count !== undefined && count > 0 && (
          <View
            style={[
              styles.filterBadge,
              { backgroundColor: isActive ? colors.neutral[0] : colors.primary.main },
            ]}
          >
            <Text
              style={[
                styles.filterBadgeText,
                { color: isActive ? colors.primary.main : colors.neutral[0] },
              ]}
            >
              {count > 99 ? '99+' : count}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <ScreenWrapper scrollable={false} padding={false}>
      <Header
        title="Notifications"
        subtitle={`${unreadCount} unread`}
        showBack
        actions={
          unreadCount > 0
            ? [
                {
                  icon: 'check-all',
                  onPress: () => markAllReadMutation.mutate(),
                },
              ]
            : undefined
        }
      />

      {/* Filter Tabs */}
      <View style={[styles.filterContainer, { backgroundColor: colors.background.default }]}>
        <FilterTab label="All" value="all" />
        <FilterTab label="Unread" value="unread" count={unreadCount} />
      </View>

      <FlatList
        data={notifications}
        renderItem={renderNotification}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isFetching}
            onRefresh={onRefresh}
            colors={[colors.primary.main]}
            tintColor={colors.primary.main}
          />
        }
        ListEmptyComponent={
          isLoading ? null : (
            <Empty
              icon="bell-off-outline"
              title={filter === 'unread' ? 'All caught up!' : 'No notifications'}
              description={
                filter === 'unread'
                  ? 'You have read all your notifications'
                  : 'You have no notifications yet'
              }
            />
          )
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    gap: spacing[2],
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.full,
    backgroundColor: 'transparent',
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  filterBadge: {
    marginLeft: spacing[2],
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    minWidth: 20,
    alignItems: 'center',
  },
  filterBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  listContent: {
    padding: spacing[4],
    paddingTop: 0,
    flexGrow: 1,
  },
  separator: {
    height: spacing[2],
  },
  notificationCard: {
    flexDirection: 'row',
    padding: spacing[4],
    borderRadius: borderRadius.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    flex: 1,
    marginLeft: spacing[3],
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  title: {
    fontSize: 15,
    fontWeight: '500',
    flex: 1,
  },
  titleUnread: {
    fontWeight: '600',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: spacing[2],
  },
  message: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: spacing[2],
  },
  time: {
    fontSize: 12,
  },
});
