import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { OffersStackParamList } from '@/types/navigation';

import {
  OffersListScreen,
  OfferDetailScreen,
  OfferFormScreen,
} from '@/features/marketing/offers/screens';

const Stack = createNativeStackNavigator<OffersStackParamList>();

export const OffersStackNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="OffersList" component={OffersListScreen} />
      <Stack.Screen name="OfferDetail" component={OfferDetailScreen} />
      <Stack.Screen name="OfferForm" component={OfferFormScreen} />
    </Stack.Navigator>
  );
};
