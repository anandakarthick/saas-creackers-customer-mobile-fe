import React, { useEffect, useState, useCallback } from 'react';
import {
  StyleSheet, View, ScrollView, KeyboardAvoidingView, Platform, Alert,
  ActivityIndicator, TouchableOpacity, TextInput,
} from 'react-native';
import { Button, Text } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { Header } from '@/components/layout/Header';
import { useTheme } from '@/theme';
import { spacing, borderRadius } from '@/theme/spacing';
import { settingsApi } from '@/services/api';
import { useThemeStore } from '@/store/theme.store';
import { useAppStore } from '@/store';

const PRESET_COLORS = [
  '#e53935', '#D32F2F', '#C62828',
  '#E91E63', '#9C27B0', '#673AB7',
  '#3F51B5', '#2196F3', '#03A9F4',
  '#00BCD4', '#009688', '#4CAF50',
  '#8BC34A', '#FF9800', '#FF5722',
  '#795548', '#607D8B', '#000000',
];

interface ColorPickerProps {
  label: string;
  value: string;
  onChange: (color: string) => void;
  colors: any;
}

const ColorPicker: React.FC<ColorPickerProps> = ({ label, value, onChange, colors }) => {
  const [inputValue, setInputValue] = useState(value);

  useEffect(() => { setInputValue(value); }, [value]);

  const handleInputChange = (text: string) => {
    setInputValue(text);
    if (/^#[0-9a-fA-F]{6}$/.test(text)) {
      onChange(text);
    }
  };

  return (
    <View style={styles.colorPickerContainer}>
      <Text style={[styles.colorPickerLabel, { color: colors.text.primary }]}>{label}</Text>
      <View style={styles.colorPickerRow}>
        <View style={[styles.colorPreview, { backgroundColor: value, borderColor: colors.border.default }]} />
        <TextInput
          style={[styles.colorInput, { borderColor: colors.border.default, color: colors.text.primary, backgroundColor: colors.surface.variant }]}
          value={inputValue}
          onChangeText={handleInputChange}
          placeholder="#000000"
          placeholderTextColor={colors.text.tertiary}
          autoCapitalize="none"
          maxLength={7}
        />
      </View>
      <View style={styles.presetGrid}>
        {PRESET_COLORS.map((c) => (
          <TouchableOpacity
            key={c}
            style={[
              styles.presetColor,
              { backgroundColor: c },
              value.toLowerCase() === c.toLowerCase() && styles.presetColorSelected,
            ]}
            onPress={() => { onChange(c); setInputValue(c); }}
          />
        ))}
      </View>
    </View>
  );
};

