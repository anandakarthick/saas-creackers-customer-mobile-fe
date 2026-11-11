import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { spacing } from '@/theme/spacing';

interface HeaderAction {
  icon: string;
  onPress: () => void;
  badge?: number;
}

interface HeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  showDrawer?: boolean;
  actions?: HeaderAction[];
  transparent?: boolean;
  light?: boolean;
  onBackPress?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  showBack = false,
  showDrawer = false,
  actions = [],
  transparent = false,
  light = false,
  onBackPress,
}) => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const textColor = light ? colors.neutral[0] : colors.text.primary;
  const iconColor = light ? colors.neutral[0] : colors.text.primary;

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top + spacing[2] },
        !transparent && { backgroundColor: colors.surface.default, borderBottomWidth: 1, borderBottomColor: colors.border.default },
      ]}
    >
      <View style={styles.leftSection}>
        {showBack && (
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => (onBackPress ? onBackPress() : navigation.goBack())}
          >
            <Icon name="arrow-left" size={24} color={iconColor} />
          </TouchableOpacity>
        )}
        {showDrawer && (
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => navigation.openDrawer()}
          >
            <Icon name="menu" size={24} color={iconColor} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.titleSection}>
        <Text style={[styles.title, { color: textColor }]} numberOfLines={1}>
          {title}
        </Text>
        {subtitle && (
          <Text style={[styles.subtitle, { color: light ? colors.neutral[200] : colors.text.secondary }]} numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </View>

      <View style={styles.rightSection}>
        {actions.map((action, index) => (
          <TouchableOpacity
            key={index}
            style={styles.iconButton}
            onPress={action.onPress}
          >
            <Icon name={action.icon} size={24} color={iconColor} />
            {action.badge !== undefined && action.badge > 0 && (
              <View style={[styles.badge, { backgroundColor: colors.error.main }]}>
                <Text style={[styles.badgeText, { color: colors.neutral[0] }]}>
                  {action.badge > 99 ? '99+' : action.badge}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[2],
    paddingBottom: spacing[2],
    minHeight: 56,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 48,
  },
  titleSection: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: spacing[2],
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 48,
    justifyContent: 'flex-end',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  iconButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
});
