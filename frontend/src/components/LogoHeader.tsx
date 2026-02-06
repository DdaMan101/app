import React from 'react';
import { View, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS, SPACING } from '../constants/theme';

interface Props {
  showBack?: boolean;
  rightContent?: React.ReactNode;
}

export const LogoHeader: React.FC<Props> = ({ showBack = false, rightContent }) => {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.leftSection}>
        {showBack && (
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            {/* Back handled by navigation */}
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.centerSection} />
      <View style={styles.rightSection}>
        <Image
          source={require('../../assets/logo.jpeg')}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  leftSection: {
    flex: 1,
  },
  centerSection: {
    flex: 2,
  },
  rightSection: {
    flex: 1,
    alignItems: 'flex-end',
  },
  backButton: {
    padding: SPACING.sm,
  },
  logo: {
    width: 50,
    height: 40,
  },
});
