import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/types/navigation';
import { useAuthStore } from '@/store';
import { useTenantTheme } from '@/hooks/useTenantTheme';
import { AuthNavigator } from './AuthNavigator';
// Switched from DrawerNavigator → DrawerNavigatorV2 so every section that
// has a "V2" variant (Orders, Customers, Suppliers, Purchase Orders,
// Roles, Banners, Offers, Social Media, GRN, Stock Adjustments, POS,
// Settings, MainTabs) routes to the API-backed V2 screens instead of the
// original mock-data V1 screens. The V1 navigators still live in-repo
// for reference but are no longer mounted.
import { DrawerNavigator as DrawerNavigatorV2 } from './DrawerNavigatorV2';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator: React.FC = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const hasHydrated = useAuthStore((state) => state._hasHydrated);

  // Syncs the mobile theme with the tenant's theme stored in the backend.
  // Refetches on mount and whenever the app returns to the foreground, so
  // admin-side theme changes propagate without requiring a re-login.
  useTenantTheme();

  // Wait for Zustand to finish restoring auth state from AsyncStorage
  // before deciding which navigator to show. Without this gate, the app
  // briefly renders the Auth screen (isAuthenticated defaults to false),
  // then flips to Main once hydration completes — crashing navigation.
  if (!hasHydrated) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {isAuthenticated ? (
        <Stack.Screen name="Main" component={DrawerNavigatorV2} />
      ) : (
        <Stack.Screen name="Auth" component={AuthNavigator} />
      )}
    </Stack.Navigator>
  );
};

const styles = StyleSheet.create({
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
