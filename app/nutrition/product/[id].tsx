// app/nutrition/product/[id].tsx — portiegrootte + live macro-herberekening.
// id === 'new'  → handmatige invoer: naam + macro's per 100g zijn zelf in te vullen,
//                 wordt bij het opslaan als eigen product bewaard (createUserProduct)
//                 zodat het later terugkomt in "Eigen items".
// id === <uuid> → bestaand product (reference/openfoodfacts/eigen), per-100g-waarden
//                 komen uit de `product`-param (al geladen door het zoekscherm, dus
//                 geen extra round-trip nodig) en zijn alleen-lezen.
// In beide gevallen: maaltijdkeuze bovenaan, gewicht in gram, macro's herberekenen
// live vanuit de per-100g-waarden. Ontbrekende macro's blijven `null` in de preview
// (nooit stiekem 0) — bij het opslaan tellen ze noodgedwongen als 0 mee in het
// dagtotaal (meal_logs-kolommen zijn NOT NULL), met een duidelijke melding daarover.
import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, ScrollView, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Icon } from '@/components/Icon';
import { useTheme, useAuth } from '@/components/store';
import { MEAL_TYPES, type MealType, type Product } from '@/src/types/tracking';
import { addMeal, createUserProduct } from '@/src/services/trackingService';

