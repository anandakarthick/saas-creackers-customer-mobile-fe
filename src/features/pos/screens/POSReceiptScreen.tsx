import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal,
  TouchableOpacity,
  FlatList,
  Platform,
  Image,
} from 'react-native';
import ReactNativeBlobUtil from 'react-native-blob-util';
import { printInvoice } from '@/utils/printInvoice';
import { Text, Button, Divider, TextInput, Checkbox } from 'react-native-paper';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { Header } from '@/components/layout/Header';
import { Badge } from '@/components/common/Badge';
import { ConfirmationModal } from '@/components/common/ConfirmationModal';
import { useTheme } from '@/theme';
import { spacing, borderRadius } from '@/theme/spacing';
import { posApi, settingsApi, ordersApi } from '@/services/api';
import { API_CONFIG, ENDPOINTS } from '@/config/api';
import { STORAGE_KEYS } from '@/constants';
import { formatCurrency } from '@/utils';
import type { POSStackParamList } from '@/types/navigation';

type NavigationProp = NativeStackNavigationProp<POSStackParamList, 'POSReceipt'>;
type RouteProps = RouteProp<POSStackParamList, 'POSReceipt'>;

const PAYMENT_METHODS = [
  { label: 'Cash', value: 'CASH' },
  { label: 'Card', value: 'CARD' },
  { label: 'UPI', value: 'UPI' },
  { label: 'Razorpay', value: 'RAZORPAY' },
];

function normalizeSale(s: any) {
  return {
    id: String(s.id),
    orderNumber: s.orderNumber || '',
    paymentMethod: s.paymentMethod || '',
    status: (s.status || 'DELIVERED').toString(),
    paymentStatus: (s.paymentStatus || '').toLowerCase(),
    createdAt: s.createdAt,
    subtotal: Number(s.subtotal || 0),
    discount: Number(s.discount || 0),
    packingCharges: Number(s.packingCharges || 0),
    tax: Number(s.tax || 0),
    total: Number(s.total || 0),
    amountPaid: s.amountPaid != null ? Number(s.amountPaid) : undefined,
    commissionName: s.commissionName || '',
    commissionAmt: s.commissionAmt != null ? Number(s.commissionAmt) : undefined,
    notes: s.notes || s.internalNotes || '',
    isEstimate: s.isEstimate === true || s.status === 'ESTIMATE',
    isDummy: s.internalNotes === 'POS Dummy Bill',
    // Name/phone/address come from the bill's own snapshot first, so a later
    // edit of the shared Customer row never changes an old bill.
    customer: (s.customer || s.shippingAddress?.name)
      ? {
          name:
            s.shippingAddress?.name ||
            `${s.customer?.firstName || ''} ${s.customer?.lastName || ''}`.trim() || 'Walk-in',
          phone: s.shippingAddress?.phone || s.customer?.phone || '',
          address: [
            s.shippingAddress?.address1,
            s.shippingAddress?.city,
            s.shippingAddress?.postalCode,
          ].filter(Boolean).join(', '),
        }
      : null,
    payments: (s.payments || []).map((p: any) => ({
      id: String(p.id || ''),
      method: p.method || p.paymentMethod || '',
      amount: Number(p.amount || 0),
      reference: p.reference || '',
      notes: p.notes || '',
      createdAt: p.createdAt || '',
    })),
    items: (s.items || []).map((it: any) => ({
      id: String(it.id),
      name: it.product?.name || it.name || 'Item',
      sku: it.sku || it.product?.sku || '',
      quantity: Number(it.quantity || 0),
      price: Number(it.price || 0),
      total: Number(it.subtotal ?? it.total ?? 0),
      status: it.status || 'active',
    })),
  };
}

