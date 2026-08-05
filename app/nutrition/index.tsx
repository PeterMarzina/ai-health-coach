// app/nutrition/index.tsx — Voeding-scherm (MyFitnessPal-achtige layout, eigen theme)
// Header met datum + streak, weekstrip (tik = dag wisselen), calorie-kaart,
// macro-kaart (gram/percentage-toggle), dagboek per maaltijdmoment met
// overflow-acties (kopieer/wis), "Dagboek voltooien" en een lokale FAB voor de
// toevoeg-flow (zoeken/recent/handmatig/barcode — barcode volgt in Fase 2).
// Alles hier gebruikt uitsluitend bestaande theme-tokens (constants/theme.ts) —
// geen hardcoded kleuren.
import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Modal, Animated, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Card, Bar } from '@/components/ui';
import { Icon, IconName } from '@/components/Icon';
import { useTheme, useSettings, useAuth, useDaily } from '@/components/store';
import { withAlpha } from '@/constants/theme';
import { MEAL_TYPES, type MealEntry, type MealType, type DiaryDayStatus } from '@/src/types/tracking';
import {
  todayKey, fetchMeals, deleteMeal, fetchDiaryStatus, setDiaryCompleted,
  clearMealSection, copyMealsFromYesterday, copyMealToType,
} from '@/src/services/trackingService';

const WEEKDAY_LETTERS = ['M', 'D', 'W', 'D', 'V', 'Z', 'Z']; // ma..zo

