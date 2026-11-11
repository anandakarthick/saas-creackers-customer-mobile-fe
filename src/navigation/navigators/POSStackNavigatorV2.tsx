import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { POSStackParamList } from '@/types/navigation';

import { POSMainScreen } from '@/features/pos/screens/POSMainScreenV2';
import { POSSalesHistoryScreen } from '@/features/pos/screens/POSSalesHistoryScreenV2';
import { POSReceiptScreen } from '@/features/pos/screens/POSReceiptScreen';
import { POSBarcodeScannerScreen } from '@/features/pos/screens/POSBarcodeScannerScreen';

const Stack = createNativeStackNavigator<POSStackParamList>();

export const POSStackNavigator: React.FC = () => {
  return (
    <Stack.Navigator initialRouteName="POSMain" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="POSMain" component={POSMainScreen} />
      <Stack.Screen name="POSSalesHistory" component={POSSalesHistoryScreen} />
      <Stack.Screen name="POSReceipt" component={POSReceiptScreen} />
      <Stack.Screen name="POSBarcodeScanner" component={POSBarcodeScannerScreen} />
    </Stack.Navigator>
  );
};
