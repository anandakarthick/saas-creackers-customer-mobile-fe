import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { SettingsStackParamList } from '@/types/navigation';

import {
  SettingsMainScreen,
  NotificationsScreen,
} from '@/features/settings/screens';

const Stack = createNativeStackNavigator<SettingsStackParamList>();

export const SettingsStackNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="SettingsMain" component={SettingsMainScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
    </Stack.Navigator>
  );
};
