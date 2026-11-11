import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { BannersStackParamList } from '@/types/navigation';

import {
  BannersListScreen,
  BannerDetailScreen,
  BannerFormScreen,
} from '@/features/marketing/banners/screens';

const Stack = createNativeStackNavigator<BannersStackParamList>();

export const BannersStackNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="BannersList" component={BannersListScreen} />
      <Stack.Screen name="BannerDetail" component={BannerDetailScreen} />
      <Stack.Screen name="BannerForm" component={BannerFormScreen} />
    </Stack.Navigator>
  );
};
