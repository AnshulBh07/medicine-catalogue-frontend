import {
  cleanupMedicinePackagingImage,
  uploadMedicinePackagingImage,
  type SelectedMedicineImage,
} from '../src/services/image-upload.service';
import { apiClient } from '../src/services/api-client';

jest.mock('../src/services/api-client', () => ({
  apiClient: {
    post: jest.fn(),
    delete: jest.fn(),
  },
}));

describe('ImageUploadService - Cloudflare R2 Client Tests', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it('1. requests presigned URL, reads file blob, and uploads directly via PUT', async () => {
    const mockImage: SelectedMedicineImage = {
      uri: 'file:///local/path/packaging.jpg',
      mimeType: 'image/jpeg',
      fileSize: 50000,
      fileName: 'packaging.jpg',
    };

    (apiClient.post as jest.Mock).mockResolvedValueOnce({
      uploadUrl: 'https://r2.example.com/upload-signed-url',
      objectKey: 'medicines/u1/packaging-u2.jpg',
      publicUrl: 'https://images.example.com/medicines/u1/packaging-u2.jpg',
    });

    const mockBlob = { size: 50000, type: 'image/jpeg' };
    const mockFetch = jest.fn().mockImplementation((url: string) => {
      if (url === mockImage.uri) {
        return Promise.resolve({
          ok: true,
          status: 200,
          statusText: 'OK',
          blob: () => Promise.resolve(mockBlob),
        });
      }
      if (url === 'https://r2.example.com/upload-signed-url') {
        return Promise.resolve({
          ok: true,
          status: 200,
          statusText: 'OK',
        });
      }
      return Promise.reject(new Error(`Unexpected fetch URL: ${url}`));
    });

    global.fetch = mockFetch as unknown as typeof global.fetch;

    const result = await uploadMedicinePackagingImage(mockImage);

    expect(apiClient.post).toHaveBeenCalledWith('/uploads/medicine-image', {
      contentType: 'image/jpeg',
      fileSize: 50000,
      fileName: 'packaging.jpg',
    });

    expect(mockFetch).toHaveBeenCalledWith(
      'https://r2.example.com/upload-signed-url',
      expect.objectContaining({
        method: 'PUT',
        headers: {
          'Content-Type': 'image/jpeg',
        },
        body: mockBlob,
      }),
    );

    expect(result).toEqual({
      publicUrl: 'https://images.example.com/medicines/u1/packaging-u2.jpg',
      objectKey: 'medicines/u1/packaging-u2.jpg',
    });
  });

  it('2. throws clear error when R2 presigned URL request fails', async () => {
    const mockImage: SelectedMedicineImage = {
      uri: 'file:///local/path/packaging.jpg',
      mimeType: 'image/jpeg',
    };

    (apiClient.post as jest.Mock).mockRejectedValueOnce(
      new Error('Failed to generate upload URL'),
    );

    await expect(uploadMedicinePackagingImage(mockImage)).rejects.toThrow(
      'Failed to generate upload URL',
    );
  });

  it('3. throws error when direct R2 PUT upload fails', async () => {
    const mockImage: SelectedMedicineImage = {
      uri: 'file:///local/path/packaging.jpg',
      mimeType: 'image/jpeg',
    };

    (apiClient.post as jest.Mock).mockResolvedValueOnce({
      uploadUrl: 'https://r2.example.com/upload-signed-url',
      objectKey: 'medicines/u1/packaging-u2.jpg',
      publicUrl: 'https://images.example.com/medicines/u1/packaging-u2.jpg',
    });

    const mockFetch = jest.fn().mockImplementation((url: string) => {
      if (url === mockImage.uri) {
        return Promise.resolve({
          ok: true,
          status: 200,
          statusText: 'OK',
          blob: () => Promise.resolve({ size: 100 }),
        });
      }
      if (url === 'https://r2.example.com/upload-signed-url') {
        return Promise.resolve({
          ok: false,
          status: 403,
          statusText: 'Forbidden',
        });
      }
      return Promise.reject(new Error('Unknown'));
    });

    global.fetch = mockFetch as unknown as typeof global.fetch;

    await expect(uploadMedicinePackagingImage(mockImage)).rejects.toThrow(
      'Direct upload to storage failed with status 403',
    );
  });

  it('4. calls cleanup endpoint with objectKey or publicUrl', async () => {
    (apiClient.post as jest.Mock).mockResolvedValueOnce({ success: true });

    await cleanupMedicinePackagingImage({
      objectKey: 'medicines/u1/packaging-u2.jpg',
      publicUrl: 'https://images.example.com/medicines/u1/packaging-u2.jpg',
    });

    expect(apiClient.post).toHaveBeenCalledWith('/uploads/cleanup', {
      objectKey: 'medicines/u1/packaging-u2.jpg',
      publicUrl: 'https://images.example.com/medicines/u1/packaging-u2.jpg',
    });
  });
});
