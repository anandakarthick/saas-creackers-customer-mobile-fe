import React, { useState, useCallback } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Searchbar } from 'react-native-paper';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ScreenWrapper, Header } from '@/components/layout';
import { Badge, Empty, SafeAreaFAB } from '@/components/common';
import { useTheme } from '@/theme';
import { spacing, borderRadius } from '@/theme/spacing';
import { marketingApi } from '@/services/api';
import { formatDate, formatCurrency } from '@/utils';
import type { OffersStackParamList } from '@/types/navigation';

type NavigationProp = NativeStackNavigationProp<OffersStackParamList, 'OffersList'>;

export const OffersListScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { colors } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const qc = useQueryClient();

  const { data: offersData, isLoading, isRefetching } = useQuery({
    queryKey: ['offers', searchQuery],
    queryFn: () => marketingApi.getOffers({ limit: 100, search: searchQuery || undefined }),
  });

  const offers = (offersData as any)?.data || [];

  const onRefresh = useCallback(() => {
    qc.invalidateQueries({ queryKey: ['offers'] });
  }, [qc]);

  const handleOfferPress = (offer: any) => {
    navigation.navigate('OfferDetail', { id: offer.id });
  };

  const handleAddOffer = () => {
    navigation.navigate('OfferForm', {});
  };

  const renderOffer = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={[styles.offerCard, { backgroundColor: colors.surface.default }]}
      onPress={() => handleOfferPress(item)}
      activeOpacity={0.7}
    >
      <View style={[styles.offerIcon, { backgroundColor: colors.secondary.light + '20' }]}>
        <Icon name="tag-multiple" size={24} color={colors.secondary.main} />
      </View>
      <View style={styles.offerInfo}>
        <View style={styles.offerHeader}>
          <Text style={[styles.offerTitle, { color: colors.text.primary }]} numberOfLines={1}>
            {item.name || item.code}
          </Text>
          <Badge variant={item.isActive ? 'success' : 'error'} size="small">
            {item.isActive ? 'Active' : 'Inactive'}
          </Badge>
        </View>
        <View style={[styles.codeContainer, { backgroundColor: colors.primary.light + '20' }]}>
          <Text style={[styles.codeText, { color: colors.primary.main }]}>{item.code}</Text>
        </View>
        <View style={styles.discountInfo}>
          <Text style={[styles.discountText, { color: colors.success.main }]}>
            {item.discountType === 'PERCENTAGE'
              ? `${item.discountValue}% off`
              : `${formatCurrency(Number(item.discountValue))} off`}
          </Text>
          {item.minOrderAmount > 0 && (
            <Text style={[styles.minOrder, { color: colors.text.tertiary }]}>
              Min: {formatCurrency(Number(item.minOrderAmount))}
            </Text>
          )}
        </View>
        <View style={styles.offerMeta}>
          <Text style={[styles.metaText, { color: colors.text.tertiary }]}>
            {item.startsAt ? formatDate(item.startsAt) : 'No start'} - {item.expiresAt ? formatDate(item.expiresAt) : 'No end'}
          </Text>
          {item.usageLimit > 0 && (
            <Text style={[styles.usageText, { color: colors.info.main }]}>
              {item.usedCount || 0}/{item.usageLimit} used
            </Text>
          )}
        </View>
      </View>
      <Icon name="chevron-right" size={24} color={colors.neutral[400]} />
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <ScreenWrapper scrollable={false} padding={false}>
        <Header title="Offers" showDrawer />
        <View style={styles.loadingCenter}>
          <ActivityIndicator size="large" color={colors.primary.main} />
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper scrollable={false} padding={false}>
      <Header
        title="Offers"
        subtitle={`${offers.length} offers`}
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

      <FlatList
        data={offers}
        renderItem={renderOffer}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshing={isRefetching}
        onRefresh={onRefresh}
        ListEmptyComponent={
          <Empty
            icon="tag-off-outline"
            title="No offers found"
            description="No offers match your search"
          />
        }
      />

      <SafeAreaFAB icon="plus" onPress={handleAddOffer} />
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
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
  loadingCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
