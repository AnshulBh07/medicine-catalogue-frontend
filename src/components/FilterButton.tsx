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
import { Icon } from './Icon';

export interface FilterButtonProps {
  onPress: () => void;
  activeCount?: number;
  label?: string;
  variant?: 'icon' | 'pill';
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export const FilterButton: React.FC<FilterButtonProps> = ({
  onPress,
  activeCount = 0,
  label = 'Filters',
  variant = 'icon',
  style,
  testID,
}) => {
  const hasActiveFilters = activeCount > 0;

  if (variant === 'pill') {
    return (
      <TouchableOpacity
        testID={testID}
        onPress={onPress}
        style={[
          styles.pill,
          hasActiveFilters && styles.pillActive,
          style,
        ]}
        accessibilityRole="button"
        accessibilityLabel={`${label}${hasActiveFilters ? `, ${activeCount} active` : ''}`}
      >
        <Icon
          name={hasActiveFilters ? 'filter-filled' : 'filter'}
          size={14}
          color={hasActiveFilters ? colors.textInverse : colors.textSecondary}
        />
        <Text
          style={[
            styles.pillText,
            hasActiveFilters && styles.pillTextActive,
          ]}
        >
          {label}
        </Text>
        {hasActiveFilters ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{activeCount}</Text>
          </View>
        ) : null}
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      testID={testID}
      onPress={onPress}
      style={[styles.iconButton, style]}
      accessibilityRole="button"
      accessibilityLabel={`Filter${hasActiveFilters ? `, ${activeCount} active` : ''}`}
    >
      <Icon
        name={hasActiveFilters ? 'filter-filled' : 'filter'}
        size="md"
        color={colors.textInverse}
      />
      {hasActiveFilters ? (
        <View style={styles.iconDot} />
      ) : null}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  iconButton: {
    padding: spacing.xs,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconDot: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.warning,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.full,
    paddingVertical: 5,
    paddingHorizontal: 10,
    height: 32,
    gap: 5,
  },
  pillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  pillText: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.medium,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  pillTextActive: {
    color: colors.textInverse,
    fontWeight: fontWeights.semibold,
  },
  badge: {
    backgroundColor: colors.surface,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 9.5,
    fontWeight: fontWeights.bold,
    color: colors.primary,
    lineHeight: 12,
  },
});
