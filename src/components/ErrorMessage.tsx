import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { borderRadius, colors, fontSizes, fontWeights, spacing } from '../theme';

export interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
  style?: StyleProp<ViewStyle>;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({
  message,
  onRetry,
  style,
}) => {
  if (!message) return null;

  return (
    <View style={[styles.container, style]}>
      <Text style={styles.icon}>⚠️</Text>
      <View style={styles.textContainer}>
        <Text style={styles.message}>{message}</Text>
        {onRetry ? (
          <TouchableOpacity
            onPress={onRetry}
            style={styles.retryButton}
            accessibilityRole="button"
          >
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.errorLight,
    borderColor: colors.error,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.base,
  },
  icon: {
    fontSize: fontSizes.base,
    marginRight: spacing.sm,
    marginTop: 2,
  },
  textContainer: {
    flex: 1,
  },
  message: {
    fontSize: fontSizes.sm,
    color: colors.errorDark,
    lineHeight: 20,
    fontWeight: fontWeights.medium,
  },
  retryButton: {
    marginTop: spacing.xs,
    alignSelf: 'flex-start',
  },
  retryText: {
    fontSize: fontSizes.xs,
    color: colors.errorDark,
    fontWeight: fontWeights.bold,
    textDecorationLine: 'underline',
  },
});
