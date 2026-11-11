import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { OrdersStackParamList } from '@/types/navigation';

import { OrdersListScreen, OrderDetailScreen } from '@/features/ecommerce/orders/screens/index.v2';

const Stack = createNativeStackNavigator<OrdersStackParamList>();

export const OrdersStackNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      // Ensures the List is always the first screen in the stack — even when we
      // deep-link to OrderDetail from the Dashboard, back-swipe lands on the List.
      initialRouteName="OrdersList"
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name="OrdersList" component={OrdersListScreen} />
      <Stack.Screen name="OrderDetail" component={OrderDetailScreen} />
    </Stack.Navigator>
  );
};
