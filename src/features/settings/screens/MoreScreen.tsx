import React from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { ScreenWrapper, Header } from '@/components/layout';
import { Avatar } from '@/components/common';
import { useTheme } from '@/theme';
import { spacing, borderRadius } from '@/theme/spacing';
import { useAuthStore } from '@/store';

const menuItems = [
  { id: 'categories', label: 'Categories', icon: 'shape', route: 'Categories' },
  { id: 'products', label: 'Products', icon: 'package-variant-closed', route: 'Products' },
  { id: 'customers', label: 'Customers', icon: 'account-group', route: 'Customers' },
  { id: 'branches', label: 'Branches', icon: 'store', route: 'Branches' },
  { id: 'employees', label: 'Employees', icon: 'account-tie', route: 'Employees' },
  { id: 'roles', label: 'Roles & Permissions', icon: 'shield-account', route: 'Roles' },
  { id: 'suppliers', label: 'Suppliers', icon: 'truck', route: 'Suppliers' },
  { id: 'purchase-orders', label: 'Purchase Orders', icon: 'clipboard-text', route: 'PurchaseOrders' },
  { id: 'grn', label: 'Goods Receipt (GRN)', icon: 'clipboard-check', route: 'GRN' },
  { id: 'adjustments', label: 'Stock Adjustments', icon: 'swap-horizontal', route: 'StockAdjustments' },
  { id: 'banners', label: 'Banners', icon: 'image-multiple', route: 'Banners' },
  { id: 'offers', label: 'Offers', icon: 'tag-multiple', route: 'Offers' },
  { id: 'social', label: 'Social Media', icon: 'share-variant', route: 'SocialMedia' },
  { id: 'expenses', label: 'Expenses', icon: 'cash-minus', route: 'Expenses' },
  { id: 'assets', label: 'Assets', icon: 'package-variant', route: 'Assets' },
  { id: 'reports', label: 'Reports', icon: 'chart-bar', route: 'Reports' },
  { id: 'settings', label: 'Settings', icon: 'cog', route: 'Settings' },
];

export const MoreScreen: React.FC = () => {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const user = useAuthStore((s) => s.user);

  const navigateTo = (route: string) => {
    navigation.navigate(route);
  };

  return (
    <ScreenWrapper scrollable padding={false}>
      <Header title="More" showDrawer />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* User Card */}
        <TouchableOpacity
          style={[styles.userCard, { backgroundColor: colors.surface.default }]}
          onPress={() => navigateTo('Settings')}
          activeOpacity={0.7}
        >
          <Avatar name={user?.name || 'User'} size="large" />
          <View style={styles.userInfo}>
            <Text style={[styles.userName, { color: colors.text.primary }]}>{user?.name || 'User'}</Text>
            <Text style={[styles.userRole, { color: colors.text.secondary }]}>{user?.role?.name || 'Staff'}</Text>
          </View>
          <Icon name="chevron-right" size={24} color={colors.neutral[400]} />
        </TouchableOpacity>

        {/* Menu Items */}
        <View style={[styles.menuContainer, { backgroundColor: colors.surface.default }]}>
          {menuItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[styles.menuItem, { borderBottomColor: colors.border.default }]}
              onPress={() => navigateTo(item.route)}
              activeOpacity={0.7}
            >
              <View style={[styles.menuIcon, { backgroundColor: colors.primary.light + '20' }]}>
                <Icon name={item.icon} size={22} color={colors.primary.main} />
              </View>
              <Text style={[styles.menuLabel, { color: colors.text.primary }]}>{item.label}</Text>
              <Icon name="chevron-right" size={24} color={colors.neutral[400]} />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  content: {
    padding: spacing[4],
    paddingBottom: spacing[20],
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    marginBottom: spacing[4],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  userInfo: {
    flex: 1,
    marginLeft: spacing[3],
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
  },
  userRole: {
    fontSize: 14,
    marginTop: 2,
  },
  menuContainer: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[4],
    borderBottomWidth: 1,
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing[3],
  },
  menuLabel: {
    flex: 1,
    fontSize: 15,
  },
});
