import React, { useState } from 'react';
import {
  StyleSheet, View, ScrollView, Alert, ActivityIndicator,
  TouchableOpacity, Modal,
} from 'react-native';
import { Button, Text, FAB } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { Header } from '@/components/layout/Header';
import { FormInput, FormSelect } from '@/components/forms';
import { useTheme } from '@/theme';
import { spacing, borderRadius } from '@/theme/spacing';
import { settingsApi } from '@/services/api';

/* ── Platform config ────────────────────────────────────── */

const PLATFORM_ICONS: Record<string, string> = {
  facebook: 'facebook',
  twitter: 'twitter',
  instagram: 'instagram',
  linkedin: 'linkedin',
  youtube: 'youtube',
  whatsapp: 'whatsapp',
  telegram: 'send',
  github: 'github',
  website: 'web',
  maps: 'map-marker',
  phone: 'phone',
};

const PLATFORM_OPTIONS = [
  { label: 'Facebook', value: 'facebook' },
  { label: 'Twitter / X', value: 'twitter' },
  { label: 'Instagram', value: 'instagram' },
  { label: 'LinkedIn', value: 'linkedin' },
  { label: 'YouTube', value: 'youtube' },
  { label: 'Telegram', value: 'telegram' },
  { label: 'GitHub', value: 'github' },
  { label: 'Website', value: 'website' },
];

interface SocialLink {
  id: number;
  platform: string;
  url: string;
  active: boolean;
}

interface AddLinkFormData {
  platform: string;
  url: string;
}

/* ── Add Link Modal ─────────────────────────────────────── */

interface AddLinkModalProps {
  visible: boolean;
  onClose: () => void;
  onAdd: (data: AddLinkFormData) => void;
  isAdding: boolean;
  colors: any;
}

const AddLinkModal: React.FC<AddLinkModalProps> = ({
  visible,
  onClose,
  onAdd,
  isAdding,
  colors,
}) => {
  const { control, handleSubmit, reset } = useForm<AddLinkFormData>({
    defaultValues: { platform: '', url: '' },
  });

  const onSubmit = (data: AddLinkFormData) => {
    if (!data.platform) {
      Alert.alert('Validation', 'Please select a platform');
      return;
    }
    if (!data.url.trim()) {
      Alert.alert('Validation', 'Please enter a URL');
      return;
    }
    onAdd(data);
    reset();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity
          style={[styles.modalContent, { backgroundColor: colors.surface.default }]}
          activeOpacity={1}
        >
          <View style={[styles.modalHeader, { borderBottomColor: colors.border.default }]}>
            <Text style={[styles.modalTitle, { color: colors.text.primary }]}>
              Add Social Link
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Icon name="close" size={24} color={colors.neutral[700]} />
            </TouchableOpacity>
          </View>

          <View style={styles.modalBody}>
            <FormSelect
              name="platform"
              control={control}
              label="Platform"
              options={PLATFORM_OPTIONS}
              placeholder="Select a platform"
            />

            <FormInput
              name="url"
              control={control}
              label="URL"
              placeholder="https://..."
              keyboardType="default"
              autoCapitalize="none"
              leftIcon="link"
            />

            <Button
              mode="contained"
              onPress={handleSubmit(onSubmit)}
              style={[styles.addButton, { backgroundColor: colors.primary.main }]}
              loading={isAdding}
              disabled={isAdding}
            >
              Add Link
            </Button>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

/* ── Link Row ───────────────────────────────────────────── */

interface LinkRowProps {
  link: SocialLink;
  onToggle: (id: number) => void;
  onDelete: (id: number) => void;
  colors: any;
}

const LinkRow: React.FC<LinkRowProps> = ({ link, onToggle, onDelete, colors }) => {
  const iconName = PLATFORM_ICONS[link.platform] || 'link';
  const platformLabel =
    PLATFORM_OPTIONS.find((o) => o.value === link.platform)?.label || link.platform;

  return (
    <View
      style={[
        styles.linkRow,
        { backgroundColor: colors.surface.default, borderColor: colors.border.default },
      ]}
    >
      <View style={styles.linkIcon}>
        <Icon
          name={iconName}
          size={24}
          color={link.active ? colors.primary.main : colors.neutral[400]}
        />
      </View>

      <View style={styles.linkInfo}>
        <Text style={[styles.linkPlatform, { color: colors.text.primary }]}>{platformLabel}</Text>
        <Text
          style={[styles.linkUrl, { color: colors.text.secondary }]}
          numberOfLines={1}
          ellipsizeMode="middle"
        >
          {link.url}
        </Text>
      </View>

      <TouchableOpacity
        style={styles.toggleButton}
        onPress={() => onToggle(link.id)}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Icon
          name={link.active ? 'toggle-switch' : 'toggle-switch-off-outline'}
          size={36}
          color={link.active ? colors.primary.main : colors.neutral[400]}
        />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => {
          Alert.alert('Delete Link', `Remove ${platformLabel}?`, [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: () => onDelete(link.id) },
          ]);
        }}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Icon name="trash-can-outline" size={22} color={colors.error.main} />
      </TouchableOpacity>
    </View>
  );
};

