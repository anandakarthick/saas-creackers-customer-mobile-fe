import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation, useRoute } from '@react-navigation/native';
import { getProductBySlug } from '../api/storefront';
import { productImage, isOutOfStock } from '../lib';
import { useCart } from '../store/cartStore';
import { theme, money } from '../theme';

export function ProductScreen() {
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const slug: string = route.params?.slug;
  const add = useCart((s) => s.add);
  const [qty, setQty] = useState(1);

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', slug],
    queryFn: () => getProductBySlug(slug),
  });

  if (isLoading || !product) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.accent} size="large" />
      </View>
    );
  }

  const img = productImage(product);
  const price = Number(product.price);
  const mrp = product.comparePrice != null ? Number(product.comparePrice) : null;
  const oos = isOutOfStock(product);

  const onAdd = () => {
    add(
      {
        productId: product.id,
        name: product.name,
        slug: product.slug,
        price,
        image: img,
        maxQty: product.quantity || 99,
      },
      qty,
    );
    nav.navigate('Tabs', { screen: 'Cart' });
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        {img ? (
          <Image source={{ uri: img }} style={styles.hero} resizeMode="cover" />
        ) : (
          <View style={[styles.hero, { backgroundColor: theme.muted }]} />
        )}
        <View style={styles.body}>
          <Text style={styles.name}>{product.name}</Text>
          <View style={styles.priceRow}>
            <Text style={styles.price}>{money(price)}</Text>
            {mrp != null && mrp > price && <Text style={styles.mrp}>{money(mrp)}</Text>}
          </View>
          <Text style={[styles.stock, { color: oos ? theme.danger : theme.success }]}>
            {oos ? 'Out of stock' : 'In stock'}
          </Text>

          {!oos && (
            <View style={styles.qtyRow}>
              <Text style={styles.qtyLabel}>Quantity</Text>
              <View style={styles.stepper}>
                <TouchableOpacity style={styles.stepBtn} onPress={() => setQty((q) => Math.max(1, q - 1))}>
                  <Text style={styles.stepText}>−</Text>
                </TouchableOpacity>
                <Text style={styles.qtyVal}>{qty}</Text>
                <TouchableOpacity
                  style={styles.stepBtn}
                  onPress={() => setQty((q) => Math.min(product.quantity || 99, q + 1))}
                >
                  <Text style={styles.stepText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {(product.shortDesc || product.description) && (
            <Text style={styles.desc}>{product.shortDesc || product.description}</Text>
          )}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.addBtn, oos && styles.addBtnDisabled]}
          disabled={oos}
          onPress={onAdd}
          activeOpacity={0.85}
        >
          <Text style={styles.addText}>{oos ? 'Unavailable' : 'Add to Cart'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.bg },
  hero: { width: '100%', aspectRatio: 1 },
  body: { padding: 16 },
  name: { fontSize: 20, fontWeight: '700', color: theme.text },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 },
  price: { fontSize: 22, fontWeight: '800', color: theme.text },
  mrp: { fontSize: 15, color: theme.sub, textDecorationLine: 'line-through' },
  stock: { fontSize: 13, fontWeight: '600', marginTop: 6 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 20 },
  qtyLabel: { fontSize: 15, fontWeight: '600', color: theme.text },
  stepper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: theme.border, borderRadius: 10 },
  stepBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  stepText: { fontSize: 20, color: theme.text },
  qtyVal: { width: 40, textAlign: 'center', fontSize: 16, fontWeight: '600', color: theme.text },
  desc: { fontSize: 14, color: theme.sub, lineHeight: 21, marginTop: 20 },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 12,
    backgroundColor: theme.card,
    borderTopWidth: 1,
    borderTopColor: theme.border,
  },
  addBtn: { backgroundColor: theme.accent, borderRadius: 12, paddingVertical: 15, alignItems: 'center' },
  addBtnDisabled: { backgroundColor: theme.border },
  addText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
