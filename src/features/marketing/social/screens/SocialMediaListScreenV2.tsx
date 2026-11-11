import React, { useCallback } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity, ActivityIndicator, Switch, Alert, Linking } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ScreenWrapper, Header } from '@/components/layout';
import { Empty, SafeAreaFAB } from '@/components/common';
import { useTheme } from '@/theme';
import { spacing, borderRadius } from '@/theme/spacing';
import { marketingApi } from '@/services/api';
import type { SocialLink } from '@/services/api/marketing.api';

const platformIcons: Record<string, { icon: string; color: string }> = {
  facebook: { icon: 'facebook', color: '#1877F2' },
  instagram: { icon: 'instagram', color: '#E4405F' },
  twitter: { icon: 'twitter', color: '#1DA1F2' },
  youtube: { icon: 'youtube', color: '#FF0000' },
  linkedin: { icon: 'linkedin', color: '#0A66C2' },
  whatsapp: { icon: 'whatsapp', color: '#25D366' },
  telegram: { icon: 'send', color: '#229ED9' },
  pinterest: { icon: 'pinterest', color: '#E60023' },
  tiktok: { icon: 'music-note', color: '#000000' },
};

export const SocialMediaListScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const qc = useQueryClient();

  const { data = [], isLoading, isError, error, isFetching, refetch } = useQuery({
    queryKey: ['social-links'],
    queryFn: () => marketingApi.getSocialLinks(),
  });

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [])
  );

  const toggle = useMutation({
    mutationFn: (id: number) => marketingApi.toggleSocialLink(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['social-links'] }),
  });

  const remove = useMutation({
    mutationFn: (id: number) => marketingApi.deleteSocialLink(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['social-links'] }),
  });

  const onRefresh = useCallback(async () => { await refetch(); }, [refetch]);

  const handleDelete = (link: SocialLink) => {
    Alert.alert('Delete link?', `Delete "${link.platform}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => remove.mutate(link.id) },
    ]);
  };

  return (
    <ScreenWrapper scrollable={false} padding={false}>
      <Header title="Social Media" subtitle={`${data.length} links`} showDrawer />

      {isLoading ? (
        <View style={styles.loadingCenter}><ActivityIndicator color={colors.primary.main} /></View>
      ) : isError ? (
        <Empty icon="cloud-alert" title="Couldn't load" description={String((error as any)?.message || '')} />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(it) => String(it.id)}
          contentContainerStyle={styles.list}
          refreshing={isFetching}
          onRefresh={onRefresh}
          renderItem={({ item }) => {
            const p = platformIcons[item.platform.toLowerCase()] || { icon: 'link-variant', color: colors.primary.main };
            return (
              <TouchableOpacity
                style={[styles.row, { backgroundColor: colors.surface.default }]}
                onPress={() => navigation.navigate('SocialMediaForm', { id: item.id })}
                onLongPress={() => handleDelete(item)}
                activeOpacity={0.7}
              >
                <View style={[styles.icon, { backgroundColor: p.color + '20' }]}>
                  <Icon name={p.icon} size={22} color={p.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.platform, { color: colors.text.primary }]}>{item.platform}</Text>
                  <TouchableOpacity onPress={() => Linking.openURL(item.url).catch(() => {})}>
                    <Text style={[styles.url, { color: colors.info.main }]} numberOfLines={1}>{item.url}</Text>
                  </TouchableOpacity>
                </View>
                <Switch
                  value={item.isActive}
                  onValueChange={() => toggle.mutate(item.id)}
                  trackColor={{ false: colors.neutral[300], true: colors.primary.light }}
                  thumbColor={item.isActive ? colors.primary.main : colors.neutral[0]}
                />
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <Empty icon="share-variant-outline" title="No links" description="Add your social media links" />
          }
        />
      )}

      <SafeAreaFAB icon="plus" onPress={() => navigation.navigate('SocialMediaForm', {})} />
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  loadingCenter: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: spacing[4], paddingBottom: spacing[20] },
  row: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: borderRadius.md,
    padding: spacing[3], marginBottom: spacing[2],
  },
  icon: {
    width: 44, height: 44, borderRadius: borderRadius.md,
    justifyContent: 'center', alignItems: 'center',
    marginRight: spacing[3],
  },
  platform: { fontSize: 15, fontWeight: '600', textTransform: 'capitalize' },
  url: { fontSize: 12, marginTop: 2 },
});
