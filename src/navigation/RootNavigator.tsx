import React from 'react';
import { Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { LoadingIndicator } from '../components';
import { useAuth } from '../features/auth';
import { AppNavigator } from './AppNavigator';
import { AuthNavigator } from './AuthNavigator';

export const RootNavigator: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingIndicator message="Initializing session..." />;
  }

  const handleStateChange = () => {
    // On web, when navigation transitions occur, clear focus from the currently active
    // element before the un-focused screen container receives aria-hidden="true".
    // This prevents Chromium/WebKit "Blocked aria-hidden on an element because its descendant retained focus".
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const activeEl = document.activeElement as HTMLElement | null;
      if (
        activeEl &&
        activeEl !== document.body &&
        typeof activeEl.blur === 'function'
      ) {
        activeEl.blur();
      }
    }
  };

  return (
    <NavigationContainer onStateChange={handleStateChange}>
      {isAuthenticated ? <AppNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
};
