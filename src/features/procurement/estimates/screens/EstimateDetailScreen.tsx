import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  ActivityIndicator,
  Alert,
  Share,
} from 'react-native';
import { Text, Button, Divider, Menu } from 'react-native-paper';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { Header } from '@/components/layout/Header';
import { Badge } from '@/components/common/Badge';
import { ConfirmationModal } from '@/components/common/ConfirmationModal';
import { useTheme } from '@/theme';
import { spacing, borderRadius } from '@/theme/spacing';
import { estimatesApi } from '@/services/api';
import { useStoreInfo } from '@/hooks/useStoreInfo';
import { formatCurrency } from '@/utils';
import type { EstimatesStackParamList } from '@/types/navigation';

type NavigationProp = NativeStackNavigationProp<EstimatesStackParamList, 'EstimateDetail'>;
type RouteProps = RouteProp<EstimatesStackParamList, 'EstimateDetail'>;

const STATUS_VARIANTS: Record<string, 'success' | 'warning' | 'error' | 'info'> = {
  draft: 'warning',
  sent: 'info',
  accepted: 'success',
  declined: 'error',
  expired: 'error',
};

const NEXT_STATUSES: { label: string; value: string; icon: string }[] = [
  { label: 'Mark as Sent', value: 'sent', icon: 'send' },
  { label: 'Mark as Accepted', value: 'accepted', icon: 'check-circle' },
  { label: 'Mark as Declined', value: 'declined', icon: 'close-circle' },
  { label: 'Back to Draft', value: 'draft', icon: 'file-document-edit' },
];

function normalize(e: any) {
  return {
    id: String(e.id),
    estimateNumber: e.estimateNumber || '',
    customerName: e.customerName || 'Customer',
    email: e.email || '',
    phone: e.phone || '',
    address: e.address || '',
    estimateDate: e.estimateDate,
    validUntil: e.validUntil,
    status: (e.status || 'draft').toLowerCase(),
    subtotal: Number(e.subtotal || 0),
    tax: Number(e.tax || 0),
    discount: Number(e.discount || 0),
    total: Number(e.total || 0),
    notes: e.notes || '',
    terms: e.terms || '',
    createdAt: e.createdAt,
    items: (e.items || []).map((it: any) => ({
      id: String(it.id),
      name: it.product?.name || it.name || 'Item',
      sku: it.product?.sku || '',
      quantity: Number(it.quantity || 0),
      unitPrice: Number(it.unitPrice || 0),
      total: Number(it.total ?? (Number(it.quantity || 0) * Number(it.unitPrice || 0))),
    })),
  };
}

