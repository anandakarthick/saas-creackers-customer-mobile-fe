import React, { useEffect, useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { AuthStackScreenProps } from '@/types/navigation';
import { loginSchema, LoginFormData } from '@/utils/validators';
import { useTheme } from '@/theme';
import { spacing, borderRadius } from '@/theme/spacing';
import { APP_CONFIG } from '@/config/app';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/common';
import { FormInput } from '@/components/forms';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '@/constants';
import { getStoreInfo, type StoreInfoResponse } from '@/services/api/store.api';
import { resolveImageUrl } from '@/utils/imageUrl';
import { loadTenantConfig } from '@/utils/tenantConfig';

/** Fallback gradient when no tenant theme is available yet */
const DEFAULT_HERO_FROM = '#2563eb';
const DEFAULT_HERO_VIA = '#3b5bdb';
const DEFAULT_HERO_TO = '#4338ca';

/**
 * Darken a hex colour by a percentage (0-1).
 * Used to derive a button gradient end from the primary colour.
 */
function darkenHex(hex: string, amount: number): string {
  const c = hex.replace('#', '');
  const num = parseInt(c, 16);
  const r = Math.max(0, ((num >> 16) & 0xff) - Math.round(255 * amount));
  const g = Math.max(0, ((num >> 8) & 0xff) - Math.round(255 * amount));
  const b = Math.max(0, (num & 0xff) - Math.round(255 * amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

export const LoginScreen: React.FC = () => {
  const { colors } = useTheme();
  const navigation = useNavigation<AuthStackScreenProps<'Login'>['navigation']>();
  const insets = useSafeAreaInsets();
  const { login, isLoading, error } = useAuth();
  const [showPassword, setShowPassword] = useState(false);

  // Tenant slug: read from bundled assets/tenant-config.json (customized APK)
  // falling back to the hardcoded build config value.
  const [tenantSlug, setTenantSlug] = useState(APP_CONFIG.tenantSlug || '');

  const { control, handleSubmit, setValue } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      tenantSlug,
      email: '',
      password: '',
    },
  });

  // Load tenant config from bundled assets (injected when APK is customized)
  useEffect(() => {
    (async () => {
      const config = await loadTenantConfig();
      if (config?.slug && config.slug !== tenantSlug) {
        setTenantSlug(config.slug);
        setValue('tenantSlug', config.slug);
      }
    })();
  }, []);

  // Fetch store branding on mount using the resolved slug
  const [storePreview, setStorePreview] = useState<StoreInfoResponse | null>(null);
  useEffect(() => {
    if (!tenantSlug) return;
    (async () => {
      try {
        await AsyncStorage.setItem(STORAGE_KEYS.TENANT_SLUG, tenantSlug);
        const info = await getStoreInfo();
        setStorePreview(info);
      } catch {
        // Branding fetch failed — show fallback
      }
    })();
  }, [tenantSlug]);

  const previewLogo = resolveImageUrl(storePreview?.logoUrl);
  const displayName = storePreview?.name || APP_CONFIG.name;

  // Derive gradient colours from the tenant theme (same as the web admin login)
  // Priority: admin settings.themeConfig → storefront themeRef → defaults
  const themeRef = (storePreview as any)?.themeRef;
  const adminTheme = (storePreview?.settings as any)?.themeConfig;
  const heroColors = useMemo(() => {
    // Admin theme takes priority — matches the web admin appearance
    if (adminTheme?.primaryColor) {
      const from = adminTheme.heroFrom || adminTheme.primaryColor || DEFAULT_HERO_FROM;
      const via = adminTheme.heroVia || DEFAULT_HERO_VIA;
      const to = adminTheme.heroTo || adminTheme.accentDark || adminTheme.secondaryColor || DEFAULT_HERO_TO;
      return [from, via, to] as [string, string, string];
    }
    const from = themeRef?.heroFrom || themeRef?.accentColor || DEFAULT_HERO_FROM;
    const via = themeRef?.heroVia || DEFAULT_HERO_VIA;
    const to = themeRef?.heroTo || themeRef?.accentDark || DEFAULT_HERO_TO;
    return [from, via, to] as [string, string, string];
  }, [themeRef, adminTheme]);

  // Action / button gradient
  const actionColors = useMemo(() => {
    const from = themeRef?.actionFrom || themeRef?.accentColor || heroColors[0];
    const to = themeRef?.actionTo || darkenHex(from, 0.15);
    return [from, to] as [string, string];
  }, [themeRef, heroColors]);

  // Primary accent for text highlights
  const accentColor = themeRef?.accentColor || heroColors[0];

  const onSubmit = async (data: LoginFormData) => {
    try {
      await login({
        tenantSlug: tenantSlug || data.tenantSlug || '',
        email: data.email,
        password: data.password,
      });
    } catch {
      // Error is handled in the hook
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: heroColors[0] }]}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior="padding"
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ─── Gradient Hero Section (uses tenant theme) ─── */}
          <LinearGradient
            colors={heroColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.heroSection, { paddingTop: insets.top + spacing[6] }]}
          >
            {/* Decorative circles */}
            <View style={[styles.decorCircle, styles.decorCircle1]} />
            <View style={[styles.decorCircle, styles.decorCircle2]} />
            <View style={[styles.decorCircle, styles.decorCircle3]} />

            {/* Store logo + name */}
            <View style={styles.heroHeader}>
              <View style={styles.logoBox}>
                {previewLogo ? (
                  <Image
                    source={{ uri: previewLogo }}
                    style={styles.heroLogoImage}
                    resizeMode="contain"
                  />
                ) : (
                  <Icon name="store" size={28} color="#fff" />
                )}
              </View>
              <View>
                <Text style={styles.heroStoreName}>{displayName}</Text>
                <Text style={styles.heroStoreLabel}>Store Admin</Text>
              </View>
            </View>

            {/* Tagline */}
            <View style={styles.heroContent}>
              <Text style={styles.heroTitle}>
                Manage Your{'\n'}Store with{'\n'}Ease
              </Text>
              <Text style={styles.heroSubtitle}>
                Access your dashboard to manage products, orders, customers, and grow your business.
              </Text>

              {/* Feature cards */}
              <View style={styles.featureRow}>
                <View style={styles.featureCard}>
                  <Icon name="shopping-outline" size={28} color="rgba(255,255,255,0.8)" />
                  <Text style={styles.featureTitle}>Product Management</Text>
                  <Text style={styles.featureDesc}>Add, edit, and organize your inventory</Text>
                </View>
                <View style={styles.featureCard}>
                  <Icon name="trending-up" size={28} color="rgba(255,255,255,0.8)" />
                  <Text style={styles.featureTitle}>Analytics</Text>
                  <Text style={styles.featureDesc}>Track sales and performance</Text>
                </View>
              </View>
            </View>
          </LinearGradient>

          {/* ─── Login Form Card ─── */}
          <View style={[styles.formSection, { backgroundColor: colors.background.default }]}>
            <View style={[styles.formCard, { backgroundColor: colors.surface.default }]}>
              <Text style={[styles.welcomeTitle, { color: colors.text.primary }]}>Welcome Back</Text>
              <Text style={[styles.welcomeSubtitle, { color: colors.text.secondary }]}>
                Sign in to manage{' '}
                <Text style={{ fontWeight: '600', color: accentColor }}>{displayName}</Text>
              </Text>

              {error && (
                <View style={[styles.errorContainer, { backgroundColor: colors.error.light + '20' }]}>
                  <Icon name="alert-circle" size={20} color={colors.error.main} />
                  <Text style={[styles.errorText, { color: colors.error.main }]}>{error}</Text>
                </View>
              )}

              <FormInput
                name="email"
                control={control}
                label="Email"
                placeholder="admin@yourstore.com"
                keyboardType="email-address"
                autoCapitalize="none"
                leftIcon="email-outline"
              />

              <FormInput
                name="password"
                control={control}
                label="Password"
                placeholder="Enter your password"
                secureTextEntry={!showPassword}
                leftIcon="lock-outline"
                rightIcon={showPassword ? 'eye-off-outline' : 'eye-outline'}
                onRightIconPress={() => setShowPassword(!showPassword)}
              />

              {/* Sign In button with gradient (uses tenant action colours) */}
              <View style={[styles.signInButtonWrapper, { shadowColor: actionColors[0] }]}>
                <LinearGradient
                  colors={actionColors}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.signInGradient}
                >
                  <Button
                    onPress={handleSubmit(onSubmit)}
                    loading={isLoading}
                    fullWidth
                    size="large"
                    style={styles.signInButton}
                    labelStyle={styles.signInButtonText}
                  >
                    Sign in  →
                  </Button>
                </LinearGradient>
              </View>

              <Button
                variant="text"
                onPress={() => navigation.navigate('ForgotPassword')}
                style={styles.forgotButton}
              >
                Forgot Password?
              </Button>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={[styles.footerText, { color: colors.text.tertiary }]}>
                © {new Date().getFullYear()} {displayName}. All rights reserved.
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },

  // ─── Hero (gradient) ───
  heroSection: {
    paddingHorizontal: spacing[6],
    paddingBottom: spacing[8],
    overflow: 'hidden',
  },
  decorCircle: {
    position: 'absolute',
    borderRadius: 9999,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  decorCircle1: {
    width: 300,
    height: 300,
    top: -120,
    left: -100,
  },
  decorCircle2: {
    width: 300,
    height: 300,
    bottom: -80,
    right: -120,
  },
  decorCircle3: {
    width: 200,
    height: 200,
    top: '40%',
    left: '30%',
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: spacing[6],
    zIndex: 1,
  },
  logoBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  heroLogoImage: {
    width: 44,
    height: 44,
    borderRadius: 10,
  },
  heroStoreName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  heroStoreLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
  },
  heroContent: {
    zIndex: 1,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
    lineHeight: 40,
    marginBottom: spacing[3],
  },
  heroSubtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 22,
    marginBottom: spacing[5],
    maxWidth: 340,
  },
  featureRow: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  featureCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: borderRadius.lg,
    padding: spacing[4],
  },
  featureTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
    marginTop: spacing[2],
    marginBottom: 2,
  },
  featureDesc: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
  },

  // ─── Form section ───
  formSection: {
    paddingHorizontal: spacing[5],
    paddingTop: spacing[6],
    paddingBottom: spacing[4],
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -16,
  },
  formCard: {
    borderRadius: borderRadius.xl,
    padding: spacing[6],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: spacing[1],
  },
  welcomeSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: spacing[6],
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[3],
    borderRadius: borderRadius.md,
    marginBottom: spacing[4],
  },
  errorText: {
    fontSize: 14,
    marginLeft: spacing[2],
    flex: 1,
  },
  signInButtonWrapper: {
    marginTop: spacing[3],
    borderRadius: 12,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  signInGradient: {
    borderRadius: 12,
  },
  signInButton: {
    backgroundColor: 'transparent',
    elevation: 0,
    shadowOpacity: 0,
  },
  signInButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  forgotButton: {
    marginTop: spacing[3],
  },
  footer: {
    alignItems: 'center',
    marginTop: spacing[6],
    paddingBottom: spacing[2],
  },
  footerText: {
    fontSize: 12,
  },
});
