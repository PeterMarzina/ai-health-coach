// app/nutrition.tsx — Voeding-scherm
// Toont je dagelijkse inname versus je doelen (calorieën/macro's/water) met een
// ronde grafiek (Ring) en balken (Bar). Doelen komen uit useSettings() (afgeleid
// uit je AI-profiel tijdens onboarding, zie src/services/aiProfile.ts).
// Maaltijden log je hier door een product te kiezen uit de basisproducten-database
// (macro's per 100g, zie `products`) + een gewicht in gram — de macro's worden dan
// automatisch berekend. Een product niet gevonden? Handmatige invoer (alle macro's
// zelf intypen) blijft als fallback beschikbaar. Beide worden opgeslagen in Supabase
// (`meal_logs`), per kalenderdag. Water zelf komt uit useDaily() (Sprint 3,
// `daily_progress`) zodat er maar één telling is die ook de dagscore/streak/XP op
// Home voedt — niet hier opnieuw bijhouden.
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card, Bar } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { Ring } from '@/components/Charts';
import { useTheme, useSettings, useAuth, useDaily } from '@/components/store';
import type { MealEntry, Product } from '@/src/types/tracking';
import { todayKey, fetchMeals, addMeal, deleteMeal, fetchProducts } from '@/src/services/trackingService';

const WATER_STEP = 0.25; // liter per tik van de teller

function FieldInput({ value, onChangeText, placeholder, c }: { value: string; onChangeText: (t: string) => void; placeholder: string; c: any }) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={c.dim}
      keyboardType="decimal-pad"
      style={{ flex: 1, backgroundColor: c.cardHi, borderWidth: 1, borderColor: c.line, borderRadius: 11, paddingHorizontal: 10, paddingVertical: 10, fontSize: 13.5, color: c.text }}
    />
  );
}

