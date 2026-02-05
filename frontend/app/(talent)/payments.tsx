import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../../src/components/Card';
import { Button } from '../../src/components/Button';
import { Input } from '../../src/components/Input';
import { LoadingScreen } from '../../src/components/LoadingScreen';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../../src/constants/theme';
import api from '../../src/api/client';
import { Payment } from '../../src/types';

export default function PaymentsScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [showDispute, setShowDispute] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');

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

  const handleDispute = async () => {
    if (!selectedPayment || !disputeReason.trim()) {
      Alert.alert('Error', 'Please enter a reason for the dispute');
      return;
    }

    try {
      await api.post(`/payments/${selectedPayment.id}/dispute?reason=${encodeURIComponent(disputeReason)}`);
      Alert.alert('Success', 'Your dispute has been submitted');
      setShowDispute(false);
      setSelectedPayment(null);
      setDisputeReason('');
      fetchPayments();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to submit dispute');
    }
  };

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

  const formatStatus = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const formatCurrency = (amount: number) => {
    return `£${amount.toFixed(2)}`;
  };

  // Calculate totals
  const totalPaid = payments
    .filter(p => p.status === 'paid')
    .reduce((sum, p) => sum + p.net_to_talent, 0);
  const totalPending = payments
    .filter(p => ['pending', 'approved'].includes(p.status))
    .reduce((sum, p) => sum + p.net_to_talent, 0);

  if (loading) {
    return <LoadingScreen message="Loading payments..." />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Summary Cards */}
        <View style={styles.summaryRow}>
          <Card style={styles.summaryCard}>
            <Ionicons name="checkmark-circle" size={24} color={COLORS.success} />
            <Text style={styles.summaryAmount}>{formatCurrency(totalPaid)}</Text>
            <Text style={styles.summaryLabel}>Total Paid</Text>
          </Card>
          <Card style={styles.summaryCard}>
            <Ionicons name="time" size={24} color={COLORS.warning} />
            <Text style={styles.summaryAmount}>{formatCurrency(totalPending)}</Text>
            <Text style={styles.summaryLabel}>Pending</Text>
          </Card>
        </View>

        {/* Payments List */}
        <Text style={styles.sectionTitle}>Payment History</Text>

        {payments.length > 0 ? (
          payments.map((payment) => (
            <Card key={payment.id} style={styles.paymentCard}>
              <TouchableOpacity onPress={() => setSelectedPayment(payment)}>
                <View style={styles.paymentHeader}>
                  <View style={styles.paymentInfo}>
                    <Text style={styles.paymentTitle}>{payment.job_title || 'Job'}</Text>
                    <Text style={styles.paymentProduction}>{payment.production_name}</Text>
                  </View>
                  <View style={styles.paymentAmountContainer}>
                    <Text style={styles.paymentAmount}>{formatCurrency(payment.net_to_talent)}</Text>
                    <View style={[
                      styles.statusBadge,
                      { backgroundColor: getStatusColor(payment.status) + '20' }
                    ]}>
                      <Text style={[styles.statusText, { color: getStatusColor(payment.status) }]}>
                        {formatStatus(payment.status)}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.paymentDetails}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Receipt #:</Text>
                    <Text style={styles.detailValue}>{payment.receipt_number}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Work Dates:</Text>
                    <Text style={styles.detailValue}>
                      {payment.work_dates.map(d => formatDate(d)).join(', ')}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Created:</Text>
                    <Text style={styles.detailValue}>{formatDate(payment.created_at)}</Text>
                  </View>
                </View>

                <TouchableOpacity 
                  style={styles.viewDetailsButton}
                  onPress={() => setSelectedPayment(payment)}
                >
                  <Text style={styles.viewDetailsText}>View Breakdown</Text>
                  <Ionicons name="chevron-forward" size={16} color={COLORS.primary} />
                </TouchableOpacity>
              </TouchableOpacity>
            </Card>
          ))
        ) : (
          <Card style={styles.emptyCard}>
            <Ionicons name="wallet-outline" size={48} color={COLORS.textSecondary} />
            <Text style={styles.emptyTitle}>No Payments</Text>
            <Text style={styles.emptyText}>Your payment history will appear here</Text>
          </Card>
        )}
      </ScrollView>

      {/* Payment Detail Modal */}
      <Modal
        visible={selectedPayment !== null && !showDispute}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedPayment(null)}
      >
        {selectedPayment && (
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Payment Breakdown</Text>
              <TouchableOpacity onPress={() => setSelectedPayment(null)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              {/* Receipt Info */}
              <Card style={styles.receiptCard}>
                <Text style={styles.receiptNumber}>Receipt #{selectedPayment.receipt_number}</Text>
                <Text style={styles.receiptJob}>{selectedPayment.job_title}</Text>
                <Text style={styles.receiptProduction}>{selectedPayment.production_name}</Text>
                <View style={[
                  styles.receiptStatus,
                  { backgroundColor: getStatusColor(selectedPayment.status) + '15' }
                ]}>
                  <Text style={[styles.receiptStatusText, { color: getStatusColor(selectedPayment.status) }]}>
                    {formatStatus(selectedPayment.status)}
                  </Text>
                </View>
              </Card>

              {/* Line Items */}
              <Text style={styles.breakdownTitle}>Earnings Breakdown</Text>
              <Card style={styles.breakdownCard}>
                {selectedPayment.line_items.map((item, index) => (
                  <View key={index} style={styles.lineItem}>
                    <View style={styles.lineItemInfo}>
                      <Text style={styles.lineItemName}>{item.description}</Text>
                      <Text style={styles.lineItemType}>{item.rate_type}</Text>
                    </View>
                    <View style={styles.lineItemValues}>
                      <Text style={styles.lineItemQty}>
                        {item.quantity} x {formatCurrency(item.unit_rate)}
                      </Text>
                      <Text style={styles.lineItemTotal}>{formatCurrency(item.total)}</Text>
                    </View>
                  </View>
                ))}

                <View style={styles.totalsDivider} />

                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Gross Total</Text>
                  <Text style={styles.totalValue}>{formatCurrency(selectedPayment.gross_total)}</Text>
                </View>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Agency Fee ({selectedPayment.company_fee_percent}%)</Text>
                  <Text style={[styles.totalValue, { color: COLORS.error }]}>
                    -{formatCurrency(selectedPayment.company_fee_amount)}
                  </Text>
                </View>
                <View style={[styles.totalRow, styles.netRow]}>
                  <Text style={styles.netLabel}>Net to You</Text>
                  <Text style={styles.netValue}>{formatCurrency(selectedPayment.net_to_talent)}</Text>
                </View>
              </Card>

              {/* Dispute Button */}
              {['pending', 'approved'].includes(selectedPayment.status) && (
                <Button
                  title="Query This Payment"
                  onPress={() => setShowDispute(true)}
                  variant="outline"
                  fullWidth
                  style={styles.disputeButton}
                />
              )}

              {selectedPayment.status === 'disputed' && (
                <Card style={styles.disputeCard}>
                  <Ionicons name="alert-circle" size={24} color={COLORS.warning} />
                  <Text style={styles.disputeTitle}>Under Review</Text>
                  <Text style={styles.disputeReason}>{selectedPayment.dispute_reason}</Text>
                </Card>
              )}
            </ScrollView>
          </SafeAreaView>
        )}
      </Modal>

      {/* Dispute Modal */}
      <Modal
        visible={showDispute}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowDispute(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Query Payment</Text>
            <TouchableOpacity onPress={() => setShowDispute(false)}>
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <Text style={styles.disputeInstructions}>
              Please explain why you believe this payment is incorrect. Our team will review and respond.
            </Text>

            <Input
              label="Reason for query"
              placeholder="Describe the issue with this payment..."
              value={disputeReason}
              onChangeText={setDisputeReason}
              multiline
              numberOfLines={5}
            />

            <Button
              title="Submit Query"
              onPress={handleDispute}
              fullWidth
              style={styles.submitDisputeButton}
            />
          </View>
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
  summaryRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  summaryCard: {
    flex: 1,
    alignItems: 'center',
    padding: SPACING.md,
  },
  summaryAmount: {
    fontSize: FONT_SIZES.xl,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: SPACING.sm,
  },
  summaryLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  paymentCard: {
    marginBottom: SPACING.md,
    padding: SPACING.md,
  },
  paymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  paymentInfo: {
    flex: 1,
  },
  paymentTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
  },
  paymentProduction: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
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
  paymentDetails: {
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: SPACING.xs,
  },
  detailLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    width: 90,
  },
  detailValue: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    flex: 1,
  },
  viewDetailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  viewDetailsText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.primary,
    fontWeight: '500',
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
  receiptCard: {
    alignItems: 'center',
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  receiptNumber: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  receiptJob: {
    fontSize: FONT_SIZES.xl,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  receiptProduction: {
    fontSize: FONT_SIZES.md,
    color: COLORS.primary,
    marginBottom: SPACING.md,
  },
  receiptStatus: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.round,
  },
  receiptStatusText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },
  breakdownTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  breakdownCard: {
    padding: SPACING.md,
  },
  lineItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  lineItemInfo: {
    flex: 1,
  },
  lineItemName: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
    color: COLORS.text,
  },
  lineItemType: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
  },
  lineItemValues: {
    alignItems: 'flex-end',
  },
  lineItemQty: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
  },
  lineItemTotal: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
    color: COLORS.text,
  },
  totalsDivider: {
    height: 2,
    backgroundColor: COLORS.primary,
    marginVertical: SPACING.md,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.xs,
  },
  totalLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  totalValue: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
  },
  netRow: {
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  netLabel: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
  },
  netValue: {
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
    color: COLORS.success,
  },
  disputeButton: {
    marginTop: SPACING.lg,
  },
  disputeCard: {
    marginTop: SPACING.lg,
    padding: SPACING.md,
    alignItems: 'center',
    backgroundColor: COLORS.warning + '10',
  },
  disputeTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.warning,
    marginTop: SPACING.sm,
  },
  disputeReason: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.sm,
  },
  disputeInstructions: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    marginBottom: SPACING.lg,
    lineHeight: 22,
  },
  submitDisputeButton: {
    marginTop: SPACING.lg,
  },
});
