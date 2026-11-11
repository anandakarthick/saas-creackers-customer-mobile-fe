import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Image } from 'react-native';
import {
  createDrawerNavigator,
  DrawerContentScrollView,
  DrawerContentComponentProps,
} from '@react-navigation/drawer';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { DrawerParamList } from '@/types/navigation';
import { useTheme } from '@/theme';
import { spacing, borderRadius } from '@/theme/spacing';
import { Avatar } from '@/components/common';
import { useAuthStore } from '@/store';
import { APP_CONFIG } from '@/config/app';

// Navigators
import { MainTabNavigator } from './MainTabNavigator';
import { CategoriesStackNavigator } from './CategoriesStackNavigator';
import { ProductsStackNavigator } from './ProductsStackNavigator';
import { BranchesStackNavigator } from './BranchesStackNavigator';
import { EmployeesStackNavigator } from './EmployeesStackNavigator';
import { OrdersStackNavigator } from './OrdersStackNavigator';
import { CustomersStackNavigator } from './CustomersStackNavigator';
import { RolesStackNavigator } from './RolesStackNavigator';
import { SuppliersStackNavigator } from './SuppliersStackNavigator';
import { PurchaseOrdersStackNavigator } from './PurchaseOrdersStackNavigator';
import { GRNStackNavigator } from './GRNStackNavigator';
import { StockAdjustmentsStackNavigator } from './StockAdjustmentsStackNavigator';
import { SettingsStackNavigator } from './SettingsStackNavigator';
import { OffersStackNavigator } from './OffersStackNavigator';
import { BannersStackNavigator } from './BannersStackNavigator';
import { SocialMediaStackNavigator } from './SocialMediaStackNavigator';
import { POSStackNavigator } from './POSStackNavigator';

// Feature Screens (non-CRUD screens)
import { StockListScreen } from '@/features/inventory/stock/screens/StockListScreen';
import { ReportsDashboardScreen } from '@/features/reports/screens/ReportsDashboardScreen';

const Drawer = createDrawerNavigator<DrawerParamList>();

interface DrawerItemProps {
  icon: string;
  label: string;
  isActive?: boolean;
  onPress: () => void;
  colors: ReturnType<typeof useTheme>['colors'];
}

const DrawerItem: React.FC<DrawerItemProps> = ({ icon, label, isActive, onPress, colors }) => (
  <TouchableOpacity
    style={[
      styles.drawerItem,
      isActive && { backgroundColor: colors.primary.light + '20' },
    ]}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <Icon
      name={icon}
      size={22}
      color={isActive ? colors.primary.main : colors.neutral[600]}
    />
    <Text
      style={[
        styles.drawerItemLabel,
        { color: colors.text.primary },
        isActive && { color: colors.primary.main, fontWeight: '600' },
      ]}
    >
      {label}
    </Text>
  </TouchableOpacity>
);

interface DrawerSectionProps {
  title: string;
  children: React.ReactNode;
  colors: ReturnType<typeof useTheme>['colors'];
}

const DrawerSection: React.FC<DrawerSectionProps> = ({ title, children, colors }) => (
  <View style={styles.section}>
    <Text style={[styles.sectionTitle, { color: colors.text.tertiary }]}>{title}</Text>
    {children}
  </View>
);

