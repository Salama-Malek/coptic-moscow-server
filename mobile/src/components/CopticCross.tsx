import React from 'react';
import Svg, { Path, G } from 'react-native-svg';

interface CopticCrossProps {
  size?: number;
  color?: string;
}

export default function CopticCross({ size = 60, color = '#C9A24A' }: CopticCrossProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <G>
        {/* Coptic cross — stylized ankh-cross motif */}
        {/* Vertical beam */}
        <Path d="M45 25 L55 25 L55 85 L45 85 Z" fill={color} />
        {/* Horizontal beam */}
        <Path d="M25 45 L75 45 L75 55 L25 55 Z" fill={color} />
        {/* Circle at top (loop) */}
        <Path
          d="M50 10 C40 10, 32 18, 32 28 C32 38, 40 45, 50 45 C60 45, 68 38, 68 28 C68 18, 60 10, 50 10 Z M50 18 C56 18, 60 22, 60 28 C60 34, 56 38, 50 38 C44 38, 40 34, 40 28 C40 22, 44 18, 50 18 Z"
          fill={color}
          fillRule="evenodd"
        />
        {/* Small decorative ends */}
        <Path d="M20 42 L28 42 L28 58 L20 58 Z" fill={color} />
        <Path d="M72 42 L80 42 L80 58 L72 58 Z" fill={color} />
        <Path d="M42 80 L58 80 L58 88 L42 88 Z" fill={color} />
      </G>
    </Svg>
  );
}
