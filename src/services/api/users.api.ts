import apiClient, { http } from './client';
import { ENDPOINTS } from '@/config/api';

// Users/Employees
export const getUsers = async (params?: { page?: number; limit?: number; search?: string }) => {
  const res = await apiClient.get<any>(ENDPOINTS.USERS, { params });
  return res.data;
};

export const getUser = (id: number | string) =>
  http.get<any>(`${ENDPOINTS.USERS}/${id}`);

export const createUser = (data: any) => http.post<any>(ENDPOINTS.USERS, data);

export const updateUser = (id: number | string, data: any) =>
  http.put<any>(`${ENDPOINTS.USERS}/${id}`, data);

export const deleteUser = (id: number | string) =>
  http.delete<any>(`${ENDPOINTS.USERS}/${id}`);

// Roles
export const getRoles = () => http.get<any[]>(ENDPOINTS.ROLES);

export const getRole = (id: number | string) =>
  http.get<any>(`${ENDPOINTS.ROLES}/${id}`);

export const createRole = (data: any) => http.post<any>(ENDPOINTS.ROLES, data);

export const updateRole = (id: number | string, data: any) =>
  http.put<any>(`${ENDPOINTS.ROLES}/${id}`, data);

export const deleteRole = (id: number | string) =>
  http.delete<any>(`${ENDPOINTS.ROLES}/${id}`);

// Permissions
export const getPermissions = () => http.get<any[]>(ENDPOINTS.PERMISSIONS);

export const getPermissionsGrouped = () =>
  http.get<Record<string, any[]>>(`${ENDPOINTS.PERMISSIONS}/grouped`);

export const getPermissionModules = () =>
  http.get<string[]>(`${ENDPOINTS.PERMISSIONS}/modules`);

export const getPermissionCatalog = () =>
  http.get<any>(ENDPOINTS.PERMISSION_CATALOG);

export const createPermission = (data: any) =>
  http.post<any>(ENDPOINTS.PERMISSIONS, data);

export const generatePermissions = (data: { module: string }) =>
  http.post<any>(ENDPOINTS.PERMISSION_GENERATE, data);

export const upsertPermissions = (pairs: Array<{ module: string; action: string }>) =>
  http.post<any>(ENDPOINTS.PERMISSION_UPSERT, { permissions: pairs });

export const deletePermission = (id: number | string) =>
  http.delete<void>(`${ENDPOINTS.PERMISSIONS}/${id}`);

// User extras
export const getUserStats = () => http.get<any>('/admin/users/stats');

export const getUserRoles = () => http.get<any[]>('/admin/users/roles');

export const getUserBranches = () => http.get<any[]>('/admin/users/branches');

export const resetUserPassword = (id: number | string) =>
  http.post<any>(`${ENDPOINTS.USERS}/${id}/reset-password`);
