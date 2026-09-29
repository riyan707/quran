import { Stack } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { DbProvider, useDbState } from '@/src/hooks/useDb';

function BootGate({ children }: { children: React.ReactNode }) {
  const { isReady, error } = useDbState();

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Failed to open the local database.</Text>
        <Text style={styles.errorDetail}>{error.message}</Text>
      </View>
    );
  }

  if (!isReady) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <DbProvider>
        <StatusBar style="dark" />
        <BootGate>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen
              name="start-memorisation"
              options={{ presentation: 'modal', headerShown: true, title: 'Start Memorisation' }}
            />
          </Stack>
        </BootGate>
      </DbProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 24 },
  errorText: { fontSize: 16, fontWeight: '600' },
  errorDetail: { fontSize: 13, color: '#666', textAlign: 'center' },
});
