// components/charts.tsx — grafieken, getekend met SVG (react-native-svg)
// Bevat: Ring (ronde voortgangscirkel), Sparkline (mini-lijngrafiekje),
// LineChart (grote grafiek met assen) en Donut (ringdiagram met segmenten).
// Alle grafieken animeren zachtjes bij het laden.
import React, { useEffect, useRef, useMemo } from 'react';
import { View, Animated } from 'react-native';
import Svg, { Circle, Path, Defs, LinearGradient, Stop, G, Line, Text as SvgText } from 'react-native-svg';
import { useTheme } from './store';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedPath = Animated.createAnimatedComponent(Path);

// ── Circular progress ring ───────────────────────────────────
export function Ring({
  size = 150, stroke = 14, value = 0, color, track, glow = false, dur = 1100, children,
}: {
  size?: number; stroke?: number; value?: number; color?: string; track?: string;
  glow?: boolean; dur?: number; children?: React.ReactNode;
}) {
  const { c } = useTheme();
  const col = color || c.accent;
  const trk = track || c.track;
  const r = (size - stroke) / 2;
  const C = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value)) / 100;
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: 1, duration: dur, useNativeDriver: false }).start();
  }, [pct]);
  const dashoffset = anim.interpolate({ inputRange: [0, 1], outputRange: [C, C * (1 - pct)] });
  const cx = size / 2;
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <G rotation={-90} origin={`${cx}, ${cx}`}>
          <Circle cx={cx} cy={cx} r={r} stroke={trk} strokeWidth={stroke} fill="none" />
          {glow ? (
            <AnimatedCircle cx={cx} cy={cx} r={r} stroke={col} strokeWidth={stroke + 4} fill="none"
              strokeDasharray={C} strokeDashoffset={dashoffset} strokeLinecap="round" opacity={0.18} />
          ) : null}
          <AnimatedCircle cx={cx} cy={cx} r={r} stroke={col} strokeWidth={stroke} fill="none"
            strokeDasharray={C} strokeDashoffset={dashoffset} strokeLinecap="round" />
        </G>
      </Svg>
      {children ? (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
          {children}
        </View>
      ) : null}
    </View>
  );
}

function buildPath(vals: number[], w: number, h: number, pad = 2) {
  const min = Math.min(...vals), max = Math.max(...vals);
  const rng = max - min || 1;
  const step = (w - pad * 2) / (vals.length - 1);
  return vals.map((v, i) => {
    const x = pad + i * step;
    const y = pad + (h - pad * 2) * (1 - (v - min) / rng);
    return `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(' ');
}

// ── Sparkline ────────────────────────────────────────────────
export function Sparkline({
  data, color, w = 100, h = 30, fill = true, sw = 1.8,
}: { data: number[]; color?: string; w?: number; h?: number; fill?: boolean; sw?: number }) {
  const { c } = useTheme();
  const col = color || c.accent;
  const uid = useMemo(() => 'sp' + Math.random().toString(36).slice(2, 7), []);
  const d = buildPath(data, w, h, 2);
  const area = `${d} L${w - 2} ${h - 2} L2 ${h - 2} Z`;
  const op = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.timing(op, { toValue: 1, duration: 600, delay: 250, useNativeDriver: true }).start(); }, []);
  return (
    <Animated.View style={{ opacity: op }}>
      <Svg width={w} height={h}>
        <Defs>
          <LinearGradient id={uid} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={col} stopOpacity={0.28} />
            <Stop offset="1" stopColor={col} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        {fill ? <Path d={area} fill={`url(#${uid})`} /> : null}
        <Path d={d} stroke={col} strokeWidth={sw} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    </Animated.View>
  );
}

// ── Full line chart with axis + gridlines ────────────────────
export function LineChart({
  data, labels, color, w = 320, h = 150, yTicks, last,
}: { data: number[]; labels?: string[]; color?: string; w?: number; h?: number; yTicks?: number[]; last?: boolean }) {
  const { c } = useTheme();
  const col = color || c.accent;
  const uid = useMemo(() => 'lc' + Math.random().toString(36).slice(2, 7), []);
  const padL = 26, padB = 22, padT = 8, padR = 6;
  const min = Math.min(...data), max = Math.max(...data);
  const rng = max - min || 1;
  const iw = w - padL - padR, ih = h - padT - padB;
  const step = iw / (data.length - 1);
  const pts = data.map((v, i) => [padL + i * step, padT + ih * (1 - (v - min) / rng)]);
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
  const area = `${d} L${pts[pts.length - 1][0]} ${padT + ih} L${padL} ${padT + ih} Z`;
  const ticks = yTicks || [max, (max + min) / 2, min];
  const op = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.timing(op, { toValue: 1, duration: 700, delay: 200, useNativeDriver: true }).start(); }, []);
  return (
    <Animated.View style={{ opacity: op }}>
      <Svg width={w} height={h}>
        <Defs>
          <LinearGradient id={uid} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={col} stopOpacity={0.3} />
            <Stop offset="1" stopColor={col} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        {ticks.map((t, i) => {
          const y = padT + ih * (1 - (t - min) / rng);
          return (
            <G key={i}>
              <Line x1={padL} y1={y} x2={w - padR} y2={y} stroke={c.line} strokeWidth={1} />
              <SvgText x={0} y={y + 3.5} fontSize={9.5} fill={c.dim}>{Math.round(t)}</SvgText>
            </G>
          );
        })}
        <Path d={area} fill={`url(#${uid})`} />
        <Path d={d} stroke={col} strokeWidth={2.4} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        {last ? <Circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r={4} fill={col} /> : null}
        {labels ? labels.map((l, i) => (
          <SvgText key={i} x={padL + (iw / (labels.length - 1)) * i} y={h - 6} fontSize={9.5} fill={c.dim}
            textAnchor={i === 0 ? 'start' : i === labels.length - 1 ? 'end' : 'middle'}>{l}</SvgText>
        )) : null}
      </Svg>
    </Animated.View>
  );
}

// ── Multi-segment donut ──────────────────────────────────────
export function Donut({
  segments, size = 132, stroke = 18, gap = 3,
}: { segments: { value: number; color: string }[]; size?: number; stroke?: number; gap?: number }) {
  const { c } = useTheme();
  const r = (size - stroke) / 2;
  const C = 2 * Math.PI * r;
  const total = segments.reduce((s, x) => s + x.value, 0);
  const cx = size / 2;
  let acc = 0;
  return (
    <Svg width={size} height={size}>
      <G rotation={-90} origin={`${cx}, ${cx}`}>
        <Circle cx={cx} cy={cx} r={r} stroke={c.track} strokeWidth={stroke} fill="none" />
        {segments.map((seg, i) => {
          const frac = seg.value / total;
          const dash = Math.max(0, C * frac - gap);
          const el = (
            <Circle key={i} cx={cx} cy={cx} r={r} stroke={seg.color} strokeWidth={stroke} fill="none"
              strokeDasharray={`${dash} ${C}`} strokeDashoffset={-C * acc} strokeLinecap="butt" />
          );
          acc += frac;
          return el;
        })}
      </G>
    </Svg>
  );
}
