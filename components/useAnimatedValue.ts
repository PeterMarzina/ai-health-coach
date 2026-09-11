// components/useAnimatedValue.ts — één Animated.Value die de hele levensduur van een component blijft.
// react-native heeft zelf een useAnimatedValue, maar react-native-web (web-build) exporteert
// die niet. useState met een lazy initializer werkt overal en maakt de waarde maar één keer aan.
import { useState } from 'react';
import { Animated } from 'react-native';

export function useAnimatedValue(initialValue: number): Animated.Value {
  const [value] = useState(() => new Animated.Value(initialValue));
  return value;
}
