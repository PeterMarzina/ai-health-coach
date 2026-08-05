// app/plan/exercise-picker.tsx — Oefeningenbibliotheek (Deel A2)
// Zoeken + filteren op spiergroep/equipment, favorieten/recent bovenaan, en
// eigen oefeningen toevoegen. Met ?forSession=1 (geopend vanuit een actieve
// sessie) stuurt een tik de gekozen oefening terug naar het sessie-scherm;
// zonder die param opent een tik de progressie-geschiedenis (blader-modus).
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Card, Input, Chip, Button, EmptyState } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { useTheme, useAuth } from '@/components/store';
import { fetchExercises, createCustomExercise } from '@/src/services/workouts';
import { getFavoriteExerciseIds, toggleFavoriteExercise, getRecentExerciseIds, markExerciseUsed } from '@/src/services/exerciseFavorites';
import type { Equipment, Exercise, ExerciseType, MuscleGroup } from '@/src/types/workout';

const MUSCLE_GROUPS: MuscleGroup[] = ['chest', 'back', 'shoulders', 'arms', 'legs', 'core'];
const EQUIPMENT: Equipment[] = ['barbell', 'dumbbell', 'machine', 'cable', 'bodyweight', 'kettlebell', 'bands'];
const TYPES: ExerciseType[] = ['push', 'pull', 'legs', 'core'];

