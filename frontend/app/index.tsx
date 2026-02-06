import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../src/constants/theme';

const { width } = Dimensions.get('window');

type RoleButton = {
  role: 'admin' | 'talent' | 'production';
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
};

const ROLES: RoleButton[] = [
  {
    role: 'admin',
    title: 'Admin',
    subtitle: 'Back Office',
    icon: 'shield-checkmark',
    color: COLORS.secondary,
  },
  {
    role: 'talent',
    title: 'Talent',
    subtitle: 'Supporting Artiste',
    icon: 'person',
    color: COLORS.primary,
  },
  {
    role: 'production',
    title: 'Production',
    subtitle: 'Hire Talent',
    icon: 'videocam',
    color: '#2E7D32',
  },
];

export default function SplashScreen() {
  const router = useRouter();

  const handleRoleSelect = (role: string) => {
    router.push({ pathname: '/(auth)/login', params: { role } });
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Logo Section */}
      <View style={styles.logoSection}>
        <Image
          source={require('../assets/logo.jpeg')}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      {/* Role Buttons */}
      <View style={styles.buttonsSection}>
        <Text style={styles.selectText}>Select your role to continue</Text>
        
        {ROLES.map((role) => (
          <TouchableOpacity
            key={role.role}
            style={[styles.roleButton, { borderLeftColor: role.color }]}
            onPress={() => handleRoleSelect(role.role)}
            activeOpacity={0.8}
          >
            <View style={[styles.iconContainer, { backgroundColor: role.color + '15' }]}>
              <Ionicons name={role.icon} size={32} color={role.color} />
            </View>
            <View style={styles.roleTextContainer}>
              <Text style={styles.roleTitle}>{role.title}</Text>
              <Text style={styles.roleSubtitle}>{role.subtitle}</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={COLORS.textSecondary} />
          </TouchableOpacity>
        ))}
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>Film & TV Casting Agency</Text>
        <Text style={styles.footerSubtext}>London, UK</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  logoSection: {
    alignItems: 'center',
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  logo: {
    width: width * 0.5,
    height: width * 0.4,
  },
  buttonsSection: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
  },
  selectText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  roleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  roleTextContainer: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  roleTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    color: COLORS.text,
  },
  roleSubtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  footer: {
    alignItems: 'center',
    paddingBottom: SPACING.xl,
  },
  footerText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  footerSubtext: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
});
