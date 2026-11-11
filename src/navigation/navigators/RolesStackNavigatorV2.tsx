import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { RolesStackParamList } from '@/types/navigation';

import { RolesListScreen } from '@/features/users/roles/screens/RolesListScreenV2';
import { RoleDetailScreen } from '@/features/users/roles/screens/RoleDetailScreen';
import { RoleFormScreen } from '@/features/users/roles/screens/RoleFormScreenV2';
import { PermissionsScreen } from '@/features/users/roles/screens/PermissionsScreen';

const Stack = createNativeStackNavigator<RolesStackParamList>();

export const RolesStackNavigator: React.FC = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="RolesList" component={RolesListScreen} />
      <Stack.Screen name="RoleDetail" component={RoleDetailScreen} />
      <Stack.Screen name="RoleForm" component={RoleFormScreen} />
      <Stack.Screen name="Permissions" component={PermissionsScreen} />
    </Stack.Navigator>
  );
};
