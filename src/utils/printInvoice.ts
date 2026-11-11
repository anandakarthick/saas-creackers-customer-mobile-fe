import { Platform } from 'react-native';
import ReactNativeBlobUtil from 'react-native-blob-util';
import RNPrint from 'react-native-print';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG, ENDPOINTS } from '@/config/api';
import { STORAGE_KEYS } from '@/constants';

export async function printInvoice(
  entityId: string,
  format: 'a4' | 'thermal' = 'a4',
): Promise<void> {
  const [token, tenantSlug] = await Promise.all([
    AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN),
    AsyncStorage.getItem(STORAGE_KEYS.TENANT_SLUG),
  ]);
  if (!token) throw new Error('Not authenticated. Please log in again.');

  const base = API_CONFIG.BASE_URL.replace(/\/$/, '');
  const formatParam = format === 'thermal' ? '?format=thermal' : '';
  const url = `${base}${ENDPOINTS.ORDERS}/${encodeURIComponent(entityId)}/invoice${formatParam}`;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
  };
  if (tenantSlug) headers['X-Tenant-Slug'] = tenantSlug;

  const res = await ReactNativeBlobUtil.config({
    fileCache: true,
    appendExt: 'pdf',
  }).fetch('GET', url, headers);

  const status = res.info().status;
  if (status < 200 || status >= 300) {
    ReactNativeBlobUtil.fs.unlink(res.path()).catch(() => {});
    throw new Error(status === 401 ? 'Session expired. Please log in again.' : `Failed to download invoice (HTTP ${status})`);
  }

  const filePath = res.path();
  try {
    const printPath = Platform.OS === 'android' ? `file://${filePath}` : filePath;
    await RNPrint.print({ filePath: printPath });
  } finally {
    ReactNativeBlobUtil.fs.unlink(filePath).catch(() => {});
  }
}
