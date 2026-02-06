import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Input } from '../../src/components/Input';
import { Button } from '../../src/components/Button';
import { Card } from '../../src/components/Card';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../../src/constants/theme';
import api from '../../src/api/client';

export default function EnterCodesScreen() {
  const router = useRouter();
  const [code1, setCode1] = useState('');
  const [code2, setCode2] = useState('');
  const [loading, setLoading] = useState(false);
  const [referrers, setReferrers] = useState<any>(null);

  const handleValidateCodes = async () => {
    if (!code1 || !code2) {
      Alert.alert('Error', 'Please enter both referral codes');
      return;
    }
    if (code1.length !== 4 || code2.length !== 4) {
      Alert.alert('Error', 'Each code must be 4 digits');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/auth/validate-codes', { code1, code2 });
      setReferrers(response.data);
    } catch (error: any) {
      Alert.alert('Invalid Codes', error.response?.data?.detail || 'Please check your codes and try again');
    } finally {
      setLoading(false);
    }
  };

  const handleProceedToRegister = () => {
    router.push({
      pathname: '/(auth)/register-talent',
      params: {
        code1,
        code2,
        referrer1Name: referrers.referrer_1.name,
        referrer2Name: referrers.referrer_2.name,
      },
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Back Button */}
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>

          {/* Header */}
          <View style={styles.header}>
            <View style={[styles.iconContainer, { backgroundColor: COLORS.primary + '15' }]}>
              <Ionicons name="key" size={40} color={COLORS.primary} />
            </View>
            <Text style={styles.title}>Enter Referral Codes</Text>
            <Text style={styles.subtitle}>
              You need 2 referral codes from existing talents to join
            </Text>
          </View>

          {/* Code Entry */}
          {!referrers ? (
            <Card style={styles.formCard}>
              <Text style={styles.instructions}>
                Ask two existing talents to generate codes for you. Each code is 4 digits.
              </Text>

              <Input
                label="First Referral Code"
                placeholder="Enter 4-digit code"
                value={code1}
                onChangeText={setCode1}
                keyboardType="numeric"
              />

              <Input
                label="Second Referral Code"
                placeholder="Enter 4-digit code"
                value={code2}
                onChangeText={setCode2}
                keyboardType="numeric"
              />

              <Button
                title="Validate Codes"
                onPress={handleValidateCodes}
                loading={loading}
                fullWidth
                style={styles.validateButton}
              />
            </Card>
          ) : (
            <Card style={styles.successCard}>
              <Ionicons name="checkmark-circle" size={48} color={COLORS.success} />
              <Text style={styles.successTitle}>Codes Validated!</Text>
              <Text style={styles.successText}>You have been referred by:</Text>

              <View style={styles.referrerBox}>
                <Ionicons name="person" size={20} color={COLORS.primary} />
                <Text style={styles.referrerName}>{referrers.referrer_1.name}</Text>
              </View>

              <View style={styles.referrerBox}>
                <Ionicons name="person" size={20} color={COLORS.primary} />
                <Text style={styles.referrerName}>{referrers.referrer_2.name}</Text>
              </View>

              <Button
                title="Continue to Registration"
                onPress={handleProceedToRegister}
                fullWidth
                style={styles.continueButton}
              />
            </Card>
          )}

          {/* Info */}
          <View style={styles.infoBox}>
            <Ionicons name="information-circle" size={20} color={COLORS.info} />
            <Text style={styles.infoText}>
              Codes can only be used once. Make sure you get fresh codes from your referrers.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: SPACING.lg,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  title: {
    fontSize: FONT_SIZES.title,
    fontWeight: 'bold',
    color: COLORS.primary,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.sm,
  },
  formCard: {
    padding: SPACING.lg,
  },
  instructions: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    marginBottom: SPACING.lg,
    lineHeight: 22,
  },
  validateButton: {
    marginTop: SPACING.md,
  },
  successCard: {
    padding: SPACING.lg,
    alignItems: 'center',
  },
  successTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: 'bold',
    color: COLORS.success,
    marginTop: SPACING.md,
  },
  successText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  referrerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary + '10',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    width: '100%',
    marginBottom: SPACING.sm,
  },
  referrerName: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.primary,
    marginLeft: SPACING.md,
  },
  continueButton: {
    marginTop: SPACING.lg,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.info + '10',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginTop: SPACING.lg,
  },
  infoText: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
    color: COLORS.info,
    marginLeft: SPACING.sm,
    lineHeight: 20,
  },
});
