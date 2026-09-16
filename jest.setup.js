// Set default EXPO_PUBLIC_API_BASE_URL for testing environment
process.env.EXPO_PUBLIC_API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:3000/api/v1';

// Mock expo-secure-store
jest.mock('expo-secure-store', () => {
  const store = new Map();
  return {
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
