import React, { useEffect, useState, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
let Camera: any = null;
let useCameraDeviceImport: any = () => null;
let useCodeScannerImport: any = () => ({});
let cameraAvailable = false;

try {
  const visionCamera = require('react-native-vision-camera');
  Camera = visionCamera.Camera;
  useCameraDeviceImport = visionCamera.useCameraDevice;
  useCodeScannerImport = visionCamera.useCodeScanner;
  cameraAvailable = true;
} catch (e) {
  console.log('Vision camera not available');
}

import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/common';
import { useTheme } from '@/theme';
import { spacing, borderRadius } from '@/theme/spacing';
import { productsApi } from '@/services/api';
import { usePOSStore } from '@/store';
import { resolveImageUrl } from '@/utils/imageUrl';
import type { POSStackParamList } from '@/types/navigation';

type NavigationProp = NativeStackNavigationProp<POSStackParamList, 'POSMain'>;

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
    images: resolveImageUrl(imgs[0]) ? [resolveImageUrl(imgs[0]) as string] : [],
  };
}

/**
 * Full-screen camera view that scans EAN-13 / Code-128 / QR barcodes.
 *
 * Uses react-native-vision-camera's built-in `useCodeScanner` (v4+). On every
 * detected code we pause scanning, look the product up via the backend, then
 * add it to the POS cart and navigate back. If the product isn't found we
 * show a non-blocking toast and resume scanning so the user can try another.
 */
export const POSBarcodeScannerScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { colors } = useTheme();
  const device = useCameraDeviceImport('back');
  const addToCart = usePOSStore((s) => s.addToCart);

  const [permissionStatus, setPermissionStatus] = useState<
    'checking' | 'granted' | 'denied'
  >('checking');
  const [torchOn, setTorchOn] = useState(false);
  const [busy, setBusy] = useState(false);
  // Guard against the scanner firing for the same code many times per second.
  const lastScannedRef = useRef<string | null>(null);
  const lastScannedAtRef = useRef<number>(0);

  // Request camera permission on mount.
  useEffect(() => {
    if (!cameraAvailable || !Camera) {
      setPermissionStatus('denied');
      return;
    }
    let cancelled = false;
    (async () => {
      const current = await Camera.getCameraPermissionStatus();
      if (current === 'granted') {
        if (!cancelled) setPermissionStatus('granted');
        return;
      }
      const requested = await Camera.requestCameraPermission();
      if (!cancelled) setPermissionStatus(requested === 'granted' ? 'granted' : 'denied');
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleScannedCode = async (code: string) => {
    const now = Date.now();
    // Ignore repeats of the same code within 2 seconds.
    if (code === lastScannedRef.current && now - lastScannedAtRef.current < 2000) return;
    lastScannedRef.current = code;
    lastScannedAtRef.current = now;

    setBusy(true);
    try {
      const result = await productsApi.getProductByBarcode(code);
      if (!result) {
        Alert.alert('Not Found', `No product matches barcode "${code}"`);
        return;
      }
      const normalized = normalizeProduct(result);
      if (normalized.stock <= 0) {
        Alert.alert('Out of Stock', `"${normalized.name}" has no stock available.`);
        return;
      }
      addToCart(normalized as any, 1);
      navigation.goBack();
    } catch (err: any) {
      Alert.alert('Lookup Failed', err?.message || 'Could not find product');
    } finally {
      setBusy(false);
    }
  };

  const codeScanner = useCodeScannerImport({
    codeTypes: ['ean-13', 'ean-8', 'code-128', 'code-39', 'qr', 'upc-a', 'upc-e'],
    onCodeScanned: (codes) => {
      const value = codes[0]?.value;
      if (value && !busy) {
        handleScannedCode(value);
      }
    },
  });

  // --- Render states ---

  if (permissionStatus === 'checking') {
    return (
      <ScreenWrapper>
        <Header title="Scan Barcode" showBack />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary.main} />
        </View>
      </ScreenWrapper>
    );
  }

  if (permissionStatus === 'denied') {
    return (
      <ScreenWrapper>
        <Header title="Scan Barcode" showBack />
        <View style={styles.center}>
          <Icon name="camera-off-outline" size={64} color={colors.neutral[300]} />
          <Text style={[styles.errorTitle, { color: colors.text.primary }]}>
            Camera permission denied
          </Text>
          <Text style={[styles.errorText, { color: colors.text.secondary }]}>
            Enable camera access in your phone's Settings to scan barcodes.
          </Text>
          <Button
            onPress={async () => {
              if (!cameraAvailable || !Camera) return;
              const status = await Camera.requestCameraPermission();
              setPermissionStatus(status === 'granted' ? 'granted' : 'denied');
            }}
            style={{ marginTop: spacing[4] }}
          >
            Request Permission
          </Button>
        </View>
      </ScreenWrapper>
    );
  }

  if (!device) {
    return (
      <ScreenWrapper>
        <Header title="Scan Barcode" showBack />
        <View style={styles.center}>
          <Icon name="camera-off-outline" size={64} color={colors.neutral[300]} />
          <Text style={[styles.errorTitle, { color: colors.text.primary }]}>
            No camera available
          </Text>
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <View style={styles.container}>
      {cameraAvailable && Camera && device && (
        <Camera
          style={StyleSheet.absoluteFill}
          device={device}
          isActive={!busy}
          codeScanner={codeScanner}
          torch={torchOn ? 'on' : 'off'}
        />
      )}

      {/* Overlay UI */}
      <View style={styles.overlay} pointerEvents="box-none">
        {/* Top bar */}
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.topBtn} onPress={() => navigation.goBack()}>
            <Icon name="close" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.topTitle}>Point the camera at a barcode</Text>
          <TouchableOpacity style={styles.topBtn} onPress={() => setTorchOn((v) => !v)}>
            <Icon name={torchOn ? 'flash' : 'flash-off'} size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Scan frame */}
        <View style={styles.frameWrap} pointerEvents="none">
          <View style={styles.frame}>
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
          </View>
        </View>

        {/* Bottom status */}
        <View style={styles.bottomBar}>
          {busy ? (
            <View style={styles.busyRow}>
              <ActivityIndicator color="#fff" />
              <Text style={styles.bottomText}>Looking up product…</Text>
            </View>
          ) : (
            <Text style={styles.bottomText}>Align the barcode inside the box</Text>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing[6] },
  errorTitle: { fontSize: 18, fontWeight: '600', marginTop: spacing[3] },
  errorText: { fontSize: 13, textAlign: 'center', marginTop: spacing[2] },
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'space-between' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[3],
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  topBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  topTitle: { color: '#fff', fontSize: 13, fontWeight: '600', flex: 1, textAlign: 'center', marginHorizontal: spacing[2] },
  frameWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  frame: {
    width: 280,
    height: 200,
    borderRadius: borderRadius.md,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderColor: '#fff',
  },
  cornerTL: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 8 },
  cornerTR: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 8 },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 8 },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 8 },
  bottomBar: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[4],
    paddingBottom: 40,
  },
  bottomText: { color: '#fff', textAlign: 'center', fontSize: 13 },
  busyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing[2] },
});
