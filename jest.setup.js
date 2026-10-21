// Set default EXPO_PUBLIC_API_BASE_URL for testing environment
process.env.EXPO_PUBLIC_API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:3000/api/v1';

// Mock expo-secure-store
jest.mock('expo-secure-store', () => {
  const store = new Map();
  return {
    AFTER_FIRST_UNLOCK: 0,
    AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY: 1,
    ALWAYS: 2,
    WHEN_PASSCODE_SET_THIS_DEVICE_ONLY: 3,
    ALWAYS_THIS_DEVICE_ONLY: 4,
    WHEN_UNLOCKED: 5,
    WHEN_UNLOCKED_THIS_DEVICE_ONLY: 6,
    isAvailableAsync: jest.fn().mockResolvedValue(true),
    getItemAsync: jest.fn().mockImplementation((key) => Promise.resolve(store.get(key) || null)),
    setItemAsync: jest.fn().mockImplementation((key, val) => {
      store.set(key, val);
      return Promise.resolve();
    }),
    deleteItemAsync: jest.fn().mockImplementation((key) => {
      store.delete(key);
      return Promise.resolve();
    }),
  };
});

// Mock react-native-safe-area-context
jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const inset = { top: 0, right: 0, bottom: 0, left: 0 };
  const frame = { x: 0, y: 0, width: 390, height: 844 };
  const insetsContext = React.createContext(inset);
  const frameContext = React.createContext(frame);
  return {
    SafeAreaProvider: ({ children }) => children,
    SafeAreaConsumer: ({ children }) => children(inset),
    SafeAreaView: ({ children }) => children,
    useSafeAreaInsets: () => inset,
    useSafeAreaFrame: () => frame,
    SafeAreaInsetsContext: insetsContext,
    SafeAreaFrameContext: frameContext,
  };
});

// Mock @react-navigation/native useFocusEffect by default
jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  const React = require('react');
  return {
    ...actual,
    useFocusEffect: (cb) => {
      React.useEffect(() => {
        const cleanup = cb();
        return typeof cleanup === 'function' ? cleanup : undefined;
      }, [cb]);
    },
  };
});

// Mock expo-location
jest.mock('expo-location', () => ({
  Accuracy: {
    Lowest: 1,
    Low: 2,
    Balanced: 3,
    High: 4,
    Highest: 5,
    BestForNavigation: 6,
  },
  getForegroundPermissionsAsync: jest.fn().mockResolvedValue({
    status: 'granted',
    canAskAgain: true,
    granted: true,
    expires: 'never',
  }),
  requestForegroundPermissionsAsync: jest.fn().mockResolvedValue({
    status: 'granted',
    canAskAgain: true,
    granted: true,
    expires: 'never',
  }),
  getCurrentPositionAsync: jest.fn().mockResolvedValue({
    coords: {
      latitude: 28.6139,
      longitude: 77.209,
      altitude: null,
      accuracy: 10,
      altitudeAccuracy: null,
      heading: null,
      speed: null,
    },
    timestamp: Date.now(),
  }),
  reverseGeocodeAsync: jest.fn().mockResolvedValue([
    {
      city: 'New Delhi',
      district: 'Central Delhi',
      street: 'Janpath',
      region: 'Delhi',
      subregion: 'New Delhi',
      country: 'India',
      postalCode: '110001',
      name: 'New Delhi',
      isoCountryCode: 'IN',
    },
  ]),
}));

// Mock open-meteo calls in global fetch
const originalFetch = global.fetch;
global.fetch = jest.fn().mockImplementation((url, options) => {
  if (typeof url === 'string' && url.includes('open-meteo.com')) {
    return Promise.resolve({
      ok: true,
      status: 200,
      json: async () => ({
        latitude: 28.61,
        longitude: 77.21,
        current: {
          time: '2026-09-16T12:00',
          interval: 900,
          temperature_2m: 28,
          weather_code: 0,
        },
      }),
    });
  }
  if (typeof originalFetch === 'function') {
    return originalFetch(url, options);
  }
  return Promise.resolve({
    ok: true,
    status: 200,
    json: async () => ({}),
  });
});
