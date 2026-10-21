import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import type { PublicUser } from '../types/models';

const TOKEN_KEY = 'medicina_auth_token';
const REFRESH_TOKEN_KEY = 'medicina_auth_refresh_token';
const USER_KEY = 'medicina_auth_user';
const LAST_ACTIVE_KEY = 'medicina_last_active';
const MEDICINE_DRAFT_KEY = 'medicina_add_medicine_draft';
const SAVED_LOCATION_KEY = 'medicina_saved_location';
const CACHED_WEATHER_KEY = 'medicina_cached_weather';

const SECURE_STORE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK ?? 0,
};

export const INACTIVITY_EXPIRY_MS = 24 * 60 * 60 * 1000; // 1 day inactivity rule

export interface SavedLocation {
  latitude: number;
  longitude: number;
  locationName: string;
  timestamp: number;
}

export interface CachedWeather {
  temperature: number | null;
  weatherCode: number;
  weatherDescription: string;
  locationName: string;
  timestamp: number;
}

export interface MedicineDraft {
  name: string;
  form: string | null;
  shortDescription: string;
  barcode: string;
  selectedImage?: {
    uri: string;
    mimeType?: string | null;
    fileName?: string | null;
    fileSize?: number | null;
    width?: number | null;
    height?: number | null;
  } | null;
  saltRows: Array<{
    id: string;
    saltId: string;
    name: string;
    amount: string;
    unit: string;
  }>;
  packQuantity: string;
  packUnit: string | null;
  uses: string;
  recommendedAgeGroup: string;
  directions: string;
  warnings: string;
  storageInstructions: string;
  prescriptionRequired: boolean;
  manufacturerName: string;
  manufacturerId: string | null;
  mrId: string | null;
  batchNumber: string;
  manufacturingDate?: string | null;
  expiryDate?: string | null;
  mrp: string;
  purchaseRate: string;
  discountPercent: string;
  gstPercent?: string;
  scheme: string;
  privateNotes: string;
  savedAt: string;
}

// In-memory fallback and cache for test, web, and resilient native environments
const memoryStorage = new Map<string, string>();

async function isSecureStoreAvailable(): Promise<boolean> {
  if (Platform.OS === 'web') {
    return false;
  }
  try {
    return await SecureStore.isAvailableAsync();
  } catch {
    return false;
  }
}

async function setItem(key: string, value: string): Promise<void> {
  memoryStorage.set(key, value);
  try {
    if (await isSecureStoreAvailable()) {
      await SecureStore.setItemAsync(key, value, SECURE_STORE_OPTIONS);
    }
  } catch {
    // Fall back to memory storage on native error
  }
}

async function getItem(key: string): Promise<string | null> {
  const inMemory = memoryStorage.get(key);
  if (inMemory !== undefined) {
    return inMemory;
  }
  try {
    if (await isSecureStoreAvailable()) {
      const stored = await SecureStore.getItemAsync(key, SECURE_STORE_OPTIONS);
      if (stored !== null) {
        memoryStorage.set(key, stored);
      }
      return stored;
    }
  } catch {
    // Fall back to memory storage on native error
  }
  return null;
}

async function deleteItem(key: string): Promise<void> {
  memoryStorage.delete(key);
  try {
    if (await isSecureStoreAvailable()) {
      await SecureStore.deleteItemAsync(key, SECURE_STORE_OPTIONS);
    }
  } catch {
    // Fall back to memory storage on native error
  }
}

export const storage = {
  async getToken(): Promise<string | null> {
    return getItem(TOKEN_KEY);
  },

  async setToken(token: string): Promise<void> {
    await setItem(TOKEN_KEY, token);
  },

  async deleteToken(): Promise<void> {
    await deleteItem(TOKEN_KEY);
  },

  async getRefreshToken(): Promise<string | null> {
    return getItem(REFRESH_TOKEN_KEY);
  },

  async setRefreshToken(token: string): Promise<void> {
    await setItem(REFRESH_TOKEN_KEY, token);
  },

  async deleteRefreshToken(): Promise<void> {
    await deleteItem(REFRESH_TOKEN_KEY);
  },

  async setAuthTokens(tokens: { accessToken: string; refreshToken?: string }): Promise<void> {
    const promises: Promise<void>[] = [setItem(TOKEN_KEY, tokens.accessToken)];
    if (tokens.refreshToken) {
      promises.push(setItem(REFRESH_TOKEN_KEY, tokens.refreshToken));
    }
    await Promise.all(promises);
  },

  async getUser(): Promise<PublicUser | null> {
    const raw = await getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as PublicUser;
    } catch {
      await deleteItem(USER_KEY);
      return null;
    }
  },

  async setUser(user: PublicUser): Promise<void> {
    await setItem(USER_KEY, JSON.stringify(user));
  },

  async deleteUser(): Promise<void> {
    await deleteItem(USER_KEY);
  },

  async getLastActiveTime(): Promise<number | null> {
    const raw = await getItem(LAST_ACTIVE_KEY);
    if (!raw) return null;
    const parsed = Number(raw);
    return isNaN(parsed) ? null : parsed;
  },

  async setLastActiveTime(timestamp: number = Date.now()): Promise<void> {
    await setItem(LAST_ACTIVE_KEY, String(timestamp));
  },

  async clearAuth(): Promise<void> {
    await Promise.all([
      deleteItem(TOKEN_KEY),
      deleteItem(REFRESH_TOKEN_KEY),
      deleteItem(USER_KEY),
      deleteItem(LAST_ACTIVE_KEY),
    ]);
  },

  async getMedicineDraft(): Promise<MedicineDraft | null> {
    const raw = await getItem(MEDICINE_DRAFT_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as MedicineDraft;
    } catch {
      await deleteItem(MEDICINE_DRAFT_KEY);
      return null;
    }
  },

  async saveMedicineDraft(draft: MedicineDraft): Promise<void> {
    await setItem(MEDICINE_DRAFT_KEY, JSON.stringify(draft));
  },

  async clearMedicineDraft(): Promise<void> {
    await deleteItem(MEDICINE_DRAFT_KEY);
  },

  async getSavedLocation(): Promise<SavedLocation | null> {
    const raw = await getItem(SAVED_LOCATION_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as SavedLocation;
    } catch {
      await deleteItem(SAVED_LOCATION_KEY);
      return null;
    }
  },

  async setSavedLocation(location: SavedLocation): Promise<void> {
    await setItem(SAVED_LOCATION_KEY, JSON.stringify(location));
  },

  async clearSavedLocation(): Promise<void> {
    await deleteItem(SAVED_LOCATION_KEY);
  },

  async getCachedWeather(): Promise<CachedWeather | null> {
    const raw = await getItem(CACHED_WEATHER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as CachedWeather;
    } catch {
      await deleteItem(CACHED_WEATHER_KEY);
      return null;
    }
  },

  async setCachedWeather(weather: CachedWeather): Promise<void> {
    await setItem(CACHED_WEATHER_KEY, JSON.stringify(weather));
  },

  async clearCachedWeather(): Promise<void> {
    await deleteItem(CACHED_WEATHER_KEY);
  },
};
