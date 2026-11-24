import type { IconName } from '../components/Icon';
import { storage } from '../lib/storage';

export interface WeatherData {
  temperature: number | null;
  weatherCode: number;
  weatherDescription: string;
  icon: IconName;
  locationName: string;
  isCached?: boolean;
}

const CACHE_VALIDITY_MS = 15 * 60 * 1000; // 15 minutes
const STALE_FALLBACK_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours max offline fallback
const COORD_MATCH_TOLERANCE_DEG = 0.05; // ~5.5 km

function isCacheForSameLocation(
  cached: { locationName?: string; latitude?: number; longitude?: number },
  latitude: number,
  longitude: number,
  locationName: string,
): boolean {
  if (
    typeof cached.latitude === 'number' &&
    typeof cached.longitude === 'number' &&
    !isNaN(cached.latitude) &&
    !isNaN(cached.longitude)
  ) {
    const coordsMatch =
      Math.abs(cached.latitude - latitude) <= COORD_MATCH_TOLERANCE_DEG &&
      Math.abs(cached.longitude - longitude) <= COORD_MATCH_TOLERANCE_DEG;
    if (!coordsMatch) {
      return false;
    }
  }

  const cachedName = cached.locationName?.trim().toLowerCase();
  const targetName = locationName.trim().toLowerCase();
  if (cachedName && targetName && cachedName !== targetName) {
    return false;
  }

  return true;
}

export function getWeatherDetails(code: number): { description: string; icon: IconName } {
  switch (code) {
    case 0:
      return { description: 'Clear sky', icon: 'sunny' };
    case 1:
      return { description: 'Mainly clear', icon: 'sunny' };
    case 2:
      return { description: 'Partly cloudy', icon: 'partly-sunny' };
    case 3:
      return { description: 'Overcast', icon: 'cloudy' };
    case 45:
    case 48:
      return { description: 'Foggy', icon: 'cloudy' };
    case 51:
    case 53:
    case 55:
      return { description: 'Drizzle', icon: 'rainy' };
    case 56:
    case 57:
      return { description: 'Freezing Drizzle', icon: 'rainy' };
    case 61:
    case 63:
    case 65:
      return { description: 'Rain', icon: 'rainy' };
    case 66:
    case 67:
      return { description: 'Freezing Rain', icon: 'rainy' };
    case 71:
    case 73:
    case 75:
      return { description: 'Snow fall', icon: 'snow' };
    case 77:
      return { description: 'Snow grains', icon: 'snow' };
    case 80:
    case 81:
    case 82:
      return { description: 'Rain showers', icon: 'rainy' };
    case 85:
    case 86:
      return { description: 'Snow showers', icon: 'snow' };
    case 95:
      return { description: 'Thunderstorm', icon: 'thunderstorm' };
    case 96:
    case 99:
      return { description: 'Thunderstorm with hail', icon: 'thunderstorm' };
    default:
      return { description: 'Clear sky', icon: 'sunny' };
  }
}

/**
 * Fetches current weather for given coordinates using Open-Meteo.
 * Follows caching and graceful fallback rules.
 */
export async function fetchWeather(
  latitude: number,
  longitude: number,
  locationName: string,
  forceRefresh = false,
): Promise<WeatherData> {
  // Check cached weather first if not force-refreshing (must match current location & freshness)
  if (!forceRefresh) {
    try {
      const cached = await storage.getCachedWeather();
      if (
        cached &&
        Date.now() - cached.timestamp < CACHE_VALIDITY_MS &&
        isCacheForSameLocation(cached, latitude, longitude, locationName)
      ) {
        const { description, icon } = getWeatherDetails(cached.weatherCode);
        return {
          temperature: cached.temperature,
          weatherCode: cached.weatherCode,
          weatherDescription: cached.weatherDescription || description,
          icon,
          locationName: cached.locationName || locationName,
          isCached: true,
        };
      }
    } catch {
      // Storage read error; proceed to fetch
    }
  }

  // Attempt live fetch from Open-Meteo
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude.toFixed(4)}&longitude=${longitude.toFixed(4)}&current=temperature_2m,weather_code`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    if (typeof timeoutId === 'object' && timeoutId && 'unref' in timeoutId) {
      (timeoutId as { unref: () => void }).unref();
    }

    let response: Response;
    try {
      response = await fetch(url, { signal: controller.signal });
    } finally {
      clearTimeout(timeoutId);
    }

    if (response.ok) {
      const data = await response.json();
      const current = data?.current;

      if (current && typeof current.temperature_2m === 'number') {
        const roundedTemp = Math.round(current.temperature_2m);
        const weatherCode = typeof current.weather_code === 'number' ? current.weather_code : 0;
        const { description, icon } = getWeatherDetails(weatherCode);

        // Cache successful response with location coordinates
        await storage.setCachedWeather({
          temperature: roundedTemp,
          weatherCode,
          weatherDescription: description,
          locationName,
          latitude,
          longitude,
          timestamp: Date.now(),
        });

        return {
          temperature: roundedTemp,
          weatherCode,
          weatherDescription: description,
          icon,
          locationName,
          isCached: false,
        };
      }
    }
  } catch {
    // Network or timeout failure; fall back to cached weather
  }

  // Fallback to cached weather ONLY if it matches the requested location and is within 24h
  try {
    const cached = await storage.getCachedWeather();
    if (
      cached &&
      Date.now() - cached.timestamp < STALE_FALLBACK_MAX_AGE_MS &&
      isCacheForSameLocation(cached, latitude, longitude, locationName)
    ) {
      const { description, icon } = getWeatherDetails(cached.weatherCode);
      return {
        temperature: cached.temperature,
        weatherCode: cached.weatherCode,
        weatherDescription: cached.weatherDescription || description,
        icon,
        locationName: cached.locationName || locationName,
        isCached: true,
      };
    }
  } catch {
    // Storage read error
  }

  // If no cache exists, return clean fallback without inventing temperatures
  return {
    temperature: null,
    weatherCode: 0,
    weatherDescription: 'Clear sky',
    icon: 'sunny',
    locationName,
    isCached: false,
  };
}
