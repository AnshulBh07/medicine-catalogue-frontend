import React from 'react';
import Svg, {
  Defs,
  LinearGradient,
  Path,
  Rect,
  Stop,
} from 'react-native-svg';

interface Props {
  width?: number;
  height?: number;
}

export const MedicineThumbnailPlaceholder: React.FC<Props> = ({
  width = 80,
  height = 64,
}) => {
  return (
    <Svg width={width} height={height} viewBox="0 0 80 64" fill="none">
      <Defs>
        <LinearGradient id="boxGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#F8FAFC" />
          <Stop offset="100%" stopColor="#E2E8F0" />
        </LinearGradient>
        <LinearGradient id="stripGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#FFFFFF" />
          <Stop offset="100%" stopColor="#F1F5F9" />
        </LinearGradient>
      </Defs>

      {/* Background card subtle rounded box */}
      <Rect
        x="2"
        y="2"
        width="76"
        height="60"
        rx="8"
        fill="#F8FAFC"
        stroke="#E2E8F0"
        strokeWidth="1"
      />

      {/* 3D Medicine Box representation */}
      {/* Front Face */}
      <Rect
        x="12"
        y="12"
        width="38"
        height="30"
        rx="3"
        fill="url(#boxGrad)"
        stroke="#CBD5E1"
        strokeWidth="1"
      />
      {/* Top 3D Flap */}
      <Path
        d="M12 12 L20 6 L58 6 L50 12 Z"
        fill="#EEF2F6"
        stroke="#CBD5E1"
        strokeWidth="1"
      />
      {/* Right 3D Side */}
      <Path
        d="M50 12 L58 6 L58 36 L50 42 Z"
        fill="#E2E8F0"
        stroke="#CBD5E1"
        strokeWidth="1"
      />

      {/* Box brand stripe */}
      <Rect x="12" y="24" width="38" height="5" fill="#0D9488" opacity={0.6} />
      {/* Box text placeholder line */}
      <Rect x="16" y="16" width="18" height="2.5" rx="1" fill="#94A3B8" />
      <Rect x="16" y="20" width="12" height="1.5" rx="0.75" fill="#CBD5E1" />

      {/* Blister strip in front */}
      <Rect
        x="26"
        y="30"
        width="44"
        height="24"
        rx="3"
        fill="url(#stripGrad)"
        stroke="#94A3B8"
        strokeWidth="1"
      />
      {/* Blister foil grid lines */}
      <Path d="M41 30 L41 54 M56 30 L56 54" stroke="#E2E8F0" strokeWidth="1" />
      <Path d="M26 42 L70 42" stroke="#E2E8F0" strokeWidth="1" />

      {/* Blister pocket domes */}
      <Rect x="30" y="33" width="7" height="6" rx="2" fill="#E2E8F0" stroke="#CBD5E1" strokeWidth="0.75" />
      <Rect x="45" y="33" width="7" height="6" rx="2" fill="#E2E8F0" stroke="#CBD5E1" strokeWidth="0.75" />
      <Rect x="60" y="33" width="7" height="6" rx="2" fill="#E2E8F0" stroke="#CBD5E1" strokeWidth="0.75" />
      <Rect x="30" y="45" width="7" height="6" rx="2" fill="#E2E8F0" stroke="#CBD5E1" strokeWidth="0.75" />
      <Rect x="45" y="45" width="7" height="6" rx="2" fill="#E2E8F0" stroke="#CBD5E1" strokeWidth="0.75" />
      <Rect x="60" y="45" width="7" height="6" rx="2" fill="#E2E8F0" stroke="#CBD5E1" strokeWidth="0.75" />
    </Svg>
  );
};
