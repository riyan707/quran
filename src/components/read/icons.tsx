import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

const ACCENT = '#47d7a8';
const MUTED = '#8d9290';

export function ContentsIcon({ color = ACCENT, size = 22 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 22 22" fill="none" stroke={color} strokeWidth={1.7} strokeLinecap="round">
      <Path d="M7 5h12M7 11h12M7 17h12" />
      <Circle cx={3} cy={5} r={1.2} fill={color} stroke="none" />
      <Circle cx={3} cy={11} r={1.2} fill={color} stroke="none" />
      <Circle cx={3} cy={17} r={1.2} fill={color} stroke="none" />
    </Svg>
  );
}

export function SearchIcon({ color = ACCENT, size = 22 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 22 22" fill="none" stroke={color} strokeWidth={1.7} strokeLinecap="round">
      <Circle cx={10} cy={10} r={6.5} />
      <Path d="M15 15l4 4" />
    </Svg>
  );
}

export function SettingsGearIcon({ color = MUTED, size = 22 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 22 22" fill="none" stroke={color} strokeWidth={1.7} strokeLinecap="round">
      <Path d="M3 6h10M17 6h2M3 12h4M11 12h8M3 18h9M16 18h3" />
      <Circle cx={15} cy={6} r={2} />
      <Circle cx={9} cy={12} r={2} />
      <Circle cx={14} cy={18} r={2} />
    </Svg>
  );
}

export function ChevronDownIcon({ color = ACCENT, size = 12 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 14 14" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round">
      <Path d="M3.5 5.5L7 9l3.5-3.5" />
    </Svg>
  );
}

export function PlayIcon({ color = '#06140f', size = 11 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16" fill={color}>
      <Path d="M4.5 2.4v11.2L13 8z" />
    </Svg>
  );
}

export function PauseIcon({ color = '#06140f', size = 11 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16" fill={color}>
      <Rect x={3} y={2} width={4} height={12} rx={1.2} />
      <Rect x={9} y={2} width={4} height={12} rx={1.2} />
    </Svg>
  );
}
