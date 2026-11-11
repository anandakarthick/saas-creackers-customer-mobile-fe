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
import { assetsApi } from '@/services/api';
import { formatCurrency } from '@/utils';
import type { AssetsStackParamList } from '@/types/navigation';

type Nav = NativeStackNavigationProp<AssetsStackParamList, 'AssetDetail'>;
type RouteProps = RouteProp<AssetsStackParamList, 'AssetDetail'>;

const DetailRow: React.FC<{ icon: string; label: string; value: string }> = ({ icon, label, value }) => {
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

const statusVariant = (s: string): 'success' | 'warning' | 'error' | 'info' => {
  if (s === 'ACTIVE') return 'success';
  if (s === 'UNDER_MAINTENANCE') return 'warning';
  if (s === 'DISPOSED' || s === 'SOLD' || s === 'LOST') return 'error';
  return 'info';
};

export const AssetDetailScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteProps>();
  const { colors } = useTheme();
  const qc = useQueryClient();
  const [deleteVisible, setDeleteVisible] = useState(false);

  const assetId = route.params.id;

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['asset', assetId],
    queryFn: () => assetsApi.getAsset(assetId),
    enabled: !!assetId,
  });

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [])
  );

  const deleteMutation = useMutation({
    mutationFn: () => assetsApi.deleteAsset(assetId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assets'] });
      setDeleteVisible(false);
      navigation.goBack();
    },
    onError: (err: any) => Alert.alert('Error', err?.message || 'Failed to delete'),
  });

  if (isLoading) {
    return (
      <ScreenWrapper>
        <Header title="Asset" showBack />
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary.main} /></View>
      </ScreenWrapper>
    );
  }

  if (isError || !data) {
    return (
      <ScreenWrapper>
        <Header title="Not Found" showBack />
        <View style={styles.center}>
          <Icon name="alert-circle-outline" size={64} color={colors.neutral[300]} />
          <Text style={[styles.notFoundText, { color: colors.text.secondary }]}>
            {isError ? String((error as any)?.message || 'Failed to load') : 'Asset not found'}
          </Text>
        </View>
      </ScreenWrapper>
    );
  }

  const a = data as any;
  const handleEdit = () => navigation.navigate('AssetForm', { id: String(a.id) });

  return (
    <ScreenWrapper scrollable={false}>
      <Header
        title="Asset"
        showBack
        actions={[
          { icon: 'pencil', onPress: handleEdit },
          { icon: 'delete', onPress: () => setDeleteVisible(true) },
        ]}
      />

      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={[styles.section, { backgroundColor: colors.surface.default }]}>
          <View style={styles.headerRow}>
            <View style={[styles.iconWrap, { backgroundColor: colors.info.light + '20' }]}>
              <Icon name="package-variant" size={28} color={colors.info.main} />
            </View>
            <View style={{ flex: 1, marginLeft: spacing[3] }}>
              <Text style={[styles.name, { color: colors.text.primary }]}>{a.name}</Text>
              <Text style={[styles.number, { color: colors.text.secondary }]}>{a.assetTag}</Text>
              <Badge variant={statusVariant(a.status || 'ACTIVE')} size="small">
                {(a.status || 'ACTIVE').replace(/_/g, ' ')}
              </Badge>
            </View>
          </View>
        </View>

        {/* General */}
        <View style={[styles.section, { backgroundColor: colors.surface.default }]}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>General</Text>
          <DetailRow icon="shape" label="Category" value={a.category || '—'} />
          {a.serialNumber && <DetailRow icon="barcode" label="Serial Number" value={a.serialNumber} />}
          {a.location && <DetailRow icon="map-marker" label="Location" value={a.location} />}
          {a.description && <DetailRow icon="text" label="Description" value={a.description} />}
        </View>

        {/* Financial */}
        <View style={[styles.section, { backgroundColor: colors.surface.default }]}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Financial</Text>
          <DetailRow icon="calendar" label="Purchase Date" value={a.purchaseDate ? new Date(a.purchaseDate).toLocaleDateString() : '—'} />
          <DetailRow icon="cash" label="Purchase Price" value={formatCurrency(Number(a.purchasePrice || 0))} />
          <DetailRow icon="cash-check" label="Current Value" value={formatCurrency(Number(a.currentValue || 0))} />
          <DetailRow icon="cash-remove" label="Salvage Value" value={formatCurrency(Number(a.salvageValue || 0))} />
          {a.depreciationMethod && a.depreciationMethod !== 'NONE' && (
            <>
              <DetailRow icon="trending-down" label="Depreciation Method" value={a.depreciationMethod.replace(/_/g, ' ')} />
              <DetailRow icon="percent" label="Depreciation Rate" value={`${a.depreciationRate || 0}%`} />
              {a.usefulLifeYears && <DetailRow icon="clock-outline" label="Useful Life" value={`${a.usefulLifeYears} years`} />}
            </>
          )}
        </View>

        {/* Depreciation Breakdown */}
        {a.depreciation && (
          <View style={[styles.section, { backgroundColor: colors.surface.default }]}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Depreciation</Text>
            <DetailRow icon="arrow-down" label="Annual" value={formatCurrency(a.depreciation.annualDepreciation)} />
            <DetailRow icon="sigma" label="Accumulated" value={formatCurrency(a.depreciation.accumulatedDepreciation)} />
            <DetailRow icon="cash-fast" label="Written Down Value" value={formatCurrency(a.depreciation.writtenDownValue)} />
          </View>
        )}

        {/* Supplier & Warranty */}
        {(a.supplierName || a.vendorName || a.warrantyExpiresAt) && (
          <View style={[styles.section, { backgroundColor: colors.surface.default }]}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Supplier & Warranty</Text>
            {(a.supplierName || a.vendorName) && (
              <DetailRow icon="account" label="Supplier" value={a.supplierName || a.vendorName} />
            )}
            {a.warrantyExpiresAt && (
              <DetailRow icon="shield-check" label="Warranty Expires" value={new Date(a.warrantyExpiresAt).toLocaleDateString()} />
            )}
          </View>
        )}

        {/* Notes */}
        {a.notes && (
          <View style={[styles.section, { backgroundColor: colors.surface.default }]}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Notes</Text>
            <Text style={[styles.notesText, { color: colors.text.secondary }]}>{a.notes}</Text>
          </View>
        )}

        <Button mode="contained" icon="pencil" onPress={handleEdit} style={{ marginTop: spacing[2] }}>
          Edit Asset
        </Button>
      </ScrollView>

      <ConfirmationModal
        visible={deleteVisible}
        title="Delete asset?"
        message={`This will permanently remove "${a.name}".`}
        confirmText="Delete"
        confirmVariant="danger"
        loading={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate()}
        onCancel={() => setDeleteVisible(false)}
      />
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  content: { padding: spacing[4], paddingBottom: spacing[8] },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  section: { borderRadius: borderRadius.lg, padding: spacing[4], marginBottom: spacing[3] },
  sectionTitle: { fontSize: 14, fontWeight: '700', marginBottom: spacing[3] },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  iconWrap: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center' },
  name: { fontSize: 18, fontWeight: '700', marginBottom: spacing[1] },
  number: { fontSize: 13, marginBottom: spacing[1] },
  detailRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: spacing[2] },
  detailLabel: { fontSize: 12 },
  detailValue: { fontSize: 14, fontWeight: '500', marginTop: 2 },
  notesText: { fontSize: 13, lineHeight: 20 },
  notFoundText: { fontSize: 16, marginTop: spacing[3] },
});
