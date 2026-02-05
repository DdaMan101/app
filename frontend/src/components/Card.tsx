import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { COLORS, SPACING, BORDER_RADIUS } from '../constants/theme';

interface Props {
  children: React.ReactNode;
  style?: ViewStyle;
  padding?: 'none' | 'small' | 'medium' | 'large';
}

export const Card: React.FC<Props> = ({ children, style, padding = 'medium' }) => {
  const getPadding = () => {
    switch (padding) {
      case 'none': return 0;
      case 'small': return SPACING.sm;
      case 'large': return SPACING.lg;
      default: return SPACING.md;
    }
  };

  return (
    <View style={[styles.card, { padding: getPadding() }, style]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.lg,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
});
