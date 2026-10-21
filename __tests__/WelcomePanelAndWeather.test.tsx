import * as Location from 'expo-location';
import { storage, type SavedLocation, type CachedWeather } from '../src/lib/storage';
import {
  DEFAULT_LOCATION,
  resolveLocation,
} from '../src/services/location.service';
import {
  fetchWeather,
  getWeatherDetails,
} from '../src/services/weather.service';

describe('Welcome Panel Location & Weather System', () => {
  beforeEach(async () => {
    await storage.clearSavedLocation();
    await storage.clearCachedWeather();
    jest.clearAllMocks();
  });

  describe('Storage persistence', () => {
    it('persists and retrieves saved location', async () => {
      const sampleLoc: SavedLocation = {
        latitude: 28.7041,
        longitude: 77.1025,
        locationName: 'Rohini, Delhi',
        timestamp: Date.now(),
      };
      await storage.setSavedLocation(sampleLoc);

      const retrieved = await storage.getSavedLocation();
      expect(retrieved).toEqual(sampleLoc);

      await storage.clearSavedLocation();
      expect(await storage.getSavedLocation()).toBeNull();
    });

    it('persists and retrieves cached weather', async () => {
      const sampleWeather: CachedWeather = {
        temperature: 27,
        weatherCode: 0,
        weatherDescription: 'Clear sky',
        locationName: 'New Delhi',
        timestamp: Date.now(),
      };
      await storage.setCachedWeather(sampleWeather);

      const retrieved = await storage.getCachedWeather();
      expect(retrieved).toEqual(sampleWeather);

      await storage.clearCachedWeather();
      expect(await storage.getCachedWeather()).toBeNull();
    });
  });

  describe('Location Resolution Hierarchy', () => {
    it('Priority 1: returns fresh GPS location when permission is granted', async () => {
      (Location.getForegroundPermissionsAsync as jest.Mock).mockResolvedValueOnce({
        status: 'granted',
      });
      (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValueOnce({
        coords: { latitude: 28.6139, longitude: 77.209 },
      });
      (Location.reverseGeocodeAsync as jest.Mock).mockResolvedValueOnce([
        { city: 'New Delhi', region: 'Delhi' },
      ]);

      const result = await resolveLocation();
      expect(result.isFallback).toBe(false);
      expect(result.latitude).toBe(28.6139);
      expect(result.longitude).toBe(77.209);
      expect(result.locationName).toBe('New Delhi');

      // Verifies location was persisted
      const saved = await storage.getSavedLocation();
      expect(saved?.locationName).toBe('New Delhi');
    });

    it('Priority 2: falls back to stored location when GPS fails or permission denied', async () => {
      await storage.setSavedLocation({
        latitude: 28.5355,
        longitude: 77.391,
        locationName: 'Noida',
        timestamp: Date.now() - 10000,
      });

      (Location.getForegroundPermissionsAsync as jest.Mock).mockResolvedValueOnce({
        status: 'denied',
        canAskAgain: false,
      });

      const result = await resolveLocation();
      expect(result.isFallback).toBe(false);
      expect(result.locationName).toBe('Noida');
      expect(result.latitude).toBe(28.5355);
      expect(result.longitude).toBe(77.391);
    });

    it('Priority 3: falls back to Narela, Delhi default when GPS and stored location unavailable', async () => {
      (Location.getForegroundPermissionsAsync as jest.Mock).mockRejectedValueOnce(
        new Error('Location unavailable'),
      );

      const result = await resolveLocation();
      expect(result.isFallback).toBe(true);
      expect(result.latitude).toBe(DEFAULT_LOCATION.latitude);
      expect(result.longitude).toBe(DEFAULT_LOCATION.longitude);
      expect(result.locationName).toBe(DEFAULT_LOCATION.locationName);
    });

    it('does not repeatedly prompt for location permission on startup when status is undetermined or denied', async () => {
      const requestSpy = jest.spyOn(Location, 'requestForegroundPermissionsAsync');

      // Undetermined with canAskAgain = true
      (Location.getForegroundPermissionsAsync as jest.Mock).mockResolvedValueOnce({
        status: 'undetermined',
        canAskAgain: true,
      });

      const res1 = await resolveLocation();
      expect(requestSpy).not.toHaveBeenCalled();
      expect(res1.isFallback).toBe(true);
      expect(res1.locationName).toBe(DEFAULT_LOCATION.locationName);

      // Denied with canAskAgain = false
      (Location.getForegroundPermissionsAsync as jest.Mock).mockResolvedValueOnce({
        status: 'denied',
        canAskAgain: false,
      });

      const res2 = await resolveLocation();
      expect(requestSpy).not.toHaveBeenCalled();
      expect(res2.isFallback).toBe(true);

      requestSpy.mockRestore();
    });
  });

  describe('Weather Service & WMO Code Mapping', () => {
    it('maps WMO weather codes correctly to human-readable text and icon names', () => {
      expect(getWeatherDetails(0)).toEqual({ description: 'Clear sky', icon: 'sunny' });
      expect(getWeatherDetails(1)).toEqual({ description: 'Mainly clear', icon: 'sunny' });
      expect(getWeatherDetails(2)).toEqual({ description: 'Partly cloudy', icon: 'partly-sunny' });
      expect(getWeatherDetails(3)).toEqual({ description: 'Overcast', icon: 'cloudy' });
      expect(getWeatherDetails(45)).toEqual({ description: 'Foggy', icon: 'cloudy' });
      expect(getWeatherDetails(51)).toEqual({ description: 'Drizzle', icon: 'rainy' });
      expect(getWeatherDetails(61)).toEqual({ description: 'Rain', icon: 'rainy' });
      expect(getWeatherDetails(71)).toEqual({ description: 'Snow fall', icon: 'snow' });
      expect(getWeatherDetails(80)).toEqual({ description: 'Rain showers', icon: 'rainy' });
      expect(getWeatherDetails(95)).toEqual({ description: 'Thunderstorm', icon: 'thunderstorm' });
    });

    it('fetches live weather, caches it, and returns formatted data', async () => {
      const weather = await fetchWeather(28.8527, 77.0928, 'Narela, Delhi', true);
      expect(weather.temperature).toBe(28);
      expect(weather.weatherDescription).toBe('Clear sky');
      expect(weather.icon).toBe('sunny');
      expect(weather.locationName).toBe('Narela, Delhi');

      // Verify cached in storage
      const cached = await storage.getCachedWeather();
      expect(cached?.temperature).toBe(28);
    });

    it('falls back gracefully to cached weather if network fetch fails', async () => {
      // Seed cache
      await storage.setCachedWeather({
        temperature: 25,
        weatherCode: 2,
        weatherDescription: 'Partly cloudy',
        locationName: 'Narela, Delhi',
        timestamp: Date.now() - 3600000, // 1 hour ago
      });

      // Mock fetch failure
      const originalFetch = global.fetch;
      global.fetch = jest.fn().mockRejectedValueOnce(new Error('Network offline'));

      const weather = await fetchWeather(28.8527, 77.0928, 'Narela, Delhi', true);
      expect(weather.temperature).toBe(25);
      expect(weather.weatherDescription).toBe('Partly cloudy');
      expect(weather.icon).toBe('partly-sunny');
      expect(weather.isCached).toBe(true);

      global.fetch = originalFetch;
    });

    it('returns clean fallback with temperature: null if network fails and no cache exists (never invents temperatures)', async () => {
      const originalFetch = global.fetch;
      global.fetch = jest.fn().mockRejectedValueOnce(new Error('Network offline'));

      const weather = await fetchWeather(28.8527, 77.0928, 'Narela, Delhi', true);
      expect(weather.temperature).toBeNull();
      expect(weather.weatherDescription).toBe('Clear sky');

      global.fetch = originalFetch;
    });
  });
});
