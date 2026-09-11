// app/nutrition/add.tsx — Toevoeg-flow: zoekscherm met tabs (Alles/Recent/
// Favorieten/Eigen items) + altijd-beschikbare handmatige-invoer-knop onderaan.
// Tikken op een resultaat gaat naar /nutrition/product/[id] voor portiegrootte +
// live macro-herberekening; "Handmatig invoeren" naar /nutrition/product/new.
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, FlatList, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Icon } from '@/components/Icon';
import { useTheme, useAuth, useLang } from '@/components/store';
import { MEAL_TYPES, type MealType, type Product } from '@/src/types/tracking';
import { fill, type TKey } from '@/constants/i18n';
import {
  searchProducts, fetchRecentProducts, fetchFavoriteProducts, fetchOwnProducts,
  fetchFavoriteProductIds, setFavoriteProduct,
} from '@/src/services/trackingService';

type Tab = 'all' | 'recent' | 'favorites' | 'own';
const TABS: { key: Tab; label: TKey }[] = [
  { key: 'all', label: 'all' }, { key: 'recent', label: 'recent' },
  { key: 'favorites', label: 'favorites' }, { key: 'own', label: 'own_items' },
];

export default function AddScreen() {
  const { c } = useTheme();
  const { t } = useLang();
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const userId = session?.user?.id;
  const params = useLocalSearchParams<{ date: string; mealType: MealType; tab?: Tab }>();
  const date = params.date;
  const mealType = (params.mealType || 'snack') as MealType;

  const [tab, setTab] = useState<Tab>(params.tab || 'all');
  const [query, setQuery] = useState('');
  const [all, setAll] = useState<Product[]>([]);
  const [recent, setRecent] = useState<Product[]>([]);
  const [favorites, setFavorites] = useState<Product[]>([]);
  const [own, setOwn] = useState<Product[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  const loadTab = useCallback(async (which: Tab) => {
    if (!userId) return;
    setLoading(true);
    try {
      if (which === 'recent') setRecent(await fetchRecentProducts(userId));
      else if (which === 'favorites') setFavorites(await fetchFavoriteProducts(userId));
      else if (which === 'own') setOwn(await fetchOwnProducts(userId));
    } catch (e: any) {
      Alert.alert(t('err_title'), e.message);
    } finally {
      setLoading(false);
    }
  }, [userId, t]);

  useEffect(() => { if (userId) fetchFavoriteProductIds(userId).then(setFavoriteIds).catch(() => {}); }, [userId]);
  useEffect(() => { if (tab !== 'all') loadTab(tab); }, [tab, loadTab]);

  useEffect(() => {
    if (tab !== 'all') return;
    const q = query.trim();
    if (!q) { setAll([]); return; }
    const handle = setTimeout(async () => {
      setLoading(true);
      try {
        setAll(await searchProducts(q));
      } catch (e: any) {
        Alert.alert(t('err_title'), e.message);
      } finally {
        setLoading(false);
      }
    }, 250); // lichte debounce
    return () => clearTimeout(handle);
  }, [query, tab]);

  const source = tab === 'all' ? all : tab === 'recent' ? recent : tab === 'favorites' ? favorites : own;
  const filtered = tab === 'all' ? source : source.filter((p) => p.name.toLowerCase().includes(query.trim().toLowerCase()));

  const toggleFavorite = async (product: Product) => {
    if (!userId) return;
    const isFav = favoriteIds.has(product.id);
    setFavoriteIds((prev) => {
      const next = new Set(prev);
      if (isFav) next.delete(product.id); else next.add(product.id);
      return next;
    });
    try {
      await setFavoriteProduct(userId, product.id, !isFav);
      if (tab === 'favorites') loadTab('favorites');
    } catch (e: any) {
      Alert.alert(t('err_title'), e.message);
    }
  };

  const openProduct = (product: Product) => {
    router.push({ pathname: '/nutrition/product/[id]', params: { id: product.id, product: JSON.stringify(product), date, mealType } });
  };

  const openManual = () => {
    router.push({ pathname: '/nutrition/product/new', params: { date, mealType } });
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top + 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginBottom: 14 }}>
        <TouchableOpacity activeOpacity={0.7} onPress={() => router.back()} style={{ width: 34, height: 34, borderRadius: 12, backgroundColor: c.cardHi, borderWidth: 1, borderColor: c.line, alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
          <Icon name="close" size={16} color={c.text} />
        </TouchableOpacity>
        <Text style={{ fontSize: 19, fontWeight: '800', color: c.text }}>
          {fill(t('add_to_meal'), { meal: t(MEAL_TYPES.find((mt) => mt.key === mealType)?.label ?? 'meal') })}
        </Text>
      </View>

      <View style={{ paddingHorizontal: 16, marginBottom: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: c.cardHi, borderWidth: 1, borderColor: c.line, borderRadius: 13, paddingHorizontal: 13, paddingVertical: 11 }}>
          <Icon name="search" size={17} color={c.dim} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t('product_search_ph')}
            placeholderTextColor={c.dim}
            style={{ flex: 1, fontSize: 14.5, color: c.text }}
            autoFocus={tab === 'all'}
          />
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 10 }}>
        {TABS.map((item) => {
          const active = tab === item.key;
          return (
            <TouchableOpacity key={item.key} activeOpacity={0.7} onPress={() => setTab(item.key)} style={{
              paddingHorizontal: 13, paddingVertical: 8, borderRadius: 10,
              borderWidth: 1, borderColor: active ? c.accent : c.line, backgroundColor: active ? c.accent : 'transparent',
            }}>
              <Text style={{ fontSize: 12.5, fontWeight: active ? '800' : '600', color: active ? c.onAccent : c.sub }}>{t(item.label)}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {loading ? (
        <ActivityIndicator color={c.accent} style={{ marginTop: 30 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(p) => p.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100, gap: 8 }}
          ListEmptyComponent={
            <Text style={{ fontSize: 13, color: c.sub, textAlign: 'center', marginTop: 30 }}>
              {tab === 'all' && !query.trim() ? t('type_to_search') : t('nothing_found')}
            </Text>
          }
          renderItem={({ item }) => (
            <TouchableOpacity activeOpacity={0.7} onPress={() => openProduct(item)} style={{
              flexDirection: 'row', alignItems: 'center', gap: 12,
              backgroundColor: c.card, borderWidth: 1, borderColor: c.line, borderRadius: 14, padding: 13,
            }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: c.text }}>{item.name}</Text>
                <Text style={{ fontSize: 11.5, color: c.sub, marginTop: 2 }}>
                  {item.brand ? `${item.brand} · ` : ''}{item.caloriesPer100g != null ? `${Math.round(item.caloriesPer100g)} kcal / 100g` : t('kcal_unknown')}
                </Text>
              </View>
              <TouchableOpacity activeOpacity={0.7} onPress={() => toggleFavorite(item)} style={{ padding: 6 }}>
                <Icon name="star" size={18} color={favoriteIds.has(item.id) ? c.calories : c.dim} fill={favoriteIds.has(item.id) ? c.calories : undefined} />
              </TouchableOpacity>
            </TouchableOpacity>
          )}
        />
      )}

      <View style={{ position: 'absolute', left: 16, right: 16, bottom: insets.bottom + 14 }}>
        <TouchableOpacity activeOpacity={0.85} onPress={openManual} style={{
          height: 50, borderRadius: 15, backgroundColor: c.cardHi, borderWidth: 1, borderColor: c.line,
          alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8,
        }}>
          <Icon name="pencil" size={16} color={c.text} />
          <Text style={{ fontSize: 14, fontWeight: '700', color: c.text }}>{t('manual_entry')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
