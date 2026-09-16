import React from 'react';
import Svg, { G, Path, Rect } from 'react-native-svg';

export interface LeafWatermarkProps {
  width?: number;
  height?: number;
  opacity?: number;
}

export const LeafWatermarkGraphic: React.FC<LeafWatermarkProps> = ({
  width = 110,
  height = 80,
  opacity = 0.22,
}) => {
  return (
    <Svg width={width} height={height} viewBox="0 0 110 80" fill="none">
      {/* Primary Leaf */}
      <Path
        d="M 15,75 C 20,40 50,15 105,5 C 95,45 60,75 15,75 Z"
        fill="#A7F3D0"
        opacity={opacity}
      />
      {/* Primary Leaf Spine */}
      <Path
        d="M 15,75 C 45,55 75,32 105,5"
        stroke="#6EE7B7"
        strokeWidth={1.5}
        strokeLinecap="round"
        opacity={opacity * 1.4}
      />
      {/* Secondary Leaf */}
      <Path
        d="M 45,78 C 45,52 65,30 100,22 C 96,50 72,74 45,78 Z"
        fill="#6EE7B7"
        opacity={opacity * 0.75}
      />
    </Svg>
  );
};

export interface LastUpdatedGraphicProps {
  width?: number;
  height?: number;
}

export const LastUpdatedGraphic: React.FC<LastUpdatedGraphicProps> = ({
  width = 72,
  height = 48,
}) => {
  return (
    <Svg width={width} height={height} viewBox="0 0 72 48" fill="none">
      {/* Soft mint cross in upper right background */}
      <Rect x="58" y="4" width="7" height="2" rx="1" fill="#A7F3D0" opacity={0.65} />
      <Rect x="60.5" y="1.5" width="2" height="7" rx="1" fill="#A7F3D0" opacity={0.65} />

      {/* Decorative herbal leaves on the left */}
      <Path
        d="M 28,34 C 18,30 14,24 12,18 C 18,20 24,26 28,34 Z"
        fill="#34D399"
        opacity={0.85}
      />
      <Path
        d="M 29,35 C 26,26 28,19 33,15 C 33,22 31,29 29,35 Z"
        fill="#059669"
        opacity={0.75}
      />
      <Path
        d="M 30,36 C 23,34 19,30 18,26 C 23,27 27,31 30,36 Z"
        fill="#6EE7B7"
        opacity={0.9}
      />

      {/* Pill Capsule tilted at -36 degrees */}
      <G transform="rotate(-36 44 26)">
        {/* Lower body (emerald green) */}
        <Path
          d="M 38,26 L 38,36 A 5.5,5.5 0 0,0 49,36 L 49,26 Z"
          fill="#059669"
        />
        {/* Upper cap (crisp white) */}
        <Path
          d="M 38,26 L 38,16 A 5.5,5.5 0 0,1 49,16 L 49,26 Z"
          fill="#FFFFFF"
        />
        {/* Capsule outer stroke */}
        <Rect
          x="38"
          y="10.5"
          width="11"
          height="26"
          rx="5.5"
          stroke="#10B981"
          strokeWidth="1.2"
          fill="none"
        />
        {/* Middle joint line */}
        <Path d="M 38,26 L 49,26" stroke="#10B981" strokeWidth="1.2" />
      </G>
    </Svg>
  );
};
