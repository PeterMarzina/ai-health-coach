// app/_layout.tsx — het fundament van de hele app
// Dit bestand wordt als eerste geladen. Het wikkelt alle schermen in "providers"
// (gebaren, veilige zone, thema, instellingen) en definieert de navigatie-stack.
// De providers zorgen dat o.a. de kleuren overal beschikbaar zijn.
import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, SettingsProvider, useTheme } from '@/components/store';

function Nav() {
  const { c, mode } = useTheme();
  return (
    <>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg }, animation: 'slide_from_right' }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="plan/workout" />
        <Stack.Screen name="nutrition" />
        <Stack.Screen name="goals" />
        <Stack.Screen name="measurements" />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <SettingsProvider>
            <Nav />
          </SettingsProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