function num(s: string): number {
  const n = parseFloat(s.replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

function NumField({ label, value, onChangeText, editable, c }: { label: string; value: string; onChangeText?: (t: string) => void; editable: boolean; c: any }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={{ fontSize: 11, fontWeight: '600', color: c.sub, marginBottom: 6 }}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        editable={editable}
        keyboardType="decimal-pad"
        placeholder="0"
        placeholderTextColor={c.dim}
        style={{
          backgroundColor: editable ? c.cardHi : c.cardLo, borderWidth: 1, borderColor: c.line, borderRadius: 11,
          paddingHorizontal: 11, paddingVertical: 10, fontSize: 14, color: c.text,
        }}
      />
    </View>
  );
}

export default function ProductDetailScreen() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const userId = session?.user?.id;
  const params = useLocalSearchParams<{ id: string; product?: string; date: string; mealType: MealType; barcode?: string }>();
  const barcode = params.barcode || null;
  const isNew = params.id === 'new';
  const existing: Product | null = useMemo(() => {
    if (isNew || !params.product) return null;
    try { return JSON.parse(params.product); } catch { return null; }
  }, [isNew, params.product]);

  const [name, setName] = useState(existing?.name ?? '');
  const [calStr, setCalStr] = useState(existing?.caloriesPer100g != null ? String(existing.caloriesPer100g) : '');
  const [proStr, setProStr] = useState(existing?.proteinPer100g != null ? String(existing.proteinPer100g) : '');
  const [carbStr, setCarbStr] = useState(existing?.carbsPer100g != null ? String(existing.carbsPer100g) : '');
  const [fatStr, setFatStr] = useState(existing?.fatsPer100g != null ? String(existing.fatsPer100g) : '');
  const [grams, setGrams] = useState('100');
  const [mealType, setMealType] = useState<MealType>(params.mealType || 'snack');
  const [saving, setSaving] = useState(false);

  const per100g = isNew
    ? { calories: num(calStr), protein: num(proStr), carbs: num(carbStr), fats: num(fatStr) }
    : {
        calories: existing?.caloriesPer100g ?? null,
        protein: existing?.proteinPer100g ?? null,
        carbs: existing?.carbsPer100g ?? null,
        fats: existing?.fatsPer100g ?? null,
      };

  const gramsNum = num(grams);
  const missing = !isNew && (per100g.calories == null || per100g.protein == null || per100g.carbs == null || per100g.fats == null);
  const preview = {
    calories: per100g.calories != null ? Math.round((gramsNum / 100) * per100g.calories) : null,
    protein: per100g.protein != null ? Math.round((gramsNum / 100) * per100g.protein) : null,
    carbs: per100g.carbs != null ? Math.round((gramsNum / 100) * per100g.carbs) : null,
    fats: per100g.fats != null ? Math.round((gramsNum / 100) * per100g.fats) : null,
  };

  const canSave = name.trim().length > 0 && gramsNum > 0 && (!isNew || calStr.trim().length > 0);

  const handleSave = async () => {
    if (!userId || !canSave) return;
    setSaving(true);
    try {
      let productId: string | null = existing?.id ?? null;
      if (isNew) {
        const created = await createUserProduct(userId, {
          name: name.trim(),
          caloriesPer100g: num(calStr), proteinPer100g: num(proStr), carbsPer100g: num(carbStr), fatsPer100g: num(fatStr),
          barcode,
        });
        productId = created.id;
      }
      await addMeal(userId, params.date, {
        name: name.trim(),
        calories: preview.calories ?? 0,
        proteinG: preview.protein ?? 0,
        carbsG: preview.carbs ?? 0,
        fatsG: preview.fats ?? 0,
        mealType,
        productId,
        grams: gramsNum,
      });
      router.dismissTo('/nutrition');
    } catch (e: any) {
      Alert.alert('Opslaan mislukt', e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top + 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginBottom: 16 }}>
        <TouchableOpacity activeOpacity={0.7} onPress={() => router.back()} style={{ width: 34, height: 34, borderRadius: 12, backgroundColor: c.cardHi, borderWidth: 1, borderColor: c.line, alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
          <Icon name="close" size={16} color={c.text} />
        </TouchableOpacity>
        <Text numberOfLines={1} style={{ flex: 1, fontSize: 18, fontWeight: '800', color: c.text }}>
          {isNew ? 'Handmatig invoeren' : existing?.name || 'Product'}
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120, gap: 18 }} keyboardShouldPersistTaps="handled">
        {/* maaltijdkeuze bovenaan */}
        <View>
          <Text style={{ fontSize: 12.5, fontWeight: '600', color: c.sub, marginBottom: 8 }}>Maaltijd</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {MEAL_TYPES.map((t) => {
              const active = mealType === t.key;
              return (
                <TouchableOpacity key={t.key} activeOpacity={0.7} onPress={() => setMealType(t.key)} style={{
                  flex: 1, paddingVertical: 9, borderRadius: 11, alignItems: 'center',
                  borderWidth: 1, borderColor: active ? c.accent : c.line, backgroundColor: active ? c.accent : 'transparent',
                }}>
                  <Text style={{ fontSize: 11.5, fontWeight: active ? '800' : '600', color: active ? c.onAccent : c.sub }}>{t.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {isNew ? (
          <View>
            <Text style={{ fontSize: 12.5, fontWeight: '600', color: c.sub, marginBottom: 8 }}>Naam</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Bv. Zelfgemaakte smoothie"
              placeholderTextColor={c.dim}
              style={{ backgroundColor: c.cardHi, borderWidth: 1, borderColor: c.line, borderRadius: 11, paddingHorizontal: 12, paddingVertical: 12, fontSize: 14.5, color: c.text }}
            />
            {barcode ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
                <Icon name="barcode" size={13} color={c.dim} />
                <Text style={{ fontSize: 11.5, color: c.dim }}>Barcode {barcode} — niet gevonden, dus zelf aangevuld</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        <View>
          <Text style={{ fontSize: 12.5, fontWeight: '600', color: c.sub, marginBottom: 8 }}>
            {isNew ? 'Macro\'s per 100 gram' : 'Per 100 gram'}
          </Text>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
            <NumField label="Kcal" value={isNew ? calStr : (per100g.calories != null ? String(per100g.calories) : '?')} onChangeText={setCalStr} editable={isNew} c={c} />
            <NumField label="Eiwit (g)" value={isNew ? proStr : (per100g.protein != null ? String(per100g.protein) : '?')} onChangeText={setProStr} editable={isNew} c={c} />
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <NumField label="Koolhydraten (g)" value={isNew ? carbStr : (per100g.carbs != null ? String(per100g.carbs) : '?')} onChangeText={setCarbStr} editable={isNew} c={c} />
            <NumField label="Vetten (g)" value={isNew ? fatStr : (per100g.fats != null ? String(per100g.fats) : '?')} onChangeText={setFatStr} editable={isNew} c={c} />
          </View>
          {missing ? (
            <Text style={{ fontSize: 11.5, color: c.dim, marginTop: 8 }}>
              Dit product mist bij Open Food Facts één of meer waarden — die tellen als 0 mee in je dagtotaal.
            </Text>
          ) : null}
        </View>

        <View>
          <Text style={{ fontSize: 12.5, fontWeight: '600', color: c.sub, marginBottom: 8 }}>Gewicht (gram)</Text>
          <TextInput
            value={grams}
            onChangeText={setGrams}
            keyboardType="decimal-pad"
            placeholder="100"
            placeholderTextColor={c.dim}
            style={{ backgroundColor: c.cardHi, borderWidth: 1, borderColor: c.line, borderRadius: 11, paddingHorizontal: 12, paddingVertical: 12, fontSize: 16, color: c.text, fontWeight: '700' }}
          />
        </View>

        <View style={{ backgroundColor: c.cardHi, borderWidth: 1, borderColor: c.line, borderRadius: 15, padding: 15, flexDirection: 'row', justifyContent: 'space-around' }}>
          {[
            { label: 'Kcal', v: preview.calories, color: c.calories },
            { label: 'Eiwit', v: preview.protein, color: c.protein },
            { label: 'Koolh.', v: preview.carbs, color: c.carbs },
            { label: 'Vet', v: preview.fats, color: c.fats },
          ].map((x) => (
            <View key={x.label} style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 16, fontWeight: '800', color: x.color }}>{x.v != null ? x.v : '—'}</Text>
              <Text style={{ fontSize: 10.5, color: c.dim, marginTop: 2 }}>{x.label}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={{ position: 'absolute', left: 16, right: 16, bottom: insets.bottom + 14 }}>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={handleSave}
          disabled={saving || !canSave}
          style={{ height: 52, borderRadius: 15, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center', opacity: saving || !canSave ? 0.6 : 1 }}
        >
          {saving ? <ActivityIndicator color={c.onAccent} /> : <Text style={{ fontSize: 15, fontWeight: '700', color: c.onAccent }}>Toevoegen</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}
