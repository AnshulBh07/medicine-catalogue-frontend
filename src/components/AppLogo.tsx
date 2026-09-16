import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, G, Line, Path, Rect } from 'react-native-svg';

export interface AppLogoProps {
  /**
   * Dimension size in dp (applies to width & height)
   * @default 76
   */
  size?: number;
  /**
   * Visual variant: 'default' or 'inverse' (for dark header backgrounds)
   * @default 'default'
   */
  variant?: 'default' | 'inverse';
  /**
   * Optional custom container style
   */
  style?: StyleProp<ViewStyle>;
  /**
   * Accessibility and testing identifier
   * @default 'app-logo'
   */
  testID?: string;
  /**
   * Accessibility label for screen readers
   * @default 'Medicine Catalogue Logo'
   */
  accessibilityLabel?: string;
}

export const AppLogo: React.FC<AppLogoProps> = ({
  size = 76,
  variant = 'default',
  style,
  testID = 'app-logo',
  accessibilityLabel = 'Medicine Catalogue Logo',
}) => {
  const isInverse = variant === 'inverse';
  const ringStroke = isInverse ? '#FFFFFF' : '#1A5F45';
  const ringOpacity = isInverse ? 0.9 : 1;

  return (
    <View style={[styles.container, style]}>
      <Svg
        width={size}
        height={size}
        viewBox="0 0 200 200"
        fill="none"
        testID={testID}
        accessibilityRole="image"
        accessibilityLabel={accessibilityLabel}
      >
        {isInverse ? (
          <Circle cx="100" cy="100" r="94" fill="#04473B" stroke="#A7F3D0" strokeWidth="2.5" />
        ) : null}

        {/* Outer Circular Ring Frame */}
        <Path
          d="M 100,18 A 82,82 0 1,0 180,115"
          stroke={ringStroke}
          strokeWidth="6"
          strokeLinecap="round"
          opacity={ringOpacity}
          fill="none"
        />
        <Path
          d="M 181,85 A 82,82 0 0,0 100,18"
          stroke={ringStroke}
          strokeWidth="6"
          strokeLinecap="round"
          opacity={ringOpacity}
          fill="none"
        />

        {/* Angled Pharmaceutical Capsule (Center) */}
        <G transform="rotate(-45 96 96)">
          {/* Lower Half (Mint / Clean White Fill) */}
          <Path
            d="M 75,96 L 75,124 A 21,21 0 0,0 117,124 L 117,96 Z"
            fill="#EDF7F2"
          />

          {/* Upper Half (Deep Emerald Green Fill) */}
          <Path
            d="M 75,96 L 75,68 A 21,21 0 0,1 117,68 L 117,96 Z"
            fill="#1A5F45"
          />

          {/* White Glint / Reflection Highlight on Top Section */}
          <Path
            d="M 83,68 A 13,13 0 0,1 106,56"
            stroke="#FFFFFF"
            strokeWidth="3.5"
            strokeLinecap="round"
            fill="none"
          />

          {/* Capsule Outer Border */}
          <Rect
            x="75"
            y="47"
            width="42"
            height="98"
            rx="21"
            stroke="#1A5F45"
            strokeWidth="6.5"
            strokeLinejoin="round"
            fill="none"
          />

          {/* Central Dividing Seam Line */}
          <Line
            x1="75"
            y1="96"
            x2="117"
            y2="96"
            stroke="#1A5F45"
            strokeWidth="5"
            strokeLinecap="round"
          />
        </G>

        {/* Herbal Green Leaf Element (Bottom Right) */}
        <G>
          <Path
            d="M 98,162 C 92,168 84,178 78,180 C 102,188 152,176 186,104 C 182,142 144,180 98,162 Z"
            fill="#439965"
          />
          <Path
            d="M 98,162 C 125,168 168,145 186,104 C 150,118 116,142 98,162 Z"
            fill="#4FA872"
          />

          {/* Center White Leaf Vein */}
          <Path
            d="M 104,158 C 130,146 160,126 182,108"
            stroke="#FFFFFF"
            strokeWidth="3.5"
            strokeLinecap="round"
            fill="none"
          />
        </G>
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
