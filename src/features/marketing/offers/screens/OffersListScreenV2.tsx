import React, { useState, useCallback } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Searchbar } from 'react-native-paper';
import { useQuery } from '@tanstack/react-query';
import { ScreenWrapper, Header } from '@/components/layout';
import { Badge, Empty, SafeAreaFAB } from '@/components/common';
import { useTheme } from '@/theme';
import { spacing, borderRadius } from '@/theme/spacing';
import { marketingApi } from '@/services/api';
import { formatDate, formatCurrency } from '@/utils';
import type { Offer } from '@/types';

function normalizeOffer(o: any): Offer {
  return {
    id: String(o.id),
    title: o.name || o.title || '',
    description: o.description || '',
    code: o.code || '',
    discountType: (o.discountType || 'PERCENTAGE').toLowerCase() === 'percentage' ? 'percentage' : 'fixed',
    discountValue: Number(o.discountValue || 0),
    minOrderValue: o.minOrderAmount || o.minOrderValue,
    maxDiscount: o.maxDiscount,
    usageLimit: o.usageLimit,
    usedCount: o.usedCount || 0,
    isActive: o.isActive !== false,
    startDate: o.startsAt || o.startDate || '',
    endDate: o.expiresAt || o.endDate || '',
    applicableTo: o.offerType?.toLowerCase() || 'all',
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
  } as Offer;
}

export const OffersListScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');

  const { data, isLoading, isError, error, isFetching, refetch } = useQuery({
    queryKey: ['offers', searchQuery],
    queryFn: () => marketingApi.getOffers({ page: 1, limit: 100, search: searchQuery || undefined }),
  });

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [])
  );

  const filteredOffers: Offer[] = (data?.data || []).map(normalizeOffer);

  const onRefresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const renderOffer = ({ item }: { item: Offer }) => (
    <TouchableOpacity
      style={[styles.offerCard, { backgroundColor: colors.surface.default }]}
      onPress={() => navigation.navigate('OfferDetail', { id: item.id })}
      activeOpacity={0.7}
    >
      <View style={[styles.offerIcon, { backgroundColor: colors.secondary.light + '20' }]}>
        <Icon name="tag-multiple" size={24} color={colors.secondary.main} />
      </View>
      <View style={styles.offerInfo}>
        <View style={styles.offerHeader}>
          <Text style={[styles.offerTitle, { color: colors.text.primary }]}>{item.title}</Text>
          <Badge variant={item.isActive ? 'success' : 'error'} size="small">
            {item.isActive ? 'Active' : 'Inactive'}
          </Badge>
        </View>
        <View style={[styles.codeContainer, { backgroundColor: colors.primary.light + '20' }]}>
          <Text style={[styles.codeText, { color: colors.primary.main }]}>{item.code}</Text>
        </View>
        <View style={styles.discountInfo}>
          <Text style={[styles.discountText, { color: colors.success.main }]}>
            {item.discountType === 'percentage'
              ? `${item.discountValue}% off`
              : `${formatCurrency(item.discountValue)} off`}
          </Text>
          {item.minOrderValue && (
            <Text style={[styles.minOrder, { color: colors.text.tertiary }]}>Min: {formatCurrency(item.minOrderValue)}</Text>
          )}
        </View>
        <View style={styles.offerMeta}>
          <Text style={[styles.metaText, { color: colors.text.tertiary }]}>
            {item.startDate ? formatDate(item.startDate) : '—'}
            {' - '}
            {item.endDate ? formatDate(item.endDate) : '—'}
          </Text>
          {item.usageLimit ? (
            <Text style={[styles.usageText, { color: colors.info.main }]}>
              {item.usedCount}/{item.usageLimit} used
            </Text>
          ) : null}
        </View>
      </View>
      <Icon name="chevron-right" size={24} color={colors.neutral[400]} />
    </TouchableOpacity>
  );

  return (
    <ScreenWrapper scrollable={false} padding={false}>
      <Header
        title="Offers"
        subtitle={`${filteredOffers.length} offers`}
        showDrawer
      />

      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Search offers..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={[styles.searchBar, { backgroundColor: colors.surface.default }]}
          inputStyle={styles.searchInput}
        />
      </View>

      {isLoading ? (
        <View style={styles.loadingCenter}>
          <ActivityIndicator size="large" color={colors.primary.main} />
        </View>
      ) : isError ? (
        <Empty icon="cloud-alert" title="Couldn't load offers" description={String(error?.message || 'Network error')} />
      ) : (
        <FlatList
          data={filteredOffers}
          renderItem={renderOffer}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshing={isFetching}
          onRefresh={onRefresh}
          ListEmptyComponent={
            <Empty
              icon="tag-off-outline"
              title="No offers found"
              description="No offers match your search"
            />
          }
        />
      )}

      <SafeAreaFAB icon="plus" onPress={() => navigation.navigate('OfferForm', {})} />
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  loadingCenter: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  searchContainer: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
  },
  searchBar: {
    borderRadius: borderRadius.lg,
    elevation: 0,
  },
  searchInput: {
    fontSize: 14,
  },
  listContent: {
    padding: spacing[4],
    paddingBottom: spacing[20],
  },
  offerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    marginBottom: spacing[3],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  offerIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  offerInfo: {
    flex: 1,
    marginLeft: spacing[3],
  },
  offerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[2],
  },
  offerTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginRight: spacing[2],
  },
  codeContainer: {
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.sm,
    alignSelf: 'flex-start',
    marginBottom: spacing[2],
  },
  codeText: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'monospace',
  },
  discountInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    marginBottom: spacing[2],
  },
  discountText: {
    fontSize: 14,
    fontWeight: '600',
  },
  minOrder: {
    fontSize: 12,
  },
  offerMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metaText: {
    fontSize: 12,
  },
  usageText: {
    fontSize: 12,
  },
});
