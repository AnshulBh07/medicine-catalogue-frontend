import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { borderRadius, colors, fontSizes, fontWeights, spacing } from '../theme';
import { Icon, type IconName } from './Icon';

export type BadgeVariant =
  | 'primary'
  | 'secondary'
  | 'success'
  | 'error'
  | 'warning'
  | 'admin'
  | 'employee';

export interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  icon?: IconName;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  testID?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  label,
  variant = 'primary',
  icon,
  style,
  textStyle,
  testID,
}) => {
  const iconColor =
    variant === 'admin'
      ? colors.roleAdmin
      : variant === 'employee'
        ? colors.roleEmployee
        : variant === 'success'
          ? colors.successDark
          : variant === 'error'
            ? colors.errorDark
            : colors.primary;

  return (
    <View style={[styles.badge, styles[variant], style]} testID={testID}>
      {icon ? (
        <View style={styles.iconContainer}>
          <Icon name={icon} size={12} color={iconColor} />
        </View>
      ) : variant === 'admin' ? (
        <View style={styles.iconContainer}>
          <Icon name="crown" size={12} color={colors.roleAdmin} />
        </View>
      ) : null}
      <Text style={[styles.text, styles[`text_${variant}`], textStyle]}>
        {label}
      </Text>
    </View>
  );
};

export const StatusBadge = Badge;

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: borderRadius.full,
    alignSelf: 'flex-start',
    gap: 3,
  },
  iconContainer: {
    marginRight: 1,
  },
  text: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  // Variants
  primary: {
    backgroundColor: colors.primaryLight,
  },
  text_primary: {
    color: colors.primaryDark,
  },
  secondary: {
    backgroundColor: colors.secondaryLight,
  },
  text_secondary: {
    color: colors.secondary,
  },
  success: {
    backgroundColor: colors.successLight,
  },
  text_success: {
    color: colors.successDark,
  },
  error: {
    backgroundColor: colors.errorLight,
  },
  text_error: {
    color: colors.errorDark,
  },
  warning: {
    backgroundColor: colors.warningLight,
  },
  text_warning: {
    color: colors.warningDark,
  },
  admin: {
    backgroundColor: colors.roleAdminLight,
  },
  text_admin: {
    color: colors.roleAdmin,
  },
  employee: {
    backgroundColor: colors.roleEmployeeLight,
  },
  text_employee: {
    color: colors.roleEmployee,
  },
});
