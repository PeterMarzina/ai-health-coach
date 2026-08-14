// app/plan/_layout.tsx — navigatie voor de /plan submap
// Maakt een eenvoudige stack zodat /plan/workout zonder eigen kopbalk opent.
import { Stack } from 'expo-router';
export default function PlanLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
