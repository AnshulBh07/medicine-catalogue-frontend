import { Platform, type ViewStyle } from 'react-native';
import { colors } from './colors';
import { borderRadius, componentHeights, iconSizes, spacing } from './spacing';
import { fontSizes, fontWeights, typography } from './typography';

const createShadow = (
  webBoxShadow: string,
  nativeShadow: {
    shadowColor: string;
    shadowOffset: { width: number; height: number };
    shadowOpacity: number;
    shadowRadius: number;
    elevation: number;
  },
): ViewStyle => {
  return Platform.select<ViewStyle>({
    web: {
      boxShadow: webBoxShadow,
    } as ViewStyle,
    default: nativeShadow,
  }) as ViewStyle;
};

export const theme = {
  colors,
  spacing,
  borderRadius,
  componentHeights,
  iconSizes,
  fontSizes,
  fontWeights,
  typography,
  shadows: {
    none: createShadow('none', {
      shadowColor: 'transparent',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0,
      shadowRadius: 0,
      elevation: 0,
    }),
    sm: createShadow('0px 1px 2px rgba(15, 23, 42, 0.05)', {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    }),
    md: createShadow('0px 2px 4px rgba(15, 23, 42, 0.08)', {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 4,
      elevation: 2,
    }),
    lg: createShadow('0px 4px 8px rgba(15, 23, 42, 0.12)', {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 8,
      elevation: 4,
    }),
    fab: createShadow('0px 4px 6px rgba(0, 128, 96, 0.25)', {
      shadowColor: '#008060',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 6,
      elevation: 6,
    }),
  },
};

export type Theme = typeof theme;
