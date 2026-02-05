import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../constants/theme';

interface Props {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  fullWidth?: boolean;
}

export const Button: React.FC<Props> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  style,
  textStyle,
  fullWidth = false,
}) => {
  const getBackgroundColor = () => {
    if (disabled) return COLORS.border;
    switch (variant) {
      case 'primary': return COLORS.primary;
      case 'secondary': return COLORS.secondary;
      case 'outline': return 'transparent';
      case 'danger': return COLORS.error;
      default: return COLORS.primary;
    }
  };

  const getTextColor = () => {
    if (disabled) return COLORS.textSecondary;
    if (variant === 'outline') return COLORS.primary;
    return COLORS.textLight;
  };

  const getPadding = () => {
    switch (size) {
      case 'small': return { paddingVertical: SPACING.sm, paddingHorizontal: SPACING.md };
      case 'large': return { paddingVertical: SPACING.lg, paddingHorizontal: SPACING.xl };
      default: return { paddingVertical: SPACING.md, paddingHorizontal: SPACING.lg };
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.button,
        getPadding(),
        { backgroundColor: getBackgroundColor() },
        variant === 'outline' && styles.outline,
        fullWidth && styles.fullWidth,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator color={getTextColor()} size="small" />
      ) : (
        <Text style={[styles.text, { color: getTextColor() }, textStyle]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  outline: {
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  fullWidth: {
    width: '100%',
  },
  text: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
});
