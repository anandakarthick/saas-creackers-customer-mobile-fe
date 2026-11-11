import React, { useState } from 'react';
import { StyleSheet, View, ScrollView, Image, Alert, ActivityIndicator } from 'react-native';
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
import { formatDate, formatDateTime } from '@/utils';
import { safeImageUri } from '@/utils/imageUrl';
import type { BannersStackParamList } from '@/types/navigation';

type NavigationProp = NativeStackNavigationProp<BannersStackParamList, 'BannerDetail'>;
type RouteProps = RouteProp<BannersStackParamList, 'BannerDetail'>;

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

const getPositionLabel = (position: string) => {
  const labels: Record<string, string> = {
    HOME_TOP: 'Home Top',
    HOME_MIDDLE: 'Home Middle',
    HOME_BOTTOM: 'Home Bottom',
    CATEGORY: 'Category Page',
    PRODUCT: 'Product Page',
  };
  return labels[position] || position;
};

export const BannerDetailScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const qc = useQueryClient();

  const bannerId = route.params.id;

  const { data: banner, isLoading } = useQuery({
    queryKey: ['banner', bannerId],
    queryFn: () => marketingApi.getBanner(bannerId),
  });

  const deleteMutation = useMutation({
    mutationFn: () => marketingApi.deleteBanner(bannerId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['banners'] });
      setDeleteModalVisible(false);
      navigation.goBack();
    },
    onError: (e: any) => Alert.alert('Error', e?.message || 'Failed to delete banner'),
  });

  if (isLoading) {
    return (
      <ScreenWrapper>
        <Header title="Banner Details" showBack />
        <View style={styles.loadingCenter}>
          <ActivityIndicator size="large" color={colors.primary.main} />
        </View>
      </ScreenWrapper>
    );
  }

  if (!banner) {
    return (
      <ScreenWrapper>
        <Header title="Banner Not Found" showBack />
        <View style={styles.notFound}>
          <Icon name="alert-circle-outline" size={64} color={colors.neutral[300]} />
          <Text style={[styles.notFoundText, { color: colors.text.secondary }]}>
            Banner not found
          </Text>
        </View>
      </ScreenWrapper>
    );
  }

  const handleEdit = () => {
    navigation.navigate('BannerForm', { id: banner.id });
  };

  const isActive = () => {
    if (!banner.isActive) return false;
    const now = new Date();
    if (banner.startsAt && new Date(banner.startsAt) > now) return false;
    if (banner.endsAt && new Date(banner.endsAt) < now) return false;
    return true;
  };

  return (
    <ScreenWrapper scrollable={false}>
      <Header
        title="Banner Details"
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
        <View style={[styles.imageCard, { backgroundColor: colors.surface.default }]}>
          <Image source={{ uri: safeImageUri(banner.imageUrl) }} style={styles.bannerImage} resizeMode="cover" />
          <View style={styles.badgeContainer}>
            <Badge variant={isActive() ? 'success' : 'default'}>
              {isActive() ? 'Active' : 'Inactive'}
            </Badge>
            <Badge variant="info" style={styles.positionBadge}>
              {getPositionLabel(banner.position)}
            </Badge>
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: colors.surface.default }]}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Basic Information</Text>
          <DetailRow label="Title" value={banner.title} icon="format-title" />
          {banner.linkUrl && <DetailRow label="Link URL" value={banner.linkUrl} icon="link" />}
          <DetailRow label="Position" value={getPositionLabel(banner.position)} icon="map-marker" />
          <DetailRow label="Sort Order" value={String(banner.sortOrder ?? 0)} icon="sort-numeric-ascending" />
          <DetailRow
            label="Status"
            value={
              <Chip
                mode="flat"
                style={{ backgroundColor: banner.isActive ? colors.success.main + '20' : colors.neutral[200] }}
                textStyle={{ color: banner.isActive ? colors.success.dark : colors.text.secondary, fontSize: 12 }}
              >
                {banner.isActive ? 'Active' : 'Inactive'}
              </Chip>
            }
            icon="check-circle-outline"
          />
        </View>

        <View style={[styles.section, { backgroundColor: colors.surface.default }]}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Schedule</Text>
          <DetailRow label="Start Date" value={banner.startsAt ? formatDate(banner.startsAt) : 'Not set'} icon="calendar-start" />
          <DetailRow label="End Date" value={banner.endsAt ? formatDate(banner.endsAt) : 'Not set'} icon="calendar-end" />
        </View>

        {banner.createdAt && (
          <View style={[styles.section, { backgroundColor: colors.surface.default }]}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Timestamps</Text>
            <DetailRow label="Created At" value={formatDateTime(banner.createdAt)} icon="calendar-plus" />
            <DetailRow label="Updated At" value={formatDateTime(banner.updatedAt)} icon="calendar-edit" />
          </View>
        )}

        <View style={styles.actionButtons}>
          <Button mode="outlined" onPress={handleEdit} style={styles.editButton} icon="pencil" labelStyle={{ color: colors.primary.main }}>
            Edit Banner
          </Button>
          <Button mode="outlined" onPress={() => setDeleteModalVisible(true)} style={[styles.deleteButton, { borderColor: colors.error.main }]} icon="delete" labelStyle={{ color: colors.error.main }}>
            Delete Banner
          </Button>
        </View>
      </ScrollView>

      <ConfirmationModal
        visible={deleteModalVisible}
        title="Delete Banner"
        message={`Are you sure you want to delete "${banner.title}"? This action cannot be undone.`}
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
  content: { padding: spacing[4] },
  loadingCenter: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  imageCard: { borderRadius: borderRadius.lg, overflow: 'hidden', marginBottom: spacing[4] },
  bannerImage: { width: '100%', height: 200, backgroundColor: '#f0f0f0' },
  badgeContainer: { flexDirection: 'row', justifyContent: 'space-between', padding: spacing[3] },
  positionBadge: { marginLeft: spacing[2] },
  section: { borderRadius: borderRadius.lg, padding: spacing[4], marginBottom: spacing[4] },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: spacing[4] },
  detailRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: spacing[3], borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E2E8F0' },
  detailIcon: { marginRight: spacing[3], marginTop: 2 },
  detailContent: { flex: 1 },
  detailLabel: { fontSize: 12, marginBottom: spacing[1] },
  detailValue: { fontSize: 15 },
  actionButtons: { gap: spacing[3], marginTop: spacing[2] },
  editButton: { borderRadius: borderRadius.md },
  deleteButton: { borderRadius: borderRadius.md },
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFoundText: { fontSize: 16, marginTop: spacing[4] },
});
