import { apiClient } from './api-client';

export interface SelectedMedicineImage {
  uri: string;
  base64?: string | null;
  mimeType?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  width?: number | null;
  height?: number | null;
}

export interface PresignedUploadResponse {
  uploadUrl: string;
  objectKey: string;
  publicUrl: string;
}

/**
 * Helper to convert local image asset (URI/base64) into an uploadable binary Body/Blob.
 * On React Native / Android, fetch(file:// or content://) may throw 'Failed to fetch'
 * or network request failed depending on engine configuration.
 * This helper tries fetch -> base64 decode -> XHR blob response.
 */
async function getImageUploadBody(
  image: SelectedMedicineImage,
  contentType: string,
): Promise<Blob | ArrayBuffer> {
  // If base64 is already available from ImagePicker
  if (image.base64) {
    try {
      const binaryString = atob(image.base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return bytes.buffer as ArrayBuffer;
    } catch {
      // fallback to other methods
    }
  }

  // Attempt 1: Standard fetch(image.uri).blob()
  try {
    const fileResponse = await fetch(image.uri);
    if (fileResponse.ok || fileResponse.status === 0) {
      const blob = await fileResponse.blob();
      if (blob && blob.size > 0) {
        return blob;
      }
    }
  } catch {
    // continue to fallback
  }

  // Attempt 2: XMLHttpRequest blob loading (standard React Native file URI reader)
  return new Promise<Blob>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.onload = () => {
      if (xhr.status === 200 || xhr.status === 0) {
        resolve(xhr.response);
      } else {
        reject(new Error(`Failed to read image via XHR with status ${xhr.status}`));
      }
    };
    xhr.onerror = () => {
      reject(new Error('Failed to read image file from local storage'));
    };
    xhr.responseType = 'blob';
    xhr.open('GET', image.uri, true);
    xhr.send(null);
  });
}

/**
 * Uploads a locally selected medicine packaging image directly to Cloudflare R2
 * via a backend-generated presigned upload URL.
 */
export const uploadMedicinePackagingImage = async (
  image: SelectedMedicineImage,
): Promise<{ publicUrl: string; objectKey: string }> => {
  const contentType = (image.mimeType || 'image/jpeg').toLowerCase().trim();

  // 1. Request presigned upload URL from backend
  const presignedData = await apiClient.post<PresignedUploadResponse>(
    '/uploads/medicine-image',
    {
      contentType,
      fileSize: image.fileSize || undefined,
      fileName: image.fileName || undefined,
    },
  );

  if (!presignedData || !presignedData.uploadUrl || !presignedData.publicUrl) {
    throw new Error('Invalid presigned upload response from server');
  }

  // 2. Read local binary body
  const body = await getImageUploadBody(image, contentType);

  // 3. Upload directly to Cloudflare R2
  const uploadResponse = await fetch(presignedData.uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': contentType,
    },
    body,
  });

  if (!uploadResponse.ok) {
    throw new Error(
      `Direct upload to storage failed with status ${uploadResponse.status}`,
    );
  }

  return {
    publicUrl: presignedData.publicUrl,
    objectKey: presignedData.objectKey,
  };
};

export const uploadProfileImage = async (
  image: SelectedMedicineImage,
): Promise<{ publicUrl: string; objectKey: string }> => {
  const contentType = (image.mimeType || 'image/jpeg').toLowerCase().trim();

  // 1. Request presigned upload URL for profile image from backend
  const presignedData = await apiClient.post<PresignedUploadResponse>(
    '/uploads/profile-image',
    {
      contentType,
      fileSize: image.fileSize || undefined,
      fileName: image.fileName || undefined,
    },
  );

  if (!presignedData || !presignedData.uploadUrl || !presignedData.publicUrl) {
    throw new Error('Invalid presigned upload response from server');
  }

  // 2. Read local binary body
  const body = await getImageUploadBody(image, contentType);

  // 3. Upload directly to Cloudflare R2
  const uploadResponse = await fetch(presignedData.uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': contentType,
    },
    body,
  });

  if (!uploadResponse.ok) {
    throw new Error(
      `Direct upload to storage failed with status ${uploadResponse.status}`,
    );
  }

  return {
    publicUrl: presignedData.publicUrl,
    objectKey: presignedData.objectKey,
  };
};

export const cleanupMedicinePackagingImage = async (options: {
  objectKey?: string;
  publicUrl?: string;
}): Promise<void> => {
  if (!options.objectKey && !options.publicUrl) return;

  try {
    await apiClient.post('/uploads/cleanup', {
      objectKey: options.objectKey,
      publicUrl: options.publicUrl,
    });
  } catch (err) {
    // Safe client cleanup failure suppression
    console.warn('Failed to clean up uploaded image:', err);
  }
};

