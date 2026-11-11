import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { BranchesStackParamList } from '@/types/navigation';

import {
  BranchesListScreen,
  BranchDetailScreen,
  BranchFormScreen,
} from '@/features/organization/branches/screens';

const Stack = createNativeStackNavigator<BranchesStackParamList>();

export const BranchesStackNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="BranchesList" component={BranchesListScreen} />
      <Stack.Screen name="BranchDetail" component={BranchDetailScreen} />
      <Stack.Screen name="BranchForm" component={BranchFormScreen} />
    </Stack.Navigator>
  );
};
