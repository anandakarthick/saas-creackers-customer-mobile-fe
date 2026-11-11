import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { OrdersStackParamList } from '@/types/navigation';

import {
  OrdersListScreen,
  OrderDetailScreen,
  OrderFormScreen,
} from '@/features/ecommerce/orders/screens';

const Stack = createNativeStackNavigator<OrdersStackParamList>();

export const OrdersStackNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="OrdersList" component={OrdersListScreen} />
      <Stack.Screen name="OrderDetail" component={OrderDetailScreen} />
      <Stack.Screen name="OrderForm" component={OrderFormScreen} />
    </Stack.Navigator>
  );
};