function label(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function ExercisePicker() {
  const { c } = useTheme();
  const { session } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { forSession } = useLocalSearchParams<{ forSession?: string }>();
  const userId = session?.user.id ?? null;

  const [loading, setLoading] = useState(true);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [search, setSearch] = useState('');
  const [muscleGroup, setMuscleGroup] = useState<MuscleGroup | null>(null);
  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [recent, setRecent] = useState<string[]>([]);

  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customMuscleGroup, setCustomMuscleGroup] = useState<MuscleGroup>('chest');
  const [customType, setCustomType] = useState<ExerciseType>('push');
  const [customEquipment, setCustomEquipment] = useState<Equipment | null>(null);
  const [savingCustom, setSavingCustom] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ex, favs, rec] = await Promise.all([
        fetchExercises({ search: search.trim() || undefined, muscleGroup: muscleGroup ?? undefined, equipment: equipment ?? undefined }),
        getFavoriteExerciseIds(),
        getRecentExerciseIds(),
      ]);
      setExercises(ex);
      setFavorites(favs);
      setRecent(rec);
    } catch (e: any) {
      Alert.alert('Oops', e.message ?? 'Could not load exercises.');
    } finally {
      setLoading(false);
    }
  }, [search, muscleGroup, equipment]);

  useEffect(() => {
    const id = setTimeout(load, search ? 250 : 0); // lichte debounce op typen
    return () => clearTimeout(id);
  }, [load]);

  const sorted = useMemo(() => {
    const favSet = new Set(favorites);
    const favRows = exercises.filter((e) => favSet.has(e.id));
    const recentRows = recent.map((id) => exercises.find((e) => e.id === id)).filter((e): e is Exercise => !!e && !favSet.has(e.id));
    const seen = new Set([...favRows, ...recentRows].map((e) => e.id));
    const rest = exercises.filter((e) => !seen.has(e.id));
    return { favRows, recentRows, rest };
  }, [exercises, favorites, recent]);

  const handleToggleFavorite = async (exerciseId: string) => {
    const next = await toggleFavoriteExercise(exerciseId);
    setFavorites(next);
  };

  const handlePick = async (exercise: Exercise) => {
    await markExerciseUsed(exercise.id);
    if (forSession === '1') {
      // Terug naar het (al gemonte) sessie-scherm — expo-router's `navigate`
      // pop't terug naar die instantie i.p.v. een nieuwe te maken, zodat de
      // actieve sessie-state niet verloren gaat. `pickedAt` is een nonce zodat
      // hetzelfde effect ook afgaat als dezelfde oefening 2x gekozen wordt.
      router.navigate({ pathname: '/plan/workout', params: { pickedExerciseId: exercise.id, pickedAt: String(Date.now()) } });
    } else {
      router.push({ pathname: '/plan/exercise-history', params: { exerciseId: exercise.id, exerciseName: exercise.name } });
    }
  };

  const handleCreateCustom = async () => {
    if (!userId || !customName.trim()) {
      Alert.alert('Oops', 'Enter a name for the exercise.');
      return;
    }
    setSavingCustom(true);
    try {
      const created = await createCustomExercise(userId, {
        name: customName.trim(),
        muscleGroup: customMuscleGroup,
        type: customType,
        equipment: customEquipment,
      });
      setCustomName('');
      setShowCustomForm(false);
      await load();
      await handlePick(created);
    } catch (e: any) {
      Alert.alert('Oops', e.message ?? 'Could not add this exercise.');
    } finally {
      setSavingCustom(false);
    }
  };

  const renderRow = (exercise: Exercise) => (
    <Card key={exercise.id} pad={13} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 }}>
      <TouchableOpacity activeOpacity={0.7} onPress={() => handlePick(exercise)} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ width: 38, height: 38, borderRadius: 11, backgroundColor: c.cardHi, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="dumbbell" size={18} color={c.sub} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14.5, fontWeight: '700', color: c.text }}>{exercise.name}</Text>
          <Text style={{ fontSize: 12, color: c.sub, marginTop: 2 }}>
            {label(exercise.muscleGroup)}{exercise.equipment ? ` · ${label(exercise.equipment)}` : ''}{exercise.isCustom ? ' · Custom' : ''}
          </Text>
        </View>
      </TouchableOpacity>
      <TouchableOpacity activeOpacity={0.6} onPress={() => handleToggleFavorite(exercise.id)} style={{ padding: 4 }}>
        <Icon name="sparkle" size={19} color={favorites.includes(exercise.id) ? c.accentText : c.faint} fill={favorites.includes(exercise.id) ? c.accentText : undefined} />
      </TouchableOpacity>
    </Card>
  );

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: 16, paddingBottom: insets.bottom + 40 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <TouchableOpacity activeOpacity={0.7} onPress={() => router.back()} style={{ width: 38, height: 38, borderRadius: 11, backgroundColor: c.card, borderWidth: 1, borderColor: c.line, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="chevL" size={19} color={c.text} />
          </TouchableOpacity>
          <Text style={{ fontSize: 17, fontWeight: '700', color: c.text }}>Exercises</Text>
          <TouchableOpacity activeOpacity={0.7} onPress={() => setShowCustomForm((v) => !v)} style={{ width: 38, height: 38, borderRadius: 11, backgroundColor: c.card, borderWidth: 1, borderColor: c.line, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="plus" size={19} color={c.text} />
          </TouchableOpacity>
        </View>

        <Input value={search} onChangeText={setSearch} placeholder="Search exercises" style={{ marginBottom: 12 }} />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 7, marginBottom: 8 }}>
          {MUSCLE_GROUPS.map((g) => (
            <Chip key={g} label={label(g)} active={muscleGroup === g} onPress={() => setMuscleGroup(muscleGroup === g ? null : g)} style={{ flex: 0, paddingHorizontal: 14 }} />
          ))}
        </ScrollView>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 7, marginBottom: 16 }}>
          {EQUIPMENT.map((eq) => (
            <Chip key={eq} label={label(eq)} active={equipment === eq} onPress={() => setEquipment(equipment === eq ? null : eq)} style={{ flex: 0, paddingHorizontal: 14 }} />
          ))}
        </ScrollView>

        {showCustomForm ? (
          <Card pad={14} style={{ marginBottom: 16, gap: 10 }} accent>
            <Text style={{ fontSize: 14.5, fontWeight: '700', color: c.text }}>Add your own exercise</Text>
            <Input value={customName} onChangeText={setCustomName} placeholder="Exercise name" />
            <Text style={{ fontSize: 12, color: c.sub, fontWeight: '600' }}>Muscle group</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>
              {MUSCLE_GROUPS.map((g) => (
                <Chip key={g} label={label(g)} active={customMuscleGroup === g} onPress={() => setCustomMuscleGroup(g)} style={{ flex: 0, paddingHorizontal: 14 }} />
              ))}
            </View>
            <Text style={{ fontSize: 12, color: c.sub, fontWeight: '600' }}>Category</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>
              {TYPES.map((t) => (
                <Chip key={t} label={label(t)} active={customType === t} onPress={() => setCustomType(t)} style={{ flex: 0, paddingHorizontal: 14 }} />
              ))}
            </View>
            <Text style={{ fontSize: 12, color: c.sub, fontWeight: '600' }}>Equipment (optional)</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>
              {EQUIPMENT.map((eq) => (
                <Chip key={eq} label={label(eq)} active={customEquipment === eq} onPress={() => setCustomEquipment(customEquipment === eq ? null : eq)} style={{ flex: 0, paddingHorizontal: 14 }} />
              ))}
            </View>
            <Button label={savingCustom ? 'Adding…' : 'Add Exercise'} onPress={handleCreateCustom} loading={savingCustom} icon="plus" />
          </Card>
        ) : null}

        {loading ? (
          <ActivityIndicator color={c.accent} style={{ marginTop: 30 }} />
        ) : exercises.length === 0 ? (
          <EmptyState icon="dumbbell" title="No exercises found" body="Try a different search or filter." />
        ) : (
          <>
            {sorted.favRows.length > 0 ? (
              <>
                <Text style={{ fontSize: 12, fontWeight: '700', color: c.sub, marginBottom: 8, marginHorizontal: 2, letterSpacing: 0.4 }}>FAVORITES</Text>
                {sorted.favRows.map(renderRow)}
              </>
            ) : null}
            {sorted.recentRows.length > 0 ? (
              <>
                <Text style={{ fontSize: 12, fontWeight: '700', color: c.sub, marginTop: 6, marginBottom: 8, marginHorizontal: 2, letterSpacing: 0.4 }}>RECENT</Text>
                {sorted.recentRows.map(renderRow)}
              </>
            ) : null}
            {sorted.favRows.length > 0 || sorted.recentRows.length > 0 ? (
              <Text style={{ fontSize: 12, fontWeight: '700', color: c.sub, marginTop: 6, marginBottom: 8, marginHorizontal: 2, letterSpacing: 0.4 }}>ALL</Text>
            ) : null}
            {sorted.rest.map(renderRow)}
          </>
        )}
      </ScrollView>
    </View>
  );
}
