// app/_layout.tsx — het fundament van de hele app + de "toegangspoort" (auth gate)
// Dit bestand wordt als eerste geladen. Het wikkelt alle schermen in "providers"
// (gebaren, veilige zone, thema, taal, auth, instellingen) en regelt de navigatie.
// De auth-poort stuurt je naar:
//   - login        als je niet bent ingelogd
//   - onboarding   als je wel bent ingelogd maar je profiel nog niet hebt ingevuld
//   - de tabs      als alles klaar is
import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, SettingsProvider, LanguageProvider, AuthProvider, DailyProvider, useTheme, useAuth } from '@/components/store';

function Nav() {
  const { c, mode } = useTheme();
  const { session, onboarded, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();              // waar ben je nu? bv. ["(auth)", "login"]

  // Telkens als sessie/profiel/scherm verandert: stuur naar de juiste plek.
  useEffect(() => {
    if (loading) return;
    const inAuth = segments[0] === '(auth)';
    // Zowel de formulier-flow als de chat-intake (Sprint 8) tellen als onboarding.
    const onOnboarding = segments[0] === 'onboarding' || segments[0] === 'onboarding-chat';

    if (!session) {
      if (!inAuth) router.replace('/(auth)/login');     // niet ingelogd → login
      return;
    }
    if (onboarded === null) return;                      // profiel nog aan het checken
    if (!onboarded) {
      if (!onOnboarding) router.replace('/onboarding');  // ingelogd, profiel leeg → onboarding
      return;
    }
    if (inAuth || onOnboarding) router.replace('/(tabs)'); // alles klaar → de app
  }, [session, onboarded, loading, segments]);

  // Laad-spinner zolang we de sessie (of het profiel) nog ophalen.
  if (loading || (session && onboarded === null)) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.bg }}>
        <ActivityIndicator size="large" color={c.accent} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg }, animation: 'slide_from_right' }}>
        <Stack.Screen name="(auth)/login" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="onboarding-chat" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="plan" />
        <Stack.Screen name="nutrition" />
        <Stack.Screen name="recovery" />
        <Stack.Screen name="coach" />
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
          <LanguageProvider>
            <AuthProvider>
              <SettingsProvider>
                <DailyProvider>
                  <Nav />
                </DailyProvider>
              </SettingsProvider>
            </AuthProvider>
          </LanguageProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
