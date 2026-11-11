import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { ReportsStackParamList } from '@/types/navigation';

import {
  ReportsDashboardScreen,
  CustomerReportScreen,
  SalesReportScreen,
  ProductReportScreen,
  InventoryReportScreen,
  PurchaseOrderReportScreen,
  GRNReportScreen,
  AdjustmentsReportScreen,
  FinancialReportScreen,
} from '@/features/reports/screens';

const Stack = createNativeStackNavigator<ReportsStackParamList>();

export const ReportsStackNavigator: React.FC = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ReportsDashboard" component={ReportsDashboardScreen} />
      <Stack.Screen name="CustomerReport" component={CustomerReportScreen} />
      <Stack.Screen name="SalesReport" component={SalesReportScreen} />
      <Stack.Screen name="ProductReport" component={ProductReportScreen} />
      <Stack.Screen name="InventoryReport" component={InventoryReportScreen} />
      <Stack.Screen name="PurchaseOrderReport" component={PurchaseOrderReportScreen} />
      <Stack.Screen name="GRNReport" component={GRNReportScreen} />
      <Stack.Screen name="AdjustmentsReport" component={AdjustmentsReportScreen} />
      <Stack.Screen name="FinancialReport" component={FinancialReportScreen} />
    </Stack.Navigator>
  );
};
