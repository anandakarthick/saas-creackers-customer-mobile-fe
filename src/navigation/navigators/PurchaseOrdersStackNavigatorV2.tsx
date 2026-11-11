import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { PurchaseOrdersStackParamList } from '@/types/navigation';

import {
  PurchaseOrdersListScreen,
  PurchaseOrderDetailScreen,
  PurchaseOrderFormScreen,
} from '@/features/procurement/purchase-orders/screens/index.v2';

const Stack = createNativeStackNavigator<PurchaseOrdersStackParamList>();

export const PurchaseOrdersStackNavigator: React.FC = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="PurchaseOrdersList" component={PurchaseOrdersListScreen} />
      <Stack.Screen name="PurchaseOrderDetail" component={PurchaseOrderDetailScreen} />
      <Stack.Screen name="PurchaseOrderForm" component={PurchaseOrderFormScreen} />
    </Stack.Navigator>
  );
};
