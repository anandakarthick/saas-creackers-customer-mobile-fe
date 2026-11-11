import React, { useState, useCallback } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Searchbar } from 'react-native-paper';
import { useQuery } from '@tanstack/react-query';
import { ScreenWrapper, Header } from '@/components/layout';
import { Badge, Empty, SafeAreaFAB } from '@/components/common';
import { useTheme } from '@/theme';
import { spacing, borderRadius } from '@/theme/spacing';
import { assetsApi } from '@/services/api';
import { formatCurrency } from '@/utils';
import type { AssetsStackParamList } from '@/types/navigation';

type Nav = NativeStackNavigationProp<AssetsStackParamList, 'AssetsList'>;

function normalizeAsset(a: any) {
  return {
    id: String(a.id),
    assetTag: a.assetTag || `AST-${a.id}`,
    name: a.name || '',
    category: a.category || '',
    status: a.status || 'ACTIVE',
    currentValue: Number(a.currentValue || a.purchasePrice || 0),
    location: a.location || '',
  };
}

const statusVariant = (s: string): 'success' | 'warning' | 'error' | 'info' => {
  if (s === 'ACTIVE') return 'success';
  if (s === 'UNDER_MAINTENANCE') return 'warning';
  if (s === 'DISPOSED' || s === 'SOLD' || s === 'LOST') return 'error';
  return 'info';
};

export const AssetsListScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const { colors } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');

  const { data, isLoading, isError, error, isFetching, refetch } = useQuery({
    queryKey: ['assets', searchQuery],
    queryFn: () => assetsApi.getAssets({ page: 1, limit: 100, search: searchQuery || undefined }),
  });

  const assets = (data?.data || []).map(normalizeAsset);

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [])
  );

  const onRefresh = useCallback(async () => { await refetch(); }, [refetch]);

  const renderItem = ({ item }: { item: ReturnType<typeof normalizeAsset> }) => (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.surface.default }]}
      onPress={() => navigation.navigate('AssetDetail', { id: item.id })}
      activeOpacity={0.7}
    >
      <View style={[styles.iconWrap, { backgroundColor: colors.info.light + '20' }]}>
        <Icon name="package-variant" size={24} color={colors.info.main} />
      </View>
      <View style={styles.info}>
        <View style={styles.headerRow}>
          <Text style={[styles.name, { color: colors.text.primary }]} numberOfLines={1}>
            {item.name}
          </Text>
          <Badge variant={statusVariant(item.status)} size="small">
            {item.status.replace(/_/g, ' ')}
          </Badge>
        </View>
        <View style={styles.metaRow}>
          <Icon name="tag" size={14} color={colors.text.tertiary} />
          <Text style={[styles.metaText, { color: colors.text.secondary }]}>{item.assetTag}</Text>
        </View>
        {item.category ? (
          <View style={styles.metaRow}>
            <Icon name="shape" size={14} color={colors.text.tertiary} />
            <Text style={[styles.metaText, { color: colors.text.secondary }]}>{item.category}</Text>
          </View>
        ) : null}
        {item.location ? (
          <View style={styles.metaRow}>
            <Icon name="map-marker" size={14} color={colors.text.tertiary} />
            <Text style={[styles.metaText, { color: colors.text.secondary }]}>{item.location}</Text>
          </View>
        ) : null}
        <Text style={[styles.value, { color: colors.primary.main }]}>
          {formatCurrency(item.currentValue)}
        </Text>
      </View>
      <Icon name="chevron-right" size={24} color={colors.neutral[400]} />
    </TouchableOpacity>
  );

  return (
    <ScreenWrapper scrollable={false} padding={false}>
      <Header title="Assets" subtitle={`${assets.length} assets`} showDrawer />

      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Search assets..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={[styles.searchBar, { backgroundColor: colors.surface.default }]}
          inputStyle={styles.searchInput}
        />
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary.main} />
        </View>
      ) : isError ? (
        <Empty icon="cloud-alert" title="Couldn't load assets" description={String((error as any)?.message || 'Network error')} />
      ) : (
        <FlatList
          data={assets}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshing={isFetching}
          onRefresh={onRefresh}
          ListEmptyComponent={
            <Empty icon="package-variant-closed" title="No assets found" description="No assets match your search" />
          }
        />
      )}

      <SafeAreaFAB icon="plus" onPress={() => navigation.navigate('AssetForm', {})} />
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  searchContainer: { paddingHorizontal: spacing[4], paddingVertical: spacing[2] },
  searchBar: { borderRadius: borderRadius.lg, elevation: 0 },
  searchInput: { fontSize: 14 },
  listContent: { padding: spacing[4], paddingBottom: spacing[20] },
  card: {
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
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  info: { flex: 1, marginLeft: spacing[3] },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[2],
  },
  name: { fontSize: 15, fontWeight: '600', flex: 1, marginRight: spacing[2] },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 3 },
  metaText: { fontSize: 13, marginLeft: spacing[2] },
  value: { fontSize: 14, fontWeight: '700', marginTop: spacing[2] },
});
