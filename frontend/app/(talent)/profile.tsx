import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Input } from '../../src/components/Input';
import { Button } from '../../src/components/Button';
import { Card } from '../../src/components/Card';
import { LoadingScreen } from '../../src/components/LoadingScreen';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../../src/constants/theme';
import api from '../../src/api/client';
import { TalentProfile, PhysicalStats, Appearance } from '../../src/types';

const HAIR_COLORS = ['Black', 'Brown', 'Blonde', 'Red', 'Grey', 'White', 'Auburn', 'Bald'];
const EYE_COLORS = ['Brown', 'Blue', 'Green', 'Hazel', 'Grey', 'Amber'];
const GENDER_OPTIONS = [{ value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }, { value: 'other', label: 'Other' }];

export default function TalentProfileScreen() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<TalentProfile | null>(null);
  const [activeSection, setActiveSection] = useState<string | null>('personal');

  // Form states
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [postcode, setPostcode] = useState('');
  const [physicalStats, setPhysicalStats] = useState<PhysicalStats>({});
  const [appearance, setAppearance] = useState<Appearance>({});
  const [skills, setSkills] = useState('');
  const [experience, setExperience] = useState('');
  const [headshot, setHeadshot] = useState<string | null>(null);
  const [fullBody, setFullBody] = useState<string | null>(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await api.get('/talent/profile');
      const data = response.data;
      setProfile(data);
      setDateOfBirth(data.date_of_birth || '');
      setAddress(data.address || '');
      setCity(data.city || '');
      setPostcode(data.postcode || '');
      setPhysicalStats(data.physical_stats || {});
      setAppearance(data.appearance || {});
      setSkills(data.skills?.join(', ') || '');
      setExperience(data.experience || '');
      setHeadshot(data.headshot_base64 || null);
      setFullBody(data.full_body_base64 || null);
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async (type: 'headshot' | 'fullbody') => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: type === 'headshot' ? [1, 1] : [3, 4],
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
      if (type === 'headshot') {
        setHeadshot(base64Image);
      } else {
        setFullBody(base64Image);
      }
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/talent/profile', {
        date_of_birth: dateOfBirth || null,
        address: address || null,
        city: city || null,
        postcode: postcode || null,
        physical_stats: physicalStats,
        appearance: appearance,
        skills: skills ? skills.split(',').map(s => s.trim()).filter(Boolean) : [],
        experience: experience || null,
        headshot_base64: headshot,
        full_body_base64: fullBody,
      });
      Alert.alert('Success', 'Profile updated successfully');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingScreen message="Loading profile..." />;
  }

  const renderSection = (title: string, key: string, content: React.ReactNode) => (
    <Card style={styles.sectionCard}>
      <TouchableOpacity
        style={styles.sectionHeader}
        onPress={() => setActiveSection(activeSection === key ? null : key)}
      >
        <Text style={styles.sectionTitle}>{title}</Text>
        <Ionicons
          name={activeSection === key ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={COLORS.textSecondary}
        />
      </TouchableOpacity>
      {activeSection === key && <View style={styles.sectionContent}>{content}</View>}
    </Card>
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Photos Section */}
        <View style={styles.photosSection}>
          <TouchableOpacity style={styles.photoBox} onPress={() => pickImage('headshot')}>
            {headshot ? (
              <Image source={{ uri: headshot }} style={styles.photo} />
            ) : (
              <View style={styles.photoPlaceholder}>
                <Ionicons name="camera" size={32} color={COLORS.textSecondary} />
                <Text style={styles.photoLabel}>Headshot</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={[styles.photoBox, styles.fullBodyBox]} onPress={() => pickImage('fullbody')}>
            {fullBody ? (
              <Image source={{ uri: fullBody }} style={styles.photo} />
            ) : (
              <View style={styles.photoPlaceholder}>
                <Ionicons name="camera" size={32} color={COLORS.textSecondary} />
                <Text style={styles.photoLabel}>Full Body</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Name Display */}
        <Text style={styles.profileName}>
          {profile?.user_first_name} {profile?.user_last_name}
        </Text>
        <Text style={styles.profileEmail}>{profile?.user_email}</Text>

        {/* Referrers & Status Section */}
        <Card style={styles.statusCard}>
          {/* Captain Badge */}
          {profile?.is_captain && (
            <View style={styles.captainBadge}>
              <Ionicons name="star" size={16} color="#FFD700" />
              <Text style={styles.captainText}>Captain</Text>
            </View>
          )}

          {/* Referrer Boxes */}
          {(profile?.referrer_1_name || profile?.referrer_2_name) && (
            <View style={styles.referrersSection}>
              <Text style={styles.referrersTitle}>Referred By</Text>
              <View style={styles.referrersRow}>
                {profile?.referrer_1_name && (
                  <View style={styles.referrerBox}>
                    <Ionicons name="person-circle" size={24} color={COLORS.primary} />
                    <Text style={styles.referrerName}>{profile.referrer_1_name}</Text>
                  </View>
                )}
                {profile?.referrer_2_name && (
                  <View style={styles.referrerBox}>
                    <Ionicons name="person-circle" size={24} color={COLORS.primary} />
                    <Text style={styles.referrerName}>{profile.referrer_2_name}</Text>
                  </View>
                )}
              </View>
            </View>
          )}
        </Card>

        {/* Personal Details */}
        {renderSection('Personal Details', 'personal', (
          <>
            <Input
              label="Date of Birth"
              placeholder="DD/MM/YYYY"
              value={dateOfBirth}
              onChangeText={setDateOfBirth}
            />
            <Input
              label="Address"
              placeholder="Street address"
              value={address}
              onChangeText={setAddress}
            />
            <View style={styles.row}>
              <View style={styles.halfField}>
                <Input
                  label="City"
                  placeholder="City"
                  value={city}
                  onChangeText={setCity}
                />
              </View>
              <View style={styles.halfField}>
                <Input
                  label="Postcode"
                  placeholder="Postcode"
                  value={postcode}
                  onChangeText={setPostcode}
                />
              </View>
            </View>
          </>
        ))}

        {/* Physical Stats */}
        {renderSection('Physical Stats', 'physical', (
          <>
            <View style={styles.row}>
              <View style={styles.halfField}>
                <Input
                  label="Height (cm)"
                  placeholder="175"
                  value={physicalStats.height_cm?.toString() || ''}
                  onChangeText={(v) => setPhysicalStats({ ...physicalStats, height_cm: parseInt(v) || undefined })}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.halfField}>
                <Input
                  label="Weight (kg)"
                  placeholder="70"
                  value={physicalStats.weight_kg?.toString() || ''}
                  onChangeText={(v) => setPhysicalStats({ ...physicalStats, weight_kg: parseFloat(v) || undefined })}
                  keyboardType="numeric"
                />
              </View>
            </View>
            <View style={styles.row}>
              <View style={styles.halfField}>
                <Input
                  label="Chest (cm)"
                  placeholder="96"
                  value={physicalStats.chest_cm?.toString() || ''}
                  onChangeText={(v) => setPhysicalStats({ ...physicalStats, chest_cm: parseInt(v) || undefined })}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.halfField}>
                <Input
                  label="Waist (cm)"
                  placeholder="81"
                  value={physicalStats.waist_cm?.toString() || ''}
                  onChangeText={(v) => setPhysicalStats({ ...physicalStats, waist_cm: parseInt(v) || undefined })}
                  keyboardType="numeric"
                />
              </View>
            </View>
            <View style={styles.row}>
              <View style={styles.halfField}>
                <Input
                  label="Hips (cm)"
                  placeholder="96"
                  value={physicalStats.hips_cm?.toString() || ''}
                  onChangeText={(v) => setPhysicalStats({ ...physicalStats, hips_cm: parseInt(v) || undefined })}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.halfField}>
                <Input
                  label="Inside Leg (cm)"
                  placeholder="81"
                  value={physicalStats.inside_leg_cm?.toString() || ''}
                  onChangeText={(v) => setPhysicalStats({ ...physicalStats, inside_leg_cm: parseInt(v) || undefined })}
                  keyboardType="numeric"
                />
              </View>
            </View>
            <View style={styles.row}>
              <View style={styles.halfField}>
                <Input
                  label="Collar (cm)"
                  placeholder="40"
                  value={physicalStats.collar_cm?.toString() || ''}
                  onChangeText={(v) => setPhysicalStats({ ...physicalStats, collar_cm: parseFloat(v) || undefined })}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.halfField}>
                <Input
                  label="Shoe Size (UK)"
                  placeholder="9"
                  value={physicalStats.shoe_size_uk?.toString() || ''}
                  onChangeText={(v) => setPhysicalStats({ ...physicalStats, shoe_size_uk: parseFloat(v) || undefined })}
                  keyboardType="numeric"
                />
              </View>
            </View>
            <Input
              label="Dress Size"
              placeholder="12"
              value={physicalStats.dress_size || ''}
              onChangeText={(v) => setPhysicalStats({ ...physicalStats, dress_size: v || undefined })}
            />
          </>
        ))}

        {/* Appearance */}
        {renderSection('Appearance', 'appearance', (
          <>
            <Text style={styles.fieldLabel}>Gender</Text>
            <View style={styles.optionsRow}>
              {GENDER_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.optionButton,
                    appearance.gender === opt.value && styles.optionButtonSelected,
                  ]}
                  onPress={() => setAppearance({ ...appearance, gender: opt.value as any })}
                >
                  <Text style={[
                    styles.optionText,
                    appearance.gender === opt.value && styles.optionTextSelected,
                  ]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>Hair Color</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
              {HAIR_COLORS.map((color) => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.optionChip,
                    appearance.hair_color === color && styles.optionChipSelected,
                  ]}
                  onPress={() => setAppearance({ ...appearance, hair_color: color })}
                >
                  <Text style={[
                    styles.optionChipText,
                    appearance.hair_color === color && styles.optionChipTextSelected,
                  ]}>
                    {color}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.fieldLabel}>Eye Color</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
              {EYE_COLORS.map((color) => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.optionChip,
                    appearance.eye_color === color && styles.optionChipSelected,
                  ]}
                  onPress={() => setAppearance({ ...appearance, eye_color: color })}
                >
                  <Text style={[
                    styles.optionChipText,
                    appearance.eye_color === color && styles.optionChipTextSelected,
                  ]}>
                    {color}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Input
              label="Ethnicity"
              placeholder="e.g., White British, Asian, etc."
              value={appearance.ethnicity || ''}
              onChangeText={(v) => setAppearance({ ...appearance, ethnicity: v || undefined })}
            />
          </>
        ))}

        {/* Skills & Experience */}
        {renderSection('Skills & Experience', 'skills', (
          <>
            <Input
              label="Skills (comma separated)"
              placeholder="Driving, Horse Riding, Swimming..."
              value={skills}
              onChangeText={setSkills}
              multiline
              numberOfLines={2}
            />
            <Input
              label="Experience"
              placeholder="Previous work, training, etc."
              value={experience}
              onChangeText={setExperience}
              multiline
              numberOfLines={4}
            />
          </>
        ))}

        <Button
          title="Save Profile"
          onPress={handleSave}
          loading={saving}
          fullWidth
          style={styles.saveButton}
        />
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
  photosSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  photoBox: {
    width: 120,
    height: 120,
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    backgroundColor: COLORS.surface,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
  },
  fullBodyBox: {
    width: 90,
    height: 120,
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  photoPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  profileName: {
    fontSize: FONT_SIZES.xl,
    fontWeight: 'bold',
    color: COLORS.text,
    textAlign: 'center',
  },
  profileEmail: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  statusCard: {
    marginBottom: SPACING.lg,
    padding: SPACING.md,
  },
  captainBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFD70020',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.round,
    marginBottom: SPACING.md,
    alignSelf: 'center',
  },
  captainText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: '#B8860B',
    marginLeft: SPACING.xs,
  },
  referrersSection: {
    marginTop: SPACING.xs,
  },
  referrersTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  referrersRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.md,
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
  sectionCard: {
    marginBottom: SPACING.md,
    padding: 0,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
  },
  sectionContent: {
    padding: SPACING.md,
    paddingTop: 0,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  row: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  halfField: {
    flex: 1,
  },
  fieldLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
    color: COLORS.text,
    marginBottom: SPACING.sm,
    marginTop: SPACING.sm,
  },
  optionsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  optionButton: {
    flex: 1,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  optionButtonSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  optionText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
  },
  optionTextSelected: {
    color: COLORS.textLight,
    fontWeight: '600',
  },
  horizontalScroll: {
    marginBottom: SPACING.md,
  },
  optionChip: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.round,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: SPACING.sm,
    backgroundColor: COLORS.surface,
  },
  optionChipSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  optionChipText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
  },
  optionChipTextSelected: {
    color: COLORS.textLight,
    fontWeight: '600',
  },
  saveButton: {
    marginTop: SPACING.md,
    marginBottom: SPACING.xxl,
  },
});