export const EstimateDetailScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const { name: storeName } = useStoreInfo();
  const [deleteVisible, setDeleteVisible] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const id = route.params.id;

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['estimate', id],
    queryFn: () => estimatesApi.getEstimate(id),
    enabled: !!id,
  });

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [])
  );

  const updateStatus = useMutation({
    mutationFn: (status: string) => estimatesApi.updateEstimate(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['estimate', id] });
      queryClient.invalidateQueries({ queryKey: ['estimates'] });
    },
    onError: (err: any) => Alert.alert('Error', err?.message || 'Failed to update status'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => estimatesApi.deleteEstimate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['estimates'] });
      setDeleteVisible(false);
      navigation.goBack();
    },
    onError: (err: any) => Alert.alert('Error', err?.message || 'Failed to delete'),
  });

  if (isLoading) {
    return (
      <ScreenWrapper>
        <Header title="Estimate" showBack />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary.main} />
        </View>
      </ScreenWrapper>
    );
  }

  if (isError || !data) {
    return (
      <ScreenWrapper>
        <Header title="Not Found" showBack />
        <View style={styles.center}>
          <Icon name="file-document-outline" size={64} color={colors.neutral[300]} />
          <Text style={[styles.notFound, { color: colors.text.secondary }]}>
            {isError ? String(error?.message || 'Failed to load') : 'Estimate not found'}
          </Text>
        </View>
      </ScreenWrapper>
    );
  }

  const est = normalize(data);

  // Compose a text "bill" version for sharing via WhatsApp / SMS etc.
  const handleShare = async () => {
    const lines = [
      `*${storeName || 'Estimate'}*`,
      `Estimate: ${est.estimateNumber}`,
      `Date: ${est.estimateDate ? new Date(est.estimateDate).toLocaleDateString('en-IN') : ''}`,
      est.validUntil ? `Valid till: ${new Date(est.validUntil).toLocaleDateString('en-IN')}` : '',
      '',
      `Customer: ${est.customerName}`,
      est.phone ? `Phone: ${est.phone}` : '',
      est.email ? `Email: ${est.email}` : '',
      '',
      'Items:',
      ...est.items.map(
        (it: any) =>
          `  ${it.name} — ${it.quantity} × ${formatCurrency(it.unitPrice)} = ${formatCurrency(it.total)}`
      ),
      '',
      `Subtotal: ${formatCurrency(est.subtotal)}`,
      est.discount > 0 ? `Discount: -${formatCurrency(est.discount)}` : '',
      est.tax > 0 ? `Tax: ${formatCurrency(est.tax)}` : '',
      `*Total: ${formatCurrency(est.total)}*`,
      est.notes ? `\nNotes: ${est.notes}` : '',
      est.terms ? `\nTerms: ${est.terms}` : '',
    ]
      .filter(Boolean)
      .join('\n');
    try {
      await Share.share({ message: lines, title: `Estimate ${est.estimateNumber}` });
    } catch {
      // Sharing cancelled — no-op
    }
  };

  const isTerminal = est.status === 'accepted' || est.status === 'declined';

  return (
    <ScreenWrapper scrollable={false}>
      <Header
        title={est.estimateNumber}
        showBack
        actions={[
          { icon: 'share-variant', onPress: handleShare },
          {
            icon: 'pencil',
            onPress: () => navigation.navigate('EstimateForm', { id: est.id }),
          },
          { icon: 'delete', onPress: () => setDeleteVisible(true) },
        ]}
      />

      <ScrollView contentContainerStyle={styles.content}>
        {/* Header card — invoice-like layout */}
        <View style={[styles.card, { backgroundColor: colors.surface.default }]}>
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.bigHeading, { color: colors.text.primary }]}>ESTIMATE</Text>
              <Text style={[styles.subtle, { color: colors.text.secondary }]}>
                {est.estimateNumber}
              </Text>
            </View>
            <Badge variant={STATUS_VARIANTS[est.status] || 'info'}>
              {est.status.toUpperCase()}
            </Badge>
          </View>

          {storeName ? (
            <Text style={[styles.storeName, { color: colors.primary.main }]} numberOfLines={1}>
              {storeName}
            </Text>
          ) : null}

          <View style={styles.dateGrid}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.gridLabel, { color: colors.text.tertiary }]}>Estimate Date</Text>
              <Text style={[styles.gridValue, { color: colors.text.primary }]}>
                {est.estimateDate
                  ? new Date(est.estimateDate).toLocaleDateString('en-IN')
                  : new Date(est.createdAt).toLocaleDateString('en-IN')}
              </Text>
            </View>
            {est.validUntil ? (
              <View style={{ flex: 1 }}>
                <Text style={[styles.gridLabel, { color: colors.text.tertiary }]}>Valid Until</Text>
                <Text style={[styles.gridValue, { color: colors.text.primary }]}>
                  {new Date(est.validUntil).toLocaleDateString('en-IN')}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Customer */}
        <View style={[styles.card, { backgroundColor: colors.surface.default }]}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Bill To</Text>
          <Text style={[styles.customerName, { color: colors.text.primary }]}>
            {est.customerName}
          </Text>
          {est.phone ? (
            <Text style={[styles.subtle, { color: colors.text.secondary }]}>
              <Icon name="phone" size={12} /> {est.phone}
            </Text>
          ) : null}
          {est.email ? (
            <Text style={[styles.subtle, { color: colors.text.secondary }]}>
              <Icon name="email" size={12} /> {est.email}
            </Text>
          ) : null}
          {est.address ? (
            <Text style={[styles.subtle, { color: colors.text.secondary }]}>{est.address}</Text>
          ) : null}
        </View>

        {/* Items */}
        <View style={[styles.card, { backgroundColor: colors.surface.default }]}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
            Items ({est.items.length})
          </Text>
          {est.items.map((item: any, idx: number) => (
            <View key={item.id}>
              {idx > 0 && <Divider style={styles.divider} />}
              <View style={styles.itemRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.itemName, { color: colors.text.primary }]} numberOfLines={1}>
                    {item.name}
                  </Text>
                  {item.sku ? (
                    <Text style={[styles.subtle, { color: colors.text.tertiary }]}>
                      SKU: {item.sku}
                    </Text>
                  ) : null}
                  <Text style={[styles.subtle, { color: colors.text.secondary }]}>
                    {item.quantity} × {formatCurrency(item.unitPrice)}
                  </Text>
                </View>
                <Text style={[styles.itemTotal, { color: colors.text.primary }]}>
                  {formatCurrency(item.total)}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={[styles.card, { backgroundColor: colors.surface.default }]}>
          <View style={styles.row}>
            <Text style={[styles.label, { color: colors.text.secondary }]}>Subtotal</Text>
            <Text style={[styles.value, { color: colors.text.primary }]}>
              {formatCurrency(est.subtotal)}
            </Text>
          </View>
          {est.discount > 0 && (
            <View style={styles.row}>
              <Text style={[styles.label, { color: colors.text.secondary }]}>Discount</Text>
              <Text style={[styles.value, { color: colors.success.main }]}>
                -{formatCurrency(est.discount)}
              </Text>
            </View>
          )}
          {est.tax > 0 && (
            <View style={styles.row}>
              <Text style={[styles.label, { color: colors.text.secondary }]}>Tax</Text>
              <Text style={[styles.value, { color: colors.text.primary }]}>
                {formatCurrency(est.tax)}
              </Text>
            </View>
          )}
          <Divider style={styles.divider} />
          <View style={styles.row}>
            <Text style={[styles.totalLabel, { color: colors.text.primary }]}>Total</Text>
            <Text style={[styles.totalValue, { color: colors.primary.main }]}>
              {formatCurrency(est.total)}
            </Text>
          </View>
        </View>

        {/* Notes + Terms */}
        {est.notes ? (
          <View style={[styles.card, { backgroundColor: colors.surface.default }]}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Notes</Text>
            <Text style={[styles.subtle, { color: colors.text.secondary }]}>{est.notes}</Text>
          </View>
        ) : null}
        {est.terms ? (
          <View style={[styles.card, { backgroundColor: colors.surface.default }]}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
              Terms & Conditions
            </Text>
            <Text style={[styles.subtle, { color: colors.text.secondary }]}>{est.terms}</Text>
          </View>
        ) : null}

        {/* Status actions */}
        <View style={styles.actions}>
          <Button mode="contained" icon="share-variant" onPress={handleShare}>
            Share as Bill
          </Button>
          {!isTerminal && (
            <Menu
              visible={menuOpen}
              onDismiss={() => setMenuOpen(false)}
              anchor={
                <Button
                  mode="outlined"
                  icon="flag"
                  onPress={() => setMenuOpen(true)}
                  loading={updateStatus.isPending}
                >
                  Change Status
                </Button>
              }
            >
              {NEXT_STATUSES.filter((s) => s.value !== est.status).map((s) => (
                <Menu.Item
                  key={s.value}
                  leadingIcon={s.icon}
                  onPress={() => {
                    setMenuOpen(false);
                    updateStatus.mutate(s.value);
                  }}
                  title={s.label}
                />
              ))}
            </Menu>
          )}
        </View>
      </ScrollView>

      <ConfirmationModal
        visible={deleteVisible}
        title="Delete estimate?"
        message={`This will permanently delete ${est.estimateNumber}.`}
        confirmText="Delete"
        confirmVariant="danger"
        loading={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate()}
        onCancel={() => setDeleteVisible(false)}
      />
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: spacing[4], paddingBottom: spacing[8] },
  card: { borderRadius: borderRadius.lg, padding: spacing[4], marginBottom: spacing[3] },
  sectionTitle: { fontSize: 14, fontWeight: '700', marginBottom: spacing[3] },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  bigHeading: { fontSize: 22, fontWeight: '800', letterSpacing: 1.5 },
  storeName: { fontSize: 16, fontWeight: '700', marginTop: spacing[2] },
  dateGrid: {
    flexDirection: 'row',
    gap: spacing[3],
    marginTop: spacing[3],
    paddingTop: spacing[3],
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  gridLabel: { fontSize: 11, marginBottom: 2 },
  gridValue: { fontSize: 13, fontWeight: '600' },
  customerName: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  subtle: { fontSize: 12, marginTop: 2 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
  },
  label: { fontSize: 13 },
  value: { fontSize: 13, fontWeight: '500' },
  totalLabel: { fontSize: 15, fontWeight: '700' },
  totalValue: { fontSize: 20, fontWeight: '800' },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing[2],
  },
  itemName: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  itemTotal: { fontSize: 14, fontWeight: '600' },
  divider: { marginVertical: spacing[1] },
  actions: { gap: spacing[2], marginTop: spacing[2] },
  notFound: { fontSize: 16, marginTop: spacing[3] },
});
