// app/(tabs)/profile.tsx — Profiel-tab
// Toont avatar + naam/e-mail, een statistiek-overzicht en een menu naar
// Goals en Measurements. Rechtsboven wissel je met de zon/maan-knop tussen
// licht en donker thema (toggle() uit useTheme).
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Card, Placeholder } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { useTheme, useLang } from '@/components/store';
import { DATA } from '@/constants/data';
import { supabase } from '../../src/lib/supabase'; // backend (Supabase)

export default function Profile() {
  const { c, mode, toggle } = useTheme();
  const { lang, setLang, t } = useLang();
  const router = useRouter();
  // Het echte e-mailadres van de ingelogde gebruiker (uit de Supabase-sessie).
  const [email, setEmail] = useState('');
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ''));
  }, []);

  // Uitloggen: Supabase wist de sessie; de auth-poort stuurt je daarna naar login.
  const handleLogout = () => supabase.auth.signOut();

  return (
    <Screen scroll={false} padTop={0}>
      <View style={{ flex: 1, paddingTop: 54, paddingHorizontal: 16 }}>
        {/* header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <TouchableOpacity activeOpacity={0.7} style={{ width: 38, height: 38, borderRadius: 11, backgroundColor: c.card, borderWidth: 1, borderColor: c.line, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="gear" size={19} color={c.sub} />
          </TouchableOpacity>
          <Text style={{ fontSize: 18, fontWeight: '700', color: c.text }}>Profile</Text>
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

        {/* avatar + identity */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 24 }}>
          <View style={{ position: 'relative' }}>
            <Placeholder label="AVATAR" style={{ width: 76, height: 76, borderRadius: 38, borderWidth: 2, borderColor: c.accent }} />
            <View style={{ position: 'absolute', bottom: -2, right: -2, width: 26, height: 26, borderRadius: 13, backgroundColor: c.accent, borderWidth: 3, borderColor: c.bg, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="camera" size={13} color={c.onAccent} />
            </View>
          </View>
          <View>
            <Text style={{ fontSize: 23, fontWeight: '800', color: c.text, letterSpacing: -0.4 }}>{DATA.user.name}</Text>
            <Text style={{ fontSize: 13.5, color: c.sub, marginTop: 2 }}>{email || DATA.user.email}</Text>
          </View>
        </View>

        {/* stats */}
        <Section title="Stats Overview" action="Edit" />
        <Card pad={0} style={{ flexDirection: 'row', marginBottom: 22, overflow: 'hidden' }}>
          {DATA.profile.stats.map((s, i) => (
            <View key={s.label} style={{ flex: 1, paddingVertical: 16, paddingHorizontal: 8, alignItems: 'center', borderRightWidth: i < DATA.profile.stats.length - 1 ? 1 : 0, borderRightColor: c.line }}>
              <Text style={{ fontSize: 11, color: c.sub, fontWeight: '600' }}>{s.label}</Text>
              <Text style={{ fontSize: 25, fontWeight: '800', color: i === 1 ? c.accentText : c.text, letterSpacing: -0.5, marginVertical: 5 }}>{s.value}</Text>
              <Text style={{ fontSize: 11, color: c.dim }}>{s.sub}</Text>
            </View>
          ))}
        </Card>

        {/* menu */}
        <Card pad={4}>
          {[
            { label: 'Goals', icon: 'target' as const, route: '/goals' as const },
            { label: 'Measurements', icon: 'ruler' as const, route: '/measurements' as const },
            { label: 'Recovery', icon: 'moon' as const, route: '/recovery' as const },
          ].map((m, i, arr) => (
            <TouchableOpacity key={m.label} activeOpacity={0.75} onPress={() => router.push(m.route)} style={{ flexDirection: 'row', alignItems: 'center', gap: 13, paddingVertical: 13, paddingHorizontal: 12, borderBottomWidth: i < arr.length - 1 ? 1 : 0, borderBottomColor: c.line }}>
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

function Section({ title, action }: { title: string; action?: string }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, marginHorizontal: 2 }}>
      <Text style={{ fontSize: 17, fontWeight: '700', color: c.text }}>{title}</Text>
      {action ? <Text style={{ fontSize: 13.5, fontWeight: '600', color: c.accentText }}>{action}</Text> : null}
    </View>
  );
}
