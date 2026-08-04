// jest.config.js — unit tests voor pure logica (1RM, PR-detectie, streaks, volume).
// Bewust geen jest-expo: er wordt geen React Native gerenderd, alleen platte
// TS-functies in src/services getest. Hergebruikt babel.config.js voor de
// TypeScript/JSX-transform.
module.exports = {
  testEnvironment: 'node',
  transform: {
    '^.+\\.(t|j)sx?$': 'babel-jest',
  },
  testMatch: ['<rootDir>/src/**/*.test.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
};