export const ThemeAppearanceScreen: React.FC = () => {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const setThemeConfig = useThemeStore((s) => s.setThemeConfig);
  const setDarkMode = useAppStore((s) => s.setDarkMode);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [primaryColor, setPrimaryColor] = useState('#e53935');
  const [secondaryColor, setSecondaryColor] = useState('#d32f2f');
  const [sidebarColor, setSidebarColor] = useState('#FFFFFF');
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>('light');

  const { data: settings, isLoading } = useQuery({
    queryKey: ['adminSettings'],
    queryFn: settingsApi.getAdminSettings,
  });

  useEffect(() => {
    if (settings) {
      const s = (settings as any)?.settings || settings;
      const tc = s?.themeConfig || {};
      if (tc.primaryColor) setPrimaryColor(tc.primaryColor);
      if (tc.secondaryColor) setSecondaryColor(tc.secondaryColor);
      if (tc.sidebarColor) setSidebarColor(tc.sidebarColor);
      if (tc.themeMode) setThemeMode(tc.themeMode);
    }
  }, [settings]);

  // Live preview: update theme store when values change
  const applyPreview = useCallback(() => {
    setThemeConfig({
      primaryColor,
      secondaryColor,
      sidebarColor,
      themeMode,
    });
    setDarkMode(themeMode === 'dark');
  }, [primaryColor, secondaryColor, sidebarColor, themeMode, setThemeConfig, setDarkMode]);

  useEffect(() => { applyPreview(); }, [applyPreview]);

  const updateMutation = useMutation({
    mutationFn: () => {
      const s = (settings as any)?.settings || settings || {};
      return settingsApi.updateAdminSettings({
        settings: {
          ...s,
          themeConfig: { primaryColor, secondaryColor, sidebarColor, themeMode },
        },
      } as any);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['adminSettings'] });
      Alert.alert('Success', 'Theme settings saved');
      navigation.goBack();
    },
    onError: (e: any) => Alert.alert('Error', e?.message || 'Failed to save theme'),
  });

  const onSubmit = async () => {
    setIsSubmitting(true);
    try { await updateMutation.mutateAsync(); } finally { setIsSubmitting(false); }
  };

  if (isLoading) {
    return (
      <ScreenWrapper>
        <Header title="Theme & Appearance" showBack />
        <View style={styles.loader}><ActivityIndicator size="large" color={colors.primary.main} /></View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper scrollable={false}>
      <Header title="Theme & Appearance" showBack />
      <KeyboardAvoidingView style={styles.keyboardView} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={styles.scrollView} contentContainerStyle={[styles.content, { paddingBottom: spacing[8] + insets.bottom }]} showsVerticalScrollIndicator={false}>

          {/* Theme Mode */}
          <View style={[styles.section, { backgroundColor: colors.surface.default }]}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Theme Mode</Text>
            <View style={styles.modeRow}>
              <TouchableOpacity
                style={[
                  styles.modeCard,
                  { borderColor: colors.border.default, backgroundColor: '#FFFFFF' },
                  themeMode === 'light' && { borderColor: primaryColor, borderWidth: 3 },
                ]}
                onPress={() => setThemeMode('light')}
              >
                <Icon name="white-balance-sunny" size={28} color="#F59E0B" />
                <Text style={[styles.modeLabel, { color: '#0F172A' }]}>Light</Text>
                {themeMode === 'light' && <Icon name="check-circle" size={20} color={primaryColor} style={styles.modeCheck} />}
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modeCard,
                  { borderColor: colors.border.default, backgroundColor: '#1E293B' },
                  themeMode === 'dark' && { borderColor: primaryColor, borderWidth: 3 },
                ]}
                onPress={() => setThemeMode('dark')}
              >
                <Icon name="moon-waning-crescent" size={28} color="#CBD5E1" />
                <Text style={[styles.modeLabel, { color: '#F8FAFC' }]}>Dark</Text>
                {themeMode === 'dark' && <Icon name="check-circle" size={20} color={primaryColor} style={styles.modeCheck} />}
              </TouchableOpacity>
            </View>
          </View>

          {/* Colors */}
          <View style={[styles.section, { backgroundColor: colors.surface.default }]}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Brand Colors</Text>
            <ColorPicker label="Primary Color" value={primaryColor} onChange={setPrimaryColor} colors={colors} />
            <ColorPicker label="Secondary Color" value={secondaryColor} onChange={setSecondaryColor} colors={colors} />
            <ColorPicker label="Sidebar Color" value={sidebarColor} onChange={setSidebarColor} colors={colors} />
          </View>

          {/* Live Preview */}
          <View style={[styles.section, { backgroundColor: colors.surface.default }]}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Preview</Text>
            <View style={[styles.previewCard, { backgroundColor: colors.background.default, borderColor: colors.border.default }]}>
              <View style={[styles.previewButton, { backgroundColor: primaryColor }]}>
                <Text style={styles.previewButtonText}>Primary Button</Text>
              </View>
              <View style={[styles.previewButton, { backgroundColor: secondaryColor }]}>
                <Text style={styles.previewButtonText}>Secondary Button</Text>
              </View>
              <View style={[styles.previewSidebar, { backgroundColor: sidebarColor, borderColor: colors.border.default }]}>
                <Text style={{ color: sidebarColor === '#FFFFFF' || sidebarColor.toLowerCase() === '#fff' ? '#0F172A' : '#FFFFFF', fontSize: 12 }}>
                  Sidebar Preview
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.buttonContainer}>
            <Button mode="outlined" onPress={() => navigation.goBack()} style={styles.cancelButton} labelStyle={{ color: colors.text.primary }} disabled={isSubmitting}>Cancel</Button>
            <Button mode="contained" onPress={onSubmit} style={[styles.submitButton, { backgroundColor: colors.primary.main }]} loading={isSubmitting} disabled={isSubmitting}>Save Theme</Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  keyboardView: { flex: 1 },
  scrollView: { flex: 1 },
  content: { padding: spacing[4] },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  section: { borderRadius: borderRadius.lg, padding: spacing[4], marginBottom: spacing[4] },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: spacing[4] },
  modeRow: { flexDirection: 'row', gap: spacing[3] },
  modeCard: {
    flex: 1, padding: spacing[4], borderRadius: borderRadius.lg, borderWidth: 2,
    alignItems: 'center', gap: spacing[2], position: 'relative',
  },
  modeLabel: { fontSize: 14, fontWeight: '600' },
  modeCheck: { position: 'absolute', top: spacing[2], right: spacing[2] },
  colorPickerContainer: { marginBottom: spacing[4] },
  colorPickerLabel: { fontSize: 14, fontWeight: '600', marginBottom: spacing[2] },
  colorPickerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], marginBottom: spacing[2] },
  colorPreview: { width: 44, height: 44, borderRadius: borderRadius.md, borderWidth: 2 },
  colorInput: { flex: 1, borderWidth: 1, borderRadius: borderRadius.md, paddingHorizontal: spacing[3], paddingVertical: spacing[2], fontSize: 16, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  presetGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] },
  presetColor: { width: 32, height: 32, borderRadius: 16 },
  presetColorSelected: { borderWidth: 3, borderColor: '#FFFFFF', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 4 },
  previewCard: { padding: spacing[3], borderRadius: borderRadius.md, borderWidth: 1, gap: spacing[2] },
  previewButton: { paddingVertical: spacing[2], paddingHorizontal: spacing[4], borderRadius: borderRadius.md, alignItems: 'center' },
  previewButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  previewSidebar: { padding: spacing[3], borderRadius: borderRadius.md, borderWidth: 1, alignItems: 'center' },
  buttonContainer: { flexDirection: 'row', gap: spacing[3], marginTop: spacing[2] },
  cancelButton: { flex: 1 },
  submitButton: { flex: 2 },
});
