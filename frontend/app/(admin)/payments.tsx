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
import { Payment, PaymentStatus } from '../../src/types';

export default function AdminPaymentsScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [showResolve, setShowResolve] = useState(false);
  const [resolveResponse, setResolveResponse] = useState('');
  const [newAmount, setNewAmount] = useState('');

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      const response = await api.get('/payments');
      setPayments(response.data);
    } catch (error) {
      console.error('Error fetching payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchPayments();
    setRefreshing(false);
  };

  const updatePaymentStatus = async (paymentId: string, status: PaymentStatus) => {
    try {
      await api.put(`/payments/${paymentId}/status?status=${status}`);
      Alert.alert('Success', 'Payment status updated');
      fetchPayments();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to update');
    }
  };

  const handleResolveDispute = async () => {
    if (!selectedPayment || !resolveResponse.trim()) {
      Alert.alert('Error', 'Please enter a response');
      return;
    }

    try {
      const params = new URLSearchParams();
      params.append('response', resolveResponse);
      if (newAmount) params.append('new_amount', newAmount);

      await api.put(`/payments/${selectedPayment.id}/resolve-dispute?${params.toString()}`);
      Alert.alert('Success', 'Dispute resolved');
      setShowResolve(false);
      setSelectedPayment(null);
      setResolveResponse('');
      setNewAmount('');
      fetchPayments();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to resolve');
    }
  };

  const filteredPayments = filter === 'all' ? payments : payments.filter(p => p.status === filter);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return COLORS.success;
      case 'pending': return COLORS.warning;
      case 'approved': return COLORS.info;
      case 'disputed': return COLORS.error;
      case 'resolved': return COLORS.primary;
      default: return COLORS.textSecondary;
    }
  };

  const formatCurrency = (amount: number) => `£${amount.toFixed(2)}`;

  if (loading) {
    return <LoadingScreen message="Loading payments..." />;
  }

  // Calculate totals
  const totalPending = payments
    .filter(p => p.status === 'pending')
    .reduce((sum, p) => sum + p.net_to_talent, 0);
  const totalDisputed = payments
    .filter(p => p.status === 'disputed')
    .reduce((sum, p) => sum + p.net_to_talent, 0);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Summary */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryAmount}>{formatCurrency(totalPending)}</Text>
          <Text style={styles.summaryLabel}>Pending</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryAmount, { color: COLORS.error }]}>{formatCurrency(totalDisputed)}</Text>
          <Text style={styles.summaryLabel}>Disputed</Text>
        </View>
      </View>

      {/* Filter Tabs */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        style={styles.filterContainer}
        contentContainerStyle={styles.filterContent}
      >
        {['all', 'pending', 'approved', 'disputed', 'paid', 'resolved'].map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterTab, filter === f && styles.filterTabActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {filteredPayments.length > 0 ? (
          filteredPayments.map((payment) => (
            <Card key={payment.id} style={styles.paymentCard}>
              <View style={styles.paymentHeader}>
                <View style={styles.paymentInfo}>
                  <Text style={styles.paymentReceipt}>#{payment.receipt_number}</Text>
                  <Text style={styles.paymentTalent}>{payment.talent_name}</Text>
                  <Text style={styles.paymentJob}>{payment.job_title}</Text>
                </View>
                <View style={styles.paymentAmountContainer}>
                  <Text style={styles.paymentAmount}>{formatCurrency(payment.net_to_talent)}</Text>
                  <View style={[
                    styles.statusBadge,
                    { backgroundColor: getStatusColor(payment.status) + '20' }
                  ]}>
                    <Text style={[styles.statusText, { color: getStatusColor(payment.status) }]}>
                      {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Breakdown */}
              <View style={styles.breakdown}>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Gross:</Text>
                  <Text style={styles.breakdownValue}>{formatCurrency(payment.gross_total)}</Text>
                </View>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Agency Fee ({payment.company_fee_percent}%):</Text>
                  <Text style={styles.breakdownValue}>-{formatCurrency(payment.company_fee_amount)}</Text>
                </View>
              </View>

              {/* Dispute Info */}
              {payment.status === 'disputed' && payment.dispute_reason && (
                <View style={styles.disputeBox}>
                  <Ionicons name="alert-circle" size={16} color={COLORS.error} />
                  <Text style={styles.disputeText}>{payment.dispute_reason}</Text>
                </View>
              )}

              {/* Actions */}
              <View style={styles.paymentActions}>
                {payment.status === 'pending' && (
                  <>
                    <TouchableOpacity
                      style={[styles.actionButton, { backgroundColor: COLORS.info + '20' }]}
                      onPress={() => updatePaymentStatus(payment.id, 'approved' as PaymentStatus)}
                    >
                      <Text style={[styles.actionButtonText, { color: COLORS.info }]}>Approve</Text>
                    </TouchableOpacity>
                  </>
                )}
                {payment.status === 'approved' && (
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: COLORS.success + '20' }]}
                    onPress={() => updatePaymentStatus(payment.id, 'paid' as PaymentStatus)}
                  >
                    <Text style={[styles.actionButtonText, { color: COLORS.success }]}>Mark as Paid</Text>
                  </TouchableOpacity>
                )}
                {payment.status === 'disputed' && (
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: COLORS.primary + '20' }]}
                    onPress={() => {
                      setSelectedPayment(payment);
                      setShowResolve(true);
                    }}
                  >
                    <Text style={[styles.actionButtonText, { color: COLORS.primary }]}>Resolve Dispute</Text>
                  </TouchableOpacity>
                )}
              </View>
            </Card>
          ))
        ) : (
          <Card style={styles.emptyCard}>
            <Ionicons name="wallet-outline" size={48} color={COLORS.textSecondary} />
            <Text style={styles.emptyTitle}>No Payments</Text>
            <Text style={styles.emptyText}>
              {filter === 'all' ? 'No payments created yet' : `No ${filter} payments`}
            </Text>
          </Card>
        )}
      </ScrollView>

      {/* Resolve Dispute Modal */}
      <Modal
        visible={showResolve}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowResolve(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Resolve Dispute</Text>
            <TouchableOpacity onPress={() => setShowResolve(false)}>
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {selectedPayment && (
              <>
                <Card style={styles.disputeCard}>
                  <Text style={styles.disputeLabel}>Original Dispute:</Text>
                  <Text style={styles.disputeReason}>{selectedPayment.dispute_reason}</Text>
                </Card>

                <Input
                  label="Your Response *"
                  placeholder="Explain how this dispute has been resolved..."
                  value={resolveResponse}
                  onChangeText={setResolveResponse}
                  multiline
                  numberOfLines={4}
                />

                <Input
                  label="Adjusted Amount (optional)"
                  placeholder={`Current: ${formatCurrency(selectedPayment.net_to_talent)}`}
                  value={newAmount}
                  onChangeText={setNewAmount}
                  keyboardType="numeric"
                />

                <Button
                  title="Resolve Dispute"
                  onPress={handleResolveDispute}
                  fullWidth
                  style={styles.resolveButton}
                />
              </>
            )}
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
  summaryContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryDivider: {
    width: 1,
    backgroundColor: COLORS.border,
  },
  summaryAmount: {
    fontSize: FONT_SIZES.xl,
    fontWeight: 'bold',
    color: COLORS.warning,
  },
  summaryLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
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
  paymentCard: {
    marginBottom: SPACING.md,
    padding: SPACING.md,
  },
  paymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  paymentInfo: {
    flex: 1,
  },
  paymentReceipt: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
  },
  paymentTalent: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
  },
  paymentJob: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.primary,
  },
  paymentAmountContainer: {
    alignItems: 'flex-end',
  },
  paymentAmount: {
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
    color: COLORS.success,
  },
  statusBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.round,
    marginTop: SPACING.xs,
  },
  statusText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
  },
  breakdown: {
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.sm,
    marginTop: SPACING.md,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.xs,
  },
  breakdownLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  breakdownValue: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
  },
  disputeBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.error + '10',
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.sm,
    marginTop: SPACING.md,
  },
  disputeText: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
    color: COLORS.error,
    marginLeft: SPACING.sm,
  },
  paymentActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
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
  actionButtonText: {
    fontSize: FONT_SIZES.sm,
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
  disputeCard: {
    marginBottom: SPACING.lg,
    padding: SPACING.md,
    backgroundColor: COLORS.warning + '10',
  },
  disputeLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  disputeReason: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
  },
  resolveButton: {
    marginTop: SPACING.lg,
  },
});
