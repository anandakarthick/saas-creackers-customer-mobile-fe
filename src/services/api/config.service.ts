import apiClient from './client';
import { API_CONFIG, ENDPOINTS } from '@/config/api';
import type { ThemeConfig } from '@/store/theme.store';
import { delay } from '@/utils/helpers';

// API Response type
export interface AppConfigResponse {
  themeConfig: ThemeConfig;
  // Add other config fields as needed
  appName?: string;
  version?: string;
}

// Mock config for development
const mockAppConfig: AppConfigResponse = {
  themeConfig: {
    primaryColor: '#e34f4f',
    secondaryColor: '#ad82d9',
    sidebarColor: '#ffffff',
    themeMode: 'light',
  },
  appName: 'Pyro Park',
  version: '1.0.0',
};

/**
 * Fetch app configuration from API
 * This includes theme config, app settings, etc.
 */
export const fetchAppConfig = async (): Promise<AppConfigResponse> => {
  if (API_CONFIG.USE_MOCK) {
    // Simulate API delay
    await delay(500);
    return mockAppConfig;
  }

  const response = await apiClient.get<AppConfigResponse>('/config');
  return response.data;
};

/**
 * Update app configuration (if needed)
 */
export const updateAppConfig = async (config: Partial<AppConfigResponse>): Promise<AppConfigResponse> => {
  if (API_CONFIG.USE_MOCK) {
    await delay(300);
    return { ...mockAppConfig, ...config };
  }

  const response = await apiClient.put<AppConfigResponse>('/config', config);
  return response.data;
};
