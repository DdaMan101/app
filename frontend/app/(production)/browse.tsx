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
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../../src/components/Card';
import { Button } from '../../src/components/Button';
import { Input } from '../../src/components/Input';
import { LoadingScreen } from '../../src/components/LoadingScreen';
import { StarRating } from '../../src/components/StarRating';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../../src/constants/theme';
import api from '../../src/api/client';
import { TalentProfile } from '../../src/types';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25;
const THUMBNAIL_SIZE = (SCREEN_WIDTH - SPACING.md * 4) / 3;

type ViewMode = 'swipe' | 'thumbnail';

export default function BrowseTalentScreen() {
  const [loading, setLoading] = useState(true);
  const [talents, setTalents] = useState<TalentProfile[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedTalents, setSelectedTalents] = useState<Set<string>>(new Set());
  const [rejectedTalents, setRejectedTalents] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [detailTalent, setDetailTalent] = useState<TalentProfile | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('swipe');
  const [viewedAll, setViewedAll] = useState(false);
  
  // Selection counter
  const [targetCount, setTargetCount] = useState(10);
  const [showTargetModal, setShowTargetModal] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);

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

  // Check if viewed all talents
  useEffect(() => {
    if (talents.length > 0 && currentIndex >= talents.length && !viewedAll) {
      setViewedAll(true);
      setShowCompletionModal(true);
    }
  }, [currentIndex, talents.length]);

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
      setViewedAll(false);
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

  const selectTalent = (talentId: string) => {
    const newSelected = new Set(selectedTalents);
    newSelected.add(talentId);
    setSelectedTalents(newSelected);
    
    // Remove from rejected if it was there
    const newRejected = new Set(rejectedTalents);
    newRejected.delete(talentId);
    setRejectedTalents(newRejected);
  };

  const rejectTalent = (talentId: string) => {
    const newRejected = new Set(rejectedTalents);
    newRejected.add(talentId);
    setRejectedTalents(newRejected);
    
    // Remove from selected if it was there
    const newSelected = new Set(selectedTalents);
    newSelected.delete(talentId);
    setSelectedTalents(newSelected);
  };

  const swipeRight = () => {
    const talent = talents[currentIndex];
    if (talent) {
      selectTalent(talent.user_id);
    }
    Animated.timing(position, {
      toValue: { x: SCREEN_WIDTH + 100, y: 0 },
      duration: 300,
      useNativeDriver: true,
    }).start(() => nextCard());
  };

  const swipeLeft = () => {
    const talent = talents[currentIndex];
    if (talent) {
      rejectTalent(talent.user_id);
    }
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

  const resetBrowsing = () => {
    setCurrentIndex(0);
    setViewedAll(false);
    setShowCompletionModal(false);
    position.setValue({ x: 0, y: 0 });
  };

  const handleSendToAFGM = async () => {
    try {
      // Send selections to backend
      const selectedList = Array.from(selectedTalents);
      await api.post('/production/submit-selections', {
        selected_talent_ids: selectedList,
        target_count: targetCount,
      });
      
      setShowSendModal(false);
      Alert.alert(
        'Selections Sent!',
        'Your selections have been sent to A Few Good Men Casting. The admin team has been notified.',
        [{ text: 'OK', onPress: () => {
          // Reset selections after sending
          setSelectedTalents(new Set());
          setRejectedTalents(new Set());
          setCurrentIndex(0);
          setViewedAll(false);
        }}]
      );
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to send selections');
    }
  };

  const openTalentDetail = (talent: TalentProfile) => {
    setDetailTalent(talent);
    setShowDetail(true);
  };

  const currentTalent = talents[currentIndex];
  const nextTalent = talents[currentIndex + 1];

  if (loading) {
    return <LoadingScreen message="Loading talents..." />;
  }

  const renderSwipeCard = (talent: TalentProfile, isTop: boolean = false) => {
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
          
          {/* Captain & Rating Badge */}
          <View style={styles.badgesContainer}>
            {talent.is_captain && (
              <View style={styles.captainBadge}>
                <Ionicons name="star" size={14} color="#FFD700" />
                <Text style={styles.captainText}>Captain</Text>
              </View>
            )}
          </View>
        </View>

        {/* Info */}
        <View style={styles.cardInfo}>
          <View style={styles.nameRatingRow}>
            <Text style={styles.talentName}>
              {talent.user_first_name} {talent.user_last_name}
            </Text>
            <StarRating rating={talent.star_rating || 3} size={14} />
          </View>
          
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
          </View>

          {isTop && (
            <TouchableOpacity style={styles.viewMore} onPress={() => openTalentDetail(talent)}>
              <Text style={styles.viewMoreText}>View Full Profile</Text>
              <Ionicons name="chevron-forward" size={16} color={COLORS.primary} />
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>
    );
  };

  const renderThumbnailItem = ({ item: talent }: { item: TalentProfile }) => {
    const isSelected = selectedTalents.has(talent.user_id);
    const isRejected = rejectedTalents.has(talent.user_id);

    return (
      <TouchableOpacity
        style={styles.thumbnailWrapper}
        onPress={() => openTalentDetail(talent)}
      >
        <View style={[
          styles.thumbnail,
          isSelected && styles.thumbnailSelected,
          isRejected && styles.thumbnailRejected,
        ]}>
          {talent.headshot_base64 ? (
            <Image source={{ uri: talent.headshot_base64 }} style={styles.thumbnailImage} />
          ) : (
            <View style={styles.thumbnailPlaceholder}>
              <Ionicons name="person" size={30} color={COLORS.textSecondary} />
            </View>
          )}
          
          {/* Selection indicator */}
          {isSelected && (
            <View style={styles.selectionBadge}>
              <Ionicons name="checkmark-circle" size={24} color={COLORS.success} />
            </View>
          )}
          {isRejected && (
            <View style={styles.selectionBadge}>
              <Ionicons name="close-circle" size={24} color={COLORS.error} />
            </View>
          )}
          
          {/* Captain badge */}
          {talent.is_captain && (
            <View style={styles.thumbnailCaptain}>
              <Ionicons name="star" size={12} color="#FFD700" />
            </View>
          )}
        </View>
        
        <Text style={styles.thumbnailName} numberOfLines={1}>
          {talent.user_first_name}
        </Text>
        <StarRating rating={talent.star_rating || 3} size={10} />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.counterSection}>
          <TouchableOpacity style={styles.counterButton} onPress={() => setShowTargetModal(true)}>
            <Text style={styles.counterText}>
              {selectedTalents.size}/{targetCount}
            </Text>
            <Ionicons name="settings-outline" size={16} color={COLORS.primary} />
          </TouchableOpacity>
          <Text style={styles.counterLabel}>Selected</Text>
        </View>
        
        <View style={styles.headerButtons}>
          {/* View Mode Toggle */}
          <View style={styles.viewToggle}>
            <TouchableOpacity
              style={[styles.toggleButton, viewMode === 'swipe' && styles.toggleButtonActive]}
              onPress={() => setViewMode('swipe')}
            >
              <Ionicons name="layers" size={18} color={viewMode === 'swipe' ? COLORS.textLight : COLORS.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleButton, viewMode === 'thumbnail' && styles.toggleButtonActive]}
              onPress={() => setViewMode('thumbnail')}
            >
              <Ionicons name="grid" size={18} color={viewMode === 'thumbnail' ? COLORS.textLight : COLORS.textSecondary} />
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity style={styles.filterButton} onPress={() => setShowFilters(true)}>
            <Ionicons name="filter" size={20} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Swipe View */}
      {viewMode === 'swipe' && (
        <>
          <View style={styles.cardsContainer}>
            {currentTalent ? (
              <>
                {nextTalent && renderSwipeCard(nextTalent, false)}
                {renderSwipeCard(currentTalent, true)}
              </>
            ) : (
              <Card style={styles.emptyCard}>
                <Ionicons name="people-outline" size={60} color={COLORS.textSecondary} />
                <Text style={styles.emptyTitle}>No More Talents</Text>
                <Text style={styles.emptyText}>
                  You've viewed all {talents.length} talents
                </Text>
                <Text style={styles.selectionSummary}>
                  {selectedTalents.size}/{targetCount} selected
                </Text>
              </Card>
            )}
          </View>

          {/* Swipe Action Buttons */}
          {currentTalent && (
            <View style={styles.actions}>
              <TouchableOpacity style={[styles.actionButton, styles.passButton]} onPress={swipeLeft}>
                <Ionicons name="close" size={32} color={COLORS.error} />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionButton, styles.infoButton]} onPress={() => openTalentDetail(currentTalent)}>
                <Ionicons name="information" size={24} color={COLORS.info} />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionButton, styles.selectButton]} onPress={swipeRight}>
                <Ionicons name="checkmark" size={32} color={COLORS.success} />
              </TouchableOpacity>
            </View>
          )}
        </>
      )}

      {/* Thumbnail View */}
      {viewMode === 'thumbnail' && (
        <FlatList
          data={talents}
          renderItem={renderThumbnailItem}
          keyExtractor={(item) => item.id}
          numColumns={3}
          contentContainerStyle={styles.thumbnailGrid}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Send Button - visible when selections made */}
      {selectedTalents.size > 0 && (
        <TouchableOpacity
          style={styles.sendFab}
          onPress={() => setShowSendModal(true)}
        >
          <Ionicons name="send" size={24} color={COLORS.textLight} />
          <Text style={styles.sendFabText}>{selectedTalents.size}</Text>
        </TouchableOpacity>
      )}

      {/* Target Count Modal */}
      <Modal
        visible={showTargetModal}
        animationType="fade"
        transparent
        onRequestClose={() => setShowTargetModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.targetModal}>
            <Text style={styles.targetModalTitle}>How many people do you need?</Text>
            <Input
              value={targetCount.toString()}
              onChangeText={(text) => setTargetCount(parseInt(text) || 1)}
              keyboardType="numeric"
              style={styles.targetInput}
            />
            <Button
              title="Set Target"
              onPress={() => setShowTargetModal(false)}
              fullWidth
            />
          </View>
        </View>
      </Modal>

      {/* Completion Modal */}
      <Modal
        visible={showCompletionModal}
        animationType="fade"
        transparent
        onRequestClose={() => setShowCompletionModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.completionModal}>
            <Ionicons name="checkmark-done-circle" size={60} color={COLORS.success} />
            <Text style={styles.completionTitle}>That's it!</Text>
            <Text style={styles.completionText}>You have seen everyone.</Text>
            <View style={styles.completionCounter}>
              <Text style={styles.completionCounterText}>
                {selectedTalents.size}/{targetCount}
              </Text>
              <Text style={styles.completionCounterLabel}>selections</Text>
            </View>
            
            {selectedTalents.size < targetCount && (
              <Text style={styles.completionHint}>
                You need {targetCount - selectedTalents.size} more to reach your target
              </Text>
            )}
            
            <View style={styles.completionActions}>
              <Button
                title="Scroll Again"
                onPress={resetBrowsing}
                variant="outline"
                style={styles.completionAction}
              />
              <Button
                title="Send to A.F.G.M"
                onPress={() => {
                  setShowCompletionModal(false);
                  setShowSendModal(true);
                }}
                style={styles.completionAction}
                disabled={selectedTalents.size === 0}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Send Confirmation Modal */}
      <Modal
        visible={showSendModal}
        animationType="fade"
        transparent
        onRequestClose={() => setShowSendModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.sendModal}>
            <Ionicons name="paper-plane" size={50} color={COLORS.primary} />
            <Text style={styles.sendModalTitle}>Send to A.F.G.M?</Text>
            <Text style={styles.sendModalText}>
              You've selected {selectedTalents.size} talent{selectedTalents.size !== 1 ? 's' : ''}.
              This will notify the admin team.
            </Text>
            
            <View style={styles.sendModalActions}>
              <Button
                title="Cancel"
                onPress={() => setShowSendModal(false)}
                variant="outline"
                style={styles.sendModalAction}
              />
              <Button
                title="Send"
                onPress={handleSendToAFGM}
                style={styles.sendModalAction}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Filter Modal */}
      <Modal
        visible={showFilters}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowFilters(false)}
      >
        <SafeAreaView style={styles.filterModalContainer}>
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
        visible={showDetail && detailTalent !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowDetail(false)}
      >
        {detailTalent && (
          <SafeAreaView style={styles.filterModalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Talent Profile</Text>
              <TouchableOpacity onPress={() => setShowDetail(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              {/* Photo */}
              <View style={styles.detailPhotos}>
                {detailTalent.headshot_base64 ? (
                  <Image source={{ uri: detailTalent.headshot_base64 }} style={styles.detailPhoto} />
                ) : (
                  <View style={[styles.detailPhoto, styles.noDetailPhoto]}>
                    <Ionicons name="person" size={60} color={COLORS.textSecondary} />
                  </View>
                )}
              </View>

              <View style={styles.detailHeader}>
                <Text style={styles.detailName}>
                  {detailTalent.user_first_name} {detailTalent.user_last_name}
                </Text>
                {detailTalent.is_captain && (
                  <View style={styles.detailCaptainBadge}>
                    <Ionicons name="star" size={14} color="#FFD700" />
                    <Text style={styles.detailCaptainText}>Captain</Text>
                  </View>
                )}
                <StarRating rating={detailTalent.star_rating || 3} size={20} />
              </View>

              {/* Stats */}
              <Card style={styles.detailCard}>
                <Text style={styles.detailSectionTitle}>Physical Stats</Text>
                <View style={styles.detailStats}>
                  <View style={styles.detailStat}>
                    <Text style={styles.detailStatLabel}>Height</Text>
                    <Text style={styles.detailStatValue}>{detailTalent.physical_stats?.height_cm || '-'}cm</Text>
                  </View>
                  <View style={styles.detailStat}>
                    <Text style={styles.detailStatLabel}>Weight</Text>
                    <Text style={styles.detailStatValue}>{detailTalent.physical_stats?.weight_kg || '-'}kg</Text>
                  </View>
                  <View style={styles.detailStat}>
                    <Text style={styles.detailStatLabel}>Chest</Text>
                    <Text style={styles.detailStatValue}>{detailTalent.physical_stats?.chest_cm || '-'}cm</Text>
                  </View>
                  <View style={styles.detailStat}>
                    <Text style={styles.detailStatLabel}>Waist</Text>
                    <Text style={styles.detailStatValue}>{detailTalent.physical_stats?.waist_cm || '-'}cm</Text>
                  </View>
                  <View style={styles.detailStat}>
                    <Text style={styles.detailStatLabel}>Shoe Size</Text>
                    <Text style={styles.detailStatValue}>{detailTalent.physical_stats?.shoe_size_uk || '-'}</Text>
                  </View>
                </View>
              </Card>

              <Card style={styles.detailCard}>
                <Text style={styles.detailSectionTitle}>Appearance</Text>
                <View style={styles.detailStats}>
                  <View style={styles.detailStat}>
                    <Text style={styles.detailStatLabel}>Gender</Text>
                    <Text style={styles.detailStatValue}>{detailTalent.appearance?.gender || '-'}</Text>
                  </View>
                  <View style={styles.detailStat}>
                    <Text style={styles.detailStatLabel}>Hair</Text>
                    <Text style={styles.detailStatValue}>{detailTalent.appearance?.hair_color || '-'}</Text>
                  </View>
                  <View style={styles.detailStat}>
                    <Text style={styles.detailStatLabel}>Eyes</Text>
                    <Text style={styles.detailStatValue}>{detailTalent.appearance?.eye_color || '-'}</Text>
                  </View>
                  <View style={styles.detailStat}>
                    <Text style={styles.detailStatLabel}>Ethnicity</Text>
                    <Text style={styles.detailStatValue}>{detailTalent.appearance?.ethnicity || '-'}</Text>
                  </View>
                </View>
              </Card>

              {detailTalent.skills && detailTalent.skills.length > 0 && (
                <Card style={styles.detailCard}>
                  <Text style={styles.detailSectionTitle}>Skills</Text>
                  <View style={styles.detailSkills}>
                    {detailTalent.skills.map((skill, i) => (
                      <View key={i} style={styles.detailSkillChip}>
                        <Text style={styles.detailSkillText}>{skill}</Text>
                      </View>
                    ))}
                  </View>
                </Card>
              )}

              {/* Select/Reject Actions */}
              <View style={styles.detailActions}>
                <TouchableOpacity
                  style={[
                    styles.detailActionBtn,
                    styles.detailRejectBtn,
                    rejectedTalents.has(detailTalent.user_id) && styles.detailActionActive,
                  ]}
                  onPress={() => {
                    rejectTalent(detailTalent.user_id);
                    setShowDetail(false);
                  }}
                >
                  <Ionicons name="close" size={28} color={COLORS.error} />
                  <Text style={styles.detailActionText}>Pass</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.detailActionBtn,
                    styles.detailSelectBtn,
                    selectedTalents.has(detailTalent.user_id) && styles.detailActionActive,
                  ]}
                  onPress={() => {
                    selectTalent(detailTalent.user_id);
                    setShowDetail(false);
                  }}
                >
                  <Ionicons name="checkmark" size={28} color={COLORS.success} />
                  <Text style={styles.detailActionText}>Select</Text>
                </TouchableOpacity>
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
  counterSection: {
    alignItems: 'center',
  },
  counterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: COLORS.primary + '15',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
  },
  counterText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  counterLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.md,
    padding: 2,
  },
  toggleButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
  },
  toggleButtonActive: {
    backgroundColor: COLORS.primary,
  },
  filterButton: {
    padding: SPACING.sm,
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
    height: SCREEN_HEIGHT * 0.55,
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
  badgesContainer: {
    position: 'absolute',
    top: SPACING.sm,
    left: SPACING.sm,
    gap: SPACING.xs,
  },
  captainBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.round,
  },
  captainText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
    color: '#FFD700',
    marginLeft: 4,
  },
  cardInfo: {
    padding: SPACING.md,
  },
  nameRatingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  talentName: {
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
    color: COLORS.text,
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
  selectionSummary: {
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginTop: SPACING.md,
  },
  // Thumbnail View
  thumbnailGrid: {
    padding: SPACING.md,
  },
  thumbnailWrapper: {
    width: THUMBNAIL_SIZE,
    marginRight: SPACING.md,
    marginBottom: SPACING.md,
    alignItems: 'center',
  },
  thumbnail: {
    width: THUMBNAIL_SIZE,
    height: THUMBNAIL_SIZE,
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  thumbnailSelected: {
    borderColor: COLORS.success,
    borderWidth: 3,
  },
  thumbnailRejected: {
    borderColor: COLORS.error,
    borderWidth: 3,
    opacity: 0.5,
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  thumbnailPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
  },
  selectionBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
  },
  thumbnailCaptain: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 10,
    padding: 2,
  },
  thumbnailName: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.text,
    marginTop: 4,
    textAlign: 'center',
  },
  // Send FAB
  sendFab: {
    position: 'absolute',
    bottom: 100,
    right: SPACING.md,
    backgroundColor: COLORS.primary,
    borderRadius: 28,
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  sendFabText: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: COLORS.error,
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    fontSize: FONT_SIZES.xs,
    fontWeight: 'bold',
    color: COLORS.textLight,
    textAlign: 'center',
    lineHeight: 24,
    overflow: 'hidden',
  },
  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  targetModal: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.xl,
    width: SCREEN_WIDTH * 0.8,
  },
  targetModalTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  targetInput: {
    marginBottom: SPACING.lg,
    textAlign: 'center',
    fontSize: FONT_SIZES.xl,
  },
  completionModal: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.xl,
    width: SCREEN_WIDTH * 0.85,
    alignItems: 'center',
  },
  completionTitle: {
    fontSize: FONT_SIZES.title,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: SPACING.md,
  },
  completionText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
  },
  completionCounter: {
    backgroundColor: COLORS.primary + '15',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    marginTop: SPACING.lg,
    alignItems: 'center',
  },
  completionCounterText: {
    fontSize: FONT_SIZES.title,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  completionCounterLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  completionHint: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.warning,
    marginTop: SPACING.md,
    textAlign: 'center',
  },
  completionActions: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.xl,
    width: '100%',
  },
  completionAction: {
    flex: 1,
  },
  sendModal: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.xl,
    width: SCREEN_WIDTH * 0.85,
    alignItems: 'center',
  },
  sendModalTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: SPACING.md,
  },
  sendModalText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.sm,
  },
  sendModalActions: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.xl,
    width: '100%',
  },
  sendModalAction: {
    flex: 1,
  },
  // Filter Modal
  filterModalContainer: {
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
  // Detail Modal
  detailPhotos: {
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  detailPhoto: {
    width: 180,
    height: 180,
    borderRadius: 90,
  },
  noDetailPhoto: {
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailHeader: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  detailName: {
    fontSize: FONT_SIZES.title,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  detailCaptainBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFD70020',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.round,
    marginVertical: SPACING.sm,
  },
  detailCaptainText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: '#B8860B',
    marginLeft: 4,
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
    justifyContent: 'center',
    gap: SPACING.xl,
    marginTop: SPACING.lg,
    marginBottom: SPACING.xxl,
  },
  detailActionBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  detailRejectBtn: {
    borderWidth: 2,
    borderColor: COLORS.error,
  },
  detailSelectBtn: {
    borderWidth: 2,
    borderColor: COLORS.success,
  },
  detailActionActive: {
    backgroundColor: COLORS.primary + '15',
  },
  detailActionText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
});
