import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  Vibration,
  Modal,
  Linking,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { ScreenWrapper, Header } from '@/components/layout';
import { Button } from '@/components/common';
import { useTheme } from '@/theme';
import { spacing, borderRadius } from '@/theme/spacing';
import { mockProducts } from '@/data/mock';
import { usePOSStore } from '@/store';
import { formatCurrency } from '@/utils';
import type { Product, POSCartItem } from '@/types';

// Try to import vision camera, but make it optional
let Camera: any = null;
let useCameraDevice: any = () => null;
let useCameraPermission: any = () => ({ hasPermission: false, requestPermission: async () => false });
let useCodeScanner: any = () => ({});
let cameraAvailable = false;

try {
  const visionCamera = require('react-native-vision-camera');
  Camera = visionCamera.Camera;
  useCameraDevice = visionCamera.useCameraDevice;
  useCameraPermission = visionCamera.useCameraPermission;
  useCodeScanner = visionCamera.useCodeScanner;
  cameraAvailable = true;
} catch (e) {
  console.log('Vision camera not available, using text input only');
}

// Track scanned item for bulk scanning display
interface ScannedItem {
  barcode: string;
  productName: string;
  timestamp: number;
}

export const POSMainScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [lastScannedProduct, setLastScannedProduct] = useState<string | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [isScanning, setIsScanning] = useState(true);
  const [bulkScannedItems, setBulkScannedItems] = useState<ScannedItem[]>([]);
  const [lastScannedBarcode, setLastScannedBarcode] = useState<string>('');
  const [scanCooldown, setScanCooldown] = useState(false);
  const barcodeInputRef = useRef<TextInput>(null);

  const { cart, addToCart, removeFromCart, updateQuantity, clearCart, completeSale, saveDraft, draftOrders } = usePOSStore();
  const cartItemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);

  // Camera hooks — always called unconditionally to satisfy React Rules of Hooks.
  // When the vision-camera module isn't available the imported stubs return safe defaults.
  const cameraPermission = useCameraPermission();
  const { hasPermission, requestPermission } = cameraPermission;
  const device = useCameraDevice('back');

  const codeScanner = useCodeScanner({
    codeTypes: ['qr', 'ean-13', 'ean-8', 'code-128', 'code-39', 'code-93', 'upc-a', 'upc-e'],
    onCodeScanned: (codes: any[]) => {
      if (!cameraAvailable) return;
      if (codes.length > 0 && isScanning && !scanCooldown) {
        const scannedCode = codes[0].value;

        if (scannedCode && scannedCode !== lastScannedBarcode) {
          setScanCooldown(true);
          setLastScannedBarcode(scannedCode);

          const product = findProductByBarcode(scannedCode);
          if (product) {
            addToCart(product, 1);
            setLastScannedProduct(product.name);

            setBulkScannedItems(prev => [{
              barcode: scannedCode,
              productName: product.name,
              timestamp: Date.now(),
            }, ...prev].slice(0, 10));

            try {
              Vibration.vibrate(100);
            } catch (e) {}
          } else {
            try {
              Vibration.vibrate([0, 100, 50, 100]);
            } catch (e) {}
            setBulkScannedItems(prev => [{
              barcode: scannedCode,
              productName: '❌ Not Found',
              timestamp: Date.now(),
            }, ...prev].slice(0, 10));
          }

          setTimeout(() => {
            setScanCooldown(false);
            setTimeout(() => setLastScannedBarcode(''), 1500);
          }, 500);
        }
      }
    },
  });

  // Open camera scanner
  const openScanner = async () => {
    if (!cameraAvailable) {
      Alert.alert(
        'Camera Not Available',
        'Please type the barcode/SKU in the input field instead.',
        [{ text: 'OK' }]
      );
      barcodeInputRef.current?.focus();
      return;
    }
    if (!hasPermission) {
      const granted = await requestPermission();
      if (!granted) {
        Alert.alert(
          'Camera Permission Required',
          'Please grant camera permission to scan barcodes',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
          ]
        );
        return;
      }
    }
    // Reset bulk scanning state
    setBulkScannedItems([]);
    setLastScannedBarcode('');
    setScanCooldown(false);
    setIsScanning(true);
    setShowScanner(true);
  };

  // Close scanner and finalize bulk scan
  const closeScanner = () => {
    const scannedCount = bulkScannedItems.filter(i => !i.productName.includes('Not Found')).length;
    setShowScanner(false);
    setIsScanning(false);
    setBulkScannedItems([]);
    setLastScannedBarcode('');
    setScanCooldown(false);
    if (scannedCount > 0) {
      setLastScannedProduct(`${scannedCount} items added`);
    }
  };

  // Auto-focus barcode input when screen loads
  useEffect(() => {
    const timer = setTimeout(() => {
      barcodeInputRef.current?.focus();
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  // Find product by SKU or barcode
  const findProductByBarcode = useCallback((barcode: string): Product | undefined => {
    const normalizedBarcode = barcode.trim().toUpperCase();
    return mockProducts.find(
      (p) =>
        (p.sku.toUpperCase() === normalizedBarcode ||
          p.barcode === barcode.trim()) &&
        p.isActive &&
        p.stock > 0
    );
  }, []);

  // Process single barcode
  const processBarcode = useCallback((barcode: string) => {
    const product = findProductByBarcode(barcode);
    if (product) {
      addToCart(product, 1);
      setLastScannedProduct(product.name);
      try {
        Vibration.vibrate(100); // Short vibration for feedback
      } catch (e) {
        // Vibration permission not granted, ignore
      }
      return true;
    }
    return false;
  }, [findProductByBarcode, addToCart]);

  // Handle barcode input (supports single and batch scanning)
  const handleBarcodeSubmit = useCallback(() => {
    if (!barcodeInput.trim()) return;

    // Split by common separators (newline, comma, space, tab)
    const barcodes = barcodeInput
      .split(/[\n,\t\s]+/)
      .map((b) => b.trim())
      .filter((b) => b.length > 0);

    let successCount = 0;
    let failedBarcodes: string[] = [];

    barcodes.forEach((barcode) => {
      if (processBarcode(barcode)) {
        successCount++;
      } else {
        failedBarcodes.push(barcode);
      }
    });

    // Clear input
    setBarcodeInput('');

    // Show feedback for batch scanning
    if (barcodes.length > 1) {
      if (failedBarcodes.length > 0) {
        Alert.alert(
          'Scan Results',
          `Added: ${successCount} items\nNot found: ${failedBarcodes.join(', ')}`
        );
      }
    } else if (failedBarcodes.length > 0) {
      Alert.alert('Product Not Found', `No product found with barcode: ${failedBarcodes[0]}`);
      try {
        Vibration.vibrate([0, 100, 50, 100]); // Double vibration for error
      } catch (e) {
        // Vibration permission not granted, ignore
      }
    }

    // Re-focus input for continuous scanning
    barcodeInputRef.current?.focus();
  }, [barcodeInput, processBarcode]);

  // Handle quantity change
  const handleQuantityChange = (productId: string, change: number) => {
    const item = cart.items.find((i) => i.productId === productId);
    if (item) {
      const newQuantity = item.quantity + change;
      if (newQuantity <= 0) {
        removeFromCart(productId);
      } else {
        updateQuantity(productId, newQuantity);
      }
    }
  };

  // Handle Print action
  const handlePrint = () => {
    if (cart.items.length === 0) {
      Alert.alert('Empty Cart', 'Please add products before printing');
      return;
    }
    Alert.alert(
      'Print Bill',
      `Total: ${formatCurrency(cart.total)}\n${cartItemCount} items`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Print',
          onPress: () => {
            const sale = completeSale();
            console.log('Sale completed:', sale);
            Alert.alert('Success', `Bill ${sale.receiptNumber} printed successfully!`);
          },
        },
      ]
    );
  };

  // Handle Draft/Hold action
  const handleDraft = () => {
    if (cart.items.length === 0) {
      Alert.alert('Empty Cart', 'Please add products before saving as draft');
      return;
    }
    Alert.alert(
      'Save as Draft',
      'This order will be saved for later',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Save Draft',
          onPress: () => {
            const draft = saveDraft();
            console.log('Draft saved:', draft);
            Alert.alert('Success', `Draft ${draft.receiptNumber} saved!`);
          },
        },
      ]
    );
  };

  // Navigate to sales history
  const goToHistory = () => {
    navigation.navigate('POSSalesHistory');
  };

  // Render cart item
  const renderCartItem = ({ item }: { item: POSCartItem }) => (
    <View style={styles.cartItem}>
      <View style={styles.cartItemInfo}>
        <Text style={styles.cartItemName} numberOfLines={1}>
          {item.product.name}
        </Text>
        <Text style={styles.cartItemSku}>{item.product.sku}</Text>
        <Text style={styles.cartItemPrice}>
          {formatCurrency(item.price)} × {item.quantity} = {formatCurrency(item.total)}
        </Text>
      </View>
      <View style={styles.quantityControls}>
        <TouchableOpacity
          style={styles.quantityButton}
          onPress={() => handleQuantityChange(item.productId, -1)}
        >
          <Icon name="minus" size={18} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.quantityText}>{item.quantity}</Text>
        <TouchableOpacity
          style={styles.quantityButton}
          onPress={() => handleQuantityChange(item.productId, 1)}
        >
          <Icon name="plus" size={18} color={colors.text.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => removeFromCart(item.productId)}
        >
          <Icon name="trash-can-outline" size={20} color={colors.error.main} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <ScreenWrapper scrollable={false} padding={false}>
      <Header
        title="Point of Sale"
        showDrawer
        actions={[
          {
            icon: 'history',
            onPress: goToHistory,
            badge: draftOrders.length > 0 ? draftOrders.length : undefined,
          },
          {
            icon: 'delete-sweep',
            onPress: () => {
              if (cart.items.length > 0) {
                Alert.alert('Clear Cart', 'Remove all items?', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Clear', style: 'destructive', onPress: clearCart },
                ]);
              }
            },
          },
        ]}
      />

      {/* Barcode Scanner Input */}
      <View style={styles.barcodeSection}>
        <View style={styles.barcodeInputContainer}>
          <TouchableOpacity onPress={openScanner} style={styles.scannerButton}>
            <Icon name="barcode-scan" size={24} color={colors.primary.main} />
          </TouchableOpacity>
          <TextInput
            ref={barcodeInputRef}
            style={styles.barcodeInput}
            placeholder="Tap icon to scan or type SKU..."
            placeholderTextColor={colors.text.tertiary}
            value={barcodeInput}
            onChangeText={setBarcodeInput}
            onSubmitEditing={handleBarcodeSubmit}
            autoCapitalize="characters"
            autoCorrect={false}
            returnKeyType="done"
            blurOnSubmit={false}
            multiline={false}
          />
          {barcodeInput.length > 0 && (
            <TouchableOpacity onPress={() => setBarcodeInput('')} style={styles.clearInputButton}>
              <Icon name="close-circle" size={20} color={colors.neutral[400]} />
            </TouchableOpacity>
          )}
        </View>
        {lastScannedProduct && (
          <View style={styles.lastScannedContainer}>
            <Icon name="check-circle" size={16} color={colors.success.main} />
            <Text style={styles.lastScannedText}>Added: {lastScannedProduct}</Text>
          </View>
        )}
        <Text style={styles.barcodeHint}>
          Tap barcode icon to open bulk scanner (scan multiple items continuously)
        </Text>
      </View>

      {/* Camera Scanner Modal - Bulk Scanning Mode */}
      <Modal
        visible={showScanner}
        animationType="slide"
        onRequestClose={closeScanner}
      >
        <View style={styles.scannerContainer}>
          {/* Header with scan counter */}
          <View style={styles.scannerHeader}>
            <TouchableOpacity
              onPress={closeScanner}
              style={styles.closeButton}
            >
              <Icon name="close" size={28} color={colors.neutral[0]} />
            </TouchableOpacity>
            <View style={styles.scannerTitleContainer}>
              <Text style={styles.scannerTitle}>Bulk Scan</Text>
              {bulkScannedItems.length > 0 && (
                <View style={styles.scanCountBadge}>
                  <Text style={styles.scanCountText}>
                    {bulkScannedItems.filter(i => !i.productName.includes('Not Found')).length} added
                  </Text>
                </View>
              )}
            </View>
            <TouchableOpacity
              onPress={closeScanner}
              style={styles.doneButton}
            >
              <Text style={styles.doneButtonText}>Done</Text>
            </TouchableOpacity>
          </View>

          {cameraAvailable && device && Camera ? (
            <Camera
              style={StyleSheet.absoluteFill}
              device={device}
              isActive={showScanner && isScanning}
              codeScanner={codeScanner}
            />
          ) : (
            <View style={styles.noCameraContainer}>
              <Icon name="camera-off" size={64} color={colors.neutral[400]} />
              <Text style={styles.noCameraText}>No camera available</Text>
            </View>
          )}

          <View style={styles.scannerOverlay}>
            <View style={styles.scannerFrame}>
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />
            </View>
            <Text style={styles.scannerHint}>
              Keep scanning - tap Done when finished
            </Text>
          </View>

          {/* Recently scanned items list */}
          {bulkScannedItems.length > 0 && (
            <View style={styles.scannedListContainer}>
              <Text style={styles.scannedListTitle}>Recently Scanned:</Text>
              <FlatList
                data={bulkScannedItems}
                keyExtractor={(item) => `${item.barcode}-${item.timestamp}`}
                renderItem={({ item }) => (
                  <View style={styles.scannedListItem}>
                    <Icon
                      name={item.productName.includes('Not Found') ? 'alert-circle' : 'check-circle'}
                      size={16}
                      color={item.productName.includes('Not Found') ? colors.error.main : colors.success.main}
                    />
                    <Text
                      style={[
                        styles.scannedListItemText,
                        item.productName.includes('Not Found') && styles.scannedListItemError,
                      ]}
                      numberOfLines={1}
                    >
                      {item.productName}
                    </Text>
                  </View>
                )}
                style={styles.scannedList}
                showsVerticalScrollIndicator={false}
              />
            </View>
          )}
        </View>
      </Modal>

      {/* Billing Section */}
      <View style={styles.billingSection}>
        <View style={styles.billHeader}>
          <Text style={styles.billTitle}>
            <Icon name="receipt" size={18} color={colors.text.primary} /> Bill Items
          </Text>
          <Text style={styles.itemCount}>{cartItemCount} items</Text>
        </View>

        {cart.items.length > 0 ? (
          <FlatList
            data={cart.items}
            renderItem={renderCartItem}
            keyExtractor={(item) => item.productId}
            style={styles.cartList}
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <View style={styles.emptyCart}>
            <Icon name="cart-off" size={48} color={colors.neutral[300]} />
            <Text style={styles.emptyCartText}>No items in cart</Text>
            <Text style={styles.emptyCartHint}>Scan a barcode to add products</Text>
          </View>
        )}
      </View>

      {/* Bill Summary & Actions */}
      <View style={[styles.billFooter, { paddingBottom: spacing[4] + insets.bottom }]}>
        {/* Summary */}
        <View style={styles.summarySection}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>{formatCurrency(cart.subtotal)}</Text>
          </View>
          {cart.discount > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Discount</Text>
              <Text style={[styles.summaryValue, { color: colors.error.main }]}>
                -{formatCurrency(cart.discount)}
              </Text>
            </View>
          )}
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Tax</Text>
            <Text style={styles.summaryValue}>{formatCurrency(cart.tax)}</Text>
          </View>
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{formatCurrency(cart.total)}</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <Button
            variant="outlined"
            onPress={handleDraft}
            icon="content-save-outline"
            style={styles.draftButton}
            disabled={cart.items.length === 0}
          >
            Draft
          </Button>
          <Button
            variant="contained"
            onPress={handlePrint}
            icon="printer"
            style={styles.printButton}
            disabled={cart.items.length === 0}
          >
            Print Bill
          </Button>
        </View>
      </View>
    </ScreenWrapper>
  );
};

