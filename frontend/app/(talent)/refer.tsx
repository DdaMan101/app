import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Card } from '../../src/components/Card';
import { Button } from '../../src/components/Button';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../../src/constants/theme';
import { useAuthStore } from '../../src/store/authStore';
import api from '../../src/api/client';
import { ReferralCode } from '../../src/types';

export default function ReferScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<{
    code: string;
    email_subject: string;
    email_body: string;
  } | null>(null);
  const [myCodes, setMyCodes] = useState<ReferralCode[]>([]);
  const [canGenerateCode, setCanGenerateCode] = useState(true);
  const [nextCodeAvailable, setNextCodeAvailable] = useState<string | null>(null);

  const fetchMyCodes = async () => {
    try {
      const response = await api.get('/talent/my-codes');
      const codes = response.data as ReferralCode[];
      setMyCodes(codes);
      
      // Check if there's a recent unused code (within last 7 days)
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      
      const recentCode = codes.find((c: ReferralCode) => {
        const createdAt = new Date(c.created_at);
        return createdAt > oneWeekAgo;
      });
      
      if (recentCode) {
        const createdAt = new Date(recentCode.created_at);
        const nextAvailable = new Date(createdAt);
        nextAvailable.setDate(nextAvailable.getDate() + 7);
        
        if (nextAvailable > new Date()) {
          setCanGenerateCode(false);
          const daysLeft = Math.ceil((nextAvailable.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
          setNextCodeAvailable(`${daysLeft} day(s)`);
          
          // If code is unused, show it
          if (!recentCode.is_used) {
            setGeneratedCode({
              code: recentCode.code,
              email_subject: "You've been invited to A Few Good Men Casting!",
              email_body: `${user?.first_name} ${user?.last_name} thinks you are good enough to join us.\n\nUse this code: ${recentCode.code}\n\nYou'll need this code along with one other from a different talent to complete your registration.\n\nVisit our app to get started!`
            });
          }
        }
      }
    } catch (error) {
      console.error('Error fetching codes:', error);
    }
  };

  useEffect(() => {
    fetchMyCodes();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchMyCodes();
    setRefreshing(false);
  };

  const handleGenerateCode = async () => {
    setLoading(true);
    try {
      const response = await api.post('/talent/generate-code');
      setGeneratedCode(response.data);
      setCanGenerateCode(false);
      setNextCodeAvailable('7 day(s)');
      fetchMyCodes();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to generate code');
    } finally {
      setLoading(false);
    }
  };

  const handleShareViaEmail = () => {
    if (!generatedCode) return;
    
    const subject = encodeURIComponent(generatedCode.email_subject);
    const body = encodeURIComponent(generatedCode.email_body);
    const mailtoUrl = `mailto:?subject=${subject}&body=${body}`;
    
    Linking.openURL(mailtoUrl).catch(() => {
      Alert.alert('Error', 'Could not open email app');
    });
  };

  const unusedCodes = myCodes.filter(c => !c.is_used);
  const usedCodes = myCodes.filter(c => c.is_used);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Refer a Friend</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Info Card */}
        <Card style={styles.infoCard}>
          <View style={styles.infoIconContainer}>
            <Ionicons name="gift" size={32} color={COLORS.primary} />
          </View>
          <Text style={styles.infoTitle}>Invite New Talent</Text>
          <Text style={styles.infoText}>
            Know someone who would be great on set? Generate a referral code and share it with them.
            New talents need codes from two different existing members to join.
          </Text>
        </Card>

        {/* Generate Code Section */}
        <Card style={styles.generateCard}>
          <Text style={styles.sectionTitle}>Generate Code</Text>
          
          {generatedCode ? (
            <View style={styles.codeDisplay}>
              <Text style={styles.codeLabel}>Your Code</Text>
              <View style={styles.codeBox}>
                <Text style={styles.codeText}>{generatedCode.code}</Text>
              </View>
              <Text style={styles.codeHint}>Share this code via email</Text>
              
              <Button
                title="Share via Email"
                onPress={handleShareViaEmail}
                fullWidth
                style={styles.shareButton}
                icon={<Ionicons name="mail" size={20} color={COLORS.textLight} />}
              />
            </View>
          ) : canGenerateCode ? (
            <View>
              <Text style={styles.generateHint}>
                You can generate 1 code per week. The code is valid until someone uses it.
              </Text>
              <Button
                title="Generate Code"
                onPress={handleGenerateCode}
                loading={loading}
                fullWidth
                style={styles.generateButton}
              />
            </View>
          ) : (
            <View style={styles.waitingBox}>
              <Ionicons name="time" size={32} color={COLORS.warning} />
              <Text style={styles.waitingText}>
                You've already generated a code this week.
              </Text>
              <Text style={styles.waitingSubtext}>
                Next code available in: {nextCodeAvailable}
              </Text>
            </View>
          )}
        </Card>

        {/* Code History */}
        {myCodes.length > 0 && (
          <Card style={styles.historyCard}>
            <Text style={styles.sectionTitle}>Your Referral History</Text>
            
            {unusedCodes.length > 0 && (
              <View style={styles.historySection}>
                <Text style={styles.historyLabel}>Active Codes</Text>
                {unusedCodes.map((code) => (
                  <View key={code.id} style={styles.historyItem}>
                    <View style={[styles.statusDot, { backgroundColor: COLORS.success }]} />
                    <Text style={styles.historyCode}>{code.code}</Text>
                    <Text style={styles.historyDate}>
                      {new Date(code.created_at).toLocaleDateString()}
                    </Text>
                  </View>
                ))}
              </View>
            )}
            
            {usedCodes.length > 0 && (
              <View style={styles.historySection}>
                <Text style={styles.historyLabel}>Used Codes</Text>
                {usedCodes.map((code) => (
                  <View key={code.id} style={styles.historyItem}>
                    <View style={[styles.statusDot, { backgroundColor: COLORS.textSecondary }]} />
                    <Text style={[styles.historyCode, styles.usedCode]}>{code.code}</Text>
                    <Text style={styles.historyDate}>
                      Used {code.used_at ? new Date(code.used_at).toLocaleDateString() : ''}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </Card>
        )}

        {/* How It Works */}
        <Card style={styles.howItWorksCard}>
          <Text style={styles.sectionTitle}>How It Works</Text>
          
          <View style={styles.step}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>1</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Generate a Code</Text>
              <Text style={styles.stepText}>Create a unique 4-digit referral code (1 per week)</Text>
            </View>
          </View>
          
          <View style={styles.step}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>2</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Share with a Friend</Text>
              <Text style={styles.stepText}>Send the code via email to someone you'd recommend</Text>
            </View>
          </View>
          
          <View style={styles.step}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>3</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>They Need Two Codes</Text>
              <Text style={styles.stepText}>Your friend needs codes from 2 different talents to register</Text>
            </View>
          </View>
        </Card>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.lg,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
  },
  title: {
    fontSize: FONT_SIZES.xl,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  placeholder: {
    width: 44,
  },
  infoCard: {
    padding: SPACING.lg,
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  infoIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  infoTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  infoText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  generateCard: {
    padding: SPACING.lg,
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  generateHint: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    marginBottom: SPACING.lg,
    lineHeight: 22,
  },
  generateButton: {
    backgroundColor: COLORS.primary,
  },
  codeDisplay: {
    alignItems: 'center',
  },
  codeLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  codeBox: {
    backgroundColor: COLORS.primary + '10',
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.xl,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
  },
  codeText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: COLORS.primary,
    letterSpacing: 8,
  },
  codeHint: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
    marginBottom: SPACING.lg,
  },
  shareButton: {
    backgroundColor: COLORS.primary,
  },
  waitingBox: {
    alignItems: 'center',
    paddingVertical: SPACING.lg,
  },
  waitingText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    marginTop: SPACING.md,
    textAlign: 'center',
  },
  waitingSubtext: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.warning,
    fontWeight: '600',
    marginTop: SPACING.xs,
  },
  historyCard: {
    padding: SPACING.lg,
    marginBottom: SPACING.md,
  },
  historySection: {
    marginBottom: SPACING.md,
  },
  historyLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
    textTransform: 'uppercase',
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: SPACING.sm,
  },
  historyCode: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
  },
  usedCode: {
    color: COLORS.textSecondary,
  },
  historyDate: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  howItWorksCard: {
    padding: SPACING.lg,
  },
  step: {
    flexDirection: 'row',
    marginBottom: SPACING.md,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  stepNumberText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: 'bold',
    color: COLORS.textLight,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
  },
  stepText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
});
