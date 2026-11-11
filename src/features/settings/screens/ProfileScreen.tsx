import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { Header } from '@/components/layout/Header';
import { Avatar } from '@/components/common';
import { useTheme } from '@/theme';
import { spacing, borderRadius } from '@/theme/spacing';
import { useAuthStore } from '@/store';
import { settingsApi } from '@/services/api';
import type { SettingsStackParamList } from '@/types/navigation';

type Nav = NativeStackNavigationProp<SettingsStackParamList, 'Profile'>;

const DetailRow = ({ icon, label, value }: { icon: string; label: string; value?: string | null }) => {
  const { colors } = useTheme();
  return (
    <View style={[styles.detailRow, { borderBottomColor: colors.border.default }]}>
      <View style={[styles.detailIcon, { backgroundColor: colors.primary.light + '20' }]}>
        <Icon name={icon} size={20} color={colors.primary.main} />
      </View>
      <View style={styles.detailContent}>
        <Text style={[styles.detailLabel, { color: colors.text.tertiary }]}>{label}</Text>
        <Text style={[styles.detailValue, { color: colors.text.primary }]}>{value || '—'}</Text>
      </View>
    </View>
  );
};

export const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const { colors } = useTheme();
  const user = useAuthStore((s) => s.user);

  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: settingsApi.getProfile,
  });

  const displayData = profile || user;

  return (
    <ScreenWrapper scrollable padding={false}>
      <Header
        title="My Profile"
        showBack
        actions={[{ icon: 'pencil', onPress: () => navigation.navigate('ProfileEdit') }]}
      />

      <View style={styles.content}>
        {/* Avatar Card */}
        <View style={[styles.avatarCard, { backgroundColor: colors.surface.default }]}>
          <Avatar name={displayData?.name || 'User'} size="xlarge" />
          <Text style={[styles.userName, { color: colors.text.primary }]}>
            {displayData?.name || 'User'}
          </Text>
          <Text style={[styles.userRole, { color: colors.primary.main }]}>
            {user?.role?.name || 'Staff'}
          </Text>
        </View>

        {/* Info Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text.tertiary }]}>
            Personal Information
          </Text>
          <View style={[styles.sectionCard, { backgroundColor: colors.surface.default }]}>
            <DetailRow icon="email-outline" label="Email" value={displayData?.email} />
            <DetailRow icon="phone-outline" label="Phone" value={displayData?.phone} />
          </View>
        </View>

        {/* Account Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text.tertiary }]}>Account</Text>
          <View style={[styles.sectionCard, { backgroundColor: colors.surface.default }]}>
            <DetailRow
              icon="calendar-outline"
              label="Member Since"
              value={user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : undefined}
            />
            <DetailRow icon="shield-check-outline" label="Role" value={user?.role?.name} />
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text.tertiary }]}>Quick Actions</Text>
          <View style={[styles.sectionCard, { backgroundColor: colors.surface.default }]}>
            <TouchableOpacity
              style={[styles.actionRow, { borderBottomColor: colors.border.default }]}
              onPress={() => navigation.navigate('ProfileEdit')}
            >
              <View style={[styles.detailIcon, { backgroundColor: colors.primary.light + '20' }]}>
                <Icon name="account-edit-outline" size={20} color={colors.primary.main} />
              </View>
              <Text style={[styles.actionLabel, { color: colors.text.primary }]}>Edit Profile</Text>
              <Icon name="chevron-right" size={22} color={colors.neutral[400]} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionRow, { borderBottomColor: colors.border.default }]}
              onPress={() => navigation.navigate('ChangePassword')}
            >
              <View style={[styles.detailIcon, { backgroundColor: colors.primary.light + '20' }]}>
                <Icon name="lock-outline" size={20} color={colors.primary.main} />
              </View>
              <Text style={[styles.actionLabel, { color: colors.text.primary }]}>
                Change Password
              </Text>
              <Icon name="chevron-right" size={22} color={colors.neutral[400]} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  content: {
    padding: spacing[4],
    paddingBottom: spacing[8],
  },
  avatarCard: {
    alignItems: 'center',
    borderRadius: borderRadius.lg,
    padding: spacing[6],
    marginBottom: spacing[4],
  },
  userName: {
    fontSize: 22,
    fontWeight: '700',
    marginTop: spacing[3],
  },
  userRole: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: spacing[1],
  },
  section: {
    marginBottom: spacing[4],
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing[2],
    paddingLeft: spacing[2],
  },
  sectionCard: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[4],
    borderBottomWidth: 1,
  },
  detailIcon: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing[3],
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '500',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[4],
    borderBottomWidth: 1,
  },
  actionLabel: {
    flex: 1,
    fontSize: 15,
  },
});
