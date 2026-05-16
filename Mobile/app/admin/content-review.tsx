import React, { useState, useEffect } from 'react';
import { responsiveFontSize } from '@/constants/Fonts';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  Modal,
  TextInput,
} from 'react-native';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useAppAlert } from '@/context/AppAlertContext';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import {
  contentReviewService,
  serviceProviderService,
  type ContentReview,
  type ServiceProvider,
} from '@/services/serviceProvider';

export default function AdminContentReview() {
  const colorScheme = useColorScheme();
  const { showAlert } = useAppAlert();
  const [reviews, setReviews] = useState<ContentReview[]>([]);
  const [providers, setProviders] = useState<ServiceProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedReview, setSelectedReview] = useState<ContentReview | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [reviewNotes, setReviewNotes] = useState('');
  const [changesRequested, setChangesRequested] = useState('');

  const loadData = async () => {
    try {
      const [reviewsResult, providersResult] = await Promise.all([
        contentReviewService.getPendingReviews(),
        serviceProviderService.getAllProviders({ verification_status: 'verified' }),
      ]);

      if (!reviewsResult.error && reviewsResult.data) {
        setReviews(reviewsResult.data);
      }

      if (!providersResult.error && providersResult.data) {
        setProviders(providersResult.data);
      }
    } catch (error) {
      console.error('Error loading admin data:', error);
        showAlert({ title: 'Error', message: 'Failed to load review data', buttons: [{ text: 'OK' }] });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleReview = async (approved: boolean) => {
    if (!selectedReview) return;

    try {
      const { error } = await contentReviewService.reviewContent(
        selectedReview.id,
        approved,
        reviewNotes,
        changesRequested
      );

      if (error) {
        showAlert({ title: 'Error', message: 'Failed to submit review', buttons: [{ text: 'OK' }] });
        return;
      }

      showAlert({ title: 'Success', message: `Content ${approved ? 'approved' : 'rejected'} successfully`, buttons: [{ text: 'OK' }] });

      // Refresh the list
      setModalVisible(false);
      setSelectedReview(null);
      setReviewNotes('');
      setChangesRequested('');
      loadData();
    } catch (error) {
      console.error('Error submitting review:', error);
      showAlert({ title: 'Error', message: 'An unexpected error occurred', buttons: [{ text: 'OK' }] });
    }
  };

  const openReviewModal = (review: ContentReview) => {
    setSelectedReview(review);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedReview(null);
    setReviewNotes('');
    setChangesRequested('');
  };

  const getContentTypeIcon = (type: string) => {
    switch (type) {
      case 'destination':
        return 'ðŸžï¸';
      case 'stay':
        return 'ðŸ¨';
      case 'event':
        return 'ðŸŽ­';
      default:
        return 'ðŸ“„';
    }
  };

  const getProviderName = (providerId: string) => {
    const provider = providers.find(p => p.id === providerId);
    return provider?.business_name || 'Unknown Provider';
  };

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText>Loading reviews...</ThemedText>
      </ThemedView>
    );
  }

  return (
    <View
      style={[styles.container, { backgroundColor: Colors[colorScheme ?? 'light'].background }]}
    >
      <ThemedView style={styles.header}>
        <ThemedText style={styles.title}>Content Review Queue</ThemedText>
        <ThemedText style={styles.subtitle}>{reviews.length} items pending review</ThemedText>
      </ThemedView>

      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {reviews.length === 0 ? (
          <ThemedView style={styles.emptyState}>
            <ThemedText style={styles.emptyStateText}>No content pending review</ThemedText>
          </ThemedView>
        ) : (
          reviews.map(review => (
            <TouchableOpacity
              key={review.id}
              style={[
                styles.reviewCard,
                {
                  backgroundColor: Colors[colorScheme ?? 'light'].background,
                  borderColor: Colors[colorScheme ?? 'light'].text + '20',
                },
              ]}
              onPress={() => openReviewModal(review)}
            >
              <View style={styles.reviewHeader}>
                <View style={styles.contentInfo}>
                  <Text style={styles.contentIcon}>{getContentTypeIcon(review.content_type)}</Text>
                  <View style={styles.contentDetails}>
                    <ThemedText style={styles.contentTitle}>
                      {review.content_type.toUpperCase()} Content
                    </ThemedText>
                    <ThemedText style={styles.providerName}>
                      by {getProviderName(review.provider_id)}
                    </ThemedText>
                  </View>
                </View>
                <View style={styles.reviewStatus}>
                  <Text style={[styles.statusBadge, styles.pendingBadge]}>Pending</Text>
                </View>
              </View>

              <ThemedText style={styles.submissionDate}>
                Submitted: {new Date(review.created_at).toLocaleDateString()}
              </ThemedText>

              {review.submission_notes && (
                <ThemedText style={styles.submissionNotes}>
                  &ldquo;{review.submission_notes}&rdquo;
                </ThemedText>
              )}

              <View style={styles.reviewActions}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.approveButton]}
                  onPress={() => openReviewModal(review)}
                >
                  <Text style={styles.actionButtonText}>Review</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Review Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeModal}
      >
        <View
          style={[
            styles.modalContainer,
            { backgroundColor: Colors[colorScheme ?? 'light'].background },
          ]}
        >
          <ThemedView style={styles.modalHeader}>
            <TouchableOpacity onPress={closeModal} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>Cancel</Text>
            </TouchableOpacity>
            <ThemedText style={styles.modalTitle}>Review Content</ThemedText>
            <View style={styles.closeButton} />
          </ThemedView>

          <ScrollView style={styles.modalContent}>
            {selectedReview && (
              <>
                <ThemedView style={styles.contentSummary}>
                  <Text style={styles.contentIcon}>
                    {getContentTypeIcon(selectedReview.content_type)}
                  </Text>
                  <ThemedText style={styles.contentSummaryText}>
                    {selectedReview.content_type.toUpperCase()} by{' '}
                    {getProviderName(selectedReview.provider_id)}
                  </ThemedText>
                </ThemedView>

                {selectedReview.submission_notes && (
                  <ThemedView style={styles.notesSection}>
                    <ThemedText style={styles.notesTitle}>Submission Notes:</ThemedText>
                    <ThemedText style={styles.notesText}>
                      {selectedReview.submission_notes}
                    </ThemedText>
                  </ThemedView>
                )}

                <ThemedView style={styles.reviewForm}>
                  <ThemedText style={styles.formLabel}>Review Notes</ThemedText>
                  <TextInput
                    style={[
                      styles.textInput,
                      {
                        backgroundColor: Colors[colorScheme ?? 'light'].background,
                        borderColor: Colors[colorScheme ?? 'light'].text + '20',
                        color: Colors[colorScheme ?? 'light'].text,
                      },
                    ]}
                    multiline
                    numberOfLines={3}
                    value={reviewNotes}
                    onChangeText={setReviewNotes}
                    placeholder="Add notes about this content..."
                    placeholderTextColor={Colors[colorScheme ?? 'light'].text + '60'}
                  />

                  <ThemedText style={styles.formLabel}>Changes Requested (optional)</ThemedText>
                  <TextInput
                    style={[
                      styles.textInput,
                      {
                        backgroundColor: Colors[colorScheme ?? 'light'].background,
                        borderColor: Colors[colorScheme ?? 'light'].text + '20',
                        color: Colors[colorScheme ?? 'light'].text,
                      },
                    ]}
                    multiline
                    numberOfLines={3}
                    value={changesRequested}
                    onChangeText={setChangesRequested}
                    placeholder="Specific changes needed for approval..."
                    placeholderTextColor={Colors[colorScheme ?? 'light'].text + '60'}
                  />
                </ThemedView>

                <ThemedView style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.modalActionButton, styles.rejectButton]}
                    onPress={() => handleReview(false)}
                  >
                    <Text style={styles.modalActionButtonText}>Reject</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.modalActionButton, styles.approveModalButton]}
                    onPress={() => handleReview(true)}
                  >
                    <Text style={styles.modalActionButtonText}>Approve</Text>
                  </TouchableOpacity>
                </ThemedView>
              </>
            )}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  title: {
    fontSize: responsiveFontSize(24),
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: responsiveFontSize(16),
    opacity: 0.7,
  },
  scrollView: {
    flex: 1,
    padding: 20,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: responsiveFontSize(16),
    opacity: 0.7,
  },
  reviewCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  contentInfo: {
    flexDirection: 'row',
    flex: 1,
  },
  contentIcon: {
    fontSize: responsiveFontSize(24),
    marginRight: 12,
  },
  contentDetails: {
    flex: 1,
  },
  contentTitle: {
    fontSize: responsiveFontSize(16),
    fontWeight: '600',
    marginBottom: 2,
  },
  providerName: {
    fontSize: responsiveFontSize(14),
    opacity: 0.7,
  },
  reviewStatus: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    fontSize: responsiveFontSize(12),
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  pendingBadge: {
    backgroundColor: '#FEF3C7',
    color: '#92400E',
  },
  submissionDate: {
    fontSize: responsiveFontSize(12),
    opacity: 0.6,
    marginBottom: 8,
  },
  submissionNotes: {
    fontSize: responsiveFontSize(14),
    fontStyle: 'italic',
    opacity: 0.8,
    marginBottom: 12,
  },
  reviewActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  approveButton: {
    backgroundColor: '#3B82F6',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: responsiveFontSize(14),
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  closeButton: {
    width: 60,
  },
  closeButtonText: {
    color: '#007AFF',
    fontSize: responsiveFontSize(16),
  },
  modalTitle: {
    fontSize: responsiveFontSize(18),
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  contentSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    marginBottom: 20,
  },
  contentSummaryText: {
    fontSize: responsiveFontSize(16),
    fontWeight: '500',
    marginLeft: 12,
  },
  notesSection: {
    marginBottom: 20,
  },
  notesTitle: {
    fontSize: responsiveFontSize(14),
    fontWeight: '600',
    marginBottom: 8,
  },
  notesText: {
    fontSize: responsiveFontSize(14),
    opacity: 0.8,
    lineHeight: 20,
  },
  reviewForm: {
    marginBottom: 30,
  },
  formLabel: {
    fontSize: responsiveFontSize(14),
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 16,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: responsiveFontSize(16),
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 20,
  },
  modalActionButton: {
    flex: 1,
    marginHorizontal: 8,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  rejectButton: {
    backgroundColor: '#EF4444',
  },
  approveModalButton: {
    backgroundColor: '#22C55E',
  },
  modalActionButtonText: {
    color: '#FFFFFF',
    fontSize: responsiveFontSize(16),
    fontWeight: '600',
  },
});