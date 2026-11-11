import React, { useState, useCallback } from 'react';
import { StyleSheet, View, Text, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { ScreenWrapper, Header } from '@/components/layout';
import { Card, Badge, Avatar } from '@/components/common';
import { StatCard, ListItem } from '@/components/data-display';
import { colors } from '@/theme/colors';
import { spacing, borderRadius } from '@/theme/spacing';
import { useAuthStore } from '@/store';
import { mockOrders, mockProducts, mockNotifications } from '@/data/mock';
import { formatCurrency, formatRelativeTime, getStatusText } from '@/utils';
import { getOrderStatusColor, getStockStatus } from '@/utils/helpers';

export const DashboardScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const user = useAuthStore((s) => s.user);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    // Simulate API call
    await new Promise<void>((resolve) => setTimeout(resolve, 1000));
    setRefreshing(false);
  }, []);

  // Calculate stats
  const todaySales = 45600;
  const totalOrders = mockOrders.length;
  const pendingOrders = mockOrders.filter((o) => o.status === 'pending').length;
  const lowStockItems = mockProducts.filter(
    (p) => getStockStatus(p.stock, p.minStock) === 'low_stock' ||
           getStockStatus(p.stock, p.minStock) === 'out_of_stock'
  ).length;
  const unreadNotifications = mockNotifications.filter((n) => !n.isRead).length;

  const recentOrders = mockOrders.slice(0, 5);
  const lowStockProducts = mockProducts
    .filter((p) => p.stock <= p.minStock)
    .slice(0, 4);

  return (
    <ScreenWrapper scrollable={false} padding={false}>
      <Header
        title="Dashboard"
        subtitle={`Welcome, ${user?.name?.split(' ')[0] || 'User'}`}
        showDrawer
        actions={[
          {
            icon: 'bell-outline',
            onPress: () => navigation.navigate('Settings', { screen: 'Notifications' }),
            badge: unreadNotifications,
          },
        ]}
      />

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary.main]}
            tintColor={colors.primary.main}
          />
        }
      >
        {/* Quick Stats */}
        <View style={styles.statsRow}>
          <StatCard
            title="Today's Sales"
            value={todaySales}
            type="currency"
            icon="cash-multiple"
            iconColor={colors.success.main}
            change={12.5}
            changeLabel="vs yesterday"
          />
          <View style={styles.statSpacer} />
          <StatCard
            title="Total Orders"
            value={totalOrders}
            type="number"
            icon="clipboard-list"
            iconColor={colors.info.main}
            change={8.3}
            changeLabel="this week"
          />
        </View>

        <View style={styles.statsRow}>
          <StatCard
            title="Pending Orders"
            value={pendingOrders}
            type="number"
            icon="clock-outline"
            iconColor={colors.warning.main}
            onPress={() => navigation.navigate('OrdersTab')}
          />
          <View style={styles.statSpacer} />
          <StatCard
            title="Low Stock Items"
            value={lowStockItems}
            type="number"
            icon="alert-outline"
            iconColor={colors.error.main}
            onPress={() => navigation.navigate('InventoryTab')}
          />
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('POSTab')}
            >
              <View style={[styles.actionIcon, { backgroundColor: colors.primary.light + '20' }]}>
                <Icon name="cart-plus" size={24} color={colors.primary.main} />
              </View>
              <Text style={styles.actionLabel}>New Sale</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('Products')}
            >
              <View style={[styles.actionIcon, { backgroundColor: colors.info.light + '20' }]}>
                <Icon name="plus-box" size={24} color={colors.info.main} />
              </View>
              <Text style={styles.actionLabel}>Add Product</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('Customers')}
            >
              <View style={[styles.actionIcon, { backgroundColor: colors.success.light + '20' }]}>
                <Icon name="account-plus" size={24} color={colors.success.main} />
              </View>
              <Text style={styles.actionLabel}>Add Customer</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('Reports')}
            >
              <View style={[styles.actionIcon, { backgroundColor: colors.secondary.light + '20' }]}>
                <Icon name="chart-bar" size={24} color={colors.secondary.main} />
              </View>
              <Text style={styles.actionLabel}>Reports</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent Orders */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Orders</Text>
            <TouchableOpacity onPress={() => navigation.navigate('OrdersTab')}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          <Card padding="none">
            {recentOrders.map((order, index) => (
              <ListItem
                key={order.id}
                title={order.orderNumber}
                subtitle={order.customer?.name}
                description={formatRelativeTime(order.createdAt)}
                rightText={formatCurrency(order.total)}
                badge={
                  <Badge
                    variant={
                      order.status === 'delivered' ? 'success' :
                      order.status === 'pending' ? 'warning' :
                      order.status === 'cancelled' ? 'error' : 'info'
                    }
                    size="small"
                  >
                    {getStatusText(order.status)}
                  </Badge>
                }
                showChevron
                onPress={() => {}}
              />
            ))}
          </Card>
        </View>

        {/* Low Stock Alert */}
        {lowStockProducts.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Low Stock Alert</Text>
              <TouchableOpacity onPress={() => navigation.navigate('InventoryTab')}>
                <Text style={styles.seeAllText}>See All</Text>
              </TouchableOpacity>
            </View>
            <Card padding="none">
              {lowStockProducts.map((product) => (
                <ListItem
                  key={product.id}
                  title={product.name}
                  subtitle={product.sku}
                  leftImage={product.images?.[0]}
                  rightText={`${product.stock} left`}
                  rightSubtext={`Min: ${product.minStock}`}
                  badge={
                    <Badge
                      variant={product.stock === 0 ? 'error' : 'warning'}
                      size="small"
                    >
                      {product.stock === 0 ? 'Out' : 'Low'}
                    </Badge>
                  }
                  showChevron
                  onPress={() => {}}
                />
              ))}
            </Card>
          </View>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing[4],
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: spacing[3],
  },
  statSpacer: {
    width: spacing[3],
  },
  section: {
    marginTop: spacing[4],
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
  },
  seeAllText: {
    fontSize: 14,
    color: colors.primary.main,
    fontWeight: '500',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    alignItems: 'center',
    flex: 1,
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  actionLabel: {
    fontSize: 12,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  bottomSpacer: {
    height: spacing[8],
  },
});
