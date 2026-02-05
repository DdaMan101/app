import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../../src/components/Card';
import { Button } from '../../src/components/Button';
import { Input } from '../../src/components/Input';
import { LoadingScreen } from '../../src/components/LoadingScreen';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../../src/constants/theme';
import api from '../../src/api/client';
import { Job, RateAgreement } from '../../src/types';

const RATE_OPTIONS: { value: RateAgreement; label: string }[] = [
  { value: 'faa_pact', label: 'FAA/PACT' },
  { value: 'bbc_equity', label: 'BBC Equity' },
  { value: 'itv_equity', label: 'ITV Equity' },
  { value: 'pact_equity_outside', label: 'PACT/Equity (Outside London)' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'corporate', label: 'Corporate' },
];

export default function JobsScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [productionName, setProductionName] = useState('');
  const [projectTitle, setProjectTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [rateAgreement, setRateAgreement] = useState<RateAgreement>('faa_pact');
  const [datesRequired, setDatesRequired] = useState('');
  const [callTime, setCallTime] = useState('');
  const [notes, setNotes] = useState('');

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

  const resetForm = () => {
    setProductionName('');
    setProjectTitle('');
    setDescription('');
    setLocation('');
    setRateAgreement('faa_pact');
    setDatesRequired('');
    setCallTime('');
    setNotes('');
  };

  const handleCreateJob = async () => {
    if (!productionName || !projectTitle) {
      Alert.alert('Error', 'Please fill in production name and project title');
      return;
    }

    setSaving(true);
    try {
      const dates = datesRequired
        .split(',')
        .map(d => d.trim())
        .filter(Boolean);

      await api.post('/jobs', {
        production_name: productionName,
        project_title: projectTitle,
        description: description || null,
        location: location || null,
        rate_agreement: rateAgreement,
        dates_required: dates,
        call_time: callTime || null,
        notes: notes || null,
      });

      Alert.alert('Success', 'Job created successfully');
      setShowCreateModal(false);
      resetForm();
      fetchJobs();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to create job');
    } finally {
      setSaving(false);
    }
  };

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

  if (loading) {
    return <LoadingScreen message="Loading jobs..." />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>My Jobs</Text>
          <Button
            title="+ New Job"
            onPress={() => setShowCreateModal(true)}
            size="small"
          />
        </View>

        {/* Jobs List */}
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

              <Text style={styles.productionName}>{job.production_name}</Text>

              <View style={styles.jobDetails}>
                <View style={styles.detailRow}>
                  <Ionicons name="document-text-outline" size={16} color={COLORS.textSecondary} />
                  <Text style={styles.detailText}>
                    {RATE_OPTIONS.find(r => r.value === job.rate_agreement)?.label || job.rate_agreement}
                  </Text>
                </View>
                {job.location && (
                  <View style={styles.detailRow}>
                    <Ionicons name="location-outline" size={16} color={COLORS.textSecondary} />
                    <Text style={styles.detailText}>{job.location}</Text>
                  </View>
                )}
                <View style={styles.detailRow}>
                  <Ionicons name="people-outline" size={16} color={COLORS.textSecondary} />
                  <Text style={styles.detailText}>
                    {job.selected_talents.length} talents selected
                  </Text>
                </View>
              </View>

              <View style={styles.jobActions}>
                <TouchableOpacity style={styles.jobAction}>
                  <Text style={styles.jobActionText}>View Details</Text>
                </TouchableOpacity>
              </View>
            </Card>
          ))
        ) : (
          <Card style={styles.emptyCard}>
            <Ionicons name="briefcase-outline" size={60} color={COLORS.textSecondary} />
            <Text style={styles.emptyTitle}>No Jobs Yet</Text>
            <Text style={styles.emptyText}>
              Create a new job to start selecting talents for your production
            </Text>
            <Button
              title="Create First Job"
              onPress={() => setShowCreateModal(true)}
              style={styles.createButton}
            />
          </Card>
        )}
      </ScrollView>

      {/* Create Job Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Create New Job</Text>
            <TouchableOpacity onPress={() => setShowCreateModal(false)}>
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <Input
              label="Production Name *"
              placeholder="e.g., BBC Productions"
              value={productionName}
              onChangeText={setProductionName}
            />

            <Input
              label="Project Title *"
              placeholder="e.g., Eastenders Episode 1234"
              value={projectTitle}
              onChangeText={setProjectTitle}
            />

            <Input
              label="Description"
              placeholder="Brief description of the job..."
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
            />

            <Input
              label="Location"
              placeholder="e.g., Elstree Studios"
              value={location}
              onChangeText={setLocation}
            />

            <Text style={styles.fieldLabel}>Rate Agreement *</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.rateScroll}
            >
              {RATE_OPTIONS.map((rate) => (
                <TouchableOpacity
                  key={rate.value}
                  style={[
                    styles.rateChip,
                    rateAgreement === rate.value && styles.rateChipSelected,
                  ]}
                  onPress={() => setRateAgreement(rate.value)}
                >
                  <Text style={[
                    styles.rateChipText,
                    rateAgreement === rate.value && styles.rateChipTextSelected,
                  ]}>
                    {rate.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Input
              label="Dates Required (comma separated)"
              placeholder="2024-01-15, 2024-01-16"
              value={datesRequired}
              onChangeText={setDatesRequired}
            />

            <Input
              label="Call Time"
              placeholder="e.g., 07:00"
              value={callTime}
              onChangeText={setCallTime}
            />

            <Input
              label="Notes"
              placeholder="Any additional notes..."
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
            />

            <Button
              title="Create Job"
              onPress={handleCreateJob}
              loading={saving}
              fullWidth
              style={styles.submitButton}
            />
          </ScrollView>
        </SafeAreaView>
      </Modal>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  title: {
    fontSize: FONT_SIZES.xl,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  jobCard: {
    marginBottom: SPACING.md,
    padding: SPACING.md,
  },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.xs,
  },
  jobTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
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
    marginBottom: SPACING.sm,
  },
  jobDetails: {
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
  jobActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: SPACING.md,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  jobAction: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
  },
  jobActionText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.primary,
    fontWeight: '500',
  },
  emptyCard: {
    alignItems: 'center',
    padding: SPACING.xxl,
  },
  emptyTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: SPACING.md,
  },
  emptyText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.sm,
    lineHeight: 22,
  },
  createButton: {
    marginTop: SPACING.lg,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.text,
  },
  modalContent: {
    flex: 1,
    padding: SPACING.md,
  },
  fieldLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
    color: COLORS.text,
    marginBottom: SPACING.sm,
    marginTop: SPACING.sm,
  },
  rateScroll: {
    marginBottom: SPACING.md,
  },
  rateChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.round,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: SPACING.sm,
    backgroundColor: COLORS.surface,
  },
  rateChipSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  rateChipText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
  },
  rateChipTextSelected: {
    color: COLORS.textLight,
    fontWeight: '600',
  },
  submitButton: {
    marginTop: SPACING.lg,
    marginBottom: SPACING.xxl,
  },
});
