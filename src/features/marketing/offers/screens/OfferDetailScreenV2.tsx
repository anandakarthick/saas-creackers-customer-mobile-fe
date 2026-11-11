import React, { useState, useCallback } from 'react';
import { StyleSheet, View, ScrollView, Platform, Alert, ActivityIndicator } from 'react-native';
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
import { marketingApi } from '@/services/api';
import type { OffersStackParamList } from '@/types/navigation';

type NavigationProp = NativeStackNavigationProp<OffersStackParamList, 'OfferDetail'>;
type RouteProps = RouteProp<OffersStackParamList, 'OfferDetail'>;

function normalizeOffer(o: any) {
  return {
    id: String(o.id),
    title: o.name || o.title || '',
    description: o.description || '',
    code: o.code || '',
    discountType:
      (o.discountType || 'PERCENTAGE').toLowerCase() === 'percentage'
        ? ('percentage' as const)
        : ('fixed' as const),
    discountValue: Number(o.discountValue || 0),
    minOrderValue: o.minOrderAmount ?? o.minOrderValue,
    maxDiscount: o.maxDiscount,
    usageLimit: o.usageLimit,
    usedCount: Number(o.usedCount || 0),
    isActive: o.isActive !== false,
    startDate: o.startsAt || o.startDate || '',
    endDate: o.expiresAt || o.endDate || '',
    applicableTo: (o.offerType || 'all').toLowerCase(),
  };
}

export const OfferDetailScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const [deleteVisible, setDeleteVisible] = useState(false);

  const id = route.params.id;

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['offer', id],
    queryFn: () => marketingApi.getOffer(id),
    enabled: !!id,
  });

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [])
  );

  const deleteMutation = useMutation({
    mutationFn: () => marketingApi.deleteOffer(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offers'] });
      setDeleteVisible(false);
      navigation.goBack();
    },
    onError: (err: any) => Alert.alert('Error', err?.message || 'Failed to delete'),
  });

  if (isLoading) {
    return (
      <ScreenWrapper>
        <Header title="Offer" showBack />
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
          <Icon name="tag-off-outline" size={64} color={colors.neutral[300]} />
          <Text style={[styles.notFoundText, { color: colors.text.secondary }]}>
            {isError ? String(error?.message || 'Failed to load') : 'Offer not found'}
          </Text>
        </View>
      </ScreenWrapper>
    );
  }

  const offer = normalizeOffer(data);
  const handleEdit = () => navigation.navigate('OfferForm', { id: offer.id });

  const discountLabel =
    offer.discountType === 'percentage' ? `${offer.discountValue}%` : `₹${offer.discountValue}`;

  return (
    <ScreenWrapper scrollable={false}>
      <Header
        title="Offer"
        showBack
        actions={[
          { icon: 'pencil', onPress: handleEdit },
          { icon: 'delete', onPress: () => setDeleteVisible(true) },
        ]}
      />
      <ScrollView contentContainerStyle={styles.content}>
        {/* Hero */}
        <View
          style={[styles.hero, { backgroundColor: colors.primary.main }]}
        >
          <Text style={styles.discount}>{discountLabel} OFF</Text>
          <Text style={styles.code}>{offer.code}</Text>
        </View>

        <View style={[styles.section, { backgroundColor: colors.surface.default }]}>
          <View style={styles.row}>
            <Text style={[styles.title, { color: colors.text.primary }]}>{offer.title}</Text>
            <Badge variant={offer.isActive ? 'success' : 'error'}>
              {offer.isActive ? 'Active' : 'Inactive'}
            </Badge>
          </View>
          {offer.description && (
            <Text style={[styles.description, { color: colors.text.secondary }]}>
              {offer.description}
            </Text>
          )}
        </View>

        <View style={[styles.section, { backgroundColor: colors.surface.default }]}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Terms</Text>
          <DetailRow
            label="Discount Type"
            value={offer.discountType === 'percentage' ? 'Percentage' : 'Fixed Amount'}
          />
          <DetailRow label="Discount Value" value={discountLabel} />
          {offer.minOrderValue && (
            <DetailRow label="Min Order" value={`₹${offer.minOrderValue}`} />
          )}
          {offer.maxDiscount && <DetailRow label="Max Discount" value={`₹${offer.maxDiscount}`} />}
          <DetailRow label="Applies To" value={offer.applicableTo?.toUpperCase() || 'ALL'} />
        </View>

        <View style={[styles.section, { backgroundColor: colors.surface.default }]}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Usage</Text>
          <DetailRow label="Used" value={`${offer.usedCount || 0}`} />
          {offer.usageLimit && (
            <DetailRow
              label="Limit"
              value={`${offer.usedCount || 0} / ${offer.usageLimit}`}
            />
          )}
          {offer.startDate && (
            <DetailRow
              label="Starts"
              value={new Date(offer.startDate).toLocaleDateString('en-IN')}
            />
          )}
          {offer.endDate && (
            <DetailRow label="Ends" value={new Date(offer.endDate).toLocaleDateString('en-IN')} />
          )}
        </View>

        <Button mode="contained" icon="pencil" onPress={handleEdit}>
          Edit Offer
        </Button>
      </ScrollView>

      <ConfirmationModal
        visible={deleteVisible}
        title="Delete offer?"
        message={`This will remove "${offer.title}".`}
        confirmText="Delete"
        confirmVariant="danger"
        loading={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate()}
        onCancel={() => setDeleteVisible(false)}
      />
    </ScreenWrapper>
  );
};

const DetailRow: React.FC<{ label: string; value: string }> = ({ label, value }) => {
  const { colors } = useTheme();
  return (
    <View style={styles.detailRow}>
      <Text style={[styles.detailLabel, { color: colors.text.secondary }]}>{label}</Text>
      <Text style={[styles.detailValue, { color: colors.text.primary }]}>{value}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  content: { padding: spacing[4], paddingBottom: spacing[8] },
  hero: {
    borderRadius: borderRadius.lg,
    padding: spacing[6],
    marginBottom: spacing[3],
    alignItems: 'center',
  },
  discount: { fontSize: 32, fontWeight: '800', color: '#fff' },
  code: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginTop: spacing[2],
    letterSpacing: 2,
  },
  section: { borderRadius: borderRadius.lg, padding: spacing[4], marginBottom: spacing[3] },
  sectionTitle: { fontSize: 14, fontWeight: '700', marginBottom: spacing[3] },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[2],
  },
  title: { fontSize: 17, fontWeight: '700', flex: 1, marginRight: spacing[2] },
  description: { fontSize: 13, lineHeight: 20 },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing[2],
  },
  detailLabel: { fontSize: 13 },
  detailValue: { fontSize: 13, fontWeight: '500' },
  notFound: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  notFoundText: { fontSize: 16, marginTop: spacing[3] },
});
