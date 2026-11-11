import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { useCart, cartSubtotal } from '../store/cartStore';
import {
  placeOrder,
  getPaymentMethods,
  initiatePayment,
  verifyPayment,
} from '../api/storefront';
import { storeOrigin } from '../api/client';
import { PaymentWebView } from '../components/PaymentWebView';
import { theme, money } from '../theme';

const ONLINE_GATEWAYS = ['RAZORPAY', 'STRIPE', 'PHONEPE', 'PAYTM'];

type PayOption = { id: number; type: string; label: string };

export function CheckoutScreen() {
  const nav = useNavigation<any>();
  const items = useCart((s) => s.items);
  const clear = useCart((s) => s.clear);
  const subtotal = cartSubtotal(items);

  const methodsQuery = useQuery({ queryKey: ['paymentMethods'], queryFn: getPaymentMethods });

  const payOptions: PayOption[] = useMemo(() => {
    const api = (methodsQuery.data || []).map((m: any) => ({
      id: m.id,
      type: String(m.type || '').toUpperCase(),
      label: m.name || m.label || m.displayName || m.type,
    }));
    // Always offer Cash on Delivery even if the store didn't configure it explicitly.
    if (!api.some((o) => o.type === 'COD')) {
      api.unshift({ id: 0, type: 'COD', label: 'Cash on Delivery' });
    }
    return api;
  }, [methodsQuery.data]);

  const [f, setF] = useState({
    name: '',
    phone: '',
    email: '',
    address1: '',
    city: '',
    state: '',
    postalCode: '',
  });
  const [method, setMethod] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  // Payment gateway modal state
  const [payUrl, setPayUrl] = useState('');
  const [payReturnUrl, setPayReturnUrl] = useState('');
  const [payOpen, setPayOpen] = useState(false);

  const selected = method || payOptions[0]?.type || 'COD';
  const set = (k: keyof typeof f) => (v: string) => setF((prev) => ({ ...prev, [k]: v }));

  const finishSuccess = (orderNo?: string) => {
    clear();
    Alert.alert(
      'Order placed!',
      orderNo ? `Your order ${orderNo} has been placed.` : 'Your order has been placed.',
      [{ text: 'OK', onPress: () => nav.navigate('Tabs', { screen: 'Home' }) }],
    );
  };

  const submit = async () => {
    if (!f.name || !f.phone || !f.address1 || !f.city || !f.state || !f.postalCode) {
      Alert.alert('Missing details', 'Please fill name, phone and full address.');
      return;
    }
    if (items.length === 0) {
      Alert.alert('Empty cart', 'Add products before checking out.');
      return;
    }
    setSubmitting(true);
    try {
      const order: any = await placeOrder({
        customerName: f.name.trim(),
        customerPhone: f.phone.trim(),
        customerEmail: f.email.trim() || undefined,
        shippingAddress: {
          name: f.name.trim(),
          phone: f.phone.trim(),
          address1: f.address1.trim(),
          city: f.city.trim(),
          state: f.state.trim(),
          postalCode: f.postalCode.trim(),
          country: 'India',
        },
        items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        paymentMethod: selected,
      });

      // Online gateway → initiate payment and open the gateway in a WebView.
      if (ONLINE_GATEWAYS.includes(selected)) {
        const pm = payOptions.find((o) => o.type === selected);
        if (!pm || !pm.id) throw new Error('Payment method not configured');
        const returnUrl = `${storeOrigin()}/store/payment-callback`;
        const { redirectUrl } = await initiatePayment({
          orderId: order.id,
          paymentMethodId: pm.id,
          returnUrl,
        });
        setPayReturnUrl(returnUrl);
        setPayUrl(redirectUrl);
        setPayOpen(true);
        setSubmitting(false);
        return;
      }

      // COD / other → confirmed immediately.
      finishSuccess(order?.orderNumber);
    } catch (e: any) {
      Alert.alert('Order failed', e?.response?.data?.message || e?.message || 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const onPayReturn = async (params: Record<string, string>) => {
    setPayOpen(false);
    if (params.status === 'cancelled') {
      Alert.alert('Payment cancelled', 'Your order is saved with pending payment.');
      return;
    }
    try {
      const res = await verifyPayment(params);
      if (res?.success) {
        finishSuccess(res.order?.orderNumber);
      } else {
        Alert.alert('Payment not confirmed', 'Your order is saved with pending payment. You can retry from Track Order.');
      }
    } catch (e: any) {
      Alert.alert('Verification failed', e?.response?.data?.message || 'Your order is saved with pending payment.');
    }
  };

  const onPayCancel = () => {
    setPayOpen(false);
    Alert.alert('Payment cancelled', 'Your order is saved with pending payment.');
  };

  const Field = (label: string, key: keyof typeof f, opts?: any) => (
    <View style={{ marginBottom: 12 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={f[key]}
        onChangeText={set(key)}
        placeholderTextColor={theme.sub}
        {...opts}
      />
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
        <Text style={styles.heading}>Contact</Text>
        {Field('Full name', 'name')}
        {Field('Phone', 'phone', { keyboardType: 'phone-pad' })}
        {Field('Email (optional)', 'email', { keyboardType: 'email-address', autoCapitalize: 'none' })}

        <Text style={styles.heading}>Delivery address</Text>
        {Field('Address', 'address1')}
        {Field('City', 'city')}
        {Field('State', 'state')}
        {Field('Pincode', 'postalCode', { keyboardType: 'number-pad' })}

        <Text style={styles.heading}>Payment method</Text>
        {payOptions.map((o) => {
          const active = selected === o.type;
          return (
            <TouchableOpacity
              key={`${o.type}-${o.id}`}
              style={[styles.payRow, active && styles.payRowActive]}
              onPress={() => setMethod(o.type)}
              activeOpacity={0.8}
            >
              <View style={[styles.radio, active && styles.radioActive]}>
                {active && <View style={styles.radioDot} />}
              </View>
              <Text style={styles.payLabel}>{o.label}</Text>
              {ONLINE_GATEWAYS.includes(o.type) && <Text style={styles.payTag}>Online</Text>}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>{money(subtotal)}</Text>
        </View>
        <TouchableOpacity
          style={[styles.btn, submitting && { opacity: 0.6 }]}
          disabled={submitting}
          onPress={submit}
          activeOpacity={0.85}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnText}>
              {ONLINE_GATEWAYS.includes(selected) ? 'Pay Now' : 'Place Order'}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <PaymentWebView
        visible={payOpen}
        url={payUrl}
        returnUrl={payReturnUrl}
        onReturn={onPayReturn}
        onCancel={onPayCancel}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  heading: { fontSize: 16, fontWeight: '700', color: theme.text, marginBottom: 10, marginTop: 6 },
  label: { fontSize: 13, color: theme.sub, marginBottom: 4 },
  input: {
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: theme.text,
  },
  payRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 10,
  },
  payRowActive: { borderColor: theme.accent, backgroundColor: '#fef2f2' },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: theme.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive: { borderColor: theme.accent },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: theme.accent },
  payLabel: { flex: 1, fontSize: 15, color: theme.text },
  payTag: { fontSize: 11, fontWeight: '700', color: theme.accent },
  footer: { padding: 14, backgroundColor: theme.card, borderTopWidth: 1, borderTopColor: theme.border },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  totalLabel: { fontSize: 16, color: theme.sub },
  totalValue: { fontSize: 18, fontWeight: '800', color: theme.text },
  btn: { backgroundColor: theme.accent, borderRadius: 12, paddingVertical: 15, alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
