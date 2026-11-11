import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { GRNStackParamList } from '@/types/navigation';

import { GRNListScreen } from '@/features/inventory/grn/screens/GRNListScreenV2';
import { GRNDetailScreen } from '@/features/inventory/grn/screens/GRNDetailScreen';
import { GRNFormScreen } from '@/features/inventory/grn/screens/GRNFormScreenV2';

const Stack = createNativeStackNavigator<GRNStackParamList>();

export const GRNStackNavigator: React.FC = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="GRNList" component={GRNListScreen} />
      <Stack.Screen name="GRNDetail" component={GRNDetailScreen} />
      <Stack.Screen name="GRNForm" component={GRNFormScreen} />
    </Stack.Navigator>
  );
};
