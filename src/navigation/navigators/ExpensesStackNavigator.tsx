import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { ExpensesStackParamList } from '@/types/navigation';

import { ExpensesListScreen } from '@/features/expenses/screens/ExpensesListScreen';
import { ExpenseDetailScreen } from '@/features/expenses/screens/ExpenseDetailScreen';
import { ExpenseFormScreen } from '@/features/expenses/screens/ExpenseFormScreen';

const Stack = createNativeStackNavigator<ExpensesStackParamList>();

export const ExpensesStackNavigator: React.FC = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ExpensesList" component={ExpensesListScreen} />
      <Stack.Screen name="ExpenseDetail" component={ExpenseDetailScreen} />
      <Stack.Screen name="ExpenseForm" component={ExpenseFormScreen} />
    </Stack.Navigator>
  );
};
