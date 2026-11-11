import React, { useEffect, useState } from 'react';
import { StyleSheet, View, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { useQueryClient } from '@tanstack/react-query';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { Header } from '@/components/layout/Header';
import { FormInput, FormImagePicker } from '@/components/forms';
import { useTheme } from '@/theme';
import { spacing, borderRadius } from '@/theme/spacing';
import { mockSocialMediaPosts } from '@/data/mock';
import type { SocialMediaStackParamList } from '@/types/navigation';

type NavigationProp = NativeStackNavigationProp<SocialMediaStackParamList, 'SocialMediaForm'>;
type RouteProps = RouteProp<SocialMediaStackParamList, 'SocialMediaForm'>;

type PlatformType = 'facebook' | 'instagram' | 'twitter';
type StatusType = 'draft' | 'scheduled' | 'published';

interface SocialMediaFormData {
  title: string;
  content: string;
  images: string[];
  platforms: PlatformType[];
  status: StatusType;
  scheduledDate: string;
  scheduledTime: string;
}

const platformOptions: { value: PlatformType; label: string; icon: string; color: string }[] = [
  { value: 'facebook', label: 'Facebook', icon: 'facebook', color: '#1877F2' },
  { value: 'instagram', label: 'Instagram', icon: 'instagram', color: '#E4405F' },
  { value: 'twitter', label: 'Twitter', icon: 'twitter', color: '#1DA1F2' },
];

const statusOptions: { value: StatusType; label: string; icon: string }[] = [
  { value: 'draft', label: 'Draft', icon: 'file-edit-outline' },
  { value: 'scheduled', label: 'Scheduled', icon: 'clock-outline' },
  { value: 'published', label: 'Published', icon: 'check-circle-outline' },
];

export const SocialMediaFormScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const qc = useQueryClient();

  const postId = route.params?.id;
  const isEdit = !!postId;
  const existingPost = isEdit
    ? mockSocialMediaPosts.find((p) => p.id === postId)
    : undefined;

  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
  } = useForm<SocialMediaFormData>({
    defaultValues: {
      title: '',
      content: '',
      images: [],
      platforms: [],
      status: 'draft',
      scheduledDate: '',
      scheduledTime: '',
    },
  });

  const watchStatus = watch('status');
  const watchPlatforms = watch('platforms');

  useEffect(() => {
    if (existingPost) {
      const scheduledDate = existingPost.scheduledAt
        ? new Date(existingPost.scheduledAt).toISOString().split('T')[0]
        : '';
      const scheduledTime = existingPost.scheduledAt
        ? new Date(existingPost.scheduledAt).toTimeString().slice(0, 5)
        : '';

      reset({
        title: existingPost.title,
        content: existingPost.content,
        images: existingPost.images,
        platforms: existingPost.platforms,
        status: existingPost.status,
        scheduledDate,
        scheduledTime,
      });
    }
  }, [existingPost, reset]);

  const togglePlatform = (platform: PlatformType) => {
    const currentPlatforms = watchPlatforms || [];
    if (currentPlatforms.includes(platform)) {
      setValue('platforms', currentPlatforms.filter((p) => p !== platform));
    } else {
      setValue('platforms', [...currentPlatforms, platform]);
    }
  };

  const onSubmit = async (data: SocialMediaFormData) => {
    if (data.platforms.length === 0) {
      return;
    }

    setIsSubmitting(true);
    try {
      await new Promise<void>((resolve) => setTimeout(resolve, 1000));
      const scheduledAt = data.scheduledDate && data.scheduledTime
        ? new Date(`${data.scheduledDate}T${data.scheduledTime}`).toISOString()
        : undefined;
      console.log('Social media post data:', { ...data, scheduledAt });
      qc.invalidateQueries({ queryKey: ['socialMedia'] });
      qc.invalidateQueries({ queryKey: ['social-media'] });
      navigation.goBack();
    } catch (error) {
      console.error('Failed to save post:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScreenWrapper scrollable={false}>
      <Header
        title={isEdit ? 'Edit Post' : 'Create Post'}
        showBack
      />

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.content, { paddingBottom: spacing[8] + insets.bottom }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Basic Info */}
          <View style={[styles.section, { backgroundColor: colors.surface.default }]}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
              Post Details
            </Text>

            <FormInput
              name="title"
              control={control}
              label="Title *"
              placeholder="Enter post title"
            />

            <FormInput
              name="content"
              control={control}
              label="Content *"
              placeholder="Write your post content..."
              multiline
              numberOfLines={6}
            />
          </View>

          {/* Images */}
          <View style={[styles.section, { backgroundColor: colors.surface.default }]}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
              Images
            </Text>

            <FormImagePicker
              name="images"
              control={control}
              label="Post Images"
            />
          </View>

          {/* Platform Selection */}
          <View style={[styles.section, { backgroundColor: colors.surface.default }]}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
              Platforms *
            </Text>
            <Text style={[styles.sectionHint, { color: colors.text.secondary }]}>
              Select platforms to publish to
            </Text>

            <View style={styles.platformsGrid}>
              {platformOptions.map((platform) => {
                const isSelected = watchPlatforms?.includes(platform.value);
                return (
                  <TouchableOpacity
                    key={platform.value}
                    style={[
                      styles.platformOption,
                      {
                        backgroundColor: isSelected
                          ? platform.color + '15'
                          : colors.surface.variant,
                        borderColor: isSelected ? platform.color : colors.border.default,
                      },
                    ]}
                    onPress={() => togglePlatform(platform.value)}
                    activeOpacity={0.7}
                  >
                    <Icon
                      name={platform.icon}
                      size={28}
                      color={isSelected ? platform.color : colors.neutral[400]}
                    />
                    <Text
                      style={[
                        styles.platformLabel,
                        { color: isSelected ? platform.color : colors.text.secondary },
                      ]}
                    >
                      {platform.label}
                    </Text>
                    {isSelected && (
                      <View style={[styles.checkmark, { backgroundColor: platform.color }]}>
                        <Icon name="check" size={12} color={colors.neutral[0]} />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
            {watchPlatforms?.length === 0 && (
              <Text style={[styles.errorText, { color: colors.error.main }]}>
                Please select at least one platform
              </Text>
            )}
          </View>

          {/* Status Selection */}
          <View style={[styles.section, { backgroundColor: colors.surface.default }]}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
              Status
            </Text>

            <Controller
              name="status"
              control={control}
              render={({ field: { onChange, value } }) => (
                <View style={styles.statusGrid}>
                  {statusOptions.map((status) => {
                    const isSelected = value === status.value;
                    return (
                      <TouchableOpacity
                        key={status.value}
                        style={[
                          styles.statusOption,
                          {
                            backgroundColor: isSelected
                              ? colors.primary.main + '15'
                              : colors.surface.variant,
                            borderColor: isSelected ? colors.primary.main : colors.border.default,
                          },
                        ]}
                        onPress={() => onChange(status.value)}
                        activeOpacity={0.7}
                      >
                        <Icon
                          name={status.icon}
                          size={24}
                          color={isSelected ? colors.primary.main : colors.neutral[400]}
                        />
                        <Text
                          style={[
                            styles.statusLabel,
                            { color: isSelected ? colors.primary.main : colors.text.secondary },
                          ]}
                        >
                          {status.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            />
          </View>

          {/* Schedule Date/Time (only for scheduled status) */}
          {watchStatus === 'scheduled' && (
            <View style={[styles.section, { backgroundColor: colors.surface.default }]}>
              <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
                Schedule
              </Text>

              <View style={styles.scheduleRow}>
                <View style={styles.scheduleField}>
                  <FormInput
                    name="scheduledDate"
                    control={control}
                    label="Date"
                    placeholder="YYYY-MM-DD"
                  />
                </View>
                <View style={styles.scheduleField}>
                  <FormInput
                    name="scheduledTime"
                    control={control}
                    label="Time"
                    placeholder="HH:MM"
                  />
                </View>
              </View>
            </View>
          )}

          {/* Submit Button */}
          <View style={styles.buttonContainer}>
            <Button
              mode="outlined"
              onPress={() => navigation.goBack()}
              style={styles.cancelButton}
              labelStyle={{ color: colors.text.primary }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={handleSubmit(onSubmit)}
              style={[styles.submitButton, { backgroundColor: colors.primary.main }]}
              loading={isSubmitting}
              disabled={isSubmitting || watchPlatforms?.length === 0}
            >
              {isEdit ? 'Update Post' : 'Create Post'}
            </Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing[4],
  },
  section: {
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    marginBottom: spacing[4],
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: spacing[2],
  },
  sectionHint: {
    fontSize: 13,
    marginBottom: spacing[3],
  },
  platformsGrid: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  platformOption: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing[4],
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    position: 'relative',
  },
  platformLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: spacing[2],
  },
  checkmark: {
    position: 'absolute',
    top: spacing[2],
    right: spacing[2],
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusGrid: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  statusOption: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing[3],
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
  },
  statusLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: spacing[1],
  },
  scheduleRow: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  scheduleField: {
    flex: 1,
  },
  errorText: {
    fontSize: 12,
    marginTop: spacing[2],
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: spacing[3],
    marginTop: spacing[2],
  },
  cancelButton: {
    flex: 1,
  },
  submitButton: {
    flex: 2,
  },
});
