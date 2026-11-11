import React from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import type { MainTabParamList } from '@/types/navigation';
import { useTheme } from '@/theme';
import { spacing } from '@/theme/spacing';

// Screens
import { DashboardScreen } from '@/features/dashboard/screens/DashboardScreen';
import { OrdersListScreen } from '@/features/ecommerce/orders/screens/OrdersListScreen';
import { StockListScreen } from '@/features/inventory/stock/screens/StockListScreen';
import { MoreScreen } from '@/features/settings/screens/MoreScreen';
import { POSStackNavigator } from './POSStackNavigator';

const Tab = createBottomTabNavigator<MainTabParamList>();

interface TabBarButtonProps {
  children: React.ReactNode;
  onPress?: (e?: any) => void;
  accessibilityState?: { selected?: boolean };
}

export const MainTabNavigator: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const POSTabButton: React.FC<TabBarButtonProps> = ({ children, onPress }) => {
    return (
      <TouchableOpacity
        style={styles.posButton}
        onPress={onPress}
        activeOpacity={0.8}
      >
        <View style={[styles.posButtonInner, {
          backgroundColor: colors.primary.main,
          shadowColor: colors.primary.main,
        }]}>
          {children}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: string;

          switch (route.name) {
            case 'DashboardTab':
              iconName = focused ? 'view-dashboard' : 'view-dashboard-outline';
              break;
            case 'OrdersTab':
              iconName = focused ? 'clipboard-list' : 'clipboard-list-outline';
              break;
            case 'POSTab':
              iconName = 'cart';
              break;
            case 'InventoryTab':
              iconName = focused ? 'package-variant-closed' : 'package-variant';
              break;
            case 'MoreTab':
              iconName = focused ? 'dots-horizontal-circle' : 'dots-horizontal-circle-outline';
              break;
            default:
              iconName = 'circle';
          }

          // POS icon should always be white since it's on a colored background
          const iconColor = route.name === 'POSTab' ? '#FFFFFF' : color;

          return <Icon name={iconName} size={route.name === 'POSTab' ? 28 : size} color={iconColor} />;
        },
        tabBarActiveTintColor: colors.primary.main,
        tabBarInactiveTintColor: colors.neutral[400],
        tabBarStyle: {
          ...styles.tabBar,
          backgroundColor: colors.surface.default,
          borderTopColor: colors.border.default,
          height: 65 + insets.bottom,
          paddingBottom: spacing[2] + insets.bottom,
        },
        tabBarLabelStyle: styles.tabBarLabel,
      })}
    >
      <Tab.Screen
        name="DashboardTab"
        component={DashboardScreen}
        options={{ tabBarLabel: 'Dashboard' }}
      />
      <Tab.Screen
        name="OrdersTab"
        component={OrdersListScreen}
        options={{ tabBarLabel: 'Orders' }}
      />
      <Tab.Screen
        name="POSTab"
        component={POSStackNavigator}
        options={{
          tabBarLabel: 'POS',
          tabBarButton: (props) => <POSTabButton {...props} />,
        }}
      />
      <Tab.Screen
        name="InventoryTab"
        component={StockListScreen}
        options={{ tabBarLabel: 'Inventory' }}
      />
      <Tab.Screen
        name="MoreTab"
        component={MoreScreen}
        options={{ tabBarLabel: 'More' }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    paddingTop: spacing[2],
    borderTopWidth: 1,
  },
  tabBarLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  posButton: {
    top: -20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  posButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
