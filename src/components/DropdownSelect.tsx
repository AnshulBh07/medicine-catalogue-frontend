import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Dimensions,
  Easing,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { borderRadius, fontSizes, fontWeights, spacing } from '../theme';
import { Icon } from './Icon';

export interface DropdownOption<T = string | null> {
  label: string;
  value: T;
  key?: string;
}

export interface DropdownSelectProps<T = string | null> {
  label?: string;
  placeholder?: string;
  options: Array<DropdownOption<T>>;
  selectedValue: T;
  onSelect: (value: T) => void;
  isOpen: boolean;
  onToggle: () => void;
  onClose?: () => void;
  disabled?: boolean;
  maxHeight?: number;
  testID?: string;
  containerStyle?: StyleProp<ViewStyle>;
  triggerStyle?: StyleProp<ViewStyle>;
  triggerTextStyle?: StyleProp<TextStyle>;
  openDirection?: 'up' | 'down' | 'auto';
  size?: 'default' | 'small';
}

interface TriggerLayout {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const DropdownSelect = <T extends string | number | null>({
  label,
  placeholder = 'Select an option',
  options,
  selectedValue,
  onSelect,
  isOpen,
  onToggle,
  onClose,
  disabled = false,
  maxHeight = 200,
  testID,
  containerStyle,
  triggerStyle,
  triggerTextStyle,
  openDirection = 'auto',
  size = 'default',
}: DropdownSelectProps<T>): React.ReactElement => {
  const isSmall = size === 'small';
  const triggerRef = useRef<View>(null);
  const [triggerLayout, setTriggerLayout] = useState<TriggerLayout | null>(null);

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    triggerRef.current.measureInWindow?.((x, y, width, height) => {
      if (width > 0 && height > 0) {
        setTriggerLayout({ x, y, width, height });
      } else if (
        Platform.OS === 'web' &&
        typeof (triggerRef.current as unknown as HTMLElement)?.getBoundingClientRect === 'function'
      ) {
        const rect = (triggerRef.current as unknown as HTMLElement).getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          setTriggerLayout({
            x: rect.left,
            y: rect.top,
            width: rect.width,
            height: rect.height,
          });
        }
      }
    });
  }, []);

  useEffect(() => {
    if (isOpen) {
      updatePosition();
      // On web, blur active element so modal aria-hidden does not trap focused element
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
    }
  }, [isOpen, updatePosition]);

  // Recalculate on web window resize/scroll while open
  useEffect(() => {
    if (!isOpen || Platform.OS !== 'web' || typeof window === 'undefined') return;

    const handleWindowChange = () => {
      updatePosition();
    };

    window.addEventListener('resize', handleWindowChange);
    window.addEventListener('scroll', handleWindowChange, true);

    return () => {
      window.removeEventListener('resize', handleWindowChange);
      window.removeEventListener('scroll', handleWindowChange, true);
    };
  }, [isOpen, updatePosition]);

  const windowDims = Dimensions.get('window');
  const layout = triggerLayout || {
    x: 16,
    y: 100,
    width: Math.min(windowDims.width - 32, 340),
    height: isSmall ? 34 : 42,
  };

  const spaceBelow = windowDims.height - (layout.y + layout.height) - 16;
  const spaceAbove = layout.y - 16;

  let isUpward = false;
  if (openDirection === 'up') {
    isUpward = true;
  } else if (openDirection === 'down') {
    isUpward = false;
  } else {
    // auto direction: flip upward when space below is constrained and space above is larger
    isUpward = spaceBelow < Math.min(maxHeight, 140) && spaceAbove > spaceBelow;
  }

  const effectiveMaxHeight = isUpward
    ? Math.max(60, Math.min(maxHeight, spaceAbove))
    : Math.max(60, Math.min(maxHeight, spaceBelow));

  const menuTop = isUpward
    ? Math.max(16, layout.y - effectiveMaxHeight - 4)
    : layout.y + layout.height + 4;

  const menuLeft = Math.max(8, Math.min(layout.x, windowDims.width - layout.width - 8));
  const menuWidth = Math.max(100, Math.min(layout.width, windowDims.width - 16));

  const animatedOpacity = useRef(new Animated.Value(isOpen ? 1 : 0)).current;
  const animatedTranslateY = useRef(new Animated.Value(isOpen ? 0 : isUpward ? 6 : -6)).current;
  const animatedScale = useRef(new Animated.Value(isOpen ? 1 : 0.97)).current;
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => setReduceMotion(enabled))
      .catch(() => setReduceMotion(false));
  }, []);

  const isTest = typeof process !== 'undefined' && process.env.NODE_ENV === 'test';

  useEffect(() => {
    if (reduceMotion || isTest) {
      animatedOpacity.setValue(isOpen ? 1 : 0);
      animatedTranslateY.setValue(isOpen ? 0 : isUpward ? 6 : -6);
      animatedScale.setValue(isOpen ? 1 : 0.97);
      return;
    }
    if (isOpen) {
      animatedOpacity.setValue(0);
      animatedTranslateY.setValue(isUpward ? 6 : -6);
      animatedScale.setValue(0.97);

      Animated.parallel([
        Animated.timing(animatedOpacity, {
          toValue: 1,
          duration: 150,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(animatedTranslateY, {
          toValue: 0,
          duration: 150,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(animatedScale, {
          toValue: 1,
          duration: 150,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]).start();
    }
  }, [isOpen, isUpward, reduceMotion, isTest]);

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      onToggle();
    }
  };

  const handleSelect = (val: T) => {
    onSelect(val);
    if (onClose) {
      onClose();
    }
  };

  const selectedOption = options.find((o) => o.value === selectedValue);
  const displayLabel = selectedOption ? selectedOption.label : placeholder;

  return (
    <View style={[styles.rootContainer, containerStyle]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}

      {/* Trigger button */}
      <TouchableOpacity
        ref={triggerRef}
        style={[
          styles.trigger,
          isSmall && styles.triggerSmall,
          isOpen && styles.triggerOpen,
          disabled && styles.triggerDisabled,
          triggerStyle,
        ]}
        onPress={() => {
          if (!disabled) {
            updatePosition();
            onToggle();
          }
        }}
        activeOpacity={0.7}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={label || placeholder}
        accessibilityState={{ expanded: isOpen, disabled }}
        testID={testID}
      >
        <Text
          style={[
            styles.triggerText,
            isSmall && styles.triggerTextSmall,
            !selectedOption && styles.placeholderText,
            triggerTextStyle,
          ]}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {displayLabel}
        </Text>
        <Icon
          name={isOpen ? 'chevron-up' : 'chevron-down'}
          size={isSmall ? 14 : 16}
          color={disabled ? '#CBD5E1' : isOpen ? '#085444' : '#64748B'}
        />
      </TouchableOpacity>

      {/* Portal/Modal Overlay Menu */}
      <Modal
        visible={isOpen}
        transparent={true}
        animationType="none"
        onRequestClose={handleClose}
        statusBarTranslucent
      >
        {/* Full-screen backdrop to dismiss on outside tap */}
        <Pressable
          style={styles.backdrop}
          onPress={handleClose}
          accessibilityRole="button"
          accessibilityLabel="Close dropdown menu"
          testID={testID ? `${testID}-backdrop` : 'dropdown-backdrop'}
        />

        {/* Floating Options Menu Overlay */}
        <Animated.View
          style={[
            styles.overlayMenu,
            {
              top: menuTop,
              left: menuLeft,
              width: menuWidth,
              maxHeight: effectiveMaxHeight,
            },
            !isTest && {
              opacity: animatedOpacity,
              transform: [
                { translateY: animatedTranslateY },
                { scale: animatedScale },
              ],
            },
          ]}
          testID={testID ? `${testID}-menu` : 'dropdown-overlay-menu'}
        >
          <ScrollView
            style={{ maxHeight: effectiveMaxHeight }}
            nestedScrollEnabled
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator
          >
            {options.map((option, idx) => {
              const isSelected = option.value === selectedValue;
              const isLast = idx === options.length - 1;

              return (
                <TouchableOpacity
                  key={option.key || `${option.label}-${idx}`}
                  style={[
                    styles.optionItem,
                    isSmall && styles.optionItemSmall,
                    isSelected && styles.optionItemActive,
                    isLast && styles.optionItemLast,
                  ]}
                  onPress={() => handleSelect(option.value)}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={option.label}
                  accessibilityState={{ selected: isSelected }}
                  testID={testID ? `${testID}-option-${option.value ?? 'null'}` : undefined}
                >
                  <Text
                    style={[
                      styles.optionItemText,
                      isSmall && styles.optionItemTextSmall,
                      isSelected && styles.optionItemTextActive,
                    ]}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {option.label}
                  </Text>
                  {isSelected && (
                    <Icon name="check" size={isSmall ? 13 : 15} color="#085444" />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </Animated.View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  rootContainer: {
    width: '100%',
  },
  label: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.semibold,
    color: '#0F172A',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: borderRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 42,
  },
  triggerSmall: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    minHeight: 34,
  },
  triggerOpen: {
    borderColor: '#085444',
    borderWidth: 1.5,
  },
  triggerDisabled: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    opacity: 0.7,
  },
  triggerText: {
    flex: 1,
    fontSize: fontSizes.sm,
    color: '#0F172A',
    fontWeight: fontWeights.normal,
    marginRight: spacing.xs,
  },
  triggerTextSmall: {
    fontSize: fontSizes.xs,
  },
  placeholderText: {
    color: '#94A3B8',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
  },
  overlayMenu: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
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
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  optionItemSmall: {
    paddingVertical: 7,
    paddingHorizontal: 10,
  },
  optionItemActive: {
    backgroundColor: '#F0FDF4',
  },
  optionItemLast: {
    borderBottomWidth: 0,
  },
  optionItemText: {
    flex: 1,
    fontSize: fontSizes.xs,
    color: '#0F172A',
  },
  optionItemTextSmall: {
    fontSize: 11,
  },
  optionItemTextActive: {
    color: '#085444',
    fontWeight: fontWeights.semibold,
  },
});