/* ── Main screen ────────────────────────────────────────── */

export const SocialLinksScreen: React.FC = () => {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const [modalVisible, setModalVisible] = useState(false);

  const { data: links = [], isLoading } = useQuery<SocialLink[]>({
    queryKey: ['socialLinks'],
    queryFn: settingsApi.getSocialLinks,
  });

  const createMutation = useMutation({
    mutationFn: (data: { platform: string; url: string }) => settingsApi.createSocialLink(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['socialLinks'] });
      setModalVisible(false);
      Alert.alert('Success', 'Social link added');
    },
    onError: (e: any) => Alert.alert('Error', e?.message || 'Failed to add social link'),
  });

  const toggleMutation = useMutation({
    mutationFn: (id: number) => settingsApi.toggleSocialLink(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['socialLinks'] });
    },
    onError: (e: any) => Alert.alert('Error', e?.message || 'Failed to toggle social link'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => settingsApi.deleteSocialLink(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['socialLinks'] });
      Alert.alert('Success', 'Social link removed');
    },
    onError: (e: any) => Alert.alert('Error', e?.message || 'Failed to delete social link'),
  });

  if (isLoading) {
    return (
      <ScreenWrapper>
        <Header title="Social Links" showBack />
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={colors.primary.main} />
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper scrollable={false}>
      <Header title="Social Links" showBack />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingBottom: spacing[8] + insets.bottom + 80 }]}
        showsVerticalScrollIndicator={false}
      >
        {links.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="link-off" size={48} color={colors.neutral[400]} />
            <Text style={[styles.emptyText, { color: colors.text.secondary }]}>
              No social links added yet
            </Text>
            <Text style={[styles.emptyHint, { color: colors.text.tertiary }]}>
              Tap the + button to add your first link
            </Text>
          </View>
        ) : (
          links.map((link: SocialLink) => (
            <LinkRow
              key={link.id}
              link={link}
              onToggle={(id) => toggleMutation.mutate(id)}
              onDelete={(id) => deleteMutation.mutate(id)}
              colors={colors}
            />
          ))
        )}
      </ScrollView>

      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: colors.primary.main, bottom: insets.bottom + 16 }]}
        color="#fff"
        onPress={() => setModalVisible(true)}
      />

      <AddLinkModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onAdd={(data) => createMutation.mutate(data)}
        isAdding={createMutation.isPending}
        colors={colors}
      />
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  scrollView: { flex: 1 },
  content: { padding: spacing[4] },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  /* Link row */
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.lg,
    padding: spacing[3],
    marginBottom: spacing[3],
    borderWidth: 1,
  },
  linkIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  linkInfo: {
    flex: 1,
    marginLeft: spacing[3],
    marginRight: spacing[2],
  },
  linkPlatform: {
    fontSize: 15,
    fontWeight: '500',
  },
  linkUrl: {
    fontSize: 13,
    marginTop: 2,
  },
  toggleButton: {
    marginRight: spacing[2],
  },
  deleteButton: {
    padding: spacing[1],
  },

  /* Empty state */
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[12],
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
    marginTop: spacing[3],
  },
  emptyHint: {
    fontSize: 14,
    marginTop: spacing[1],
  },

  /* FAB */
  fab: {
    position: 'absolute',
    right: 16,
  },

  /* Modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing[4],
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalBody: {
    padding: spacing[4],
  },
  addButton: {
    marginTop: spacing[2],
  },
});