export const POSReceiptScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const [downloading, setDownloading] = useState(false);
  const [voidModalVisible, setVoidModalVisible] = useState(false);
  const [convertModalVisible, setConvertModalVisible] = useState(false);

  // Payment modal state
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [payMethod, setPayMethod] = useState('CASH');
  const [payAmount, setPayAmount] = useState('');
  const [payReference, setPayReference] = useState('');
  const [payNotes, setPayNotes] = useState('');
  const [payMethodPickerVisible, setPayMethodPickerVisible] = useState(false);

  // Cancel items modal state
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [cancelNotes, setCancelNotes] = useState('');

  // Convert estimate state
  const [convertMethod, setConvertMethod] = useState('CASH');
  const [convertAmountPaid, setConvertAmountPaid] = useState('');
  const [convertMethodPickerVisible, setConvertMethodPickerVisible] = useState(false);

  // Bill format toggle (thermal / a4)
  const { data: adminSettings } = useQuery({
    queryKey: ['settings'],
    queryFn: settingsApi.getSettings,
    staleTime: 5 * 60 * 1000,
  });
  const defaultBillFormat = (adminSettings?.billFormat?.defaultFormat as string) || 'thermal';
  const [billFormat, setBillFormat] = useState<'thermal' | 'a4'>('thermal');

  // Sync billFormat from settings when loaded
  useEffect(() => {
    if (adminSettings?.billFormat?.defaultFormat) {
      setBillFormat(adminSettings.billFormat.defaultFormat as 'thermal' | 'a4');
    }
  }, [adminSettings?.billFormat?.defaultFormat]);

  const saleId = route.params?.id;
  const offlineData = (route.params as any)?.offlineData;
  const isOfflineSale = !!offlineData?.__offline;

  if (!saleId) {
    return (
      <ScreenWrapper>
        <Header title="Not Found" showBack />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text>Sale ID is missing.</Text>
        </View>
      </ScreenWrapper>
    );
  }

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['posSale', saleId],
    queryFn: () => posApi.getPOSSale(saleId),
    enabled: !!saleId && !isOfflineSale,
  });

  const invalidateSale = () => {
    queryClient.invalidateQueries({ queryKey: ['posSales'] });
    queryClient.invalidateQueries({ queryKey: ['posSale', saleId] });
  };

  const voidMutation = useMutation({
    mutationFn: () => posApi.voidPOSSale(saleId),
    onSuccess: () => {
      invalidateSale();
      setVoidModalVisible(false);
      Alert.alert('Sale Cancelled', 'Stock has been restored. The sale is now cancelled.');
    },
    onError: (err: any) => Alert.alert('Error', err?.message || 'Failed to cancel sale'),
  });

  const paymentMutation = useMutation({
    mutationFn: () =>
      posApi.addPOSPayment(saleId, {
        method: payMethod,
        amount: Number(payAmount),
        reference: payReference.trim() || undefined,
        notes: payNotes.trim() || undefined,
      }),
    onSuccess: () => {
      invalidateSale();
      setPaymentModalVisible(false);
      setPayAmount('');
      setPayReference('');
      setPayNotes('');
      Alert.alert('Payment Recorded', 'Payment has been added to this sale.');
    },
    onError: (err: any) => Alert.alert('Error', err?.message || 'Failed to record payment'),
  });

  const cancelItemsMutation = useMutation({
    mutationFn: () =>
      posApi.cancelPOSSaleItems(
        saleId,
        selectedItemIds.map((id) => Number(id)),
        { notes: cancelNotes.trim() || undefined },
      ),
    onSuccess: () => {
      invalidateSale();
      setCancelModalVisible(false);
      setSelectedItemIds([]);
      setCancelNotes('');
      Alert.alert('Items Cancelled', 'Selected items have been cancelled and stock restored.');
    },
    onError: (err: any) => Alert.alert('Error', err?.message || 'Failed to cancel items'),
  });

  const convertMutation = useMutation({
    mutationFn: () =>
      posApi.convertPOSEstimate(saleId, {
        paymentMethod: convertMethod,
        amountPaid: convertAmountPaid ? Number(convertAmountPaid) : undefined,
      }),
    onSuccess: () => {
      invalidateSale();
      setConvertModalVisible(false);
      Alert.alert('Estimate Converted', 'This estimate has been converted to a completed sale.');
    },
    onError: (err: any) => Alert.alert('Error', err?.message || 'Failed to convert estimate'),
  });

  const [downloadingThermal, setDownloadingThermal] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [printingThermal, setPrintingThermal] = useState(false);
  const [sendingWhatsApp, setSendingWhatsApp] = useState(false);

  const handleWhatsAppBill = async () => {
    setSendingWhatsApp(true);
    try {
      await ordersApi.sendWhatsAppInvoice(saleId);
      Alert.alert('Sent', 'Bill sent to customer\'s WhatsApp');
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Could not send via WhatsApp';
      Alert.alert('WhatsApp Failed', msg);
    } finally {
      setSendingWhatsApp(false);
    }
  };

  const handleDownloadReceipt = async (format: 'a4' | 'thermal' = 'a4') => {
    const setLoading = format === 'thermal' ? setDownloadingThermal : setDownloading;
    setLoading(true);
    try {
      const [token, tenantSlug] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN),
        AsyncStorage.getItem(STORAGE_KEYS.TENANT_SLUG),
      ]);
      if (!token) throw new Error('Not authenticated. Please log in again.');
      const base = API_CONFIG.BASE_URL.replace(/\/$/, '');
      const formatParam = format === 'thermal' ? '?format=thermal' : '';
      const url = `${base}${ENDPOINTS.ORDERS}/${encodeURIComponent(saleId)}/invoice${formatParam}`;
      const headers: Record<string, string> = {
        Authorization: `Bearer ${token}`,
      };
      if (tenantSlug) headers['X-Tenant-Slug'] = tenantSlug;

      const filename = format === 'thermal'
        ? `Thermal-Receipt-${saleId}.pdf`
        : `A4-Receipt-${saleId}.pdf`;

      const res = await ReactNativeBlobUtil.config({
        fileCache: true,
        appendExt: 'pdf',
        addAndroidDownloads: {
          useDownloadManager: true,
          notification: true,
          title: filename,
          description: `Downloading ${format === 'thermal' ? 'thermal' : 'A4'} receipt...`,
          mime: 'application/pdf',
        },
      }).fetch('GET', url, headers);

      if (Platform.OS === 'ios') {
        ReactNativeBlobUtil.ios.openDocument(res.path());
      } else {
        Alert.alert('Receipt Downloaded', `The ${format === 'thermal' ? 'thermal' : 'A4'} receipt has been saved to your Downloads folder.`);
      }
    } catch (err: any) {
      Alert.alert('Download Failed', err?.message || 'Could not download receipt');
    } finally {
      setLoading(false);
    }
  };

  const handlePrintReceipt = async (format: 'a4' | 'thermal' = 'a4') => {
    const setLoading = format === 'thermal' ? setPrintingThermal : setPrinting;
    setLoading(true);
    try {
      await printInvoice(saleId, format);
    } catch (err: any) {
      Alert.alert('Print Failed', err?.message || 'Could not print receipt');
    } finally {
      setLoading(false);
    }
  };

  const toggleItemSelection = (itemId: string) => {
    setSelectedItemIds((prev) =>
      prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId],
    );
  };

  const openPaymentModal = () => {
    setPayAmount(balanceDue > 0 ? balanceDue.toFixed(2) : '');
    setPayMethod('CASH');
    setPayReference('');
    setPayNotes('');
    setPaymentModalVisible(true);
  };

  if (!isOfflineSale && isLoading) {
    return (
      <ScreenWrapper>
        <Header title="Receipt" showBack onBackPress={() => navigation.navigate('POSMain')} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary.main} />
        </View>
      </ScreenWrapper>
    );
  }

  if (!isOfflineSale && (isError || !data)) {
    return (
      <ScreenWrapper>
        <Header title="Not Found" showBack onBackPress={() => navigation.navigate('POSMain')} />
        <View style={styles.center}>
          <Icon name="receipt" size={64} color={colors.neutral[300]} />
          <Text style={[styles.notFoundText, { color: colors.text.secondary }]}>
            {isError ? String(error?.message || 'Failed to load') : 'Sale not found'}
          </Text>
        </View>
      </ScreenWrapper>
    );
  }

  // Build sale object — from server data or offline data
  const sale = isOfflineSale
    ? {
        id: offlineData.offlineId || saleId,
        orderNumber: offlineData.orderNumber || `OFFLINE-${String(saleId).slice(-8).toUpperCase()}`,
        paymentMethod: offlineData.paymentMethod || 'CASH',
        status: 'PENDING_SYNC',
        paymentStatus: 'paid',
        createdAt: offlineData.createdAt || new Date().toISOString(),
        subtotal: Number(offlineData.total || 0),
        discount: 0,
        packingCharges: 0,
        tax: 0,
        total: Number(offlineData.total || 0),
        amountPaid: Number(offlineData.total || 0),
        commissionName: '',
        commissionAmt: undefined as number | undefined,
        notes: '',
        isEstimate: false,
        customer: offlineData.customerName
          ? { name: offlineData.customerName, phone: offlineData.customerPhone || '', address: '' }
          : null,
        payments: [{
          id: '1',
          method: offlineData.paymentMethod || 'CASH',
          amount: Number(offlineData.total || 0),
          reference: '',
          notes: '',
          createdAt: offlineData.createdAt || new Date().toISOString(),
        }],
        items: (offlineData.items || []).map((it: any, idx: number) => ({
          id: String(it.productId || idx),
          name: it.name || `Product #${it.productId}`,
          sku: it.sku || '',
          quantity: Number(it.quantity || 0),
          price: Number(it.price || 0),
          total: Number(it.price || 0) * Number(it.quantity || 0),
          status: 'active',
        })),
      }
    : normalizeSale(data);
  const isVoided = sale.status === 'CANCELLED';
  const isDummy = sale.isDummy;
  const isEstimate = sale.isEstimate && !isDummy;

  // Calculate paid from payments array (like web), falling back to amountPaid
  const totalPaidFromPayments = sale.payments.reduce((s: number, p: any) => s + Number(p.amount), 0);
  const totalPaid = totalPaidFromPayments > 0 ? totalPaidFromPayments : (sale.amountPaid ?? sale.total);
  const balanceDue = Math.max(0, sale.total - totalPaid);

  const isPartiallyPaid =
    !isVoided &&
    !isEstimate &&
    !isDummy &&
    balanceDue > 0;
  const isUnpaid = !isVoided && !isEstimate && !isDummy && totalPaid === 0 && sale.paymentStatus === 'unpaid';
  const canRecordPayment = !isVoided && !isEstimate && !isDummy && (isPartiallyPaid || isUnpaid || sale.paymentStatus === 'partial');
  const activeItems = sale.items.filter(
    (it: any) => (it.status || 'active').toLowerCase() !== 'cancelled',
  );
  const canCancelItems = activeItems.length > 0 && !isVoided && !isEstimate && !isDummy;

  const statusBadge = isVoided
    ? { label: 'CANCELLED', variant: 'error' as const }
    : isEstimate || isDummy
    ? { label: 'ESTIMATE', variant: 'warning' as const }
    : isUnpaid
    ? { label: 'UNPAID', variant: 'error' as const }
    : isPartiallyPaid || sale.paymentStatus === 'partial'
    ? { label: 'PARTIAL PAID', variant: 'warning' as const }
    : { label: 'PAID', variant: 'success' as const };

  return (
    <ScreenWrapper scrollable={false}>
      <Header title="POS Receipt" showBack onBackPress={() => navigation.navigate('POSMain')} />

      <ScrollView contentContainerStyle={styles.content}>
        {/* Offline banner */}
        {isOfflineSale && (
          <View style={[styles.card, { backgroundColor: colors.warning.light || '#FEF3C7' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Icon name="cloud-off-outline" size={20} color={colors.warning.main || '#D97706'} />
              <Text style={{ color: colors.warning.main || '#D97706', fontWeight: '600', fontSize: 14, flex: 1 }}>
                Offline Sale — will sync when online
              </Text>
            </View>
          </View>
        )}

        {/* Bill Format Toggle */}
        <View style={[styles.card, { backgroundColor: colors.surface.default, paddingVertical: 8 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TouchableOpacity
              style={[
                styles.formatToggleBtn,
                { borderColor: colors.border.default },
                billFormat === 'thermal' && { backgroundColor: colors.primary.main, borderColor: colors.primary.main },
              ]}
              onPress={() => setBillFormat('thermal')}
            >
              <Icon
                name="receipt"
                size={16}
                color={billFormat === 'thermal' ? '#fff' : colors.text.secondary}
              />
              <Text style={[
                styles.formatToggleText,
                { color: billFormat === 'thermal' ? '#fff' : colors.text.secondary },
              ]}>Thermal</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.formatToggleBtn,
                { borderColor: colors.border.default },
                billFormat === 'a4' && { backgroundColor: colors.primary.main, borderColor: colors.primary.main },
              ]}
              onPress={() => setBillFormat('a4')}
            >
              <Icon
                name="file-document-outline"
                size={16}
                color={billFormat === 'a4' ? '#fff' : colors.text.secondary}
              />
              <Text style={[
                styles.formatToggleText,
                { color: billFormat === 'a4' ? '#fff' : colors.text.secondary },
              ]}>A4</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ===== THERMAL VIEW ===== */}
        {billFormat === 'thermal' && (
          <View style={[styles.card, { backgroundColor: colors.surface.default }]}>
            <View style={{ fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' } as any}>
              {/* Store / header */}
              {adminSettings?.logoUrl ? (
                <Image
                  source={{ uri: adminSettings.logoUrl }}
                  style={{ width: 80, height: 40, alignSelf: 'center', marginBottom: 4, resizeMode: 'contain' }}
                />
              ) : null}
              <Text style={[styles.thermalCenter, { color: colors.text.primary, fontWeight: '700', fontSize: 16 }]}>
                {adminSettings?.name || 'POS RECEIPT'}
              </Text>
              <Text style={[styles.thermalCenter, { color: colors.text.secondary, fontSize: 11 }]}>
                {sale.orderNumber}
              </Text>
              <Text style={[styles.thermalCenter, { color: colors.text.secondary, fontSize: 11 }]}>
                {new Date(sale.createdAt).toLocaleString('en-IN')}
              </Text>

              <Text style={[styles.thermalDivider, { color: colors.border.default }]}>
                {'─'.repeat(40)}
              </Text>

              {/* Customer */}
              {sale.customer && (
                <>
                  <Text style={[styles.thermalLine, { color: colors.text.primary }]}>
                    Customer: {sale.customer.name}
                  </Text>
                  {sale.customer.phone ? (
                    <Text style={[styles.thermalLine, { color: colors.text.secondary }]}>
                      Phone: {sale.customer.phone}
                    </Text>
                  ) : null}
                  {sale.customer.address ? (
                    <Text style={[styles.thermalLine, { color: colors.text.secondary }]}>
                      Address: {sale.customer.address}
                    </Text>
                  ) : null}
                  <Text style={[styles.thermalDivider, { color: colors.border.default }]}>
                    {'─'.repeat(40)}
                  </Text>
                </>
              )}

              {/* Items */}
              {sale.items.map((item: any, idx: number) => (
                <View key={item.id || idx} style={{ marginBottom: 4 }}>
                  <Text style={[styles.thermalLine, { color: colors.text.primary, fontWeight: '500' }]} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={[styles.thermalLine, { color: colors.text.secondary }]}>
                      {`  ${item.quantity} x ${formatCurrency(item.price)}`}
                    </Text>
                    <Text style={[styles.thermalLine, { color: colors.text.primary }]}>
                      {formatCurrency(item.total)}
                    </Text>
                  </View>
                </View>
              ))}

              <Text style={[styles.thermalDivider, { color: colors.border.default }]}>
                {'─'.repeat(40)}
              </Text>

              {/* Totals */}
              <View style={styles.thermalTotalRow}>
                <Text style={[styles.thermalLine, { color: colors.text.secondary }]}>Subtotal</Text>
                <Text style={[styles.thermalLine, { color: colors.text.primary }]}>{formatCurrency(sale.subtotal)}</Text>
              </View>
              {sale.discount > 0 && (
                <View style={styles.thermalTotalRow}>
                  <Text style={[styles.thermalLine, { color: colors.success?.main || '#16A34A' }]}>Discount</Text>
                  <Text style={[styles.thermalLine, { color: colors.success?.main || '#16A34A' }]}>-{formatCurrency(sale.discount)}</Text>
                </View>
              )}
              {sale.packingCharges > 0 && (
                <View style={styles.thermalTotalRow}>
                  <Text style={[styles.thermalLine, { color: colors.text.secondary }]}>Packing</Text>
                  <Text style={[styles.thermalLine, { color: colors.text.primary }]}>{formatCurrency(sale.packingCharges)}</Text>
                </View>
              )}
              {sale.tax > 0 && (
                <View style={styles.thermalTotalRow}>
                  <Text style={[styles.thermalLine, { color: colors.text.secondary }]}>Tax</Text>
                  <Text style={[styles.thermalLine, { color: colors.text.primary }]}>{formatCurrency(sale.tax)}</Text>
                </View>
              )}

              <Text style={[styles.thermalDivider, { color: colors.border.default }]}>
                {'═'.repeat(40)}
              </Text>

              <View style={styles.thermalTotalRow}>
                <Text style={[styles.thermalLine, { color: colors.text.primary, fontWeight: '700', fontSize: 16 }]}>TOTAL</Text>
                <Text style={[styles.thermalLine, { color: colors.text.primary, fontWeight: '700', fontSize: 16 }]}>{formatCurrency(sale.total)}</Text>
              </View>

              <Text style={[styles.thermalDivider, { color: colors.border.default }]}>
                {'─'.repeat(40)}
              </Text>

              {/* Payment */}
              <View style={styles.thermalTotalRow}>
                <Text style={[styles.thermalLine, { color: colors.text.secondary }]}>Payment</Text>
                <Text style={[styles.thermalLine, { color: colors.text.primary }]}>{sale.paymentMethod}</Text>
              </View>

              {isOfflineSale && (
                <Text style={[styles.thermalCenter, { color: colors.warning.main || '#D97706', marginTop: 8, fontSize: 11 }]}>
                  ** OFFLINE — Pending Sync **
                </Text>
              )}

              <Text style={[styles.thermalCenter, { color: colors.text.secondary, marginTop: 12, fontSize: 10 }]}>
                Thank you for your purchase!
              </Text>
            </View>
          </View>
        )}

        {/* ===== A4 / DETAILED VIEW ===== */}
        {billFormat === 'a4' && (
        <>
        {/* Receipt header */}
        <View style={[styles.card, { backgroundColor: colors.surface.default }]}>
          <View style={styles.centerCol}>
            {adminSettings?.logoUrl ? (
              <Image
                source={{ uri: adminSettings.logoUrl }}
                style={{ width: 120, height: 60, resizeMode: 'contain', marginBottom: 4 }}
              />
            ) : (
              <Icon name="receipt" size={40} color={colors.primary.main} />
            )}
            {adminSettings?.name ? (
              <Text style={[styles.sectionTitle, { color: colors.text.primary, fontSize: 16, marginBottom: 2 }]}>
                {adminSettings.name}
              </Text>
            ) : null}
            <Text style={[styles.orderNumber, { color: colors.text.primary }]}>
              {sale.orderNumber}
            </Text>
            <Text style={[styles.date, { color: colors.text.secondary }]}>
              {new Date(sale.createdAt).toLocaleString('en-IN')}
            </Text>
            <View style={styles.badgeRow}>
              <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
              <Badge variant="info">{sale.paymentMethod}</Badge>
            </View>
          </View>
        </View>

        {/* Customer */}
        {sale.customer && (
          <View style={[styles.card, { backgroundColor: colors.surface.default }]}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Customer</Text>
            <Text style={[styles.value, { color: colors.text.primary }]}>{sale.customer.name}</Text>
            {sale.customer.phone ? (
              <Text style={[styles.subtle, { color: colors.text.secondary }]}>
                <Icon name="phone" size={12} /> {sale.customer.phone}
              </Text>
            ) : null}
            {sale.customer.address ? (
              <Text style={[styles.subtle, { color: colors.text.secondary }]}>
                <Icon name="map-marker" size={12} /> {sale.customer.address}
              </Text>
            ) : null}
          </View>
        )}

        {/* Items */}
        <View style={[styles.card, { backgroundColor: colors.surface.default }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary, marginBottom: 0 }]}>
              Items ({sale.items.length})
            </Text>
            {canCancelItems && (
              <TouchableOpacity
                onPress={() => {
                  setSelectedItemIds([]);
                  setCancelNotes('');
                  setCancelModalVisible(true);
                }}
              >
                <Text style={{ fontSize: 13, color: colors.error.main }}>Cancel Items</Text>
              </TouchableOpacity>
            )}
          </View>
          {sale.items.map((item: any, idx: number) => {
            const itemCancelled = (item.status || 'active').toLowerCase() === 'cancelled';
            return (
              <View key={item.id}>
                {idx > 0 && <Divider style={styles.divider} />}
                <View style={[styles.itemRow, itemCancelled && { opacity: 0.5 }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.itemName, { color: colors.text.primary }]}>
                      {item.name}
                      {itemCancelled ? ' (Cancelled)' : ''}
                    </Text>
                    {item.sku ? (
                      <Text style={[styles.subtle, { color: colors.text.tertiary }]}>
                        SKU: {item.sku}
                      </Text>
                    ) : null}
                    <Text style={[styles.subtle, { color: colors.text.secondary }]}>
                      {item.quantity} × {formatCurrency(item.price)}
                    </Text>
                  </View>
                  <Text style={[styles.itemTotal, { color: colors.text.primary }]}>
                    {formatCurrency(item.total)}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* Totals */}
        <View style={[styles.card, { backgroundColor: colors.surface.default }]}>
          <View style={styles.row}>
            <Text style={[styles.label, { color: colors.text.secondary }]}>Subtotal</Text>
            <Text style={[styles.value, { color: colors.text.primary }]}>
              {formatCurrency(sale.subtotal)}
            </Text>
          </View>
          {sale.packingCharges > 0 && (
            <View style={styles.row}>
              <Text style={[styles.label, { color: colors.text.secondary }]}>Packing Charges</Text>
              <Text style={[styles.value, { color: colors.text.primary }]}>
                +{formatCurrency(sale.packingCharges)}
              </Text>
            </View>
          )}
          {sale.tax > 0 && (
            <View style={styles.row}>
              <Text style={[styles.label, { color: colors.text.secondary }]}>Tax</Text>
              <Text style={[styles.value, { color: colors.text.primary }]}>
                {formatCurrency(sale.tax)}
              </Text>
            </View>
          )}
          {sale.discount > 0 && (
            <View style={styles.row}>
              <Text style={[styles.label, { color: colors.text.secondary }]}>Discount</Text>
              <Text style={[styles.value, { color: colors.success?.main || '#4CAF50' }]}>
                -{formatCurrency(sale.discount)}
              </Text>
            </View>
          )}
          <Divider style={styles.divider} />
          <View style={styles.row}>
            <Text style={[styles.totalLabel, { color: colors.text.primary }]}>Total</Text>
            <Text style={[styles.totalValue, { color: colors.primary.main }]}>
              {formatCurrency(sale.total)}
            </Text>
          </View>
        </View>

        {/* Payment Details — individual payment lines, total paid, balance */}
        {!isEstimate && !isDummy && (
          <View style={[styles.card, { backgroundColor: colors.surface.default }]}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text.primary, marginBottom: 0 }]}>
                Payment Details
              </Text>
              <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
            </View>
            {sale.payments.length > 0 ? (
              sale.payments.map((p: any, idx: number) => (
                <View key={p.id || idx}>
                  {idx > 0 && <Divider style={styles.divider} />}
                  <View style={styles.row}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
                      <Icon
                        name={p.method === 'CASH' ? 'cash' : p.method === 'UPI' ? 'cellphone' : p.method === 'CARD' ? 'credit-card' : 'bank'}
                        size={16}
                        color={colors.text.secondary}
                      />
                      <Text style={[styles.label, { color: colors.text.secondary }]}>{p.method}</Text>
                    </View>
                    <Text style={[styles.value, { color: colors.success?.main || '#4CAF50' }]}>
                      {formatCurrency(p.amount)}
                    </Text>
                  </View>
                  {p.reference ? (
                    <Text style={{ fontSize: 11, color: colors.text.tertiary, marginLeft: spacing[6] }}>
                      Ref: {p.reference}
                    </Text>
                  ) : null}
                </View>
              ))
            ) : sale.amountPaid != null && sale.amountPaid > 0 ? (
              <View style={styles.row}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
                  <Icon
                    name={sale.paymentMethod === 'CASH' ? 'cash' : sale.paymentMethod === 'UPI' ? 'cellphone' : sale.paymentMethod === 'CARD' ? 'credit-card' : 'bank'}
                    size={16}
                    color={colors.text.secondary}
                  />
                  <Text style={[styles.label, { color: colors.text.secondary }]}>{sale.paymentMethod}</Text>
                </View>
                <Text style={[styles.value, { color: colors.success?.main || '#4CAF50' }]}>
                  {formatCurrency(sale.amountPaid)}
                </Text>
              </View>
            ) : null}
            <Divider style={[styles.divider, { marginVertical: spacing[2] }]} />
            <View style={styles.row}>
              <Text style={[styles.label, { color: colors.text.primary, fontWeight: '600' }]}>Total Paid</Text>
              <Text style={[styles.value, { color: colors.success?.main || '#4CAF50', fontWeight: '700', fontSize: 15 }]}>
                {formatCurrency(totalPaid)}
              </Text>
            </View>
            {balanceDue > 0 && (
              <View style={[styles.row, { marginTop: spacing[1] }]}>
                <Text style={[styles.label, { color: colors.error.main, fontWeight: '600' }]}>Balance Due</Text>
                <Text style={[styles.value, { color: colors.error.main, fontWeight: '700', fontSize: 15 }]}>
                  {formatCurrency(balanceDue)}
                </Text>
              </View>
            )}
            {totalPaid > sale.total && (
              <View style={[styles.row, { marginTop: spacing[1] }]}>
                <Text style={[styles.label, { color: colors.info.main }]}>Change</Text>
                <Text style={[styles.value, { color: colors.info.main, fontWeight: '600' }]}>
                  {formatCurrency(totalPaid - sale.total)}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Commission (if any) */}
        {sale.commissionName && sale.commissionAmt ? (
          <View style={[styles.card, { backgroundColor: colors.surface.default }]}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Commission</Text>
            <View style={styles.row}>
              <Text style={[styles.label, { color: colors.text.secondary }]}>
                {sale.commissionName}
              </Text>
              <Text style={[styles.value, { color: colors.warning.main }]}>
                {formatCurrency(sale.commissionAmt)}
              </Text>
            </View>
          </View>
        ) : null}

        {/* Notes */}
        {sale.notes && (
          <View style={[styles.card, { backgroundColor: colors.surface.default }]}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Notes</Text>
            <Text style={[styles.subtle, { color: colors.text.secondary }]}>{sale.notes}</Text>
          </View>
        )}
        </>
        )}

        {/* Actions */}
        <View style={styles.actions}>
          {!isOfflineSale && isEstimate && (
            <Button
              mode="contained"
              icon="pencil"
              onPress={() => navigation.navigate('POSMain', { editEstimateId: Number(saleId) || 0 })}
              style={{ marginBottom: 8 }}
            >
              Edit Estimate
            </Button>
          )}
          {!isOfflineSale && isEstimate && (
            <Button
              mode="contained"
              icon="check-circle"
              onPress={() => {
                setConvertMethod('CASH');
                setConvertAmountPaid('');
                setConvertModalVisible(true);
              }}
            >
              Convert to Sale
            </Button>
          )}
          {!isOfflineSale && canRecordPayment && (
            <Button
              mode="contained"
              icon="cash-plus"
              onPress={() => openPaymentModal()}
            >
              Record Payment ({formatCurrency(balanceDue)})
            </Button>
          )}
          {!isOfflineSale && (
            <Button
              mode={isEstimate || canRecordPayment ? 'outlined' : 'contained'}
              icon="file-document-outline"
              onPress={() => handleDownloadReceipt('a4')}
              loading={downloading}
              disabled={downloading || downloadingThermal}
            >
              Download A4 Receipt
            </Button>
          )}
          {!isOfflineSale && (
            <Button
              mode="outlined"
              icon="receipt"
              onPress={() => handleDownloadReceipt('thermal')}
              loading={downloadingThermal}
              disabled={downloading || downloadingThermal}
            >
              Download Thermal Receipt
            </Button>
          )}
          {!isOfflineSale && (
            <Button
              mode="outlined"
              icon="printer"
              onPress={() => handlePrintReceipt('a4')}
              loading={printing}
              disabled={printing || printingThermal}
            >
              Print A4 Receipt
            </Button>
          )}
          {!isOfflineSale && (
            <Button
              mode="outlined"
              icon="printer"
              onPress={() => handlePrintReceipt('thermal')}
              loading={printingThermal}
              disabled={printing || printingThermal}
            >
              Print Thermal Receipt
            </Button>
          )}
          {!isOfflineSale && !isEstimate && !isDummy && (
            <Button
              mode="outlined"
              icon="undo-variant"
              onPress={() => (navigation as any).navigate('SalesReturns', { screen: 'SalesReturnForm', params: { orderId: saleId } })}
            >
              Sales Return
            </Button>
          )}
          {!isOfflineSale && (
            <Button
              mode="outlined"
              icon="whatsapp"
              onPress={handleWhatsAppBill}
              loading={sendingWhatsApp}
              disabled={sendingWhatsApp}
            >
              WhatsApp Bill
            </Button>
          )}
          {!isOfflineSale && !isVoided && !isEstimate && !isDummy && (
            <Button
              mode="outlined"
              icon="close-circle-outline"
              textColor={colors.error.main}
              onPress={() => setVoidModalVisible(true)}
            >
              Cancel Sale
            </Button>
          )}
          <Button
            mode="contained"
            icon="point-of-sale"
            onPress={() => navigation.navigate('POSMain')}
          >
            New Sale
          </Button>
        </View>
      </ScrollView>

      {/* Cancel Sale Confirmation */}
      <ConfirmationModal
        visible={voidModalVisible}
        title="Cancel this sale?"
        message="Cancelling will restore stock and mark this sale as cancelled. This cannot be undone."
        confirmText="Cancel Sale"
        confirmVariant="danger"
        loading={voidMutation.isPending}
        onConfirm={() => voidMutation.mutate()}
        onCancel={() => setVoidModalVisible(false)}
      />

      {/* Record Payment Modal */}
      <Modal
        visible={paymentModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPaymentModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setPaymentModalVisible(false)}
        >
          <View
            style={[styles.modalContent, { backgroundColor: colors.surface.default }]}
            onStartShouldSetResponder={() => true}
          >
            <View style={[styles.modalHeader, { borderBottomColor: colors.border.default }]}>
              <Text style={[styles.modalTitle, { color: colors.text.primary }]}>
                Record Payment
              </Text>
              <TouchableOpacity onPress={() => setPaymentModalVisible(false)}>
                <Icon name="close" size={24} color={colors.text.secondary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ padding: spacing[4] }}>
              <Text style={[styles.fieldLabel, { color: colors.text.secondary }]}>
                Payment Method
              </Text>
              <TouchableOpacity
                style={[styles.pickerButton, { borderColor: colors.border.default, backgroundColor: colors.surface.default }]}
                onPress={() => setPayMethodPickerVisible(true)}
              >
                <Text style={{ color: colors.text.primary, fontSize: 16 }}>
                  {PAYMENT_METHODS.find((m) => m.value === payMethod)?.label || payMethod}
                </Text>
                <Icon name="chevron-down" size={20} color={colors.text.tertiary} />
              </TouchableOpacity>

              <Text style={[styles.fieldLabel, { color: colors.text.secondary }]}>Amount *</Text>
              <TextInput
                mode="outlined"
                value={payAmount}
                onChangeText={setPayAmount}
                keyboardType="decimal-pad"
                placeholder="0.00"
                style={styles.textInput}
              />

              <Text style={[styles.fieldLabel, { color: colors.text.secondary }]}>
                Reference / Transaction ID
              </Text>
              <TextInput
                mode="outlined"
                value={payReference}
                onChangeText={setPayReference}
                placeholder="Optional"
                style={styles.textInput}
              />

              <Text style={[styles.fieldLabel, { color: colors.text.secondary }]}>Notes</Text>
              <TextInput
                mode="outlined"
                value={payNotes}
                onChangeText={setPayNotes}
                placeholder="Optional"
                multiline
                numberOfLines={2}
                style={styles.textInput}
              />

              <View style={styles.modalActions}>
                <Button
                  mode="outlined"
                  onPress={() => setPaymentModalVisible(false)}
                  style={{ flex: 1 }}
                >
                  Cancel
                </Button>
                <Button
                  mode="contained"
                  onPress={() => {
                    if (!payAmount || Number(payAmount) <= 0) {
                      Alert.alert('Validation', 'Please enter a valid amount.');
                      return;
                    }
                    paymentMutation.mutate();
                  }}
                  loading={paymentMutation.isPending}
                  disabled={paymentMutation.isPending}
                  style={{ flex: 2 }}
                >
                  Record Payment
                </Button>
              </View>
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Payment Method Picker Sub-modal */}
      <Modal
        visible={payMethodPickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPayMethodPickerVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setPayMethodPickerVisible(false)}
        >
          <View style={[styles.modalContent, { backgroundColor: colors.surface.default }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border.default }]}>
              <Text style={[styles.modalTitle, { color: colors.text.primary }]}>
                Payment Method
              </Text>
              <TouchableOpacity onPress={() => setPayMethodPickerVisible(false)}>
                <Icon name="close" size={24} color={colors.text.secondary} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={PAYMENT_METHODS}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.optionItem,
                    { borderBottomColor: colors.border.default },
                    item.value === payMethod && { backgroundColor: colors.primary.light + '20' },
                  ]}
                  onPress={() => {
                    setPayMethod(item.value);
                    setPayMethodPickerVisible(false);
                  }}
                >
                  <Text
                    style={{
                      fontSize: 16,
                      color: item.value === payMethod ? colors.primary.main : colors.text.primary,
                      fontWeight: item.value === payMethod ? '600' : '400',
                    }}
                  >
                    {item.label}
                  </Text>
                  {item.value === payMethod && (
                    <Icon name="check" size={20} color={colors.primary.main} />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Cancel Items Modal */}
      <Modal
        visible={cancelModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCancelModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setCancelModalVisible(false)}
        >
          <View
            style={[styles.modalContent, { backgroundColor: colors.surface.default }]}
            onStartShouldSetResponder={() => true}
          >
            <View style={[styles.modalHeader, { borderBottomColor: colors.border.default }]}>
              <Text style={[styles.modalTitle, { color: colors.text.primary }]}>
                Cancel Items
              </Text>
              <TouchableOpacity onPress={() => setCancelModalVisible(false)}>
                <Icon name="close" size={24} color={colors.text.secondary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ padding: spacing[4] }}>
              <Text style={{ fontSize: 13, color: colors.text.secondary, marginBottom: spacing[3] }}>
                Select items to cancel. Stock will be restored for cancelled items.
              </Text>
              {activeItems.map((item: any) => (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.cancelItem,
                    { borderColor: colors.border.default },
                    selectedItemIds.includes(item.id) && {
                      borderColor: colors.error.main,
                      backgroundColor: colors.error.main + '10',
                    },
                  ]}
                  onPress={() => toggleItemSelection(item.id)}
                >
                  <Checkbox.Android
                    status={selectedItemIds.includes(item.id) ? 'checked' : 'unchecked'}
                    onPress={() => toggleItemSelection(item.id)}
                    color={colors.error.main}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '500', color: colors.text.primary }}>
                      {item.name}
                    </Text>
                    <Text style={{ fontSize: 12, color: colors.text.secondary }}>
                      {item.quantity} × {formatCurrency(item.price)} = {formatCurrency(item.total)}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}

              <Text style={[styles.fieldLabel, { color: colors.text.secondary, marginTop: spacing[3] }]}>
                Notes (optional)
              </Text>
              <TextInput
                mode="outlined"
                value={cancelNotes}
                onChangeText={setCancelNotes}
                placeholder="Reason for cancellation"
                multiline
                numberOfLines={2}
                style={styles.textInput}
              />

              <View style={styles.modalActions}>
                <Button
                  mode="outlined"
                  onPress={() => setCancelModalVisible(false)}
                  style={{ flex: 1 }}
                >
                  Close
                </Button>
                <Button
                  mode="contained"
                  buttonColor={colors.error.main}
                  onPress={() => {
                    if (selectedItemIds.length === 0) {
                      Alert.alert('Validation', 'Please select at least one item to cancel.');
                      return;
                    }
                    cancelItemsMutation.mutate();
                  }}
                  loading={cancelItemsMutation.isPending}
                  disabled={cancelItemsMutation.isPending || selectedItemIds.length === 0}
                  style={{ flex: 2 }}
                >
                  Cancel {selectedItemIds.length} Item{selectedItemIds.length !== 1 ? 's' : ''}
                </Button>
              </View>
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Convert Estimate Modal */}
      <Modal
        visible={convertModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setConvertModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setConvertModalVisible(false)}
        >
          <View
            style={[styles.modalContent, { backgroundColor: colors.surface.default }]}
            onStartShouldSetResponder={() => true}
          >
            <View style={[styles.modalHeader, { borderBottomColor: colors.border.default }]}>
              <Text style={[styles.modalTitle, { color: colors.text.primary }]}>
                Convert Estimate to Sale
              </Text>
              <TouchableOpacity onPress={() => setConvertModalVisible(false)}>
                <Icon name="close" size={24} color={colors.text.secondary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ padding: spacing[4] }}>
              <View style={[styles.convertSummary, { backgroundColor: colors.primary.light + '10' }]}>
                <Text style={{ fontSize: 13, color: colors.text.secondary }}>Order Total</Text>
                <Text style={{ fontSize: 22, fontWeight: '800', color: colors.primary.main }}>
                  {formatCurrency(sale.total)}
                </Text>
              </View>

              <Text style={[styles.fieldLabel, { color: colors.text.secondary }]}>
                Payment Method
              </Text>
              <TouchableOpacity
                style={[styles.pickerButton, { borderColor: colors.border.default, backgroundColor: colors.surface.default }]}
                onPress={() => setConvertMethodPickerVisible(true)}
              >
                <Text style={{ color: colors.text.primary, fontSize: 16 }}>
                  {PAYMENT_METHODS.find((m) => m.value === convertMethod)?.label || convertMethod}
                </Text>
                <Icon name="chevron-down" size={20} color={colors.text.tertiary} />
              </TouchableOpacity>

              <Text style={[styles.fieldLabel, { color: colors.text.secondary }]}>
                Amount Paid (optional)
              </Text>
              <TextInput
                mode="outlined"
                value={convertAmountPaid}
                onChangeText={setConvertAmountPaid}
                keyboardType="decimal-pad"
                placeholder={sale.total.toFixed(2)}
                style={styles.textInput}
              />

              <View style={styles.modalActions}>
                <Button
                  mode="outlined"
                  onPress={() => setConvertModalVisible(false)}
                  style={{ flex: 1 }}
                >
                  Cancel
                </Button>
                <Button
                  mode="contained"
                  onPress={() => convertMutation.mutate()}
                  loading={convertMutation.isPending}
                  disabled={convertMutation.isPending}
                  style={{ flex: 2 }}
                >
                  Confirm & Convert
                </Button>
              </View>
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Convert Estimate - Method Picker Sub-modal */}
      <Modal
        visible={convertMethodPickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setConvertMethodPickerVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setConvertMethodPickerVisible(false)}
        >
          <View style={[styles.modalContent, { backgroundColor: colors.surface.default }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border.default }]}>
              <Text style={[styles.modalTitle, { color: colors.text.primary }]}>
                Payment Method
              </Text>
              <TouchableOpacity onPress={() => setConvertMethodPickerVisible(false)}>
                <Icon name="close" size={24} color={colors.text.secondary} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={PAYMENT_METHODS}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.optionItem,
                    { borderBottomColor: colors.border.default },
                    item.value === convertMethod && { backgroundColor: colors.primary.light + '20' },
                  ]}
                  onPress={() => {
                    setConvertMethod(item.value);
                    setConvertMethodPickerVisible(false);
                  }}
                >
                  <Text
                    style={{
                      fontSize: 16,
                      color: item.value === convertMethod ? colors.primary.main : colors.text.primary,
                      fontWeight: item.value === convertMethod ? '600' : '400',
                    }}
                  >
                    {item.label}
                  </Text>
                  {item.value === convertMethod && (
                    <Icon name="check" size={20} color={colors.primary.main} />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  centerCol: { alignItems: 'center' },
  content: { padding: spacing[4], paddingBottom: spacing[8] },
  card: { borderRadius: borderRadius.lg, padding: spacing[4], marginBottom: spacing[3] },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  sectionTitle: { fontSize: 14, fontWeight: '700', marginBottom: spacing[3] },
  orderNumber: { fontSize: 18, fontWeight: '800', marginTop: spacing[2] },
  date: { fontSize: 12, marginTop: 2 },
  badgeRow: { flexDirection: 'row', gap: spacing[2], marginTop: spacing[2] },
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
  subtle: { fontSize: 12 },
  divider: { marginVertical: spacing[1] },
  actions: { gap: spacing[2], marginTop: spacing[2] },
  notFoundText: { fontSize: 16, marginTop: spacing[3] },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '80%',
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
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing[4],
    borderBottomWidth: 1,
  },
  fieldLabel: {
    fontSize: 12,
    marginBottom: spacing[1],
    marginLeft: spacing[1],
  },
  textInput: {
    marginBottom: spacing[3],
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    marginBottom: spacing[3],
    minHeight: 48,
  },
  cancelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing[2],
    marginBottom: spacing[2],
  },
  convertSummary: {
    alignItems: 'center',
    padding: spacing[4],
    borderRadius: borderRadius.lg,
    marginBottom: spacing[4],
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing[3],
    marginTop: spacing[4],
    marginBottom: spacing[4],
  },
  // Bill format toggle styles
  formatToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  formatToggleText: {
    fontSize: 13,
    fontWeight: '600',
  },
  // Thermal receipt styles
  thermalCenter: {
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  thermalLine: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  thermalDivider: {
    textAlign: 'center',
    fontSize: 12,
    marginVertical: 4,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  thermalTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 1,
  },
});
