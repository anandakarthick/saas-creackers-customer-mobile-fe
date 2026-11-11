import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { RolesStackParamList } from '@/types/navigation';

import {
  RolesListScreen,
  RoleDetailScreen,
  RoleFormScreen,
} from '@/features/users/roles/screens';

const Stack = createNativeStackNavigator<RolesStackParamList>();

export const RolesStackNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="RolesList" component={RolesListScreen} />
      <Stack.Screen name="RoleDetail" component={RoleDetailScreen} />
      <Stack.Screen name="RoleForm" component={RoleFormScreen} />
    </Stack.Navigator>
  );
};