const CustomDrawerContent: React.FC<DrawerContentComponentProps> = (props) => {
  const { navigation, state } = props;
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const isActive = (routeName: string) => {
    return state.routes[state.index]?.name === routeName;
  };

  const navigate = (routeName: keyof DrawerParamList) => {
    navigation.navigate(routeName as string);
  };

  return (
    <View style={[styles.drawerContainer, { paddingTop: insets.top, backgroundColor: colors.sidebar.background }]}>
      {/* Header */}
      <View style={[styles.drawerHeader, { borderBottomColor: colors.border.default }]}>
        <View style={styles.logoContainer}>
          <Icon name="firework" size={32} color={colors.primary.main} />
          <Text style={[styles.logoText, { color: colors.primary.main }]}>{APP_CONFIG.shortName}</Text>
        </View>
        <View style={styles.userInfo}>
          <Avatar name={user?.name || 'User'} size="medium" />
          <View style={styles.userDetails}>
            <Text style={[styles.userName, { color: colors.text.primary }]}>{user?.name || 'User'}</Text>
            <Text style={[styles.userRole, { color: colors.text.secondary }]}>{user?.role?.name || 'Staff'}</Text>
          </View>
        </View>
      </View>

      {/* Menu Items */}
      <ScrollView style={styles.drawerContent} showsVerticalScrollIndicator={false}>
        <DrawerItem
          icon="view-dashboard"
          label="Dashboard"
          isActive={isActive('MainTabs')}
          onPress={() => navigate('MainTabs')}
          colors={colors}
        />

        <DrawerItem
          icon="cart"
          label="Point of Sale"
          isActive={isActive('POS')}
          onPress={() => navigate('POS')}
          colors={colors}
        />

        <DrawerItem
          icon="clipboard-list"
          label="Orders"
          isActive={isActive('Orders')}
          onPress={() => navigate('Orders')}
          colors={colors}
        />

        <DrawerSection title="E-Commerce" colors={colors}>
          <DrawerItem
            icon="shape"
            label="Categories"
            isActive={isActive('Categories')}
            onPress={() => navigate('Categories')}
            colors={colors}
          />
          <DrawerItem
            icon="package-variant-closed"
            label="Products"
            isActive={isActive('Products')}
            onPress={() => navigate('Products')}
            colors={colors}
          />
          <DrawerItem
            icon="account-group"
            label="Customers"
            isActive={isActive('Customers')}
            onPress={() => navigate('Customers')}
            colors={colors}
          />
        </DrawerSection>

        <DrawerSection title="Organization" colors={colors}>
          <DrawerItem
            icon="store"
            label="Branches"
            isActive={isActive('Branches')}
            onPress={() => navigate('Branches')}
            colors={colors}
          />
          <DrawerItem
            icon="account-tie"
            label="Employees"
            isActive={isActive('Employees')}
            onPress={() => navigate('Employees')}
            colors={colors}
          />
          <DrawerItem
            icon="shield-account"
            label="Roles & Permissions"
            isActive={isActive('Roles')}
            onPress={() => navigate('Roles')}
            colors={colors}
          />
        </DrawerSection>

        <DrawerSection title="Procurement" colors={colors}>
          <DrawerItem
            icon="truck"
            label="Suppliers"
            isActive={isActive('Suppliers')}
            onPress={() => navigate('Suppliers')}
            colors={colors}
          />
          <DrawerItem
            icon="clipboard-text"
            label="Purchase Orders"
            isActive={isActive('PurchaseOrders')}
            onPress={() => navigate('PurchaseOrders')}
            colors={colors}
          />
        </DrawerSection>

        <DrawerSection title="Inventory" colors={colors}>
          <DrawerItem
            icon="package-variant"
            label="Stock"
            isActive={isActive('Stock')}
            onPress={() => navigate('Stock')}
            colors={colors}
          />
          <DrawerItem
            icon="clipboard-check"
            label="Goods Receipt (GRN)"
            isActive={isActive('GRN')}
            onPress={() => navigate('GRN')}
            colors={colors}
          />
          <DrawerItem
            icon="swap-horizontal"
            label="Stock Adjustments"
            isActive={isActive('StockAdjustments')}
            onPress={() => navigate('StockAdjustments')}
            colors={colors}
          />
        </DrawerSection>

        <DrawerSection title="Marketing" colors={colors}>
          <DrawerItem
            icon="image-multiple"
            label="Banners"
            isActive={isActive('Banners')}
            onPress={() => navigate('Banners')}
            colors={colors}
          />
          <DrawerItem
            icon="tag-multiple"
            label="Offers"
            isActive={isActive('Offers')}
            onPress={() => navigate('Offers')}
            colors={colors}
          />
          <DrawerItem
            icon="share-variant"
            label="Social Media"
            isActive={isActive('SocialMedia')}
            onPress={() => navigate('SocialMedia')}
            colors={colors}
          />
        </DrawerSection>

        <DrawerSection title="Reports & Settings" colors={colors}>
          <DrawerItem
            icon="chart-bar"
            label="Reports"
            isActive={isActive('Reports')}
            onPress={() => navigate('Reports')}
            colors={colors}
          />
          <DrawerItem
            icon="cog"
            label="Settings"
            isActive={isActive('Settings')}
            onPress={() => navigate('Settings')}
            colors={colors}
          />
        </DrawerSection>
      </ScrollView>

      {/* Footer */}
      <View style={[styles.drawerFooter, { paddingBottom: insets.bottom + spacing[2], borderTopColor: colors.border.default }]}>
        <TouchableOpacity style={styles.logoutButton} onPress={logout}>
          <Icon name="logout" size={22} color={colors.error.main} />
          <Text style={[styles.logoutText, { color: colors.error.main }]}>Logout</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export const DrawerNavigator: React.FC = () => {
  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerStyle: styles.drawer,
      }}
    >
      <Drawer.Screen name="MainTabs" component={MainTabNavigator} />
      <Drawer.Screen name="Orders" component={OrdersStackNavigator} />
      <Drawer.Screen name="POS" component={POSStackNavigator} />
      <Drawer.Screen name="Stock" component={StockListScreen} />
      <Drawer.Screen name="Categories" component={CategoriesStackNavigator} />
      <Drawer.Screen name="Products" component={ProductsStackNavigator} />
      <Drawer.Screen name="Customers" component={CustomersStackNavigator} />
      <Drawer.Screen name="Branches" component={BranchesStackNavigator} />
      <Drawer.Screen name="Employees" component={EmployeesStackNavigator} />
      <Drawer.Screen name="Roles" component={RolesStackNavigator} />
      <Drawer.Screen name="Suppliers" component={SuppliersStackNavigator} />
      <Drawer.Screen name="PurchaseOrders" component={PurchaseOrdersStackNavigator} />
      <Drawer.Screen name="GRN" component={GRNStackNavigator} />
      <Drawer.Screen name="StockAdjustments" component={StockAdjustmentsStackNavigator} />
      <Drawer.Screen name="Banners" component={BannersStackNavigator} />
      <Drawer.Screen name="Offers" component={OffersStackNavigator} />
      <Drawer.Screen name="SocialMedia" component={SocialMediaStackNavigator} />
      <Drawer.Screen name="Reports" component={ReportsDashboardScreen} />
      <Drawer.Screen name="Settings" component={SettingsStackNavigator} />
    </Drawer.Navigator>
  );
};

const styles = StyleSheet.create({
  drawer: {
    width: 300,
  },
  drawerContainer: {
    flex: 1,
  },
  drawerHeader: {
    padding: spacing[4],
    borderBottomWidth: 1,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  logoText: {
    fontSize: 20,
    fontWeight: '700',
    marginLeft: spacing[2],
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userDetails: {
    marginLeft: spacing[3],
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
  },
  userRole: {
    fontSize: 12,
  },
  drawerContent: {
    flex: 1,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[3],
  },
  section: {
    marginBottom: spacing[4],
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: spacing[3],
    marginBottom: spacing[2],
  },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[3],
    borderRadius: borderRadius.md,
    marginBottom: spacing[0.5],
  },
  drawerItemLabel: {
    fontSize: 14,
    marginLeft: spacing[3],
  },
  drawerFooter: {
    padding: spacing[4],
    borderTopWidth: 1,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[2],
  },
  logoutText: {
    fontSize: 14,
    marginLeft: spacing[3],
    fontWeight: '500',
  },
});
