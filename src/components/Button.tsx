import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type GestureResponderEvent,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { borderRadius, colors, fontWeights, spacing } from '../theme';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps {
  title: string;
  onPress: (event: GestureResponderEvent) => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  testID?: string;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  style,
  textStyle,
  testID,
  rightIcon,
}) => {
  const isInteractive = !disabled && !loading;

  const containerStyles: StyleProp<ViewStyle> = [
    styles.base,
    styles[variant],
    styles[`size_${size}`],
    disabled && styles.disabled,
    style,
  ];

  const textStyles: StyleProp<TextStyle> = [
    styles.baseText,
    styles[`text_${variant}`],
    styles[`textSize_${size}`],
    disabled && styles.disabledText,
    textStyle,
  ];

  const spinnerColor =
    variant === 'primary' || variant === 'danger'
      ? colors.textInverse
      : colors.primary;

  return (
    <TouchableOpacity
      testID={testID}
      onPress={onPress}
      disabled={!isInteractive}
      style={containerStyles}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityState={{ disabled: !isInteractive, busy: loading }}
    >
      {loading ? (
        <ActivityIndicator size="small" color={spinnerColor} />
      ) : (
        <>
          <Text style={textStyles}>{title}</Text>
          {rightIcon ? <View style={styles.rightIconWrapper}>{rightIcon}</View> : null}
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.md,
    flexDirection: 'row',
  },
  // Variants
  primary: {
    backgroundColor: colors.primary,
  },
  secondary: {
    backgroundColor: colors.secondary,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  danger: {
    backgroundColor: colors.error,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  disabled: {
    backgroundColor: colors.border,
    borderColor: colors.border,
  },
  // Sizes
  size_sm: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    minHeight: 36,
  },
  size_md: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
    minHeight: 48,
  },
  size_lg: {
    paddingVertical: spacing.base,
    paddingHorizontal: spacing.xl,
    minHeight: 56,
  },
  // Text
  baseText: {
    fontWeight: fontWeights.semibold,
    textAlign: 'center',
  },
  text_primary: {
    color: colors.textInverse,
  },
  text_secondary: {
    color: colors.textInverse,
  },
  text_outline: {
    color: colors.primary,
  },
  text_danger: {
    color: colors.textInverse,
  },
  text_ghost: {
    color: colors.primary,
  },
  disabledText: {
    color: colors.textMuted,
  },
  textSize_sm: {
    fontSize: 13,
  },
  textSize_md: {
    fontSize: 15,
  },
  textSize_lg: {
    fontSize: 17,
  },
  rightIconWrapper: {
    marginLeft: spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
