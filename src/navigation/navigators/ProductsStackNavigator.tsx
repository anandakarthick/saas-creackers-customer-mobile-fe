import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { ProductsStackParamList } from '@/types/navigation';

import {
  ProductsListScreen,
  ProductDetailScreen,
  ProductFormScreen,
  BarcodePrintJobsScreen,
  BulkUpdateScreen,
} from '@/features/ecommerce/products/screens';

const Stack = createNativeStackNavigator<ProductsStackParamList>();

export const ProductsStackNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="ProductsList" component={ProductsListScreen} />
      <Stack.Screen name="ProductDetail" component={ProductDetailScreen} />
      <Stack.Screen name="ProductForm" component={ProductFormScreen} />
      <Stack.Screen name="BarcodePrintJobs" component={BarcodePrintJobsScreen} />
      <Stack.Screen name="BulkUpdate" component={BulkUpdateScreen} />
    </Stack.Navigator>
  );
};
