import React, { useState } from 'react';
import { StyleSheet, View, ScrollView, Image, Alert, Dimensions } from 'react-native';
import { Text, Button, Chip } from 'react-native-paper';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { Header } from '@/components/layout/Header';
import { Badge } from '@/components/common/Badge';
import { Card } from '@/components/common/Card';
import { ConfirmationModal } from '@/components/common/ConfirmationModal';
import { useTheme } from '@/theme';
import { spacing, borderRadius } from '@/theme/spacing';
import { mockSocialMediaPosts } from '@/data/mock';
import { formatDateTime } from '@/utils';
import { delay } from '@/utils/helpers';
import type { SocialMediaStackParamList } from '@/types/navigation';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type NavigationProp = NativeStackNavigationProp<SocialMediaStackParamList, 'SocialMediaDetail'>;
type RouteProps = RouteProp<SocialMediaStackParamList, 'SocialMediaDetail'>;

const platformIcons: Record<string, { icon: string; color: string; name: string }> = {
  facebook: { icon: 'facebook', color: '#1877F2', name: 'Facebook' },
  instagram: { icon: 'instagram', color: '#E4405F', name: 'Instagram' },
  twitter: { icon: 'twitter', color: '#1DA1F2', name: 'Twitter' },
};

interface DetailRowProps {
  label: string;
  value: string | React.ReactNode;
  icon?: string;
}

