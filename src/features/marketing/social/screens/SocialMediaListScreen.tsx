import React, { useState, useCallback } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { ScreenWrapper, Header } from '@/components/layout';
import { Badge, Empty, SafeAreaFAB } from '@/components/common';
import { colors } from '@/theme/colors';
import { spacing, borderRadius } from '@/theme/spacing';
import { mockSocialMediaPosts } from '@/data/mock';
import { safeImageUri } from '@/utils/imageUrl';
import { formatDateTime } from '@/utils';
import type { SocialMediaPost } from '@/types';
import type { SocialMediaStackParamList } from '@/types/navigation';

type NavigationProp = NativeStackNavigationProp<SocialMediaStackParamList, 'SocialMediaList'>;

const platformIcons: Record<string, { icon: string; color: string }> = {
  facebook: { icon: 'facebook', color: '#1877F2' },
  instagram: { icon: 'instagram', color: '#E4405F' },
  twitter: { icon: 'twitter', color: '#1DA1F2' },
};

export const SocialMediaListScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const [refreshing, setRefreshing] = useState(false);

  const handlePostPress = useCallback((postId: string) => {
    navigation.navigate('SocialMediaDetail', { id: postId });
  }, [navigation]);

  const handleCreatePost = useCallback(() => {
    navigation.navigate('SocialMediaForm', {});
  }, [navigation]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await new Promise<void>((resolve) => setTimeout(resolve, 1000));
    setRefreshing(false);
  }, []);

  const getStatusVariant = (status: SocialMediaPost['status']) => {
    switch (status) {
      case 'published': return 'success';
      case 'scheduled': return 'info';
      default: return 'default';
    }
  };

  const renderPost = ({ item }: { item: SocialMediaPost }) => (
    <TouchableOpacity
      style={styles.postCard}
      onPress={() => handlePostPress(item.id)}
      activeOpacity={0.7}
    >
      <View style={styles.postHeader}>
        <View style={styles.platforms}>
          {item.platforms.map((platform) => (
            <View key={platform} style={styles.platformIcon}>
              <Icon
                name={platformIcons[platform].icon}
                size={16}
                color={platformIcons[platform].color}
              />
            </View>
          ))}
        </View>
        <Badge variant={getStatusVariant(item.status)} size="small">
          {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
        </Badge>
      </View>

      <Text style={styles.postTitle}>{item.title}</Text>
      <Text style={styles.postContent} numberOfLines={3}>{item.content}</Text>

      {item.images?.length > 0 && safeImageUri(item.images[0]) && (
        <Image
          source={{ uri: safeImageUri(item.images[0])! }}
          style={styles.postImage}
        />
      )}

      <View style={styles.postFooter}>
        {item.status === 'published' && item.publishedAt && (
          <Text style={styles.dateText}>Published: {formatDateTime(item.publishedAt)}</Text>
        )}
        {item.status === 'scheduled' && item.scheduledAt && (
          <Text style={styles.dateText}>Scheduled: {formatDateTime(item.scheduledAt)}</Text>
        )}
        {item.status === 'draft' && (
          <Text style={styles.dateText}>Created: {formatDateTime(item.createdAt)}</Text>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <ScreenWrapper scrollable={false} padding={false}>
      <Header
        title="Social Media"
        subtitle={`${mockSocialMediaPosts.length} posts`}
        showDrawer
      />

      <FlatList
        data={mockSocialMediaPosts}
        renderItem={renderPost}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshing={refreshing}
        onRefresh={onRefresh}
        ListEmptyComponent={
          <Empty
            icon="share-variant-outline"
            title="No posts found"
            description="Create your first social media post"
            actionLabel="Create Post"
            onAction={handleCreatePost}
          />
        }
      />

      <SafeAreaFAB icon="plus" onPress={handleCreatePost} />
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  listContent: {
    padding: spacing[4],
    paddingBottom: spacing[20],
  },
  postCard: {
    backgroundColor: colors.surface.default,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    marginBottom: spacing[3],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  platforms: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  platformIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.neutral[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  postTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing[2],
  },
  postContent: {
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 20,
    marginBottom: spacing[3],
  },
  postImage: {
    width: '100%',
    height: 180,
    borderRadius: borderRadius.md,
    backgroundColor: colors.neutral[100],
    marginBottom: spacing[3],
  },
  postFooter: {
    borderTopWidth: 1,
    borderTopColor: colors.border.default,
    paddingTop: spacing[3],
  },
  dateText: {
    fontSize: 12,
    color: colors.text.tertiary,
  },
});
