import React, { useState } from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  TextInput as RNTextInput,
  TouchableOpacity,
  View,
  type StyleProp,
  type TextInputProps as RNTextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { borderRadius, colors, fontSizes, fontWeights, spacing } from '../theme';

export interface TextInputProps extends RNTextInputProps {
  label?: string;
  labelIcon?: React.ReactNode;
  error?: string;
  helperText?: string;
  containerStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
  wrapperStyle?: StyleProp<ViewStyle>;
  showCharCount?: boolean;
  useEyeIcon?: boolean;
}

export const TextInput = React.forwardRef<RNTextInput, TextInputProps>(({
  label,
  labelIcon,
  error,
  helperText,
  containerStyle,
  inputStyle,
  wrapperStyle,
  showCharCount,
  secureTextEntry,
  editable = true,
  multiline = false,
  numberOfLines = 1,
  style,
  value,
  maxLength,
  useEyeIcon,
  ...props
}, ref) => {
  const [isFocused, setIsFocused] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const showPasswordToggle = secureTextEntry !== undefined && !multiline;
  const isActualSecure = secureTextEntry && !isPasswordVisible;
  const charLength = typeof value === 'string' ? value.length : 0;
  const shouldShowCount = showCharCount || (multiline && maxLength !== undefined);

  // Responsive multiline minHeight based on numberOfLines (e.g. 3 lines ~ 96px)
  const multilineMinHeight = multiline
    ? Math.max(90, (numberOfLines || 3) * 22 + 24)
    : undefined;

  return (
    <View
      style={[
        styles.container,
        label ? styles.containerWithLabel : styles.containerWithoutLabel,
        containerStyle,
      ]}
    >
      {label ? (
        <View style={styles.labelRow}>
          {labelIcon ? <View style={styles.labelIconBadge}>{labelIcon}</View> : null}
          <Text style={styles.label}>{label}</Text>
        </View>
      ) : null}
      <View
        style={[
          styles.inputWrapper,
          multiline && [styles.multilineWrapper, { minHeight: multilineMinHeight }],
          wrapperStyle,
          isFocused && styles.inputFocused,
          error ? styles.inputError : null,
          !editable && styles.inputDisabled,
        ]}
      >
        <RNTextInput
          ref={ref}
          style={[
            styles.input,
            multiline && styles.multilineInput,
            inputStyle,
            style,
          ]}
          value={value}
          maxLength={maxLength}
          multiline={multiline}
          numberOfLines={numberOfLines}
          placeholderTextColor={colors.textMuted}
          secureTextEntry={isActualSecure}
          editable={editable}
          textAlignVertical={multiline ? 'top' : 'center'}
          onFocus={(e) => {
            setIsFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            props.onBlur?.(e);
          }}
          {...props}
        />
        {showPasswordToggle ? (
          <TouchableOpacity
            style={styles.toggleButton}
            onPress={() => setIsPasswordVisible((prev) => !prev)}
            accessibilityRole="button"
            accessibilityLabel={isPasswordVisible ? 'Hide password' : 'Show password'}
          >
            {useEyeIcon ? (
              <Ionicons
                name={isPasswordVisible ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color={colors.textSecondary}
              />
            ) : (
              <Text style={styles.toggleText}>
                {isPasswordVisible ? 'Hide' : 'Show'}
              </Text>
            )}
          </TouchableOpacity>
        ) : null}
        {shouldShowCount ? (
          <View style={styles.charCountWrapper}>
            <Text style={styles.charCountText}>
              {charLength}{maxLength ? ` / ${maxLength}` : ''}
            </Text>
          </View>
        ) : null}
      </View>
      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : helperText ? (
        <Text style={styles.helperText}>{helperText}</Text>
      ) : null}
    </View>
  );
});

TextInput.displayName = 'TextInput';

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  containerWithLabel: {
    marginBottom: spacing.base,
  },
  containerWithoutLabel: {
    marginBottom: 0,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  labelIconBadge: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.xs + 2,
  },
  label: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.medium,
    color: colors.textPrimary,
  },
  inputWrapper: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    minHeight: 48,
    paddingHorizontal: spacing.md,
  },
  multilineWrapper: {
    flexDirection: 'column',
    alignItems: 'stretch',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  inputFocused: {
    borderColor: colors.primary,
  },
  inputError: {
    borderColor: colors.error,
  },
  inputDisabled: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.borderLight,
  },
  input: {
    flex: 1,
    width: '100%',
    fontSize: fontSizes.base,
    color: colors.textPrimary,
    paddingVertical: spacing.sm,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as unknown as TextStyle) : {}),
  },
  multilineInput: {
    flex: 1,
    width: '100%',
    minHeight: 68,
    textAlignVertical: 'top',
    paddingVertical: spacing.xxs,
    paddingHorizontal: 0,
    fontSize: fontSizes.base,
    lineHeight: 22,
    color: colors.textPrimary,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none', resize: 'none' } as unknown as TextStyle) : {}),
  },
  charCountWrapper: {
    alignSelf: 'flex-end',
    marginTop: spacing.xxs,
  },
  charCountText: {
    fontSize: 11,
    color: colors.textMuted,
    fontVariant: ['tabular-nums'],
  },
  toggleButton: {
    paddingLeft: spacing.sm,
    paddingVertical: spacing.xs,
  },
  toggleText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: colors.primary,
  },
  errorText: {
    fontSize: fontSizes.xs,
    color: colors.error,
    marginTop: spacing.xs,
  },
  helperText: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
});
