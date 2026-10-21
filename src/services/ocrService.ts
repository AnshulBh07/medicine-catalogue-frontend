import { apiClient } from './api-client';

export interface ExtractedSalt {
  name: string;
  amount: string;
  unit: string;
}

export interface ExtractedMedicineData {
  name?: string;
  manufacturer?: string;
  mrp?: string;
  expiryDate?: string; // YYYY-MM-DD
  manufacturingDate?: string; // YYYY-MM-DD
  batchNumber?: string;
  salts?: ExtractedSalt[];
  form?: string;
  packQuantity?: string;
  packUnit?: string;
}

export interface ConflictRecord {
  field: string;
  values: string[];
  message: string;
}

export interface ScanMedicineResult {
  extracted: ExtractedMedicineData;
  conflicts: ConflictRecord[];
  photosProcessed: number;
  fieldsExtractedCount: number;
}

export interface PhotoInputItem {
  uri: string;
  base64?: string | null;
  text?: string;
  label?: string;
}

export const ocrService = {
  scanMedicinePhotos: async (photos: PhotoInputItem[]): Promise<ScanMedicineResult> => {
    const payload = {
      images: photos.map((p) => ({
        uri: p.uri,
        base64: p.base64 ? p.base64 : undefined,
        text: p.text,
        label: p.label,
      })),
    };

    const response = await apiClient.post<ScanMedicineResult>(
      '/ocr/scan-medicine',
      payload,
    );

    return response;
  },
};