const DetailRow: React.FC<DetailRowProps> = ({ label, value, icon }) => {
  const { colors } = useTheme();

  return (
    <View style={styles.detailRow}>
      {icon && (
        <Icon name={icon} size={20} color={colors.neutral[400]} style={styles.detailIcon} />
      )}
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

export const SocialMediaDetailScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const postId = route.params.id;
  const post = mockSocialMediaPosts.find((p) => p.id === postId);

  if (!post) {
    return (
      <ScreenWrapper>
        <Header title="Post Not Found" showBack />
        <View style={styles.notFound}>
          <Icon name="alert-circle-outline" size={64} color={colors.neutral[300]} />
          <Text style={[styles.notFoundText, { color: colors.text.secondary }]}>
            Post not found
          </Text>
        </View>
      </ScreenWrapper>
    );
  }

  const getStatusVariant = (status: typeof post.status) => {
    switch (status) {
      case 'published':
        return 'success';
      case 'scheduled':
        return 'info';
      default:
        return 'default';
    }
  };

  const handleEdit = () => {
    navigation.navigate('SocialMediaForm', { id: post.id });
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await delay(1000);
      console.log('Deleting post:', post.id);
      setDeleteModalVisible(false);
      navigation.goBack();
    } catch (error) {
      console.error('Failed to delete post:', error);
      Alert.alert('Error', 'Failed to delete post');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <ScreenWrapper scrollable={false}>
      <Header
        title="Post Details"
        showBack
        actions={[
          {
            icon: 'pencil',
            onPress: handleEdit,
          },
          {
            icon: 'delete',
            onPress: () => setDeleteModalVisible(true),
          },
        ]}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingBottom: spacing[8] + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Post Images */}
        {post.images.length > 0 && (
          <View style={styles.imageContainer}>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e) => {
                const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
                setCurrentImageIndex(index);
              }}
            >
              {post.images.map((image, index) => (
                <Image
                  key={index}
                  source={{ uri: image }}
                  style={styles.postImage}
                  resizeMode="cover"
                />
              ))}
            </ScrollView>
            {post.images.length > 1 && (
              <View style={styles.imagePagination}>
                {post.images.map((_, index) => (
                  <View
                    key={index}
                    style={[
                      styles.paginationDot,
                      {
                        backgroundColor:
                          index === currentImageIndex
                            ? colors.primary.main
                            : colors.neutral[300],
                      },
                    ]}
                  />
                ))}
              </View>
            )}
          </View>
        )}

        {/* Post Header */}
        <View style={[styles.headerCard, { backgroundColor: colors.surface.default }]}>
          <View style={styles.headerTop}>
            <Badge variant={getStatusVariant(post.status)} size="small">
              {post.status.charAt(0).toUpperCase() + post.status.slice(1)}
            </Badge>
          </View>

          <Text style={[styles.postTitle, { color: colors.text.primary }]}>
            {post.title}
          </Text>
        </View>

        {/* Platforms Section */}
        <View style={[styles.section, { backgroundColor: colors.surface.default }]}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
            Platforms
          </Text>

          <View style={styles.platformsContainer}>
            {post.platforms.map((platform) => (
              <View
                key={platform}
                style={[styles.platformChip, { backgroundColor: platformIcons[platform].color + '15' }]}
              >
                <Icon
                  name={platformIcons[platform].icon}
                  size={20}
                  color={platformIcons[platform].color}
                />
                <Text style={[styles.platformName, { color: platformIcons[platform].color }]}>
                  {platformIcons[platform].name}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Content Section */}
        <View style={[styles.section, { backgroundColor: colors.surface.default }]}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
            Content
          </Text>
          <Text style={[styles.postContent, { color: colors.text.secondary }]}>
            {post.content}
          </Text>
        </View>

        {/* Schedule / Publish Info */}
        <View style={[styles.section, { backgroundColor: colors.surface.default }]}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
            Schedule Information
          </Text>

          {post.status === 'published' && post.publishedAt && (
            <DetailRow
              label="Published At"
              value={formatDateTime(post.publishedAt)}
              icon="check-circle-outline"
            />
          )}

          {post.status === 'scheduled' && post.scheduledAt && (
            <DetailRow
              label="Scheduled For"
              value={formatDateTime(post.scheduledAt)}
              icon="clock-outline"
            />
          )}

          {post.status === 'draft' && (
            <View style={styles.draftInfo}>
              <Icon name="file-edit-outline" size={24} color={colors.neutral[400]} />
              <Text style={[styles.draftText, { color: colors.text.secondary }]}>
                This post is saved as a draft
              </Text>
            </View>
          )}
        </View>

        {/* Timestamps */}
        <View style={[styles.section, { backgroundColor: colors.surface.default }]}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
            Timestamps
          </Text>

          <DetailRow
            label="Created At"
            value={formatDateTime(post.createdAt)}
            icon="calendar-plus"
          />

          <DetailRow
            label="Updated At"
            value={formatDateTime(post.updatedAt)}
            icon="calendar-edit"
          />
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <Button
            mode="outlined"
            onPress={handleEdit}
            style={styles.editButton}
            icon="pencil"
            labelStyle={{ color: colors.primary.main }}
          >
            Edit Post
          </Button>

          <Button
            mode="outlined"
            onPress={() => setDeleteModalVisible(true)}
            style={[styles.deleteButton, { borderColor: colors.error.main }]}
            icon="delete"
            labelStyle={{ color: colors.error.main }}
          >
            Delete Post
          </Button>
        </View>
      </ScrollView>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        visible={deleteModalVisible}
        title="Delete Post"
        message={`Are you sure you want to delete "${post.title}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        confirmVariant="danger"
        icon="delete-alert"
        onConfirm={handleDelete}
        onCancel={() => setDeleteModalVisible(false)}
        loading={isDeleting}
      />
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  content: {},
  imageContainer: {
    position: 'relative',
  },
  postImage: {
    width: SCREEN_WIDTH,
    height: 250,
  },
  imagePagination: {
    position: 'absolute',
    bottom: spacing[3],
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing[2],
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  headerCard: {
    padding: spacing[4],
    marginHorizontal: spacing[4],
    marginTop: spacing[4],
    borderRadius: borderRadius.lg,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  postTitle: {
    fontSize: 22,
    fontWeight: '600',
  },
  section: {
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    marginHorizontal: spacing[4],
    marginTop: spacing[4],
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: spacing[4],
  },
  platformsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  platformChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.full,
    gap: spacing[2],
  },
  platformName: {
    fontSize: 14,
    fontWeight: '500',
  },
  postContent: {
    fontSize: 15,
    lineHeight: 24,
  },
  draftInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingVertical: spacing[2],
  },
  draftText: {
    fontSize: 14,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: spacing[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
  },
  detailIcon: {
    marginRight: spacing[3],
    marginTop: 2,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    marginBottom: spacing[1],
  },
  detailValue: {
    fontSize: 15,
  },
  actionButtons: {
    gap: spacing[3],
    marginTop: spacing[4],
    marginHorizontal: spacing[4],
  },
  editButton: {
    borderRadius: borderRadius.md,
  },
  deleteButton: {
    borderRadius: borderRadius.md,
  },
  notFound: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notFoundText: {
    fontSize: 16,
    marginTop: spacing[4],
  },
});
