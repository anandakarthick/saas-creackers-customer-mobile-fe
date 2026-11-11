import React from 'react';
import {
  View,
  Text,
  Image,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { useCart, cartSubtotal } from '../store/cartStore';
import { theme, money } from '../theme';

export function CartScreen() {
  const nav = useNavigation<any>();
  const items = useCart((s) => s.items);
  const setQty = useCart((s) => s.setQty);
  const remove = useCart((s) => s.remove);
  const subtotal = cartSubtotal(items);

  if (items.length === 0) {
    return (
      <View style={styles.empty}>
        <Icon name="cart-outline" size={64} color={theme.border} />
        <Text style={styles.emptyText}>Your cart is empty</Text>
        <TouchableOpacity style={styles.browseBtn} onPress={() => nav.navigate('Shop')}>
          <Text style={styles.browseText}>Browse Products</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <FlatList
        data={items}
        keyExtractor={(i) => String(i.productId)}
        contentContainerStyle={{ padding: 12 }}
        renderItem={({ item }) => (
          <View style={styles.row}>
            {item.image ? (
              <Image source={{ uri: item.image }} style={styles.img} />
            ) : (
              <View style={[styles.img, { backgroundColor: theme.muted }]} />
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.name} numberOfLines={2}>
                {item.name}
              </Text>
              <Text style={styles.price}>{money(item.price)}</Text>
              <View style={styles.stepper}>
                <TouchableOpacity
                  style={styles.stepBtn}
                  onPress={() => setQty(item.productId, item.quantity - 1)}
                >
                  <Text style={styles.stepText}>−</Text>
                </TouchableOpacity>
                <Text style={styles.qtyVal}>{item.quantity}</Text>
                <TouchableOpacity
                  style={styles.stepBtn}
                  onPress={() => setQty(item.productId, item.quantity + 1)}
                >
                  <Text style={styles.stepText}>+</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.removeBtn} onPress={() => remove(item.productId)}>
                  <Icon name="trash-can-outline" size={20} color={theme.danger} />
                </TouchableOpacity>
              </View>
            </View>
            <Text style={styles.lineTotal}>{money(item.price * item.quantity)}</Text>
          </View>
        )}
      />

      <View style={styles.footer}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Subtotal</Text>
          <Text style={styles.totalValue}>{money(subtotal)}</Text>
        </View>
        <TouchableOpacity style={styles.checkoutBtn} onPress={() => nav.navigate('Checkout')}>
          <Text style={styles.checkoutText}>Proceed to Checkout</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.bg, gap: 12 },
  emptyText: { fontSize: 16, color: theme.sub },
  browseBtn: { marginTop: 8, backgroundColor: theme.accent, borderRadius: 10, paddingHorizontal: 24, paddingVertical: 12 },
  browseText: { color: '#fff', fontWeight: '700' },
  row: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: theme.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 10,
    marginBottom: 10,
  },
  img: { width: 64, height: 64, borderRadius: 8 },
  name: { fontSize: 14, color: theme.text },
  price: { fontSize: 13, color: theme.sub, marginTop: 2 },
  stepper: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  stepBtn: {
    width: 32,
    height: 32,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: { fontSize: 18, color: theme.text },
  qtyVal: { width: 36, textAlign: 'center', fontSize: 15, fontWeight: '600', color: theme.text },
  removeBtn: { marginLeft: 'auto', padding: 6 },
  lineTotal: { fontSize: 14, fontWeight: '700', color: theme.text },
  footer: {
    padding: 14,
    backgroundColor: theme.card,
    borderTopWidth: 1,
    borderTopColor: theme.border,
  },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  totalLabel: { fontSize: 16, color: theme.sub },
  totalValue: { fontSize: 18, fontWeight: '800', color: theme.text },
  checkoutBtn: { backgroundColor: theme.accent, borderRadius: 12, paddingVertical: 15, alignItems: 'center' },
  checkoutText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
