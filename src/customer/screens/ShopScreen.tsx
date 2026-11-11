import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useQuery } from '@tanstack/react-query';
import { useNavigation, useRoute } from '@react-navigation/native';
import { getProducts } from '../api/storefront';
import { ProductCard } from '../components/ProductCard';
import { theme } from '../theme';

export function ShopScreen() {
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const category: string | undefined = route.params?.category;

  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');

  const products = useQuery({
    queryKey: ['products', category || 'all', query],
    queryFn: () => getProducts({ category, search: query || undefined, limit: 50 }),
  });
  const data = products.data?.data || [];

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <View style={styles.searchBar}>
        <TextInput
          style={styles.input}
          placeholder="Search products..."
          placeholderTextColor={theme.sub}
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={() => setQuery(search.trim())}
          returnKeyType="search"
        />
        <TouchableOpacity style={styles.searchBtn} onPress={() => setQuery(search.trim())}>
          <Icon name="magnify" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {products.isLoading ? (
        <ActivityIndicator color={theme.accent} style={{ marginTop: 32 }} />
      ) : (
        <FlatList
          data={data}
          numColumns={2}
          keyExtractor={(i: any) => String(i.id)}
          columnWrapperStyle={{ justifyContent: 'space-between', paddingHorizontal: 12 }}
          contentContainerStyle={{ paddingTop: 12, paddingBottom: 24 }}
          renderItem={({ item }: any) => (
            <ProductCard
              product={item}
              onPress={() => nav.navigate('Product', { slug: item.slug, name: item.name })}
            />
          )}
          ListEmptyComponent={<Text style={styles.empty}>No products found.</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  searchBar: {
    flexDirection: 'row',
    gap: 8,
    padding: 12,
    backgroundColor: theme.card,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  input: {
    flex: 1,
    backgroundColor: theme.muted,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: theme.text,
    fontSize: 14,
  },
  searchBtn: {
    width: 44,
    borderRadius: 10,
    backgroundColor: theme.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: { color: theme.sub, fontSize: 14, padding: 32, textAlign: 'center' },
});
