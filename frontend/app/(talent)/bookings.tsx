import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../../src/components/Card';
import { LoadingScreen } from '../../src/components/LoadingScreen';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../../src/constants/theme';
import api from '../../src/api/client';
import { Job } from '../../src/types';

export default function BookingsScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      const response = await api.get('/jobs');
      setJobs(response.data);
    } catch (error) {
      console.error('Error fetching jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchJobs();
    setRefreshing(false);
  };

  const filteredJobs = filter === 'all' 
    ? jobs 
    : jobs.filter(j => j.status === filter);

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

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  if (loading) {
    return <LoadingScreen message="Loading bookings..." />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Filter Tabs */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        style={styles.filterContainer}
        contentContainerStyle={styles.filterContent}
      >
        {['all', 'availability_check', 'confirmed', 'in_progress', 'completed'].map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterTab, filter === f && styles.filterTabActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f === 'all' ? 'All' : formatStatus(f)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {filteredJobs.length > 0 ? (
          filteredJobs.map((job) => (
            <Card key={job.id} style={styles.jobCard}>
              <View style={styles.jobHeader}>
                <View style={styles.jobTitleContainer}>
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
              </View>

              <Text style={styles.productionName}>{job.production_name}</Text>

              {job.description && (
                <Text style={styles.description} numberOfLines={2}>{job.description}</Text>
              )}

              <View style={styles.detailsContainer}>
                <View style={styles.detailRow}>
                  <Ionicons name="calendar-outline" size={16} color={COLORS.textSecondary} />
                  <Text style={styles.detailText}>
                    {job.dates_required.length > 0 
                      ? job.dates_required.map(d => formatDate(d)).join(', ')
                      : 'Dates TBC'}
                  </Text>
                </View>

                {job.location && (
                  <View style={styles.detailRow}>
                    <Ionicons name="location-outline" size={16} color={COLORS.textSecondary} />
                    <Text style={styles.detailText}>{job.location}</Text>
                  </View>
                )}

                {job.call_time && (
                  <View style={styles.detailRow}>
                    <Ionicons name="time-outline" size={16} color={COLORS.textSecondary} />
                    <Text style={styles.detailText}>Call: {job.call_time}</Text>
                  </View>
                )}

                <View style={styles.detailRow}>
                  <Ionicons name="document-text-outline" size={16} color={COLORS.textSecondary} />
                  <Text style={styles.detailText}>
                    {job.rate_agreement.replace('_', '/').toUpperCase()}
                  </Text>
                </View>
              </View>

              {job.status === 'availability_check' && (
                <View style={styles.actionContainer}>
                  <TouchableOpacity style={[styles.actionButton, styles.declineButton]}>
                    <Text style={styles.declineText}>Not Available</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.actionButton, styles.acceptButton]}>
                    <Text style={styles.acceptText}>Available</Text>
                  </TouchableOpacity>
                </View>
              )}
            </Card>
          ))
        ) : (
          <Card style={styles.emptyCard}>
            <Ionicons name="briefcase-outline" size={48} color={COLORS.textSecondary} />
            <Text style={styles.emptyTitle}>No Bookings</Text>
            <Text style={styles.emptyText}>
              {filter === 'all' 
                ? "You don't have any bookings yet"
                : `No ${formatStatus(filter).toLowerCase()} bookings`}
            </Text>
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  filterContainer: {
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  filterContent: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  filterTab: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.round,
    marginRight: SPACING.sm,
    backgroundColor: COLORS.background,
  },
  filterTabActive: {
    backgroundColor: COLORS.primary,
  },
  filterText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  filterTextActive: {
    color: COLORS.textLight,
    fontWeight: '600',
  },
  content: {
    padding: SPACING.md,
  },
  jobCard: {
    marginBottom: SPACING.md,
    padding: SPACING.md,
  },
  jobHeader: {
    marginBottom: SPACING.sm,
  },
  jobTitleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  jobTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
    marginRight: SPACING.sm,
  },
  statusBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.round,
  },
  statusText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
  },
  productionName: {
    fontSize: FONT_SIZES.md,
    color: COLORS.primary,
    fontWeight: '500',
    marginBottom: SPACING.sm,
  },
  description: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
    lineHeight: 20,
  },
  detailsContainer: {
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.sm,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  detailText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginLeft: SPACING.sm,
  },
  actionContainer: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  actionButton: {
    flex: 1,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
  },
  declineButton: {
    backgroundColor: COLORS.error + '15',
  },
  acceptButton: {
    backgroundColor: COLORS.success + '15',
  },
  declineText: {
    color: COLORS.error,
    fontWeight: '600',
  },
  acceptText: {
    color: COLORS.success,
    fontWeight: '600',
  },
  emptyCard: {
    alignItems: 'center',
    padding: SPACING.xxl,
  },
  emptyTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: SPACING.md,
  },
  emptyText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.sm,
  },
});
