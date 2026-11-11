import apiClient, { http } from './client';
import { ENDPOINTS } from '@/config/api';
import { offlineMutation } from '@/services/offline/offlineMutation';
import type { AdminSettings, Profile } from '@/types';

// ── Admin Settings ────────────────────────────────────────

export const getAdminSettings = () =>
  http.get<AdminSettings>(ENDPOINTS.SETTINGS);

export const updateAdminSettings = (data: Partial<AdminSettings>) =>
  offlineMutation({
    url: ENDPOINTS.SETTINGS,
    method: 'PUT',
    body: data,
    label: 'Update store settings',
    apiFn: () => http.put<AdminSettings>(ENDPOINTS.SETTINGS, data),
  });

// ── Generic Settings (all settings nested in one object) ──

export const getSettings = () =>
  http.get<any>(ENDPOINTS.SETTINGS);

export const updateSettings = (data: Record<string, any>) =>
  offlineMutation({
    url: ENDPOINTS.SETTINGS,
    method: 'PUT',
    body: data,
    label: 'Update settings',
    apiFn: () => http.put<any>(ENDPOINTS.SETTINGS, data),
  });

// ── Social Links ─────────────────────────────────────────

export const getSocialLinks = () =>
  http.get<any[]>(ENDPOINTS.SOCIAL_LINKS);

export const createSocialLink = (data: { platform: string; url: string }) =>
  offlineMutation({
    url: ENDPOINTS.SOCIAL_LINKS,
    method: 'POST',
    body: data,
    label: `Add social link · ${data.platform}`,
    apiFn: () => http.post<any>(ENDPOINTS.SOCIAL_LINKS, data),
  });

export const updateSocialLink = (id: number, data: { platform?: string; url?: string }) =>
  offlineMutation({
    url: `${ENDPOINTS.SOCIAL_LINKS}/${id}`,
    method: 'PUT',
    body: data,
    label: `Update social link #${id}`,
    apiFn: () => http.put<any>(`${ENDPOINTS.SOCIAL_LINKS}/${id}`, data),
  });

export const deleteSocialLink = (id: number) =>
  offlineMutation({
    url: `${ENDPOINTS.SOCIAL_LINKS}/${id}`,
    method: 'DELETE',
    label: `Delete social link #${id}`,
    apiFn: () => http.delete<any>(`${ENDPOINTS.SOCIAL_LINKS}/${id}`),
  });

export const toggleSocialLink = (id: number) =>
  offlineMutation({
    url: `${ENDPOINTS.SOCIAL_LINKS}/${id}/toggle`,
    method: 'PATCH',
    label: `Toggle social link #${id}`,
    apiFn: () => http.patch<any>(`${ENDPOINTS.SOCIAL_LINKS}/${id}/toggle`),
  });

export const uploadLogo = async (uri: string, fileName: string, mimeType: string) => {
  // Logo upload requires multipart — can't be queued offline.
  const formData = new FormData();
  formData.append('logo', {
    uri,
    name: fileName,
    type: mimeType,
  } as any);

  const res = await apiClient.post<any>(ENDPOINTS.UPLOAD_LOGO, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data?.data ?? res.data;
};

// ── Profile ───────────────────────────────────────────────

export const getProfile = () =>
  http.get<Profile>(ENDPOINTS.PROFILE);

export const updateProfile = (data: Partial<Profile>) =>
  offlineMutation({
    url: ENDPOINTS.PROFILE,
    method: 'PUT',
    body: data,
    label: 'Update profile',
    apiFn: () => http.put<Profile>(ENDPOINTS.PROFILE, data),
  });

export const changePassword = (data: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}) => http.post<{ success: boolean }>(ENDPOINTS.CHANGE_PASSWORD, data);
