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
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Input } from '../../src/components/Input';
import { Button } from '../../src/components/Button';
import { Card } from '../../src/components/Card';
import { LoadingScreen } from '../../src/components/LoadingScreen';
import { StarRating } from '../../src/components/StarRating';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../../src/constants/theme';
import { useAuthStore } from '../../src/store/authStore';
import api from '../../src/api/client';
import { TalentProfile, PhysicalStats, Appearance } from '../../src/types';

const HAIR_COLORS = ['Black', 'Brown', 'Blonde', 'Red', 'Grey', 'White', 'Auburn', 'Bald'];
const EYE_COLORS = ['Brown', 'Blue', 'Green', 'Hazel', 'Grey', 'Amber'];
const GENDER_OPTIONS = [{ value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }, { value: 'other', label: 'Other' }];

type TabType = 'profile' | 'photos' | 'stats' | 'skills' | 'bank' | 'settings';

const TABS: { id: TabType; label: string; icon: string }[] = [
  { id: 'profile', label: 'Profile', icon: 'person' },
  { id: 'photos', label: 'Photos', icon: 'camera' },
  { id: 'stats', label: 'Stats', icon: 'body' },
  { id: 'skills', label: 'Skills', icon: 'star' },
  { id: 'bank', label: 'Bank', icon: 'card' },
  { id: 'settings', label: 'Settings', icon: 'settings' },
];

