import apiClient, { http } from './client';
import { ENDPOINTS } from '@/config/api';
import type { Asset, AssetStats } from '@/types';

export interface AssetListParams {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  status?: string;
}

export const getAssets = async (params?: AssetListParams) => {
  const res = await apiClient.get<any>(ENDPOINTS.ASSETS, { params });
  return res.data;
};

export const getAsset = (id: number | string) =>
  http.get<Asset>(`${ENDPOINTS.ASSETS}/${id}`);

export const createAsset = (data: any) =>
  http.post<Asset>(ENDPOINTS.ASSETS, data);

export const updateAsset = (id: number | string, data: any) =>
  http.put<Asset>(`${ENDPOINTS.ASSETS}/${id}`, data);

export const deleteAsset = (id: number | string) =>
  http.delete<void>(`${ENDPOINTS.ASSETS}/${id}`);

export const getAssetStats = () =>
  http.get<AssetStats>(ENDPOINTS.ASSET_STATS);
