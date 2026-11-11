import React, { useState } from 'react';
import { StyleSheet, View, ScrollView, Alert, Linking, ActivityIndicator } from 'react-native';
import { Text, Button, Chip } from 'react-native-paper';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { Header } from '@/components/layout/Header';
import { Badge } from '@/components/common/Badge';
import { ConfirmationModal } from '@/components/common/ConfirmationModal';
import { useTheme } from '@/theme';
import { spacing, borderRadius } from '@/theme/spacing';
import { branchesApi } from '@/services/api';
import { formatAddress, formatPhoneNumber } from '@/utils';
import type { BranchesStackParamList } from '@/types/navigation';

type NavigationProp = NativeStackNavigationProp<BranchesStackParamList, 'BranchDetail'>;
type RouteProps = RouteProp<BranchesStackParamList, 'BranchDetail'>;

interface DetailRowProps {
  label: string;
  value: string | React.ReactNode;
  icon?: string;
  onPress?: () => void;
}

const DetailRow: React.FC<DetailRowProps> = ({ label, value, icon, onPress }) => {
  const { colors } = useTheme();

  const content = (
    <View style={styles.detailRow}>
      {icon && (
        <Icon name={icon} size={20} color={colors.neutral[400]} style={styles.detailIcon} />
      )}
      <View style={styles.detailContent}>
        <Text style={[styles.detailLabel, { color: colors.text.secondary }]}>{label}</Text>
        {typeof value === 'string' ? (
          <Text style={[styles.detailValue, { color: colors.text.primary }, onPress && { color: colors.primary.main }]}>
            {value}
          </Text>
        ) : (
          value
        )}
      </View>
      {onPress && (
        <Icon name="chevron-right" size={20} color={colors.neutral[400]} />
      )}
    </View>
  );

  if (onPress) {
    return (
      <View style={{ marginHorizontal: -spacing[4] }}>
        <Button mode="text" onPress={onPress} style={styles.detailButton} contentStyle={styles.detailButtonContent}>
          {content}
        </Button>
      </View>
    );
  }

  return content;
};

function normalizeBranch(b: any) {
  return {
    id: String(b.id),
    name: b.name || '',
    code: b.code || '',
    phone: b.phone || '',
    email: b.email || '',
    isActive: b.isActive !== false,
    isMainBranch: !!b.isDefault,
    address: {
      line1: b.address || '',
      line2: '',
      city: b.city || '',
      state: b.state || '',
      pincode: b.postalCode || '',
      country: b.country || 'India',
    },
    createdAt: b.createdAt,
    updatedAt: b.updatedAt,
  };
}

