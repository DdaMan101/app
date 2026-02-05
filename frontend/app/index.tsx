import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../src/store/authStore';
import { COLORS, SPACING, FONT_SIZES } from '../src/constants/theme';
import { LoadingScreen } from '../src/components/LoadingScreen';

export default function Index() {
  const { isLoading, isAuthenticated, user, loadAuth } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    loadAuth();
  }, []);

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      router.replace('/(auth)/login');
    } else if (user?.role === 'talent') {
      router.replace('/(talent)/dashboard');
    } else if (user?.role === 'production') {
      router.replace('/(production)/browse');
    } else if (user?.role === 'admin') {
      router.replace('/(admin)/dashboard');
    }
  }, [isLoading, isAuthenticated, user]);

  return <LoadingScreen message="A Few Good Men Casting" />;
}