const createStyles = (colors: any) => StyleSheet.create({
  barcodeSection: {
    backgroundColor: colors.surface.default,
    padding: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
  },
  barcodeInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.default,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.primary.main,
    paddingRight: spacing[3],
  },
  scannerButton: {
    padding: spacing[3],
    borderRightWidth: 1,
    borderRightColor: colors.border.default,
    marginRight: spacing[2],
  },
  barcodeInput: {
    flex: 1,
    paddingVertical: spacing[3],
    fontSize: 16,
    color: colors.text.primary,
  },
  clearInputButton: {
    padding: spacing[1],
  },
  lastScannedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing[2],
    paddingHorizontal: spacing[2],
  },
  lastScannedText: {
    fontSize: 13,
    color: colors.success.main,
    marginLeft: spacing[1],
    fontWeight: '500',
  },
  barcodeHint: {
    fontSize: 11,
    color: colors.text.tertiary,
    marginTop: spacing[1],
    paddingHorizontal: spacing[2],
  },
  billingSection: {
    flex: 1,
    backgroundColor: colors.background.default,
  },
  billHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    backgroundColor: colors.surface.default,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
  },
  billTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
  itemCount: {
    fontSize: 14,
    color: colors.text.secondary,
    backgroundColor: colors.primary.light,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.sm,
  },
  cartList: {
    flex: 1,
    paddingHorizontal: spacing[4],
  },
  cartItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface.default,
    padding: spacing[3],
    marginTop: spacing[2],
    borderRadius: borderRadius.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  cartItemInfo: {
    flex: 1,
    marginRight: spacing[3],
  },
  cartItemName: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text.primary,
  },
  cartItemSku: {
    fontSize: 11,
    color: colors.text.tertiary,
    marginTop: 2,
  },
  cartItemPrice: {
    fontSize: 13,
    color: colors.primary.main,
    fontWeight: '600',
    marginTop: spacing[1],
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantityButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surface.variant,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    minWidth: 32,
    textAlign: 'center',
  },
  removeButton: {
    marginLeft: spacing[3],
    padding: spacing[2],
  },
  emptyCart: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing[12],
  },
  emptyCartText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text.secondary,
    marginTop: spacing[3],
  },
  emptyCartHint: {
    fontSize: 13,
    color: colors.text.tertiary,
    marginTop: spacing[1],
  },
  billFooter: {
    backgroundColor: colors.surface.default,
    padding: spacing[4],
    borderTopWidth: 1,
    borderTopColor: colors.border.default,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  summarySection: {
    marginBottom: spacing[4],
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  summaryLabel: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  summaryValue: {
    fontSize: 14,
    color: colors.text.primary,
    fontWeight: '500',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: colors.border.default,
    paddingTop: spacing[2],
    marginTop: spacing[1],
    marginBottom: 0,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
  },
  totalValue: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.primary.main,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  draftButton: {
    flex: 1,
    minWidth: 100,
  },
  printButton: {
    flex: 1,
    minWidth: 120,
  },
  scannerContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  scannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingTop: spacing[12],
    paddingBottom: spacing[4],
    backgroundColor: 'rgba(0,0,0,0.7)',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  closeButton: {
    padding: spacing[2],
  },
  scannerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  scannerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  scanCountBadge: {
    backgroundColor: colors.success.main,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.full,
  },
  scanCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  doneButton: {
    backgroundColor: colors.primary.main,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.md,
  },
  doneButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  placeholder: {
    width: 44,
  },
  noCameraContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noCameraText: {
    fontSize: 16,
    color: '#94A3B8',
    marginTop: spacing[3],
  },
  scannerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scannerFrame: {
    width: 280,
    height: 180,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: colors.primary.main,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 8,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 8,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 8,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 8,
  },
  scannerHint: {
    color: '#FFFFFF',
    fontSize: 14,
    marginTop: spacing[6],
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.md,
  },
  scannedListContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.85)',
    paddingHorizontal: spacing[4],
    paddingTop: spacing[3],
    paddingBottom: spacing[6],
    maxHeight: 200,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
  },
  scannedListTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#CBD5E1',
    marginBottom: spacing[2],
  },
  scannedList: {
    maxHeight: 140,
  },
  scannedListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[2],
    gap: spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  scannedListItemText: {
    flex: 1,
    fontSize: 14,
    color: '#FFFFFF',
  },
  scannedListItemError: {
    color: colors.error.light,
  },
});
