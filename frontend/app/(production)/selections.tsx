import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Image, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../../src/components/Card';
import { Button } from '../../src/components/Button';
import { LoadingScreen } from '../../src/components/LoadingScreen';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../../src/constants/theme';
import api from '../../src/api/client';
import { TalentProfile } from '../../src/types';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function SelectionsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTalentIds, setSelectedTalentIds] = useState<string[]>([]);
  const [talents, setTalents] = useState<TalentProfile[]>([]);

  useEffect(() => {
    loadSelections();
  }, []);

  const loadSelections = async () => {
    try {
      // Load selections from AsyncStorage
      const selectionsStr = await AsyncStorage.getItem('talent_selections');
      const selections = selectionsStr ? JSON.parse(selectionsStr) : [];
      setSelectedTalentIds(selections);

      // Fetch talent details for each selection
      if (selections.length > 0) {
        const response = await api.get('/talents');
        const filtered = response.data.filter((t: TalentProfile) => 
          selections.includes(t.user_id)
        );
        setTalents(filtered);
      } else {
        setTalents([]);
      }
    } catch (error) {
      console.error('Error loading selections:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadSelections();
    setRefreshing(false);
  };

  const removeTalent = async (talentId: string) => {
    Alert.alert(
      'Remove Selection',
      'Are you sure you want to remove this talent from your selections?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            const newSelections = selectedTalentIds.filter(id => id !== talentId);
            await AsyncStorage.setItem('talent_selections', JSON.stringify(newSelections));
            setSelectedTalentIds(newSelections);
            setTalents(talents.filter(t => t.user_id !== talentId));
          },
        },
      ]
    );
  };

  const createJobWithSelections = () => {
    router.push({
      pathname: '/(production)/jobs',
      params: { selections: JSON.stringify(selectedTalentIds) },
    });
  };

  if (loading) {
    return <LoadingScreen message="Loading selections..." />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{talents.length} Talents Selected</Text>
          {talents.length > 0 && (
            <Button
              title="Create Job"
              onPress={createJobWithSelections}
              size="small"
            />
          )}
        </View>

        {/* Selected Talents */}
        {talents.length > 0 ? (
          talents.map((talent) => (
            <Card key={talent.id} style={styles.talentCard}>
              <View style={styles.talentRow}>
                {talent.headshot_base64 ? (
                  <Image source={{ uri: talent.headshot_base64 }} style={styles.talentPhoto} />
                ) : (
                  <View style={[styles.talentPhoto, styles.noPhoto]}>
                    <Ionicons name="person" size={24} color={COLORS.textSecondary} />
                  </View>
                )}
                <View style={styles.talentInfo}>
                  <Text style={styles.talentName}>
                    {talent.user_first_name} {talent.user_last_name}
                  </Text>
                  <View style={styles.talentStats}>
                    {talent.physical_stats?.height_cm && (
                      <Text style={styles.talentStat}>{talent.physical_stats.height_cm}cm</Text>
                    )}
                    {talent.appearance?.gender && (
                      <Text style={styles.talentStat}>{talent.appearance.gender}</Text>
                    )}
                    {talent.appearance?.hair_color && (
                      <Text style={styles.talentStat}>{talent.appearance.hair_color}</Text>
                    )}
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => removeTalent(talent.user_id)}
                >
                  <Ionicons name="close-circle" size={28} color={COLORS.error} />
                </TouchableOpacity>
              </View>
            </Card>
          ))
        ) : (
          <Card style={styles.emptyCard}>
            <Ionicons name="heart-outline" size={60} color={COLORS.textSecondary} />
            <Text style={styles.emptyTitle}>No Selections Yet</Text>
            <Text style={styles.emptyText}>
              Browse talents and swipe right to select them for your production
            </Text>
            <Button
              title="Browse Talents"
              onPress={() => router.push('/(production)/browse')}
              style={styles.browseButton}
            />
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
  talentCard: {
    marginBottom: SPACING.sm,
    padding: SPACING.md,
  },
  talentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  talentPhoto: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  noPhoto: {
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  talentInfo: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  talentName: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
  },
  talentStats: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.xs,
  },
  talentStat: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  removeButton: {
    padding: SPACING.sm,
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
  browseButton: {
    marginTop: SPACING.lg,
  },
});
