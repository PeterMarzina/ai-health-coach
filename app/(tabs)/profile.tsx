// app/(tabs)/profile.tsx — Profiel-tab
// Toont avatar (initialen) + naam/e-mail, een statistiek-overzicht en een menu naar
// Goals, Measurements en Recovery. Rechtsboven wissel je van taal en tussen
// licht en donker thema (toggle() uit useTheme).
import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Card } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { useTheme, useLang, useAuth, useSettings, useDaily } from '@/components/store';
import { fetchCompletedSessionCount } from '@/src/services/workouts';
import { supabase } from '../../src/lib/supabase'; // backend (Supabase)

// "Peter Marzina" → "PM", "peter" → "P"
function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0][0];
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
}

export default function Profile() {
  const { c, mode, toggle } = useTheme();
  const { lang, setLang, t, locale } = useLang();
  const { session } = useAuth();
  const { fullName, profileContext } = useSettings();
  const { streakDays, level, xpTotal } = useDaily();
  const router = useRouter();

  const userId = session?.user?.id;
  const email = session?.user?.email ?? '';
  const name = fullName || profileContext?.answers.name || email.split('@')[0] || '';

  // Aantal afgeronde workouts — opnieuw bij elke focus, want je komt hier vaak
  // terug direct na het afronden van een training.
  const [workoutCount, setWorkoutCount] = useState<number | null>(null);
  useFocusEffect(useCallback(() => {
    if (!userId) return;
    fetchCompletedSessionCount(userId)
      .then(setWorkoutCount)
      .catch(() => setWorkoutCount(null));
  }, [userId]));

  const stats = [
    { key: 'workouts', label: t('workouts'), value: workoutCount != null ? String(workoutCount) : '—', sub: t('total') },
    { key: 'streak', label: t('current_streak'), value: String(streakDays), sub: streakDays === 1 ? t('day') : t('days') },
    { key: 'level', label: t('level'), value: String(level), sub: `${xpTotal.toLocaleString(locale)} XP` },
  ];

  // Uitloggen: Supabase wist de sessie; de auth-poort stuurt je daarna naar login.
  const handleLogout = () => supabase.auth.signOut();

  return (
    <Screen scroll={false} padTop={0}>
      <View style={{ flex: 1, paddingTop: 54, paddingHorizontal: 16 }}>
        {/* header: lege ruimte links even breed als de knoppen rechts, zodat de titel gecentreerd blijft */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <View style={{ width: 84 }} />
          <Text style={{ fontSize: 18, fontWeight: '700', color: c.text }}>{t('profile')}</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {/* Taalknop: wisselt tussen Nederlands en Engels */}
            <TouchableOpacity activeOpacity={0.7} onPress={() => setLang(lang === 'nl' ? 'en' : 'nl')} style={{ width: 38, height: 38, borderRadius: 11, backgroundColor: c.card, borderWidth: 1, borderColor: c.line, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 12, fontWeight: '800', color: c.sub }}>{lang.toUpperCase()}</Text>
            </TouchableOpacity>
            {/* Licht/donker-knop */}
            <TouchableOpacity activeOpacity={0.7} onPress={toggle} style={{ width: 38, height: 38, borderRadius: 11, backgroundColor: c.card, borderWidth: 1, borderColor: c.line, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name={mode === 'dark' ? 'sun' : 'moon'} size={18} color={c.sub} />
            </TouchableOpacity>
          </View>
        </View>

        {/* avatar (initialen) + identity */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 24 }}>
          <View style={{ width: 76, height: 76, borderRadius: 38, borderWidth: 2, borderColor: c.accent, backgroundColor: c.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 26, fontWeight: '800', color: c.accentText, letterSpacing: -0.5 }}>{initialsOf(name)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text numberOfLines={1} style={{ fontSize: 23, fontWeight: '800', color: c.text, letterSpacing: -0.4 }}>{name}</Text>
            <Text numberOfLines={1} style={{ fontSize: 13.5, color: c.sub, marginTop: 2 }}>{email}</Text>
          </View>
        </View>

        {/* stats */}
        <Section title={t('stats_overview')} />
        <Card pad={0} style={{ flexDirection: 'row', marginBottom: 22, overflow: 'hidden' }}>
          {stats.map((s, i) => (
            <View key={s.key} style={{ flex: 1, paddingVertical: 16, paddingHorizontal: 8, alignItems: 'center', borderRightWidth: i < stats.length - 1 ? 1 : 0, borderRightColor: c.line }}>
              <Text style={{ fontSize: 11, color: c.sub, fontWeight: '600' }}>{s.label}</Text>
              <Text style={{ fontSize: 25, fontWeight: '800', color: i === 1 ? c.accentText : c.text, letterSpacing: -0.5, marginVertical: 5 }}>{s.value}</Text>
              <Text style={{ fontSize: 11, color: c.dim }}>{s.sub}</Text>
            </View>
          ))}
        </Card>

        {/* menu */}
        <Card pad={4}>
          {[
            { label: t('goals'), icon: 'target' as const, route: '/goals' as const },
            { label: t('measurements'), icon: 'ruler' as const, route: '/measurements' as const },
            { label: t('recovery'), icon: 'moon' as const, route: '/recovery' as const },
          ].map((m, i, arr) => (
            <TouchableOpacity key={m.route} activeOpacity={0.75} onPress={() => router.push(m.route)} style={{ flexDirection: 'row', alignItems: 'center', gap: 13, paddingVertical: 13, paddingHorizontal: 12, borderBottomWidth: i < arr.length - 1 ? 1 : 0, borderBottomColor: c.line }}>
              <View style={{ width: 36, height: 36, borderRadius: 11, backgroundColor: c.cardHi, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={m.icon} size={18} color={c.accentText} />
              </View>
              <Text style={{ flex: 1, fontSize: 15, fontWeight: '600', color: c.text }}>{m.label}</Text>
              <Icon name="chevR" size={18} color={c.dim} />
            </TouchableOpacity>
          ))}
        </Card>

        <View style={{ flex: 1 }} />

        <TouchableOpacity activeOpacity={0.8} onPress={handleLogout} style={{ height: 50, borderRadius: 15, borderWidth: 1, borderColor: c.bad, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, marginBottom: 12 }}>
          <Icon name="logout" size={18} color={c.bad} />
          <Text style={{ color: c.bad, fontSize: 15, fontWeight: '700' }}>{t('log_out')}</Text>
        </TouchableOpacity>
      </View>
    </Screen>
  );
}

function Section({ title }: { title: string }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, marginHorizontal: 2 }}>
      <Text style={{ fontSize: 17, fontWeight: '700', color: c.text }}>{title}</Text>
    </View>
  );
}
