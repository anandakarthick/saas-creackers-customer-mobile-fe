import React, { useEffect, useState } from 'react';
import {
  StyleSheet, View, ScrollView, KeyboardAvoidingView, Platform, Alert,
  ActivityIndicator, TouchableOpacity,
} from 'react-native';
import { Button, Text, Switch } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useForm, useController } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { Header } from '@/components/layout/Header';
import { FormInput, FormSwitch, FormSelect } from '@/components/forms';
import { useTheme } from '@/theme';
import { spacing, borderRadius } from '@/theme/spacing';
import { settingsApi } from '@/services/api';

interface StoreConfigFormData {
  trackLabel: string;
  orderOpenDate: string;
  orderCloseDate: string;
  storeClosedMessage: string;
  storeMapLink: string;
  showPriceList: boolean;
  bannerRatio: string;
  bannerObjectFit: string;
  // Nav items
  navHomeEnabled: boolean;
  navHomeLabel: string;
  navShopEnabled: boolean;
  navShopLabel: string;
  navOffersEnabled: boolean;
  navOffersLabel: string;
  navDealProductsEnabled: boolean;
  navDealProductsLabel: string;
  navTrackEnabled: boolean;
  navTrackLabel: string;
}

const TRACK_LABEL_OPTIONS = [
  { label: 'Track Order', value: 'Track Order' },
  { label: 'Track Estimate', value: 'Track Estimate' },
];

const BANNER_FIT_OPTIONS = [
  { label: 'Cover (fill & crop)', value: 'cover' },
  { label: 'Contain (fit inside)', value: 'contain' },
  { label: 'Fill (stretch)', value: 'fill' },
];

const BANNER_RATIO_OPTIONS = [
  { label: 'Auto', value: '' },
  { label: '16:9', value: '16:9' },
  { label: '4:3', value: '4:3' },
  { label: '3:2', value: '3:2' },
  { label: '2:1', value: '2:1' },
  { label: '1:1', value: '1:1' },
];

interface NavItemDef {
  key: string;
  navKey: string;
  enableField: keyof StoreConfigFormData;
  labelField: keyof StoreConfigFormData;
  icon: string;
}

const DEFAULT_NAV_ITEMS: NavItemDef[] = [
  { key: 'Home', navKey: 'home', enableField: 'navHomeEnabled', labelField: 'navHomeLabel', icon: 'home-outline' },
  { key: 'Shop', navKey: 'shop', enableField: 'navShopEnabled', labelField: 'navShopLabel', icon: 'shopping-outline' },
  { key: 'Offers', navKey: 'offers', enableField: 'navOffersEnabled', labelField: 'navOffersLabel', icon: 'tag-outline' },
  { key: 'Deal Products', navKey: 'dealProducts', enableField: 'navDealProductsEnabled', labelField: 'navDealProductsLabel', icon: 'sale' },
  { key: 'Track Order', navKey: 'track', enableField: 'navTrackEnabled', labelField: 'navTrackLabel', icon: 'truck-delivery-outline' },
];

