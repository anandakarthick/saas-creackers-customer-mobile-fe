import apiClient, { http } from './client';
import { ENDPOINTS } from '@/config/api';

export const getBranches = async (params?: { page?: number; limit?: number; search?: string }) => {
  const res = await apiClient.get<any>(ENDPOINTS.BRANCHES, { params });
  return res.data;
};

export const getBranch = (id: number | string) =>
  http.get<any>(`${ENDPOINTS.BRANCHES}/${id}`);

export const getBranchStats = () => http.get<any>(ENDPOINTS.BRANCH_STATS);

export const createBranch = (data: any) => http.post<any>(ENDPOINTS.BRANCHES, data);

export const updateBranch = (id: number | string, data: any) =>
  http.put<any>(`${ENDPOINTS.BRANCHES}/${id}`, data);

export const deleteBranch = (id: number | string) =>
  http.delete<any>(`${ENDPOINTS.BRANCHES}/${id}`);
