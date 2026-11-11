import React, { useState, useCallback } from 'react';
import { StyleSheet, View, ScrollView, Image, Alert, ActivityIndicator } from 'react-native';
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
import { marketingApi } from '@/services/api';
import { resolveImageUrl } from '@/utils/imageUrl';
import type { BannersStackParamList } from '@/types/navigation';

type NavigationProp = NativeStackNavigationProp<BannersStackParamList, 'BannerDetail'>;
type RouteProps = RouteProp<BannersStackParamList, 'BannerDetail'>;

function normalizeBanner(b: any) {
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
  };
}

export const BannerDetailScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const [deleteVisible, setDeleteVisible] = useState(false);

  const id = route.params.id;

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['banner', id],
    queryFn: () => marketingApi.getBanner(id),
    enabled: !!id,
  });

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [])
  );

  const deleteMutation = useMutation({
    mutationFn: () => marketingApi.deleteBanner(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['banners'] });
      setDeleteVisible(false);
      navigation.goBack();
    },
    onError: (err: any) => Alert.alert('Error', err?.message || 'Failed to delete'),
  });

  if (isLoading) {
    return (
      <ScreenWrapper>
        <Header title="Banner" showBack />
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
          <Icon name="image-off-outline" size={64} color={colors.neutral[300]} />
          <Text style={[styles.notFoundText, { color: colors.text.secondary }]}>
            {isError ? String(error?.message || 'Failed to load') : 'Banner not found'}
          </Text>
        </View>
      </ScreenWrapper>
    );
  }

  const banner = normalizeBanner(data);
  const handleEdit = () => navigation.navigate('BannerForm', { id: banner.id });

  return (
    <ScreenWrapper scrollable={false}>
      <Header
        title="Banner"
        showBack
        actions={[
          { icon: 'pencil', onPress: handleEdit },
          { icon: 'delete', onPress: () => setDeleteVisible(true) },
        ]}
      />
      <ScrollView contentContainerStyle={styles.content}>
        {/* Image */}
        <View style={[styles.imageWrap, { backgroundColor: colors.surface.variant }]}>
          {banner.image ? (
            <Image source={{ uri: banner.image }} style={styles.image} resizeMode="cover" />
          ) : (
            <Icon name="image-off-outline" size={64} color={colors.neutral[300]} />
          )}
        </View>

        <View style={[styles.section, { backgroundColor: colors.surface.default }]}>
          <View style={styles.row}>
            <Text style={[styles.title, { color: colors.text.primary }]}>{banner.title}</Text>
            <Badge variant={banner.isActive ? 'success' : 'error'}>
              {banner.isActive ? 'Active' : 'Inactive'}
            </Badge>
          </View>
          <DetailRow label="Position" value={banner.position.toUpperCase()} />
          <DetailRow label="Sort Order" value={String(banner.sortOrder)} />
          {banner.link && <DetailRow label="Link" value={banner.link} />}
          {banner.startDate && (
            <DetailRow
              label="Start Date"
              value={new Date(banner.startDate).toLocaleDateString('en-IN')}
            />
          )}
          {banner.endDate && (
            <DetailRow
              label="End Date"
              value={new Date(banner.endDate).toLocaleDateString('en-IN')}
            />
          )}
        </View>

        <Button mode="contained" icon="pencil" onPress={handleEdit}>
          Edit Banner
        </Button>
      </ScrollView>

      <ConfirmationModal
        visible={deleteVisible}
        title="Delete banner?"
        message={`This will remove "${banner.title}" permanently.`}
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
  imageWrap: {
    height: 200,
    borderRadius: borderRadius.lg,
    marginBottom: spacing[3],
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  image: { width: '100%', height: '100%' },
  section: { borderRadius: borderRadius.lg, padding: spacing[4], marginBottom: spacing[3] },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[3],
  },
  title: { fontSize: 18, fontWeight: '700', flex: 1, marginRight: spacing[2] },
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
