import React, { type ReactNode } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { colors, fontSizes, fontWeights, spacing } from '../theme';
import { Avatar, type AvatarColorVariant } from './Avatar';
import { Icon, type IconName } from './Icon';

export interface ListItemProps {
  title: string;
  subtitle?: string;
  tertiary?: string;
  avatarInitials?: string;
  avatarIcon?: IconName;
  avatarColor?: AvatarColorVariant;
  rightElement?: ReactNode;
  showChevron?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export const ListItem: React.FC<ListItemProps> = ({
  title,
  subtitle,
  tertiary,
  avatarInitials,
  avatarIcon,
  avatarColor = 'teal',
  rightElement,
  showChevron = true,
  onPress,
  style,
  testID,
}) => {
  const content = (
    <View style={[styles.container, style]} testID={testID}>
      {avatarInitials || avatarIcon ? (
        <View style={styles.left}>
          <Avatar
            initials={avatarInitials}
            icon={avatarIcon}
            colorVariant={avatarColor}
            size="md"
          />
        </View>
      ) : null}

      <View style={styles.center}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
        {tertiary ? (
          <Text style={styles.tertiary} numberOfLines={1}>
            {tertiary}
          </Text>
        ) : null}
      </View>

      <View style={styles.right}>
        {rightElement}
        {showChevron && onPress ? (
          <Icon name="chevron-right" size="sm" color={colors.textMuted} />
        ) : null}
      </View>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.7}
        accessibilityRole="button"
      >
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  left: {
    marginRight: spacing.md,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.semibold,
    color: colors.textPrimary,
    lineHeight: 20,
  },
  subtitle: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  tertiary: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: spacing.sm,
    gap: spacing.xs,
  },
});
