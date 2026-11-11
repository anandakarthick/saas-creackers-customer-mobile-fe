import React, { useEffect, useState } from 'react';
import {
  StyleSheet, View, ScrollView, KeyboardAvoidingView, Platform, Alert,
  Image, ActivityIndicator,
} from 'react-native';
import { Button, Text } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { Header } from '@/components/layout/Header';
import { FormInput } from '@/components/forms';
import { useTheme } from '@/theme';
import { spacing, borderRadius } from '@/theme/spacing';
import { settingsApi } from '@/services/api';

interface StoreFormData {
  storeName: string;
  email: string;
  phone: string;
  mobile: string;
  alternatePhone: string;
  gpayNumber: string;
  address: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  gstNumber: string;
  currency: string;
  timezone: string;
  announcement: string;
}

export const StoreSettingsScreen: React.FC = () => {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [logoUri, setLogoUri] = useState<string | null>(null);

  const { data: settings, isLoading } = useQuery({
    queryKey: ['adminSettings'],
    queryFn: settingsApi.getAdminSettings,
  });

  const { control, handleSubmit, reset } = useForm<StoreFormData>({
    defaultValues: {
      storeName: '', email: '', phone: '', mobile: '', alternatePhone: '',
      gpayNumber: '', address: '', city: '', state: '', country: 'India',
      postalCode: '', gstNumber: '', currency: 'INR', timezone: 'Asia/Kolkata',
      announcement: '',
    },
  });

  useEffect(() => {
    if (settings) {
      reset({
        storeName: settings.storeName || '',
        email: settings.email || '',
        phone: settings.phone || '',
        mobile: settings.mobile || '',
        alternatePhone: settings.alternatePhone || '',
        gpayNumber: settings.gpayNumber || '',
        address: settings.address || '',
        city: settings.city || '',
        state: settings.state || '',
        country: settings.country || 'India',
        postalCode: settings.postalCode || '',
        gstNumber: settings.gstNumber || '',
        currency: settings.currency || 'INR',
        timezone: settings.timezone || 'Asia/Kolkata',
        announcement: settings.announcement || '',
      });
      if (settings.logo) setLogoUri(settings.logo);
    }
  }, [settings, reset]);

  const updateMutation = useMutation({
    mutationFn: (data: StoreFormData) =>
      settingsApi.updateAdminSettings({
        // NOTE: 'name', 'address', and 'logoUrl' are locked by the backend
        // and cannot be updated via this endpoint. They are excluded here
        // to prevent "Cannot update locked fields" errors.
        storeName: data.storeName.trim(),
        email: data.email.trim() || undefined,
        phone: data.phone.trim() || undefined,
        mobile: data.mobile.trim() || undefined,
        alternatePhone: data.alternatePhone.trim() || undefined,
        gpayNumber: data.gpayNumber.trim() || undefined,
        city: data.city.trim() || undefined,
        state: data.state.trim() || undefined,
        country: data.country.trim() || undefined,
        postalCode: data.postalCode.trim() || undefined,
        gstNumber: data.gstNumber.trim() || undefined,
        currency: data.currency.trim() || undefined,
        timezone: data.timezone.trim() || undefined,
        announcement: data.announcement.trim() || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['adminSettings'] });
      Alert.alert('Success', 'Store settings updated');
      navigation.goBack();
    },
    onError: (e: any) => Alert.alert('Error', e?.message || 'Failed to update settings'),
  });

  const onSubmit = async (data: StoreFormData) => {
    if (!data.storeName.trim()) { Alert.alert('Validation', 'Store name is required'); return; }
    setIsSubmitting(true);
    try { await updateMutation.mutateAsync(data); } finally { setIsSubmitting(false); }
  };

  // Logo upload removed — logo is managed by platform (non-editable)

  if (isLoading) {
    return (
      <ScreenWrapper>
        <Header title="Store Settings" showBack />
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={colors.primary.main} />
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper scrollable={false}>
      <Header title="Store Settings" showBack />

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.content, { paddingBottom: spacing[8] + insets.bottom }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Logo (Managed by platform — non-editable) */}
          <View style={[styles.section, { backgroundColor: colors.surface.default }]}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Store Logo</Text>
            <View
              style={[styles.logoContainer, { borderColor: colors.border.default, opacity: 0.7 }]}
            >
              {logoUri ? (
                <Image source={{ uri: logoUri }} style={styles.logoImage} />
              ) : (
                <View style={styles.logoPlaceholder}>
                  <Icon name="image-outline" size={32} color={colors.neutral[400]} />
                  <Text style={[styles.logoHint, { color: colors.neutral[400] }]}>
                    No logo
                  </Text>
                </View>
              )}
            </View>
            <Text style={[styles.lockedHint, { color: colors.text.tertiary }]}>
              <Icon name="lock-outline" size={12} color={colors.text.tertiary} /> Managed by platform
            </Text>
          </View>

          {/* Store Info */}
          <View style={[styles.section, { backgroundColor: colors.surface.default }]}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
              Store Information
            </Text>

            <FormInput
              name="storeName"
              control={control}
              label="Store Name (Managed by platform)"
              placeholder="Your store name"
              leftIcon="store-outline"
              disabled
            />

            <FormInput
              name="email"
              control={control}
              label="Contact Email"
              placeholder="store@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              leftIcon="email-outline"
            />

            <FormInput
              name="phone"
              control={control}
              label="Phone Number"
              placeholder="+91 1234567890"
              keyboardType="phone-pad"
              leftIcon="phone-outline"
            />

            <FormInput
              name="mobile"
              control={control}
              label="Mobile Number"
              placeholder="+91 9876543210"
              keyboardType="phone-pad"
              leftIcon="cellphone"
            />

            <FormInput
              name="alternatePhone"
              control={control}
              label="Alternate Phone"
              placeholder="+91 9876543210"
              keyboardType="phone-pad"
              leftIcon="phone-plus-outline"
            />

            <FormInput
              name="gpayNumber"
              control={control}
              label="GPay Number"
              placeholder="GPay phone number"
              keyboardType="phone-pad"
              leftIcon="google"
            />
          </View>

          {/* Address */}
          <View style={[styles.section, { backgroundColor: colors.surface.default }]}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
              Address
            </Text>

            <FormInput
              name="address"
              control={control}
              label="Street Address (Managed by platform)"
              placeholder="Store address"
              multiline
              numberOfLines={2}
              leftIcon="map-marker-outline"
              disabled
            />

            <FormInput
              name="city"
              control={control}
              label="City"
              placeholder="City"
              leftIcon="city"
            />

            <FormInput
              name="state"
              control={control}
              label="State"
              placeholder="State"
              leftIcon="map-outline"
            />

            <FormInput
              name="country"
              control={control}
              label="Country"
              placeholder="India"
              leftIcon="earth"
            />

            <FormInput
              name="postalCode"
              control={control}
              label="Postal Code"
              placeholder="600001"
              keyboardType="numeric"
              leftIcon="mailbox-outline"
            />
          </View>

          {/* Tax & Regional */}
          <View style={[styles.section, { backgroundColor: colors.surface.default }]}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
              Tax & Regional
            </Text>

            <FormInput
              name="gstNumber"
              control={control}
              label="GST Number"
              placeholder="22AAAAA0000A1Z5"
              autoCapitalize="characters"
            />

            <FormInput
              name="currency"
              control={control}
              label="Currency"
              placeholder="INR"
            />

            <FormInput
              name="timezone"
              control={control}
              label="Timezone"
              placeholder="Asia/Kolkata"
            />
          </View>

          {/* Announcement */}
          <View style={[styles.section, { backgroundColor: colors.surface.default }]}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
              Announcement
            </Text>

            <FormInput
              name="announcement"
              control={control}
              label="Store Announcement"
              placeholder="e.g. Free delivery on orders above ₹500!"
              multiline
              numberOfLines={3}
              leftIcon="bullhorn-outline"
            />
          </View>

          <View style={styles.buttonContainer}>
            <Button
              mode="outlined"
              onPress={() => navigation.goBack()}
              style={styles.cancelButton}
              labelStyle={{ color: colors.text.primary }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={handleSubmit(onSubmit)}
              style={[styles.submitButton, { backgroundColor: colors.primary.main }]}
              loading={isSubmitting}
              disabled={isSubmitting}
            >
              Save Settings
            </Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  keyboardView: { flex: 1 },
  scrollView: { flex: 1 },
  content: { padding: spacing[4] },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  section: {
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    marginBottom: spacing[4],
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: spacing[4],
  },
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    overflow: 'hidden',
  },
  logoImage: {
    width: 116,
    height: 116,
    borderRadius: borderRadius.md,
  },
  logoPlaceholder: {
    alignItems: 'center',
  },
  logoHint: {
    fontSize: 12,
    marginTop: spacing[1],
  },
  lockedHint: {
    fontSize: 11,
    marginTop: spacing[2],
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: spacing[3],
    marginTop: spacing[2],
  },
  cancelButton: { flex: 1 },
  submitButton: { flex: 2 },
});
