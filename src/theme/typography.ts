import type { TextStyle } from 'react-native';

export const fontSizes = {
  xs: 11,
  sm: 13,
  base: 15,
  md: 17,
  lg: 19,
  xl: 22,
  xxl: 26,
  xxxl: 32,
};

export const fontWeights: { [key: string]: TextStyle['fontWeight'] } = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
};

export const typography: { [key: string]: TextStyle } = {
  screenTitle: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold,
    lineHeight: 26,
    letterSpacing: -0.2,
  },
  sectionTitle: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.bold,
    lineHeight: 24,
    letterSpacing: -0.1,
  },
  cardTitle: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.semibold,
    lineHeight: 22,
  },
  body: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.regular,
    lineHeight: 22,
  },
  bodyMedium: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.medium,
    lineHeight: 22,
  },
  bodyBold: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.bold,
    lineHeight: 22,
  },
  secondary: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.regular,
    lineHeight: 18,
  },
  secondaryMedium: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.medium,
    lineHeight: 18,
  },
  caption: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.regular,
    lineHeight: 16,
  },
  label: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.medium,
    lineHeight: 18,
  },
  dataValue: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.semibold,
    lineHeight: 22,
  },
  button: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.semibold,
    lineHeight: 22,
    letterSpacing: 0.1,
  },
  micro: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.semibold,
    lineHeight: 14,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
};
