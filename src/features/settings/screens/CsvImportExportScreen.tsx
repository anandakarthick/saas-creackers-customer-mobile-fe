import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { Text, Button } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMutation } from '@tanstack/react-query';

import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { Header } from '@/components/layout/Header';
import { Badge } from '@/components/common/Badge';
import { useTheme } from '@/theme';
import { spacing, borderRadius } from '@/theme/spacing';
import { importApi } from '@/services/api';
import { API_CONFIG, ENDPOINTS } from '@/config/api';
import { STORAGE_KEYS } from '@/constants';
import type { ImportModule, ImportResult } from '@/types';

const IMPORT_MODULES: Array<{
  key: ImportModule;
  label: string;
  icon: string;
  description: string;
}> = [
  {
    key: 'products',
    label: 'Products',
    icon: 'package-variant-closed',
    description: 'Import product catalog with prices, stock, SKU',
  },
  {
    key: 'categories',
    label: 'Categories',
    icon: 'shape',
    description: 'Import product categories',
  },
  {
    key: 'customers',
    label: 'Customers',
    icon: 'account-group',
    description: 'Import customer records with contact details',
  },
  {
    key: 'suppliers',
    label: 'Suppliers',
    icon: 'truck',
    description: 'Import supplier/vendor records',
  },
  {
    key: 'branches',
    label: 'Branches',
    icon: 'store',
    description: 'Import store branch locations',
  },
];

