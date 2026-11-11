import React, { useState, useCallback } from 'react';
import { StyleSheet, View, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { Text, Button } from 'react-native-paper';
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
import { suppliersApi } from '@/services/api';
import type { SuppliersStackParamList } from '@/types/navigation';

type NavigationProp = NativeStackNavigationProp<SuppliersStackParamList, 'SupplierDetail'>;
type RouteProps = RouteProp<SuppliersStackParamList, 'SupplierDetail'>;

/** Shape the UI expects — normalized from backend response. */
function normalizeSupplier(s: any) {
  return {
    id: String(s.id),
    name: s.name || '',
    contactPerson: s.contactPerson || '',
    email: s.email || '',
    phone: s.phone || s.mobile || '',
    gstNumber: s.gstNumber,
    paymentTerms: s.creditDays ? `Net ${s.creditDays}` : undefined,
    isActive: s.isActive !== false,
    address:
      s.address || s.city || s.state
        ? {
            line1: s.address || '',
            line2: '',
            city: s.city || '',
            state: s.state || '',
            pincode: s.pinCode || s.postalCode || '',
            country: s.country || 'India',
          }
        : null,
  };
}

export const SupplierDetailScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const [deleteVisible, setDeleteVisible] = useState(false);

  const supplierId = route.params.id;

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['supplier', supplierId],
    queryFn: () => suppliersApi.getSupplier(supplierId),
    enabled: !!supplierId,
  });

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [])
  );

  const deleteMutation = useMutation({
    mutationFn: () => suppliersApi.deleteSupplier(supplierId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      setDeleteVisible(false);
      navigation.goBack();
    },
    onError: (err: any) => Alert.alert('Error', err?.message || 'Failed to delete'),
  });

  if (isLoading) {
    return (
      <ScreenWrapper>
        <Header title="Supplier" showBack />
        <View style={styles.notFound}>
          <ActivityIndicator size="large" color={colors.primary.main} />
        </View>
      </ScreenWrapper>
    );
  }

  if (isError || !data) {
    return (
      <ScreenWrapper>
        <Header title="Not Found" showBack />
        <View style={styles.notFound}>
          <Icon name="alert-circle-outline" size={64} color={colors.neutral[300]} />
          <Text style={[styles.notFoundText, { color: colors.text.secondary }]}>
            {isError ? String(error?.message || 'Failed to load') : 'Supplier not found'}
          </Text>
        </View>
      </ScreenWrapper>
    );
  }

  const supplier = normalizeSupplier(data);
  const handleEdit = () => navigation.navigate('SupplierForm', { id: supplier.id });

  return (
    <ScreenWrapper scrollable={false}>
      <Header
        title="Supplier"
        showBack
        actions={[
          { icon: 'pencil', onPress: handleEdit },
          { icon: 'delete', onPress: () => setDeleteVisible(true) },
        ]}
      />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.section, { backgroundColor: colors.surface.default }]}>
          <View style={styles.headerRow}>
            <View style={[styles.iconWrap, { backgroundColor: colors.info.light + '20' }]}>
              <Icon name="truck" size={28} color={colors.info.main} />
            </View>
            <View style={{ flex: 1, marginLeft: spacing[3] }}>
              <Text style={[styles.name, { color: colors.text.primary }]}>{supplier.name}</Text>
              <Badge variant={supplier.isActive ? 'success' : 'error'} size="small">
                {supplier.isActive ? 'Active' : 'Inactive'}
              </Badge>
            </View>
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: colors.surface.default }]}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Contact</Text>
          <DetailRow icon="account" label="Contact Person" value={supplier.contactPerson || '—'} />
          <DetailRow icon="phone" label="Phone" value={supplier.phone || '—'} />
          <DetailRow icon="email" label="Email" value={supplier.email || '—'} />
          {supplier.gstNumber && (
            <DetailRow icon="file-document" label="GST" value={supplier.gstNumber} />
          )}
        </View>

        {supplier.address && (
          <View style={[styles.section, { backgroundColor: colors.surface.default }]}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Address</Text>
            <Text style={[styles.addressText, { color: colors.text.secondary }]}>
              {supplier.address.line1}
              {supplier.address.line2 ? `, ${supplier.address.line2}` : ''}
              {'\n'}
              {supplier.address.city}, {supplier.address.state} {supplier.address.pincode}
              {'\n'}
              {supplier.address.country}
            </Text>
          </View>
        )}

        {supplier.paymentTerms && (
          <View style={[styles.section, { backgroundColor: colors.surface.default }]}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Payment</Text>
            <Text style={[styles.subtle, { color: colors.text.primary }]}>
              {supplier.paymentTerms}
            </Text>
          </View>
        )}

        <Button mode="contained" icon="pencil" onPress={handleEdit} style={{ marginTop: spacing[2] }}>
          Edit Supplier
        </Button>
      </ScrollView>

      <ConfirmationModal
        visible={deleteVisible}
        title="Delete supplier?"
        message={`This will remove ${supplier.name} permanently.`}
        confirmText="Delete"
        confirmVariant="danger"
        loading={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate()}
        onCancel={() => setDeleteVisible(false)}
      />
    </ScreenWrapper>
  );
};

const DetailRow: React.FC<{ icon: string; label: string; value: string }> = ({
  icon,
  label,
  value,
}) => {
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
  content: { padding: spacing[4], paddingBottom: spacing[8] },
  section: { borderRadius: borderRadius.lg, padding: spacing[4], marginBottom: spacing[3] },
  sectionTitle: { fontSize: 14, fontWeight: '700', marginBottom: spacing[3] },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  name: { fontSize: 18, fontWeight: '700', marginBottom: spacing[1] },
  detailRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: spacing[2] },
  detailLabel: { fontSize: 12 },
  detailValue: { fontSize: 14, fontWeight: '500', marginTop: 2 },
  addressText: { fontSize: 13, lineHeight: 20 },
  subtle: { fontSize: 13 },
  notFound: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  notFoundText: { fontSize: 16, marginTop: spacing[3] },
});
