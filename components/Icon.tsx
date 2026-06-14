// components/Icon.tsx — line/solid glyph set built on react-native-svg
import React from 'react';
import Svg, { Path, Circle, Rect, G } from 'react-native-svg';

export type IconName =
  | 'bell' | 'chevR' | 'chevL' | 'chevDown' | 'flame' | 'target' | 'droplet' | 'moon'
  | 'footsteps' | 'home' | 'plan' | 'chart' | 'user' | 'plus' | 'gear' | 'share'
  | 'leaf' | 'sparkle' | 'chat' | 'check' | 'dumbbell' | 'ruler' | 'trophy' | 'link'
  | 'logout' | 'camera' | 'up' | 'sun' | 'pause' | 'play' | 'stop' | 'minus' | 'flag';

type Props = {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
  fill?: string;
};

export function Icon({ name, size = 22, color = '#fff', strokeWidth = 1.8, fill }: Props) {
  const s = { stroke: color, strokeWidth, fill: 'none', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  const solid = fill || 'none';

  const content: Record<IconName, React.ReactNode> = {
    bell: <G {...s}><Path d="M6 9a6 6 0 1 1 12 0c0 4 1 6 2 7H4c1-1 2-3 2-7Z" /><Path d="M10 21a2 2 0 0 0 4 0" /></G>,
    chevR: <Path d="M9 6l6 6-6 6" {...s} />,
    chevL: <Path d="M15 6l-6 6 6 6" {...s} />,
    chevDown: <Path d="M6 9l6 6 6-6" {...s} />,
    flame: <Path d="M12 3c1 3 4 4 4 8a4 4 0 0 1-8 0c0-1.4.6-2.3 1.2-3 .2 1 .8 1.6 1.4 1.8C10 8 10.5 5.5 12 3Z" fill={solid} stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round" />,
    target: <G {...s}><Circle cx="12" cy="12" r="8.5" /><Circle cx="12" cy="12" r="4.5" /><Circle cx="12" cy="12" r="1" fill={color} stroke="none" /></G>,
    droplet: <Path d="M12 3.5c3 3.6 5.5 6 5.5 9.2a5.5 5.5 0 0 1-11 0C6.5 9.5 9 7.1 12 3.5Z" fill={solid} stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round" />,
    moon: <Path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z" fill={solid} stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round" />,
    footsteps: <G {...s}><Path d="M7 4c1.5 0 2 1.5 2 4s-.5 4-2 4-2-1.5-2-4 .5-4 2-4Z" /><Path d="M16 8c1.5 0 2 1.5 2 4s-.5 4-2 4-2-1.5-2-4 .5-4 2-4Z" /></G>,
    home: <G {...s}><Path d="M4 11l8-7 8 7" /><Path d="M6 10v9h12v-9" /></G>,
    plan: <G {...s}><Rect x="5" y="4" width="14" height="17" rx="2.5" /><Path d="M9 9h6M9 13h6M9 17h3" /></G>,
    chart: <G {...s}><Path d="M5 19V5M5 19h14" /><Rect x="8" y="11" width="2.5" height="5" rx="0.5" fill={color} stroke="none" /><Rect x="13" y="8" width="2.5" height="8" rx="0.5" fill={color} stroke="none" /></G>,
    user: <G {...s}><Circle cx="12" cy="8" r="3.6" /><Path d="M5 20c0-3.6 3-6 7-6s7 2.4 7 6" /></G>,
    plus: <Path d="M12 5v14M5 12h14" {...s} strokeWidth={2.4} />,
    minus: <Path d="M5 12h14" {...s} strokeWidth={2.4} />,
    gear: <G {...s}><Circle cx="12" cy="12" r="3" /><Path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19" /></G>,
    share: <G {...s}><Path d="M12 15V4M8 8l4-4 4 4" /><Path d="M6 12v6a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-6" /></G>,
    leaf: <Path d="M5 19c0-8 6-13 14-13 0 8-5 14-13 14 0-3 2-6 6-8" {...s} />,
    sparkle: <Path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z" fill={solid} stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round" />,
    chat: <Path d="M5 6.5A2.5 2.5 0 0 1 7.5 4h9A2.5 2.5 0 0 1 19 6.5v6A2.5 2.5 0 0 1 16.5 15H10l-4 4v-4H7.5" stroke={color} strokeWidth={strokeWidth} fill="none" strokeLinejoin="round" />,
    check: <Path d="M5 12.5l4.5 4.5L19 7" {...s} strokeWidth={2.4} />,
    dumbbell: <G {...s}><Path d="M3 9v6M6 7v10M18 7v10M21 9v6M6 12h12" /></G>,
    ruler: <G {...s}><Rect x="3" y="8" width="18" height="8" rx="1.5" /><Path d="M7 8v3M11 8v4M15 8v3M19 8v4" /></G>,
    trophy: <G {...s}><Path d="M7 4h10v4a5 5 0 0 1-10 0V4Z" /><Path d="M7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3M9 19h6M12 14v5" /></G>,
    link: <G {...s}><Path d="M9 14a4 4 0 0 0 6 .5l2-2a4 4 0 0 0-5.7-5.7l-1 1" /><Path d="M15 10a4 4 0 0 0-6-.5l-2 2a4 4 0 0 0 5.7 5.7l1-1" /></G>,
    logout: <G {...s}><Path d="M14 5H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h8" /><Path d="M11 12h9m0 0l-3-3m3 3l-3 3" /></G>,
    camera: <G {...s}><Path d="M4 8.5A1.5 1.5 0 0 1 5.5 7H8l1.2-1.8h5.6L16 7h2.5A1.5 1.5 0 0 1 20 8.5v8A1.5 1.5 0 0 1 18.5 18h-13A1.5 1.5 0 0 1 4 16.5v-8Z" /><Circle cx="12" cy="12" r="3" /></G>,
    up: <Path d="M6 15l6-6 6 6" {...s} />,
    sun: <G {...s}><Circle cx="12" cy="12" r="4" /><Path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19" /></G>,
    pause: <G fill={color}><Rect x="6" y="5" width="4" height="14" rx="1.2" /><Rect x="14" y="5" width="4" height="14" rx="1.2" /></G>,
    play: <Path d="M7 5l12 7-12 7V5Z" fill={color} stroke="none" />,
    stop: <Rect x="6" y="6" width="12" height="12" rx="2" fill={color} stroke="none" />,
    flag: <G {...s}><Path d="M6 21V4M6 4h11l-2 4 2 4H6" /></G>,
  };

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {content[name]}
    </Svg>
  );
}
