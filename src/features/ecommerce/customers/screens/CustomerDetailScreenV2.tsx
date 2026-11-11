import React, { useState, useCallback } from 'react';
import { StyleSheet, View, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { Text, Button, Divider } from 'react-native-paper';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { Header } from '@/components/layout/Header';
import { Badge } from '@/components/common/Badge';
import { ConfirmationModal } from '@/components/common/ConfirmationModal';
import { useTheme } from '@/theme';
import { spacing, borderRadius } from '@/theme/spacing';
import { customersApi } from '@/services/api';
import type { CustomersStackParamList } from '@/types/navigation';

type NavigationProp = NativeStackNavigationProp<CustomersStackParamList, 'CustomerDetail'>;
type RouteProps = RouteProp<CustomersStackParamList, 'CustomerDetail'>;

const formatCurrency = (amount: number) =>
  `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

function normalizeCustomer(c: any) {
  return {
    id: String(c.id),
    name:
      `${c.firstName || ''} ${c.lastName || ''}`.trim() ||
      c.name ||
      c.email ||
      'Customer',
    email: c.email || '',
    phone: c.phone || '',
    gstNumber: c.gstNumber || '',
    notes: c.notes || '',
    totalOrders: Number(c.totalOrders ?? c._count?.orders ?? 0),
    totalSpent: Number(c.totalSpent || 0),
    isActive: c.isActive !== false,
    address:
      c.address?.line1 || c.city || c.state
        ? {
            line1: c.address?.line1 || c.address || '',
            line2: c.address?.line2 || '',
            city: c.address?.city || c.city || '',
            state: c.address?.state || c.state || '',
            pincode: c.address?.pincode || c.pincode || c.postalCode || '',
            country: c.address?.country || c.country || 'India',
          }
        : null,
    orders: Array.isArray(c.orders) ? c.orders : [],
  };
}

export const CustomerDetailScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { colors } = useTheme();
  const [deleteVisible, setDeleteVisible] = useState(false);
  const queryClient = useQueryClient();

  const id = route.params.id;

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['customer', id],
    queryFn: () => customersApi.getCustomer(id),
    enabled: !!id,
  });

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [])
  );

  const deleteMutation = useMutation({
    mutationFn: () => customersApi.deleteCustomer(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setDeleteVisible(false);
      navigation.goBack();
    },
    onError: (e: any) => Alert.alert('Error', e?.message || 'Failed to delete customer'),
  });

  if (isLoading) {
    return (
      <ScreenWrapper>
        <Header title="Customer" showBack />
        <View style={styles.notFound}>
          <ActivityIndicator size="large" color={colors.primary.main} />
        </View>
      </ScreenWrapper>
    );
  }

  if (isError || !data) {
    return (
      <ScreenWrapper>
        <Header title="Customer Not Found" showBack />
        <View style={styles.notFound}>
          <Icon name="alert-circle-outline" size={64} color={colors.neutral[300]} />
          <Text style={[styles.notFoundText, { color: colors.text.secondary }]}>
            {isError ? String(error?.message || 'Failed to load') : 'Customer not found'}
          </Text>
        </View>
      </ScreenWrapper>
    );
  }

  const customer = normalizeCustomer(data);
  const customerOrders = customer.orders;

  const handleEdit = () => navigation.navigate('CustomerForm', { id: customer.id });
  const handleDelete = () => {
    deleteMutation.mutate();
  };

  return (
    <ScreenWrapper scrollable={false}>
      <Header
        title="Customer Details"
        showBack
        actions={[
          { icon: 'pencil', onPress: handleEdit },
          { icon: 'delete', onPress: () => setDeleteVisible(true) },
        ]}
      />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {/* Header card */}
        <View style={[styles.section, { backgroundColor: colors.surface.default }]}>
          <View style={styles.headerRow}>
            <View style={[styles.avatar, { backgroundColor: colors.primary.light + '30' }]}>
              <Text style={[styles.avatarText, { color: colors.primary.main }]}>
                {customer.name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.headerInfo}>
              <Text style={[styles.name, { color: colors.text.primary }]}>{customer.name}</Text>
              <Badge variant={customer.isActive ? 'success' : 'error'} size="small">
                {customer.isActive ? 'Active' : 'Inactive'}
              </Badge>
            </View>
          </View>
        </View>

        {/* Contact */}
        <View style={[styles.section, { backgroundColor: colors.surface.default }]}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Contact</Text>
          <DetailRow icon="email" label="Email" value={customer.email || '—'} />
          <DetailRow icon="phone" label="Phone" value={customer.phone || '—'} />
          {customer.gstNumber && (
            <DetailRow icon="file-document" label="GST" value={customer.gstNumber} />
          )}
        </View>

        {/* Address */}
        {customer.address && (
          <View style={[styles.section, { backgroundColor: colors.surface.default }]}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Address</Text>
            <Text style={[styles.addressText, { color: colors.text.secondary }]}>
              {customer.address.line1}
              {customer.address.line2 ? `, ${customer.address.line2}` : ''}
              {'\n'}
              {customer.address.city}, {customer.address.state} {customer.address.pincode}
              {'\n'}
              {customer.address.country}
            </Text>
          </View>
        )}

        {/* Stats */}
        <View style={[styles.section, { backgroundColor: colors.surface.default }]}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Lifetime</Text>
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={[styles.statValue, { color: colors.primary.main }]}>
                {customer.totalOrders}
              </Text>
              <Text style={[styles.statLabel, { color: colors.text.secondary }]}>Orders</Text>
            </View>
            <View style={styles.stat}>
              <Text style={[styles.statValue, { color: colors.success.main }]}>
                {formatCurrency(customer.totalSpent)}
              </Text>
              <Text style={[styles.statLabel, { color: colors.text.secondary }]}>Total Spent</Text>
            </View>
          </View>
        </View>

        {/* Recent Orders */}
        {customerOrders.length > 0 && (
          <View style={[styles.section, { backgroundColor: colors.surface.default }]}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
              Recent Orders ({customerOrders.length})
            </Text>
            {customerOrders.slice(0, 5).map((o: any, idx: number) => (
              <View key={o.id}>
                {idx > 0 && <Divider style={styles.divider} />}
                <View style={styles.orderRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.orderNum, { color: colors.text.primary }]}>
                      {o.orderNumber}
                    </Text>
                    <Text style={[styles.subtle, { color: colors.text.secondary }]}>
                      {new Date(o.createdAt).toLocaleDateString('en-IN')}
                    </Text>
                  </View>
                  <Text style={[styles.orderTotal, { color: colors.text.primary }]}>
                    {formatCurrency(o.total)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        <Button
          mode="contained"
          icon="pencil"
          onPress={handleEdit}
          style={{ marginTop: spacing[2] }}
        >
          Edit Customer
        </Button>
      </ScrollView>

      <ConfirmationModal
        visible={deleteVisible}
        title="Delete customer?"
        message={`This will remove ${customer.name} permanently.`}
        confirmText="Delete"
        confirmVariant="danger"
        loading={deleteMutation.isPending}
        onConfirm={handleDelete}
        onCancel={() => setDeleteVisible(false)}
      />
    </ScreenWrapper>
  );
};

interface DetailRowProps {
  icon: string;
  label: string;
  value: string;
}
const DetailRow: React.FC<DetailRowProps> = ({ icon, label, value }) => {
  const { colors } = useTheme();
  return (
    <View style={styles.detailRow}>
      <Icon name={icon} size={16} color={colors.neutral[400]} />
      <View style={{ flex: 1, marginLeft: spacing[2] }}>
        <Text style={[styles.detailLabel, { color: colors.text.secondary }]}>{label}</Text>
        <Text style={[styles.detailValue, { color: colors.text.primary }]}>{value}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: spacing[4], paddingBottom: spacing[8] },
  section: { borderRadius: borderRadius.lg, padding: spacing[4], marginBottom: spacing[3] },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { fontSize: 24, fontWeight: '700' },
  headerInfo: { flex: 1, marginLeft: spacing[3] },
  name: { fontSize: 18, fontWeight: '700', marginBottom: spacing[1] },
  sectionTitle: { fontSize: 14, fontWeight: '700', marginBottom: spacing[3] },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: spacing[2],
  },
  detailLabel: { fontSize: 12 },
  detailValue: { fontSize: 14, fontWeight: '500', marginTop: 2 },
  addressText: { fontSize: 13, lineHeight: 20 },
  statsRow: { flexDirection: 'row', gap: spacing[4] },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '800' },
  statLabel: { fontSize: 12, marginTop: 4 },
  divider: { marginVertical: spacing[2] },
  orderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing[1],
  },
  orderNum: { fontSize: 14, fontWeight: '600' },
  orderTotal: { fontSize: 14, fontWeight: '700' },
  subtle: { fontSize: 12, marginTop: 2 },
  notFound: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  notFoundText: { fontSize: 16, marginTop: spacing[3] },
});