export const CsvImportExportScreen: React.FC = () => {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [downloadingModule, setDownloadingModule] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importingModule, setImportingModule] = useState<string | null>(null);

  const handleDownloadSample = async (module: ImportModule) => {
    setDownloadingModule(module);
    try {
      const [token, tenantSlug] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN),
        AsyncStorage.getItem(STORAGE_KEYS.TENANT_SLUG),
      ]);
      if (!token) throw new Error('Not authenticated.');
      const base = API_CONFIG.BASE_URL.replace(/\/$/, '');
      const url =
        `${base}${ENDPOINTS.IMPORT}/${module}/sample` +
        `?token=${encodeURIComponent(token)}` +
        (tenantSlug ? `&tenant=${encodeURIComponent(tenantSlug)}` : '');
      const supported = await Linking.canOpenURL(url);
      if (!supported) throw new Error('No app available to open this URL.');
      await Linking.openURL(url);
    } catch (err: any) {
      Alert.alert('Download Failed', err?.message || 'Could not download sample CSV');
    } finally {
      setDownloadingModule(null);
    }
  };

  const handleImport = (module: ImportModule) => {
    Alert.alert(
      'CSV Import',
      'To import CSV data, please use the web admin dashboard at this time.\n\n' +
        'Mobile CSV import requires the react-native-document-picker library, which is not yet installed.\n\n' +
        'You can download the sample CSV template below and fill it with your data, then upload it via the web dashboard.',
      [
        { text: 'OK', style: 'default' },
        {
          text: 'Download Sample',
          onPress: () => handleDownloadSample(module),
        },
      ],
    );
  };

  return (
    <ScreenWrapper scrollable={false}>
      <Header title="CSV Import / Export" showBack />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: spacing[8] + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Info Card */}
        <View style={[styles.infoCard, { backgroundColor: colors.info.main + '10' }]}>
          <Icon name="information-outline" size={22} color={colors.info.main} />
          <View style={{ flex: 1, marginLeft: spacing[3] }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.info.main }}>
              How CSV Import Works
            </Text>
            <Text style={{ fontSize: 12, color: colors.text.secondary, marginTop: spacing[1] }}>
              1. Download the sample CSV template{'\n'}
              2. Fill it with your data (keep the header row){'\n'}
              3. Upload via the web admin dashboard
            </Text>
          </View>
        </View>

        {/* Import Result (if any) */}
        {importResult && (
          <View style={[styles.resultCard, { backgroundColor: colors.surface.default }]}>
            <View style={styles.resultHeader}>
              <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text.primary }}>
                Import Result
              </Text>
              <TouchableOpacity onPress={() => setImportResult(null)}>
                <Icon name="close" size={20} color={colors.text.tertiary} />
              </TouchableOpacity>
            </View>
            <View style={styles.resultGrid}>
              <View style={[styles.resultItem, { backgroundColor: colors.success.main + '10' }]}>
                <Text style={{ fontSize: 20, fontWeight: '700', color: colors.success.main }}>
                  {importResult.created}
                </Text>
                <Text style={{ fontSize: 11, color: colors.text.secondary }}>Created</Text>
              </View>
              <View style={[styles.resultItem, { backgroundColor: colors.info.main + '10' }]}>
                <Text style={{ fontSize: 20, fontWeight: '700', color: colors.info.main }}>
                  {importResult.updated}
                </Text>
                <Text style={{ fontSize: 11, color: colors.text.secondary }}>Updated</Text>
              </View>
              <View style={[styles.resultItem, { backgroundColor: colors.warning.main + '10' }]}>
                <Text style={{ fontSize: 20, fontWeight: '700', color: colors.warning.main }}>
                  {importResult.skipped}
                </Text>
                <Text style={{ fontSize: 11, color: colors.text.secondary }}>Skipped</Text>
              </View>
              <View style={[styles.resultItem, { backgroundColor: colors.error.main + '10' }]}>
                <Text style={{ fontSize: 20, fontWeight: '700', color: colors.error.main }}>
                  {importResult.errors.length}
                </Text>
                <Text style={{ fontSize: 11, color: colors.text.secondary }}>Errors</Text>
              </View>
            </View>
            {importResult.errors.length > 0 && (
              <View style={{ marginTop: spacing[3] }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: colors.error.main, marginBottom: spacing[2] }}>
                  Errors:
                </Text>
                {importResult.errors.slice(0, 5).map((err, idx) => (
                  <Text key={idx} style={{ fontSize: 11, color: colors.text.secondary, marginBottom: 2 }}>
                    Row {err.row}: {err.message}
                  </Text>
                ))}
                {importResult.errors.length > 5 && (
                  <Text style={{ fontSize: 11, color: colors.text.tertiary, marginTop: spacing[1] }}>
                    +{importResult.errors.length - 5} more errors
                  </Text>
                )}
              </View>
            )}
          </View>
        )}

        {/* Module Cards */}
        <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text.primary, marginBottom: spacing[3] }}>
          Select Module
        </Text>
        {IMPORT_MODULES.map((mod) => (
          <View
            key={mod.key}
            style={[styles.moduleCard, { backgroundColor: colors.surface.default }]}
          >
            <View style={styles.moduleHeader}>
              <View style={[styles.moduleIcon, { backgroundColor: colors.primary.light + '20' }]}>
                <Icon name={mod.icon} size={22} color={colors.primary.main} />
              </View>
              <View style={{ flex: 1, marginLeft: spacing[3] }}>
                <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text.primary }}>
                  {mod.label}
                </Text>
                <Text style={{ fontSize: 12, color: colors.text.secondary, marginTop: 2 }}>
                  {mod.description}
                </Text>
              </View>
            </View>
            <View style={styles.moduleActions}>
              <Button
                mode="outlined"
                icon="download"
                compact
                onPress={() => handleDownloadSample(mod.key)}
                loading={downloadingModule === mod.key}
                disabled={downloadingModule === mod.key}
                style={{ flex: 1 }}
              >
                Sample CSV
              </Button>
              <Button
                mode="contained"
                icon="upload"
                compact
                onPress={() => handleImport(mod.key)}
                loading={importingModule === mod.key}
                disabled={importingModule === mod.key}
                style={{ flex: 1 }}
              >
                Import
              </Button>
            </View>
          </View>
        ))}
      </ScrollView>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  content: {
    padding: spacing[4],
  },
  infoCard: {
    flexDirection: 'row',
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    marginBottom: spacing[4],
  },
  resultCard: {
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    marginBottom: spacing[4],
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  resultGrid: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  resultItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing[3],
    borderRadius: borderRadius.md,
  },
  moduleCard: {
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    marginBottom: spacing[3],
  },
  moduleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  moduleIcon: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  moduleActions: {
    flexDirection: 'row',
    gap: spacing[2],
  },
});
