// app/(tabs)/_layout.tsx — bottom tab navigator with custom tab bar
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
