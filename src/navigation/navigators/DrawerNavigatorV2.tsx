import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Image } from 'react-native';
import { useStoreInfo } from '@/hooks/useStoreInfo';
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
import { MainTabNavigator } from './MainTabNavigatorV2';
import { CategoriesStackNavigator } from './CategoriesStackNavigator';
import { ProductsStackNavigator } from './ProductsStackNavigator';
import { BranchesStackNavigator } from './BranchesStackNavigator';
import { EmployeesStackNavigator } from './EmployeesStackNavigator';
import { OrdersStackNavigator } from './OrdersStackNavigatorV2';
import { CustomersStackNavigator } from './CustomersStackNavigatorV2';
import { SuppliersStackNavigator } from './SuppliersStackNavigatorV2';
import { PurchaseOrdersStackNavigator } from './PurchaseOrdersStackNavigatorV2';
import { EstimatesStackNavigator } from './EstimatesStackNavigator';
import { RolesStackNavigator } from './RolesStackNavigatorV2';
import { BannersStackNavigator } from './BannersStackNavigatorV2';
import { OffersStackNavigator } from './OffersStackNavigatorV2';
import { SocialMediaStackNavigator } from './SocialMediaStackNavigatorV2';
import { GRNStackNavigator } from './GRNStackNavigatorV2';
import { StockAdjustmentsStackNavigator } from './StockAdjustmentsStackNavigatorV2';
import { POSStackNavigator } from './POSStackNavigatorV2';
import { InventoryStackNavigator } from './InventoryStackNavigator';
import { ReportsStackNavigator } from './ReportsStackNavigator';
import { ExpensesStackNavigator } from './ExpensesStackNavigator';
import { SalesReturnsStackNavigator, PurchaseReturnsStackNavigator, CreditNotesStackNavigator, DebitNotesStackNavigator } from './ReturnsAndNotesNavigators';
import { AssetsStackNavigator } from './AssetsStackNavigator';
import { SettingsStackNavigator } from './SettingsStackNavigatorV2';

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
      color={isActive ? colors.primary.main : colors.text.secondary}
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
  const { name: storeName, logoUrl } = useStoreInfo();

  const isActive = (routeName: string) => {
    return state.routes[state.index]?.name === routeName;
  };

  const getPOSScreenName = (): string | undefined => {
    const posRoute = state.routes.find(r => r.name === 'POS');
    const nested = (posRoute?.state as any)?.routes;
    if (nested) return nested[nested.length - 1]?.name;
    return undefined;
  };

  // Map of drawer screen names to their stack's initial screen.
  // When navigating via the drawer, always reset to the initial screen
  // so the user doesn't land on a stale sub-screen (e.g. Notifications
  // instead of SettingsMain).
  const initialScreenMap: Partial<Record<string, string>> = {
    Settings: 'SettingsMain',
    Orders: 'OrdersList',
    POS: 'POSMain',
    Products: 'ProductsList',
    Categories: 'CategoriesList',
    Customers: 'CustomersList',
    Branches: 'BranchesList',
    Employees: 'EmployeesList',
    Roles: 'RolesList',
    Suppliers: 'SuppliersList',
    PurchaseOrders: 'PurchaseOrdersList',
    Estimates: 'EstimatesList',
    GRN: 'GRNList',
    StockAdjustments: 'StockAdjustmentsList',
    Banners: 'BannersList',
    Offers: 'OffersList',
    SocialMedia: 'SocialMediaList',
    Expenses: 'ExpensesList',
    Assets: 'AssetsList',
  };

  const navigate = (routeName: keyof DrawerParamList) => {
    const initialScreen = initialScreenMap[routeName as string];
    if (initialScreen) {
      // Navigate to the drawer screen and reset its stack to the initial screen
      navigation.navigate(routeName as string, { screen: initialScreen });
    } else {
      navigation.navigate(routeName as string);
    }
  };

  return (
    <View style={[styles.drawerContainer, { paddingTop: insets.top, backgroundColor: colors.sidebar.background }]}>
      {/* Header — pulls name/logo from the tenant record when available */}
      <View style={[styles.drawerHeader, { borderBottomColor: colors.border.default }]}>
        <View style={styles.logoContainer}>
          {logoUrl ? (
            <Image source={{ uri: logoUrl }} style={styles.logoImage} resizeMode="contain" />
          ) : (
            <Icon name="firework" size={32} color={colors.primary.main} />
          )}
          <Text style={[styles.logoText, { color: colors.primary.main }]} numberOfLines={1}>
            {storeName || APP_CONFIG.shortName}
          </Text>
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

        <DrawerSection title="Returns & Notes" colors={colors}>
          <DrawerItem
            icon="undo-variant"
            label="Sales Returns"
            isActive={isActive('SalesReturns')}
            onPress={() => navigate('SalesReturns')}
            colors={colors}
          />
          <DrawerItem
            icon="package-variant-closed-minus"
            label="Purchase Returns"
            isActive={isActive('PurchaseReturns')}
            onPress={() => navigate('PurchaseReturns')}
            colors={colors}
          />
          <DrawerItem
            icon="file-document-minus"
            label="Credit Notes"
            isActive={isActive('CreditNotes')}
            onPress={() => navigate('CreditNotes')}
            colors={colors}
          />
          <DrawerItem
            icon="file-document-plus"
            label="Debit Notes"
            isActive={isActive('DebitNotes')}
            onPress={() => navigate('DebitNotes')}
            colors={colors}
          />
        </DrawerSection>

        <DrawerSection title="Finance" colors={colors}>
          <DrawerItem
            icon="cash-minus"
            label="Expenses"
            isActive={isActive('Expenses')}
            onPress={() => navigate('Expenses')}
            colors={colors}
          />
          <DrawerItem
            icon="package-variant"
            label="Assets"
            isActive={isActive('Assets')}
            onPress={() => navigate('Assets')}
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
      <Drawer.Screen name="Stock" component={InventoryStackNavigator} />
      <Drawer.Screen name="Categories" component={CategoriesStackNavigator} />
      <Drawer.Screen name="Products" component={ProductsStackNavigator} />
      <Drawer.Screen name="Customers" component={CustomersStackNavigator} />
      <Drawer.Screen name="Branches" component={BranchesStackNavigator} />
      <Drawer.Screen name="Employees" component={EmployeesStackNavigator} />
      <Drawer.Screen name="Roles" component={RolesStackNavigator} />
      <Drawer.Screen name="Suppliers" component={SuppliersStackNavigator} />
      <Drawer.Screen name="PurchaseOrders" component={PurchaseOrdersStackNavigator} />
      <Drawer.Screen name="Estimates" component={EstimatesStackNavigator} />
      <Drawer.Screen name="GRN" component={GRNStackNavigator} />
      <Drawer.Screen name="StockAdjustments" component={StockAdjustmentsStackNavigator} />
      <Drawer.Screen name="Banners" component={BannersStackNavigator} />
      <Drawer.Screen name="Offers" component={OffersStackNavigator} />
      <Drawer.Screen name="SocialMedia" component={SocialMediaStackNavigator} />
      <Drawer.Screen name="Expenses" component={ExpensesStackNavigator} />
      <Drawer.Screen name="SalesReturns" component={SalesReturnsStackNavigator} />
      <Drawer.Screen name="PurchaseReturns" component={PurchaseReturnsStackNavigator} />
      <Drawer.Screen name="CreditNotes" component={CreditNotesStackNavigator} />
      <Drawer.Screen name="DebitNotes" component={DebitNotesStackNavigator} />
      <Drawer.Screen name="Assets" component={AssetsStackNavigator} />
      <Drawer.Screen name="Reports" component={ReportsStackNavigator} />
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
    flex: 1,
  },
  logoImage: {
    width: 36,
    height: 36,
    borderRadius: 8,
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
