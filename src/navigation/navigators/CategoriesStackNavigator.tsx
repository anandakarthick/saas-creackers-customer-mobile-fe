import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { CategoriesStackParamList } from '@/types/navigation';

import {
  CategoriesListScreen,
  CategoryDetailScreen,
  CategoryFormScreen,
} from '@/features/ecommerce/categories/screens';

const Stack = createNativeStackNavigator<CategoriesStackParamList>();

export const CategoriesStackNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="CategoriesList" component={CategoriesListScreen} />
      <Stack.Screen name="CategoryDetail" component={CategoryDetailScreen} />
      <Stack.Screen name="CategoryForm" component={CategoryFormScreen} />
    </Stack.Navigator>
  );
};
