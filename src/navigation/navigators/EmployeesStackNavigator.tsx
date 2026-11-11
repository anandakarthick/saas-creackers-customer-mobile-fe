import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { EmployeesStackParamList } from '@/types/navigation';

import {
  EmployeesListScreen,
  EmployeeDetailScreen,
  EmployeeFormScreen,
} from '@/features/users/employees/screens';

const Stack = createNativeStackNavigator<EmployeesStackParamList>();

export const EmployeesStackNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="EmployeesList" component={EmployeesListScreen} />
      <Stack.Screen name="EmployeeDetail" component={EmployeeDetailScreen} />
      <Stack.Screen name="EmployeeForm" component={EmployeeFormScreen} />
    </Stack.Navigator>
  );
};
