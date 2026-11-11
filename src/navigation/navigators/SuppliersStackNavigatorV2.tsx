import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { SuppliersStackParamList } from '@/types/navigation';

import {
  SuppliersListScreen,
  SupplierDetailScreen,
  SupplierFormScreen,
} from '@/features/procurement/suppliers/screens/index.v2';

const Stack = createNativeStackNavigator<SuppliersStackParamList>();

export const SuppliersStackNavigator: React.FC = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="SuppliersList" component={SuppliersListScreen} />
      <Stack.Screen name="SupplierDetail" component={SupplierDetailScreen} />
      <Stack.Screen name="SupplierForm" component={SupplierFormScreen} />
    </Stack.Navigator>
  );
};
