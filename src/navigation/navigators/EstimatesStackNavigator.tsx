import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { EstimatesStackParamList } from '@/types/navigation';

import {
  EstimatesListScreen,
  EstimateDetailScreen,
  EstimateFormScreen,
} from '@/features/procurement/estimates/screens';

const Stack = createNativeStackNavigator<EstimatesStackParamList>();

export const EstimatesStackNavigator: React.FC = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="EstimatesList" component={EstimatesListScreen} />
      <Stack.Screen name="EstimateDetail" component={EstimateDetailScreen} />
      <Stack.Screen name="EstimateForm" component={EstimateFormScreen} />
    </Stack.Navigator>
  );
};
