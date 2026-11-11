import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { POSMainScreen, POSSalesHistoryScreen } from '@/features/pos/screens';

export type POSStackParamList = {
  POSMain: undefined;
  POSSalesHistory: undefined;
};

const Stack = createNativeStackNavigator<POSStackParamList>();

export const POSStackNavigator: React.FC = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="POSMain" component={POSMainScreen} />
      <Stack.Screen name="POSSalesHistory" component={POSSalesHistoryScreen} />
    </Stack.Navigator>
  );
};
