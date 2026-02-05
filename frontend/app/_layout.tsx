import React, { useEffect } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuthStore } from '../src/store/authStore';
import { LoadingScreen } from '../src/components/LoadingScreen';
import { COLORS } from '../src/constants/theme';

export default function RootLayout() {
  const { isLoading, isAuthenticated, user, loadAuth } = useAuthStore();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    loadAuth();
  }, []);

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!isAuthenticated && !inAuthGroup) {
      // Redirect to login
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      // Redirect to appropriate dashboard based on role
      if (user?.role === 'talent') {
        router.replace('/(talent)/dashboard');
      } else if (user?.role === 'production') {
        router.replace('/(production)/browse');
      } else if (user?.role === 'admin') {
        router.replace('/(admin)/dashboard');
      }
    }
  }, [isLoading, isAuthenticated, segments, user]);

  if (isLoading) {
    return (
      <SafeAreaProvider>
        <LoadingScreen message="Loading..." />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <View style={styles.container}>
        <StatusBar style="dark" />
        <Slot />
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
});
