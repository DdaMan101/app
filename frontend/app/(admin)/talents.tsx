import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Image,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../../src/components/Card';
import { Button } from '../../src/components/Button';
import { LoadingScreen } from '../../src/components/LoadingScreen';
import { StarRating } from '../../src/components/StarRating';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../../src/constants/theme';
import api from '../../src/api/client';
import { TalentProfile } from '../../src/types';

export default function TalentsScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [talents, setTalents] = useState<TalentProfile[]>([]);
  const [selectedTalent, setSelectedTalent] = useState<TalentProfile | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const fetchTalents = async () => {
    try {
      const response = await api.get('/talents');
      setTalents(response.data);
    } catch (error) {
      console.error('Error fetching talents:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTalents();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchTalents();
    setRefreshing(false);
  };

  const handleUpdateRating = async (talentId: string, rating: number) => {
    try {
      await api.put(`/admin/talent/${talentId}/rating?rating=${rating}`);
      // Update local state
      setTalents(talents.map(t => 
        t.user_id === talentId ? { ...t, star_rating: rating } : t
      ));
      if (selectedTalent?.user_id === talentId) {
        setSelectedTalent({ ...selectedTalent, star_rating: rating });
      }
      Alert.alert('Success', `Rating updated to ${rating} stars`);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to update rating');
    }
  };

  const handleToggleCaptain = async (talentId: string, currentStatus: boolean) => {
    try {
      const newStatus = !currentStatus;
      await api.put(`/admin/talent/${talentId}/captain?is_captain=${newStatus}`);
      // Update local state
      setTalents(talents.map(t => 
        t.user_id === talentId ? { ...t, is_captain: newStatus } : t
      ));
      if (selectedTalent?.user_id === talentId) {
        setSelectedTalent({ ...selectedTalent, is_captain: newStatus });
      }
      Alert.alert('Success', `Captain status updated to ${newStatus ? 'Yes' : 'No'}`);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to update captain status');
    }
  };

  const openTalentModal = (talent: TalentProfile) => {
    setSelectedTalent(talent);
    setModalVisible(true);
  };

  if (loading) {
    return <LoadingScreen message="Loading talents..." />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Text style={styles.title}>Manage Talents</Text>
        <Text style={styles.subtitle}>{talents.length} talents registered</Text>

        {talents.map((talent) => (
          <TouchableOpacity key={talent.id} onPress={() => openTalentModal(talent)}>
            <Card style={styles.talentCard}>
              <View style={styles.talentRow}>
                {/* Photo */}
                <View style={styles.photoContainer}>
                  {talent.headshot_base64 ? (
                    <Image source={{ uri: talent.headshot_base64 }} style={styles.photo} />
                  ) : (
                    <View style={styles.photoPlaceholder}>
                      <Ionicons name="person" size={24} color={COLORS.textSecondary} />
                    </View>
                  )}
                </View>

                {/* Info */}
                <View style={styles.talentInfo}>
                  <View style={styles.nameRow}>
                    <Text style={styles.talentName}>
                      {talent.user_first_name} {talent.user_last_name}
                    </Text>
                    {talent.is_captain && (
                      <View style={styles.captainBadge}>
                        <Ionicons name="star" size={12} color="#FFD700" />
                        <Text style={styles.captainText}>Captain</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.talentEmail}>{talent.user_email}</Text>
                  <StarRating rating={talent.star_rating || 3} size={16} />
                </View>

                <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
              </View>

              {/* Referrers */}
              {(talent.referrer_1_name || talent.referrer_2_name) && (
                <View style={styles.referrersRow}>
                  <Ionicons name="people" size={14} color={COLORS.textSecondary} />
                  <Text style={styles.referrersText}>
                    Referred by: {[talent.referrer_1_name, talent.referrer_2_name].filter(Boolean).join(' & ')}
                  </Text>
                </View>
              )}
            </Card>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Talent Detail Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setModalVisible(false)}
            >
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>

            {selectedTalent && (
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View style={styles.modalHeader}>
                  {selectedTalent.headshot_base64 ? (
                    <Image source={{ uri: selectedTalent.headshot_base64 }} style={styles.modalPhoto} />
                  ) : (
                    <View style={[styles.photoPlaceholder, styles.modalPhotoPlaceholder]}>
                      <Ionicons name="person" size={40} color={COLORS.textSecondary} />
                    </View>
                  )}
                  <Text style={styles.modalName}>
                    {selectedTalent.user_first_name} {selectedTalent.user_last_name}
                  </Text>
                  <Text style={styles.modalEmail}>{selectedTalent.user_email}</Text>
                </View>

                {/* Star Rating Control */}
                <View style={styles.controlSection}>
                  <Text style={styles.controlLabel}>Star Rating</Text>
                  <StarRating
                    rating={selectedTalent.star_rating || 3}
                    size={32}
                    editable={true}
                    onRatingChange={(rating) => handleUpdateRating(selectedTalent.user_id, rating)}
                  />
                </View>

                {/* Captain Control */}
                <View style={styles.controlSection}>
                  <Text style={styles.controlLabel}>Captain Status</Text>
                  <View style={styles.captainControl}>
                    <TouchableOpacity
                      style={[
                        styles.captainOption,
                        selectedTalent.is_captain && styles.captainOptionSelected,
                      ]}
                      onPress={() => handleToggleCaptain(selectedTalent.user_id, selectedTalent.is_captain || false)}
                    >
                      <Ionicons 
                        name={selectedTalent.is_captain ? "checkmark-circle" : "ellipse-outline"} 
                        size={24} 
                        color={selectedTalent.is_captain ? COLORS.success : COLORS.textSecondary} 
                      />
                      <Text style={[
                        styles.captainOptionText,
                        selectedTalent.is_captain && styles.captainOptionTextSelected
                      ]}>
                        {selectedTalent.is_captain ? 'Yes - Is Captain' : 'No - Not Captain'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.captainHint}>
                    Tap to toggle captain status
                  </Text>
                </View>

                {/* Referrer Info */}
                {(selectedTalent.referrer_1_name || selectedTalent.referrer_2_name) && (
                  <View style={styles.controlSection}>
                    <Text style={styles.controlLabel}>Referred By</Text>
                    <View style={styles.referrerBoxes}>
                      {selectedTalent.referrer_1_name && (
                        <View style={styles.referrerBox}>
                          <Ionicons name="person-circle" size={20} color={COLORS.primary} />
                          <Text style={styles.referrerName}>{selectedTalent.referrer_1_name}</Text>
                        </View>
                      )}
                      {selectedTalent.referrer_2_name && (
                        <View style={styles.referrerBox}>
                          <Ionicons name="person-circle" size={20} color={COLORS.primary} />
                          <Text style={styles.referrerName}>{selectedTalent.referrer_2_name}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                )}

                {/* Stats Summary */}
                <View style={styles.controlSection}>
                  <Text style={styles.controlLabel}>Profile Info</Text>
                  <View style={styles.statsGrid}>
                    <View style={styles.statItem}>
                      <Text style={styles.statValue}>
                        {selectedTalent.physical_stats?.height_cm || '-'} cm
                      </Text>
                      <Text style={styles.statLabel}>Height</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={styles.statValue}>
                        {selectedTalent.appearance?.gender || '-'}
                      </Text>
                      <Text style={styles.statLabel}>Gender</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={styles.statValue}>
                        {selectedTalent.skills?.length || 0}
                      </Text>
                      <Text style={styles.statLabel}>Skills</Text>
                    </View>
                  </View>
                </View>

                <Button
                  title="Close"
                  onPress={() => setModalVisible(false)}
                  fullWidth
                  style={styles.closeModalButton}
                />
              </ScrollView>
            )}
          </View>
        </View>
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
  title: {
    fontSize: FONT_SIZES.title,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  subtitle: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    marginBottom: SPACING.lg,
  },
  talentCard: {
    marginBottom: SPACING.sm,
    padding: SPACING.md,
  },
  talentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  photoContainer: {
    marginRight: SPACING.md,
  },
  photo: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  photoPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  talentInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  talentName: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
    marginRight: SPACING.sm,
  },
  captainBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFD70020',
    paddingVertical: 2,
    paddingHorizontal: SPACING.sm,
    borderRadius: BORDER_RADIUS.round,
  },
  captainText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
    color: '#B8860B',
    marginLeft: 2,
  },
  talentEmail: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginVertical: 2,
  },
  referrersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  referrersText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginLeft: SPACING.xs,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    maxHeight: '90%',
  },
  closeButton: {
    position: 'absolute',
    right: SPACING.md,
    top: SPACING.md,
    zIndex: 1,
    padding: SPACING.sm,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
    paddingTop: SPACING.md,
  },
  modalPhoto: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: SPACING.md,
  },
  modalPhotoPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: SPACING.md,
  },
  modalName: {
    fontSize: FONT_SIZES.xl,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  modalEmail: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
  },
  controlSection: {
    marginBottom: SPACING.lg,
  },
  controlLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
    textTransform: 'uppercase',
  },
  captainControl: {
    marginTop: SPACING.xs,
  },
  captainOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  captainOptionSelected: {
    backgroundColor: COLORS.success + '10',
    borderColor: COLORS.success,
  },
  captainOptionText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    marginLeft: SPACING.sm,
  },
  captainOptionTextSelected: {
    color: COLORS.success,
    fontWeight: '600',
  },
  captainHint: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
    fontStyle: 'italic',
  },
  referrerBoxes: {
    flexDirection: 'row',
    gap: SPACING.sm,
    flexWrap: 'wrap',
  },
  referrerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary + '10',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.primary + '30',
  },
  referrerName: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
    color: COLORS.primary,
    marginLeft: SPACING.xs,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.text,
  },
  statLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  closeModalButton: {
    marginTop: SPACING.md,
    marginBottom: SPACING.lg,
  },
});
