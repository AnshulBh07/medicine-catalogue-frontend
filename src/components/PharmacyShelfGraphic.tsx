import React from 'react';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

export interface PharmacyShelfGraphicProps {
  width?: number;
  height?: number;
}

export const PharmacyShelfGraphic: React.FC<PharmacyShelfGraphicProps> = ({
  width = 170,
  height = 116,
}) => {
  return (
    <Svg width={width} height={height} viewBox="36 24 164 116" fill="none">
      <Defs>
        {/* Soft radial-like linear gradient for backdrop */}
        <LinearGradient id="bgGlow" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#E6F8EF" stopOpacity="0.95" />
          <Stop offset="100%" stopColor="#D1FAE5" stopOpacity="0.6" />
        </LinearGradient>

        {/* Gradient for main bottle */}
        <LinearGradient id="mainBottleGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <Stop offset="0%" stopColor="#059669" />
          <Stop offset="40%" stopColor="#10B981" />
          <Stop offset="100%" stopColor="#047857" />
        </LinearGradient>

        {/* Gradient for small bottle */}
        <LinearGradient id="smallBottleGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <Stop offset="0%" stopColor="#10B981" />
          <Stop offset="50%" stopColor="#34D399" />
          <Stop offset="100%" stopColor="#059669" />
        </LinearGradient>
      </Defs>

      {/* 1. Background Circular Soft Glow */}
      <Circle cx="125" cy="72" r="56" fill="url(#bgGlow)" />

      {/* 2. Soft Pedestal / Surface Shadow */}
      <Ellipse cx="120" cy="132" rx="65" ry="5.5" fill="#D1FAE5" opacity={0.8} />

      {/* 3. Sparkle Stars (✦) from reference */}
      {/* Top Left Sparkle Star */}
      <Path
        d="M 103,34 Q 103,40 109,40 Q 103,40 103,46 Q 103,40 97,40 Q 103,40 103,34 Z"
        fill="#6EE7B7"
      />
      {/* Top Right Sparkle Star */}
      <Path
        d="M 174,29 Q 174,34 179,34 Q 174,34 174,39 Q 174,34 169,34 Q 174,34 174,29 Z"
        fill="#6EE7B7"
      />
      {/* Mid Right Small Sparkle Star */}
      <Path
        d="M 186,52 Q 186,56 190,56 Q 186,56 186,60 Q 186,56 182,56 Q 186,56 186,52 Z"
        fill="#A7F3D0"
      />

      {/* 4. Background Foliage / Leaves */}
      {/* Left foliage cluster */}
      <G>
        {/* Left top leaf */}
        <Path
          d="M 100,75 C 90,52 74,40 52,42 C 54,64 68,80 90,83 C 94,80 97,77 100,75 Z"
          fill="#10B981"
        />
        {/* Left middle leaf */}
        <Path
          d="M 92,86 C 76,72 56,66 38,74 C 44,92 62,102 82,97 C 86,93 89,90 92,86 Z"
          fill="#059669"
        />
        {/* Left bottom leaf */}
        <Path
          d="M 98,98 C 82,96 66,104 56,118 C 72,126 90,118 99,106 Z"
          fill="#047857"
          opacity={0.9}
        />
        {/* Stem curve */}
        <Path
          d="M 52,44 C 74,68 88,96 95,124"
          stroke="#065F46"
          strokeWidth="2"
          strokeLinecap="round"
          opacity={0.3}
        />
      </G>

      {/* Right foliage cluster */}
      <G>
        {/* Right top leaf */}
        <Path
          d="M 160,82 C 172,66 182,60 194,62 C 192,76 184,88 170,92 Z"
          fill="#10B981"
        />
        {/* Right lower leaf */}
        <Path
          d="M 165,95 C 176,86 188,84 196,88 C 192,100 182,108 171,105 Z"
          fill="#059669"
        />
      </G>

      {/* 5. Main Emerald Medicine Bottle (Center) */}
      <G>
        {/* Cap */}
        <Rect x="108" y="30" width="34" height="13" rx="3.5" fill="#065F46" />
        {/* Cap ribs */}
        <Rect x="113" y="32" width="2" height="9" rx="1" fill="#047857" />
        <Rect x="118" y="32" width="2" height="9" rx="1" fill="#047857" />
        <Rect x="123" y="32" width="2" height="9" rx="1" fill="#047857" />
        <Rect x="128" y="32" width="2" height="9" rx="1" fill="#047857" />
        <Rect x="133" y="32" width="2" height="9" rx="1" fill="#047857" />

        {/* Neck collar */}
        <Rect x="111" y="42" width="28" height="4" rx="1.5" fill="#047857" />

        {/* Bottle Body */}
        <Path
          d="M 111,46 L 139,46 C 146,46 151,51 152,58 L 152,114 C 152,121 146,126 139,126 L 111,126 C 104,126 98,121 98,114 L 98,58 C 98,51 104,46 111,46 Z"
          fill="url(#mainBottleGrad)"
        />

        {/* Bottle highlight on shoulder */}
        <Path
          d="M 103,60 C 103,53 107,49 113,48 L 115,48 C 109,49 105,54 105,62 L 105,110 C 105,114 104,116 103,116 Z"
          fill="#A7F3D0"
          opacity={0.35}
        />

        {/* White Label */}
        <Rect x="104" y="60" width="32" height="34" rx="4" fill="#FFFFFF" />

        {/* Bold Medical Cross in Label */}
        <Rect x="117.5" y="69" width="5" height="16" rx="1.2" fill="#059669" />
        <Rect x="112" y="74.5" width="16" height="5" rx="1.2" fill="#059669" />
      </G>

      {/* 6. Smaller Medicine Bottle (Right) */}
      <G>
        {/* Cap */}
        <Rect x="153" y="58" width="20" height="9" rx="2.5" fill="#065F46" />
        {/* Cap ribs */}
        <Rect x="157" y="60" width="1.5" height="5" rx="0.5" fill="#047857" />
        <Rect x="161" y="60" width="1.5" height="5" rx="0.5" fill="#047857" />
        <Rect x="165" y="60" width="1.5" height="5" rx="0.5" fill="#047857" />

        {/* Bottle Body */}
        <Rect x="149" y="66" width="28" height="42" rx="6" fill="url(#smallBottleGrad)" />

        {/* Small White Label */}
        <Rect x="153" y="76" width="20" height="20" rx="2.5" fill="#FFFFFF" opacity={0.95} />
        {/* Label bars */}
        <Rect x="156" y="81" width="14" height="2.5" rx="1" fill="#A7F3D0" />
        <Rect x="156" y="86" width="11" height="2.5" rx="1" fill="#A7F3D0" />
      </G>

      {/* 7. Pill Blister Pack (Front-Left, tilted) */}
      <G transform="rotate(-14 85 105)">
        <Rect
          x="68"
          y="86"
          width="28"
          height="34"
          rx="5"
          fill="#34D399"
          stroke="#059669"
          strokeWidth="1.2"
        />
        {/* 6 White Round Tablets */}
        <Circle cx="76" cy="94" r="3.2" fill="#FFFFFF" />
        <Circle cx="88" cy="94" r="3.2" fill="#FFFFFF" />
        <Circle cx="76" cy="103" r="3.2" fill="#FFFFFF" />
        <Circle cx="88" cy="103" r="3.2" fill="#FFFFFF" />
        <Circle cx="76" cy="112" r="3.2" fill="#FFFFFF" />
        <Circle cx="88" cy="112" r="3.2" fill="#FFFFFF" />

        {/* Inner pill bevel highlights */}
        <Circle cx="75" cy="93" r="1" fill="#DCFCE7" />
        <Circle cx="87" cy="93" r="1" fill="#DCFCE7" />
        <Circle cx="75" cy="102" r="1" fill="#DCFCE7" />
        <Circle cx="87" cy="102" r="1" fill="#DCFCE7" />
        <Circle cx="75" cy="111" r="1" fill="#DCFCE7" />
        <Circle cx="87" cy="111" r="1" fill="#DCFCE7" />
      </G>

      {/* 8. Two-Tone Capsule Pill (Front-Center, lying down) */}
      <G transform="rotate(-38 130 120)">
        {/* Capsule container pill shape */}
        {/* Left half (White) */}
        <Path
          d="M 120,118 C 117,118 114,120.5 114,124 C 114,127.5 117,130 120,130 L 127,130 L 127,118 Z"
          fill="#FFFFFF"
        />
        {/* Right half (Green) */}
        <Path
          d="M 127,118 L 134,118 C 137,118 140,120.5 140,124 C 140,127.5 137,130 134,130 L 127,130 Z"
          fill="#059669"
        />
        {/* Shine on capsule */}
        <Path
          d="M 117,120.5 L 137,120.5"
          stroke="#FFFFFF"
          strokeWidth="1"
          strokeLinecap="round"
          opacity={0.6}
        />
      </G>

      {/* 9. Round Green Tablet / Lozenge (Front-Right) */}
      <G>
        <Ellipse cx="149" cy="126" rx="7" ry="4.5" fill="#047857" />
        <Ellipse cx="149" cy="125" rx="6.2" ry="3.8" fill="#065F46" />
        <Path
          d="M 145,124 C 146,122.8 151,122.8 153,124"
          stroke="#34D399"
          strokeWidth="0.8"
          strokeLinecap="round"
          opacity={0.8}
        />
      </G>
    </Svg>
  );
};
