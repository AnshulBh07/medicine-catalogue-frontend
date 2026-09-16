import React, { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  ActivityIndicator,
  Easing,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput as RNTextInput,
  TouchableOpacity,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { borderRadius, colors, fontSizes, fontWeights, spacing } from '../theme';
import { Icon } from './Icon';

export interface AutocompleteItem {
  id: string;
  name: string;
  subtitle?: string | null;
}

export interface AutocompleteInputProps {
  label?: string;
  required?: boolean;
  placeholder?: string;
  value: string;
  onChangeText: (text: string) => void;
  recommendations: AutocompleteItem[];
  onSelectRecommendation: (item: AutocompleteItem) => void;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onClose?: () => void;
  isLoading?: boolean;
  error?: string;
  helperText?: string;
  disabled?: boolean;
  testID?: string;
  containerStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
  maxHeight?: number;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoCorrect?: boolean;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad' | 'decimal-pad';
  nextInputRef?: React.RefObject<{ focus: () => void } | null>;
  onSubmitEditing?: () => void;
}

export const AutocompleteInput: React.FC<AutocompleteInputProps> = ({
  label,
  required = false,
  placeholder = 'Type to search...',
  value,
  onChangeText,
  recommendations,
  onSelectRecommendation,
  isOpen,
  onOpenChange,
  onClose,
  isLoading = false,
  error,
  helperText,
  disabled = false,
  testID,
  containerStyle,
  inputStyle,
  maxHeight = 200,
  autoCapitalize = 'words',
  autoCorrect = false,
  keyboardType = 'default',
  nextInputRef,
  onSubmitEditing,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<RNTextInput>(null);

  const animatedOpacity = useRef(new Animated.Value(isOpen ? 1 : 0)).current;
  const animatedTranslateY = useRef(new Animated.Value(isOpen ? 0 : -6)).current;
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => setReduceMotion(enabled))
      .catch(() => setReduceMotion(false));
  }, []);

  const isTest = typeof process !== 'undefined' && process.env.NODE_ENV === 'test';

  const shouldShowDropdown = isOpen && (recommendations.length > 0 || isLoading);

  useEffect(() => {
    if (reduceMotion || isTest) {
      animatedOpacity.setValue(shouldShowDropdown ? 1 : 0);
      animatedTranslateY.setValue(shouldShowDropdown ? 0 : -6);
      return;
    }

    if (shouldShowDropdown) {
      animatedOpacity.setValue(0);
      animatedTranslateY.setValue(-6);

      Animated.parallel([
        Animated.timing(animatedOpacity, {
          toValue: 1,
          duration: 140,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(animatedTranslateY, {
          toValue: 0,
          duration: 140,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]).start();
    }
  }, [shouldShowDropdown, reduceMotion, isTest]);

  const handleFocus = () => {
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
      blurTimeoutRef.current = null;
    }
    setIsFocused(true);
    if (value.trim().length > 0) {
      onOpenChange(true);
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    blurTimeoutRef.current = setTimeout(() => {
      onOpenChange(false);
      if (onClose) onClose();
    }, 200);
  };

  const handleChangeText = (text: string) => {
    onChangeText(text);
    if (text.trim().length > 0) {
      onOpenChange(true);
    } else {
      onOpenChange(false);
    }
  };

  const handleClear = () => {
    onChangeText('');
    onOpenChange(false);
    if (onClose) onClose();
  };

  const handleSelectItem = (item: AutocompleteItem) => {
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
      blurTimeoutRef.current = null;
    }
    onSelectRecommendation(item);
    onOpenChange(false);
    if (onClose) onClose();

    // Automatically advance focus to next logical input field
    if (nextInputRef?.current && typeof nextInputRef.current.focus === 'function') {
      setTimeout(() => {
        nextInputRef.current?.focus();
      }, 50);
    } else if (onSubmitEditing) {
      setTimeout(() => {
        onSubmitEditing();
      }, 50);
    }
  };

  return (
    <View style={[styles.rootContainer, containerStyle]}>
      {label ? (
        <View style={styles.labelRow}>
          <Text style={styles.label}>{label}</Text>
          {required ? <Text style={styles.requiredStar}> *</Text> : null}
        </View>
      ) : null}

      <View
        style={[
          styles.inputContainer,
          isFocused && styles.inputFocused,
          error ? styles.inputError : null,
          disabled ? styles.inputDisabled : null,
        ]}
      >
        <RNTextInput
          ref={inputRef}
          style={[styles.input, inputStyle]}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          value={value}
          onChangeText={handleChangeText}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onSubmitEditing={onSubmitEditing}
          editable={!disabled}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          keyboardType={keyboardType}
          testID={testID}
          accessibilityRole="combobox"
          accessibilityLabel={label || placeholder}
          accessibilityState={{ expanded: shouldShowDropdown, disabled }}
        />

        {/* Loading Spinner */}
        {isLoading ? (
          <View style={styles.indicatorContainer} testID={testID ? `${testID}-loading` : 'autocomplete-loading'}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        ) : null}

        {/* Clear Button */}
        {!disabled && value.length > 0 && !isLoading ? (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={handleClear}
            accessibilityRole="button"
            accessibilityLabel="Clear text"
            testID={testID ? `${testID}-clear` : undefined}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Icon name="close" size={14} color={colors.textSecondary} />
          </TouchableOpacity>
        ) : null}
      </View>

      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : helperText ? (
        <Text style={styles.helperText}>{helperText}</Text>
      ) : null}

      {/* Floating Recommendations Menu Overlay */}
      {shouldShowDropdown ? (
        <Animated.View
          style={[
            styles.overlayMenu,
            {
              maxHeight,
            },
            !isTest && {
              opacity: animatedOpacity,
              transform: [{ translateY: animatedTranslateY }],
            },
          ]}
          testID={testID ? `${testID}-menu` : 'autocomplete-menu'}
        >
          <ScrollView
            style={{ maxHeight }}
            nestedScrollEnabled
            keyboardShouldPersistTaps="always"
            showsVerticalScrollIndicator
          >
            {recommendations.map((item, idx) => {
              const isLast = idx === recommendations.length - 1;
              return (
                <TouchableOpacity
                  key={item.id || `${item.name}-${idx}`}
                  style={[styles.recommendationItem, isLast && styles.recommendationItemLast]}
                  onPress={() => handleSelectItem(item)}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={item.name}
                  testID={testID ? `${testID}-option-${item.id}` : `autocomplete-option-${item.id}`}
                >
                  <View style={styles.recommendationContent}>
                    <Text style={styles.recommendationName} numberOfLines={1} ellipsizeMode="tail">
                      {item.name}
                    </Text>
                    {item.subtitle ? (
                      <Text style={styles.recommendationSubtitle} numberOfLines={1} ellipsizeMode="tail">
                        {item.subtitle}
                      </Text>
                    ) : null}
                  </View>
                  <Icon name="chevron-right" size={14} color="#94A3B8" />
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </Animated.View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  rootContainer: {
    width: '100%',
    position: 'relative',
    zIndex: 10,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  label: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.semibold,
    color: '#0F172A',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  requiredStar: {
    fontSize: fontSizes.xs,
    color: colors.error,
    fontWeight: fontWeights.bold,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: borderRadius.md,
    paddingHorizontal: 12,
    minHeight: 42,
  },
  inputFocused: {
    borderColor: '#085444',
    borderWidth: 1.5,
  },
  inputError: {
    borderColor: colors.error,
  },
  inputDisabled: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    opacity: 0.7,
  },
  input: {
    flex: 1,
    fontSize: fontSizes.sm,
    color: colors.textPrimary,
    paddingVertical: 8,
  },
  indicatorContainer: {
    marginLeft: spacing.xs,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.xs,
  },
  errorText: {
    fontSize: fontSizes.xs,
    color: colors.error,
    fontWeight: fontWeights.medium,
    marginTop: 4,
  },
  helperText: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    marginTop: 4,
  },
  overlayMenu: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    zIndex: 9999,
    elevation: 8,
    ...Platform.select({
      web: {
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
      },
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
      },
    }),
  },
  recommendationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  recommendationItemLast: {
    borderBottomWidth: 0,
  },
  recommendationContent: {
    flex: 1,
    marginRight: spacing.xs,
  },
  recommendationName: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.medium,
    color: colors.textPrimary,
  },
  recommendationSubtitle: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    marginTop: 1,
  },
});
