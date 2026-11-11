import React from 'react';
import { StyleSheet, View, Text, Image, ViewStyle } from 'react-native';
import { useTheme } from '@/theme';
import { getInitials } from '@/utils/formatters';

type AvatarSize = 'small' | 'medium' | 'large' | 'xlarge';

interface AvatarProps {
  name?: string;
  source?: string;
  size?: AvatarSize;
  backgroundColor?: string;
  style?: ViewStyle;
}

export const Avatar: React.FC<AvatarProps> = ({
  name,
  source,
  size = 'medium',
  backgroundColor,
  style,
}) => {
  const { colors } = useTheme();

  const getSizeValue = (): number => {
    switch (size) {
      case 'small':
        return 32;
      case 'large':
        return 56;
      case 'xlarge':
        return 80;
      default:
        return 44;
    }
  };

  const getFontSize = (): number => {
    switch (size) {
      case 'small':
        return 12;
      case 'large':
        return 20;
      case 'xlarge':
        return 28;
      default:
        return 16;
    }
  };

  const sizeValue = getSizeValue();
  const initials = name ? getInitials(name) : '?';
  const bgColor = backgroundColor || colors.primary.main;

  return (
    <View
      style={[
        styles.container,
        {
          width: sizeValue,
          height: sizeValue,
          borderRadius: sizeValue / 2,
          backgroundColor: source ? colors.neutral[200] : bgColor,
        },
        style,
      ]}
    >
      {source ? (
        <Image
          source={{ uri: source }}
          style={[
            styles.image,
            {
              width: sizeValue,
              height: sizeValue,
              borderRadius: sizeValue / 2,
            },
          ]}
        />
      ) : (
        <Text style={[styles.initials, { fontSize: getFontSize(), color: colors.neutral[0] }]}>
          {initials}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  image: {
    resizeMode: 'cover',
  },
  initials: {
    fontWeight: '600',
  },
});
