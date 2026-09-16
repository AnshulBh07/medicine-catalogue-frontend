import React from 'react';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';

export interface PharmacyShelfGraphicProps {
  width?: number;
  height?: number;
}

export const PharmacyShelfGraphic: React.FC<PharmacyShelfGraphicProps> = ({
  width = 126,
  height = 92,
}) => {
  return (
    <Svg width={width} height={height} viewBox="0 0 130 95" fill="none">
      {/* Background Soft Glow Tint */}
      <Circle cx="68" cy="50" r="38" fill="#E8F8EE" opacity={0.9} />

      {/* Sparkles / Stars ✦ */}
      {/* Top Left Sparkle */}
      <Path
        d="M 28,26 C 28,23 30,21 33,21 C 30,21 28,19 28,16 C 28,19 26,21 23,21 C 26,21 28,23 28,26 Z"
        fill="#A7F3D0"
      />
      {/* Top Right Sparkle */}
      <Path
        d="M 106,20 C 106,17 108,15 111,15 C 108,15 106,13 106,10 C 106,13 104,15 101,15 C 104,15 106,17 106,20 Z"
        fill="#6EE7B7"
      />
      {/* Mid Right Small Sparkle */}
      <Path
        d="M 116,42 C 116,40 117.5,38.5 119.5,38.5 C 117.5,38.5 116,37 116,35 C 116,37 114.5,38.5 112.5,38.5 C 114.5,38.5 116,40 116,42 Z"
        fill="#A7F3D0"
      />

      {/* Tall Dark Green Bottle (Center-Back) */}
      <G>
        <Rect x="71" y="22" width="7" height="6" rx="1.5" fill="#047857" />
        <Rect x="66" y="27" width="17" height="38" rx="4" fill="#059669" />
        <Rect x="69" y="32" width="11" height="8" rx="1" fill="#10B981" opacity={0.6} />
      </G>

      {/* Clear Glass Bottle with Cork & Liquid (Right-Back) */}
      <G>
        <Rect x="90" y="27" width="8" height="5" rx="1.5" fill="#047857" />
        <Rect x="85" y="32" width="18" height="34" rx="4" fill="#E6F4EA" stroke="#6EE7B7" strokeWidth="1.5" />
        {/* Liquid inside */}
        <Path d="M 86,52 L 102,52 L 102,62 A 3,3 0 0,1 99,65 L 89,65 A 3,3 0 0,1 86,62 Z" fill="#A7F3D0" />
      </G>

      {/* Herbal Plant Leaves (Left-Front) */}
      <G>
        {/* Stem */}
        <Path
          d="M 26,75.5 C 25,62 27,48 33,34"
          stroke="#059669"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        {/* Main top leaf */}
        <Path
          d="M 28,52 C 25,40 27,33 33,30 C 37,38 34,47 28,52 Z"
          fill="#10B981"
        />
        {/* Left upper leaf */}
        <Path
          d="M 27,60 C 18,52 14,45 13,38 C 20,40 25,48 27,60 Z"
          fill="#059669"
        />
        {/* Right leaf */}
        <Path
          d="M 28,58 C 34,51 40,47 45,46 C 42,54 36,58 28,58 Z"
          fill="#047857"
        />
        {/* Lower small left leaf */}
        <Path
          d="M 26,68 C 20,63 17,58 18,53 C 23,55 25,60 26,68 Z"
          fill="#34D399"
        />
      </G>

      {/* Medium Green Jar with White Label & Medical Cross (Center-Front) */}
      <G>
        {/* Cap */}
        <Rect x="49" y="38" width="16" height="5" rx="2" fill="#047857" />
        {/* Bottle Body */}
        <Rect x="45" y="43" width="24" height="33" rx="4.5" fill="#10B981" />
        {/* White Label */}
        <Rect x="48.5" y="52" width="17" height="18" rx="2" fill="#FFFFFF" />
        {/* Green Medical Cross */}
        <Rect x="52" y="59.5" width="10" height="3" rx="0.75" fill="#059669" />
        <Rect x="55.5" y="56" width="3" height="10" rx="0.75" fill="#059669" />
      </G>

      {/* Pill Blister Pack (Front-Right) */}
      <G>
        <Rect x="75" y="47" width="24" height="27" rx="4" fill="#059669" />
        {/* 6 White Round Pills */}
        <Circle cx="81.5" cy="54" r="2.5" fill="#FFFFFF" />
        <Circle cx="87" cy="54" r="2.5" fill="#FFFFFF" />
        <Circle cx="92.5" cy="54" r="2.5" fill="#FFFFFF" />
        <Circle cx="81.5" cy="63" r="2.5" fill="#FFFFFF" />
        <Circle cx="87" cy="63" r="2.5" fill="#FFFFFF" />
        <Circle cx="92.5" cy="63" r="2.5" fill="#FFFFFF" />
      </G>

      {/* Base Shelf / Counter Line */}
      <Rect x="14" y="75.5" width="104" height="3" rx="1.5" fill="#A7F3D0" />
    </Svg>
  );
};
