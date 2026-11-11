import React, { useCallback } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity, ActivityIndicator, Switch, Alert } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ScreenWrapper, Header } from '@/components/layout';
import { Empty, SafeAreaFAB } from '@/components/common';
import { useTheme } from '@/theme';
import { spacing, borderRadius } from '@/theme/spacing';
import { paymentMethodsApi } from '@/services/api';
import type { PaymentMethod } from '@/services/api/paymentMethods.api';

const typeIcons: Record<string, string> = {
  UPI: 'qrcode',
  CARD: 'credit-card',
  BANK: 'bank',
  CASH: 'cash',
  RAZORPAY: 'web',
  COD: 'cash-multiple',
};

export const PaymentMethodsListScreen: React.FC = () => {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const qc = useQueryClient();

  const { data = [], isLoading, isError, error, isFetching, refetch } = useQuery({
    queryKey: ['payment-methods'],
    queryFn: () => paymentMethodsApi.getPaymentMethods(),
  });

  const toggle = useMutation({
    mutationFn: (id: number) => paymentMethodsApi.togglePaymentMethod(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['payment-methods'] }),
  });

  const remove = useMutation({
    mutationFn: (id: number) => paymentMethodsApi.deletePaymentMethod(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['payment-methods'] }),
  });

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [])
  );

  const onRefresh = useCallback(async () => { await refetch(); }, [refetch]);

  const handleDelete = (m: PaymentMethod) => {
    Alert.alert('Delete payment method?', `Delete "${m.displayName}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => remove.mutate(m.id) },
    ]);
  };

  return (
    <ScreenWrapper scrollable={false} padding={false}>
      <Header title="Payment Methods" subtitle={`${data.length} methods`} showBack />

      {isLoading ? (
        <View style={styles.loadingCenter}><ActivityIndicator color={colors.primary.main} /></View>
      ) : isError ? (
        <Empty icon="cloud-alert" title="Couldn't load" description={String((error as any)?.message || '')} />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(it) => String(it.id)}
          contentContainerStyle={styles.list}
          refreshing={isFetching}
          onRefresh={onRefresh}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.row, { backgroundColor: colors.surface.default }]}
              onPress={() => navigation.navigate('PaymentMethodForm', { id: item.id })}
              onLongPress={() => handleDelete(item)}
              activeOpacity={0.7}
            >
              <View style={[styles.icon, { backgroundColor: colors.primary.light + '20' }]}>
                <Icon name={typeIcons[item.type] || 'credit-card'} size={22} color={colors.primary.main} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.name, { color: colors.text.primary }]}>{item.displayName}</Text>
                <Text style={[styles.type, { color: colors.primary.main }]}>{item.type}</Text>
                {item.description ? <Text style={[styles.desc, { color: colors.text.secondary }]} numberOfLines={1}>{item.description}</Text> : null}
              </View>
              <Switch
                value={item.isActive}
                onValueChange={() => toggle.mutate(item.id)}
                trackColor={{ false: colors.neutral[300], true: colors.primary.light }}
                thumbColor={item.isActive ? colors.primary.main : colors.neutral[0]}
              />
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <Empty icon="credit-card-off" title="No payment methods" description="Tap + to add one" />
          }
        />
      )}

      <SafeAreaFAB icon="plus" onPress={() => navigation.navigate('PaymentMethodForm', {})} />
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  loadingCenter: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: spacing[4], paddingBottom: spacing[20] },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.md,
    padding: spacing[3],
    marginBottom: spacing[2],
  },
  icon: {
    width: 44, height: 44, borderRadius: borderRadius.md,
    justifyContent: 'center', alignItems: 'center',
    marginRight: spacing[3],
  },
  name: { fontSize: 15, fontWeight: '600' },
  type: { fontSize: 11, fontWeight: '600', marginTop: 2 },
  desc: { fontSize: 12, marginTop: 2 },
});
