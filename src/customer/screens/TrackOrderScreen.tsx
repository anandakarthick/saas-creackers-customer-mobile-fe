import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { trackOrder } from '../api/storefront';
import { theme, money } from '../theme';

export function TrackOrderScreen() {
  const [phone, setPhone] = useState('');
  const [orderNumber, setOrderNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[] | null>(null);
  const [error, setError] = useState('');

  const onTrack = async () => {
    if (!phone.trim()) {
      setError('Enter your phone number.');
      return;
    }
    setError('');
    setLoading(true);
    setResults(null);
    try {
      const res = await trackOrder(phone.trim(), orderNumber.trim() || undefined);
      setResults(Array.isArray(res) ? res : res ? [res] : []);
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'No order found.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.bg }} contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.title}>Track your order</Text>

      <Text style={styles.label}>Phone number</Text>
      <TextInput
        style={styles.input}
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        placeholder="Registered phone"
        placeholderTextColor={theme.sub}
      />
      <Text style={styles.label}>Order number (optional)</Text>
      <TextInput
        style={styles.input}
        value={orderNumber}
        onChangeText={setOrderNumber}
        autoCapitalize="characters"
        placeholder="e.g. ORD-1024"
        placeholderTextColor={theme.sub}
      />

      <TouchableOpacity style={styles.btn} onPress={onTrack} disabled={loading} activeOpacity={0.85}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Track</Text>}
      </TouchableOpacity>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {results?.map((o: any) => (
        <View key={o.id || o.orderNumber} style={styles.card}>
          <View style={styles.cardRow}>
            <Text style={styles.orderNo}>{o.orderNumber}</Text>
            <View style={styles.statusPill}>
              <Text style={styles.statusText}>{String(o.status || '').replace(/_/g, ' ')}</Text>
            </View>
          </View>
          <Text style={styles.cardMeta}>Total: {money(o.total)}</Text>
          {o.createdAt ? (
            <Text style={styles.cardMeta}>Placed: {new Date(o.createdAt).toLocaleDateString()}</Text>
          ) : null}
        </View>
      ))}
      {results && results.length === 0 && !error ? (
        <Text style={styles.error}>No orders found for that number.</Text>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 20, fontWeight: '700', color: theme.text, marginBottom: 16 },
  label: { fontSize: 13, color: theme.sub, marginBottom: 4, marginTop: 8 },
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
  btn: { backgroundColor: theme.accent, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 16 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  error: { color: theme.danger, fontSize: 14, marginTop: 16, textAlign: 'center' },
  card: {
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 12,
    padding: 14,
    marginTop: 16,
  },
  cardRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  orderNo: { fontSize: 16, fontWeight: '700', color: theme.text },
  statusPill: { backgroundColor: theme.muted, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { fontSize: 12, fontWeight: '600', color: theme.text, textTransform: 'capitalize' },
  cardMeta: { fontSize: 13, color: theme.sub, marginTop: 6 },
});
