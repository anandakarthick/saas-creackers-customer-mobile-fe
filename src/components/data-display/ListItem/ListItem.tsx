import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Image } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '@/theme';
import { spacing, borderRadius } from '@/theme/spacing';
import { Avatar } from '@/components/common';
import { safeImageUri } from '@/utils/imageUrl';

interface ListItemProps {
  title: string;
  subtitle?: string;
  description?: string;
  leftIcon?: string;
  leftImage?: string | object;
  leftAvatar?: string;
  rightText?: string;
  rightSubtext?: string;
  rightIcon?: string;
  rightIconColor?: string;
  showChevron?: boolean;
  badge?: React.ReactNode;
  onPress?: () => void;
  disabled?: boolean;
}

export const ListItem: React.FC<ListItemProps> = ({
  title,
  subtitle,
  description,
  leftIcon,
  leftImage,
  leftAvatar,
  rightText,
  rightSubtext,
  rightIcon,
  rightIconColor,
  showChevron = false,
  badge,
  onPress,
  disabled = false,
}) => {
  const { colors } = useTheme();

  const renderLeft = () => {
    if (leftImage) {
      const imageUri = safeImageUri(leftImage);
      if (!imageUri) return null;
      return (
        <Image source={{ uri: imageUri }} style={styles.leftImage} />
      );
    }
    if (leftAvatar) {
      return <Avatar name={leftAvatar} size="medium" />;
    }
    if (leftIcon) {
      return (
        <View style={[styles.leftIconContainer, { backgroundColor: colors.primary.light + '20' }]}>
          <Icon name={leftIcon} size={24} color={colors.primary.main} />
        </View>
      );
    }
    return null;
  };

  const renderRight = () => {
    return (
      <View style={styles.rightSection}>
        {rightText && (
          <View style={styles.rightTextContainer}>
            <Text style={[styles.rightText, { color: colors.text.primary }]}>{rightText}</Text>
            {rightSubtext && (
              <Text style={[styles.rightSubtext, { color: colors.text.tertiary }]}>{rightSubtext}</Text>
            )}
          </View>
        )}
        {badge}
        {rightIcon && (
          <Icon
            name={rightIcon}
            size={20}
            color={rightIconColor || colors.neutral?.[400] || '#9ca3af'}
            style={styles.rightIcon}
          />
        )}
        {showChevron && (
          <Icon
            name="chevron-right"
            size={24}
            color={colors.neutral?.[400] || '#9ca3af'}
          />
        )}
      </View>
    );
  };

  const Container = onPress ? TouchableOpacity : View;

  return (
    <Container
      style={[styles.container, { backgroundColor: colors.surface.default, borderBottomColor: colors.border.default }, disabled && styles.disabled]}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={disabled}
    >
      {renderLeft()}
      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: colors.text.primary }]} numberOfLines={1}>
            {title}
          </Text>
        </View>
        {subtitle && (
          <Text style={[styles.subtitle, { color: colors.text.secondary }]} numberOfLines={1}>
            {subtitle}
          </Text>
        )}
        {description && (
          <Text style={[styles.description, { color: colors.text.tertiary }]} numberOfLines={2}>
            {description}
          </Text>
        )}
      </View>
      {renderRight()}
    </Container>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    borderBottomWidth: 1,
  },
  disabled: {
    opacity: 0.5,
  },
  leftImage: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    marginRight: spacing[3],
  },
  leftIconContainer: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing[3],
  },
  content: {
    flex: 1,
    marginRight: spacing[2],
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  subtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  description: {
    fontSize: 13,
    marginTop: 4,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rightTextContainer: {
    alignItems: 'flex-end',
    marginRight: spacing[2],
  },
  rightText: {
    fontSize: 15,
    fontWeight: '600',
  },
  rightSubtext: {
    fontSize: 12,
    marginTop: 2,
  },
  rightIcon: {
    marginRight: spacing[2],
  },
});
