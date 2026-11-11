import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { InventoryStackParamList } from '@/types/navigation';

import { StockListScreen } from '@/features/inventory/stock/screens/StockListScreen';
import { StockDetailScreen } from '@/features/inventory/stock/screens/StockDetailScreen';
import { LowStockAlertScreen } from '@/features/inventory/low-stock/screens/LowStockAlertScreen';
import { StockValuationScreen } from '@/features/inventory/valuation/screens/StockValuationScreen';

const Stack = createNativeStackNavigator<InventoryStackParamList>();

/**
 * Groups all inventory-related screens under a single stack so the drawer /
 * bottom-tab "Stock" entry can deep-link into Low Stock Alerts or Valuation
 * without losing back-navigation to the main stock list.
 */
export const InventoryStackNavigator: React.FC = () => {
  return (
    <Stack.Navigator initialRouteName="StockList" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="StockList" component={StockListScreen} />
      <Stack.Screen name="StockDetail" component={StockDetailScreen} />
      <Stack.Screen name="LowStock" component={LowStockAlertScreen} />
      <Stack.Screen name="StockValuation" component={StockValuationScreen} />
    </Stack.Navigator>
  );
};
