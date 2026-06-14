// app/(tabs)/_layout.tsx — de tab-navigatie (4 tabbladen onderaan)
// Koppelt de schermen index/plan/progress/profile aan de tabbalk.
// De tabbalk zelf is onze eigen <TabBar/> uit components/.
import React from 'react';
import { Tabs } from 'expo-router';
import { TabBar } from '@/components/TabBar';

export default function TabsLayout() {
  return (
    <Tabs tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="plan" />
      <Tabs.Screen name="progress" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