export const BranchDetailScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);

  const branchId = route.params.id;

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['branch', branchId],
    queryFn: () => branchesApi.getBranch(branchId),
    enabled: !!branchId,
  });

  const deleteMutation = useMutation({
    mutationFn: () => branchesApi.deleteBranch(branchId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] });
      setDeleteModalVisible(false);
      navigation.goBack();
    },
    onError: (err: any) => Alert.alert('Error', err?.message || 'Failed to delete'),
  });

  if (isLoading) {
    return (
      <ScreenWrapper>
        <Header title="Branch" showBack />
        <View style={styles.notFound}>
          <ActivityIndicator size="large" color={colors.primary.main} />
        </View>
      </ScreenWrapper>
    );
  }

  if (isError || !data) {
    return (
      <ScreenWrapper>
        <Header title="Branch Not Found" showBack />
        <View style={styles.notFound}>
          <Icon name="alert-circle-outline" size={64} color={colors.neutral[300]} />
          <Text style={[styles.notFoundText, { color: colors.text.secondary }]}>
            {isError ? String(error?.message || 'Failed to load') : 'Branch not found'}
          </Text>
        </View>
      </ScreenWrapper>
    );
  }

  const branch = normalizeBranch(data);
  const manager = null; // Backend doesn't return manager inline; could be a separate fetch

  const handleEdit = () => navigation.navigate('BranchForm', { id: branch.id });

  // Delete is handled via deleteMutation above; this stub kept for compatibility
  const handleDelete = () => deleteMutation.mutate();

  const handleCall = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };

  const handleEmail = (email: string) => {
    Linking.openURL(`mailto:${email}`);
  };

  const handleOpenMap = () => {
    const address = encodeURIComponent(formatAddress(branch.address));
    Linking.openURL(`https://maps.google.com/?q=${address}`);
  };

  return (
    <ScreenWrapper scrollable={false}>
      <Header
        title="Branch Details"
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
        {/* Branch Header */}
        <View style={[styles.headerCard, { backgroundColor: colors.surface.default }]}>
          <View style={[styles.branchIcon, { backgroundColor: colors.primary.light + '20' }]}>
            <Icon
              name={branch.isMainBranch ? 'store' : 'store-outline'}
              size={32}
              color={colors.primary.main}
            />
          </View>

          <View style={styles.headerInfo}>
            <View style={styles.headerTitleRow}>
              <Text style={[styles.branchName, { color: colors.text.primary }]}>
                {branch.name}
              </Text>
              {branch.isMainBranch && (
                <Badge variant="primary" size="small">Main</Badge>
              )}
            </View>
            <Text style={[styles.branchCode, { color: colors.text.secondary }]}>
              {branch.code}
            </Text>
            <Badge variant={branch.isActive ? 'success' : 'error'}>
              {branch.isActive ? 'Active' : 'Inactive'}
            </Badge>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <Button
            mode="outlined"
            icon="phone"
            onPress={() => handleCall(branch.phone)}
            style={[styles.quickActionButton, { borderColor: colors.primary.main }]}
            labelStyle={{ color: colors.primary.main }}
          >
            Call
          </Button>
          {branch.email && (
            <Button
              mode="outlined"
              icon="email"
              onPress={() => handleEmail(branch.email!)}
              style={[styles.quickActionButton, { borderColor: colors.primary.main }]}
              labelStyle={{ color: colors.primary.main }}
            >
              Email
            </Button>
          )}
          <Button
            mode="outlined"
            icon="map-marker"
            onPress={handleOpenMap}
            style={[styles.quickActionButton, { borderColor: colors.primary.main }]}
            labelStyle={{ color: colors.primary.main }}
          >
            Map
          </Button>
        </View>

        {/* Contact Information */}
        <View style={[styles.section, { backgroundColor: colors.surface.default }]}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
            Contact Information
          </Text>

          <DetailRow
            label="Phone"
            value={formatPhoneNumber(branch.phone)}
            icon="phone"
          />

          {branch.email && (
            <DetailRow
              label="Email"
              value={branch.email}
              icon="email"
            />
          )}
        </View>

        {/* Address Information */}
        <View style={[styles.section, { backgroundColor: colors.surface.default }]}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
            Address Information
          </Text>

          <DetailRow
            label="Address"
            value={branch.address.line1}
            icon="map-marker"
          />

          {branch.address.line2 && (
            <DetailRow
              label="Address Line 2"
              value={branch.address.line2}
              icon="home"
            />
          )}

          <DetailRow
            label="City"
            value={branch.address.city}
            icon="city"
          />

          <DetailRow
            label="State"
            value={branch.address.state}
            icon="map"
          />

          <DetailRow
            label="Country"
            value={branch.address.country}
            icon="earth"
          />

          <DetailRow
            label="Postal Code"
            value={branch.address.pincode}
            icon="mailbox"
          />
        </View>

        {/* Manager Information — backend doesn't return inline; intentionally omitted. */}
        {false && manager}

        {/* Timestamps */}
        <View style={[styles.section, { backgroundColor: colors.surface.default }]}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
            Timestamps
          </Text>

          <DetailRow
            label="Created At"
            value={new Date(branch.createdAt).toLocaleString()}
            icon="calendar-plus"
          />

          <DetailRow
            label="Updated At"
            value={new Date(branch.updatedAt).toLocaleString()}
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
            Edit Branch
          </Button>

          <Button
            mode="outlined"
            onPress={() => setDeleteModalVisible(true)}
            style={[styles.deleteButton, { borderColor: colors.error.main }]}
            icon="delete"
            labelStyle={{ color: colors.error.main }}
          >
            Delete Branch
          </Button>
        </View>
      </ScrollView>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        visible={deleteModalVisible}
        title="Delete Branch"
        message={`Are you sure you want to delete "${branch.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        confirmVariant="danger"
        icon="delete-alert"
        onConfirm={handleDelete}
        onCancel={() => setDeleteModalVisible(false)}
        loading={deleteMutation.isPending}
      />
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing[4],
  },
  headerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    marginBottom: spacing[4],
  },
  branchIcon: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: {
    flex: 1,
    marginLeft: spacing[4],
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[1],
  },
  branchName: {
    fontSize: 20,
    fontWeight: '600',
  },
  branchCode: {
    fontSize: 14,
    marginBottom: spacing[2],
  },
  quickActions: {
    flexDirection: 'row',
    gap: spacing[3],
    marginBottom: spacing[4],
  },
  quickActionButton: {
    flex: 1,
    borderRadius: borderRadius.md,
  },
  section: {
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    marginBottom: spacing[4],
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: spacing[4],
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
  detailButton: {
    margin: 0,
  },
  detailButtonContent: {
    paddingHorizontal: spacing[4],
  },
  actionButtons: {
    gap: spacing[3],
    marginTop: spacing[2],
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
