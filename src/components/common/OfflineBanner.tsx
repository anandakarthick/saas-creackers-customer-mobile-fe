import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { runSync } from '@/services/offline/queue';
import { useTheme } from '@/theme';
import { spacing } from '@/theme/spacing';

/**
 * Slim banner that appears at the very top of the app whenever:
 *   - The device is offline, OR
 *   - There are pending mutations queued for sync.
 *
 * Tapping when online + pending → manual sync trigger.
 * Hides itself entirely when fully online + queue empty (no chrome noise).
 */
export const OfflineBanner: React.FC = () => {
  const { colors } = useTheme();
  const { online, pendingCount, failedCount } = useOfflineSync();

  if (online && pendingCount === 0) return null;

  const isFailed = failedCount > 0;

  let bg: string = colors.error.main;
  let icon: string = 'cloud-off-outline';
  let text = 'Offline — viewing cached data';

  if (online && pendingCount > 0) {
    bg = isFailed ? colors.warning.main : colors.info.main;
    icon = isFailed ? 'alert-circle-outline' : 'cloud-sync';
    text = isFailed
      ? `${failedCount} change${failedCount === 1 ? '' : 's'} need attention`
      : `Syncing ${pendingCount} change${pendingCount === 1 ? '' : 's'}…`;
  } else if (!online && pendingCount > 0) {
    text = `Offline · ${pendingCount} pending · viewing cached data`;
  }

  return (
    <TouchableOpacity
      activeOpacity={online ? 0.7 : 1}
      onPress={online && pendingCount > 0 ? () => runSync() : undefined}
      style={[styles.banner, { backgroundColor: bg }]}
    >
      <Icon name={icon} size={16} color="#fff" />
      <Text style={styles.text}>{text}</Text>
      {online && pendingCount > 0 && !isFailed && (
        <Text style={styles.action}>Tap to sync</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[4],
    gap: spacing[2],
  },
  text: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  action: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
});
