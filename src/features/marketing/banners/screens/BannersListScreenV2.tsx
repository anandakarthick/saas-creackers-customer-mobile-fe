import React, { useCallback } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity, Image, Dimensions, ActivityIndicator } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useQuery } from '@tanstack/react-query';
import { ScreenWrapper, Header } from '@/components/layout';
import { Badge, Empty, SafeAreaFAB } from '@/components/common';
import { useTheme } from '@/theme';
import { spacing, borderRadius } from '@/theme/spacing';
import { marketingApi } from '@/services/api';
import { formatDate } from '@/utils';
import { resolveImageUrl } from '@/utils/imageUrl';
import type { Banner } from '@/types';

const { width } = Dimensions.get('window');

function normalizeBanner(b: any): Banner {
  return {
    id: String(b.id),
    title: b.title || '',
    image: resolveImageUrl(b.imageUrl || b.image) || '',
    link: b.link || b.linkUrl || '',
    position: b.position || 'home',
    sortOrder: Number(b.sortOrder || 0),
    isActive: b.isActive !== false,
    startDate: b.startsAt || b.startDate,
    endDate: b.endsAt || b.endDate,
    createdAt: b.createdAt,
    updatedAt: b.updatedAt,
  } as Banner;
}

export const BannersListScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();

  const { data, isLoading, isError, error, isFetching, refetch } = useQuery({
    queryKey: ['banners'],
    queryFn: () => marketingApi.getBanners({ page: 1, limit: 100 }),
  });

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [])
  );

  const banners: Banner[] = (data?.data || []).map(normalizeBanner);

  const onRefresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const renderBanner = ({ item }: { item: Banner }) => (
    <TouchableOpacity
      style={[styles.bannerCard, { backgroundColor: colors.surface.default }]}
      onPress={() => navigation.navigate('BannerDetail', { id: item.id })}
      activeOpacity={0.7}
    >
      {item.image ? (
        <Image source={{ uri: item.image }} style={[styles.bannerImage, { backgroundColor: colors.neutral[100] }]} />
      ) : (
        <View style={[styles.bannerImage, styles.bannerImagePlaceholder, { backgroundColor: colors.neutral[100] }]}>
          <Icon name="image-off-outline" size={40} color={colors.neutral[300]} />
        </View>
      )}
      <View style={styles.bannerOverlay}>
        <View style={styles.bannerHeader}>
          <Badge variant={item.isActive ? 'success' : 'default'} size="small">
            {item.isActive ? 'Active' : 'Inactive'}
          </Badge>
          <Badge variant="info" size="small">
            {item.position}
          </Badge>
        </View>
      </View>
      <View style={styles.bannerInfo}>
        <Text style={[styles.bannerTitle, { color: colors.text.primary }]}>{item.title}</Text>
        <View style={styles.bannerMeta}>
          <Text style={[styles.metaText, { color: colors.text.secondary }]}>Position: {item.position}</Text>
          <Text style={[styles.metaText, { color: colors.text.secondary }]}>Order: {item.sortOrder}</Text>
        </View>
        {(item.startDate || item.endDate) && (
          <Text style={[styles.dateRange, { color: colors.text.tertiary }]}>
            {item.startDate && formatDate(item.startDate)} - {item.endDate && formatDate(item.endDate)}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <ScreenWrapper scrollable={false} padding={false}>
      <Header
        title="Banners"
        subtitle={`${banners.length} banners`}
        showDrawer
      />

      {isLoading ? (
        <View style={styles.loadingCenter}>
          <ActivityIndicator size="large" color={colors.primary.main} />
        </View>
      ) : isError ? (
        <Empty icon="cloud-alert" title="Couldn't load banners" description={String(error?.message || 'Network error')} />
      ) : (
        <FlatList
          data={banners}
          renderItem={renderBanner}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshing={isFetching}
          onRefresh={onRefresh}
          ListEmptyComponent={
            <Empty
              icon="image-multiple-outline"
              title="No banners found"
              description="Create your first banner"
            />
          }
        />
      )}

      <SafeAreaFAB icon="plus" onPress={() => navigation.navigate('BannerForm', {})} />
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  loadingCenter: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: {
    padding: spacing[4],
    paddingBottom: spacing[20],
  },
  bannerCard: {
    borderRadius: borderRadius.lg,
    marginBottom: spacing[4],
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  bannerImage: {
    width: '100%',
    height: 160,
  },
  bannerImagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  bannerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    padding: spacing[3],
  },
  bannerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  bannerInfo: {
    padding: spacing[3],
  },
  bannerTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: spacing[2],
  },
  bannerMeta: {
    flexDirection: 'row',
    gap: spacing[4],
  },
  metaText: {
    fontSize: 12,
  },
  dateRange: {
    fontSize: 12,
    marginTop: spacing[2],
  },
});
