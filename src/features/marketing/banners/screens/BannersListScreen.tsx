import React, { useState, useCallback } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity, Image, Dimensions, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ScreenWrapper, Header } from '@/components/layout';
import { Badge, Empty, SafeAreaFAB } from '@/components/common';
import { useTheme } from '@/theme';
import { spacing, borderRadius } from '@/theme/spacing';
import { marketingApi } from '@/services/api';
import { formatDate } from '@/utils';
import { safeImageUri } from '@/utils/imageUrl';
import type { BannersStackParamList } from '@/types/navigation';

type NavigationProp = NativeStackNavigationProp<BannersStackParamList, 'BannersList'>;

const getPositionLabel = (position: string) => {
  const labels: Record<string, string> = {
    HOME_TOP: 'Home Top',
    HOME_MIDDLE: 'Home Middle',
    HOME_BOTTOM: 'Home Bottom',
    CATEGORY: 'Category',
    PRODUCT: 'Product',
  };
  return labels[position] || position;
};

export const BannersListScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { colors } = useTheme();
  const qc = useQueryClient();

  const { data: bannersData, isLoading, isRefetching } = useQuery({
    queryKey: ['banners'],
    queryFn: () => marketingApi.getBanners({ limit: 100 }),
  });

  const banners = (bannersData as any)?.data || [];

  const handleBannerPress = (banner: any) => {
    navigation.navigate('BannerDetail', { id: banner.id });
  };

  const handleAddBanner = () => {
    navigation.navigate('BannerForm', {});
  };

  const onRefresh = useCallback(() => {
    qc.invalidateQueries({ queryKey: ['banners'] });
  }, [qc]);

  const renderBanner = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={[styles.bannerCard, { backgroundColor: colors.surface.default }]}
      onPress={() => handleBannerPress(item)}
      activeOpacity={0.7}
    >
      <Image source={{ uri: safeImageUri(item.imageUrl) }} style={styles.bannerImage} />
      <View style={styles.bannerOverlay}>
        <View style={styles.bannerHeader}>
          <Badge variant={item.isActive ? 'success' : 'default'} size="small">
            {item.isActive ? 'Active' : 'Inactive'}
          </Badge>
          <Badge variant="info" size="small">
            {getPositionLabel(item.position)}
          </Badge>
        </View>
      </View>
      <View style={styles.bannerInfo}>
        <Text style={[styles.bannerTitle, { color: colors.text.primary }]}>{item.title}</Text>
        <View style={styles.bannerMeta}>
          <Text style={[styles.metaText, { color: colors.text.secondary }]}>
            Position: {getPositionLabel(item.position)}
          </Text>
          <Text style={[styles.metaText, { color: colors.text.secondary }]}>
            Order: {item.sortOrder ?? 0}
          </Text>
        </View>
        {(item.startsAt || item.endsAt) && (
          <Text style={[styles.dateRange, { color: colors.text.tertiary }]}>
            {item.startsAt && formatDate(item.startsAt)} - {item.endsAt && formatDate(item.endsAt)}
          </Text>
        )}
      </View>
      <View style={styles.chevronContainer}>
        <Icon name="chevron-right" size={24} color={colors.neutral[400]} />
      </View>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <ScreenWrapper scrollable={false} padding={false}>
        <Header title="Banners" showDrawer />
        <View style={styles.loadingCenter}>
          <ActivityIndicator size="large" color={colors.primary.main} />
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper scrollable={false} padding={false}>
      <Header
        title="Banners"
        subtitle={`${banners.length} banners`}
        showDrawer
      />

      <FlatList
        data={banners}
        renderItem={renderBanner}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshing={isRefetching}
        onRefresh={onRefresh}
        ListEmptyComponent={
          <Empty
            icon="image-multiple-outline"
            title="No banners found"
            description="Create your first banner"
            actionLabel="Add Banner"
            onAction={handleAddBanner}
          />
        }
      />

      <SafeAreaFAB icon="plus" onPress={handleAddBanner} />
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  listContent: {
    padding: spacing[4],
    paddingBottom: spacing[20],
  },
  loadingCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    backgroundColor: '#f0f0f0',
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
    paddingRight: spacing[10],
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
  chevronContainer: {
    position: 'absolute',
    right: spacing[3],
    bottom: spacing[4],
  },
});
