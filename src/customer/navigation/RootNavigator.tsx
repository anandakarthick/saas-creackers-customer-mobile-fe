import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { theme } from '../theme';
import { useCart, cartCount } from '../store/cartStore';
import { HomeScreen } from '../screens/HomeScreen';
import { ShopScreen } from '../screens/ShopScreen';
import { CartScreen } from '../screens/CartScreen';
import { TrackOrderScreen } from '../screens/TrackOrderScreen';
import { ProductScreen } from '../screens/ProductScreen';
import { CheckoutScreen } from '../screens/CheckoutScreen';

export type RootStackParamList = {
  Tabs: undefined;
  Product: { slug: string; name?: string };
  Checkout: undefined;
};

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const TAB_ICONS: Record<string, string> = {
  Home: 'home-variant',
  Shop: 'storefront',
  Cart: 'cart',
  Track: 'truck-delivery',
};

function Tabs() {
  const items = useCart((s) => s.items);
  const count = cartCount(items);
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: theme.accent,
        tabBarInactiveTintColor: theme.sub,
        tabBarIcon: ({ color, size }) => (
          <Icon name={TAB_ICONS[route.name] || 'circle'} size={size} color={color} />
        ),
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Shop" component={ShopScreen} />
      <Tab.Screen
        name="Cart"
        component={CartScreen}
        options={{ tabBarBadge: count > 0 ? count : undefined }}
      />
      <Tab.Screen name="Track" component={TrackOrderScreen} options={{ title: 'Track Order' }} />
    </Tab.Navigator>
  );
}

export function RootNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerTintColor: theme.text,
          headerStyle: { backgroundColor: theme.card },
        }}
      >
        <Stack.Screen name="Tabs" component={Tabs} options={{ headerShown: false }} />
        <Stack.Screen
          name="Product"
          component={ProductScreen}
          options={({ route }: any) => ({ title: route.params?.name || 'Product' })}
        />
        <Stack.Screen name="Checkout" component={CheckoutScreen} options={{ title: 'Checkout' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
