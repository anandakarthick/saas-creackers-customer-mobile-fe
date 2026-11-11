import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { theme, money } from '../theme';
import { productImage, isOutOfStock } from '../lib';
import type { Product } from '../api/storefront';
import { useCart } from '../store/cartStore';

export function ProductCard({
  product,
  onPress,
}: {
  product: Product;
  onPress: () => void;
}) {
  const add = useCart((s) => s.add);
  const oos = isOutOfStock(product);
  const img = productImage(product);
  const price = Number(product.price);
  const mrp = product.comparePrice != null ? Number(product.comparePrice) : null;

  const addToCart = () =>
    add({
      productId: product.id,
      name: product.name,
      slug: product.slug,
      price,
      image: img,
      maxQty: product.quantity || 99,
    });

  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.85} onPress={onPress}>
      <View style={styles.imgWrap}>
        {img ? (
          <Image source={{ uri: img }} style={styles.img} resizeMode="cover" />
        ) : (
          <View style={[styles.img, styles.imgPlaceholder]} />
        )}
        {oos && (
          <View style={styles.oos}>
            <Text style={styles.oosText}>Out of stock</Text>
          </View>
        )}
      </View>
      <Text style={styles.name} numberOfLines={2}>
        {product.name}
      </Text>
      <View style={styles.priceRow}>
        <Text style={styles.price}>{money(price)}</Text>
        {mrp != null && mrp > price && <Text style={styles.mrp}>{money(mrp)}</Text>}
      </View>
      <TouchableOpacity
        style={[styles.addBtn, oos && styles.addBtnDisabled]}
        disabled={oos}
        onPress={addToCart}
        activeOpacity={0.8}
      >
        <Text style={styles.addText}>{oos ? 'Unavailable' : 'Add to Cart'}</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '48%',
    backgroundColor: theme.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 8,
    marginBottom: 12,
  },
  imgWrap: { position: 'relative' },
  img: { width: '100%', aspectRatio: 1, borderRadius: 8, backgroundColor: theme.muted },
  imgPlaceholder: { backgroundColor: theme.muted },
  oos: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: 'rgba(17,24,39,0.8)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  oosText: { color: '#fff', fontSize: 10, fontWeight: '600' },
  name: { fontSize: 13, color: theme.text, marginTop: 8, minHeight: 34 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  price: { fontSize: 15, fontWeight: '700', color: theme.text },
  mrp: { fontSize: 12, color: theme.sub, textDecorationLine: 'line-through' },
  addBtn: {
    marginTop: 8,
    backgroundColor: theme.accent,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  addBtnDisabled: { backgroundColor: theme.border },
  addText: { color: '#fff', fontSize: 13, fontWeight: '600' },
});
