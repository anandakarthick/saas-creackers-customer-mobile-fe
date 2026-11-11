import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { SocialMediaStackParamList } from '@/types/navigation';

import { SocialMediaListScreen } from '@/features/marketing/social/screens/SocialMediaListScreenV2';
import { SocialMediaFormScreen } from '@/features/marketing/social/screens/SocialMediaFormScreenV2';

const Stack = createNativeStackNavigator<SocialMediaStackParamList>();

export const SocialMediaStackNavigator: React.FC = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="SocialMediaList" component={SocialMediaListScreen} />
      <Stack.Screen name="SocialMediaForm" component={SocialMediaFormScreen} />
    </Stack.Navigator>
  );
};
