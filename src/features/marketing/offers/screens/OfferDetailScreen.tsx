import React, { useState } from 'react';
import { StyleSheet, View, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { Text, Button, Chip } from 'react-native-paper';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { Header } from '@/components/layout/Header';
import { Badge } from '@/components/common/Badge';
import { ConfirmationModal } from '@/components/common/ConfirmationModal';
import { useTheme } from '@/theme';
import { spacing, borderRadius } from '@/theme/spacing';
import { marketingApi } from '@/services/api';
import { formatDate, formatCurrency } from '@/utils';
import type { OffersStackParamList } from '@/types/navigation';

type NavigationProp = NativeStackNavigationProp<OffersStackParamList, 'OfferDetail'>;
type RouteProps = RouteProp<OffersStackParamList, 'OfferDetail'>;

interface DetailRowProps {
  label: string;
  value: string | React.ReactNode;
  icon?: string;
}

const DetailRow: React.FC<DetailRowProps> = ({ label, value, icon }) => {
  const { colors } = useTheme();
  return (
    <View style={styles.detailRow}>
      {icon && <Icon name={icon} size={20} color={colors.neutral[400]} style={styles.detailIcon} />}
      <View style={styles.detailContent}>
        <Text style={[styles.detailLabel, { color: colors.text.secondary }]}>{label}</Text>
        {typeof value === 'string' ? (
          <Text style={[styles.detailValue, { color: colors.text.primary }]}>{value}</Text>
        ) : (
          value
        )}
      </View>
    </View>
  );
};

const getOfferStatus = (offer: any) => {
  const now = new Date();
  if (!offer.isActive) return { label: 'Inactive', variant: 'error' as const };
  if (offer.startsAt && new Date(offer.startsAt) > now) return { label: 'Scheduled', variant: 'info' as const };
  if (offer.expiresAt && new Date(offer.expiresAt) < now) return { label: 'Expired', variant: 'error' as const };
  return { label: 'Active', variant: 'success' as const };
};

export const OfferDetailScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const qc = useQueryClient();

  const offerId = route.params.id;

  const { data: offer, isLoading } = useQuery({
    queryKey: ['offer', offerId],
    queryFn: () => marketingApi.getOffer(offerId),
  });

  const deleteMutation = useMutation({
    mutationFn: () => marketingApi.deleteOffer(offerId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['offers'] });
      qc.invalidateQueries({ queryKey: ['coupons'] });
      setDeleteModalVisible(false);
      navigation.goBack();
    },
    onError: (e: any) => Alert.alert('Error', e?.message || 'Failed to delete offer'),
  });

  if (isLoading) {
    return (
      <ScreenWrapper>
        <Header title="Offer Details" showBack />
        <View style={styles.loadingCenter}>
          <ActivityIndicator size="large" color={colors.primary.main} />
        </View>
      </ScreenWrapper>
    );
  }

  if (!offer) {
    return (
      <ScreenWrapper>
        <Header title="Offer Not Found" showBack />
        <View style={styles.notFound}>
          <Icon name="alert-circle-outline" size={64} color={colors.neutral[300]} />
          <Text style={[styles.notFoundText, { color: colors.text.secondary }]}>Offer not found</Text>
        </View>
      </ScreenWrapper>
    );
  }

  const offerStatus = getOfferStatus(offer);
  const usagePercentage = offer.usageLimit
    ? Math.round(((offer.usedCount || 0) / offer.usageLimit) * 100)
    : 0;

  const handleEdit = () => {
    navigation.navigate('OfferForm', { id: offer.id });
  };

  return (
    <ScreenWrapper scrollable={false}>
      <Header
        title="Offer Details"
        showBack
        actions={[
          { icon: 'pencil', onPress: handleEdit },
          { icon: 'delete', onPress: () => setDeleteModalVisible(true) },
        ]}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingBottom: spacing[8] + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Card */}
        <View style={[styles.headerCard, { backgroundColor: colors.surface.default }]}>
          <View style={styles.headerTop}>
            <Badge variant={offerStatus.variant}>{offerStatus.label}</Badge>
          </View>
          <Text style={[styles.offerTitle, { color: colors.text.primary }]}>
            {offer.name || offer.code}
          </Text>
          <View style={[styles.codeContainer, { backgroundColor: colors.primary.light + '20' }]}>
            <Icon name="ticket-percent" size={20} color={colors.primary.main} />
            <Text style={[styles.codeText, { color: colors.primary.main }]}>{offer.code}</Text>
          </View>
          <Text style={[styles.discountValue, { color: colors.success.main }]}>
            {offer.discountType === 'PERCENTAGE'
              ? `${offer.discountValue}% OFF`
              : `${formatCurrency(Number(offer.discountValue))} OFF`}
          </Text>
        </View>

        {/* Usage Statistics */}
        <View style={[styles.section, { backgroundColor: colors.surface.default }]}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Usage Statistics</Text>
          <View style={styles.statsCards}>
            <View style={[styles.statCard, { backgroundColor: colors.surface.variant }]}>
              <Text style={[styles.statValue, { color: colors.primary.main }]}>{offer.usedCount || 0}</Text>
              <Text style={[styles.statLabel, { color: colors.text.secondary }]}>Times Used</Text>
            </View>
            {offer.usageLimit > 0 && (
              <>
                <View style={[styles.statCard, { backgroundColor: colors.surface.variant }]}>
                  <Text style={[styles.statValue, { color: colors.info.main }]}>{offer.usageLimit}</Text>
                  <Text style={[styles.statLabel, { color: colors.text.secondary }]}>Usage Limit</Text>
                </View>
                <View style={[styles.statCard, { backgroundColor: colors.surface.variant }]}>
                  <Text style={[styles.statValue, { color: colors.warning.main }]}>{offer.usageLimit - (offer.usedCount || 0)}</Text>
                  <Text style={[styles.statLabel, { color: colors.text.secondary }]}>Remaining</Text>
                </View>
              </>
            )}
          </View>
          {offer.usageLimit > 0 && (
            <View style={styles.progressContainer}>
              <View style={styles.progressHeader}>
                <Text style={[styles.progressLabel, { color: colors.text.secondary }]}>Usage Progress</Text>
                <Text style={[styles.progressValue, { color: colors.text.primary }]}>{usagePercentage}%</Text>
              </View>
              <View style={[styles.progressBar, { backgroundColor: colors.neutral[200] }]}>
                <View style={[styles.progressFill, {
                  backgroundColor: usagePercentage >= 90 ? colors.error.main : usagePercentage >= 70 ? colors.warning.main : colors.success.main,
                  width: `${Math.min(usagePercentage, 100)}%`,
                }]} />
              </View>
            </View>
          )}
        </View>

        {/* Discount Details */}
        <View style={[styles.section, { backgroundColor: colors.surface.default }]}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Discount Details</Text>
          <DetailRow label="Discount Type" value={offer.discountType === 'PERCENTAGE' ? 'Percentage' : 'Fixed Amount'} icon="percent" />
          <DetailRow label="Discount Value" value={offer.discountType === 'PERCENTAGE' ? `${offer.discountValue}%` : formatCurrency(Number(offer.discountValue))} icon="tag" />
          {Number(offer.minOrderAmount) > 0 && (
            <DetailRow label="Minimum Order" value={formatCurrency(Number(offer.minOrderAmount))} icon="cart-outline" />
          )}
          {Number(offer.maxDiscount) > 0 && (
            <DetailRow label="Max Discount" value={formatCurrency(Number(offer.maxDiscount))} icon="cash-multiple" />
          )}
          {Number(offer.perUserLimit) > 0 && (
            <DetailRow label="Per User Limit" value={String(offer.perUserLimit)} icon="account" />
          )}
        </View>

        {/* Validity */}
        <View style={[styles.section, { backgroundColor: colors.surface.default }]}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Validity Period</Text>
          <DetailRow label="Start Date" value={offer.startsAt ? formatDate(offer.startsAt) : 'Not set'} icon="calendar-start" />
          <DetailRow label="Expiry Date" value={offer.expiresAt ? formatDate(offer.expiresAt) : 'Not set'} icon="calendar-end" />
        </View>

        {/* Description */}
        {offer.description && (
          <View style={[styles.section, { backgroundColor: colors.surface.default }]}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Description</Text>
            <Text style={[styles.description, { color: colors.text.secondary }]}>{offer.description}</Text>
          </View>
        )}

        {/* Timestamps */}
        {offer.createdAt && (
          <View style={[styles.section, { backgroundColor: colors.surface.default }]}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Timestamps</Text>
            <DetailRow label="Created At" value={new Date(offer.createdAt).toLocaleString()} icon="calendar-plus" />
            <DetailRow label="Updated At" value={new Date(offer.updatedAt).toLocaleString()} icon="calendar-edit" />
          </View>
        )}

        {/* Actions */}
        <View style={styles.actionButtons}>
          <Button mode="outlined" onPress={handleEdit} style={styles.editButton} icon="pencil" labelStyle={{ color: colors.primary.main }}>
            Edit Offer
          </Button>
          <Button mode="outlined" onPress={() => setDeleteModalVisible(true)} style={[styles.deleteButton, { borderColor: colors.error.main }]} icon="delete" labelStyle={{ color: colors.error.main }}>
            Delete Offer
          </Button>
        </View>
      </ScrollView>

      <ConfirmationModal
        visible={deleteModalVisible}
        title="Delete Offer"
        message={`Are you sure you want to delete "${offer.name || offer.code}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        confirmVariant="danger"
        icon="delete-alert"
        onConfirm={() => deleteMutation.mutate()}
        onCancel={() => setDeleteModalVisible(false)}
        loading={deleteMutation.isPending}
      />
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  scrollView: { flex: 1 },
  content: {},
  loadingCenter: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerCard: { padding: spacing[4], marginHorizontal: spacing[4], marginTop: spacing[4], borderRadius: borderRadius.lg, alignItems: 'center' },
  headerTop: { marginBottom: spacing[3] },
  offerTitle: { fontSize: 22, fontWeight: '600', marginBottom: spacing[3], textAlign: 'center' },
  codeContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing[4], paddingVertical: spacing[2], borderRadius: borderRadius.md, marginBottom: spacing[3], gap: spacing[2] },
  codeText: { fontSize: 18, fontWeight: '700', fontFamily: 'monospace' },
  discountValue: { fontSize: 28, fontWeight: '700' },
  section: { borderRadius: borderRadius.lg, padding: spacing[4], marginHorizontal: spacing[4], marginTop: spacing[4] },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: spacing[4] },
  statsCards: { flexDirection: 'row', gap: spacing[3], marginBottom: spacing[4] },
  statCard: { flex: 1, alignItems: 'center', padding: spacing[3], borderRadius: borderRadius.md },
  statValue: { fontSize: 24, fontWeight: '700' },
  statLabel: { fontSize: 12, marginTop: spacing[1] },
  progressContainer: { marginTop: spacing[2] },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing[2] },
  progressLabel: { fontSize: 14 },
  progressValue: { fontSize: 14, fontWeight: '600' },
  progressBar: { height: 8, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  detailRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: spacing[3], borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E2E8F0' },
  detailIcon: { marginRight: spacing[3], marginTop: 2 },
  detailContent: { flex: 1 },
  detailLabel: { fontSize: 12, marginBottom: spacing[1] },
  detailValue: { fontSize: 15 },
  description: { fontSize: 14, lineHeight: 22 },
  actionButtons: { gap: spacing[3], marginTop: spacing[4], marginHorizontal: spacing[4] },
  editButton: { borderRadius: borderRadius.md },
  deleteButton: { borderRadius: borderRadius.md },
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFoundText: { fontSize: 16, marginTop: spacing[4] },
});
