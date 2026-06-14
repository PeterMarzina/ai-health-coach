declare module '*.css';
declare module '*.module.css';
declare module '*.png';
declare module '*.jpg';
declare module '*.jpeg';
declare module '*.svg';

// Temporary fallback for react-native-svg typings if not present
declare module 'react-native-svg' {
    import * as React from 'react';
    export const Svg: React.ComponentType<any>;
    export const Circle: React.ComponentType<any>;
    export const Path: React.ComponentType<any>;
    export const Defs: React.ComponentType<any>;
    export const LinearGradient: React.ComponentType<any>;
    export const Stop: React.ComponentType<any>;
    export const G: React.ComponentType<any>;
    export const Line: React.ComponentType<any>;
    export const Rect: React.ComponentType<any>;
    export const Text: React.ComponentType<any>;
    const _default: any;
    export default _default;
}
