// app/(tabs)/index.tsx — Home / dashboard
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Card, Section } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { Ring, Sparkline } from '@/components/charts';
import { useTheme } from '@/components/store';
import { DATA } from '@/constants/data';

export default function Home() {
  const { c } = useTheme();
  const router = useRouter();
  const hue = (k: string) => (c as any)[k] || c.accent;

  return (
    <Screen>
      {/* header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11 }}>
          <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: c.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontWeight: '800', fontSize: 18, color: c.accentText, fontStyle: 'italic' }}>A</Text>
          </View>
          <View>
            <Text style={{ fontSize: 16, fontWeight: '700', color: c.text }}>Good morning, Jay 👋</Text>
            <Text style={{ fontSize: 12.5, color: c.sub, marginTop: 1 }}>Let's crush today.</Text>
          </View>
        </View>
        <TouchableOpacity activeOpacity={0.7} style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: c.card, borderWidth: 1, borderColor: c.line, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="bell" size={20} color={c.text} />
          <View style={{ position: 'absolute', top: 9, right: 10, width: 7, height: 7, borderRadius: 4, backgroundColor: c.accent, borderWidth: 1.5, borderColor: c.card }} />
        </TouchableOpacity>
      </View>

      {/* daily score */}
      <Card accent pad={18} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 21, fontWeight: '800', color: c.text, letterSpacing: -0.4, lineHeight: 25 }}>Your Daily{'\n'}Score</Text>
          <Text style={{ fontSize: 12.5, color: c.sub, marginTop: 8, lineHeight: 18, maxWidth: 150 }}>Habits, training, nutrition & recovery combined into one.</Text>
          <TouchableOpacity activeOpacity={0.7} style={{ marginTop: 14, flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: c.cardHi, borderWidth: 1, borderColor: c.line, borderRadius: 100, paddingVertical: 7, paddingHorizontal: 13 }}>
            <Text style={{ color: c.text, fontSize: 12.5, fontWeight: '600' }}>See breakdown</Text>
            <Icon name="chevR" size={14} color={c.text} />
          </TouchableOpacity>
        </View>
        <Ring size={132} stroke={13} value={DATA.score} glow>
          <Text style={{ fontSize: 44, fontWeight: '800', color: c.text, letterSpacing: -1 }}>{DATA.score}</Text>
          <Text style={{ fontSize: 11.5, fontWeight: '700', color: c.accentText, marginTop: 2 }}>Great work</Text>
        </Ring>
      </Card>

      {/* today's focus */}
      <Section title="Today's Focus" action="See all" onAction={() => router.push('/plan')} />
      <Card onPress={() => router.push('/plan/workout')} pad={14} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 18 }}>
        <View style={{ width: 50, height: 50, borderRadius: 14, backgroundColor: c.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="target" size={26} color={c.accentText} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 11.5, color: c.sub, fontWeight: '600', letterSpacing: 0.4 }}>TRAINING</Text>
          <Text style={{ fontSize: 16, fontWeight: '700', color: c.text, marginTop: 1 }}>Lower Body Strength</Text>
          <Text style={{ fontSize: 12.5, color: c.sub, marginTop: 2 }}>6 exercises · ~45 min</Text>
        </View>
        <Icon name="chevR" size={20} color={c.dim} />
      </Card>

      {/* stat tiles */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 11, marginBottom: 18 }}>
        {DATA.stats.map((s) => (
          <Card key={s.key} pad={13} style={{ width: '47.8%', borderRadius: 18 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 12.5, color: c.sub, fontWeight: '600' }}>{s.label}</Text>
              <Icon name={s.icon as any} size={16} color={hue(s.hue)} fill={s.icon === 'flame' ? hue(s.hue) : undefined} />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 3, marginTop: 6 }}>
              <Text style={{ fontSize: 21, fontWeight: '800', color: c.text, letterSpacing: -0.5 }}>{s.value}</Text>
              <Text style={{ fontSize: 11, color: c.dim, fontWeight: '600' }}>{s.goal}</Text>
            </View>
            <View style={{ marginTop: 8 }}>
              <Sparkline data={s.spark} color={hue(s.hue)} w={130} h={28} />
            </View>
          </Card>
        ))}
      </View>

      {/* AI coach */}
      <Section title="AI Coach" />
      <Card pad={16} style={{ marginBottom: 18, overflow: 'hidden' }}>
        <View style={{ flexDirection: 'row' }}>
          <View style={{ flex: 1, paddingRight: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <Icon name="sparkle" size={15} color={c.accentText} fill={c.accentText} />
              <Text style={{ fontSize: 12, fontWeight: '700', color: c.accentText }}>AI Coach</Text>
            </View>
            <Text style={{ fontSize: 15.5, fontWeight: '700', color: c.text }}>Here's your plan for today.</Text>
            <Text style={{ fontSize: 12.5, color: c.sub, marginTop: 6, lineHeight: 18 }}>Lower body focus — intensity & progressive overload. Don't forget your protein goal!</Text>
            <TouchableOpacity activeOpacity={0.8} onPress={() => router.push('/nutrition')} style={{ marginTop: 14, flexDirection: 'row', alignItems: 'center', gap: 7, alignSelf: 'flex-start', backgroundColor: c.accent, borderRadius: 100, paddingVertical: 9, paddingHorizontal: 15 }}>
              <Icon name="chat" size={15} color={c.onAccent} />
              <Text style={{ color: c.onAccent, fontSize: 13, fontWeight: '700' }}>Talk to Coach</Text>
            </TouchableOpacity>
          </View>
          <View style={{ width: 96, alignSelf: 'stretch', borderRadius: 14, backgroundColor: c.cardLo, borderWidth: 1, borderColor: c.line, alignItems: 'center', justifyContent: 'center', minHeight: 120 }}>
            <Icon name="user" size={40} color={c.accentText} />
            <Text style={{ fontSize: 8, color: c.dim, marginTop: 6, fontFamily: 'monospace' }}>3D COACH</Text>
          </View>
        </View>
      </Card>

      {/* progress / weight */}
      <Section title="Progress" action="See all" onAction={() => router.push('/progress')} />
      <Card onPress={() => router.push('/progress')} pad={15} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ width: 38, height: 38, borderRadius: 11, backgroundColor: c.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="chart" size={19} color={c.accentText} />
        </View>
        <View>
          <Text style={{ fontSize: 12, color: c.sub, fontWeight: '600' }}>Weight</Text>
          <Text style={{ fontSize: 19, fontWeight: '800', color: c.text, letterSpacing: -0.5 }}>78.4 <Text style={{ fontSize: 12, fontWeight: '600', color: c.sub }}>kg</Text></Text>
        </View>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Sparkline data={DATA.weight.sparkWeek} color={c.accent} w={96} h={34} />
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: c.accentText }}>−0.6 kg</Text>
          <Text style={{ fontSize: 11, color: c.dim }}>vs last week</Text>
        </View>
      </Card>
    </Screen>
  );
}
