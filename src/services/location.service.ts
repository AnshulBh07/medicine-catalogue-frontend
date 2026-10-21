import * as Location from 'expo-location';
import { storage } from '../lib/storage';

export interface ResolvedLocation {
  latitude: number;
  longitude: number;
  locationName: string;
  isFallback: boolean;
}

export const DEFAULT_LOCATION = {
  latitude: 28.8527,
  longitude: 77.0928,
  locationName: 'Narela, Delhi',
};

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

export async function requestLocationPermission(): Promise<boolean> {
  try {
    const current = await Location.getForegroundPermissionsAsync();
    if (current.status === 'granted') {
      return true;
    }
    if (!current.canAskAgain) {
      return false;
    }
    const res = await Location.requestForegroundPermissionsAsync();
    return res.status === 'granted';
  } catch {
    return false;
  }
}

/**
 * Resolves location following the strict priority:
 * 1. Fresh device GPS location if permission already granted (does not repeatedly prompt).
 * 2. Last successfully saved location from local storage.
 * 3. Default fallback: Narela, Delhi (28.8527, 77.0928).
 */
export async function resolveLocation(): Promise<ResolvedLocation> {
  try {
    let isPermissionGranted = false;

    try {
      // Check existing permission status without triggering repeated prompts
      const currentPerm = await Location.getForegroundPermissionsAsync();
      isPermissionGranted = currentPerm.status === 'granted';
    } catch {
      // Permission API unavailable or error in environment
      isPermissionGranted = false;
    }

    if (isPermissionGranted) {
      try {
        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

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
        // GPS retrieval failed; continue to stored fallback
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
  };
}
