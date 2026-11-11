/**
 * Crackers Customer Shopping App — native (React Native).
 *
 * A separate, shared customer app: one codebase serves every shop. The store
 * is resolved at runtime from the injected tenant-config.json (same mechanism
 * as the staff app), and the native screens talk to the public /store/* APIs.
 *
 * @format
 */
import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StatusBar, View } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { enableScreens } from 'react-native-screens';
import { initStoreApi } from './src/customer/api/client';
import { RootNavigator } from './src/customer/navigation/RootNavigator';
import { theme } from './src/customer/theme';

enableScreens();

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 60_000 } },
});

export default function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    initStoreApi().finally(() => setReady(true));
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" backgroundColor={theme.card} />
      {ready ? (
        <QueryClientProvider client={queryClient}>
          <RootNavigator />
        </QueryClientProvider>
      ) : (
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: theme.bg,
          }}
        >
          <ActivityIndicator size="large" color={theme.accent} />
        </View>
      )}
    </SafeAreaProvider>
  );
}