function startOfWeek(d: Date): Date {
  const day = (d.getDay() + 6) % 7; // 0 = maandag
  const monday = new Date(d);
  monday.setDate(d.getDate() - day);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function headerLabel(date: string, today: string): string {
  if (date === today) return 'Vandaag';
  const d = new Date(`${date}T00:00:00`);
  const days = ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag'];
  const months = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
  const label = `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]}`;
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function sectionSubtitle(items: MealEntry[]): string {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0].name;
  return `${items[0].name} en ${items.length - 1} meer`;
}

export default function NutritionScreen() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { goals } = useSettings();
  const { session } = useAuth();
  const { streakDays } = useDaily();
  const userId = session?.user?.id;
  const today = todayKey();

  const weekDates = useMemo(() => {
    const monday = startOfWeek(new Date());
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return todayKey(d);
    });
  }, []);

  const [selectedDate, setSelectedDate] = useState(today);
  const [meals, setMeals] = useState<MealEntry[]>([]);
  const [diaryStatus, setDiaryStatus] = useState<Record<string, DiaryDayStatus>>({});
  const [loading, setLoading] = useState(true);
  const [macroUnit, setMacroUnit] = useState<'g' | '%'>('g');
  const [completing, setCompleting] = useState(false);
  const [fabOpen, setFabOpen] = useState(false);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const [m, status] = await Promise.all([
        fetchMeals(userId, selectedDate),
        fetchDiaryStatus(userId, weekDates),
      ]);
      setMeals(m);
      setDiaryStatus(status);
    } catch (e: any) {
      Alert.alert('Fout', e.message);
    } finally {
      setLoading(false);
    }
  }, [userId, selectedDate, weekDates]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const mealsBySection = useMemo(() => {
    const map: Record<MealType, MealEntry[]> = { breakfast: [], lunch: [], dinner: [], snack: [] };
    for (const m of meals) map[m.mealType]?.push(m);
    return map;
  }, [meals]);

  const consumed = useMemo(() => meals.reduce(
    (a, m) => ({ calories: a.calories + m.calories, protein: a.protein + m.proteinG, carbs: a.carbs + m.carbsG, fats: a.fats + m.fatsG }),
    { calories: 0, protein: 0, carbs: 0, fats: 0 }
  ), [meals]);

  const remaining = goals.calories - consumed.calories;
  const overBudget = remaining < 0;
  const diaryCompleted = diaryStatus[selectedDate]?.completed ?? false;

  const handleDeleteMeal = async (id: string) => {
    setMeals((prev) => prev.filter((m) => m.id !== id));
    try {
      await deleteMeal(id);
    } catch (e: any) {
      Alert.alert('Fout', e.message);
      load();
    }
  };

  const openAdd = (mealType: MealType) => {
    router.push({ pathname: '/nutrition/add', params: { date: selectedDate, mealType } });
  };

  const handleClearSection = (mealType: MealType, items: MealEntry[]) => {
    if (!userId || items.length === 0) return;
    Alert.alert('Sectie wissen', `Alle items uit ${MEAL_TYPES.find((t) => t.key === mealType)?.label.toLowerCase()} verwijderen?`, [
      { text: 'Annuleren', style: 'cancel' },
      {
        text: 'Wissen', style: 'destructive', onPress: async () => {
          setMeals((prev) => prev.filter((m) => m.mealType !== mealType));
          try {
            await clearMealSection(userId, selectedDate, mealType);
          } catch (e: any) {
            Alert.alert('Fout', e.message);
            load();
          }
        },
      },
    ]);
  };

  const handleCopyYesterday = async (mealType: MealType) => {
    if (!userId) return;
    try {
      const added = await copyMealsFromYesterday(userId, selectedDate, mealType);
      if (added.length === 0) {
        Alert.alert('Niets om te kopiëren', 'Gisteren staat hier niets in deze sectie.');
        return;
      }
      setMeals((prev) => [...prev, ...added]);
    } catch (e: any) {
      Alert.alert('Fout', e.message);
    }
  };

  const handleCopyToOtherMeal = (mealType: MealType, items: MealEntry[]) => {
    if (!userId || items.length === 0) return;
    const targets = MEAL_TYPES.filter((t) => t.key !== mealType);
    Alert.alert(
      'Kopieer naar andere maaltijd',
      'Kies de sectie om naartoe te kopiëren',
      [
        ...targets.map((t) => ({
          text: t.label,
          onPress: async () => {
            try {
              const copies = await Promise.all(items.map((m) => copyMealToType(userId, m, t.key)));
              setMeals((prev) => [...prev, ...copies]);
            } catch (e: any) {
              Alert.alert('Fout', e.message);
            }
          },
        })),
        { text: 'Annuleren', style: 'cancel' },
      ]
    );
  };

  const openSectionMenu = (mealType: MealType, items: MealEntry[]) => {
    Alert.alert(
      MEAL_TYPES.find((t) => t.key === mealType)?.label ?? 'Maaltijd',
      undefined,
      [
        { text: 'Kopieer naar andere maaltijd', onPress: () => handleCopyToOtherMeal(mealType, items) },
        { text: 'Kopieer van gisteren', onPress: () => handleCopyYesterday(mealType) },
        { text: 'Wis maaltijd', style: 'destructive', onPress: () => handleClearSection(mealType, items) },
        { text: 'Annuleren', style: 'cancel' },
      ]
    );
  };

  const handleCompleteDiary = async () => {
    if (!userId) return;
    const next = !diaryCompleted;
    setCompleting(true);
    setDiaryStatus((prev) => ({ ...prev, [selectedDate]: { date: selectedDate, hasMeals: meals.length > 0, completed: next } }));
    try {
      await setDiaryCompleted(userId, selectedDate, next);
    } catch (e: any) {
      Alert.alert('Fout', e.message);
      load();
    } finally {
      setCompleting(false);
    }
  };

  const macros = [
    { label: 'Koolhydraten', v: consumed.carbs, goal: goals.carbs, hue: 'carbs' as const },
    { label: 'Vetten', v: consumed.fats, goal: goals.fats, hue: 'fats' as const },
    { label: 'Eiwitten', v: consumed.protein, goal: goals.protein, hue: 'protein' as const },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: 16, paddingBottom: 110 }}>
        {/* header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 18 }}>
          <TouchableOpacity activeOpacity={0.7} onPress={() => router.back()} style={{ width: 34, height: 34, borderRadius: 12, backgroundColor: c.cardHi, borderWidth: 1, borderColor: c.line, alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
            <Icon name="chevL" size={18} color={c.text} />
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.7} onPress={() => setSelectedDate(today)} disabled={selectedDate === today} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text style={{ fontSize: 22, fontWeight: '800', color: c.text, letterSpacing: -0.4 }}>{headerLabel(selectedDate, today)}</Text>
            {selectedDate !== today ? <Icon name="chevDown" size={16} color={c.dim} /> : null}
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: c.cardHi, borderWidth: 1, borderColor: c.line, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6 }}>
            <Icon name="flame" size={14} color={c.calories} fill={c.calories} />
            <Text style={{ fontSize: 12.5, fontWeight: '700', color: c.text }}>{streakDays}</Text>
          </View>
        </View>

        {/* weekstrip */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 18 }}>
          {weekDates.map((date, i) => {
            const d = new Date(`${date}T00:00:00`);
            const status = diaryStatus[date];
            const isSelected = date === selectedDate;
            const isCompleted = status?.completed;
            const isLogged = status?.hasMeals;
            const circleBg = isCompleted ? c.accent : isLogged ? c.accentSoft : 'transparent';
            const circleBorder = isSelected ? c.accent : isCompleted ? c.accent : c.line;
            return (
              <TouchableOpacity key={date} activeOpacity={0.7} onPress={() => setSelectedDate(date)} style={{ alignItems: 'center', gap: 6, width: 34 }}>
                <Text style={{ fontSize: 11, fontWeight: '600', color: isSelected ? c.accentText : c.dim }}>{WEEKDAY_LETTERS[i]}</Text>
                <View style={{
                  width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center',
                  backgroundColor: circleBg, borderWidth: isSelected ? 2 : 1, borderColor: circleBorder,
                }}>
                  {isCompleted ? (
                    <Icon name="check" size={14} color={c.onAccent} strokeWidth={3} />
                  ) : (
                    <Text style={{ fontSize: 12.5, fontWeight: '700', color: isLogged ? c.accentText : c.text }}>{d.getDate()}</Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {loading ? (
          <ActivityIndicator color={c.accent} style={{ marginTop: 40 }} />
        ) : (
          <>
            {/* calorie-kaart */}
            <Card pad={16} style={{ marginBottom: 14 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
                <Text style={{ fontSize: 20, fontWeight: '800', color: c.text }}>
                  {consumed.calories} <Text style={{ fontSize: 13, fontWeight: '600', color: c.sub }}>/ {goals.calories} cal</Text>
                </Text>
                <Text style={{ fontSize: 13, fontWeight: '700', color: overBudget ? c.bad : c.sub }}>
                  {overBudget ? `${Math.abs(remaining)} te veel` : `${remaining} te gaan`}
                </Text>
              </View>
              <Bar value={consumed.calories} max={goals.calories || 1} color={overBudget ? c.bad : c.calories} height={9} />
            </Card>

            {/* macro-kaart */}
            <Card pad={16} style={{ marginBottom: 14, gap: 14 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 14.5, fontWeight: '700', color: c.text }}>Macro's</Text>
                <TouchableOpacity activeOpacity={0.7} onPress={() => setMacroUnit((u) => (u === 'g' ? '%' : 'g'))} style={{ width: 30, height: 30, borderRadius: 10, backgroundColor: c.cardHi, borderWidth: 1, borderColor: c.line, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: c.accentText }}>{macroUnit === 'g' ? '%' : 'g'}</Text>
                </TouchableOpacity>
              </View>
              {macros.map((m) => {
                const pct = m.goal ? Math.round((m.v / m.goal) * 100) : 0;
                const color = (c as any)[m.hue] || c.accent;
                return (
                  <View key={m.label}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                      <Text style={{ fontSize: 13, fontWeight: '600', color: c.text }}>{m.label}</Text>
                      <Text style={{ fontSize: 12.5, fontWeight: '700', color }}>
                        {macroUnit === 'g' ? `${m.v} / ${m.goal} g` : `${pct}%`}
                      </Text>
                    </View>
                    <Bar value={m.v} max={m.goal || 1} color={color} height={7} />
                  </View>
                );
              })}
            </Card>

            {/* dagboek */}
            <View style={{ gap: 12, marginBottom: 18 }}>
              {MEAL_TYPES.map((section) => {
                const items = mealsBySection[section.key];
                const total = items.reduce((s, m) => s + m.calories, 0);
                return (
                  <Card key={section.key} pad={14}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11 }}>
                      <View style={{ width: 36, height: 36, borderRadius: 11, backgroundColor: c.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
                        <Icon name={section.icon} size={17} color={c.accentText} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 14.5, fontWeight: '700', color: c.text }}>{section.label}</Text>
                        {items.length > 0 ? (
                          <Text numberOfLines={1} style={{ fontSize: 12, color: c.sub, marginTop: 1 }}>{sectionSubtitle(items)}</Text>
                        ) : null}
                      </View>
                      {items.length > 0 ? (
                        <Text style={{ fontSize: 13, fontWeight: '700', color: c.text, marginRight: 2 }}>{total} <Text style={{ fontSize: 10.5, color: c.dim, fontWeight: '500' }}>kcal</Text></Text>
                      ) : null}
                      <TouchableOpacity activeOpacity={0.7} onPress={() => openAdd(section.key)} style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, backgroundColor: c.accent }}>
                        <Text style={{ fontSize: 12.5, fontWeight: '700', color: c.onAccent }}>Registreer</Text>
                      </TouchableOpacity>
                      {items.length > 0 ? (
                        <TouchableOpacity activeOpacity={0.7} onPress={() => openSectionMenu(section.key, items)} style={{ width: 30, height: 30, alignItems: 'center', justifyContent: 'center' }}>
                          <Icon name="more" size={17} color={c.dim} />
                        </TouchableOpacity>
                      ) : null}
                    </View>
                    {items.length > 0 ? (
                      <View style={{ marginTop: 10, gap: 8 }}>
                        {items.map((m) => (
                          <View key={m.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: c.line }}>
                            <View style={{ flex: 1 }}>
                              <Text style={{ fontSize: 13, fontWeight: '600', color: c.text }}>{m.name}{m.grams != null ? ` · ${m.grams}g` : ''}</Text>
                              <Text style={{ fontSize: 11, color: c.dim, marginTop: 1 }}>P {m.proteinG}g · K {m.carbsG}g · V {m.fatsG}g</Text>
                            </View>
                            <Text style={{ fontSize: 12.5, fontWeight: '700', color: c.text }}>{m.calories}</Text>
                            <TouchableOpacity activeOpacity={0.7} onPress={() => handleDeleteMeal(m.id)} style={{ width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' }}>
                              <Icon name="close" size={13} color={c.dim} />
                            </TouchableOpacity>
                          </View>
                        ))}
                      </View>
                    ) : null}
                  </Card>
                );
              })}
            </View>

            {/* dagboek voltooien */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleCompleteDiary}
              disabled={completing}
              style={{
                height: 50, borderRadius: 15, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8,
                backgroundColor: diaryCompleted ? c.accentSoft : c.accent, opacity: completing ? 0.7 : 1,
              }}
            >
              {completing ? <ActivityIndicator color={diaryCompleted ? c.accentText : c.onAccent} /> : (
                <>
                  <Icon name="check" size={16} color={diaryCompleted ? c.accentText : c.onAccent} strokeWidth={2.6} />
                  <Text style={{ fontSize: 14.5, fontWeight: '700', color: diaryCompleted ? c.accentText : c.onAccent }}>
                    {diaryCompleted ? 'Dagboek voltooid' : 'Dagboek voltooien'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => setFabOpen(true)}
        style={{
          position: 'absolute', right: 18, bottom: insets.bottom + 18,
          width: 58, height: 58, borderRadius: 29, backgroundColor: c.accent,
          alignItems: 'center', justifyContent: 'center',
          shadowColor: c.accent, shadowOpacity: 0.5, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 8,
        }}
      >
        <Icon name="plus" size={26} color={c.onAccent} strokeWidth={2.6} />
      </TouchableOpacity>

      <AddSheet
        open={fabOpen}
        onClose={() => setFabOpen(false)}
        onSearch={() => openAdd('snack')}
        onRecent={() => router.push({ pathname: '/nutrition/add', params: { date: selectedDate, mealType: 'snack', tab: 'recent' } })}
        onManual={() => router.push({ pathname: '/nutrition/product/new', params: { date: selectedDate, mealType: 'snack' } })}
        onBarcode={() => router.push({ pathname: '/nutrition/scan', params: { date: selectedDate, mealType: 'snack' } })}
      />
    </View>
  );
}

function AddSheet({
  open, onClose, onSearch, onRecent, onManual, onBarcode,
}: { open: boolean; onClose: () => void; onSearch: () => void; onRecent: () => void; onManual: () => void; onBarcode: () => void }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const [mounted, setMounted] = React.useState(open);
  const y = React.useRef(new Animated.Value(1)).current;
  const fade = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (open) {
      setMounted(true);
      Animated.parallel([
        Animated.timing(fade, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.spring(y, { toValue: 0, useNativeDriver: true, bounciness: 4, speed: 14 }),
      ]).start();
    } else if (mounted) {
      Animated.parallel([
        Animated.timing(fade, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(y, { toValue: 1, duration: 240, useNativeDriver: true }),
      ]).start(({ finished }) => { if (finished) setMounted(false); });
    }
  }, [open]);

  const go = (fn: () => void) => { onClose(); setTimeout(fn, 180); };

  const items: { key: string; label: string; sub: string; icon: IconName; onPress: () => void }[] = [
    { key: 'barcode', label: 'Barcode scannen', sub: 'Scan de verpakking', icon: 'barcode', onPress: onBarcode },
    { key: 'search', label: 'Zoeken', sub: 'Zoek in de productendatabase', icon: 'search', onPress: onSearch },
    { key: 'recent', label: 'Recent', sub: 'Eerder gelogde items', icon: 'chart', onPress: onRecent },
    { key: 'manual', label: 'Handmatig invoeren', sub: 'Vul zelf de macro\'s in', icon: 'pencil', onPress: onManual },
  ];

  if (!mounted) return null;
  const translateY = y.interpolate({ inputRange: [0, 1], outputRange: [0, 500] });

  return (
    <Modal transparent visible={mounted} animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Animated.View style={{ flex: 1, backgroundColor: c.overlay, opacity: fade }}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
      </Animated.View>
      <Animated.View style={{
        position: 'absolute', left: 0, right: 0, bottom: 0, transform: [{ translateY }],
        backgroundColor: c.cardHi, borderTopLeftRadius: 28, borderTopRightRadius: 28,
        borderTopWidth: 1, borderColor: c.lineHi,
        paddingHorizontal: 16, paddingTop: 12, paddingBottom: Math.max(insets.bottom, 16) + 24,
      }}>
        <View style={{ width: 38, height: 4, borderRadius: 4, backgroundColor: c.faint, alignSelf: 'center', marginBottom: 16 }} />
        <Text style={{ fontSize: 18, fontWeight: '700', color: c.text, marginHorizontal: 4, marginBottom: 14 }}>Snel toevoegen</Text>
        <View style={{ gap: 9 }}>
          {items.map((it) => (
            <TouchableOpacity key={it.key} activeOpacity={0.75} onPress={() => go(it.onPress)} style={{
              flexDirection: 'row', alignItems: 'center', gap: 14,
              backgroundColor: c.card, borderWidth: 1, borderColor: c.line, borderRadius: 16, padding: 13,
            }}>
              <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: withAlpha(c.accent, 0.15), alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={it.icon} size={20} color={c.accentText} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '600', color: c.text }}>{it.label}</Text>
                <Text style={{ fontSize: 12.5, color: c.sub, marginTop: 1 }}>{it.sub}</Text>
              </View>
              <Icon name="chevR" size={18} color={c.dim} />
            </TouchableOpacity>
          ))}
        </View>
      </Animated.View>
    </Modal>
  );
}
