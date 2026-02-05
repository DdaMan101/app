import React from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { COLORS, FONT_SIZES } from '../constants/theme';

interface Props {
  message?: string;
}

export const LoadingScreen: React.FC<Props> = ({ message }) => {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={COLORS.primary} />
      {message && <Text style={styles.text}>{message}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  text: {
    marginTop: 16,
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
  },
});
