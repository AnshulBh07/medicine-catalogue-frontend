import * as Location from 'expo-location';
import { storage } from '../lib/storage';

export type LocationPermissionStatus =
  | 'granted'
  | 'denied'
  | 'permanently_denied'
  | 'undetermined'
  | 'unavailable';

export interface ResolvedLocation {
  latitude: number;
  longitude: number;
  locationName: string;
  isFallback: boolean;
  permissionStatus?: LocationPermissionStatus;
}

export interface ResolveLocationOptions {
  requestPermission?: boolean;
  timeoutMs?: number;
}

export const LOCATION_TIMEOUT_MS = 8000;

export const DEFAULT_LOCATION = {
  latitude: 28.8527,
  longitude: 77.0928,
  locationName: 'Narela, Delhi',
};

function mapExpoPermissionToStatus(perm: {
  status?: string;
  canAskAgain?: boolean;
}): LocationPermissionStatus {
  if (perm.status === 'granted') return 'granted';
  if (perm.status === 'undetermined') return 'undetermined';
  if (perm.canAskAgain === false) return 'permanently_denied';
  return 'denied';
}

async function getCurrentPositionWithTimeout(
  timeoutMs: number = LOCATION_TIMEOUT_MS,
): Promise<Location.LocationObject> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error('Location request timed out'));
    }, timeoutMs);
  });

  try {
    return await Promise.race([
      Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      }),
      timeoutPromise,
    ]);
  } finally {
    if (timer !== null) {
      clearTimeout(timer);
    }
  }
}

function formatGeocodedAddress(address?: Location.LocationGeocodedAddress | null): string {
  if (!address) {
    return 'New Delhi';
  }

  const city = address.city?.trim();
  const district = address.district?.trim();
  const subregion = address.subregion?.trim();
  const region = address.region?.trim();

  // If city is available, prioritize it
  if (city) {
    if (city.toLowerCase() === 'delhi' && subregion && subregion.toLowerCase() !== 'delhi') {
      return `${subregion}, Delhi`;
    }
    return city;
  }

  // Fallback to district or subregion or region
  if (district && district.length <= 20) {
    return district;
  }

  if (subregion && subregion.length <= 20) {
    return subregion;
  }

  if (region) {
    return region;
  }

  return 'New Delhi';
}

export async function getLocationPermissionStatus(): Promise<LocationPermissionStatus> {
  try {
    const current = await Location.getForegroundPermissionsAsync();
    return mapExpoPermissionToStatus(current);
  } catch {
    return 'unavailable';
  }
}

export async function requestLocationPermissionWithStatus(): Promise<{
  granted: boolean;
  status: LocationPermissionStatus;
}> {
  try {
    const current = await Location.getForegroundPermissionsAsync();
    if (current.status === 'granted') {
      return { granted: true, status: 'granted' };
    }
    if (current.canAskAgain === false) {
      return { granted: false, status: 'permanently_denied' };
    }
    const res = await Location.requestForegroundPermissionsAsync();
    const mapped = mapExpoPermissionToStatus(res);
    return { granted: mapped === 'granted', status: mapped };
  } catch {
    return { granted: false, status: 'unavailable' };
  }
}

export async function requestLocationPermission(): Promise<boolean> {
  const { granted } = await requestLocationPermissionWithStatus();
  return granted;
}

/**
 * Resolves location following the strict priority:
 * 1. Fresh device GPS location if permission granted (or requested when explicitly opted-in).
 * 2. Last successfully saved location from local storage.
 * 3. Default fallback: Narela, Delhi (28.8527, 77.0928).
 */
export async function resolveLocation(
  options: ResolveLocationOptions = {},
): Promise<ResolvedLocation> {
  const { requestPermission = false, timeoutMs = LOCATION_TIMEOUT_MS } = options;
  let permissionStatus: LocationPermissionStatus = 'unavailable';

  try {
    let isPermissionGranted = false;

    try {
      // Check existing permission status without triggering repeated prompts on startup
      const currentPerm = await Location.getForegroundPermissionsAsync();
      permissionStatus = mapExpoPermissionToStatus(currentPerm);
      isPermissionGranted = permissionStatus === 'granted';

      if (!isPermissionGranted && requestPermission && currentPerm.canAskAgain !== false) {
        const requested = await Location.requestForegroundPermissionsAsync();
        permissionStatus = mapExpoPermissionToStatus(requested);
        isPermissionGranted = permissionStatus === 'granted';
      }
    } catch {
      // Permission API unavailable or error in environment
      isPermissionGranted = false;
      permissionStatus = 'unavailable';
    }

    if (isPermissionGranted) {
      try {
        const position = await getCurrentPositionWithTimeout(timeoutMs);

        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;

        let locationName = 'New Delhi';
        try {
          const geocoded = await Location.reverseGeocodeAsync({ latitude, longitude });
          if (geocoded && geocoded.length > 0) {
            locationName = formatGeocodedAddress(geocoded[0]);
          }
        } catch {
          // Reverse geocoding failed; use fallback name
        }

        const resolved: ResolvedLocation = {
          latitude,
          longitude,
          locationName,
          isFallback: false,
          permissionStatus: 'granted',
        };

        // Persist fresh location
        await storage.setSavedLocation({
          latitude,
          longitude,
          locationName,
          timestamp: Date.now(),
        });

        return resolved;
      } catch {
        // GPS retrieval failed or timed out; continue to stored fallback
      }
    }
  } catch {
    // Top-level location error fallback
  }

  // 2. Check last saved location
  try {
    const saved = await storage.getSavedLocation();
    if (
      saved &&
      typeof saved.latitude === 'number' &&
      typeof saved.longitude === 'number' &&
      !isNaN(saved.latitude) &&
      !isNaN(saved.longitude)
    ) {
      return {
        latitude: saved.latitude,
        longitude: saved.longitude,
        locationName: saved.locationName || 'New Delhi',
        isFallback: false,
        permissionStatus,
      };
    }
  } catch {
    // Storage read error
  }

  // 3. Default fallback: Narela, Delhi
  return {
    latitude: DEFAULT_LOCATION.latitude,
    longitude: DEFAULT_LOCATION.longitude,
    locationName: DEFAULT_LOCATION.locationName,
    isFallback: true,
    permissionStatus,
  };
}
