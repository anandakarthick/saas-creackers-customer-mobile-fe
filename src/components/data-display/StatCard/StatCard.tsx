import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Card } from '@/components/common';
import { useTheme } from '@/theme';
import { spacing } from '@/theme/spacing';
import { formatCurrency, formatNumber, formatPercentage } from '@/utils/formatters';

interface StatCardProps {
  title: string;
  value: number;
  type?: 'number' | 'currency' | 'percentage';
  icon?: string;
  iconColor?: string;
  change?: number;
  changeLabel?: string;
  subtitle?: string;
  onPress?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  type = 'number',
  icon,
  iconColor,
  change,
  changeLabel,
  subtitle,
  onPress,
}) => {
  const { colors } = useTheme();
  const resolvedIconColor = iconColor || colors.primary.main;

  const formatValue = () => {
    switch (type) {
      case 'currency':
        return formatCurrency(value);
      case 'percentage':
        return formatPercentage(value);
      default:
        return formatNumber(value);
    }
  };

  const isPositiveChange = change !== undefined && change >= 0;

  return (
    <Card onPress={onPress} style={styles.card}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text.secondary }]}>{title}</Text>
        {icon && (
          <View style={[styles.iconContainer, { backgroundColor: resolvedIconColor + '20' }]}>
            <Icon name={icon} size={20} color={resolvedIconColor} />
          </View>
        )}
      </View>
      <Text style={[styles.value, { color: colors.text.primary }]}>{formatValue()}</Text>
      {subtitle ? (
        <Text style={[styles.subtitleText, { color: colors.text.tertiary }]}>{subtitle}</Text>
      ) : change !== undefined ? (
        <View style={styles.changeContainer}>
          <Icon
            name={isPositiveChange ? 'arrow-up' : 'arrow-down'}
            size={16}
            color={isPositiveChange ? colors.success.main : colors.error.main}
          />
          <Text
            style={[
              styles.changeText,
              { color: isPositiveChange ? colors.success.main : colors.error.main },
            ]}
          >
            {formatPercentage(Math.abs(change))}
          </Text>
          {changeLabel && (
            <Text style={[styles.changeLabel, { color: colors.text.tertiary }]}>{changeLabel}</Text>
          )}
        </View>
      ) : null}
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 150,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing[2],
  },
  title: {
    fontSize: 14,
    flex: 1,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  value: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: spacing[2],
  },
  changeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  changeText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: spacing[1],
  },
  changeLabel: {
    fontSize: 12,
    marginLeft: spacing[1],
  },
  subtitleText: {
    fontSize: 12,
  },
});
