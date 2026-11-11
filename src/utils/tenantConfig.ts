import { NativeModules, Platform } from 'react-native';

export interface TenantConfig {
  slug: string;
  name: string;
  logoUrl: string | null;
  apiBaseUrl?: string;
  appName?: string;
  domain?: string;
}

let cachedConfig: TenantConfig | null | undefined;

export async function loadTenantConfig(): Promise<TenantConfig | null> {
  if (cachedConfig !== undefined) return cachedConfig;
  try {
    let content: string | null = null;

    // Primary: use our native module that reads directly from AssetManager
    if (Platform.OS === 'android' && NativeModules.TenantConfigModule) {
      content = await NativeModules.TenantConfigModule.readConfig();
    }

    // Fallback: react-native-blob-util
    if (!content) {
      try {
        const ReactNativeBlobUtil = (await import('react-native-blob-util')).default;
        const assetPath = ReactNativeBlobUtil.fs.asset('tenant-config.json');
        content = await ReactNativeBlobUtil.fs.readFile(assetPath, 'utf8');
      } catch {
        // blob-util failed
      }
    }

    if (!content) {
      cachedConfig = null;
      return null;
    }

    cachedConfig = JSON.parse(content) as TenantConfig;
    console.log('[tenantConfig] Loaded:', cachedConfig.slug, cachedConfig.apiBaseUrl);
    return cachedConfig;
  } catch (e) {
    console.warn('[tenantConfig] Failed:', e);
    cachedConfig = null;
    return null;
  }
}
