import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
  RefreshControl,
} from 'react-native';
import { Text, Button } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { Header } from '@/components/layout/Header';
import { Badge } from '@/components/common/Badge';
import { ConfirmationModal } from '@/components/common/ConfirmationModal';
import { useTheme } from '@/theme';
import { spacing, borderRadius } from '@/theme/spacing';
import { productsApi } from '@/services/api';
import { API_CONFIG, ENDPOINTS } from '@/config/api';
import { STORAGE_KEYS } from '@/constants';

export const BarcodePrintJobsScreen: React.FC = () => {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['barcodePrintJobs'],
    queryFn: () => productsApi.listBarcodePrintJobs(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => productsApi.deleteBarcodePrintJob(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['barcodePrintJobs'] });
      setDeleteId(null);
      Alert.alert('Deleted', 'Barcode print job has been deleted.');
    },
    onError: (err: any) => Alert.alert('Error', err?.message || 'Failed to delete'),
  });

  const handleDownload = async (jobId: string) => {
    try {
      const [token, tenantSlug] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN),
        AsyncStorage.getItem(STORAGE_KEYS.TENANT_SLUG),
      ]);
      if (!token) throw new Error('Not authenticated.');
      const base = API_CONFIG.BASE_URL.replace(/\/$/, '');
      const url =
        `${base}${ENDPOINTS.BARCODE_PRINT_JOBS}/${encodeURIComponent(jobId)}/download` +
        `?token=${encodeURIComponent(token)}` +
        (tenantSlug ? `&tenant=${encodeURIComponent(tenantSlug)}` : '');
      const supported = await Linking.canOpenURL(url);
      if (!supported) throw new Error('No app available to open this URL.');
      await Linking.openURL(url);
    } catch (err: any) {
      Alert.alert('Download Failed', err?.message || 'Could not download barcode PDF');
    }
  };

  const jobs: any[] = Array.isArray(data) ? data : (data as any)?.data || [];

  const renderItem = ({ item }: { item: any }) => {
    const productCount = item.productIds?.length || item.productCount || 0;
    const qty = item.quantityPerProduct || 1;
    const createdAt = item.createdAt
      ? new Date(item.createdAt).toLocaleString('en-IN')
      : '';
    const status = item.status || 'COMPLETED';

    return (
      <View style={[styles.card, { backgroundColor: colors.surface.default }]}>
        <View style={styles.cardHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
            <Icon name="barcode" size={22} color={colors.primary.main} />
            <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text.primary }}>
              Job #{item.id}
            </Text>
          </View>
          <Badge variant={status === 'COMPLETED' ? 'success' : status === 'PENDING' ? 'warning' : 'info'}>
            {status}
          </Badge>
        </View>
        <View style={styles.cardBody}>
          <View style={styles.infoRow}>
            <Text style={{ fontSize: 13, color: colors.text.secondary }}>Products</Text>
            <Text style={{ fontSize: 13, fontWeight: '500', color: colors.text.primary }}>
              {productCount}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={{ fontSize: 13, color: colors.text.secondary }}>Qty per Product</Text>
            <Text style={{ fontSize: 13, fontWeight: '500', color: colors.text.primary }}>
              {qty}
            </Text>
          </View>
          {createdAt && (
            <View style={styles.infoRow}>
              <Text style={{ fontSize: 13, color: colors.text.secondary }}>Created</Text>
              <Text style={{ fontSize: 12, color: colors.text.tertiary }}>{createdAt}</Text>
            </View>
          )}
        </View>
        <View style={styles.cardActions}>
          <Button
            mode="contained"
            icon="download"
            compact
            onPress={() => handleDownload(String(item.id))}
            style={{ flex: 2 }}
          >
            Download
          </Button>
          <Button
            mode="outlined"
            icon="delete"
            compact
            textColor={colors.error.main}
            onPress={() => setDeleteId(String(item.id))}
            style={{ flex: 1, borderColor: colors.error.main }}
          >
            Delete
          </Button>
        </View>
      </View>
    );
  };

  return (
    <ScreenWrapper scrollable={false}>
      <Header title="Barcode Print Jobs" showBack />

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary.main} />
        </View>
      ) : jobs.length === 0 ? (
        <View style={styles.center}>
          <Icon name="barcode-off" size={64} color={colors.neutral[300]} />
          <Text style={{ fontSize: 16, color: colors.text.secondary, marginTop: spacing[3] }}>
            No barcode print jobs yet
          </Text>
          <Text style={{ fontSize: 13, color: colors.text.tertiary, marginTop: spacing[1], textAlign: 'center', paddingHorizontal: spacing[6] }}>
            Create a print job from a product's detail page using the barcode icon.
          </Text>
        </View>
      ) : (
        <FlatList
          data={jobs}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              colors={[colors.primary.main]}
            />
          }
        />
      )}

      <ConfirmationModal
        visible={!!deleteId}
        title="Delete Print Job"
        message="Are you sure you want to delete this barcode print job?"
        confirmText="Delete"
        confirmVariant="danger"
        loading={deleteMutation.isPending}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        onCancel={() => setDeleteId(null)}
      />
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: spacing[4], paddingBottom: spacing[8] },
  card: {
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    marginBottom: spacing[3],
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  cardBody: {
    marginBottom: spacing[3],
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing[1],
  },
  cardActions: {
    flexDirection: 'row',
    gap: spacing[2],
  },
});
