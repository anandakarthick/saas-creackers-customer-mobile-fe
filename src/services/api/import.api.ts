import apiClient, { http } from './client';
import { ENDPOINTS } from '@/config/api';
import type { ImportModule, ImportResult } from '@/types';

export const importCsv = async (
  module: ImportModule,
  uri: string,
  fileName: string,
  mimeType: string,
): Promise<ImportResult> => {
  const formData = new FormData();
  formData.append('file', {
    uri,
    name: fileName,
    type: mimeType,
  } as any);

  const res = await apiClient.post<any>(
    `${ENDPOINTS.IMPORT}/${module}`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );
  return res.data?.data ?? res.data;
};

export const downloadSampleCsv = async (module: ImportModule): Promise<ArrayBuffer> => {
  const res = await apiClient.get<ArrayBuffer>(
    `${ENDPOINTS.IMPORT}/${module}/sample`,
    { responseType: 'arraybuffer' },
  );
  return res.data;
};
