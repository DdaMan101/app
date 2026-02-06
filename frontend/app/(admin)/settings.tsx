import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/authStore';
import { Card } from '../../src/components/Card';
import { Button } from '../../src/components/Button';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../../src/constants/theme';

export default function AdminSettingsScreen() {
  const { user, logout } = useAuthStore();

  const handleLogout = async () => {
    await logout();
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Profile Card */}
        <Card style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <Ionicons name="shield-checkmark" size={40} color={COLORS.primary} />
          </View>
          <Text style={styles.userName}>{user?.first_name} {user?.last_name}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>Administrator</Text>
          </View>
        </Card>

        {/* Management Options */}
        <Card style={styles.optionsCard}>
          <Text style={styles.optionsTitle}>Management</Text>
          
          <TouchableOpacity style={styles.optionRow}>
            <Ionicons name="people" size={22} color={COLORS.text} />
            <Text style={styles.optionText}>Manage Users</Text>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.optionRow}>
            <Ionicons name="pricetag" size={22} color={COLORS.text} />
            <Text style={styles.optionText}>Rate Management</Text>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.optionRow}>
            <Ionicons name="analytics" size={22} color={COLORS.text} />
            <Text style={styles.optionText}>Reports</Text>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </Card>

        {/* Account Options */}
        <Card style={styles.optionsCard}>
          <Text style={styles.optionsTitle}>Account</Text>

          <TouchableOpacity style={styles.optionRow}>
            <Ionicons name="person-outline" size={22} color={COLORS.text} />
            <Text style={styles.optionText}>Edit Profile</Text>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.optionRow}>
            <Ionicons name="notifications-outline" size={22} color={COLORS.text} />
            <Text style={styles.optionText}>Notifications</Text>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.optionRow}>
            <Ionicons name="help-circle-outline" size={22} color={COLORS.text} />
            <Text style={styles.optionText}>Help & Support</Text>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </Card>

        {/* Logout Button */}
        <Button
          title="Logout"
          onPress={handleLogout}
          variant="danger"
          fullWidth
          style={styles.logoutButton}
        />

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>A Few Good Men Casting</Text>
          <Text style={styles.versionText}>Back Office v1.0</Text>
          <View style={styles.flagStripe}>
            <View style={[styles.stripe, { backgroundColor: COLORS.primary }]} />
            <View style={[styles.stripe, { backgroundColor: COLORS.accent }]} />
            <View style={[styles.stripe, { backgroundColor: COLORS.secondary }]} />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: SPACING.md,
  },
  profileCard: {
    alignItems: 'center',
    padding: SPACING.xl,
    marginBottom: SPACING.md,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  userName: {
    fontSize: FONT_SIZES.xl,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  userEmail: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  roleBadge: {
    backgroundColor: COLORS.secondary + '15',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.round,
    marginTop: SPACING.md,
  },
  roleText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.secondary,
    fontWeight: '600',
  },
  optionsCard: {
    padding: 0,
    marginBottom: SPACING.md,
  },
  optionsTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  optionText: {
    flex: 1,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    marginLeft: SPACING.md,
  },
  logoutButton: {
    marginBottom: SPACING.xl,
  },
  footer: {
    alignItems: 'center',
    marginTop: SPACING.lg,
  },
  footerText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  versionText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  flagStripe: {
    flexDirection: 'row',
    width: 80,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  stripe: {
    flex: 1,
  },
});