export default function Nutrition() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { goals } = useSettings();
  const { session } = useAuth();
  const { progress, addWater } = useDaily();
  const userId = session?.user?.id;
  const date = todayKey();

  const [meals, setMeals] = useState<MealEntry[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  // "product" = kiezen uit de basisproducten-database + gewicht invullen (macro's
  // worden berekend); "manual" = fallback als een product niet in de lijst staat.
  const [mode, setMode] = useState<'product' | 'manual'>('product');
  const [search, setSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [grams, setGrams] = useState('');

  const [name, setName] = useState('');
  const [kcal, setKcal] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fats, setFats] = useState('');

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const [m, p] = await Promise.all([fetchMeals(userId, date), fetchProducts()]);
      setMeals(m);
      setProducts(p);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  }, [userId, date]);

  useEffect(() => { load(); }, [load]);

  const num = (s: string) => parseFloat(s.replace(',', '.')) || 0;

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q || selectedProduct) return [];
    return products.filter((p) => p.name.toLowerCase().includes(q)).slice(0, 6);
  }, [search, products, selectedProduct]);

  const gramsNum = num(grams);
  const preview = selectedProduct && gramsNum > 0 ? {
    calories: Math.round((gramsNum / 100) * selectedProduct.caloriesPer100g),
    proteinG: Math.round((gramsNum / 100) * selectedProduct.proteinPer100g),
    carbsG: Math.round((gramsNum / 100) * selectedProduct.carbsPer100g),
    fatsG: Math.round((gramsNum / 100) * selectedProduct.fatsPer100g),
  } : null;

  const canSubmit = mode === 'product' ? (!!selectedProduct && gramsNum > 0) : !!name.trim();

  const resetForm = () => {
    setSearch(''); setSelectedProduct(null); setGrams('');
    setName(''); setKcal(''); setProtein(''); setCarbs(''); setFats('');
  };

  const handleAddMeal = async () => {
    if (!userId || !canSubmit) return;
    setAdding(true);
    try {
      const meal = mode === 'product' && selectedProduct && preview
        ? await addMeal(userId, date, {
            name: selectedProduct.name,
            calories: preview.calories,
            proteinG: preview.proteinG,
            carbsG: preview.carbsG,
            fatsG: preview.fatsG,
            productId: selectedProduct.id,
            grams: gramsNum,
          })
        : await addMeal(userId, date, {
            name: name.trim(),
            calories: Math.round(num(kcal)),
            proteinG: Math.round(num(protein)),
            carbsG: Math.round(num(carbs)),
            fatsG: Math.round(num(fats)),
            productId: null,
            grams: null,
          });
      setMeals((prev) => [...prev, meal]);
      resetForm();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteMeal = async (id: string) => {
    setMeals((prev) => prev.filter((m) => m.id !== id));
    try {
      await deleteMeal(id);
    } catch (e: any) {
      Alert.alert('Error', e.message);
      load();
    }
  };

  const consumed = meals.reduce(
    (a, m) => ({ calories: a.calories + m.calories, protein: a.protein + m.proteinG, carbs: a.carbs + m.carbsG, fats: a.fats + m.fatsG }),
    { calories: 0, protein: 0, carbs: 0, fats: 0 }
  );

  const rings = [
    { label: 'Calories', v: consumed.calories, goal: goals.calories, unit: 'kcal', icon: 'flame' as const, color: c.calories },
    { label: 'Protein', v: consumed.protein, goal: goals.protein, unit: 'g', icon: 'target' as const, color: c.protein },
    { label: 'Water', v: progress.waterL, goal: goals.water, unit: 'L', icon: 'droplet' as const, color: c.water },
  ];

  const macros = [
    { label: 'Protein', v: consumed.protein, goal: goals.protein, unit: 'g', hue: 'protein' },
    { label: 'Carbs', v: consumed.carbs, goal: goals.carbs, unit: 'g', hue: 'carbs' },
    { label: 'Fats', v: consumed.fats, goal: goals.fats, unit: 'g', hue: 'fats' },
  ];

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 16, paddingBottom: insets.bottom + 20, backgroundColor: c.bg }}>
      {/* header */}
      <Text style={{ fontSize: 30, fontWeight: '800', color: c.text, letterSpacing: -0.6, marginBottom: 4 }}>Nutrition</Text>
      <Text style={{ fontSize: 13.5, color: c.sub, fontWeight: '600', marginBottom: 20 }}>Today</Text>

      {loading ? (
        <ActivityIndicator color={c.accent} style={{ marginTop: 40 }} />
      ) : (
        <>
          {/* macro rings */}
          <View style={{ flexDirection: 'row', gap: 11, marginBottom: 20 }}>
            {rings.map((r) => (
              <Card key={r.label} pad={13} style={{ flex: 1, alignItems: 'center', borderRadius: 18 }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: c.sub, marginBottom: 10, alignSelf: 'flex-start' }}>{r.label}</Text>
                <Ring size={86} stroke={9} value={r.goal ? (r.v / r.goal) * 100 : 0} color={r.color}>
                  <Icon name={r.icon} size={18} color={r.color} fill={r.icon === 'flame' || r.icon === 'droplet' ? r.color : undefined} />
                </Ring>
                <View style={{ marginTop: 10, alignItems: 'center' }}>
                  <Text style={{ fontSize: 17, fontWeight: '800', color: c.text, letterSpacing: -0.4 }}>{r.v}</Text>
                  <Text style={{ fontSize: 10.5, color: c.dim }}>/ {r.goal} {r.unit}</Text>
                </View>
              </Card>
            ))}
          </View>

          {/* water counter */}
          <Text style={{ fontSize: 17, fontWeight: '700', color: c.text, marginBottom: 12, marginHorizontal: 2 }}>Water</Text>
          <Card pad={16} style={{ marginBottom: 20, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <TouchableOpacity activeOpacity={0.7} onPress={() => addWater(-WATER_STEP)} style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: c.cardHi, borderWidth: 1, borderColor: c.line, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="minus" size={18} color={c.text} />
            </TouchableOpacity>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={{ fontSize: 21, fontWeight: '800', color: c.text }}>{progress.waterL.toFixed(2)} <Text style={{ fontSize: 13, fontWeight: '600', color: c.sub }}>/ {goals.water} L</Text></Text>
              <Text style={{ fontSize: 11.5, color: c.dim, marginTop: 2 }}>+{WATER_STEP}L per tik</Text>
            </View>
            <TouchableOpacity activeOpacity={0.7} onPress={() => addWater(WATER_STEP)} style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="plus" size={18} color={c.onAccent} />
            </TouchableOpacity>
          </Card>

          {/* macros breakdown */}
          <Text style={{ fontSize: 17, fontWeight: '700', color: c.text, marginBottom: 12, marginHorizontal: 2 }}>Macros</Text>
          <Card pad={16} style={{ marginBottom: 20, gap: 16 }}>
            {macros.map((m) => (
              <View key={m.label}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 7 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: c.text }}>{m.label}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10 }}>
                    <Text style={{ fontSize: 12.5, color: c.sub }}>{m.v} / {m.goal}{m.unit}</Text>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: (c as any)[m.hue] || c.accent, width: 32, textAlign: 'right' }}>{m.goal ? Math.round((m.v / m.goal) * 100) : 0}%</Text>
                  </View>
                </View>
                <Bar value={m.v} max={m.goal || 1} color={(c as any)[m.hue] || c.accent} height={8} />
              </View>
            ))}
          </Card>

          {/* meals */}
          <Text style={{ fontSize: 17, fontWeight: '700', color: c.text, marginBottom: 12, marginHorizontal: 2 }}>Meals</Text>
          <View style={{ gap: 10, marginBottom: 16 }}>
            {meals.length === 0 ? (
              <Text style={{ fontSize: 13, color: c.sub, marginHorizontal: 2 }}>No meals logged yet today.</Text>
            ) : meals.map((m) => (
              <Card key={m.id} pad={12} style={{ flexDirection: 'row', alignItems: 'center', gap: 13 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14.5, fontWeight: '700', color: c.text }}>{m.name}{m.grams != null ? ` (${m.grams}g)` : ''}</Text>
                  <Text style={{ fontSize: 12, color: c.sub, marginTop: 2 }}>P {m.proteinG}g · C {m.carbsG}g · F {m.fatsG}g</Text>
                </View>
                <Text style={{ fontSize: 13, fontWeight: '700', color: c.text }}>{m.calories} <Text style={{ fontSize: 10.5, color: c.dim, fontWeight: '500' }}>kcal</Text></Text>
                <TouchableOpacity activeOpacity={0.7} onPress={() => handleDeleteMeal(m.id)} style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: c.cardHi, borderWidth: 1, borderColor: c.line, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="minus" size={15} color={c.bad} />
                </TouchableOpacity>
              </Card>
            ))}
          </View>

          {/* add meal form */}
          <Text style={{ fontSize: 17, fontWeight: '700', color: c.text, marginBottom: 12, marginHorizontal: 2 }}>Log a meal</Text>
          <Card pad={14} style={{ marginBottom: 20, gap: 10 }}>
            {/* mode toggle */}
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {(['product', 'manual'] as const).map((m) => {
                const on = mode === m;
                return (
                  <TouchableOpacity key={m} activeOpacity={0.7} onPress={() => setMode(m)}
                    style={{ flex: 1, paddingVertical: 10, borderRadius: 11, alignItems: 'center', borderWidth: 1, borderColor: on ? c.accent : c.line, backgroundColor: on ? c.accent : 'transparent' }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: on ? c.onAccent : c.sub }}>{m === 'product' ? 'From product' : 'Manual entry'}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {mode === 'product' ? (
              <>
                {selectedProduct ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: c.cardHi, borderWidth: 1, borderColor: c.line, borderRadius: 11, paddingHorizontal: 12, paddingVertical: 10 }}>
                    <Text style={{ flex: 1, fontSize: 14, fontWeight: '600', color: c.text }}>{selectedProduct.name}</Text>
                    <Text style={{ fontSize: 11, color: c.dim }}>{selectedProduct.caloriesPer100g} kcal/100g</Text>
                    <TouchableOpacity activeOpacity={0.7} onPress={() => { setSelectedProduct(null); setSearch(''); }} style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: c.card, borderWidth: 1, borderColor: c.line, alignItems: 'center', justifyContent: 'center' }}>
                      <Icon name="minus" size={13} color={c.text} />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <>
                    <TextInput
                      value={search}
                      onChangeText={setSearch}
                      placeholder="Search product (e.g. chicken, rice, oats)"
                      placeholderTextColor={c.dim}
                      style={{ backgroundColor: c.cardHi, borderWidth: 1, borderColor: c.line, borderRadius: 11, paddingHorizontal: 12, paddingVertical: 12, fontSize: 14, color: c.text }}
                    />
                    {filteredProducts.length > 0 ? (
                      <View style={{ borderWidth: 1, borderColor: c.line, borderRadius: 11, overflow: 'hidden' }}>
                        {filteredProducts.map((p, i) => (
                          <TouchableOpacity key={p.id} activeOpacity={0.7} onPress={() => { setSelectedProduct(p); setSearch(p.name); }}
                            style={{ paddingHorizontal: 12, paddingVertical: 11, borderBottomWidth: i < filteredProducts.length - 1 ? 1 : 0, borderBottomColor: c.line, backgroundColor: c.card }}>
                            <Text style={{ fontSize: 13.5, fontWeight: '600', color: c.text }}>{p.name}</Text>
                            <Text style={{ fontSize: 11, color: c.sub, marginTop: 1 }}>{p.caloriesPer100g} kcal · P {p.proteinPer100g}g · C {p.carbsPer100g}g · F {p.fatsPer100g}g (per 100g)</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    ) : search.trim() ? (
                      <Text style={{ fontSize: 12, color: c.sub }}>No matching product. Try "Manual entry" above.</Text>
                    ) : null}
                  </>
                )}

                {selectedProduct ? (
                  <>
                    <FieldInput value={grams} onChangeText={setGrams} placeholder="Weight in grams" c={c} />
                    {preview ? (
                      <Text style={{ fontSize: 12.5, color: c.sub }}>
                        ≈ {preview.calories} kcal · P {preview.proteinG}g · C {preview.carbsG}g · F {preview.fatsG}g
                      </Text>
                    ) : null}
                  </>
                ) : null}
              </>
            ) : (
              <>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="Meal name (e.g. Chicken & rice)"
                  placeholderTextColor={c.dim}
                  style={{ backgroundColor: c.cardHi, borderWidth: 1, borderColor: c.line, borderRadius: 11, paddingHorizontal: 12, paddingVertical: 12, fontSize: 14, color: c.text }}
                />
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <FieldInput value={kcal} onChangeText={setKcal} placeholder="kcal" c={c} />
                  <FieldInput value={protein} onChangeText={setProtein} placeholder="protein g" c={c} />
                </View>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <FieldInput value={carbs} onChangeText={setCarbs} placeholder="carbs g" c={c} />
                  <FieldInput value={fats} onChangeText={setFats} placeholder="fats g" c={c} />
                </View>
              </>
            )}

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleAddMeal}
              disabled={adding || !canSubmit}
              style={{ height: 46, borderRadius: 13, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, opacity: adding || !canSubmit ? 0.6 : 1 }}
            >
              {adding ? <ActivityIndicator color={c.onAccent} /> : (
                <>
                  <Icon name="plus" size={16} color={c.onAccent} />
                  <Text style={{ color: c.onAccent, fontSize: 14.5, fontWeight: '700' }}>Add meal</Text>
                </>
              )}
            </TouchableOpacity>
          </Card>
        </>
      )}
    </ScrollView>
  );
}
