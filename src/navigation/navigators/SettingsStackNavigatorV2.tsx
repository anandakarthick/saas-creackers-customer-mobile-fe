import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { SettingsStackParamList } from '@/types/navigation';

import { SettingsMainScreen } from '@/features/settings/screens/SettingsMainScreenV2';
import { ProfileScreen } from '@/features/settings/screens/ProfileScreen';
import { ProfileEditScreen } from '@/features/settings/screens/ProfileEditScreen';
import { ChangePasswordScreen } from '@/features/settings/screens/ChangePasswordScreen';
import { StoreSettingsScreen } from '@/features/settings/screens/StoreSettingsScreen';
import { StoreConfigScreen } from '@/features/settings/screens/StoreConfigScreen';
import { ThemeAppearanceScreen } from '@/features/settings/screens/ThemeAppearanceScreen';
import { NotificationsListScreen } from '@/features/settings/screens/NotificationsListScreen';
import { PaymentMethodsListScreen } from '@/features/settings/screens/PaymentMethodsListScreen';
import { PaymentMethodFormScreen } from '@/features/settings/screens/PaymentMethodFormScreen';
import { CsvImportExportScreen } from '@/features/settings/screens/CsvImportExportScreen';
import { EmailSettingsScreen } from '@/features/settings/screens/EmailSettingsScreen';
import { DeliverySettingsScreen } from '@/features/settings/screens/DeliverySettingsScreen';
import { PaginationSettingsScreen } from '@/features/settings/screens/PaginationSettingsScreen';
import { NotificationSettingsScreen } from '@/features/settings/screens/NotificationSettingsScreen';
import { BillFormatSettingsScreen } from '@/features/settings/screens/BillFormatSettingsScreen';
import { InvoiceNumberingScreen } from '@/features/settings/screens/InvoiceNumberingScreen';
import { SocialLinksScreen } from '@/features/settings/screens/SocialLinksScreen';
import { WhatsAppConnectionScreen } from '@/features/settings/screens/WhatsAppConnectionScreen';
import { WhatsAppTemplatesScreen } from '@/features/settings/screens/WhatsAppTemplatesScreen';

const Stack = createNativeStackNavigator<SettingsStackParamList>();

export const SettingsStackNavigator: React.FC = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="SettingsMain" component={SettingsMainScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="ProfileEdit" component={ProfileEditScreen} />
      <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
      <Stack.Screen name="StoreSettings" component={StoreSettingsScreen} />
      <Stack.Screen name="StoreConfig" component={StoreConfigScreen} />
      <Stack.Screen name="ThemeAppearance" component={ThemeAppearanceScreen} />
      <Stack.Screen name="Notifications" component={NotificationsListScreen} />
      <Stack.Screen name="PaymentMethods" component={PaymentMethodsListScreen} />
      <Stack.Screen name="PaymentMethodForm" component={PaymentMethodFormScreen} />
      <Stack.Screen name="CsvImportExport" component={CsvImportExportScreen} />
      <Stack.Screen name="EmailSettings" component={EmailSettingsScreen} />
      <Stack.Screen name="DeliverySettings" component={DeliverySettingsScreen} />
      <Stack.Screen name="PaginationSettings" component={PaginationSettingsScreen} />
      <Stack.Screen name="NotificationSettings" component={NotificationSettingsScreen} />
      <Stack.Screen name="BillFormatSettings" component={BillFormatSettingsScreen} />
      <Stack.Screen name="InvoiceNumbering" component={InvoiceNumberingScreen} />
      <Stack.Screen name="SocialLinks" component={SocialLinksScreen} />
      <Stack.Screen name="WhatsAppConnection" component={WhatsAppConnectionScreen} />
      <Stack.Screen name="WhatsAppTemplates" component={WhatsAppTemplatesScreen} />
    </Stack.Navigator>
  );
};
