import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/authStore';
import { Card } from '../../src/components/Card';
import { LoadingScreen } from '../../src/components/LoadingScreen';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../../src/constants/theme';
import api from '../../src/api/client';
import { Job } from '../../src/types';

interface DashboardStats {
  total_talents: number;
  total_productions: number;
  active_jobs: number;
  pending_payments: number;
  disputed_payments: number;
  unread_messages: number;
  recent_jobs: Job[];
}

export default function AdminDashboard() {
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<DashboardStats | null>(null);

  const fetchStats = async () => {
    try {
      const response = await api.get('/admin/dashboard');
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchStats();
    setRefreshing(false);
  };

  const seedRates = async () => {
    try {
      await api.post('/seed/rates');
      alert('Rates seeded successfully!');
    } catch (error) {
      console.error('Error seeding rates:', error);
    }
  };

  if (loading) {
    return <LoadingScreen message="Loading dashboard..." />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Back Office</Text>
            <Text style={styles.userName}>Welcome, {user?.first_name}</Text>
          </View>
          <TouchableOpacity onPress={logout} style={styles.logoutButton}>
            <Ionicons name="log-out-outline" size={24} color={COLORS.secondary} />
          </TouchableOpacity>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <Card style={styles.statCard}>
            <Ionicons name="people" size={28} color={COLORS.primary} />
            <Text style={styles.statNumber}>{stats?.total_talents || 0}</Text>
            <Text style={styles.statLabel}>Talents</Text>
          </Card>
          <Card style={styles.statCard}>
            <Ionicons name="business" size={28} color={COLORS.info} />
            <Text style={styles.statNumber}>{stats?.total_productions || 0}</Text>
            <Text style={styles.statLabel}>Productions</Text>
          </Card>
          <Card style={styles.statCard}>
            <Ionicons name="briefcase" size={28} color={COLORS.success} />
            <Text style={styles.statNumber}>{stats?.active_jobs || 0}</Text>
            <Text style={styles.statLabel}>Active Jobs</Text>
          </Card>
          <Card style={styles.statCard}>
            <Ionicons name="cash" size={28} color={COLORS.warning} />
            <Text style={styles.statNumber}>{stats?.pending_payments || 0}</Text>
            <Text style={styles.statLabel}>Pending Pay</Text>
          </Card>
        </View>

        {/* Alerts */}
        {(stats?.disputed_payments || 0) > 0 && (
          <TouchableOpacity onPress={() => router.push('/(admin)/payments')}>
            <Card style={styles.alertCard}>
              <Ionicons name="alert-circle" size={24} color={COLORS.error} />
              <View style={styles.alertContent}>
                <Text style={styles.alertTitle}>{stats?.disputed_payments} Disputed Payments</Text>
                <Text style={styles.alertSubtitle}>Require immediate attention</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
            </Card>
          </TouchableOpacity>
        )}

        {(stats?.unread_messages || 0) > 0 && (
          <TouchableOpacity onPress={() => router.push('/(admin)/messages')}>
            <Card style={styles.messageCard}>
              <Ionicons name="mail-unread" size={24} color={COLORS.info} />
              <View style={styles.alertContent}>
                <Text style={styles.alertTitle}>{stats?.unread_messages} Unread Messages</Text>
                <Text style={styles.alertSubtitle}>From talents and productions</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
            </Card>
          </TouchableOpacity>
        )}

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/(admin)/jobs')}>
            <Ionicons name="add-circle" size={32} color={COLORS.primary} />
            <Text style={styles.actionText}>Manage Jobs</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/(admin)/payments')}>
            <Ionicons name="card" size={32} color={COLORS.success} />
            <Text style={styles.actionText}>Process Payments</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionCard} onPress={seedRates}>
            <Ionicons name="pricetag" size={32} color={COLORS.secondary} />
            <Text style={styles.actionText}>Seed Rates</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Jobs */}
        <Text style={styles.sectionTitle}>Recent Jobs</Text>
        {stats?.recent_jobs && stats.recent_jobs.length > 0 ? (
          stats.recent_jobs.map((job) => (
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
              <Text style={styles.jobMeta}>
                {job.selected_talents.length} talents • {job.rate_agreement.replace('_', '/').toUpperCase()}
              </Text>
            </Card>
          ))
        ) : (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyText}>No recent jobs</Text>
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'confirmed': return COLORS.success;
    case 'availability_check': return COLORS.warning;
    case 'in_progress': return COLORS.info;
    case 'completed': return COLORS.primary;
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
    fontSize: FONT_SIZES.sm,
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
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  statCard: {
    width: '48%',
    alignItems: 'center',
    padding: SPACING.md,
  },
  statNumber: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: SPACING.sm,
  },
  statLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    backgroundColor: COLORS.error + '10',
    borderLeftWidth: 4,
    borderLeftColor: COLORS.error,
  },
  messageCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    backgroundColor: COLORS.info + '10',
    borderLeftWidth: 4,
    borderLeftColor: COLORS.info,
  },
  alertContent: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  alertTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
  },
  alertSubtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  actionCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    alignItems: 'center',
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  actionText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    marginTop: SPACING.sm,
    textAlign: 'center',
  },
  jobCard: {
    marginBottom: SPACING.sm,
    padding: SPACING.md,
  },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    color: COLORS.primary,
    marginTop: SPACING.xs,
  },
  jobMeta: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  emptyCard: {
    padding: SPACING.lg,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
  },
});
