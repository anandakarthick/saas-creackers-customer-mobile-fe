import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { OffersStackParamList } from '@/types/navigation';

import { OffersListScreen } from '@/features/marketing/offers/screens/OffersListScreenV2';
import { OfferDetailScreen } from '@/features/marketing/offers/screens/OfferDetailScreenV2';
import { OfferFormScreen } from '@/features/marketing/offers/screens/OfferFormScreenV2';

const Stack = createNativeStackNavigator<OffersStackParamList>();

export const OffersStackNavigator: React.FC = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="OffersList" component={OffersListScreen} />
      <Stack.Screen name="OfferDetail" component={OfferDetailScreen} />
      <Stack.Screen name="OfferForm" component={OfferFormScreen} />
    </Stack.Navigator>
  );
};
