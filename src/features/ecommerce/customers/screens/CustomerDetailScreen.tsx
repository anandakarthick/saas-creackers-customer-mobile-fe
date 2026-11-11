import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenWrapper, Header } from '@/components/layout';
import { Card, Badge, Avatar, ConfirmationModal } from '@/components/common';
import { useTheme } from '@/theme';
import { spacing, borderRadius } from '@/theme/spacing';
import { mockCustomers, mockOrders } from '@/data/mock';
import { formatCurrency, formatPhoneNumber, formatDateTime } from '@/utils';
import type { CustomersStackParamList } from '@/types/navigation';

type NavigationProp = NativeStackNavigationProp<CustomersStackParamList, 'CustomerDetail'>;
type RouteType = RouteProp<CustomersStackParamList, 'CustomerDetail'>;

export const CustomerDetailScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteType>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const customer = mockCustomers.find((c) => c.id === route.params.id);
  const customerOrders = mockOrders.filter((o) => o.customerId === route.params.id);

  if (!customer) {
    return (
      <ScreenWrapper>
        <Header title="Customer Not Found" showBack />
        <View style={styles.errorContainer}>
          <Icon name="alert-circle-outline" size={64} color={colors.error.main} />
          <Text style={[styles.errorText, { color: colors.text.primary }]}>Customer not found</Text>
        </View>
      </ScreenWrapper>
    );
  }

  const handleEdit = () => {
    navigation.navigate('CustomerForm', { id: customer.id });
  };

  const handleDelete = () => {
    setShowDeleteModal(false);
    navigation.goBack();
  };

  const handleCall = () => {
    Linking.openURL(`tel:${customer.phone}`);
  };

  const handleEmail = () => {
    if (customer.email) {
      Linking.openURL(`mailto:${customer.email}`);
    }
  };

  return (
    <ScreenWrapper scrollable={false} padding={false}>
      <Header
        title="Customer Details"
        showBack
        actions={[
          { icon: 'pencil', onPress: handleEdit },
          { icon: 'delete', onPress: () => setShowDeleteModal(true) },
        ]}
      />

      <ScrollView
        style={styles.content}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: spacing[8] + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Header */}
        <Card style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <Avatar name={customer.name} size="xlarge" />
            <View style={styles.profileInfo}>
              <Text style={[styles.customerName, { color: colors.text.primary }]}>
                {customer.name}
              </Text>
              <Badge variant={customer.isActive ? 'success' : 'error'} size="small">
                {customer.isActive ? 'Active' : 'Inactive'}
              </Badge>
            </View>
          </View>

          {/* Quick Actions */}
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.success.light + '20' }]}
              onPress={handleCall}
            >
              <Icon name="phone" size={20} color={colors.success.main} />
              <Text style={[styles.actionText, { color: colors.success.main }]}>Call</Text>
            </TouchableOpacity>
            {customer.email && (
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: colors.info.light + '20' }]}
                onPress={handleEmail}
              >
                <Icon name="email" size={20} color={colors.info.main} />
                <Text style={[styles.actionText, { color: colors.info.main }]}>Email</Text>
              </TouchableOpacity>
            )}
          </View>
        </Card>

        {/* Stats */}
        <View style={styles.statsRow}>
          <Card style={styles.statCard}>
            <Text style={[styles.statValue, { color: colors.primary.main }]}>
              {customer.totalOrders}
            </Text>
            <Text style={[styles.statLabel, { color: colors.text.secondary }]}>Total Orders</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={[styles.statValue, { color: colors.success.main }]}>
              {formatCurrency(customer.totalSpent)}
            </Text>
            <Text style={[styles.statLabel, { color: colors.text.secondary }]}>Total Spent</Text>
          </Card>
        </View>

        {/* Contact Information */}
        <Card>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Contact Info</Text>
          <View style={styles.infoRow}>
            <Icon name="phone" size={18} color={colors.text.tertiary} />
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: colors.text.tertiary }]}>Phone</Text>
              <Text style={[styles.infoValue, { color: colors.text.primary }]}>
                {formatPhoneNumber(customer.phone)}
              </Text>
            </View>
          </View>
          {customer.email && (
            <View style={styles.infoRow}>
              <Icon name="email" size={18} color={colors.text.tertiary} />
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, { color: colors.text.tertiary }]}>Email</Text>
                <Text style={[styles.infoValue, { color: colors.text.primary }]}>
                  {customer.email}
                </Text>
              </View>
            </View>
          )}
          {customer.gstNumber && (
            <View style={styles.infoRow}>
              <Icon name="file-document" size={18} color={colors.text.tertiary} />
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, { color: colors.text.tertiary }]}>GST Number</Text>
                <Text style={[styles.infoValue, { color: colors.text.primary }]}>
                  {customer.gstNumber}
                </Text>
              </View>
            </View>
          )}
        </Card>

        {/* Address */}
        {customer.address && (
          <Card>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Address</Text>
            <View style={styles.addressContainer}>
              <Icon name="map-marker" size={18} color={colors.text.tertiary} />
              <View style={styles.addressContent}>
                <Text style={[styles.addressText, { color: colors.text.primary }]}>
                  {customer.address.line1}
                  {customer.address.line2 && `, ${customer.address.line2}`}
                </Text>
                <Text style={[styles.addressText, { color: colors.text.secondary }]}>
                  {customer.address.city}, {customer.address.state}
                </Text>
                <Text style={[styles.addressText, { color: colors.text.secondary }]}>
                  {customer.address.pincode}, {customer.address.country}
                </Text>
              </View>
            </View>
          </Card>
        )}

        {/* Recent Orders */}
        <Card>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
              Recent Orders
            </Text>
            <Text style={[styles.orderCount, { color: colors.text.tertiary }]}>
              {customerOrders.length} orders
            </Text>
          </View>
          {customerOrders.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.text.tertiary }]}>
              No orders yet
            </Text>
          ) : (
            customerOrders.slice(0, 3).map((order) => (
              <View
                key={order.id}
                style={[styles.orderRow, { borderBottomColor: colors.border.default }]}
              >
                <View>
                  <Text style={[styles.orderNumber, { color: colors.text.primary }]}>
                    {order.orderNumber}
                  </Text>
                  <Text style={[styles.orderDate, { color: colors.text.tertiary }]}>
                    {formatDateTime(order.createdAt)}
                  </Text>
                </View>
                <View style={styles.orderRight}>
                  <Text style={[styles.orderTotal, { color: colors.text.primary }]}>
                    {formatCurrency(order.total)}
                  </Text>
                  <Badge
                    variant={order.status === 'delivered' ? 'success' : order.status === 'pending' ? 'warning' : 'info'}
                    size="small"
                  >
                    {order.status}
                  </Badge>
                </View>
              </View>
            ))
          )}
        </Card>

        {/* Dates */}
        <Card>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>History</Text>
          <View style={styles.dateRow}>
            <Text style={[styles.dateLabel, { color: colors.text.tertiary }]}>Customer Since</Text>
            <Text style={[styles.dateValue, { color: colors.text.primary }]}>
              {formatDateTime(customer.createdAt)}
            </Text>
          </View>
          <View style={styles.dateRow}>
            <Text style={[styles.dateLabel, { color: colors.text.tertiary }]}>Last Updated</Text>
            <Text style={[styles.dateValue, { color: colors.text.primary }]}>
              {formatDateTime(customer.updatedAt)}
            </Text>
          </View>
        </Card>
      </ScrollView>

      <ConfirmationModal
        visible={showDeleteModal}
        title="Delete Customer"
        message={`Are you sure you want to delete ${customer.name}? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        confirmVariant="danger"
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteModal(false)}
      />
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    marginTop: spacing[4],
  },
  profileCard: {
    marginBottom: spacing[4],
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  profileInfo: {
    marginLeft: spacing[4],
    flex: 1,
  },
  customerName: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: spacing[1],
  },
  quickActions: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[3],
    borderRadius: borderRadius.md,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: spacing[2],
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing[3],
    marginBottom: spacing[4],
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
    marginTop: spacing[1],
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: spacing[3],
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  orderCount: {
    fontSize: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing[3],
  },
  infoContent: {
    marginLeft: spacing[3],
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  addressContent: {
    marginLeft: spacing[3],
    flex: 1,
  },
  addressText: {
    fontSize: 14,
    lineHeight: 22,
  },
  orderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
  },
  orderNumber: {
    fontSize: 14,
    fontWeight: '500',
  },
  orderDate: {
    fontSize: 12,
    marginTop: 2,
  },
  orderRight: {
    alignItems: 'flex-end',
  },
  orderTotal: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: spacing[1],
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: spacing[4],
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing[2],
  },
  dateLabel: {
    fontSize: 13,
  },
  dateValue: {
    fontSize: 13,
    fontWeight: '500',
  },
});
