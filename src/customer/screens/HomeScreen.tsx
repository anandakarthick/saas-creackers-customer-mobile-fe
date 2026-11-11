import React from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { getStoreInfo, getCategories, getFeaturedProducts } from '../api/storefront';
import { assetUrl } from '../api/client';
import { ProductCard } from '../components/ProductCard';
import { theme } from '../theme';

export function HomeScreen() {
  const nav = useNavigation<any>();
  const store = useQuery({ queryKey: ['storeInfo'], queryFn: getStoreInfo });
  const cats = useQuery({ queryKey: ['categories'], queryFn: getCategories });
  const featured = useQuery({ queryKey: ['featured'], queryFn: getFeaturedProducts });

  const topCats = (cats.data || []).filter((c: any) => !c.parentId);
  const logo = assetUrl(store.data?.logoUrl);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.bg }}
      contentContainerStyle={{ paddingBottom: 24 }}
      refreshControl={
        <RefreshControl
          refreshing={store.isFetching && !store.isLoading}
          onRefresh={() => {
            store.refetch();
            cats.refetch();
            featured.refetch();
          }}
          colors={[theme.accent]}
          tintColor={theme.accent}
        />
      }
    >
      <View style={styles.header}>
        {logo ? (
          <Image source={{ uri: logo }} style={styles.logo} resizeMode="contain" />
        ) : (
          <View style={[styles.logo, { backgroundColor: theme.muted }]} />
        )}
        <Text style={styles.storeName} numberOfLines={1}>
          {store.data?.name || 'Store'}
        </Text>
      </View>

      {store.data?.announcement ? (
        <Text style={styles.announce}>{store.data.announcement}</Text>
      ) : null}

      {topCats.length > 0 && (
        <View style={{ marginTop: 8 }}>
          <Text style={styles.section}>Shop by Category</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 12, gap: 8 }}
          >
            {topCats.map((c: any) => (
              <TouchableOpacity
                key={c.id}
                style={styles.chip}
                onPress={() => nav.navigate('Shop', { category: c.slug })}
              >
                <Text style={styles.chipText}>{c.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      <Text style={styles.section}>Featured</Text>
      {featured.isLoading ? (
        <ActivityIndicator color={theme.accent} style={{ marginTop: 24 }} />
      ) : (
        <View style={styles.grid}>
          {(featured.data || []).map((p: any) => (
            <ProductCard
              key={p.id}
              product={p}
              onPress={() => nav.navigate('Product', { slug: p.slug, name: p.name })}
            />
          ))}
          {(featured.data || []).length === 0 && (
            <Text style={styles.empty}>No featured products yet.</Text>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: theme.card,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  logo: { width: 40, height: 40, borderRadius: 8 },
  storeName: { fontSize: 18, fontWeight: '700', color: theme.text, flex: 1 },
  announce: {
    backgroundColor: theme.accent,
    color: '#fff',
    fontSize: 13,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  section: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.text,
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 10,
  },
  chip: {
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  chipText: { color: theme.text, fontSize: 13, fontWeight: '500' },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  empty: { color: theme.sub, fontSize: 14, padding: 24, textAlign: 'center', width: '100%' },
});
