import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { AssetsStackParamList } from '@/types/navigation';

import { AssetsListScreen } from '@/features/assets/screens/AssetsListScreen';
import { AssetDetailScreen } from '@/features/assets/screens/AssetDetailScreen';
import { AssetFormScreen } from '@/features/assets/screens/AssetFormScreen';

const Stack = createNativeStackNavigator<AssetsStackParamList>();

export const AssetsStackNavigator: React.FC = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AssetsList" component={AssetsListScreen} />
      <Stack.Screen name="AssetDetail" component={AssetDetailScreen} />
      <Stack.Screen name="AssetForm" component={AssetFormScreen} />
    </Stack.Navigator>
  );
};
