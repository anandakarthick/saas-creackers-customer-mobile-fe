import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { StockAdjustmentsStackParamList } from '@/types/navigation';

import {
  StockAdjustmentsListScreen,
  StockAdjustmentDetailScreen,
  StockAdjustmentFormScreen,
} from '@/features/inventory/adjustments/screens';

const Stack = createNativeStackNavigator<StockAdjustmentsStackParamList>();

export const StockAdjustmentsStackNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="StockAdjustmentsList" component={StockAdjustmentsListScreen} />
      <Stack.Screen name="StockAdjustmentDetail" component={StockAdjustmentDetailScreen} />
      <Stack.Screen name="StockAdjustmentForm" component={StockAdjustmentFormScreen} />
    </Stack.Navigator>
  );
};
