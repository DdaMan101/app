import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';
import { Card } from '../../src/components/Card';
import { Button } from '../../src/components/Button';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../../src/constants/theme';
import api from '../../src/api/client';
import { Job, Payment } from '../../src/types';

export default function TalentDashboard() {
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [unreadMessages, setUnreadMessages] = useState(0);

  const fetchData = async () => {
    try {
      const [jobsRes, paymentsRes, messagesRes] = await Promise.all([
        api.get('/jobs'),
        api.get('/payments'),
        api.get('/messages/unread/count'),
      ]);
      setJobs(jobsRes.data.slice(0, 3));
      setPayments(paymentsRes.data.slice(0, 3));
      setUnreadMessages(messagesRes.data.unread_count);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const pendingJobs = jobs.filter(j => ['availability_check', 'confirmed'].includes(j.status));
  const pendingPayments = payments.filter(p => p.status === 'pending');

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hello,</Text>
            <Text style={styles.userName}>{user?.first_name} {user?.last_name}</Text>
          </View>
          <TouchableOpacity onPress={logout} style={styles.logoutButton}>
            <Ionicons name="log-out-outline" size={24} color={COLORS.secondary} />
          </TouchableOpacity>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsRow}>
          <Card style={styles.statCard}>
            <Ionicons name="briefcase" size={24} color={COLORS.primary} />
            <Text style={styles.statNumber}>{pendingJobs.length}</Text>
            <Text style={styles.statLabel}>Pending Jobs</Text>
          </Card>
          <Card style={styles.statCard}>
            <Ionicons name="cash" size={24} color={COLORS.success} />
            <Text style={styles.statNumber}>{pendingPayments.length}</Text>
            <Text style={styles.statLabel}>Pending Pay</Text>
          </Card>
          <Card style={styles.statCard}>
            <Ionicons name="mail" size={24} color={COLORS.info} />
            <Text style={styles.statNumber}>{unreadMessages}</Text>
            <Text style={styles.statLabel}>Messages</Text>
          </Card>
        </View>

        {/* Recent Bookings */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Bookings</Text>
            <TouchableOpacity onPress={() => router.push('/(talent)/bookings')}>
              <Text style={styles.seeAll}>See All</Text>
            </TouchableOpacity>
          </View>

          {jobs.length > 0 ? (
            jobs.map((job) => (
              <Card key={job.id} style={styles.jobCard}>
                <View style={styles.jobHeader}>
                  <Text style={styles.jobTitle}>{job.project_title}</Text>
                  <View style={[
                    styles.statusBadge,
                    { backgroundColor: getStatusColor(job.status) + '20' }
                  ]}>
                    <Text style={[styles.statusText, { color: getStatusColor(job.status) }]}>
                      {formatStatus(job.status)}
                    </Text>
                  </View>
                </View>
                <Text style={styles.jobProduction}>{job.production_name}</Text>
                <View style={styles.jobDetails}>
                  <Ionicons name="calendar-outline" size={14} color={COLORS.textSecondary} />
                  <Text style={styles.jobDate}>
                    {job.dates_required.length > 0 ? job.dates_required[0] : 'TBC'}
                  </Text>
                  <Ionicons name="location-outline" size={14} color={COLORS.textSecondary} style={{ marginLeft: 12 }} />
                  <Text style={styles.jobDate}>{job.location || 'TBC'}</Text>
                </View>
              </Card>
            ))
          ) : (
            <Card style={styles.emptyCard}>
              <Ionicons name="briefcase-outline" size={40} color={COLORS.textSecondary} />
              <Text style={styles.emptyText}>No bookings yet</Text>
            </Card>
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/(talent)/profile')}>
              <View style={[styles.actionIcon, { backgroundColor: COLORS.primary + '15' }]}>
                <Ionicons name="person" size={24} color={COLORS.primary} />
              </View>
              <Text style={styles.actionText}>Edit Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/(talent)/calendar')}>
              <View style={[styles.actionIcon, { backgroundColor: COLORS.secondary + '15' }]}>
                <Ionicons name="calendar" size={24} color={COLORS.secondary} />
              </View>
              <Text style={styles.actionText}>Availability</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/(talent)/payments')}>
              <View style={[styles.actionIcon, { backgroundColor: COLORS.success + '15' }]}>
                <Ionicons name="wallet" size={24} color={COLORS.success} />
              </View>
              <Text style={styles.actionText}>Payments</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/(talent)/refer')}>
              <View style={[styles.actionIcon, { backgroundColor: COLORS.info + '15' }]}>
                <Ionicons name="gift" size={24} color={COLORS.info} />
              </View>
              <Text style={styles.actionText}>Refer a Friend</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'confirmed': return COLORS.success;
    case 'availability_check': return COLORS.warning;
    case 'completed': return COLORS.info;
    case 'cancelled': return COLORS.error;
    default: return COLORS.textSecondary;
  }
};

const formatStatus = (status: string) => {
  return status.split('_').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
};

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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  greeting: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
  },
  userName: {
    fontSize: FONT_SIZES.title,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  logoutButton: {
    padding: SPACING.sm,
  },
  statsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: SPACING.md,
  },
  statNumber: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: SPACING.xs,
  },
  statLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  section: {
    marginBottom: SPACING.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.text,
  },
  seeAll: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.primary,
    fontWeight: '500',
  },
  jobCard: {
    marginBottom: SPACING.sm,
    padding: SPACING.md,
  },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  jobTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.round,
  },
  statusText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
  },
  jobProduction: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  jobDetails: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  jobDate: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginLeft: 4,
  },
  emptyCard: {
    alignItems: 'center',
    padding: SPACING.xl,
  },
  emptyText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.md,
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
  },
  actionIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  actionText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    fontWeight: '500',
  },
});
