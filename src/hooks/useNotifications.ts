import { useEffect, useCallback } from 'react';
import { useNotificationStore } from '@/store';
import { notificationService } from '@/services/notifications';

export const useNotifications = () => {
  const {
    fcmToken,
    notifications,
    unreadCount,
    navigationIntent,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAllNotifications,
    clearNavigationIntent,
  } = useNotificationStore();

  // Initialize notifications on mount
  useEffect(() => {
    notificationService.initialize();
  }, []);

  // Subscribe to default topics
  const subscribeToTopics = useCallback(async () => {
    await notificationService.subscribeToTopic('orders');
    await notificationService.subscribeToTopic('promotions');
  }, []);

  // Unsubscribe from topics
  const unsubscribeFromTopics = useCallback(async () => {
    await notificationService.unsubscribeFromTopic('orders');
    await notificationService.unsubscribeFromTopic('promotions');
  }, []);

  return {
    fcmToken,
    notifications,
    unreadCount,
    navigationIntent,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAllNotifications,
    clearNavigationIntent,
    subscribeToTopics,
    unsubscribeFromTopics,
  };
};
