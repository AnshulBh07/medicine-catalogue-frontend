import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { colors, fontSizes, spacing } from '../theme';

export interface LoadingStateProps {
  message?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading...',
  style,
  testID,
}) => {
  return (
    <View style={[styles.container, style]} testID={testID}>
      <ActivityIndicator size="large" color={colors.primary} />
      {message ? <Text style={styles.message}>{message}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  message: {
    marginTop: spacing.md,
    fontSize: fontSizes.base,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
