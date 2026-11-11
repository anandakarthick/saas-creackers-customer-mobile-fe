import React, { useCallback } from 'react';
import { StyleSheet, View, Text, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useQuery } from '@tanstack/react-query';
import { ScreenWrapper, Header } from '@/components/layout';
import { Card, Badge, Avatar } from '@/components/common';
import { StatCard, ListItem } from '@/components/data-display';
import { useTheme } from '@/theme';
import { spacing, borderRadius } from '@/theme/spacing';
import { useAuthStore, useNotificationStore } from '@/store';
import { dashboardApi, ordersApi, inventoryApi, reportsApi } from '@/services/api';
import { formatCurrency, formatRelativeTime, getStatusText } from '@/utils';
import { getOrderStatusColor } from '@/utils/helpers';

export const DashboardScreen: React.FC = () => {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const user = useAuthStore((s) => s.user);
  const unreadCount = useNotificationStore((s) => s.unreadCount);

  // Fetch dashboard stats + recent orders + low stock in parallel
  const statsQuery = useQuery({
    queryKey: ['dashboardStats'],
    queryFn: () => dashboardApi.getDashboardStats(),
  });

  const ordersQuery = useQuery({
    queryKey: ['dashboardRecentOrders'],
    queryFn: () => ordersApi.getOrders({ page: 1, limit: 5 }),
  });

  const lowStockQuery = useQuery({
    queryKey: ['dashboardLowStock'],
    queryFn: () => inventoryApi.getLowStockProducts(),
  });

  const reportQuery = useQuery({
    queryKey: ['dashboardReport'],
    queryFn: () => reportsApi.getReportDashboard(),
  });

  useFocusEffect(
    useCallback(() => {
      statsQuery.refetch();
      ordersQuery.refetch();
      lowStockQuery.refetch();
      reportQuery.refetch();
    }, [])
  );

  const refreshing =
    statsQuery.isFetching || ordersQuery.isFetching || lowStockQuery.isFetching;

  const onRefresh = useCallback(async () => {
    await Promise.all([statsQuery.refetch(), ordersQuery.refetch(), lowStockQuery.refetch(), reportQuery.refetch()]);
  }, [statsQuery, ordersQuery, lowStockQuery, reportQuery]);

  const stats: any = statsQuery.data || {};
  const totalRevenue = Number(stats.totalRevenue || 0);
  const todayRevenue = Number(stats.todayRevenue || 0);
  const totalOrders = Number(stats.totalOrders || 0);
  const pendingOrders = Number(stats.pendingOrders || 0);
  const totalProducts = Number(stats.totalProducts || 0);
  const activeProducts = Number(stats.activeProducts || 0);
  const totalCustomers = Number(stats.totalCustomers || 0);

  const recentOrders: any[] = (ordersQuery.data?.data || []).slice(0, 5);
  const lowStockProducts: any[] = (lowStockQuery.data || []).slice(0, 4);
  const ordersByStatus: Record<string, number> = stats.ordersByStatus || {};
  const topProducts: any[] = (stats.topProducts || []).slice(0, 5);
  const monthlySales: any[] = reportQuery.data?.monthlySales || [];

  return (
    <ScreenWrapper scrollable={false} padding={false}>
      <Header
        title="Dashboard"
        subtitle={`Welcome, ${user?.name?.split(' ')[0] || 'User'}`}
        showDrawer
        actions={[
          {
            icon: unreadCount > 0 ? 'bell-badge-outline' : 'bell-outline',
            onPress: () => navigation.navigate('Settings', { screen: 'Notifications' }),
            badge: unreadCount > 0 ? unreadCount : undefined,
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
            title="Total Revenue"
            value={totalRevenue}
            type="currency"
            icon="cash-multiple"
            iconColor={colors.success.main}
            subtitle={`${formatCurrency(todayRevenue)} today`}
          />
          <View style={styles.statSpacer} />
          <StatCard
            title="Total Orders"
            value={totalOrders}
            type="number"
            icon="clipboard-list"
            iconColor={colors.info.main}
            subtitle={`${pendingOrders} pending`}
          />
        </View>

        <View style={styles.statsRow}>
          <StatCard
            title="Products"
            value={totalProducts}
            type="number"
            icon="package-variant-closed"
            iconColor={colors.warning.main}
            subtitle={`${activeProducts} active`}
          />
          <View style={styles.statSpacer} />
          <StatCard
            title="Customers"
            value={totalCustomers}
            type="number"
            icon="account-group"
            iconColor={colors.error.main}
            subtitle="Registered customers"
          />
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Quick Actions</Text>
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('POSTab')}
            >
              <View style={[styles.actionIcon, { backgroundColor: colors.primary.light + '20' }]}>
                <Icon name="cart-plus" size={24} color={colors.primary.main} />
              </View>
              <Text style={[styles.actionLabel, { color: colors.text.secondary }]}>New Sale</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('Products')}
            >
              <View style={[styles.actionIcon, { backgroundColor: colors.info.light + '20' }]}>
                <Icon name="plus-box" size={24} color={colors.info.main} />
              </View>
              <Text style={[styles.actionLabel, { color: colors.text.secondary }]}>Add Product</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('Customers')}
            >
              <View style={[styles.actionIcon, { backgroundColor: colors.success.light + '20' }]}>
                <Icon name="account-plus" size={24} color={colors.success.main} />
              </View>
              <Text style={[styles.actionLabel, { color: colors.text.secondary }]}>Add Customer</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('Reports')}
            >
              <View style={[styles.actionIcon, { backgroundColor: colors.secondary.light + '20' }]}>
                <Icon name="chart-bar" size={24} color={colors.secondary.main} />
              </View>
              <Text style={[styles.actionLabel, { color: colors.text.secondary }]}>Reports</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Monthly Revenue Chart */}
        {monthlySales.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Revenue Overview</Text>
            <Card>
              <View style={styles.chartContainer}>
                {(() => {
                  const maxVal = Math.max(...monthlySales.map((m: any) => Number(m.total || 0)), 1);
                  return monthlySales.map((m: any, i: number) => {
                    const val = Number(m.total || 0);
                    const pct = (val / maxVal) * 100;
                    let monthLabel = '';
                    try { monthLabel = m.month ? new Date(m.month + '-01').toLocaleString('en', { month: 'short' }) : ''; } catch { monthLabel = ''; }
                    return (
                      <View key={i} style={styles.chartBarCol}>
                        <Text style={[styles.chartBarValue, { color: colors.text.tertiary }]}>
                          {val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}
                        </Text>
                        <View style={[styles.chartBarTrack, { backgroundColor: colors.neutral[100] }]}>
                          <View style={[styles.chartBarFill, { height: `${Math.max(pct, 4)}%`, backgroundColor: colors.primary.main }]} />
                        </View>
                        <Text style={[styles.chartBarLabel, { color: colors.text.tertiary }]}>{monthLabel}</Text>
                      </View>
                    );
                  });
                })()}
              </View>
            </Card>
          </View>
        )}

        {/* Orders by Status */}
        {Object.keys(ordersByStatus).length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Orders by Status</Text>
            <View style={styles.statusGrid}>
              {Object.entries(ordersByStatus).map(([status, count]) => {
                const statusLower = status.toLowerCase();
                const statusColor =
                  statusLower === 'delivered' ? colors.success.main :
                  statusLower === 'pending' ? colors.warning.main :
                  statusLower === 'cancelled' || statusLower === 'refunded' ? colors.error.main :
                  statusLower === 'processing' ? colors.info.main :
                  statusLower === 'confirmed' ? colors.primary.main :
                  statusLower === 'shipped' ? colors.secondary.main :
                  colors.neutral[400];
                return (
                  <View key={status} style={[styles.statusCard, { backgroundColor: colors.surface.default, borderLeftColor: statusColor }]}>
                    <Text style={[styles.statusCount, { color: colors.text.primary }]}>{count}</Text>
                    <Text style={[styles.statusName, { color: colors.text.secondary }]}>{getStatusText(statusLower)}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Top Products */}
        {topProducts.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Top Products</Text>
            <Card padding="none">
              {topProducts.map((p: any, i: number) => (
                <View key={p.id} style={[styles.topProductRow, i < topProducts.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border.default }]}>
                  <View style={[styles.topProductRank, { backgroundColor: i < 3 ? colors.primary.main : colors.neutral[200] }]}>
                    <Text style={[styles.topProductRankText, { color: i < 3 ? '#fff' : colors.text.secondary }]}>{i + 1}</Text>
                  </View>
                  <Text style={[styles.topProductName, { color: colors.text.primary }]} numberOfLines={1}>{p.name}</Text>
                  <Text style={[styles.topProductSold, { color: colors.text.tertiary }]}>{p.totalSold} sold</Text>
                </View>
              ))}
            </Card>
          </View>
        )}

        {/* Recent Orders */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Recent Orders</Text>
            <TouchableOpacity onPress={() => navigation.navigate('OrdersTab')}>
              <Text style={[styles.seeAllText, { color: colors.primary.main }]}>See All</Text>
            </TouchableOpacity>
          </View>
          <Card padding="none">
            {recentOrders.map((order, index) => {
              const customerName =
                order.shippingAddress?.name ||
                (order.customer
                  ? `${order.customer.firstName || ''} ${order.customer.lastName || ''}`.trim() ||
                    order.customer.name ||
                    'Guest'
                  : 'Guest');
              const statusLower = String(order.status || '').toLowerCase();
              return (
                <ListItem
                  key={order.id || index}
                  title={order.orderNumber || `#${order.id || '—'}`}
                  subtitle={customerName}
                  description={formatRelativeTime(order.createdAt)}
                  rightText={formatCurrency(order.total ?? 0)}
                  badge={
                    <Badge
                      variant={
                        statusLower === 'delivered' ? 'success' :
                        statusLower === 'pending' ? 'warning' :
                        statusLower === 'cancelled' ? 'error' : 'info'
                      }
                      size="small"
                    >
                      {getStatusText(statusLower)}
                    </Badge>
                  }
                  showChevron
                  // Navigate into the Orders drawer stack, then to OrderDetail with the order id
                  onPress={() =>
                    navigation.navigate('Orders', {
                      screen: 'OrderDetail',
                      params: { id: String(order.id) },
                    })
                  }
                />
              );
            })}
          </Card>
        </View>

        {/* Low Stock Alert */}
        {lowStockProducts.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Low Stock Alert</Text>
              <TouchableOpacity onPress={() => navigation.navigate('InventoryTab')}>
                <Text style={[styles.seeAllText, { color: colors.primary.main }]}>See All</Text>
              </TouchableOpacity>
            </View>
            <Card padding="none">
              {lowStockProducts.map((product) => (
                <ListItem
                  key={product.id}
                  title={product.name}
                  subtitle={product.sku}
                  leftImage={product.images?.[0]}
                  rightText={`${product.quantity ?? 0} left`}
                  rightSubtext={`Min: ${product.lowStockAlert ?? 0}`}
                  badge={
                    <Badge
                      variant={product.quantity === 0 ? 'error' : 'warning'}
                      size="small"
                    >
                      {product.quantity === 0 ? 'Out' : 'Low'}
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
  },
  seeAllText: {
    fontSize: 14,
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
    textAlign: 'center',
  },
  bottomSpacer: {
    height: spacing[8],
  },
  // Revenue chart
  chartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 160,
    gap: 4,
  },
  chartBarCol: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
  },
  chartBarValue: { fontSize: 9, marginBottom: 4, fontWeight: '600' },
  chartBarTrack: {
    width: '70%',
    flex: 1,
    borderRadius: 4,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  chartBarFill: { width: '100%', borderRadius: 4 },
  chartBarLabel: { fontSize: 10, marginTop: 4 },
  // Orders by status
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  statusCard: {
    width: '31%',
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[2],
    borderRadius: borderRadius.md,
    borderLeftWidth: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  statusCount: { fontSize: 20, fontWeight: '700' },
  statusName: { fontSize: 11, marginTop: 2 },
  // Top products
  topProductRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  topProductRank: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing[3],
  },
  topProductRankText: { fontSize: 12, fontWeight: '700' },
  topProductName: { flex: 1, fontSize: 14, fontWeight: '500' },
  topProductSold: { fontSize: 13, marginLeft: spacing[2] },
});
