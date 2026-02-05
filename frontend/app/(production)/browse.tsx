import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Animated,
  PanResponder,
  Image,
  TouchableOpacity,
  Modal,
  ScrollView,
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
import { TalentProfile } from '../../src/types';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25;

export default function BrowseTalentScreen() {
  const [loading, setLoading] = useState(true);
  const [talents, setTalents] = useState<TalentProfile[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedTalents, setSelectedTalents] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [showDetail, setShowDetail] = useState(false);

  // Filters
  const [filterGender, setFilterGender] = useState<string | null>(null);
  const [filterMinHeight, setFilterMinHeight] = useState('');
  const [filterMaxHeight, setFilterMaxHeight] = useState('');
  const [filterHairColor, setFilterHairColor] = useState('');

  const position = useRef(new Animated.ValueXY()).current;
  const rotate = position.x.interpolate({
    inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
    outputRange: ['-10deg', '0deg', '10deg'],
    extrapolate: 'clamp',
  });

  const likeOpacity = position.x.interpolate({
    inputRange: [0, SCREEN_WIDTH / 4],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const nopeOpacity = position.x.interpolate({
    inputRange: [-SCREEN_WIDTH / 4, 0],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const nextCardScale = position.x.interpolate({
    inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
    outputRange: [1, 0.9, 1],
    extrapolate: 'clamp',
  });

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gesture) => {
        position.setValue({ x: gesture.dx, y: gesture.dy });
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dx > SWIPE_THRESHOLD) {
          swipeRight();
        } else if (gesture.dx < -SWIPE_THRESHOLD) {
          swipeLeft();
        } else {
          resetPosition();
        }
      },
    })
  ).current;

  useEffect(() => {
    fetchTalents();
  }, []);

  const fetchTalents = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterGender) params.append('gender', filterGender);
      if (filterMinHeight) params.append('min_height', filterMinHeight);
      if (filterMaxHeight) params.append('max_height', filterMaxHeight);
      if (filterHairColor) params.append('hair_color', filterHairColor);

      const response = await api.get(`/talents?${params.toString()}`);
      setTalents(response.data);
      setCurrentIndex(0);
    } catch (error) {
      console.error('Error fetching talents:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetPosition = () => {
    Animated.spring(position, {
      toValue: { x: 0, y: 0 },
      useNativeDriver: true,
    }).start();
  };

  const swipeRight = () => {
    const talent = talents[currentIndex];
    if (talent) {
      setSelectedTalents([...selectedTalents, talent.user_id]);
    }
    Animated.timing(position, {
      toValue: { x: SCREEN_WIDTH + 100, y: 0 },
      duration: 300,
      useNativeDriver: true,
    }).start(() => nextCard());
  };

  const swipeLeft = () => {
    Animated.timing(position, {
      toValue: { x: -SCREEN_WIDTH - 100, y: 0 },
      duration: 300,
      useNativeDriver: true,
    }).start(() => nextCard());
  };

  const nextCard = () => {
    setCurrentIndex((prev) => prev + 1);
    position.setValue({ x: 0, y: 0 });
  };

  const applyFilters = () => {
    setShowFilters(false);
    fetchTalents();
  };

  const clearFilters = () => {
    setFilterGender(null);
    setFilterMinHeight('');
    setFilterMaxHeight('');
    setFilterHairColor('');
    setShowFilters(false);
    fetchTalents();
  };

  const currentTalent = talents[currentIndex];
  const nextTalent = talents[currentIndex + 1];

  if (loading) {
    return <LoadingScreen message="Loading talents..." />;
  }

  const renderCard = (talent: TalentProfile, isTop: boolean = false) => {
    const cardStyle = isTop
      ? {
          transform: [
            { translateX: position.x },
            { translateY: position.y },
            { rotate },
          ],
        }
      : {
          transform: [{ scale: nextCardScale }],
        };

    return (
      <Animated.View
        key={talent.id}
        style={[styles.card, cardStyle]}
        {...(isTop ? panResponder.panHandlers : {})}
      >
        {/* Like/Nope Labels */}
        {isTop && (
          <>
            <Animated.View style={[styles.labelContainer, styles.likeLabel, { opacity: likeOpacity }]}>
              <Text style={styles.labelText}>SELECT</Text>
            </Animated.View>
            <Animated.View style={[styles.labelContainer, styles.nopeLabel, { opacity: nopeOpacity }]}>
              <Text style={[styles.labelText, { color: COLORS.error }]}>PASS</Text>
            </Animated.View>
          </>
        )}

        {/* Photo */}
        <View style={styles.photoContainer}>
          {talent.headshot_base64 ? (
            <Image source={{ uri: talent.headshot_base64 }} style={styles.photo} />
          ) : (
            <View style={styles.noPhoto}>
              <Ionicons name="person" size={80} color={COLORS.textSecondary} />
            </View>
          )}
        </View>

        {/* Info */}
        <View style={styles.cardInfo}>
          <Text style={styles.talentName}>
            {talent.user_first_name} {talent.user_last_name}
          </Text>
          
          <View style={styles.statsRow}>
            {talent.physical_stats?.height_cm && (
              <View style={styles.stat}>
                <Ionicons name="resize-outline" size={16} color={COLORS.textSecondary} />
                <Text style={styles.statText}>{talent.physical_stats.height_cm}cm</Text>
              </View>
            )}
            {talent.appearance?.gender && (
              <View style={styles.stat}>
                <Ionicons name="person-outline" size={16} color={COLORS.textSecondary} />
                <Text style={styles.statText}>{talent.appearance.gender}</Text>
              </View>
            )}
            {talent.appearance?.hair_color && (
              <View style={styles.stat}>
                <Text style={styles.statText}>{talent.appearance.hair_color} Hair</Text>
              </View>
            )}
          </View>

          {talent.skills && talent.skills.length > 0 && (
            <View style={styles.skillsRow}>
              {talent.skills.slice(0, 3).map((skill, i) => (
                <View key={i} style={styles.skillChip}>
                  <Text style={styles.skillText}>{skill}</Text>
                </View>
              ))}
            </View>
          )}

          {isTop && (
            <TouchableOpacity style={styles.viewMore} onPress={() => setShowDetail(true)}>
              <Text style={styles.viewMoreText}>View Full Profile</Text>
              <Ionicons name="chevron-forward" size={16} color={COLORS.primary} />
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Header with Filter */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {selectedTalents.length} Selected
        </Text>
        <TouchableOpacity style={styles.filterButton} onPress={() => setShowFilters(true)}>
          <Ionicons name="filter" size={20} color={COLORS.primary} />
          <Text style={styles.filterButtonText}>Filter</Text>
        </TouchableOpacity>
      </View>

      {/* Cards Stack */}
      <View style={styles.cardsContainer}>
        {currentTalent ? (
          <>
            {nextTalent && renderCard(nextTalent, false)}
            {renderCard(currentTalent, true)}
          </>
        ) : (
          <Card style={styles.emptyCard}>
            <Ionicons name="people-outline" size={60} color={COLORS.textSecondary} />
            <Text style={styles.emptyTitle}>No More Talents</Text>
            <Text style={styles.emptyText}>You've viewed all available talents</Text>
            <Button
              title="Reset & Browse Again"
              onPress={() => {
                setCurrentIndex(0);
                fetchTalents();
              }}
              style={styles.resetButton}
            />
          </Card>
        )}
      </View>

      {/* Action Buttons */}
      {currentTalent && (
        <View style={styles.actions}>
          <TouchableOpacity style={[styles.actionButton, styles.passButton]} onPress={swipeLeft}>
            <Ionicons name="close" size={32} color={COLORS.error} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionButton, styles.infoButton]} onPress={() => setShowDetail(true)}>
            <Ionicons name="information" size={24} color={COLORS.info} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionButton, styles.selectButton]} onPress={swipeRight}>
            <Ionicons name="checkmark" size={32} color={COLORS.success} />
          </TouchableOpacity>
        </View>
      )}

      {/* Filter Modal */}
      <Modal
        visible={showFilters}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowFilters(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filter Talents</Text>
            <TouchableOpacity onPress={() => setShowFilters(false)}>
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={styles.filterLabel}>Gender</Text>
            <View style={styles.genderButtons}>
              {['male', 'female', 'other'].map((g) => (
                <TouchableOpacity
                  key={g}
                  style={[
                    styles.genderButton,
                    filterGender === g && styles.genderButtonSelected,
                  ]}
                  onPress={() => setFilterGender(filterGender === g ? null : g)}
                >
                  <Text style={[
                    styles.genderButtonText,
                    filterGender === g && styles.genderButtonTextSelected,
                  ]}>
                    {g.charAt(0).toUpperCase() + g.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.filterLabel}>Height Range (cm)</Text>
            <View style={styles.heightRow}>
              <Input
                placeholder="Min"
                value={filterMinHeight}
                onChangeText={setFilterMinHeight}
                keyboardType="numeric"
                style={styles.heightInput}
              />
              <Text style={styles.heightDash}>-</Text>
              <Input
                placeholder="Max"
                value={filterMaxHeight}
                onChangeText={setFilterMaxHeight}
                keyboardType="numeric"
                style={styles.heightInput}
              />
            </View>

            <Input
              label="Hair Color"
              placeholder="e.g., Brown, Blonde"
              value={filterHairColor}
              onChangeText={setFilterHairColor}
            />

            <View style={styles.filterActions}>
              <Button
                title="Clear All"
                onPress={clearFilters}
                variant="outline"
                style={styles.filterAction}
              />
              <Button
                title="Apply Filters"
                onPress={applyFilters}
                style={styles.filterAction}
              />
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Detail Modal */}
      <Modal
        visible={showDetail && currentTalent !== undefined}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowDetail(false)}
      >
        {currentTalent && (
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Talent Profile</Text>
              <TouchableOpacity onPress={() => setShowDetail(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              {/* Photos */}
              <View style={styles.detailPhotos}>
                {currentTalent.headshot_base64 ? (
                  <Image source={{ uri: currentTalent.headshot_base64 }} style={styles.detailPhoto} />
                ) : (
                  <View style={[styles.detailPhoto, styles.noDetailPhoto]}>
                    <Ionicons name="person" size={60} color={COLORS.textSecondary} />
                  </View>
                )}
              </View>

              <Text style={styles.detailName}>
                {currentTalent.user_first_name} {currentTalent.user_last_name}
              </Text>

              {/* Stats */}
              <Card style={styles.detailCard}>
                <Text style={styles.detailSectionTitle}>Physical Stats</Text>
                <View style={styles.detailStats}>
                  <View style={styles.detailStat}>
                    <Text style={styles.detailStatLabel}>Height</Text>
                    <Text style={styles.detailStatValue}>
                      {currentTalent.physical_stats?.height_cm || '-'}cm
                    </Text>
                  </View>
                  <View style={styles.detailStat}>
                    <Text style={styles.detailStatLabel}>Weight</Text>
                    <Text style={styles.detailStatValue}>
                      {currentTalent.physical_stats?.weight_kg || '-'}kg
                    </Text>
                  </View>
                  <View style={styles.detailStat}>
                    <Text style={styles.detailStatLabel}>Chest</Text>
                    <Text style={styles.detailStatValue}>
                      {currentTalent.physical_stats?.chest_cm || '-'}cm
                    </Text>
                  </View>
                  <View style={styles.detailStat}>
                    <Text style={styles.detailStatLabel}>Waist</Text>
                    <Text style={styles.detailStatValue}>
                      {currentTalent.physical_stats?.waist_cm || '-'}cm
                    </Text>
                  </View>
                  <View style={styles.detailStat}>
                    <Text style={styles.detailStatLabel}>Shoe Size</Text>
                    <Text style={styles.detailStatValue}>
                      {currentTalent.physical_stats?.shoe_size_uk || '-'}
                    </Text>
                  </View>
                </View>
              </Card>

              <Card style={styles.detailCard}>
                <Text style={styles.detailSectionTitle}>Appearance</Text>
                <View style={styles.detailStats}>
                  <View style={styles.detailStat}>
                    <Text style={styles.detailStatLabel}>Gender</Text>
                    <Text style={styles.detailStatValue}>
                      {currentTalent.appearance?.gender || '-'}
                    </Text>
                  </View>
                  <View style={styles.detailStat}>
                    <Text style={styles.detailStatLabel}>Hair</Text>
                    <Text style={styles.detailStatValue}>
                      {currentTalent.appearance?.hair_color || '-'}
                    </Text>
                  </View>
                  <View style={styles.detailStat}>
                    <Text style={styles.detailStatLabel}>Eyes</Text>
                    <Text style={styles.detailStatValue}>
                      {currentTalent.appearance?.eye_color || '-'}
                    </Text>
                  </View>
                  <View style={styles.detailStat}>
                    <Text style={styles.detailStatLabel}>Ethnicity</Text>
                    <Text style={styles.detailStatValue}>
                      {currentTalent.appearance?.ethnicity || '-'}
                    </Text>
                  </View>
                </View>
              </Card>

              {currentTalent.skills && currentTalent.skills.length > 0 && (
                <Card style={styles.detailCard}>
                  <Text style={styles.detailSectionTitle}>Skills</Text>
                  <View style={styles.detailSkills}>
                    {currentTalent.skills.map((skill, i) => (
                      <View key={i} style={styles.detailSkillChip}>
                        <Text style={styles.detailSkillText}>{skill}</Text>
                      </View>
                    ))}
                  </View>
                </Card>
              )}

              <View style={styles.detailActions}>
                <Button
                  title="Pass"
                  onPress={() => {
                    setShowDetail(false);
                    swipeLeft();
                  }}
                  variant="outline"
                  style={styles.detailAction}
                />
                <Button
                  title="Select"
                  onPress={() => {
                    setShowDetail(false);
                    swipeRight();
                  }}
                  style={styles.detailAction}
                />
              </View>
            </ScrollView>
          </SafeAreaView>
        )}
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.primary,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  filterButtonText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.primary,
  },
  cardsContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.md,
  },
  card: {
    position: 'absolute',
    width: SCREEN_WIDTH - SPACING.lg * 2,
    height: SCREEN_HEIGHT * 0.6,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
    overflow: 'hidden',
  },
  labelContainer: {
    position: 'absolute',
    top: 20,
    zIndex: 10,
    padding: SPACING.sm,
    borderWidth: 3,
    borderRadius: BORDER_RADIUS.md,
  },
  likeLabel: {
    right: 20,
    borderColor: COLORS.success,
    transform: [{ rotate: '15deg' }],
  },
  nopeLabel: {
    left: 20,
    borderColor: COLORS.error,
    transform: [{ rotate: '-15deg' }],
  },
  labelText: {
    fontSize: FONT_SIZES.xl,
    fontWeight: 'bold',
    color: COLORS.success,
  },
  photoContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  photo: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  noPhoto: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardInfo: {
    padding: SPACING.md,
  },
  talentName: {
    fontSize: FONT_SIZES.xl,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
    marginBottom: SPACING.sm,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  statText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  skillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  skillChip: {
    backgroundColor: COLORS.primary + '15',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.round,
  },
  skillText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.primary,
  },
  viewMore: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewMoreText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.primary,
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.lg,
    padding: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  actionButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  passButton: {
    borderWidth: 2,
    borderColor: COLORS.error,
  },
  infoButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: COLORS.info,
  },
  selectButton: {
    borderWidth: 2,
    borderColor: COLORS.success,
  },
  emptyCard: {
    padding: SPACING.xxl,
    alignItems: 'center',
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
    marginTop: SPACING.sm,
    textAlign: 'center',
  },
  resetButton: {
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
  filterLabel: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.sm,
    marginTop: SPACING.md,
  },
  genderButtons: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  genderButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  genderButtonSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  genderButtonText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
  },
  genderButtonTextSelected: {
    color: COLORS.textLight,
    fontWeight: '600',
  },
  heightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  heightInput: {
    flex: 1,
  },
  heightDash: {
    fontSize: FONT_SIZES.lg,
    color: COLORS.textSecondary,
  },
  filterActions: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.xl,
  },
  filterAction: {
    flex: 1,
  },
  detailPhotos: {
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  detailPhoto: {
    width: 200,
    height: 200,
    borderRadius: 100,
  },
  noDetailPhoto: {
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailName: {
    fontSize: FONT_SIZES.title,
    fontWeight: 'bold',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  detailCard: {
    marginBottom: SPACING.md,
    padding: SPACING.md,
  },
  detailSectionTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  detailStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  detailStat: {
    width: '50%',
    marginBottom: SPACING.sm,
  },
  detailStatLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
  },
  detailStatValue: {
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    fontWeight: '500',
  },
  detailSkills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  detailSkillChip: {
    backgroundColor: COLORS.primary + '15',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.round,
  },
  detailSkillText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.primary,
  },
  detailActions: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.lg,
    marginBottom: SPACING.xxl,
  },
  detailAction: {
    flex: 1,
  },
});