export const StoreConfigScreen: React.FC = () => {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [navOrder, setNavOrder] = useState<string[]>(['home', 'shop', 'offers', 'dealProducts', 'track']);

  const { data: settings, isLoading } = useQuery({
    queryKey: ['adminSettings'],
    queryFn: settingsApi.getAdminSettings,
  });

  const { control, handleSubmit, reset } = useForm<StoreConfigFormData>({
    defaultValues: {
      trackLabel: 'Track Order',
      orderOpenDate: '',
      orderCloseDate: '',
      storeClosedMessage: 'Online ordering is currently closed. Please visit our store!',
      storeMapLink: '',
      showPriceList: true,
      bannerRatio: '',
      bannerObjectFit: 'cover',
      navHomeEnabled: true, navHomeLabel: 'Home',
      navShopEnabled: true, navShopLabel: 'Shop',
      navOffersEnabled: true, navOffersLabel: 'Offers',
      navDealProductsEnabled: true, navDealProductsLabel: 'Deal Products',
      navTrackEnabled: true, navTrackLabel: 'Track Order',
    },
  });

  useEffect(() => {
    if (settings) {
      const s = (settings as any)?.settings || settings;
      const sc = s?.storeConfig || {};
      const nc = sc?.navConfig || {};
      reset({
        trackLabel: sc.trackLabel || 'Track Order',
        orderOpenDate: sc.orderOpenDate || '',
        orderCloseDate: sc.orderCloseDate || '',
        storeClosedMessage: sc.storeClosedMessage || 'Online ordering is currently closed. Please visit our store!',
        storeMapLink: sc.storeMapLink || '',
        showPriceList: sc.showPriceList ?? true,
        bannerRatio: sc.bannerRatio || '',
        bannerObjectFit: sc.bannerObjectFit || 'cover',
        navHomeEnabled: nc.home?.enabled ?? true,
        navHomeLabel: nc.home?.label || 'Home',
        navShopEnabled: nc.shop?.enabled ?? true,
        navShopLabel: nc.shop?.label || 'Shop',
        navOffersEnabled: nc.offers?.enabled ?? true,
        navOffersLabel: nc.offers?.label || 'Offers',
        navDealProductsEnabled: nc.dealProducts?.enabled ?? true,
        navDealProductsLabel: nc.dealProducts?.label || 'Deal Products',
        navTrackEnabled: nc.track?.enabled ?? true,
        navTrackLabel: nc.track?.label || 'Track Order',
      });
      if (sc.navOrder && Array.isArray(sc.navOrder)) {
        setNavOrder(sc.navOrder);
      }
    }
  }, [settings, reset]);

  const moveNavItem = (index: number, direction: 'up' | 'down') => {
    const newOrder = [...navOrder];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newOrder.length) return;
    [newOrder[index], newOrder[targetIndex]] = [newOrder[targetIndex], newOrder[index]];
    setNavOrder(newOrder);
  };

  // Get nav items sorted by current navOrder
  const sortedNavItems = navOrder
    .map((key) => DEFAULT_NAV_ITEMS.find((n) => n.navKey === key))
    .filter(Boolean) as NavItemDef[];

  const updateMutation = useMutation({
    mutationFn: (data: StoreConfigFormData) => {
      const s = (settings as any)?.settings || settings || {};
      return settingsApi.updateAdminSettings({
        settings: {
          ...s,
          storeConfig: {
            trackLabel: data.trackLabel,
            orderOpenDate: data.orderOpenDate || null,
            orderCloseDate: data.orderCloseDate || null,
            storeClosedMessage: data.storeClosedMessage,
            storeMapLink: data.storeMapLink || null,
            showPriceList: data.showPriceList,
            bannerRatio: data.bannerRatio,
            bannerObjectFit: data.bannerObjectFit,
            navConfig: {
              home: { label: data.navHomeLabel, enabled: data.navHomeEnabled },
              shop: { label: data.navShopLabel, enabled: data.navShopEnabled },
              offers: { label: data.navOffersLabel, enabled: data.navOffersEnabled },
              dealProducts: { label: data.navDealProductsLabel, enabled: data.navDealProductsEnabled },
              track: { label: data.navTrackLabel, enabled: data.navTrackEnabled },
            },
            navOrder,
          },
        },
      } as any);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['adminSettings'] });
      qc.invalidateQueries({ queryKey: ['storeInfo'] });
      Alert.alert('Success', 'Store configuration updated');
      navigation.goBack();
    },
    onError: (e: any) => Alert.alert('Error', e?.message || 'Failed to update store configuration'),
  });

  const onSubmit = async (data: StoreConfigFormData) => {
    setIsSubmitting(true);
    try { await updateMutation.mutateAsync(data); } finally { setIsSubmitting(false); }
  };

  if (isLoading) {
    return (
      <ScreenWrapper>
        <Header title="Store Configuration" showBack />
        <View style={styles.loader}><ActivityIndicator size="large" color={colors.primary.main} /></View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper scrollable={false}>
      <Header title="Store Configuration" showBack />
      <KeyboardAvoidingView style={styles.keyboardView} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={styles.scrollView} contentContainerStyle={[styles.content, { paddingBottom: spacing[8] + insets.bottom }]} showsVerticalScrollIndicator={false}>
          {/* Track Page & Order Cutoff */}
          <View style={[styles.section, { backgroundColor: colors.surface.default }]}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Order Settings</Text>
            <FormSelect name="trackLabel" control={control} label="Track Page Label" options={TRACK_LABEL_OPTIONS} placeholder="Select label" />
            <FormInput name="orderOpenDate" control={control} label="Order Open Date" placeholder="YYYY-MM-DD (leave empty for always open)" leftIcon="calendar-start" />
            <FormInput name="orderCloseDate" control={control} label="Order Close Date" placeholder="YYYY-MM-DD (leave empty for no end)" leftIcon="calendar-end" />
            <FormInput name="storeClosedMessage" control={control} label="Store Closed Message" placeholder="Message shown when ordering is closed" multiline numberOfLines={2} leftIcon="store-alert-outline" />
          </View>

          {/* Storefront Navigation */}
          <View style={[styles.section, { backgroundColor: colors.surface.default }]}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Storefront Navigation</Text>
            <Text style={[styles.sectionHint, { color: colors.text.tertiary }]}>
              Use arrows to reorder, toggle to enable/disable, and rename items
            </Text>
            {sortedNavItems.map((nav, index) => (
              <NavItemRow
                key={nav.navKey}
                nav={nav}
                index={index}
                total={sortedNavItems.length}
                control={control}
                colors={colors}
                onMoveUp={() => moveNavItem(index, 'up')}
                onMoveDown={() => moveNavItem(index, 'down')}
              />
            ))}
          </View>

          {/* Banner & Display */}
          <View style={[styles.section, { backgroundColor: colors.surface.default }]}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Banner Defaults</Text>
            <FormSelect name="bannerRatio" control={control} label="Banner Aspect Ratio" options={BANNER_RATIO_OPTIONS} placeholder="Select ratio" />
            <FormSelect name="bannerObjectFit" control={control} label="Banner Image Fit" options={BANNER_FIT_OPTIONS} placeholder="Select fit" />
          </View>

          {/* Misc */}
          <View style={[styles.section, { backgroundColor: colors.surface.default }]}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>More Options</Text>
            <FormSwitch name="showPriceList" control={control} label="Show Price List (PDF)" description="Display price list download link in storefront footer" />
            <FormInput name="storeMapLink" control={control} label="Google Maps Link" placeholder="https://maps.google.com/..." leftIcon="map-marker-outline" autoCapitalize="none" />
          </View>

          <View style={styles.buttonContainer}>
            <Button mode="outlined" onPress={() => navigation.goBack()} style={styles.cancelButton} labelStyle={{ color: colors.text.primary }} disabled={isSubmitting}>Cancel</Button>
            <Button mode="contained" onPress={handleSubmit(onSubmit)} style={[styles.submitButton, { backgroundColor: colors.primary.main }]} loading={isSubmitting} disabled={isSubmitting}>Save Settings</Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
};

/** Individual nav item row — reorder arrows + icon + label input + toggle */
const NavItemRow: React.FC<{
  nav: NavItemDef;
  index: number;
  total: number;
  control: any;
  colors: any;
  onMoveUp: () => void;
  onMoveDown: () => void;
}> = ({ nav, index, total, control, colors, onMoveUp, onMoveDown }) => {
  const { field: enableField } = useController({ name: nav.enableField, control });

  return (
    <View style={[styles.navItem, { borderBottomColor: colors.border.default }]}>
      {/* Reorder arrows */}
      <View style={styles.reorderButtons}>
        <TouchableOpacity
          onPress={onMoveUp}
          disabled={index === 0}
          style={[styles.arrowButton, index === 0 && { opacity: 0.3 }]}
          hitSlop={{ top: 8, bottom: 4, left: 8, right: 8 }}
        >
          <Icon name="chevron-up" size={20} color={colors.text.secondary} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onMoveDown}
          disabled={index === total - 1}
          style={[styles.arrowButton, index === total - 1 && { opacity: 0.3 }]}
          hitSlop={{ top: 4, bottom: 8, left: 8, right: 8 }}
        >
          <Icon name="chevron-down" size={20} color={colors.text.secondary} />
        </TouchableOpacity>
      </View>

      {/* Icon */}
      <View style={[styles.navItemIcon, { backgroundColor: colors.primary.light + '20' }]}>
        <Icon name={nav.icon} size={18} color={colors.primary.main} />
      </View>

      {/* Label input */}
      <View style={styles.navLabelInput}>
        <FormInput name={nav.labelField} control={control} label="" placeholder={nav.key} />
      </View>

      {/* Toggle switch */}
      <Switch
        value={!!enableField.value}
        onValueChange={enableField.onChange}
        trackColor={{ false: colors.neutral[300], true: colors.primary.light }}
        thumbColor={enableField.value ? colors.primary.main : colors.neutral[0]}
        style={styles.navSwitch}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  keyboardView: { flex: 1 },
  scrollView: { flex: 1 },
  content: { padding: spacing[4] },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  section: { borderRadius: borderRadius.lg, padding: spacing[4], marginBottom: spacing[4] },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: spacing[4] },
  sectionHint: { fontSize: 12, marginBottom: spacing[3], marginTop: -spacing[2] },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    paddingVertical: spacing[2],
  },
  reorderButtons: {
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing[1],
  },
  arrowButton: {
    padding: 2,
  },
  navItemIcon: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing[2],
  },
  navLabelInput: {
    flex: 1,
    marginRight: spacing[2],
  },
  navSwitch: {
    transform: [{ scale: 0.85 }],
  },
  buttonContainer: { flexDirection: 'row', gap: spacing[3], marginTop: spacing[2] },
  cancelButton: { flex: 1 },
  submitButton: { flex: 2 },
});