export default function TalentProfileScreen() {
  const { logout } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<TalentProfile | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('profile');

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
  
  // Bank details
  const [bankName, setBankName] = useState('');
  const [accountName, setAccountName] = useState('');
  const [sortCode, setSortCode] = useState('');
  const [accountNumber, setAccountNumber] = useState('');

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
      // Bank details
      setBankName(data.bank_details?.bank_name || '');
      setAccountName(data.bank_details?.account_name || '');
      setSortCode(data.bank_details?.sort_code || '');
      setAccountNumber(data.bank_details?.account_number || '');
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
        bank_details: {
          bank_name: bankName,
          account_name: accountName,
          sort_code: sortCode,
          account_number: accountNumber,
        },
      });
      Alert.alert('Success', 'Profile updated successfully');
      fetchProfile();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await logout();
  };

  if (loading) {
    return <LoadingScreen message="Loading profile..." />;
  }

  const renderProfileTab = () => (
    <View style={styles.tabContent}>
      {/* Header with photo and name */}
      <View style={styles.profileHeader}>
        <TouchableOpacity onPress={() => pickImage('headshot')}>
          {headshot ? (
            <Image source={{ uri: headshot }} style={styles.headerPhoto} />
          ) : (
            <View style={[styles.headerPhoto, styles.photoPlaceholder]}>
              <Ionicons name="camera" size={30} color={COLORS.textSecondary} />
            </View>
          )}
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerName}>
            {profile?.user_first_name} {profile?.user_last_name}
          </Text>
          <Text style={styles.headerEmail}>{profile?.user_email}</Text>
          <StarRating rating={profile?.star_rating || 3} size={16} />
          {profile?.is_captain && (
            <View style={styles.captainBadge}>
              <Ionicons name="star" size={12} color="#FFD700" />
              <Text style={styles.captainText}>Captain</Text>
            </View>
          )}
        </View>
      </View>

      {/* Referrers */}
      {(profile?.referrer_1_name || profile?.referrer_2_name) && (
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Referred By</Text>
          <View style={styles.referrersRow}>
            {profile?.referrer_1_name && (
              <View style={styles.referrerBox}>
                <Ionicons name="person-circle" size={20} color={COLORS.primary} />
                <Text style={styles.referrerName}>{profile.referrer_1_name}</Text>
              </View>
            )}
            {profile?.referrer_2_name && (
              <View style={styles.referrerBox}>
                <Ionicons name="person-circle" size={20} color={COLORS.primary} />
                <Text style={styles.referrerName}>{profile.referrer_2_name}</Text>
              </View>
            )}
          </View>
        </Card>
      )}

      {/* Personal Details */}
      <Card style={styles.card}>
        <Text style={styles.cardTitle}>Personal Details</Text>
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
          <Input
            label="City"
            placeholder="City"
            value={city}
            onChangeText={setCity}
            style={styles.halfInput}
          />
          <Input
            label="Postcode"
            placeholder="Postcode"
            value={postcode}
            onChangeText={setPostcode}
            style={styles.halfInput}
          />
        </View>
      </Card>

      <Button
        title={saving ? 'Saving...' : 'Save Profile'}
        onPress={handleSave}
        loading={saving}
        fullWidth
        style={styles.saveButton}
      />
    </View>
  );

  const renderPhotosTab = () => (
    <View style={styles.tabContent}>
      <Card style={styles.card}>
        <Text style={styles.cardTitle}>Headshot</Text>
        <TouchableOpacity style={styles.photoUpload} onPress={() => pickImage('headshot')}>
          {headshot ? (
            <Image source={{ uri: headshot }} style={styles.uploadedPhoto} />
          ) : (
            <View style={styles.uploadPlaceholder}>
              <Ionicons name="camera" size={40} color={COLORS.textSecondary} />
              <Text style={styles.uploadText}>Tap to upload headshot</Text>
            </View>
          )}
        </TouchableOpacity>
      </Card>

      <Card style={styles.card}>
        <Text style={styles.cardTitle}>Full Body Photo</Text>
        <TouchableOpacity style={styles.photoUpload} onPress={() => pickImage('fullbody')}>
          {fullBody ? (
            <Image source={{ uri: fullBody }} style={styles.uploadedPhoto} />
          ) : (
            <View style={styles.uploadPlaceholder}>
              <Ionicons name="camera" size={40} color={COLORS.textSecondary} />
              <Text style={styles.uploadText}>Tap to upload full body</Text>
            </View>
          )}
        </TouchableOpacity>
      </Card>

      <Button
        title={saving ? 'Saving...' : 'Save Photos'}
        onPress={handleSave}
        loading={saving}
        fullWidth
        style={styles.saveButton}
      />
    </View>
  );

  const renderStatsTab = () => (
    <View style={styles.tabContent}>
      <Card style={styles.card}>
        <Text style={styles.cardTitle}>Physical Stats</Text>
        <View style={styles.row}>
          <Input
            label="Height (cm)"
            placeholder="e.g. 175"
            value={physicalStats.height_cm?.toString() || ''}
            onChangeText={(v) => setPhysicalStats({ ...physicalStats, height_cm: parseInt(v) || undefined })}
            keyboardType="numeric"
            style={styles.halfInput}
          />
          <Input
            label="Weight (kg)"
            placeholder="e.g. 70"
            value={physicalStats.weight_kg?.toString() || ''}
            onChangeText={(v) => setPhysicalStats({ ...physicalStats, weight_kg: parseInt(v) || undefined })}
            keyboardType="numeric"
            style={styles.halfInput}
          />
        </View>
        <View style={styles.row}>
          <Input
            label="Chest (cm)"
            placeholder="e.g. 95"
            value={physicalStats.chest_cm?.toString() || ''}
            onChangeText={(v) => setPhysicalStats({ ...physicalStats, chest_cm: parseInt(v) || undefined })}
            keyboardType="numeric"
            style={styles.halfInput}
          />
          <Input
            label="Waist (cm)"
            placeholder="e.g. 80"
            value={physicalStats.waist_cm?.toString() || ''}
            onChangeText={(v) => setPhysicalStats({ ...physicalStats, waist_cm: parseInt(v) || undefined })}
            keyboardType="numeric"
            style={styles.halfInput}
          />
        </View>
        <View style={styles.row}>
          <Input
            label="Shoe Size (UK)"
            placeholder="e.g. 9"
            value={physicalStats.shoe_size_uk?.toString() || ''}
            onChangeText={(v) => setPhysicalStats({ ...physicalStats, shoe_size_uk: parseInt(v) || undefined })}
            keyboardType="numeric"
            style={styles.halfInput}
          />
          <Input
            label="Collar (inches)"
            placeholder="e.g. 15"
            value={physicalStats.collar_inches?.toString() || ''}
            onChangeText={(v) => setPhysicalStats({ ...physicalStats, collar_inches: parseInt(v) || undefined })}
            keyboardType="numeric"
            style={styles.halfInput}
          />
        </View>
      </Card>

      <Card style={styles.card}>
        <Text style={styles.cardTitle}>Appearance</Text>
        
        <Text style={styles.fieldLabel}>Gender</Text>
        <View style={styles.optionsRow}>
          {GENDER_OPTIONS.map((g) => (
            <TouchableOpacity
              key={g.value}
              style={[styles.optionButton, appearance.gender === g.value && styles.optionSelected]}
              onPress={() => setAppearance({ ...appearance, gender: g.value })}
            >
              <Text style={[styles.optionText, appearance.gender === g.value && styles.optionTextSelected]}>
                {g.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.fieldLabel}>Hair Color</Text>
        <View style={styles.optionsRow}>
          {HAIR_COLORS.map((color) => (
            <TouchableOpacity
              key={color}
              style={[styles.optionChip, appearance.hair_color === color && styles.optionChipSelected]}
              onPress={() => setAppearance({ ...appearance, hair_color: color })}
            >
              <Text style={[styles.optionChipText, appearance.hair_color === color && styles.optionChipTextSelected]}>
                {color}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.fieldLabel}>Eye Color</Text>
        <View style={styles.optionsRow}>
          {EYE_COLORS.map((color) => (
            <TouchableOpacity
              key={color}
              style={[styles.optionChip, appearance.eye_color === color && styles.optionChipSelected]}
              onPress={() => setAppearance({ ...appearance, eye_color: color })}
            >
              <Text style={[styles.optionChipText, appearance.eye_color === color && styles.optionChipTextSelected]}>
                {color}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Input
          label="Ethnicity"
          placeholder="e.g. Caucasian, Asian, etc."
          value={appearance.ethnicity || ''}
          onChangeText={(v) => setAppearance({ ...appearance, ethnicity: v })}
        />
      </Card>

      <Button
        title={saving ? 'Saving...' : 'Save Stats'}
        onPress={handleSave}
        loading={saving}
        fullWidth
        style={styles.saveButton}
      />
    </View>
  );

  const renderSkillsTab = () => (
    <View style={styles.tabContent}>
      <Card style={styles.card}>
        <Text style={styles.cardTitle}>Skills & Experience</Text>
        <Input
          label="Skills (comma separated)"
          placeholder="e.g. Driving, Swimming, Horse Riding"
          value={skills}
          onChangeText={setSkills}
          multiline
          numberOfLines={3}
        />
        <Input
          label="Experience"
          placeholder="Describe your experience..."
          value={experience}
          onChangeText={setExperience}
          multiline
          numberOfLines={5}
        />
      </Card>

      <Button
        title={saving ? 'Saving...' : 'Save Skills'}
        onPress={handleSave}
        loading={saving}
        fullWidth
        style={styles.saveButton}
      />
    </View>
  );

  const renderBankTab = () => (
    <View style={styles.tabContent}>
      <Card style={styles.card}>
        <Text style={styles.cardTitle}>Bank Details</Text>
        <Text style={styles.bankHint}>
          Your bank details are securely stored and used for payment processing.
        </Text>
        <Input
          label="Bank Name"
          placeholder="e.g. Barclays, HSBC"
          value={bankName}
          onChangeText={setBankName}
        />
        <Input
          label="Account Name"
          placeholder="Name on account"
          value={accountName}
          onChangeText={setAccountName}
        />
        <View style={styles.row}>
          <Input
            label="Sort Code"
            placeholder="00-00-00"
            value={sortCode}
            onChangeText={setSortCode}
            style={styles.halfInput}
          />
          <Input
            label="Account Number"
            placeholder="12345678"
            value={accountNumber}
            onChangeText={setAccountNumber}
            keyboardType="numeric"
            style={styles.halfInput}
          />
        </View>
      </Card>

      <Button
        title={saving ? 'Saving...' : 'Save Bank Details'}
        onPress={handleSave}
        loading={saving}
        fullWidth
        style={styles.saveButton}
      />
    </View>
  );

  const renderSettingsTab = () => (
    <View style={styles.tabContent}>
      <Card style={styles.card}>
        <Text style={styles.cardTitle}>Account Settings</Text>
        
        <TouchableOpacity style={styles.settingRow}>
          <Ionicons name="notifications-outline" size={22} color={COLORS.text} />
          <Text style={styles.settingText}>Notifications</Text>
          <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingRow}>
          <Ionicons name="lock-closed-outline" size={22} color={COLORS.text} />
          <Text style={styles.settingText}>Change Password</Text>
          <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingRow}>
          <Ionicons name="help-circle-outline" size={22} color={COLORS.text} />
          <Text style={styles.settingText}>Help & Support</Text>
          <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
        </TouchableOpacity>
      </Card>

      <Button
        title="Logout"
        onPress={handleLogout}
        variant="danger"
        fullWidth
        style={styles.logoutButton}
      />
    </View>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile':
        return renderProfileTab();
      case 'photos':
        return renderPhotosTab();
      case 'stats':
        return renderStatsTab();
      case 'skills':
        return renderSkillsTab();
      case 'bank':
        return renderBankTab();
      case 'settings':
        return renderSettingsTab();
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Tab Bar */}
      <View style={styles.tabBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {TABS.map((tab) => (
            <TouchableOpacity
              key={tab.id}
              style={[styles.tab, activeTab === tab.id && styles.tabActive]}
              onPress={() => setActiveTab(tab.id)}
            >
              <Ionicons
                name={tab.icon as any}
                size={20}
                color={activeTab === tab.id ? COLORS.primary : COLORS.textSecondary}
              />
              <Text style={[styles.tabLabel, activeTab === tab.id && styles.tabLabelActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Tab Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {renderTabContent()}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  tabBar: {
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingVertical: SPACING.sm,
  },
  tab: {
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    marginHorizontal: SPACING.xs,
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
  },
  tabLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  tabLabelActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  tabContent: {
    padding: SPACING.md,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  headerPhoto: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  photoPlaceholder: {
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
  },
  headerInfo: {
    marginLeft: SPACING.md,
    flex: 1,
  },
  headerName: {
    fontSize: FONT_SIZES.xl,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  headerEmail: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  captainBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFD70020',
    paddingVertical: 4,
    paddingHorizontal: SPACING.sm,
    borderRadius: BORDER_RADIUS.round,
    marginTop: SPACING.xs,
    alignSelf: 'flex-start',
  },
  captainText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
    color: '#B8860B',
    marginLeft: 4,
  },
  card: {
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  cardTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  referrersRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
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
  row: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  halfInput: {
    flex: 1,
  },
  fieldLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
    color: COLORS.text,
    marginBottom: SPACING.sm,
    marginTop: SPACING.md,
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  optionButton: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  optionSelected: {
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
  optionChip: {
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.round,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  optionChipSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  optionChipText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.text,
  },
  optionChipTextSelected: {
    color: COLORS.textLight,
    fontWeight: '600',
  },
  photoUpload: {
    height: 200,
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
    backgroundColor: COLORS.background,
  },
  uploadedPhoto: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  uploadPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    borderRadius: BORDER_RADIUS.md,
  },
  uploadText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
  },
  bankHint: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
    fontStyle: 'italic',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  settingText: {
    flex: 1,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    marginLeft: SPACING.md,
  },
  saveButton: {
    marginTop: SPACING.md,
    marginBottom: SPACING.xxl,
  },
  logoutButton: {
    marginTop: SPACING.lg,
    marginBottom: SPACING.xxl,
  },
});
