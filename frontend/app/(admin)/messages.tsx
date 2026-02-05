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
import { Message } from '../../src/types';
import { useAuthStore } from '../../src/store/authStore';

export default function AdminMessagesScreen() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [showCompose, setShowCompose] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [showReply, setShowReply] = useState(false);
  const [sending, setSending] = useState(false);

  // Compose form
  const [recipientId, setRecipientId] = useState('');
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    fetchMessages();
    fetchUsers();
  }, []);

  const fetchMessages = async () => {
    try {
      const response = await api.get('/messages');
      setMessages(response.data);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await api.get('/admin/users');
      setUsers(response.data.filter((u: any) => u.id !== user?.id));
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchMessages();
    setRefreshing(false);
  };

  const handleSend = async () => {
    if (!recipientId || !subject || !content) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }

    setSending(true);
    try {
      await api.post('/messages', {
        recipient_id: recipientId,
        subject,
        content,
      });
      Alert.alert('Success', 'Message sent');
      setShowCompose(false);
      setRecipientId('');
      setSubject('');
      setContent('');
      fetchMessages();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to send');
    } finally {
      setSending(false);
    }
  };

  const handleReply = async () => {
    if (!selectedMessage || !content) {
      Alert.alert('Error', 'Please enter a message');
      return;
    }

    setSending(true);
    try {
      await api.post('/messages', {
        recipient_id: selectedMessage.sender_id,
        subject: `Re: ${selectedMessage.subject}`,
        content,
      });
      Alert.alert('Success', 'Reply sent');
      setShowReply(false);
      setSelectedMessage(null);
      setContent('');
      fetchMessages();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to send');
    } finally {
      setSending(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return <LoadingScreen message="Loading messages..." />;
  }

  const inboxMessages = messages.filter(m => m.recipient_id === user?.id);
  const sentMessages = messages.filter(m => m.sender_id === user?.id);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Messages</Text>
        <Button
          title="+ Compose"
          onPress={() => setShowCompose(true)}
          size="small"
        />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Inbox */}
        <Text style={styles.sectionTitle}>Inbox ({inboxMessages.length})</Text>
        {inboxMessages.length > 0 ? (
          inboxMessages.map((message) => (
            <TouchableOpacity
              key={message.id}
              onPress={() => {
                setSelectedMessage(message);
                setShowReply(true);
              }}
            >
              <Card style={[styles.messageCard, !message.is_read && styles.unreadCard]}>
                <View style={styles.messageHeader}>
                  <View style={styles.messageInfo}>
                    <Text style={[styles.senderName, !message.is_read && styles.unreadText]}>
                      {message.sender_name}
                    </Text>
                    <Text style={styles.messageDate}>{formatDate(message.created_at)}</Text>
                  </View>
                  {!message.is_read && <View style={styles.unreadDot} />}
                </View>
                <Text style={[styles.messageSubject, !message.is_read && styles.unreadText]}>
                  {message.subject}
                </Text>
                <Text style={styles.messagePreview} numberOfLines={2}>
                  {message.content}
                </Text>
              </Card>
            </TouchableOpacity>
          ))
        ) : (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyText}>No messages in inbox</Text>
          </Card>
        )}

        {/* Sent */}
        <Text style={styles.sectionTitle}>Sent ({sentMessages.length})</Text>
        {sentMessages.length > 0 ? (
          sentMessages.map((message) => (
            <Card key={message.id} style={styles.messageCard}>
              <View style={styles.messageHeader}>
                <View style={styles.messageInfo}>
                  <Text style={styles.senderName}>To: {message.recipient_name}</Text>
                  <Text style={styles.messageDate}>{formatDate(message.created_at)}</Text>
                </View>
              </View>
              <Text style={styles.messageSubject}>{message.subject}</Text>
              <Text style={styles.messagePreview} numberOfLines={2}>
                {message.content}
              </Text>
            </Card>
          ))
        ) : (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyText}>No sent messages</Text>
          </Card>
        )}
      </ScrollView>

      {/* Compose Modal */}
      <Modal
        visible={showCompose}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCompose(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Compose Message</Text>
            <TouchableOpacity onPress={() => setShowCompose(false)}>
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={styles.fieldLabel}>Recipient</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.recipientScroll}
            >
              {users.map((u) => (
                <TouchableOpacity
                  key={u.id}
                  style={[
                    styles.recipientChip,
                    recipientId === u.id && styles.recipientChipSelected,
                  ]}
                  onPress={() => setRecipientId(u.id)}
                >
                  <Text style={[
                    styles.recipientChipText,
                    recipientId === u.id && styles.recipientChipTextSelected,
                  ]}>
                    {u.first_name} {u.last_name} ({u.role})
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Input
              label="Subject"
              placeholder="Message subject"
              value={subject}
              onChangeText={setSubject}
            />

            <Input
              label="Message"
              placeholder="Type your message..."
              value={content}
              onChangeText={setContent}
              multiline
              numberOfLines={6}
            />

            <Button
              title="Send Message"
              onPress={handleSend}
              loading={sending}
              fullWidth
              style={styles.sendButton}
            />
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Reply Modal */}
      <Modal
        visible={showReply && selectedMessage !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          setShowReply(false);
          setSelectedMessage(null);
        }}
      >
        {selectedMessage && (
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Message</Text>
              <TouchableOpacity onPress={() => {
                setShowReply(false);
                setSelectedMessage(null);
              }}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              <Card style={styles.originalMessage}>
                <View style={styles.originalHeader}>
                  <Text style={styles.originalFrom}>From: {selectedMessage.sender_name}</Text>
                  <Text style={styles.originalDate}>{formatDate(selectedMessage.created_at)}</Text>
                </View>
                <Text style={styles.originalSubject}>{selectedMessage.subject}</Text>
                <Text style={styles.originalContent}>{selectedMessage.content}</Text>
              </Card>

              <Text style={styles.replyLabel}>Reply</Text>
              <Input
                placeholder="Type your reply..."
                value={content}
                onChangeText={setContent}
                multiline
                numberOfLines={4}
              />

              <Button
                title="Send Reply"
                onPress={handleReply}
                loading={sending}
                fullWidth
                style={styles.sendButton}
              />
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
  title: {
    fontSize: FONT_SIZES.xl,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  content: {
    padding: SPACING.md,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.sm,
    marginTop: SPACING.md,
  },
  messageCard: {
    marginBottom: SPACING.sm,
    padding: SPACING.md,
  },
  unreadCard: {
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  messageInfo: {
    flex: 1,
  },
  senderName: {
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
  },
  unreadText: {
    fontWeight: '600',
  },
  messageDate: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
  },
  messageSubject: {
    fontSize: FONT_SIZES.md,
    color: COLORS.primary,
    marginBottom: SPACING.xs,
  },
  messagePreview: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  emptyCard: {
    padding: SPACING.lg,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
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
  },
  recipientScroll: {
    marginBottom: SPACING.md,
  },
  recipientChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.round,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: SPACING.sm,
    backgroundColor: COLORS.surface,
  },
  recipientChipSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  recipientChipText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
  },
  recipientChipTextSelected: {
    color: COLORS.textLight,
    fontWeight: '600',
  },
  sendButton: {
    marginTop: SPACING.lg,
  },
  originalMessage: {
    marginBottom: SPACING.lg,
    padding: SPACING.md,
    backgroundColor: COLORS.background,
  },
  originalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  originalFrom: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.text,
  },
  originalDate: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
  },
  originalSubject: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: SPACING.sm,
  },
  originalContent: {
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    lineHeight: 22,
  },
  replyLabel: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
});
