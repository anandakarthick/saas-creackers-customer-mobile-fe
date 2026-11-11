import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Modal,
  ScrollView,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Switch,
  Vibration,
  PermissionsAndroid,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Searchbar, Chip } from 'react-native-paper';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { ScreenWrapper, Header } from '@/components/layout';
import { Empty, Button, ProductImagePlaceholder } from '@/components/common';
import { useTheme } from '@/theme';
import { spacing, borderRadius } from '@/theme/spacing';
import { usePOSStore } from '@/store';
import { formatCurrency } from '@/utils';
import { productsApi, categoriesApi, posApi, paymentMethodsApi, customersApi, storeApi } from '@/services/api';
import { resolveImageUrl } from '@/utils/imageUrl';
// Try to import vision camera, but make it optional so the app doesn't crash
// on devices where the native module isn't linked or has compatibility issues.
let CameraComponent: any = null;
let useCameraDeviceRaw: any = null;
let useCodeScannerRaw: any = null;
let cameraModuleLoaded = false;

try {
  const visionCamera = require('react-native-vision-camera');
  CameraComponent = visionCamera.Camera;
  useCameraDeviceRaw = visionCamera.useCameraDevice;
  useCodeScannerRaw = visionCamera.useCodeScanner;
  cameraModuleLoaded = true;
} catch (e) {
  console.log('Vision camera not available, using text input only');
}
import type { POSStackParamList } from '@/types/navigation';
import AsyncStorage from '@react-native-async-storage/async-storage';

type NavigationProp = NativeStackNavigationProp<POSStackParamList, 'POSMain'>;

const PAYMENT_METHODS = [
  { label: 'Cash', value: 'CASH', icon: 'cash' },
  { label: 'UPI', value: 'UPI', icon: 'cellphone-nfc' },
  { label: 'Card', value: 'CARD', icon: 'credit-card-outline' },
];

/* ------------------------------------------------------------------ */
/*  Multi-bill hold system                                             */
/* ------------------------------------------------------------------ */
interface HeldBill {
  id: string;
  label: string;
  cartSnapshot: any; // serialised cart from Zustand
  customerName: string;
  customerPhone: string;
  customerId?: number | null;
  paymentMethod: string;
  amountPaid: string;
  discount: string;
  packingCharges: string;
  commissionEnabled: boolean;
  commissionName: string;
  commissionPct: string;
  commissionNotes: string;
  discountMode?: 'flat' | 'pct';
  packingMode?: 'flat' | 'pct';
  paymentLines?: any[];
  createdAt: number;
}

const HELD_BILLS_KEY = 'pos_held_bills';
const CAMERA_CRASH_KEY = 'pos_camera_crashed';

