import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { CustomersStackParamList } from '@/types/navigation';

import {
  CustomersListScreen,
  CustomerDetailScreen,
  CustomerFormScreen,
} from '@/features/ecommerce/customers/screens';

const Stack = createNativeStackNavigator<CustomersStackParamList>();

export const CustomersStackNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="CustomersList" component={CustomersListScreen} />
      <Stack.Screen name="CustomerDetail" component={CustomerDetailScreen} />
      <Stack.Screen name="CustomerForm" component={CustomerFormScreen} />
    </Stack.Navigator>
  );
};
