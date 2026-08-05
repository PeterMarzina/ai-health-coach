// app/nutrition/_layout.tsx — navigatie voor de /nutrition submap
// Maakt een eenvoudige stack zodat /nutrition/add en /nutrition/product/[id]
// zonder eigen kopbalk openen (zelfde patroon als app/plan/_layout.tsx).
import { Stack } from 'expo-router';
export default function NutritionLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
