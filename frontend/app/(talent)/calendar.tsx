import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar, DateData } from 'react-native-calendars';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../../src/components/Card';
import { Button } from '../../src/components/Button';
import { Input } from '../../src/components/Input';
import { LoadingScreen } from '../../src/components/LoadingScreen';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../../src/constants/theme';
import api from '../../src/api/client';
import { UnavailableDate } from '../../src/types';

export default function CalendarScreen() {
  const [loading, setLoading] = useState(true);
  const [unavailableDates, setUnavailableDates] = useState<UnavailableDate[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchAvailability();
  }, []);

  const fetchAvailability = async () => {
    try {
      const response = await api.get('/talent/availability');
      setUnavailableDates(response.data);
    } catch (error) {
      console.error('Error fetching availability:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDayPress = (day: DateData) => {
    const existingDate = unavailableDates.find(d => d.date === day.dateString);
    if (existingDate) {
      // Remove unavailability
      Alert.alert(
        'Remove Unavailability',
        `Are you sure you want to mark ${day.dateString} as available?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: () => removeUnavailableDate(existingDate.id),
          },
        ]
      );
    } else {
      setSelectedDate(day.dateString);
      setReason('');
    }
  };

  const addUnavailableDate = async () => {
    if (!selectedDate) return;
    
    setSaving(true);
    try {
      const response = await api.post('/talent/availability', {
        date: selectedDate,
        reason: reason || null,
      });
      setUnavailableDates([...unavailableDates, response.data]);
      setSelectedDate(null);
      setReason('');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to add date');
    } finally {
      setSaving(false);
    }
  };

  const removeUnavailableDate = async (dateId: string) => {
    try {
      await api.delete(`/talent/availability/${dateId}`);
      setUnavailableDates(unavailableDates.filter(d => d.id !== dateId));
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to remove date');
    }
  };

  const getMarkedDates = () => {
    const marked: { [key: string]: any } = {};
    
    unavailableDates.forEach(date => {
      marked[date.date] = {
        selected: true,
        selectedColor: COLORS.secondary,
        selectedTextColor: COLORS.textLight,
      };
    });

    if (selectedDate && !marked[selectedDate]) {
      marked[selectedDate] = {
        selected: true,
        selectedColor: COLORS.primary,
        selectedTextColor: COLORS.textLight,
      };
    }

    return marked;
  };

  if (loading) {
    return <LoadingScreen message="Loading calendar..." />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.content}>
        {/* Legend */}
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: COLORS.secondary }]} />
            <Text style={styles.legendText}>Unavailable</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: COLORS.success }]} />
            <Text style={styles.legendText}>Available</Text>
          </View>
        </View>

        {/* Calendar */}
        <Card style={styles.calendarCard}>
          <Calendar
            onDayPress={handleDayPress}
            markedDates={getMarkedDates()}
            theme={{
              backgroundColor: COLORS.surface,
              calendarBackground: COLORS.surface,
              textSectionTitleColor: COLORS.textSecondary,
              selectedDayBackgroundColor: COLORS.primary,
              selectedDayTextColor: COLORS.textLight,
              todayTextColor: COLORS.primary,
              dayTextColor: COLORS.text,
              textDisabledColor: COLORS.border,
              arrowColor: COLORS.primary,
              monthTextColor: COLORS.text,
              textDayFontWeight: '500',
              textMonthFontWeight: 'bold',
              textDayHeaderFontWeight: '600',
            }}
            minDate={new Date().toISOString().split('T')[0]}
          />
        </Card>

        {/* Add Unavailable Date */}
        {selectedDate && (
          <Card style={styles.addCard}>
            <Text style={styles.addTitle}>Mark as Unavailable</Text>
            <Text style={styles.addDate}>{selectedDate}</Text>
            <Input
              label="Reason (optional)"
              placeholder="e.g., Holiday, Other booking"
              value={reason}
              onChangeText={setReason}
            />
            <View style={styles.buttonRow}>
              <Button
                title="Cancel"
                onPress={() => setSelectedDate(null)}
                variant="outline"
                style={styles.cancelButton}
              />
              <Button
                title="Mark Unavailable"
                onPress={addUnavailableDate}
                loading={saving}
                style={styles.addButton}
              />
            </View>
          </Card>
        )}

        {/* Instructions */}
        {!selectedDate && (
          <Card style={styles.instructionsCard}>
            <Ionicons name="information-circle" size={24} color={COLORS.info} />
            <Text style={styles.instructionsText}>
              Tap on a date to mark yourself as unavailable. Tap on a red date to mark yourself available again.
            </Text>
          </Card>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flex: 1,
    padding: SPACING.md,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.lg,
    marginBottom: SPACING.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: SPACING.xs,
  },
  legendText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  calendarCard: {
    padding: SPACING.sm,
  },
  addCard: {
    marginTop: SPACING.md,
    padding: SPACING.md,
  },
  addTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  addDate: {
    fontSize: FONT_SIZES.md,
    color: COLORS.primary,
    fontWeight: '500',
    marginBottom: SPACING.md,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  cancelButton: {
    flex: 1,
  },
  addButton: {
    flex: 2,
  },
  instructionsCard: {
    marginTop: SPACING.md,
    padding: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  instructionsText: {
    flex: 1,
    marginLeft: SPACING.md,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
});
