import apiClient, { http } from './client';
import { ENDPOINTS } from '@/config/api';

export const uploadCategoryImage = async (uri: string, fileName: string, mimeType: string) => {
  const formData = new FormData();
  formData.append('image', { uri, name: fileName, type: mimeType } as any);
  const res = await apiClient.post<any>('/admin/categories/upload-image', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data?.data ?? res.data;
};

// Banners
export const getBanners = async (params?: { page?: number; limit?: number }) => {
  const res = await apiClient.get<any>(ENDPOINTS.BANNERS, { params });
  return res.data;
};

export const getBanner = (id: number | string) => http.get<any>(`${ENDPOINTS.BANNERS}/${id}`);

export const createBanner = (data: any) => http.post<any>(ENDPOINTS.BANNERS, data);

export const updateBanner = (id: number | string, data: any) =>
  http.put<any>(`${ENDPOINTS.BANNERS}/${id}`, data);

export const deleteBanner = (id: number | string) =>
  http.delete<any>(`${ENDPOINTS.BANNERS}/${id}`);

export const getBannerStats = () => http.get<any>(`${ENDPOINTS.BANNERS}/stats`);

// Offers
export const getOffers = async (params?: { page?: number; limit?: number; search?: string }) => {
  const res = await apiClient.get<any>(ENDPOINTS.OFFERS, { params });
  return res.data;
};

export const getOffer = (id: number | string) => http.get<any>(`${ENDPOINTS.OFFERS}/${id}`);

export const createOffer = (data: any) => http.post<any>(ENDPOINTS.OFFERS, data);

export const updateOffer = (id: number | string, data: any) =>
  http.put<any>(`${ENDPOINTS.OFFERS}/${id}`, data);

export const deleteOffer = (id: number | string) =>
  http.delete<any>(`${ENDPOINTS.OFFERS}/${id}`);

export const getCouponStats = () => http.get<any>(`${ENDPOINTS.OFFERS}/stats`);

export const uploadOfferImage = async (uri: string, fileName: string, mimeType: string) => {
  const formData = new FormData();
  formData.append('image', { uri, name: fileName, type: mimeType } as any);
  const res = await apiClient.post<any>(`${ENDPOINTS.OFFERS}/upload-image`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data?.data ?? res.data;
};

// Social links
export interface SocialLink {
  id: number;
  platform: string;
  url: string;
  icon?: string | null;
  color?: string | null;
  sortOrder?: number;
  isActive: boolean;
}

export const getSocialLinks = () => http.get<SocialLink[]>(ENDPOINTS.SOCIAL_LINKS);

export const getSocialLink = (id: number | string) =>
  http.get<SocialLink>(`${ENDPOINTS.SOCIAL_LINKS}/${id}`);

export const createSocialLink = (data: Partial<SocialLink>) =>
  http.post<SocialLink>(ENDPOINTS.SOCIAL_LINKS, data);

export const updateSocialLink = (id: number | string, data: Partial<SocialLink>) =>
  http.put<SocialLink>(`${ENDPOINTS.SOCIAL_LINKS}/${id}`, data);

export const deleteSocialLink = (id: number | string) =>
  http.delete<any>(`${ENDPOINTS.SOCIAL_LINKS}/${id}`);

export const toggleSocialLink = (id: number | string) =>
  http.patch<SocialLink>(`${ENDPOINTS.SOCIAL_LINKS}/${id}/toggle`, {});
