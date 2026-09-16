import React, { useEffect, useState } from 'react';
import {
  Image,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { ENV } from '../config/env';
import { colors, fontSizes, fontWeights } from '../theme';
import { Icon, type IconName } from './Icon';

export type AvatarColorVariant = 'blue' | 'green' | 'red' | 'purple' | 'amber' | 'teal';
export type AvatarSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl';

export interface AvatarProps {
  imageUrl?: string | null;
  initials?: string;
  icon?: IconName;
  colorVariant?: AvatarColorVariant;
  size?: AvatarSize;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

const variantStyles: Record<
  AvatarColorVariant,
  { bg: string; text: string }
> = {
  blue: { bg: colors.avatarBlue, text: colors.avatarBlueText },
  green: { bg: colors.avatarGreen, text: colors.avatarGreenText },
  red: { bg: colors.avatarRed, text: colors.avatarRedText },
  purple: { bg: colors.avatarPurple, text: colors.avatarPurpleText },
  amber: { bg: colors.avatarAmber, text: colors.avatarAmberText },
  teal: { bg: colors.primaryLight, text: colors.primary },
};

const sizeDimensions: Record<AvatarSize, { size: number; fontSize: number; iconSize: number }> = {
  sm: { size: 32, fontSize: fontSizes.xs, iconSize: 16 },
  md: { size: 40, fontSize: fontSizes.sm, iconSize: 20 },
  lg: { size: 48, fontSize: fontSizes.base, iconSize: 24 },
  xl: { size: 88, fontSize: 32, iconSize: 40 },
  '2xl': { size: 112, fontSize: 40, iconSize: 48 },
};

/**
 * Resolves a raw image URL/path to a normalized, loadable absolute URI.
 * Handles relative paths, leading/trailing whitespace, and protocol checks.
 */
export const resolveAvatarUri = (rawUrl?: string | null): string | null => {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;

  // Relative backend path
  if (trimmed.startsWith('/')) {
    const apiBase = (ENV.API_BASE_URL || '').replace(/\/+$/, '');
    return `${apiBase}${trimmed}`;
  }

  return trimmed;
};

export const Avatar: React.FC<AvatarProps> = ({
  imageUrl,
  initials,
  icon,
  colorVariant = 'teal',
  size = 'md',
  style,
  testID,
}) => {
  const { bg, text } = variantStyles[colorVariant];
  const { size: dim, fontSize, iconSize } = sizeDimensions[size];
  const [imageError, setImageError] = useState(false);

  const resolvedUri = resolveAvatarUri(imageUrl);

  useEffect(() => {
    setImageError(false);
  }, [resolvedUri]);

  const hasImage = Boolean(resolvedUri && !imageError);

  const handleImageError = (e: { nativeEvent?: unknown }) => {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(
        `[Avatar] Image load failed for URI: "${resolvedUri}" (initials: "${initials || ''}"). Error:`,
        e?.nativeEvent,
      );
    }
    setImageError(true);
  };

  const handleImageLoad = () => {
    if (imageError) {
      setImageError(false);
    }
  };

  return (
    <View
      testID={testID}
      style={[
        styles.avatar,
        {
          width: dim,
          height: dim,
          borderRadius: dim / 2,
          backgroundColor: bg,
        },
        style,
      ]}
      accessibilityRole="image"
      accessibilityLabel={initials || icon || 'Avatar'}
    >
      {hasImage ? (
        <Image
          source={{ uri: resolvedUri! }}
          style={[
            styles.image,
            {
              width: dim,
              height: dim,
              borderRadius: dim / 2,
            },
          ]}
          resizeMode="cover"
          onError={handleImageError}
          onLoad={handleImageLoad}
          testID={testID ? `${testID}-image` : undefined}
        />
      ) : icon ? (
        <Icon name={icon} size={iconSize} color={text} />
      ) : initials ? (
        <Text style={[styles.initials, { color: text, fontSize }]}>
          {initials.slice(0, 2).toUpperCase()}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  initials: {
    fontWeight: fontWeights.bold,
    textAlign: 'center',
  },
});
