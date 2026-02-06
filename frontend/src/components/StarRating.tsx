import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING } from '../constants/theme';

interface Props {
  rating: number;
  maxRating?: number;
  size?: number;
  editable?: boolean;
  onRatingChange?: (rating: number) => void;
}

export const StarRating: React.FC<Props> = ({
  rating,
  maxRating = 5,
  size = 20,
  editable = false,
  onRatingChange,
}) => {
  const stars = [];

  for (let i = 1; i <= maxRating; i++) {
    const isFilled = i <= rating;

    if (editable) {
      stars.push(
        <TouchableOpacity
          key={i}
          onPress={() => onRatingChange?.(i)}
          style={styles.starButton}
        >
          <Ionicons
            name={isFilled ? 'star' : 'star-outline'}
            size={size}
            color={isFilled ? '#FFD700' : COLORS.border}
          />
        </TouchableOpacity>
      );
    } else {
      stars.push(
        <Ionicons
          key={i}
          name={isFilled ? 'star' : 'star-outline'}
          size={size}
          color={isFilled ? '#FFD700' : COLORS.border}
          style={styles.star}
        />
      );
    }
  }

  return <View style={styles.container}>{stars}</View>;
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  star: {
    marginRight: 2,
  },
  starButton: {
    padding: 2,
  },
});
