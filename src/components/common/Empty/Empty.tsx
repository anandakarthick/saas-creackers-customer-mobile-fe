import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '@/theme';
import { spacing } from '@/theme/spacing';
import { Button } from '../Button';

interface EmptyProps {
  icon?: string;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const Empty: React.FC<EmptyProps> = ({
  icon = 'inbox-outline',
  title,
  description,
  actionLabel,
  onAction,
}) => {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <Icon name={icon} size={64} color={colors.neutral[300]} />
      <Text style={[styles.title, { color: colors.text.primary }]}>{title}</Text>
      {description && <Text style={[styles.description, { color: colors.text.secondary }]}>{description}</Text>}
      {actionLabel && onAction && (
        <Button onPress={onAction} style={styles.button}>
          {actionLabel}
        </Button>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[6],
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: spacing[4],
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    marginTop: spacing[2],
    textAlign: 'center',
  },
  button: {
    marginTop: spacing[4],
  },
});
