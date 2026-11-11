import React from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { ScreenWrapper, Header } from '@/components/layout';
import { Avatar } from '@/components/common';
import { useTheme } from '@/theme';
import { spacing, borderRadius } from '@/theme/spacing';
import { useAuthStore, useAppStore } from '@/store';
import { APP_CONFIG } from '@/config/app';
import type { SettingsStackParamList } from '@/types/navigation';

type NavigationProp = NativeStackNavigationProp<SettingsStackParamList, 'SettingsMain'>;

const settingsGroups = [
  {
    title: 'Account',
    items: [
      { id: 'profile', label: 'My Profile', icon: 'account-circle', screen: 'Profile' },
      { id: 'security', label: 'Security', icon: 'shield-lock', screen: 'Security' },
      { id: 'notifications', label: 'Notifications', icon: 'bell', screen: 'Notifications' },
    ],
  },
  {
    title: 'Business',
    items: [
      { id: 'payment', label: 'Payment Methods', icon: 'credit-card', screen: 'PaymentMethods' },
      { id: 'tax', label: 'Tax Settings', icon: 'receipt', screen: 'TaxSettings' },
      { id: 'invoice', label: 'Invoice Settings', icon: 'file-document', screen: 'InvoiceSettings' },
    ],
  },
  {
    title: 'App',
    items: [
      { id: 'theme', label: 'Appearance', icon: 'palette', screen: 'Appearance' },
      { id: 'language', label: 'Language', icon: 'translate', screen: 'Language' },
      { id: 'sync', label: 'Sync Settings', icon: 'sync', screen: 'SyncSettings' },
    ],
  },
  {
    title: 'Support',
    items: [
      { id: 'help', label: 'Help Center', icon: 'help-circle', screen: 'Help' },
      { id: 'feedback', label: 'Send Feedback', icon: 'message-text', screen: 'Feedback' },
      { id: 'about', label: 'About', icon: 'information', screen: 'About' },
    ],
  },
];

export const SettingsMainScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { colors } = useTheme();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const isDarkMode = useAppStore((s) => s.isDarkMode);
  const toggleDarkMode = useAppStore((s) => s.toggleDarkMode);

  const handleSettingPress = (screen: string) => {
    if (screen === 'Notifications') {
      navigation.navigate('Notifications');
    }
    // Add navigation for other screens as needed
  };

  const renderSettingItem = (item: typeof settingsGroups[0]['items'][0]) => (
    <TouchableOpacity
      key={item.id}
      style={[styles.settingItem, { borderBottomColor: colors.border.default }]}
      onPress={() => handleSettingPress(item.screen)}
      activeOpacity={0.7}
    >
      <View style={[styles.settingIcon, { backgroundColor: colors.primary.light + '20' }]}>
        <Icon name={item.icon} size={22} color={colors.primary.main} />
      </View>
      <Text style={[styles.settingLabel, { color: colors.text.primary }]}>{item.label}</Text>
      <Icon name="chevron-right" size={24} color={colors.neutral[400]} />
    </TouchableOpacity>
  );

  return (
    <ScreenWrapper scrollable padding={false}>
      <Header title="Settings" showDrawer />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* User Profile Card */}
        <TouchableOpacity
          style={[styles.profileCard, { backgroundColor: colors.surface.default }]}
          activeOpacity={0.7}
        >
          <Avatar name={user?.name || 'User'} size="large" />
          <View style={styles.profileInfo}>
            <Text style={[styles.profileName, { color: colors.text.primary }]}>
              {user?.name || 'User'}
            </Text>
            <Text style={[styles.profileEmail, { color: colors.text.secondary }]}>
              {user?.email || 'email@example.com'}
            </Text>
            <Text style={[styles.profileRole, { color: colors.primary.main }]}>
              {user?.role?.name || 'Staff'}
            </Text>
          </View>
          <Icon name="chevron-right" size={24} color={colors.neutral[400]} />
        </TouchableOpacity>

        {/* Settings Groups */}
        {settingsGroups.map((group) => (
          <View key={group.title} style={styles.settingsGroup}>
            <Text style={[styles.groupTitle, { color: colors.text.tertiary }]}>{group.title}</Text>
            <View style={[styles.groupItems, { backgroundColor: colors.surface.default }]}>
              {group.items.map(renderSettingItem)}
            </View>
          </View>
        ))}

        {/* Dark Mode Toggle */}
        <View style={styles.settingsGroup}>
          <Text style={[styles.groupTitle, { color: colors.text.tertiary }]}>Preferences</Text>
          <View style={[styles.groupItems, { backgroundColor: colors.surface.default }]}>
            <View style={[styles.settingItem, { borderBottomColor: colors.border.default }]}>
              <View style={[styles.settingIcon, { backgroundColor: colors.primary.light + '20' }]}>
                <Icon name="theme-light-dark" size={22} color={colors.primary.main} />
              </View>
              <Text style={[styles.settingLabel, { color: colors.text.primary }]}>Dark Mode</Text>
              <Switch
                value={isDarkMode}
                onValueChange={toggleDarkMode}
                trackColor={{ false: colors.neutral[300], true: colors.primary.light }}
                thumbColor={isDarkMode ? colors.primary.main : colors.neutral[0]}
              />
            </View>
          </View>
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          style={[styles.logoutButton, { backgroundColor: colors.error.light + '20' }]}
          onPress={logout}
        >
          <Icon name="logout" size={22} color={colors.error.main} />
          <Text style={[styles.logoutText, { color: colors.error.main }]}>Logout</Text>
        </TouchableOpacity>

        {/* Version Info */}
        <View style={styles.versionInfo}>
          <Text style={[styles.versionText, { color: colors.text.tertiary }]}>
            {APP_CONFIG.name} v{APP_CONFIG.version}
          </Text>
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  content: {
    padding: spacing[4],
    paddingBottom: spacing[8],
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    marginBottom: spacing[4],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  profileInfo: {
    flex: 1,
    marginLeft: spacing[3],
  },
  profileName: {
    fontSize: 18,
    fontWeight: '600',
  },
  profileEmail: {
    fontSize: 14,
    marginTop: 2,
  },
  profileRole: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
  settingsGroup: {
    marginBottom: spacing[4],
  },
  groupTitle: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing[2],
    paddingLeft: spacing[2],
  },
  groupItems: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[4],
    borderBottomWidth: 1,
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing[3],
  },
  settingLabel: {
    flex: 1,
    fontSize: 15,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    marginTop: spacing[4],
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: spacing[2],
  },
  versionInfo: {
    alignItems: 'center',
    marginTop: spacing[6],
  },
  versionText: {
    fontSize: 12,
  },
});
