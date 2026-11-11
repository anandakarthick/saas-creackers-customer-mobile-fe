import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenWrapper, Header } from '@/components/layout';
import { Card, Badge, ConfirmationModal } from '@/components/common';
import { useTheme } from '@/theme';
import { spacing, borderRadius } from '@/theme/spacing';
import { mockSuppliers, mockPurchaseOrders } from '@/data/mock';
import { formatCurrency, formatDateTime, formatPhoneNumber } from '@/utils';
import type { SuppliersStackParamList } from '@/types/navigation';

type NavigationProp = NativeStackNavigationProp<SuppliersStackParamList, 'SupplierDetail'>;
type RouteType = RouteProp<SuppliersStackParamList, 'SupplierDetail'>;

export const SupplierDetailScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteType>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const supplier = mockSuppliers.find((s) => s.id === route.params.id);
  const supplierOrders = mockPurchaseOrders.filter((po) => po.supplierId === route.params.id);

  if (!supplier) {
    return (
      <ScreenWrapper>
        <Header title="Supplier Not Found" showBack />
        <View style={styles.errorContainer}>
          <Icon name="alert-circle-outline" size={64} color={colors.error.main} />
          <Text style={[styles.errorText, { color: colors.text.primary }]}>Supplier not found</Text>
        </View>
      </ScreenWrapper>
    );
  }

  const handleEdit = () => {
    navigation.navigate('SupplierForm', { id: supplier.id });
  };

  const handleDelete = () => {
    setShowDeleteModal(false);
    navigation.goBack();
  };

  const handleCall = () => {
    Linking.openURL(`tel:${supplier.phone}`);
  };

  const handleEmail = () => {
    if (supplier.email) {
      Linking.openURL(`mailto:${supplier.email}`);
    }
  };

  const totalOrderValue = supplierOrders.reduce((sum, po) => sum + po.total, 0);

  return (
    <ScreenWrapper scrollable={false} padding={false}>
      <Header
        title="Supplier Details"
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
        {/* Header */}
        <Card style={styles.headerCard}>
          <View style={[styles.supplierIcon, { backgroundColor: colors.primary.light + '20' }]}>
            <Icon name="truck" size={32} color={colors.primary.main} />
          </View>
          <Text style={[styles.supplierName, { color: colors.text.primary }]}>{supplier.name}</Text>
          <Badge variant={supplier.isActive ? 'success' : 'error'} size="medium">
            {supplier.isActive ? 'Active' : 'Inactive'}
          </Badge>

          {/* Quick Actions */}
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.success.light + '20' }]}
              onPress={handleCall}
            >
              <Icon name="phone" size={20} color={colors.success.main} />
              <Text style={[styles.actionText, { color: colors.success.main }]}>Call</Text>
            </TouchableOpacity>
            {supplier.email && (
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
              {supplierOrders.length}
            </Text>
            <Text style={[styles.statLabel, { color: colors.text.secondary }]}>Orders</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={[styles.statValue, { color: colors.success.main }]}>
              {formatCurrency(totalOrderValue)}
            </Text>
            <Text style={[styles.statLabel, { color: colors.text.secondary }]}>Total Value</Text>
          </Card>
        </View>

        {/* Contact Information */}
        <Card>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Contact Information</Text>
          <View style={styles.infoRow}>
            <Icon name="account" size={18} color={colors.text.tertiary} />
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: colors.text.tertiary }]}>Contact Person</Text>
              <Text style={[styles.infoValue, { color: colors.text.primary }]}>
                {supplier.contactPerson}
              </Text>
            </View>
          </View>
          <View style={styles.infoRow}>
            <Icon name="phone" size={18} color={colors.text.tertiary} />
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: colors.text.tertiary }]}>Phone</Text>
              <Text style={[styles.infoValue, { color: colors.text.primary }]}>
                {formatPhoneNumber(supplier.phone)}
              </Text>
            </View>
          </View>
          {supplier.email && (
            <View style={styles.infoRow}>
              <Icon name="email" size={18} color={colors.text.tertiary} />
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, { color: colors.text.tertiary }]}>Email</Text>
                <Text style={[styles.infoValue, { color: colors.text.primary }]}>
                  {supplier.email}
                </Text>
              </View>
            </View>
          )}
        </Card>

        {/* Business Details */}
        <Card>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Business Details</Text>
          {supplier.gstNumber && (
            <View style={styles.infoRow}>
              <Icon name="file-document" size={18} color={colors.text.tertiary} />
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, { color: colors.text.tertiary }]}>GST Number</Text>
                <Text style={[styles.infoValue, { color: colors.text.primary }]}>
                  {supplier.gstNumber}
                </Text>
              </View>
            </View>
          )}
          {supplier.paymentTerms && (
            <View style={styles.infoRow}>
              <Icon name="calendar-clock" size={18} color={colors.text.tertiary} />
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, { color: colors.text.tertiary }]}>Payment Terms</Text>
                <Text style={[styles.infoValue, { color: colors.text.primary }]}>
                  {supplier.paymentTerms}
                </Text>
              </View>
            </View>
          )}
        </Card>

        {/* Address */}
        <Card>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Address</Text>
          <View style={styles.addressContainer}>
            <Icon name="map-marker" size={18} color={colors.text.tertiary} />
            <View style={styles.addressContent}>
              <Text style={[styles.addressText, { color: colors.text.primary }]}>
                {supplier.address.line1}
                {supplier.address.line2 && `, ${supplier.address.line2}`}
              </Text>
              <Text style={[styles.addressText, { color: colors.text.secondary }]}>
                {supplier.address.city}, {supplier.address.state}
              </Text>
              <Text style={[styles.addressText, { color: colors.text.secondary }]}>
                {supplier.address.pincode}, {supplier.address.country}
              </Text>
            </View>
          </View>
        </Card>

        {/* Recent Purchase Orders */}
        <Card>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
              Purchase Orders
            </Text>
            <Text style={[styles.orderCount, { color: colors.text.tertiary }]}>
              {supplierOrders.length} orders
            </Text>
          </View>
          {supplierOrders.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.text.tertiary }]}>
              No purchase orders yet
            </Text>
          ) : (
            supplierOrders.slice(0, 3).map((po) => (
              <View
                key={po.id}
                style={[styles.orderRow, { borderBottomColor: colors.border.default }]}
              >
                <View>
                  <Text style={[styles.orderNumber, { color: colors.text.primary }]}>
                    {po.poNumber}
                  </Text>
                  <Text style={[styles.orderDate, { color: colors.text.tertiary }]}>
                    {formatDateTime(po.createdAt)}
                  </Text>
                </View>
                <View style={styles.orderRight}>
                  <Text style={[styles.orderTotal, { color: colors.text.primary }]}>
                    {formatCurrency(po.total)}
                  </Text>
                  <Badge
                    variant={po.status === 'received' ? 'success' : po.status === 'pending' ? 'warning' : 'info'}
                    size="small"
                  >
                    {po.status}
                  </Badge>
                </View>
              </View>
            ))
          )}
        </Card>
      </ScrollView>

      <ConfirmationModal
        visible={showDeleteModal}
        title="Delete Supplier"
        message={`Are you sure you want to delete "${supplier.name}"? This action cannot be undone.`}
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
  headerCard: {
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  supplierIcon: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  supplierName: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: spacing[2],
    textAlign: 'center',
  },
  quickActions: {
    flexDirection: 'row',
    gap: spacing[3],
    marginTop: spacing[4],
    width: '100%',
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
});
