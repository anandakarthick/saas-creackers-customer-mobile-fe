import React, { useState } from 'react';
import { Image, View, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { API_CONFIG } from '@/config/api';

const getPlaceholderUrl = () => {
  const origin = API_CONFIG.BASE_URL.replace(/\/api\/?$/, '');
  return `${origin}/images/no-product-image.png`;
};

interface Props {
  size?: number;
  style?: any;
  iconSize?: number;
  borderRadius?: number;
}

export function ProductImagePlaceholder({
  size = 48,
  style,
  iconSize,
  borderRadius: br = 8,
}: Props) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <View
        style={[
          styles.fallback,
          {
            width: size,
            height: size,
            borderRadius: br,
          },
          style,
        ]}
      >
        <Icon
          name="image-off-outline"
          size={iconSize || Math.max(size * 0.5, 16)}
          color="#9CA3AF"
        />
      </View>
    );
  }

  return (
    <Image
      source={{ uri: getPlaceholderUrl() }}
      style={[
        {
          width: size,
          height: size,
          borderRadius: br,
          backgroundColor: '#F3F4F6',
        },
        style,
      ]}
      resizeMode="cover"
      onError={() => setFailed(true)}
    />
  );
}

const styles = StyleSheet.create({
  fallback: {
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
