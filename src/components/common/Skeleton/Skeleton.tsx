import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Animated, ViewStyle } from 'react-native';
import { useTheme } from '@/theme';
import { borderRadius } from '@/theme/spacing';

interface SkeletonProps {
  width?: number | `${number}%`;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 20,
  borderRadius: radius = borderRadius.md,
  style,
}) => {
  const { colors } = useTheme();
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();

    return () => animation.stop();
  }, [animatedValue]);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          backgroundColor: colors.neutral?.[200] || '#e5e7eb',
          width,
          height,
          borderRadius: radius,
          opacity,
        },
        style,
      ]}
    />
  );
};

// Preset Skeleton Components
export const SkeletonText: React.FC<{ lines?: number; lastLineWidth?: number | `${number}%` }> = ({
  lines = 3,
  lastLineWidth = '60%',
}) => {
  return (
    <View>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          width={index === lines - 1 ? lastLineWidth : '100%'}
          height={14}
          style={index < lines - 1 ? { marginBottom: 8 } : undefined}
        />
      ))}
    </View>
  );
};

export const SkeletonCard: React.FC = () => {
  const { colors } = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: colors.surface.default }]}>
      <View style={styles.cardHeader}>
        <Skeleton width={48} height={48} borderRadius={24} />
        <View style={styles.cardHeaderText}>
          <Skeleton width="60%" height={16} />
          <Skeleton width="40%" height={12} style={{ marginTop: 8 }} />
        </View>
      </View>
      <SkeletonText lines={2} />
    </View>
  );
};

export const SkeletonListItem: React.FC = () => {
  const { colors } = useTheme();
  return (
    <View style={[styles.listItem, { backgroundColor: colors.surface.default }]}>
      <Skeleton width={44} height={44} borderRadius={8} />
      <View style={styles.listItemContent}>
        <Skeleton width="70%" height={16} />
        <Skeleton width="50%" height={12} style={{ marginTop: 8 }} />
      </View>
      <Skeleton width={60} height={20} />
    </View>
  );
};

const styles = StyleSheet.create({
  skeleton: {},
  card: {
    padding: 16,
    borderRadius: borderRadius.lg,
  },
  cardHeader: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  cardHeaderText: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  listItemContent: {
    flex: 1,
    marginLeft: 12,
  },
});
