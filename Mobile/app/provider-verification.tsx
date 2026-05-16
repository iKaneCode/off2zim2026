import React, { useState } from 'react';
import { responsiveFontSize } from '@/constants/Fonts';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useAppAlert } from '@/context/AppAlertContext';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { serviceProviderService } from '@/services/serviceProvider';
import * as DocumentPicker from 'expo-document-picker';

export default function ProviderVerification() {
  const colorScheme = useColorScheme();
  const { showAlert } = useAppAlert();
  const [loading, setLoading] = useState(false);
  const [uploadedDocs, setUploadedDocs] = useState<string[]>([]);
  const [docUrls, setDocUrls] = useState<string[]>([]);

  const requiredDocuments = [
    {
      id: 'business_license',
      title: 'Business License',
      description: 'Official business registration or trading license',
      required: true,
    },
    {
      id: 'tax_clearance',
      title: 'Tax Clearance Certificate',
      description: 'Current tax clearance from ZIMRA',
      required: true,
    },
    {
      id: 'insurance',
      title: 'Insurance Certificate',
      description: 'Public liability or professional indemnity insurance',
      required: false,
    },
    {
      id: 'tourism_license',
      title: 'Tourism License',
      description: 'Zimbabwe Tourism Authority (ZTA) license if applicable',
      required: false,
    },
  ];

  const pickDocument = async (docType: string) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        const file = result.assets[0];
        setLoading(true);

        // Convert to File-like object for upload
        const fileData = {
          uri: file.uri,
          type: file.mimeType || 'application/pdf',
          name: file.name || `${docType}_${Date.now()}.pdf`,
        } as any;

        const { data, error } = await serviceProviderService.uploadVerificationDocument(
          fileData,
          fileData.name
        );

        if (error) {
        showAlert({ title: 'Error', message: 'Failed to upload document', buttons: [{ text: 'OK' }] });
          return;
        }

        if (data) {
          setUploadedDocs(prev => [...prev, docType]);
          setDocUrls(prev => [...prev, data.url]);
          showAlert({ title: 'Success', message: 'Document uploaded successfully', buttons: [{ text: 'OK' }] });
        }
      }
    } catch (error) {
      console.error('Document picker error:', error);
      showAlert({ title: 'Error', message: 'Failed to pick document', buttons: [{ text: 'OK' }] });
    } finally {
      setLoading(false);
    }
  };

  const submitForVerification = async () => {
    const requiredUploaded = requiredDocuments
      .filter(doc => doc.required)
      .every(doc => uploadedDocs.includes(doc.id));

    if (!requiredUploaded) {
      showAlert({ title: 'Missing Documents', message: 'Please upload all required documents before submitting.', buttons: [{ text: 'OK' }] });
      return;
    }

    setLoading(true);
    try {
      const { error } = await serviceProviderService.submitForVerification(
        docUrls,
        'Initial verification submission'
      );

      if (error) {
        showAlert({ title: 'Error', message: 'Failed to submit for verification', buttons: [{ text: 'OK' }] });
        return;
      }

      showAlert({
        title: 'Submitted Successfully!',
        message:
          'Your documents have been submitted for verification. We will review them within 2-3 business days and notify you of the outcome.',
        buttons: [{ text: 'OK' }],
      });
    } catch (error) {
      console.error('Verification submission error:', error);
      showAlert({ title: 'Error', message: 'An unexpected error occurred', buttons: [{ text: 'OK' }] });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: Colors[colorScheme ?? 'light'].background }]}
    >
      <ThemedView style={styles.header}>
        <ThemedText style={styles.title}>Business Verification</ThemedText>
        <ThemedText style={styles.subtitle}>
          Upload your business documents to get verified and start publishing content
        </ThemedText>
      </ThemedView>

      <ThemedView style={styles.content}>
        <ThemedView style={styles.infoCard}>
          <ThemedText style={styles.infoTitle}>ðŸ“‹ What you need:</ThemedText>
          <ThemedText style={styles.infoText}>
            â€¢ Valid business registration documents{'\n'}â€¢ Tax clearance certificate{'\n'}â€¢
            Insurance documents (recommended){'\n'}â€¢ Tourism license (if applicable)
          </ThemedText>
        </ThemedView>

        <ThemedView style={styles.documentsSection}>
          <ThemedText style={styles.sectionTitle}>Required Documents</ThemedText>

          {requiredDocuments.map(doc => (
            <View
              key={doc.id}
              style={[
                styles.documentCard,
                {
                  backgroundColor: Colors[colorScheme ?? 'light'].background,
                  borderColor: uploadedDocs.includes(doc.id)
                    ? '#22C55E'
                    : Colors[colorScheme ?? 'light'].text + '20',
                },
              ]}
            >
              <View style={styles.documentHeader}>
                <View style={styles.documentInfo}>
                  <ThemedText style={styles.documentTitle}>
                    {doc.title}
                    {doc.required && <Text style={styles.required}> *</Text>}
                  </ThemedText>
                  <ThemedText style={styles.documentDescription}>{doc.description}</ThemedText>
                </View>

                <View style={styles.documentStatus}>
                  {uploadedDocs.includes(doc.id) ? (
                    <View style={styles.uploadedBadge}>
                      <Text style={styles.uploadedText}>âœ“ Uploaded</Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={[
                        styles.uploadButton,
                        {
                          backgroundColor: Colors[colorScheme ?? 'light'].tint,
                        },
                      ]}
                      onPress={() => pickDocument(doc.id)}
                      disabled={loading}
                    >
                      <Text style={styles.uploadButtonText}>
                        {loading ? 'Uploading...' : 'Upload'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>
          ))}
        </ThemedView>

        <ThemedView style={styles.helpSection}>
          <ThemedText style={styles.helpTitle}>ðŸ’¡ Tips for faster approval:</ThemedText>
          <ThemedText style={styles.helpText}>
            â€¢ Ensure documents are clear and readable{'\n'}â€¢ Upload files in PDF or high-quality
            image format{'\n'}â€¢ Make sure all information is current and valid{'\n'}â€¢ Include all
            required fields and signatures
          </ThemedText>
        </ThemedView>

        <TouchableOpacity
          style={[
            styles.submitButton,
            {
              backgroundColor: requiredDocuments
                .filter(doc => doc.required)
                .every(doc => uploadedDocs.includes(doc.id))
                ? Colors[colorScheme ?? 'light'].tint
                : '#9CA3AF',
            },
          ]}
          onPress={submitForVerification}
          disabled={
            loading ||
            !requiredDocuments
              .filter(doc => doc.required)
              .every(doc => uploadedDocs.includes(doc.id))
          }
        >
          <Text style={styles.submitButtonText}>
            {loading ? 'Submitting...' : 'Submit for Verification'}
          </Text>
        </TouchableOpacity>

        <ThemedView style={styles.disclaimer}>
          <ThemedText style={styles.disclaimerText}>
            By submitting these documents, you confirm that all information provided is accurate and
            up-to-date. False information may result in account suspension.
          </ThemedText>
        </ThemedView>
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingBottom: 0,
  },
  title: {
    fontSize: responsiveFontSize(28),
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: responsiveFontSize(16),
    opacity: 0.7,
    lineHeight: 22,
  },
  content: {
    padding: 20,
  },
  infoCard: {
    backgroundColor: '#EBF8FF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  infoTitle: {
    fontSize: responsiveFontSize(16),
    fontWeight: '600',
    marginBottom: 8,
    color: '#1E40AF',
  },
  infoText: {
    fontSize: responsiveFontSize(14),
    lineHeight: 20,
    color: '#1E40AF',
  },
  documentsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: responsiveFontSize(18),
    fontWeight: '600',
    marginBottom: 16,
  },
  documentCard: {
    borderWidth: 2,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  documentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  documentInfo: {
    flex: 1,
    marginRight: 12,
  },
  documentTitle: {
    fontSize: responsiveFontSize(16),
    fontWeight: '600',
    marginBottom: 4,
  },
  required: {
    color: '#EF4444',
  },
  documentDescription: {
    fontSize: responsiveFontSize(14),
    opacity: 0.7,
  },
  documentStatus: {
    alignItems: 'center',
  },
  uploadedBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  uploadedText: {
    color: '#16A34A',
    fontSize: responsiveFontSize(12),
    fontWeight: '600',
  },
  uploadButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  uploadButtonText: {
    color: '#FFFFFF',
    fontSize: responsiveFontSize(14),
    fontWeight: '600',
  },
  helpSection: {
    backgroundColor: '#FEF3C7',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  helpTitle: {
    fontSize: responsiveFontSize(16),
    fontWeight: '600',
    marginBottom: 8,
    color: '#92400E',
  },
  helpText: {
    fontSize: responsiveFontSize(14),
    lineHeight: 20,
    color: '#92400E',
  },
  submitButton: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: responsiveFontSize(16),
    fontWeight: '600',
  },
  disclaimer: {
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
  },
  disclaimerText: {
    fontSize: responsiveFontSize(12),
    opacity: 0.7,
    textAlign: 'center',
    lineHeight: 16,
  },
});