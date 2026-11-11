import { http } from './client';
import { ENDPOINTS } from '@/config/api';
import type { LibraryImage } from '@/types';

export interface ImageLibraryParams {
  search?: string;
  source?: 'PRODUCT' | 'CATEGORY';
  limit?: number;
  offset?: number;
}

export const getImageLibrary = (params?: ImageLibraryParams) =>
  http.get<{ data: LibraryImage[]; total: number }>(ENDPOINTS.IMAGE_LIBRARY, params);
