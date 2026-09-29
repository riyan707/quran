import { Tabs } from 'expo-router';

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: true, tabBarActiveTintColor: '#0f766e' }}>
      <Tabs.Screen name="index" options={{ title: 'Read', headerShown: false }} />
      <Tabs.Screen name="review" options={{ title: 'Review' }} />
      <Tabs.Screen name="progress" options={{ title: 'Progress' }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
    </Tabs>
  );
}