async function loadHeldBills(): Promise<HeldBill[]> {
  try {
    const raw = await AsyncStorage.getItem(HELD_BILLS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function saveHeldBills(bills: HeldBill[]) {
  try {
    await AsyncStorage.setItem(HELD_BILLS_KEY, JSON.stringify(bills));
  } catch {}
}

/* ------------------------------------------------------------------ */

/**
 * Isolated camera scanner component. All vision-camera hooks live here
 * so a native crash cannot take down the entire POS screen.
 */
interface CameraScannerViewProps {
  isActive: boolean;
  onCodeScanned: (code: string) => void;
  containerStyle?: any;
  onFallback?: () => void;
  multiScan?: boolean;
}

function CameraScannerView({ isActive, onCodeScanned, containerStyle, onFallback, multiScan }: CameraScannerViewProps) {
  const { colors } = useTheme();
  const [phase, setPhase] = useState<'checking' | 'requesting' | 'ready' | 'denied' | 'crashed'>('checking');
  const retryCounter = useRef(0);

  useEffect(() => {
    if (!cameraModuleLoaded) { setPhase('crashed'); return; }
    let cancelled = false;

    (async () => {
      try {
        const prevCrash = await AsyncStorage.getItem(CAMERA_CRASH_KEY);
        if (prevCrash === 'true') {
          if (!cancelled) setPhase('crashed');
          return;
        }
      } catch {}

      if (!cancelled) setPhase('requesting');

      try {
        if (Platform.OS === 'android') {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.CAMERA,
            {
              title: 'Camera Permission',
              message: 'This app needs camera access to scan barcodes.',
              buttonPositive: 'OK',
              buttonNegative: 'Cancel',
            },
          );
          if (cancelled) return;
          if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
            setPhase('denied');
            return;
          }
        }
      } catch {
        if (!cancelled) { setPhase('denied'); }
        return;
      }

      try { await AsyncStorage.setItem(CAMERA_CRASH_KEY, 'true'); } catch {}

      try {
        if (CameraComponent?.getAvailableCameraDevices) {
          const devices = CameraComponent.getAvailableCameraDevices();
          if (!devices || devices.length === 0) {
            if (!cancelled) setPhase('crashed');
            try { await AsyncStorage.removeItem(CAMERA_CRASH_KEY); } catch {}
            return;
          }
        }
      } catch (err) {
        console.warn('[POS] Camera probe failed:', err);
        if (!cancelled) setPhase('crashed');
        return;
      }

      if (!cancelled) setPhase('ready');
    })();

    return () => { cancelled = true; };
  }, [retryCounter.current]);

  const handleCrash = useCallback(() => {
    AsyncStorage.setItem(CAMERA_CRASH_KEY, 'true').catch(() => {});
    setPhase('crashed');
  }, []);

  if (phase === 'ready') {
    return (
      <CameraScannerInner
        isActive={isActive}
        onCodeScanned={onCodeScanned}
        containerStyle={containerStyle}
        onFallback={onFallback}
        multiScan={multiScan}
        onCrash={handleCrash}
      />
    );
  }

  const message =
    phase === 'crashed' ? 'Camera scanner is not supported on this device. Use manual barcode entry instead.'
    : phase === 'denied' ? 'Camera permission denied. Enable in settings.'
    : phase === 'requesting' ? 'Requesting camera access...'
    : 'Checking camera...';

  const showFallback = phase === 'crashed' || phase === 'denied';

  return (
    <View style={[containerStyle, styles.cameraPlaceholder, { backgroundColor: colors.surface.variant }]}>
      <Icon name={showFallback ? 'camera-off' : 'camera'} size={multiScan ? 32 : 48} color={colors.text.tertiary} />
      <Text style={[styles.cameraPlaceholderText, { color: colors.text.secondary, fontSize: multiScan ? 12 : 14 }]}>
        {message}
      </Text>
      {showFallback && onFallback && (
        <Button variant="outlined" onPress={onFallback} style={{ marginTop: spacing[3] }}>
          Use Manual Entry
        </Button>
      )}
      {phase === 'crashed' && (
        <TouchableOpacity
          onPress={() => {
            AsyncStorage.removeItem(CAMERA_CRASH_KEY).catch(() => {});
            setPhase('checking');
            retryCounter.current += 1;
          }}
          style={{ marginTop: spacing[2] }}
        >
          <Text style={{ color: colors.primary.main, fontSize: 13 }}>Try again</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

interface CameraScannerInnerProps extends CameraScannerViewProps {
  onCrash: () => void;
}

class CameraErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode; onError?: () => void },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error: any) {
    console.warn('[CameraErrorBoundary] Camera crashed:', error);
    this.props.onError?.();
  }
  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}

function CameraScannerInner({
  isActive, onCodeScanned, containerStyle, onFallback, multiScan, onCrash,
}: CameraScannerInnerProps) {
  const { colors } = useTheme();
  // Hooks must be called unconditionally (React 19 enforces this).
  // CameraScannerInner is only rendered when cameraModuleLoaded is true,
  // so these hooks are guaranteed to exist at this point.
  const device = useCameraDeviceRaw('back');
  const codeScanner = useCodeScannerRaw({
    codeTypes: ['ean-13', 'ean-8', 'code-128', 'code-39', 'code-93', 'upc-a', 'upc-e', 'qr'],
    onCodeScanned: (codes: any[]) => {
      if (!isActive) return;
      const code = codes[0]?.value;
      if (code) onCodeScanned(code);
    },
  });

  useEffect(() => {
    AsyncStorage.removeItem(CAMERA_CRASH_KEY).catch(() => {});
  }, []);

  if (!device) {
    return (
      <View style={[containerStyle, styles.cameraPlaceholder, { backgroundColor: colors.surface.variant }]}>
        <Icon name="camera-off" size={multiScan ? 32 : 48} color={colors.text.tertiary} />
        <Text style={[styles.cameraPlaceholderText, { color: colors.text.secondary, fontSize: multiScan ? 12 : 14 }]}>
          No camera device found
        </Text>
        {onFallback && (
          <Button variant="outlined" onPress={onFallback} style={{ marginTop: spacing[3] }}>
            Use Manual Entry
          </Button>
        )}
      </View>
    );
  }

  return (
    <CameraErrorBoundary
      onError={onCrash}
      fallback={
        <View style={[containerStyle, styles.cameraPlaceholder, { backgroundColor: colors.surface.variant }]}>
          <Icon name="camera-off" size={multiScan ? 32 : 48} color={colors.text.tertiary} />
          <Text style={[styles.cameraPlaceholderText, { color: colors.text.secondary }]}>
            Camera failed to start. Use manual entry.
          </Text>
          {onFallback && (
            <Button variant="outlined" onPress={onFallback} style={{ marginTop: spacing[3] }}>
              Use Manual Entry
            </Button>
          )}
        </View>
      }
    >
      <View style={containerStyle}>
        <CameraComponent
          style={StyleSheet.absoluteFill}
          device={device}
          isActive={isActive}
          codeScanner={codeScanner}
        />
        <View style={styles.cameraOverlay}>
          <View style={[styles.cameraTarget, multiScan ? { width: 200, height: 100 } : {}]} />
        </View>
      </View>
    </CameraErrorBoundary>
  );
}

/** Normalize backend product → POS cart-friendly shape. */
function normalizeProduct(p: any) {
  const imgs: string[] = Array.isArray(p.images)
    ? p.images.map((img: any) => (typeof img === 'string' ? img : img?.url)).filter(Boolean)
    : [];
  const dealPrice = p.deal?.offerPrice != null ? Number(p.deal.offerPrice) : undefined;
  return {
    id: String(p.id),
    backendId: Number(p.id),
    name: p.name || '',
    sku: p.sku || '',
    barcode: p.barcode || '',
    categoryId: p.categoryId ? String(p.categoryId) : '',
    price: dealPrice ?? Number(p.price || 0),
    originalPrice: Number(p.price || 0),
    hasDeal: !!dealPrice,
    stock: Number(p.quantity ?? 0),
    isActive: p.status === 'ACTIVE',
    gstPercent: Number(p.gstPercent || 0),
    gstInclusive: p.gstInclusive !== false,
    taxRate: Number(p.gstPercent || 0),
    images: resolveImageUrl(imgs[0])
      ? ([resolveImageUrl(imgs[0])] as string[])
      : ([] as string[]),
  };
}

export const POSMainScreen: React.FC = () => {
  const { colors } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProp<POSStackParamList, 'POSMain'>>();
  const isDummyMode = route.name === 'POSDummyBill';
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  // --- Cart store (must be before any callback that references cart) ---
  const { cart: rawCart, addToCart, updateQuantity, removeFromCart, clearCart } = usePOSStore();
  const cart = rawCart ?? { items: [] as any[], subtotal: 0, discount: 0, tax: 0, total: 0 };
  const cartItemCount = cart.items.reduce((sum: number, item: any) => sum + (Number(item.quantity) || 0), 0);

  // --- Search & filter state ---
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | 'all'>('all');

  // --- Modal state ---
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [barcodeOpen, setBarcodeOpen] = useState(false);
  const [heldBillsOpen, setHeldBillsOpen] = useState(false);

  // --- Barcode state ---
  const [barcodeInput, setBarcodeInput] = useState('');
  const [barcodeLookupLoading, setBarcodeLookupLoading] = useState(false);
  const [scanMode, setScanMode] = useState<'camera' | 'manual' | 'multi'>('manual');
  const [scanCooldown, setScanCooldown] = useState(false);

  // --- Multi-scan queue ---
  interface MultiScanItem {
    barcode: string;
    quantity: number;
    status: 'loading' | 'found' | 'not_found' | 'out_of_stock';
    product?: ReturnType<typeof normalizeProduct>;
    name?: string;
  }
  const [multiScanQueue, setMultiScanQueue] = useState<MultiScanItem[]>([]);
  const multiScanLookupRef = useRef<Set<string>>(new Set());

  // --- Checkout state (split-tender / multi-payment) ---
  interface PaymentLine { id: string; method: string; amount: string }
  const [paymentLines, setPaymentLines] = useState<PaymentLine[]>([
    { id: 'pl-1', method: 'CASH', amount: '' },
  ]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  // Id of a customer picked from the lookup. The backend links a sale to an
  // existing customer only by id — a typed phone always creates a new one.
  const [customerId, setCustomerId] = useState<number | null>(null);
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerCity, setCustomerCity] = useState('');
  const [customerPincode, setCustomerPincode] = useState('');
  const [discount, setDiscount] = useState('');
  const [discountMode, setDiscountMode] = useState<'flat' | 'pct'>('flat');
  const [packingCharges, setPackingCharges] = useState('');
  const [packingMode, setPackingMode] = useState<'flat' | 'pct'>('flat');

  // Legacy single-method accessor for compatibility
  const paymentMethod = paymentLines[0]?.method || 'CASH';
  const setPaymentMethod = (m: string) => {
    setPaymentLines((prev) => {
      const updated = [...prev];
      if (updated.length > 0) updated[0] = { ...updated[0], method: m };
      return updated;
    });
  };
  const amountPaid = paymentLines.reduce((s, l) => s + (Number(l.amount) || 0), 0).toString() || '';

  // Payment line helpers
  const addPaymentLine = () => {
    setPaymentLines((prev) => [...prev, { id: `pl-${Date.now()}`, method: 'CASH', amount: '' }]);
  };
  const removePaymentLine = (id: string) => {
    setPaymentLines((prev) => prev.length > 1 ? prev.filter((l) => l.id !== id) : prev);
  };
  const updatePaymentLine = (id: string, field: 'method' | 'amount', value: string) => {
    setPaymentLines((prev) => prev.map((l) => l.id === id ? { ...l, [field]: value } : l));
  };

  // --- Coupon / auto-discount state ---
  const [couponCode, setCouponCode] = useState('');
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [autoDiscount, setAutoDiscount] = useState(0);
  const [autoOffers, setAutoOffers] = useState<{ offerName: string; discount: number }[]>([]);

  // --- Commission state ---
  const [commissionEnabled, setCommissionEnabled] = useState(false);
  const [commissionName, setCommissionName] = useState('');
  const [commissionPct, setCommissionPct] = useState('');
  const [commissionNotes, setCommissionNotes] = useState('');

  // --- Edit estimate state ---
  const [editEstimateId, setEditEstimateId] = useState<number | null>(null);
  const [editOrderNumber, setEditOrderNumber] = useState<string | null>(null);

  // --- Customer lookup (debounced phone search) ---
  const [debouncedPhone, setDebouncedPhone] = useState('');
  const [customerSearchOpen, setCustomerSearchOpen] = useState(false);

  useEffect(() => {
    if (customerPhone.trim().length < 3) {
      setDebouncedPhone('');
      return;
    }
    const t = setTimeout(() => setDebouncedPhone(customerPhone.trim()), 350);
    return () => clearTimeout(t);
  }, [customerPhone]);

  const { data: customerSearchResults, isFetching: customerSearching } = useQuery({
    queryKey: ['posCustomerSearch', debouncedPhone],
    queryFn: () => customersApi.getCustomers({ search: debouncedPhone, limit: 5 }),
    enabled: debouncedPhone.length >= 3,
  });

  const customerSuggestions = customerSearchResults?.data || [];
  const showCustomerSuggestions = customerSearchOpen && debouncedPhone.length >= 3 && (customerSearching || customerSuggestions.length > 0);

  const { data: nextBillData } = useQuery({
    queryKey: ['posNextBillNumber'],
    queryFn: () => posApi.getNextPOSBillNumber(),
    enabled: checkoutOpen,
  });
  const nextBillNumber = (nextBillData as any)?.billNumber || '';

  const selectCustomer = (c: any) => {
    const name = `${c.firstName || ''} ${c.lastName || ''}`.trim() || c.name || '';
    setCustomerName(name);
    setCustomerPhone(c.phone || customerPhone);
    setCustomerId(c.id ? Number(c.id) : null);
    const addr = c.addresses?.[0];
    setCustomerAddress(addr?.address1 || '');
    setCustomerCity(addr?.city || '');
    setCustomerPincode(addr?.postalCode || '');
    setCustomerSearchOpen(false);
  };

  // --- Coupon apply handler ---
  const handleApplyCoupon = useCallback(async () => {
    const code = couponCode.trim();
    if (!code) return;
    setCouponLoading(true);
    try {
      const cartSubtotal = cart.items.reduce((s, i) => s + (Number(i.price) || 0) * (Number(i.quantity) || 0), 0);
      const items = cart.items.map((i) => ({
        productId: Number((i.product as any)?.backendId ?? i.product?.id ?? i.productId),
        quantity: i.quantity,
        price: i.price,
      }));
      const result = await storeApi.applyCoupon(code, cartSubtotal, items);
      if (result.valid) {
        setCouponDiscount(result.discount);
        setAppliedCoupon(result.code);
        setCouponCode('');
      } else {
        Alert.alert('Invalid Coupon', result.message || 'This coupon cannot be applied');
      }
    } catch (e: any) {
      Alert.alert('Coupon Error', e?.message || 'Failed to apply coupon');
    } finally {
      setCouponLoading(false);
    }
  }, [couponCode, cart.items]);

  const removeCoupon = useCallback(() => {
    setCouponDiscount(0);
    setAppliedCoupon(null);
  }, []);

  // --- Held bills state ---
  const [heldBills, setHeldBills] = useState<HeldBill[]>([]);

  // Auto-discount: fetch auto-applicable offers whenever cart changes
  useEffect(() => {
    if (cart.items.length === 0) {
      setAutoDiscount(0);
      setAutoOffers([]);
      return;
    }
    const items = cart.items.map((i) => ({
      productId: Number((i.product as any)?.backendId ?? i.product?.id ?? i.productId),
      quantity: i.quantity,
      price: i.price,
      categoryId: (i.product as any)?.categoryId ? Number((i.product as any).categoryId) : undefined,
    }));
    const timer = setTimeout(() => {
      storeApi.getAutoDiscount(items).then((result) => {
        setAutoDiscount(result.discount || 0);
        setAutoOffers(result.appliedOffers || []);
      }).catch(() => {
        setAutoDiscount(0);
        setAutoOffers([]);
      });
    }, 500);
    return () => clearTimeout(timer);
  }, [cart.items]);

  // Load held bills on mount
  useEffect(() => {
    loadHeldBills().then(setHeldBills);
  }, []);

  // Load estimate for editing when navigated with editEstimateId
  useEffect(() => {
    const paramId = route.params?.editEstimateId;
    if (!paramId) return;
    // Clear the param so it doesn't re-trigger on focus
    navigation.setParams({ editEstimateId: undefined });

    posApi.getPOSSale(paramId).then((estimate: any) => {
      if (!estimate) return;
      clearCart();
      setEditEstimateId(estimate.id);
      setEditOrderNumber(estimate.orderNumber || null);
      const ship = (estimate.shippingAddress || {}) as any;
      setCustomerName(
        ship.name ||
        (estimate.customer
          ? `${estimate.customer.firstName || ''} ${estimate.customer.lastName || ''}`.trim()
          : '')
      );
      setCustomerPhone(ship.phone || estimate.customer?.phone || '');
      // Keep the same customer row so saving does not create a duplicate.
      setCustomerId(estimate.customerId ? Number(estimate.customerId) : null);
      setCustomerAddress(ship.address1 || '');
      setCustomerCity(ship.city || '');
      setCustomerPincode(ship.postalCode || '');
      if (estimate.discount) setDiscount(String(estimate.discount));
      if (estimate.packingCharges) setPackingCharges(String(estimate.packingCharges));
      if (estimate.commissionEnabled) {
        setCommissionEnabled(true);
        setCommissionName(estimate.commissionName || '');
        setCommissionPct(estimate.commissionPct ? String(estimate.commissionPct) : '');
        setCommissionNotes(estimate.commissionNotes || '');
      }
      const items = (estimate.items || []).filter(
        (it: any) => !it.metadata?.cancelledAt
      );
      items.forEach((it: any) => {
        const product = it.product || {};
        addToCart(
          {
            id: String(it.productId),
            backendId: it.productId,
            name: product.name || it.name || '',
            sku: product.sku || '',
            price: Number(it.price || 0),
            originalPrice: Number(product.price || it.price || 0),
            stock: 999,
            gstPercent: Number(it.gstPercent || product.gstPercent || 0),
            gstInclusive: it.gstInclusive ?? product.gstInclusive ?? true,
            taxRate: Number(it.gstPercent || product.gstPercent || 0),
            images: [],
          } as any,
          it.quantity
        );
      });
      Alert.alert('Estimate Loaded', `${estimate.orderNumber || 'Estimate'} opened for editing. Save as Estimate to update it, or Complete Sale to convert it into a bill.`);
    }).catch((err: any) => {
      Alert.alert('Error', 'Could not load estimate for editing.');
      console.warn('[POS] Failed to load estimate:', err);
    });
  }, [route.params?.editEstimateId]);

  // --- Camera barcode scanner (hooks moved to CameraScannerView) ---

  const handleMultiScanCode = useCallback((code: string) => {
    const trimmed = code.trim();
    if (!trimmed || multiScanLookupRef.current.has(trimmed)) {
      // Already in queue — increment quantity
      setMultiScanQueue((prev) => {
        const existing = prev.find((q) => q.barcode === trimmed);
        if (existing && existing.status === 'found') {
          Vibration.vibrate(50);
          return prev.map((q) => q.barcode === trimmed ? { ...q, quantity: q.quantity + 1 } : q);
        }
        return prev;
      });
      return;
    }
    multiScanLookupRef.current.add(trimmed);
    Vibration.vibrate(100);
    setMultiScanQueue((prev) => [...prev, { barcode: trimmed, quantity: 1, status: 'loading' }]);

    productsApi.getProductByBarcode(trimmed).then((result) => {
      if (!result) {
        setMultiScanQueue((prev) => prev.map((q) => q.barcode === trimmed ? { ...q, status: 'not_found' } : q));
        return;
      }
      const normalized = normalizeProduct(result);
      if (normalized.stock <= 0) {
        setMultiScanQueue((prev) => prev.map((q) => q.barcode === trimmed
          ? { ...q, status: 'out_of_stock', product: normalized, name: normalized.name } : q));
        return;
      }
      setMultiScanQueue((prev) => prev.map((q) => q.barcode === trimmed
        ? { ...q, status: 'found', product: normalized, name: normalized.name } : q));
    }).catch(() => {
      setMultiScanQueue((prev) => prev.map((q) => q.barcode === trimmed ? { ...q, status: 'not_found' } : q));
    });
  }, []);

  const handleAddToCart = useCallback(
    (product: ReturnType<typeof normalizeProduct>, quantity: number = 1) => {
      addToCart(product as any, quantity);
    },
    [addToCart]
  );

  const handleMultiScanAddAll = useCallback(() => {
    const foundItems = multiScanQueue.filter((q) => q.status === 'found' && q.product);
    if (foundItems.length === 0) {
      Alert.alert('No Products', 'No valid products to add. Scan some barcodes first.');
      return;
    }
    foundItems.forEach((item) => {
      handleAddToCart(item.product!, item.quantity);
    });
    setMultiScanQueue([]);
    multiScanLookupRef.current.clear();
    setBarcodeOpen(false);
  }, [multiScanQueue, handleAddToCart]);

  const handleMultiScanClear = useCallback(() => {
    setMultiScanQueue([]);
    multiScanLookupRef.current.clear();
  }, []);

  const handleMultiScanRemove = useCallback((barcode: string) => {
    setMultiScanQueue((prev) => prev.filter((q) => q.barcode !== barcode));
    multiScanLookupRef.current.delete(barcode);
  }, []);

  // Camera permission and scanner are now handled inside CameraScannerView

  // Clear multi-scan queue when modal closes
  useEffect(() => {
    if (!barcodeOpen) {
      setMultiScanQueue([]);
      multiScanLookupRef.current.clear();
    }
  }, [barcodeOpen]);

  // --- Fetch live products / categories / payment methods ---
  const productsQuery = useQuery({
    queryKey: ['posProducts', searchQuery, selectedCategory],
    queryFn: () =>
      productsApi.getProducts({
        page: 1,
        limit: 100,
        search: searchQuery || undefined,
        categoryId: selectedCategory !== 'all' ? Number(selectedCategory) : undefined,
        status: 'ACTIVE',
      }),
  });

  const categoriesQuery = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.getCategories(),
  });

  const paymentMethodsQuery = useQuery({
    queryKey: ['paymentMethods'],
    queryFn: () => paymentMethodsApi.getPaymentMethods(),
  });

  const products = useMemo(
    () =>
      (productsQuery.data?.data || [])
        .map(normalizeProduct)
        .filter((p) => p.isActive && p.stock > 0),
    [productsQuery.data]
  );

  const categories = useMemo(
    () => [
      { id: 'all', name: 'All' },
      ...(((categoriesQuery.data as any[]) || []).map((c) => ({ id: String(c.id), name: c.name }))),
    ],
    [categoriesQuery.data]
  );

  const upiVpa = useMemo(() => {
    const methods = paymentMethodsQuery.data || [];
    const upiMethod = (methods as any[]).find(
      (m: any) => (m.type === 'UPI' || m.type === 'upi') && m.isActive
    );
    return upiMethod?.upiId || upiMethod?.gpayNumber || null;
  }, [paymentMethodsQuery.data]);

  const storeName = useMemo(() => {
    const methods = paymentMethodsQuery.data || [];
    const upiMethod = (methods as any[]).find(
      (m: any) => (m.type === 'UPI' || m.type === 'upi') && m.isActive
    );
    return upiMethod?.displayName || 'Store';
  }, [paymentMethodsQuery.data]);

  // --- Computed totals ---
  const subtotal = cart.items.reduce((s, i) => s + (Number(i.price) || 0) * (Number(i.quantity) || 0), 0);
  const discountNum = discountMode === 'pct'
    ? Math.round(subtotal * (Number(discount) || 0) / 100 * 100) / 100
    : Number(discount) || 0;
  const packingNum = packingMode === 'pct'
    ? Math.round(subtotal * (Number(packingCharges) || 0) / 100 * 100) / 100
    : Number(packingCharges) || 0;
  const totalOfferDiscount = couponDiscount + autoDiscount;
  const grandTotal = Math.round(Math.max(0, subtotal - discountNum - totalOfferDiscount + packingNum));
  const totalTendered = paymentLines.reduce((s, l) => s + (Number(l.amount) || 0), 0);
  const changeAmount = totalTendered > grandTotal ? totalTendered - grandTotal : 0;
  const balanceDueAtCheckout = totalTendered > 0 ? Math.max(0, grandTotal - totalTendered) : 0;

  // --- Submit sale to backend ---
  const submitSale = useMutation({
    mutationFn: () => {
      // Build clean payment lines (filter out zero/empty amounts)
      const cleanPayments = paymentLines
        .filter((l) => l.amount && Number(l.amount) > 0)
        .map((l) => ({ method: l.method, amount: Number(l.amount) }));
      // Primary payment method = the largest tender (or first line)
      const primaryMethod = cleanPayments.length > 0
        ? cleanPayments.reduce((max, p) => p.amount > max.amount ? p : max, cleanPayments[0]).method
        : paymentLines[0]?.method || 'CASH';
      const totalPaidAmount = cleanPayments.reduce((s, p) => s + p.amount, 0);

      return posApi.createPOSSale({
        paymentMethod: primaryMethod,
        customerId: customerId || undefined,
        customerName: customerName.trim() || undefined,
        customerPhone: customerPhone.trim() || undefined,
        customerAddress: customerAddress.trim() || undefined,
        customerCity: customerCity.trim() || undefined,
        customerPincode: customerPincode.trim() || undefined,
        amountPaid: totalPaidAmount > 0 ? totalPaidAmount : undefined,
        payments: cleanPayments.length > 1 ? cleanPayments : undefined,
        items: cart.items.map((i) => ({
          productId: Number((i.product as any)?.backendId ?? i.product?.id ?? i.productId),
          quantity: i.quantity,
        })),
        discount: (discountNum + totalOfferDiscount) || 0,
        packingCharges: packingNum || undefined,
        commissionEnabled: commissionEnabled || undefined,
        commissionName: commissionEnabled ? commissionName.trim() || undefined : undefined,
        commissionPct: commissionEnabled && commissionPct ? Number(commissionPct) : undefined,
        commissionNotes: commissionEnabled ? commissionNotes.trim() || undefined : undefined,
        // Completing a sale while editing an estimate converts that estimate
        // (backend deletes it) instead of leaving it beside a new order.
        fromEstimateId: editEstimateId || undefined,
        __total: grandTotal, // for offline queue label
      } as any);
    },
    onSuccess: (order: any) => {
      queryClient.invalidateQueries({ queryKey: ['posSales'] });
      queryClient.invalidateQueries({ queryKey: ['posProducts'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      clearCart();
      resetCheckoutFields();
      setEditEstimateId(null);
      setEditOrderNumber(null);
      setCheckoutOpen(false);
      setCartOpen(false);
      if (order?.__offline) {
        // Offline sale — pass the synthetic receipt data directly
        navigation.navigate('POSReceipt', {
          id: order.offlineId || 'offline',
          offlineData: order,
        });
      } else {
        navigation.navigate('POSReceipt', { id: String(order.id) });
      }
    },
    onError: (err: any) => Alert.alert('Sale Failed', err?.message || 'Could not submit sale'),
  });

  const submitEstimate = useMutation({
    mutationFn: () => {
      return posApi.createPOSSale({
        paymentMethod: 'CASH',
        customerId: customerId || undefined,
        customerName: customerName.trim() || undefined,
        customerPhone: customerPhone.trim() || undefined,
        customerAddress: customerAddress.trim() || undefined,
        customerCity: customerCity.trim() || undefined,
        customerPincode: customerPincode.trim() || undefined,
        items: cart.items.map((i) => ({
          productId: Number((i.product as any)?.backendId ?? i.product?.id ?? i.productId),
          quantity: i.quantity,
        })),
        discount: (discountNum + totalOfferDiscount) || 0,
        packingCharges: packingNum || undefined,
        commissionEnabled: commissionEnabled || undefined,
        commissionName: commissionEnabled ? commissionName.trim() || undefined : undefined,
        commissionPct: commissionEnabled && commissionPct ? Number(commissionPct) : undefined,
        commissionNotes: commissionEnabled ? commissionNotes.trim() || undefined : undefined,
        isEstimate: true,
        editEstimateId: editEstimateId || undefined,
        __total: grandTotal,
      } as any);
    },
    onSuccess: (order: any) => {
      queryClient.invalidateQueries({ queryKey: ['posSales'] });
      queryClient.invalidateQueries({ queryKey: ['posProducts'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      clearCart();
      resetCheckoutFields();
      setEditEstimateId(null);
      setEditOrderNumber(null);
      setCheckoutOpen(false);
      setCartOpen(false);
      if (order?.__offline) {
        navigation.navigate('POSReceipt', {
          id: order.offlineId || 'offline',
          offlineData: order,
        });
      } else {
        navigation.navigate('POSReceipt', { id: String(order.id) });
      }
    },
    onError: (err: any) => Alert.alert('Estimate Failed', err?.message || 'Could not save estimate'),
  });

  const submitDummy = useMutation({
    mutationFn: () => {
      return posApi.createPOSSale({
        paymentMethod: 'CASH',
        customerName: customerName.trim() || undefined,
        customerPhone: customerPhone.trim() || undefined,
        customerAddress: customerAddress.trim() || undefined,
        customerCity: customerCity.trim() || undefined,
        customerPincode: customerPincode.trim() || undefined,
        items: cart.items.map((i) => ({
          productId: Number((i.product as any)?.backendId ?? i.product?.id ?? i.productId),
          quantity: i.quantity,
        })),
        discount: (discountNum + totalOfferDiscount) || 0,
        packingCharges: packingNum || undefined,
        commissionEnabled: commissionEnabled || undefined,
        commissionName: commissionEnabled ? commissionName.trim() || undefined : undefined,
        commissionPct: commissionEnabled && commissionPct ? Number(commissionPct) : undefined,
        commissionNotes: commissionEnabled ? commissionNotes.trim() || undefined : undefined,
        isDummy: true,
        editEstimateId: editEstimateId || undefined,
        __total: grandTotal,
      } as any);
    },
    onSuccess: (order: any) => {
      queryClient.invalidateQueries({ queryKey: ['posSales'] });
      queryClient.invalidateQueries({ queryKey: ['posProducts'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      clearCart();
      resetCheckoutFields();
      setCheckoutOpen(false);
      setCartOpen(false);
      if (order?.__offline) {
        navigation.navigate('POSReceipt', {
          id: order.offlineId || 'offline',
          offlineData: order,
        });
      } else {
        navigation.navigate('POSReceipt', { id: String(order.id) });
      }
    },
    onError: (err: any) => Alert.alert('Dummy Bill Failed', err?.message || 'Could not save dummy bill'),
  });

  const resetCheckoutFields = useCallback(() => {
    setCustomerName('');
    setCustomerPhone('');
    setCustomerId(null);
    setCustomerAddress('');
    setCustomerCity('');
    setCustomerPincode('');
    setDiscount('');
    setDiscountMode('flat');
    setPackingCharges('');
    setPackingMode('flat');
    setPaymentLines([{ id: 'pl-1', method: 'CASH', amount: '' }]);
    setCommissionEnabled(false);
    setCommissionName('');
    setCommissionPct('');
    setCommissionNotes('');
    setCouponCode('');
    setCouponDiscount(0);
    setAppliedCoupon(null);
    setCustomerSearchOpen(false);
  }, []);

  // ================================================================
  //  MULTI-BILL HOLD SYSTEM
  // ================================================================

  const holdCurrentBill = useCallback(async () => {
    if (cart.items.length === 0) {
      Alert.alert('Empty Cart', 'Add products before holding the bill.');
      return;
    }
    const billLabel = customerName.trim() || `Bill #${heldBills.length + 1}`;
    const newBill: any = {
      id: `bill-${Date.now()}`,
      label: billLabel,
      cartSnapshot: JSON.parse(JSON.stringify(cart)),
      customerName,
      customerPhone,
      customerId,
      customerAddress,
      customerCity,
      customerPincode,
      paymentMethod,
      amountPaid,
      discount,
      discountMode,
      packingCharges,
      packingMode,
      commissionEnabled,
      commissionName,
      commissionPct,
      commissionNotes,
      paymentLines: JSON.parse(JSON.stringify(paymentLines)),
      createdAt: Date.now(),
    };
    const updated = [...heldBills, newBill];
    setHeldBills(updated);
    await saveHeldBills(updated);
    clearCart();
    resetCheckoutFields();
    Alert.alert('Bill Held', `"${billLabel}" saved. You can resume it anytime.`);
  }, [cart, heldBills, customerName, customerPhone, customerId, customerAddress, customerCity,
      customerPincode, paymentMethod, amountPaid, discount,
      discountMode, packingCharges, packingMode, commissionEnabled, commissionName,
      commissionPct, commissionNotes, paymentLines, clearCart, resetCheckoutFields]);

  const restoreBill = useCallback(async (bill: HeldBill) => {
    const { cartSnapshot } = bill;
    clearCart();
    setTimeout(() => {
      if (cartSnapshot?.items) {
        cartSnapshot.items.forEach((item: any) => {
          if (item.product) {
            addToCart(item.product as any, item.quantity);
          }
        });
      }
    }, 50);
    setCustomerName(bill.customerName);
    setCustomerPhone(bill.customerPhone);
    setCustomerId(bill.customerId ?? null);
    setCustomerAddress((bill as any).customerAddress || '');
    setCustomerCity((bill as any).customerCity || '');
    setCustomerPincode((bill as any).customerPincode || '');
    if ((bill as any).paymentLines?.length > 0) {
      setPaymentLines((bill as any).paymentLines);
    } else {
      setPaymentLines([{ id: 'pl-1', method: bill.paymentMethod, amount: bill.amountPaid }]);
    }
    setDiscount(bill.discount);
    setDiscountMode((bill as any).discountMode || 'flat');
    setPackingCharges(bill.packingCharges);
    setPackingMode((bill as any).packingMode || 'flat');
    setCommissionEnabled(bill.commissionEnabled);
    setCommissionName(bill.commissionName);
    setCommissionPct(bill.commissionPct);
    setCommissionNotes(bill.commissionNotes);

    const updated = heldBills.filter((b) => b.id !== bill.id);
    setHeldBills(updated);
    await saveHeldBills(updated);
    setHeldBillsOpen(false);
  }, [heldBills, clearCart, addToCart]);

  const resumeBill = useCallback(async (bill: HeldBill) => {
    if (cart.items.length > 0) {
      Alert.alert(
        'Current Cart Has Items',
        'Hold the current bill first, or clear it before resuming.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Clear & Resume',
            style: 'destructive',
            onPress: async () => {
              clearCart();
              restoreBill(bill);
            },
          },
          {
            text: 'Hold Current & Resume',
            onPress: async () => {
              await holdCurrentBill();
              restoreBill(bill);
            },
          },
        ]
      );
      return;
    }
    restoreBill(bill);
  }, [cart.items.length, clearCart, holdCurrentBill, restoreBill]);

  const deleteHeldBill = useCallback(async (billId: string) => {
    Alert.alert('Delete Held Bill?', 'This action cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setHeldBills((prev) => {
            const updated = prev.filter((b) => b.id !== billId);
            saveHeldBills(updated);
            return updated;
          });
        },
      },
    ]);
  }, []);

  // ================================================================

  const handleBarcodeLookup = useCallback(
    async (code: string) => {
      const trimmed = code.trim();
      if (!trimmed) return;
      setBarcodeLookupLoading(true);
      try {
        const result = await productsApi.getProductByBarcode(trimmed);
        if (!result) {
          Alert.alert('Not Found', `No product with barcode "${trimmed}"`);
          return;
        }
        const normalized = normalizeProduct(result);
        if (normalized.stock <= 0) {
          Alert.alert('Out of Stock', `"${normalized.name}" has no stock available.`);
          return;
        }
        handleAddToCart(normalized);
        setBarcodeInput('');
        setBarcodeOpen(false);
      } catch (err: any) {
        Alert.alert('Lookup Failed', err?.message || 'Could not find product');
      } finally {
        setBarcodeLookupLoading(false);
      }
    },
    [handleAddToCart]
  );

  const onRefresh = useCallback(async () => {
    await Promise.all([productsQuery.refetch(), categoriesQuery.refetch()]);
  }, [productsQuery, categoriesQuery]);

  // --- Product card ---
  const renderProduct = ({ item }: { item: ReturnType<typeof normalizeProduct> }) => {
    const inCart = cart.items.find((i) => i.productId === item.id);
    const imageUri = item.images?.[0];
    return (
      <TouchableOpacity
        style={[styles.productCard, { backgroundColor: colors.surface.default }]}
        onPress={() => handleAddToCart(item)}
        activeOpacity={0.7}
      >
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={[styles.productImage, { backgroundColor: colors.neutral[100] }]} />
        ) : (
          <ProductImagePlaceholder size={80} style={styles.productImage} />
        )}
        {inCart && (
          <View style={[styles.cartBadge, { backgroundColor: colors.primary.main }]}>
            <Text style={[styles.cartBadgeText, { color: colors.neutral[0] }]}>{inCart.quantity}</Text>
          </View>
        )}
        {item.hasDeal && (
          <View style={[styles.dealBadge, { backgroundColor: colors.success.main }]}>
            <Text style={styles.dealBadgeText}>OFFER</Text>
          </View>
        )}
        <View style={styles.productInfo}>
          <Text style={[styles.productName, { color: colors.text.primary }]} numberOfLines={2}>
            {item.name}
          </Text>
          <View style={styles.priceRow}>
            <Text style={[styles.productPrice, { color: colors.primary.main }]}>{formatCurrency(item.price)}</Text>
            {item.hasDeal && (
              <Text style={[styles.productPriceStrike, { color: colors.text.tertiary }]}>{formatCurrency(item.originalPrice)}</Text>
            )}
          </View>
          <Text style={[styles.productStock, { color: colors.text.tertiary }]}>{item.stock} in stock</Text>
        </View>
        <TouchableOpacity style={[styles.addButton, { backgroundColor: colors.primary.main }]} onPress={() => handleAddToCart(item)}>
          <Icon name="plus" size={20} color={colors.neutral[0]} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <ScreenWrapper scrollable={false} padding={false}>
      <Header
        title={isDummyMode ? "Dummy Bill" : "Point of Sale"}
        showDrawer={!isDummyMode}
        showBack={isDummyMode}
        onBackPress={isDummyMode ? () => navigation.goBack() : undefined}
        actions={[
          ...(heldBills.length > 0
            ? [{ icon: 'tray-full', onPress: () => setHeldBillsOpen(true), badge: heldBills.length }]
            : [{ icon: 'tray-arrow-down', onPress: () => holdCurrentBill() }]),
          { icon: 'barcode-scan', onPress: () => setBarcodeOpen(true) },
          { icon: 'history', onPress: () => navigation.navigate('POSSalesHistory') },
          { icon: 'cart', onPress: () => setCartOpen(true), badge: cartItemCount },
        ]}
      />

      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Search products..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={[styles.searchBar, { backgroundColor: colors.surface.default }]}
          inputStyle={styles.searchInput}
        />
      </View>

      {/* Held bills indicator bar */}
      {heldBills.length > 0 && (
        <TouchableOpacity
          style={[styles.heldBillsBar, { backgroundColor: colors.warning.light + '30', borderColor: colors.warning.main }]}
          onPress={() => setHeldBillsOpen(true)}
        >
          <Icon name="tray-full" size={16} color={colors.warning.main} />
          <Text style={[styles.heldBillsBarText, { color: colors.warning.main }]}>
            {heldBills.length} held bill{heldBills.length > 1 ? 's' : ''} — tap to resume
          </Text>
          <Icon name="chevron-right" size={16} color={colors.warning.main} />
        </TouchableOpacity>
      )}

      <View style={[styles.filtersContainer, { borderBottomColor: colors.border.default }]}>
        <FlatList
          horizontal
          data={categories}
          keyExtractor={(item) => item.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersList}
          renderItem={({ item }) => (
            <Chip
              selected={selectedCategory === item.id}
              onPress={() => setSelectedCategory(item.id)}
              style={[styles.filterChip, { backgroundColor: colors.surface.variant }, selectedCategory === item.id && { backgroundColor: colors.primary.main }]}
              textStyle={[
                styles.filterChipText,
                { color: colors.text.secondary },
                selectedCategory === item.id && { color: colors.neutral[0] },
              ]}
            >
              {item.name}
            </Chip>
          )}
        />
      </View>

      <View style={{ flex: 1 }}>
        {productsQuery.isLoading ? (
          <View style={styles.loadingCenter}>
            <ActivityIndicator size="large" color={colors.primary.main} />
          </View>
        ) : productsQuery.isError ? (
          <Empty
            icon="cloud-alert"
            title="Couldn't load products"
            description={String(productsQuery.error?.message || 'Network error')}
          />
        ) : (
          <FlatList
            data={products}
            renderItem={renderProduct}
            keyExtractor={(item) => item.id}
            numColumns={2}
            columnWrapperStyle={styles.row}
            contentContainerStyle={[styles.listContent, { paddingBottom: spacing[4] }]}
            showsVerticalScrollIndicator={false}
            refreshing={productsQuery.isFetching}
            onRefresh={onRefresh}
            ListEmptyComponent={
              <Empty
                icon="package-variant-closed-remove"
                title="No products available"
                description="All products are out of stock or inactive"
              />
            }
          />
        )}
      </View>

      {/* Bottom cart bar */}
      {cartItemCount > 0 && (
        <View style={[styles.cartFooter, { paddingBottom: spacing[4] + insets.bottom, backgroundColor: colors.surface.default, borderTopColor: colors.border.default }]}>
          <View style={styles.cartSummary}>
            <Text style={[styles.cartItemsText, { color: colors.text.secondary }]}>{cartItemCount} items</Text>
            <Text style={[styles.cartTotalText, { color: colors.text.primary }]}>{formatCurrency(grandTotal)}</Text>
          </View>
          <View style={styles.cartButtonsRow}>
            <Button variant="outlined" onPress={holdCurrentBill} style={{ minWidth: 50, paddingHorizontal: spacing[2] }}>
              <Icon name="tray-arrow-down" size={18} color={colors.primary.main} />
            </Button>
            <Button onPress={() => setCartOpen(true)} icon="arrow-right" style={styles.checkoutButton}>
              View Cart
            </Button>
          </View>
        </View>
      )}

      {/* ============================================================= */}
      {/* CART MODAL                                                      */}
      {/* ============================================================= */}
      <Modal visible={cartOpen} animationType="slide" onRequestClose={() => setCartOpen(false)}>
        <ScreenWrapper scrollable={false} padding={false}>
          <Header
            title={`Cart (${cartItemCount})`}
            showBack
            onBackPress={() => setCartOpen(false)}
            actions={
              cart.items.length > 0
                ? [
                    { icon: 'tray-arrow-down', onPress: () => { setCartOpen(false); holdCurrentBill(); } },
                    { icon: 'trash-can-outline', onPress: () => clearCart() },
                  ]
                : []
            }
          />
          <ScrollView contentContainerStyle={styles.cartContent}>
            {cart.items.length === 0 ? (
              <Empty icon="cart-off" title="Cart is empty" description="Add products to start a sale" />
            ) : (
              <>
                {cart.items.map((item) => (
                  <View key={item.productId} style={[styles.cartItemRow, { backgroundColor: colors.surface.default }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.cartItemName, { color: colors.text.primary }]} numberOfLines={1}>
                        {item.product?.name || 'Product'}
                      </Text>
                      <Text style={[styles.cartItemPrice, { color: colors.text.secondary }]}>
                        {formatCurrency(item.price)} × {item.quantity} = {formatCurrency((Number(item.price) || 0) * (Number(item.quantity) || 0))}
                      </Text>
                    </View>
                    <View style={styles.qtyControls}>
                      <TouchableOpacity
                        style={[styles.qtyBtn, { backgroundColor: colors.surface.variant }]}
                        onPress={() => updateQuantity(item.productId, Math.max(1, item.quantity - 1))}
                      >
                        <Icon name="minus" size={16} color={colors.text.primary} />
                      </TouchableOpacity>
                      <Text style={[styles.qtyValue, { color: colors.text.primary }]}>{item.quantity}</Text>
                      <TouchableOpacity
                        style={[styles.qtyBtn, { backgroundColor: colors.surface.variant }]}
                        onPress={() => updateQuantity(item.productId, item.quantity + 1)}
                      >
                        <Icon name="plus" size={16} color={colors.text.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={{ marginLeft: spacing[2] }}
                        onPress={() => removeFromCart(item.productId)}
                      >
                        <Icon name="close" size={20} color={colors.error.main} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}

                {/* Discount & Packing in cart view */}
                <View style={[styles.extraChargesSection, { borderColor: colors.border.default }]}>
                  <View style={styles.extraChargesRow}>
                    <View style={styles.extraChargesField}>
                      <View style={styles.extraChargesLabelRow}>
                        <Text style={[styles.extraChargesLabel, { color: colors.text.secondary }]}>Discount</Text>
                        <View style={styles.modeToggle}>
                          <TouchableOpacity
                            onPress={() => setDiscountMode('flat')}
                            style={[styles.modeBtn, discountMode === 'flat' && { backgroundColor: colors.primary.main }]}
                          >
                            <Text style={[styles.modeBtnText, discountMode === 'flat' && { color: '#fff' }]}>₹</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => setDiscountMode('pct')}
                            style={[styles.modeBtn, discountMode === 'pct' && { backgroundColor: colors.primary.main }]}
                          >
                            <Text style={[styles.modeBtnText, discountMode === 'pct' && { color: '#fff' }]}>%</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                      <TextInput
                        style={[styles.extraChargesInput, { borderColor: colors.border.default, color: colors.text.primary, backgroundColor: colors.surface.variant }]}
                        placeholder="0"
                        placeholderTextColor={colors.text.tertiary}
                        value={discount}
                        onChangeText={setDiscount}
                        keyboardType="decimal-pad"
                      />
                    </View>
                    <View style={styles.extraChargesField}>
                      <View style={styles.extraChargesLabelRow}>
                        <Text style={[styles.extraChargesLabel, { color: colors.text.secondary }]}>Packing</Text>
                        <View style={styles.modeToggle}>
                          <TouchableOpacity
                            onPress={() => setPackingMode('flat')}
                            style={[styles.modeBtn, packingMode === 'flat' && { backgroundColor: colors.primary.main }]}
                          >
                            <Text style={[styles.modeBtnText, packingMode === 'flat' && { color: '#fff' }]}>₹</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => setPackingMode('pct')}
                            style={[styles.modeBtn, packingMode === 'pct' && { backgroundColor: colors.primary.main }]}
                          >
                            <Text style={[styles.modeBtnText, packingMode === 'pct' && { color: '#fff' }]}>%</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                      <TextInput
                        style={[styles.extraChargesInput, { borderColor: colors.border.default, color: colors.text.primary, backgroundColor: colors.surface.variant }]}
                        placeholder="0"
                        placeholderTextColor={colors.text.tertiary}
                        value={packingCharges}
                        onChangeText={setPackingCharges}
                        keyboardType="decimal-pad"
                      />
                    </View>
                  </View>
                </View>

                {/* Coupon Code */}
                <View style={[styles.extraChargesSection, { borderColor: colors.border.default }]}>
                  {appliedCoupon ? (
                    <View style={styles.appliedCouponRow}>
                      <View style={styles.appliedCouponInfo}>
                        <Icon name="ticket-percent" size={18} color="#10B981" />
                        <Text style={[styles.appliedCouponText, { color: '#10B981' }]}>
                          {appliedCoupon} applied (-{formatCurrency(couponDiscount)})
                        </Text>
                      </View>
                      <TouchableOpacity onPress={removeCoupon}>
                        <Icon name="close-circle" size={20} color={colors.error.main} />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={styles.couponRow}>
                      <TextInput
                        style={[styles.couponInput, { borderColor: colors.border.default, color: colors.text.primary, backgroundColor: colors.surface.variant }]}
                        placeholder="Enter coupon code"
                        placeholderTextColor={colors.text.tertiary}
                        value={couponCode}
                        onChangeText={setCouponCode}
                        autoCapitalize="characters"
                      />
                      <TouchableOpacity
                        style={[styles.couponApplyBtn, { backgroundColor: colors.primary.main }]}
                        onPress={handleApplyCoupon}
                        disabled={couponLoading || !couponCode.trim()}
                      >
                        {couponLoading ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <Text style={styles.couponApplyText}>Apply</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  )}
                </View>

                {/* Auto-applied offers */}
                {autoOffers.length > 0 && (
                  <View style={[styles.autoOffersSection, { backgroundColor: '#10B981' + '10', borderColor: '#10B981' + '30' }]}>
                    <View style={styles.autoOffersHeader}>
                      <Icon name="tag-multiple" size={16} color="#10B981" />
                      <Text style={styles.autoOffersTitle}>{autoOffers.length} offer{autoOffers.length > 1 ? 's' : ''} applied</Text>
                    </View>
                    {autoOffers.map((offer, idx) => (
                      <Text key={idx} style={styles.autoOfferItem}>
                        {offer.offerName}: -{formatCurrency(offer.discount)}
                      </Text>
                    ))}
                  </View>
                )}

                {/* Totals breakdown */}
                <View style={[styles.totalsCard, { backgroundColor: colors.surface.variant, borderColor: colors.border.default }]}>
                  <View style={styles.totalsRow}>
                    <Text style={[styles.totalsLabel, { color: colors.text.secondary }]}>Subtotal</Text>
                    <Text style={[styles.totalsValue, { color: colors.text.primary }]}>{formatCurrency(subtotal)}</Text>
                  </View>
                  {discountNum > 0 && (
                    <View style={styles.totalsRow}>
                      <Text style={[styles.totalsLabel, { color: colors.success.main }]}>
                        Discount{discountMode === 'pct' ? ` (${discount}%)` : ''}
                      </Text>
                      <Text style={[styles.totalsValue, { color: colors.success.main }]}>-{formatCurrency(discountNum)}</Text>
                    </View>
                  )}
                  {couponDiscount > 0 && (
                    <View style={styles.totalsRow}>
                      <Text style={[styles.totalsLabel, { color: '#10B981' }]}>
                        Coupon ({appliedCoupon})
                      </Text>
                      <Text style={[styles.totalsValue, { color: '#10B981' }]}>-{formatCurrency(couponDiscount)}</Text>
                    </View>
                  )}
                  {autoDiscount > 0 && (
                    <View style={styles.totalsRow}>
                      <Text style={[styles.totalsLabel, { color: '#10B981' }]}>
                        Offers ({autoOffers.length})
                      </Text>
                      <Text style={[styles.totalsValue, { color: '#10B981' }]}>-{formatCurrency(autoDiscount)}</Text>
                    </View>
                  )}
                  {packingNum > 0 && (
                    <View style={styles.totalsRow}>
                      <Text style={[styles.totalsLabel, { color: colors.text.secondary }]}>
                        Packing{packingMode === 'pct' ? ` (${packingCharges}%)` : ''}
                      </Text>
                      <Text style={[styles.totalsValue, { color: colors.text.primary }]}>+{formatCurrency(packingNum)}</Text>
                    </View>
                  )}
                  <View style={[styles.totalsRow, styles.totalsFinalRow, { borderTopColor: colors.border.default }]}>
                    <Text style={[styles.totalsFinalLabel, { color: colors.text.primary }]}>Grand Total</Text>
                    <Text style={[styles.totalsFinalValue, { color: colors.primary.main }]}>{formatCurrency(grandTotal)}</Text>
                  </View>
                </View>
              </>
            )}
          </ScrollView>
          {cart.items.length > 0 && (
            <View style={[styles.cartFooter, { paddingBottom: spacing[4] + insets.bottom, backgroundColor: colors.surface.default, borderTopColor: colors.border.default }]}>
              <View style={styles.cartSummary}>
                <Text style={[styles.cartItemsText, { color: colors.text.secondary }]}>Grand Total</Text>
                <Text style={[styles.cartTotalText, { color: colors.text.primary }]}>{formatCurrency(grandTotal)}</Text>
              </View>
              <Button
                onPress={() => {
                  setCartOpen(false);
                  setCheckoutOpen(true);
                }}
                icon="cash-check"
                style={styles.checkoutButton}
              >
                Checkout
              </Button>
            </View>
          )}
        </ScreenWrapper>
      </Modal>

      {/* ============================================================= */}
      {/* BARCODE MODAL                                                   */}
      {/* ============================================================= */}
      <Modal
        visible={barcodeOpen}
        animationType="slide"
        transparent={scanMode === 'manual'}
        onRequestClose={() => setBarcodeOpen(false)}
      >
        <KeyboardAvoidingView
          style={(scanMode === 'camera' || scanMode === 'multi') ? styles.barcodeCameraBackdrop : styles.barcodeBackdrop}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {scanMode === 'manual' && (
            <TouchableOpacity
              style={styles.barcodeBackdropTouch}
              activeOpacity={1}
              onPress={() => setBarcodeOpen(false)}
            />
          )}
          <View style={[
            styles.barcodeSheet,
            { backgroundColor: colors.surface.default },
            (scanMode === 'camera' || scanMode === 'multi') && styles.barcodeCameraSheet,
          ]}>
            <View style={[styles.barcodeHandle, { backgroundColor: colors.neutral[300] }]} />
            <Text style={[styles.barcodeTitle, { color: colors.text.primary }]}>Add by Barcode</Text>

            {/* Mode toggle tabs */}
            <View style={[styles.scanModeTabs, { backgroundColor: colors.surface.variant, borderColor: colors.border.default }]}>
              <TouchableOpacity
                style={[
                  styles.scanModeTab,
                  scanMode === 'camera' && { backgroundColor: colors.primary.main },
                ]}
                onPress={() => setScanMode('camera')}
              >
                <Icon name="camera" size={16} color={scanMode === 'camera' ? '#fff' : colors.text.secondary} />
                <Text style={[styles.scanModeTabText, { color: scanMode === 'camera' ? '#fff' : colors.text.secondary }]}>
                  Single
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.scanModeTab,
                  scanMode === 'multi' && { backgroundColor: colors.primary.main },
                ]}
                onPress={() => setScanMode('multi')}
              >
                <Icon name="barcode-scan" size={16} color={scanMode === 'multi' ? '#fff' : colors.text.secondary} />
                <Text style={[styles.scanModeTabText, { color: scanMode === 'multi' ? '#fff' : colors.text.secondary }]}>
                  Multi
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.scanModeTab,
                  scanMode === 'manual' && { backgroundColor: colors.primary.main },
                ]}
                onPress={() => setScanMode('manual')}
              >
                <Icon name="keyboard" size={16} color={scanMode === 'manual' ? '#fff' : colors.text.secondary} />
                <Text style={[styles.scanModeTabText, { color: scanMode === 'manual' ? '#fff' : colors.text.secondary }]}>
                  Manual
                </Text>
              </TouchableOpacity>
            </View>

            {/* Camera scanner */}
            {scanMode === 'camera' && (
              <>
                <CameraScannerView
                  isActive={barcodeOpen && scanMode === 'camera'}
                  onCodeScanned={(code) => {
                    if (scanCooldown) return;
                    setScanCooldown(true);
                    handleBarcodeLookup(code);
                    setTimeout(() => setScanCooldown(false), 2000);
                  }}
                  containerStyle={styles.cameraContainer}
                  onFallback={() => setScanMode('manual')}
                />
                {scanCooldown && (
                  <View style={styles.cameraCooldownBadge}>
                    <ActivityIndicator size="small" color="#fff" style={{ marginRight: 8 }} />
                    <Text style={styles.cameraCooldownText}>Processing...</Text>
                  </View>
                )}
                <Text style={[styles.barcodeHint, { color: colors.text.tertiary, textAlign: 'center' }]}>
                  Point the camera at a barcode to scan automatically
                </Text>
              </>
            )}

            {/* Multi-scan mode */}
            {scanMode === 'multi' && (
              <>
                <CameraScannerView
                  isActive={barcodeOpen && scanMode === 'multi'}
                  onCodeScanned={(code) => handleMultiScanCode(code)}
                  containerStyle={styles.multiCameraContainer}
                  multiScan
                />

                <View style={styles.multiQueueHeader}>
                  <Text style={[styles.multiQueueTitle, { color: colors.text.primary }]}>
                    Scanned Items ({multiScanQueue.length})
                  </Text>
                  <View style={{ flexDirection: 'row', gap: spacing[2] }}>
                    {multiScanQueue.length > 0 && (
                      <TouchableOpacity
                        onPress={handleMultiScanClear}
                        style={[styles.multiQueueClearBtn, { borderColor: colors.border.default }]}
                      >
                        <Icon name="delete-sweep" size={16} color={colors.text.secondary} />
                        <Text style={[styles.multiQueueClearText, { color: colors.text.secondary }]}>Clear</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                <ScrollView style={styles.multiQueueList} nestedScrollEnabled>
                  {multiScanQueue.length === 0 ? (
                    <View style={styles.multiQueueEmpty}>
                      <Icon name="barcode-scan" size={36} color={colors.text.tertiary} />
                      <Text style={[styles.multiQueueEmptyText, { color: colors.text.tertiary }]}>
                        Point camera at barcodes to scan
                      </Text>
                    </View>
                  ) : (
                    multiScanQueue.map((item) => (
                      <View
                        key={item.barcode}
                        style={[
                          styles.multiQueueItem,
                          { backgroundColor: colors.surface.variant, borderColor: colors.border.default },
                        ]}
                      >
                        <View style={styles.multiQueueItemInfo}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
                            {item.status === 'loading' && <ActivityIndicator size="small" color={colors.primary.main} />}
                            {item.status === 'found' && <Icon name="check-circle" size={18} color={colors.success.main} />}
                            {item.status === 'not_found' && <Icon name="alert-circle" size={18} color={colors.error.main} />}
                            {item.status === 'out_of_stock' && <Icon name="package-variant-closed-remove" size={18} color={colors.warning.main} />}
                            <Text style={[styles.multiQueueItemBarcode, { color: colors.text.primary }]} numberOfLines={1}>
                              {item.name || item.barcode}
                            </Text>
                          </View>
                          {item.status === 'not_found' && (
                            <Text style={[styles.multiQueueItemStatus, { color: colors.error.main }]}>Not found</Text>
                          )}
                          {item.status === 'out_of_stock' && (
                            <Text style={[styles.multiQueueItemStatus, { color: colors.warning.main }]}>Out of stock</Text>
                          )}
                          {item.status === 'found' && (
                            <Text style={[styles.multiQueueItemStatus, { color: colors.text.tertiary }]}>
                              {item.barcode} · ₹{item.product?.price?.toFixed(2) ?? '0.00'}
                            </Text>
                          )}
                        </View>
                        <View style={styles.multiQueueItemActions}>
                          {item.status === 'found' && (
                            <View style={styles.multiQueueQty}>
                              <Text style={[styles.multiQueueQtyText, { color: colors.primary.main }]}>
                                x{item.quantity}
                              </Text>
                            </View>
                          )}
                          <TouchableOpacity
                            onPress={() => handleMultiScanRemove(item.barcode)}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            <Icon name="close-circle" size={20} color={colors.text.tertiary} />
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))
                  )}
                </ScrollView>

                {multiScanQueue.filter((q) => q.status === 'found').length > 0 && (
                  <Button
                    onPress={handleMultiScanAddAll}
                    icon="cart-plus"
                    style={{ marginTop: spacing[3] }}
                  >
                    Add {multiScanQueue.filter((q) => q.status === 'found').length} Item{multiScanQueue.filter((q) => q.status === 'found').length === 1 ? '' : 's'} to Cart
                  </Button>
                )}
              </>
            )}

            {/* Manual entry */}
            {scanMode === 'manual' && (
              <>
                <Text style={[styles.barcodeSubtitle, { color: colors.text.secondary }]}>
                  Type or paste the product barcode to add it to the cart.
                </Text>
                <TextInput
                  style={[styles.barcodeInput, { borderColor: colors.border.default, color: colors.text.primary, backgroundColor: colors.surface.variant }]}
                  placeholder="Scan or type barcode..."
                  placeholderTextColor={colors.text.tertiary}
                  value={barcodeInput}
                  onChangeText={setBarcodeInput}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  autoFocus
                  returnKeyType="search"
                  onSubmitEditing={() => handleBarcodeLookup(barcodeInput)}
                />
                <View style={styles.barcodeActions}>
                  <Button
                    variant="outlined"
                    onPress={() => {
                      setBarcodeInput('');
                      setBarcodeOpen(false);
                    }}
                    style={{ flex: 1 }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onPress={() => handleBarcodeLookup(barcodeInput)}
                    loading={barcodeLookupLoading}
                    disabled={barcodeLookupLoading || !barcodeInput.trim()}
                    icon="magnify"
                    style={{ flex: 2 }}
                  >
                    Find & Add
                  </Button>
                </View>
                <Text style={[styles.barcodeHint, { color: colors.text.tertiary }]}>
                  Tip: pair a bluetooth barcode scanner -- it types into this field like a keyboard,
                  then Enter auto-adds the product.
                </Text>
              </>
            )}

            {/* Close button for camera/multi mode */}
            {(scanMode === 'camera' || scanMode === 'multi') && (
              <Button
                variant="outlined"
                onPress={() => {
                  setBarcodeInput('');
                  setBarcodeOpen(false);
                }}
                style={{ marginTop: spacing[3] }}
              >
                Close Scanner
              </Button>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ============================================================= */}
      {/* CHECKOUT MODAL                                                  */}
      {/* ============================================================= */}
      <Modal
        visible={checkoutOpen}
        animationType="slide"
        onRequestClose={() => setCheckoutOpen(false)}
      >
        <ScreenWrapper scrollable={false} padding={false}>
          <Header title={isDummyMode ? "Dummy Bill" : "Checkout"} showBack onBackPress={() => setCheckoutOpen(false)} />
          <ScrollView contentContainerStyle={styles.checkoutContent} keyboardShouldPersistTaps="handled">
            {/* Grand total card */}
            <View style={[styles.summaryCard, { backgroundColor: colors.primary.main }]}>
              <Text style={styles.summaryLabel}>Grand Total</Text>
              <Text style={styles.summaryAmount}>{formatCurrency(grandTotal)}</Text>
              <Text style={styles.summaryItems}>{cartItemCount} items</Text>
              {(discountNum > 0 || packingNum > 0) && (
                <View style={styles.summaryBreakdown}>
                  {discountNum > 0 && (
                    <Text style={styles.summaryBreakdownText}>Discount: -{formatCurrency(discountNum)}</Text>
                  )}
                  {packingNum > 0 && (
                    <Text style={styles.summaryBreakdownText}>Packing: +{formatCurrency(packingNum)}</Text>
                  )}
                </View>
              )}
            </View>

            {/* Bill Number Preview */}
            <View style={[styles.billNumberPreview, { backgroundColor: editOrderNumber ? '#6366F120' : colors.surface.variant }]}>
              <Icon name={editOrderNumber ? 'pencil' : 'receipt'} size={18} color={editOrderNumber ? '#6366F1' : colors.primary.main} />
              <Text style={[styles.billNumberText, { color: colors.text.primary }]}>
                {editOrderNumber ? `Editing: ${editOrderNumber}` : 'Bill #: Auto-generated'}
              </Text>
            </View>

            {/* Customer Info */}
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Customer (Optional)</Text>
            <View style={styles.customerRow}>
              <TextInput
                style={[styles.customerInput, { borderColor: colors.border.default, color: colors.text.primary, backgroundColor: colors.surface.variant }]}
                placeholder="Customer Name"
                placeholderTextColor={colors.text.tertiary}
                value={customerName}
                onChangeText={setCustomerName}
              />
              <TextInput
                style={[styles.customerInput, { borderColor: colors.border.default, color: colors.text.primary, backgroundColor: colors.surface.variant }]}
                placeholder="Phone (search)"
                placeholderTextColor={colors.text.tertiary}
                value={customerPhone}
                onChangeText={(t) => { setCustomerPhone(t); setCustomerId(null); setCustomerSearchOpen(true); }}
                keyboardType="phone-pad"
              />
            </View>
            {showCustomerSuggestions && (
              <View style={[styles.customerSuggestions, { backgroundColor: colors.surface.default, borderColor: colors.border.default }]}>
                {customerSearching ? (
                  <View style={{ padding: spacing[3], alignItems: 'center' }}>
                    <ActivityIndicator size="small" color={colors.primary.main} />
                  </View>
                ) : (
                  customerSuggestions.map((c: any) => {
                    const cName = `${c.firstName || ''} ${c.lastName || ''}`.trim() || c.name || 'Customer';
                    return (
                      <TouchableOpacity
                        key={c.id}
                        style={[styles.customerSuggestionItem, { borderBottomColor: colors.border.default }]}
                        onPress={() => selectCustomer(c)}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.suggestionName, { color: colors.text.primary }]}>{cName}</Text>
                          <Text style={[styles.suggestionPhone, { color: colors.text.secondary }]}>{c.phone || c.email || ''}</Text>
                        </View>
                        <Text style={[styles.suggestionOrders, { color: colors.text.tertiary }]}>
                          {c.totalOrders ?? c._count?.orders ?? 0} orders
                        </Text>
                      </TouchableOpacity>
                    );
                  })
                )}
              </View>
            )}

            <TextInput
              style={[styles.customerInput, { borderColor: colors.border.default, color: colors.text.primary, backgroundColor: colors.surface.variant, flex: 0, marginTop: spacing[2] }]}
              placeholder="Address"
              placeholderTextColor={colors.text.tertiary}
              value={customerAddress}
              onChangeText={setCustomerAddress}
              multiline
            />
            <View style={[styles.customerRow, { marginTop: spacing[2] }]}>
              <TextInput
                style={[styles.customerInput, { borderColor: colors.border.default, color: colors.text.primary, backgroundColor: colors.surface.variant }]}
                placeholder="City"
                placeholderTextColor={colors.text.tertiary}
                value={customerCity}
                onChangeText={setCustomerCity}
              />
              <TextInput
                style={[styles.customerInput, { borderColor: colors.border.default, color: colors.text.primary, backgroundColor: colors.surface.variant }]}
                placeholder="Pincode"
                placeholderTextColor={colors.text.tertiary}
                value={customerPincode}
                onChangeText={(t) => setCustomerPincode(t.replace(/\D/g, '').slice(0, 6))}
                keyboardType="number-pad"
              />
            </View>

            {/* Payment Lines (split tender) — hidden for dummy bills */}
            {!isDummyMode && <>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Payment</Text>
              <TouchableOpacity
                onPress={addPaymentLine}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: spacing[1] }}
              >
                <Icon name="plus-circle-outline" size={18} color={colors.primary.main} />
                <Text style={{ color: colors.primary.main, fontSize: 13, fontWeight: '600' }}>Split Payment</Text>
              </TouchableOpacity>
            </View>

            {paymentLines.map((line, idx) => (
              <View key={line.id} style={[styles.paymentLineRow, { borderColor: colors.border.default, backgroundColor: colors.surface.default }]}>
                {/* Method selector */}
                <View style={styles.paymentLineMethodRow}>
                  {PAYMENT_METHODS.map((pm) => (
                    <TouchableOpacity
                      key={pm.value}
                      style={[
                        styles.paymentChipSmall,
                        { borderColor: colors.border.default, backgroundColor: colors.surface.variant },
                        line.method === pm.value && { borderColor: colors.primary.main, backgroundColor: colors.primary.light + '20' },
                      ]}
                      onPress={() => updatePaymentLine(line.id, 'method', pm.value)}
                    >
                      <Icon
                        name={pm.icon}
                        size={16}
                        color={line.method === pm.value ? colors.primary.main : colors.text.tertiary}
                      />
                      <Text
                        style={[
                          { fontSize: 12, color: colors.text.secondary },
                          line.method === pm.value && { color: colors.primary.main, fontWeight: '700' },
                        ]}
                      >
                        {pm.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                  {paymentLines.length > 1 && (
                    <TouchableOpacity
                      onPress={() => removePaymentLine(line.id)}
                      style={{ padding: spacing[1] }}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Icon name="close-circle" size={20} color={colors.error.main} />
                    </TouchableOpacity>
                  )}
                </View>
                {/* Amount input */}
                <TextInput
                  style={[styles.amountInput, { borderColor: colors.border.default, color: colors.text.primary, backgroundColor: colors.surface.variant, marginTop: spacing[2] }]}
                  placeholder={paymentLines.length === 1 ? `₹ ${grandTotal.toFixed(2)}` : '₹ 0.00'}
                  placeholderTextColor={colors.text.tertiary}
                  value={line.amount}
                  onChangeText={(v) => updatePaymentLine(line.id, 'amount', v)}
                  keyboardType="decimal-pad"
                />
                {idx === 0 && paymentLines.length === 1 && (
                  <Text style={[styles.amountHint, { color: colors.text.tertiary }]}>
                    {line.method === 'CASH'
                      ? 'Enter cash received from customer'
                      : line.method === 'UPI'
                        ? 'Enter amount confirmed via UPI'
                        : 'Enter amount charged on card'}
                  </Text>
                )}
              </View>
            ))}

            {/* UPI QR Code section — show if any payment line uses UPI */}
            {paymentLines.some((l) => l.method === 'UPI') && upiVpa && (
              <View style={[styles.upiSection, { backgroundColor: colors.surface.variant, borderColor: colors.border.default }]}>
                <Text style={[styles.upiTitle, { color: colors.text.primary }]}>
                  Customer UPI Payment
                </Text>
                <Text style={[styles.upiHint, { color: colors.text.secondary, marginTop: spacing[1] }]}>
                  Show this QR code to the customer to scan and pay
                </Text>
                <Image
                  source={{
                    uri: `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(
                      `upi://pay?pa=${upiVpa}&pn=${storeName}&am=${grandTotal.toFixed(2)}&cu=INR&tn=POS+Sale`
                    )}`,
                  }}
                  style={styles.upiQrCode}
                  resizeMode="contain"
                />
                <Text style={[styles.upiVpa, { color: colors.primary.main }]}>{upiVpa}</Text>
                <Text style={[styles.upiAmount, { color: colors.text.primary }]}>Amount: {formatCurrency(grandTotal)}</Text>
              </View>
            )}

            {paymentLines.some((l) => l.method === 'UPI') && !upiVpa && (
              <View style={[styles.upiSection, { backgroundColor: colors.warning.light + '20', borderColor: colors.warning.main }]}>
                <Icon name="alert-circle-outline" size={32} color={colors.warning.main} />
                <Text style={[styles.upiTitle, { color: colors.warning.main }]}>UPI Not Configured</Text>
                <Text style={[styles.upiHint, { color: colors.text.secondary }]}>
                  Add a UPI payment method in Settings → Payment Methods to enable QR payments.
                </Text>
              </View>
            )}

            {/* Totals summary for split payment */}
            {totalTendered > 0 && (
              <View style={[styles.changeRow, { backgroundColor: totalTendered >= grandTotal ? colors.success.light + '20' : colors.error.light + '20', marginTop: spacing[3] }]}>
                <View>
                  <Text style={[styles.changeLabel, { color: colors.text.secondary }]}>
                    Total Tendered
                  </Text>
                  <Text style={{ fontSize: 11, color: colors.text.tertiary }}>
                    {paymentLines.length > 1 ? `${paymentLines.length} payment methods` : '1 payment method'}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.changeAmount, { color: colors.text.primary }]}>
                    {formatCurrency(totalTendered)}
                  </Text>
                  {totalTendered >= grandTotal && changeAmount > 0 && (
                    <Text style={{ fontSize: 12, color: colors.success.main, fontWeight: '600' }}>
                      Change: {formatCurrency(changeAmount)}
                    </Text>
                  )}
                  {totalTendered < grandTotal && (
                    <Text style={{ fontSize: 12, color: colors.error.main, fontWeight: '600' }}>
                      Due: {formatCurrency(grandTotal - totalTendered)}
                    </Text>
                  )}
                </View>
              </View>
            )}
            </>}

            {/* Commission Section */}
            <View style={[styles.commissionSection, { borderColor: colors.border.default }]}>
              <View style={styles.commissionHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.sectionTitle, { color: colors.text.primary, marginBottom: 0 }]}>Commission</Text>
                  <Text style={[styles.commissionHint, { color: colors.text.tertiary }]}>Agent/referral tracking</Text>
                </View>
                <Switch
                  value={commissionEnabled}
                  onValueChange={setCommissionEnabled}
                  trackColor={{ false: colors.neutral[200], true: colors.primary.light }}
                  thumbColor={commissionEnabled ? colors.primary.main : colors.neutral[400]}
                />
              </View>

              {commissionEnabled && (
                <View style={styles.commissionFields}>
                  <View style={styles.commissionFieldRow}>
                    <View style={styles.commissionFieldCol}>
                      <Text style={[styles.commissionFieldLabel, { color: colors.text.secondary }]}>Name / Reference</Text>
                      <TextInput
                        style={[styles.commissionFieldInput, { borderColor: colors.border.default, color: colors.text.primary, backgroundColor: colors.surface.variant }]}
                        placeholder="Agent name"
                        placeholderTextColor={colors.text.tertiary}
                        value={commissionName}
                        onChangeText={setCommissionName}
                      />
                    </View>
                    <View style={[styles.commissionFieldCol, { flex: 0.6 }]}>
                      <Text style={[styles.commissionFieldLabel, { color: colors.text.secondary }]}>Percentage (%)</Text>
                      <TextInput
                        style={[styles.commissionFieldInput, { borderColor: colors.border.default, color: colors.text.primary, backgroundColor: colors.surface.variant }]}
                        placeholder="0"
                        placeholderTextColor={colors.text.tertiary}
                        value={commissionPct}
                        onChangeText={setCommissionPct}
                        keyboardType="decimal-pad"
                      />
                    </View>
                  </View>
                  <Text style={[styles.commissionFieldLabel, { color: colors.text.secondary }]}>Notes (Optional)</Text>
                  <TextInput
                    style={[styles.commissionFieldInput, { borderColor: colors.border.default, color: colors.text.primary, backgroundColor: colors.surface.variant }]}
                    placeholder="Commission notes..."
                    placeholderTextColor={colors.text.tertiary}
                    value={commissionNotes}
                    onChangeText={setCommissionNotes}
                    multiline
                    numberOfLines={2}
                  />
                  {commissionPct && Number(commissionPct) > 0 && (
                    <View style={[styles.commissionCalc, { backgroundColor: colors.primary.light + '20' }]}>
                      <Text style={[styles.commissionCalcText, { color: colors.primary.main }]}>
                        Commission: {formatCurrency((grandTotal * Number(commissionPct)) / 100)} ({commissionPct}% of {formatCurrency(grandTotal)})
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </View>

            {isDummyMode ? (
              <Button
                onPress={() => submitDummy.mutate()}
                loading={submitDummy.isPending}
                disabled={submitDummy.isPending || cart.items.length === 0}
                icon="file-hidden"
                style={{ marginTop: spacing[6], backgroundColor: '#D97706' }}
              >
                {`Save Dummy Bill — ${formatCurrency(grandTotal)}`}
              </Button>
            ) : (
              <>
                {/* Complete Sale Button */}
                <Button
                  onPress={() => submitSale.mutate()}
                  loading={submitSale.isPending}
                  disabled={submitSale.isPending || submitEstimate.isPending || cart.items.length === 0}
                  icon="check"
                  style={{ marginTop: spacing[6] }}
                >
                  {totalTendered > 0 && totalTendered < grandTotal
                    ? `Save Partial — Due ${formatCurrency(grandTotal - totalTendered)}`
                    : `Complete Sale — ${formatCurrency(grandTotal)}`}
                </Button>

                {/* Save as Estimate Button */}
                <Button
                  onPress={() => submitEstimate.mutate()}
                  loading={submitEstimate.isPending}
                  disabled={submitSale.isPending || submitEstimate.isPending || cart.items.length === 0}
                  icon="file-document-outline"
                  style={{ marginTop: spacing[3], backgroundColor: '#6B7280' }}
                >
                  {`Save as Estimate — ${formatCurrency(grandTotal)}`}
                </Button>
              </>
            )}
          </ScrollView>
        </ScreenWrapper>
      </Modal>

      {/* ============================================================= */}
      {/* HELD BILLS MODAL                                                */}
      {/* ============================================================= */}
      <Modal
        visible={heldBillsOpen}
        animationType="slide"
        onRequestClose={() => setHeldBillsOpen(false)}
      >
        <ScreenWrapper scrollable={false} padding={false}>
          <Header
            title={`Held Bills (${heldBills.length})`}
            showBack
            onBackPress={() => setHeldBillsOpen(false)}
          />
          <ScrollView contentContainerStyle={styles.heldBillsContent}>
            {heldBills.length === 0 ? (
              <Empty icon="tray-remove" title="No held bills" description="Hold a bill from the cart to see it here" />
            ) : (
              heldBills.map((bill) => {
                const billItems = bill.cartSnapshot?.items?.length || 0;
                const billTotal = bill.cartSnapshot?.items?.reduce(
                  (s: number, i: any) => s + (i.price || 0) * (i.quantity || 0), 0
                ) || 0;
                const timeSince = Math.round((Date.now() - bill.createdAt) / 60000);
                return (
                  <View key={bill.id} style={[styles.heldBillCard, { backgroundColor: colors.surface.default, borderColor: colors.border.default }]}>
                    <View style={styles.heldBillHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.heldBillLabel, { color: colors.text.primary }]}>{bill.label}</Text>
                        <Text style={[styles.heldBillMeta, { color: colors.text.tertiary }]}>
                          {billItems} items · {formatCurrency(billTotal)} · {timeSince < 60 ? `${timeSince}m ago` : `${Math.round(timeSince / 60)}h ago`}
                        </Text>
                        {bill.customerPhone ? (
                          <Text style={[styles.heldBillMeta, { color: colors.text.tertiary }]}>
                            <Icon name="phone" size={10} color={colors.text.tertiary} /> {bill.customerPhone}
                          </Text>
                        ) : null}
                      </View>
                      <Text style={[styles.heldBillTotal, { color: colors.primary.main }]}>
                        {formatCurrency(billTotal)}
                      </Text>
                    </View>
                    {/* Items preview */}
                    <View style={[styles.heldBillItems, { backgroundColor: colors.surface.variant }]}>
                      {(bill.cartSnapshot?.items || []).slice(0, 3).map((item: any, idx: number) => (
                        <Text key={idx} style={[styles.heldBillItemText, { color: colors.text.secondary }]} numberOfLines={1}>
                          {item.quantity}× {item.product?.name || 'Product'}
                        </Text>
                      ))}
                      {billItems > 3 && (
                        <Text style={[styles.heldBillItemText, { color: colors.text.tertiary }]}>
                          +{billItems - 3} more items...
                        </Text>
                      )}
                    </View>
                    <View style={styles.heldBillActions}>
                      <Button
                        onPress={() => resumeBill(bill)}
                        icon="play"
                        style={{ flex: 1 }}
                      >
                        Resume
                      </Button>
                      <TouchableOpacity
                        style={[styles.heldBillDeleteBtn, { backgroundColor: colors.error.light + '20' }]}
                        onPress={() => deleteHeldBill(bill.id)}
                      >
                        <Icon name="trash-can-outline" size={20} color={colors.error.main} />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>
        </ScreenWrapper>
      </Modal>
    </ScreenWrapper>
  );
};

/* ================================================================== */
/*  STYLES                                                             */
/* ================================================================== */
const styles = StyleSheet.create({
  loadingCenter: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  searchContainer: { paddingHorizontal: spacing[4], paddingVertical: spacing[2] },
  searchBar: { borderRadius: borderRadius.lg, elevation: 0 },
  searchInput: { fontSize: 14 },
  filtersContainer: { borderBottomWidth: 1 },
  filtersList: { paddingHorizontal: spacing[4], paddingVertical: spacing[2], gap: spacing[2] },
  filterChip: { marginRight: spacing[2] },
  filterChipText: { fontSize: 13 },
  listContent: { padding: spacing[4] },
  row: { justifyContent: 'space-between' },
  productCard: {
    width: '48%',
    borderRadius: borderRadius.lg,
    marginBottom: spacing[3],
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  productImage: { width: '100%', height: 120 },
  imagePlaceholder: { justifyContent: 'center', alignItems: 'center' },
  cartBadge: {
    position: 'absolute',
    top: spacing[2],
    right: spacing[2],
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartBadgeText: { fontSize: 12, fontWeight: '700' },
  dealBadge: {
    position: 'absolute',
    top: spacing[2],
    left: spacing[2],
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  dealBadgeText: { color: '#fff', fontSize: 9, fontWeight: '800' },
  productInfo: { padding: spacing[3] },
  productName: { fontSize: 14, fontWeight: '500', marginBottom: spacing[1], minHeight: 36 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing[2] },
  productPrice: { fontSize: 16, fontWeight: '700' },
  productPriceStrike: { fontSize: 11, textDecorationLine: 'line-through' },
  productStock: { fontSize: 11, marginTop: spacing[1] },
  addButton: {
    position: 'absolute',
    bottom: spacing[3],
    right: spacing[3],
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartFooter: {
    padding: spacing[4],
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
    flexShrink: 0,
    width: '100%',
  },
  cartSummary: { flex: 1, flexShrink: 1, minWidth: 80 },
  cartButtonsRow: { flexDirection: 'row', flexShrink: 0, marginLeft: spacing[2] },
  cartItemsText: { fontSize: 14 },
  cartTotalText: { fontSize: 20, fontWeight: '700' },
  checkoutButton: { minWidth: 140, marginLeft: spacing[2] },

  // Held bills bar
  heldBillsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    marginHorizontal: spacing[4],
    marginBottom: spacing[1],
    borderRadius: borderRadius.md,
    borderWidth: 1,
    gap: spacing[2],
  },
  heldBillsBarText: { flex: 1, fontSize: 13, fontWeight: '600' },

  // Cart modal
  cartContent: { padding: spacing[4], paddingBottom: spacing[24] },
  cartItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[3],
    borderRadius: borderRadius.md,
    marginBottom: spacing[2],
  },
  cartItemName: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  cartItemPrice: { fontSize: 12 },
  qtyControls: { flexDirection: 'row', alignItems: 'center' },
  qtyBtn: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyValue: { minWidth: 32, textAlign: 'center', fontWeight: '700' },

  // Extra charges (discount + packing) in cart
  extraChargesSection: {
    marginTop: spacing[3],
    paddingTop: spacing[3],
    borderTopWidth: 1,
  },
  extraChargesRow: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  extraChargesField: { flex: 1 },
  extraChargesLabel: { fontSize: 12, fontWeight: '600' as const },
  extraChargesLabelRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: spacing[1],
  },
  modeToggle: {
    flexDirection: 'row' as const,
    borderRadius: 4,
    overflow: 'hidden' as const,
  },
  modeBtn: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: '#E5E7EB',
  },
  modeBtnText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: '#6B7280',
  },
  extraChargesInput: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },

  // Coupon
  couponRow: {
    flexDirection: 'row' as const,
    gap: spacing[2],
    alignItems: 'center' as const,
  },
  couponInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    fontSize: 14,
    fontWeight: '600' as const,
  },
  couponApplyBtn: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2.5],
    borderRadius: borderRadius.md,
    minWidth: 70,
    alignItems: 'center' as const,
  },
  couponApplyText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700' as const,
  },
  appliedCouponRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
  },
  appliedCouponInfo: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing[2],
  },
  appliedCouponText: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  // Auto offers
  autoOffersSection: {
    marginTop: spacing[2],
    padding: spacing[3],
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  autoOffersHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing[1],
    marginBottom: spacing[1],
  },
  autoOffersTitle: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: '#10B981',
  },
  autoOfferItem: {
    fontSize: 12,
    color: '#059669',
    marginLeft: spacing[5],
  },

  // Totals breakdown
  totalsCard: {
    marginTop: spacing[3],
    padding: spacing[4],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing[1],
  },
  totalsLabel: { fontSize: 14 },
  totalsValue: { fontSize: 14, fontWeight: '600' },
  totalsFinalRow: {
    marginTop: spacing[2],
    paddingTop: spacing[2],
    borderTopWidth: 1,
    marginBottom: 0,
  },
  totalsFinalLabel: { fontSize: 16, fontWeight: '700' },
  totalsFinalValue: { fontSize: 18, fontWeight: '800' },

  // Checkout modal
  checkoutContent: { padding: spacing[4] },
  summaryCard: {
    padding: spacing[6],
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    marginBottom: spacing[6],
  },
  summaryLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 13 },
  summaryAmount: { color: '#fff', fontSize: 32, fontWeight: '800', marginTop: spacing[1] },
  summaryItems: { color: 'rgba(255,255,255,0.85)', fontSize: 12, marginTop: spacing[1] },
  summaryBreakdown: {
    flexDirection: 'row',
    gap: spacing[3],
    marginTop: spacing[2],
    paddingTop: spacing[2],
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
  },
  summaryBreakdownText: { color: 'rgba(255,255,255,0.7)', fontSize: 11 },
  billNumberPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    padding: spacing[3],
    borderRadius: borderRadius.md,
    marginBottom: spacing[3],
  },
  billNumberText: { fontSize: 15, fontWeight: '600' },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: spacing[3],
  },
  paymentRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2], marginBottom: spacing[2] },
  paymentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderRadius: borderRadius.md,
    borderWidth: 2,
    minWidth: 100,
  },
  paymentChipText: { fontSize: 14, fontWeight: '600' },

  // Split-tender payment line
  paymentLineRow: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing[3],
    marginBottom: spacing[2],
  },
  paymentLineMethodRow: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: spacing[2],
    alignItems: 'center' as const,
  },
  paymentChipSmall: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.sm,
    borderWidth: 1.5,
  },

  // Amount paid
  amountInput: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    fontSize: 20,
    fontWeight: '700' as const,
    textAlign: 'center' as const,
  },
  amountHint: {
    fontSize: 11,
    marginTop: spacing[1],
    textAlign: 'center' as const,
  },
  changeRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    padding: spacing[3],
    borderRadius: borderRadius.md,
    marginTop: spacing[2],
  },
  changeLabel: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  changeAmount: {
    fontSize: 20,
    fontWeight: '800' as const,
  },

  // Commission section
  commissionSection: {
    marginTop: spacing[4],
    paddingTop: spacing[4],
    borderTopWidth: 1,
  },
  commissionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  commissionHint: {
    fontSize: 11,
    marginTop: 2,
  },
  commissionFields: {
    marginTop: spacing[3],
  },
  commissionFieldRow: {
    flexDirection: 'row',
    gap: spacing[3],
    marginBottom: spacing[2],
  },
  commissionFieldCol: {
    flex: 1,
  },
  commissionFieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: spacing[1],
  },
  commissionFieldInput: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    fontSize: 14,
    marginBottom: spacing[2],
  },
  commissionCalc: {
    padding: spacing[3],
    borderRadius: borderRadius.md,
    marginTop: spacing[1],
  },
  commissionCalcText: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },

  // Barcode modal
  barcodeBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  barcodeCameraBackdrop: { flex: 1, justifyContent: 'flex-end' },
  barcodeBackdropTouch: { flex: 1 },
  barcodeSheet: {
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingHorizontal: spacing[5],
    paddingTop: spacing[3],
    paddingBottom: spacing[6],
  },
  barcodeCameraSheet: {
    flex: 1,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
  },
  scanModeTabs: {
    flexDirection: 'row',
    borderRadius: borderRadius.md,
    padding: 3,
    marginBottom: spacing[4],
    marginTop: spacing[2],
  },
  scanModeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[2],
    borderRadius: borderRadius.sm,
    gap: spacing[1],
  },
  scanModeTabText: {
    fontSize: 13,
    fontWeight: '600',
  },
  cameraContainer: {
    height: 300,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    marginBottom: spacing[3],
  },
  cameraOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraTarget: {
    width: 250,
    height: 150,
    borderWidth: 2,
    borderColor: '#fff',
    borderRadius: borderRadius.lg,
    backgroundColor: 'transparent',
  },
  cameraCooldownBadge: {
    position: 'absolute',
    bottom: 16,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  cameraCooldownText: {
    color: '#fff',
    fontSize: 13,
  },
  cameraPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: borderRadius.lg,
  },
  cameraPlaceholderText: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: spacing[2],
    paddingHorizontal: spacing[4],
  },
  barcodeHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: spacing[3],
  },
  barcodeTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  barcodeSubtitle: {
    fontSize: 13,
    marginBottom: spacing[4],
  },
  barcodeInput: {
    borderWidth: 2,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  barcodeActions: {
    flexDirection: 'row',
    gap: spacing[3],
    marginTop: spacing[4],
  },
  barcodeHint: {
    fontSize: 11,
    marginTop: spacing[3],
    fontStyle: 'italic',
  },

  // Multi-scan queue
  multiCameraContainer: {
    height: 180,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    marginBottom: spacing[2],
  },
  multiQueueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[2],
    marginTop: spacing[2],
  },
  multiQueueTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  multiQueueClearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.sm,
    borderWidth: 1,
  },
  multiQueueClearText: {
    fontSize: 12,
    fontWeight: '600',
  },
  multiQueueList: {
    maxHeight: 240,
  },
  multiQueueEmpty: {
    alignItems: 'center',
    paddingVertical: spacing[6],
    gap: spacing[2],
  },
  multiQueueEmptyText: {
    fontSize: 13,
  },
  multiQueueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing[3],
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginBottom: spacing[2],
  },
  multiQueueItemInfo: {
    flex: 1,
    marginRight: spacing[2],
  },
  multiQueueItemBarcode: {
    fontSize: 14,
    fontWeight: '600',
    flexShrink: 1,
  },
  multiQueueItemStatus: {
    fontSize: 11,
    marginTop: 2,
    marginLeft: 26,
  },
  multiQueueItemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  multiQueueQty: {
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  multiQueueQtyText: {
    fontSize: 14,
    fontWeight: '700',
  },

  // UPI section
  upiSection: {
    marginTop: spacing[4],
    padding: spacing[4],
    borderRadius: borderRadius.lg,
    alignItems: 'center' as const,
    borderWidth: 1,
  },
  upiTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    marginTop: spacing[2],
  },
  upiVpa: {
    fontSize: 14,
    fontWeight: '600' as const,
    marginTop: spacing[1],
  },
  upiAmount: {
    fontSize: 18,
    fontWeight: '800' as const,
    marginTop: spacing[2],
  },
  upiQrCode: {
    width: 220,
    height: 220,
    marginVertical: spacing[3],
    borderRadius: borderRadius.md,
    backgroundColor: '#fff',
  },
  upiHint: {
    fontSize: 12,
    textAlign: 'center' as const,
    marginTop: spacing[2],
  },

  // Customer info
  customerRow: {
    flexDirection: 'row' as const,
    gap: spacing[3],
    marginBottom: spacing[4],
  },
  customerInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    fontSize: 14,
  },
  customerSuggestions: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    marginTop: -spacing[3],
    marginBottom: spacing[4],
    overflow: 'hidden' as const,
  },
  customerSuggestionItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
  },
  suggestionName: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  suggestionPhone: {
    fontSize: 12,
    marginTop: 1,
  },
  suggestionOrders: {
    fontSize: 11,
  },

  // Held bills modal
  heldBillsContent: {
    padding: spacing[4],
    paddingBottom: spacing[8],
  },
  heldBillCard: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: spacing[4],
    marginBottom: spacing[3],
  },
  heldBillHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing[3],
  },
  heldBillLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
  heldBillMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  heldBillTotal: {
    fontSize: 18,
    fontWeight: '800',
  },
  heldBillItems: {
    padding: spacing[3],
    borderRadius: borderRadius.md,
    marginBottom: spacing[3],
  },
  heldBillItemText: {
    fontSize: 12,
    marginBottom: 2,
  },
  heldBillActions: {
    flexDirection: 'row',
    gap: spacing[2],
    alignItems: 'center',
  },
  heldBillDeleteBtn: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
