import React, { useState } from 'react';
import { responsiveFontSize } from '@/constants/Fonts';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useAppAlert } from '@/context/AppAlertContext';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { serviceProviderService } from '@/services/serviceProvider';

export default function ProviderRegistration() {
  const colorScheme = useColorScheme();
  const { showAlert } = useAppAlert();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    business_name: '',
    business_type: 'hotel' as
      | 'hotel'
      | 'lodge'
      | 'tour_operator'
      | 'restaurant'
      | 'transport'
      | 'activity_provider'
      | 'other',
    contact_person_name: '',
    email: '',
    phone: '',
    website: '',
    address: '',
    city: '',
    country: 'Zimbabwe',
    description: '',
    business_registration_number: '',
  });

  const businessTypes = [
    { value: 'hotel', label: 'Hotel' },
    { value: 'lodge', label: 'Lodge' },
    { value: 'tour_operator', label: 'Tour Operator' },
    { value: 'restaurant', label: 'Restaurant' },
    { value: 'transport', label: 'Transport Service' },
    { value: 'activity_provider', label: 'Activity Provider' },
    { value: 'other', label: 'Other' },
  ];

  const handleSubmit = async () => {
    // Basic validation
    if (
      !formData.business_name ||
      !formData.contact_person_name ||
      !formData.email ||
      !formData.phone ||
      !formData.address
    ) {
      showAlert({ title: 'Error', message: 'Please fill in all required fields', buttons: [{ text: 'OK' }] });
      return;
    }

    setLoading(true);
    try {
      const { error } = await serviceProviderService.register({
        ...formData,
        verification_status: 'pending',
        status: 'active',
        subscription_tier: 'basic',
        auto_approve_content: false,
        notification_preferences: { email: true, sms: false },
      });

      if (error) {
        console.error('Registration error:', error);
        showAlert({ title: 'Error', message: 'Failed to register as service provider', buttons: [{ text: 'OK' }] });
        return;
      }

      showAlert({
        title: 'Success!',
        message: 'Your service provider account has been created. You can now start adding content.',
        buttons: [{ text: 'OK', onPress: () => router.replace('/profile') }],
      });
    } catch (error) {
      console.error('Registration error:', error);
      showAlert({ title: 'Error', message: 'An unexpected error occurred', buttons: [{ text: 'OK' }] });
    } finally {
      setLoading(false);
    }
  };

  const updateFormData = (field: string, value: string | any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={[styles.container, { backgroundColor: Colors[colorScheme ?? 'light'].background }]}
        contentContainerStyle={styles.scrollContent}
      >
        <ThemedView style={styles.header}>
          <ThemedText style={styles.title}>Become a Service Provider</ThemedText>
          <ThemedText style={styles.subtitle}>
            Join our platform to showcase your tourism business to travelers
          </ThemedText>
        </ThemedView>

        <ThemedView style={styles.form}>
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Business Information</ThemedText>

            <View style={styles.inputGroup}>
              <ThemedText style={styles.label}>Business Name *</ThemedText>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: Colors[colorScheme ?? 'light'].background,
                    borderColor: Colors[colorScheme ?? 'light'].text + '20',
                    color: Colors[colorScheme ?? 'light'].text,
                  },
                ]}
                value={formData.business_name}
                onChangeText={value => updateFormData('business_name', value)}
                placeholder="Enter your business name"
                placeholderTextColor={Colors[colorScheme ?? 'light'].text + '60'}
              />
            </View>

            <View style={styles.inputGroup}>
              <ThemedText style={styles.label}>Business Type *</ThemedText>
              <View style={styles.businessTypeContainer}>
                {businessTypes.map(type => (
                  <TouchableOpacity
                    key={type.value}
                    style={[
                      styles.businessTypeButton,
                      formData.business_type === type.value && styles.businessTypeButtonActive,
                      {
                        borderColor:
                          formData.business_type === type.value
                            ? Colors[colorScheme ?? 'light'].tint
                            : Colors[colorScheme ?? 'light'].text + '20',
                      },
                    ]}
                    onPress={() => updateFormData('business_type', type.value)}
                  >
                    <Text
                      style={[
                        styles.businessTypeText,
                        {
                          color:
                            formData.business_type === type.value
                              ? Colors[colorScheme ?? 'light'].tint
                              : Colors[colorScheme ?? 'light'].text,
                        },
                      ]}
                    >
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <ThemedText style={styles.label}>Business Registration Number</ThemedText>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: Colors[colorScheme ?? 'light'].background,
                    borderColor: Colors[colorScheme ?? 'light'].text + '20',
                    color: Colors[colorScheme ?? 'light'].text,
                  },
                ]}
                value={formData.business_registration_number}
                onChangeText={value => updateFormData('business_registration_number', value)}
                placeholder="Optional"
                placeholderTextColor={Colors[colorScheme ?? 'light'].text + '60'}
              />
            </View>
          </View>

          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Contact Information</ThemedText>

            <View style={styles.inputGroup}>
              <ThemedText style={styles.label}>Contact Person Name *</ThemedText>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: Colors[colorScheme ?? 'light'].background,
                    borderColor: Colors[colorScheme ?? 'light'].text + '20',
                    color: Colors[colorScheme ?? 'light'].text,
                  },
                ]}
                value={formData.contact_person_name}
                onChangeText={value => updateFormData('contact_person_name', value)}
                placeholder="Your full name"
                placeholderTextColor={Colors[colorScheme ?? 'light'].text + '60'}
              />
            </View>

            <View style={styles.inputGroup}>
              <ThemedText style={styles.label}>Email Address *</ThemedText>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: Colors[colorScheme ?? 'light'].background,
                    borderColor: Colors[colorScheme ?? 'light'].text + '20',
                    color: Colors[colorScheme ?? 'light'].text,
                  },
                ]}
                value={formData.email}
                onChangeText={value => updateFormData('email', value)}
                placeholder="business@example.com"
                placeholderTextColor={Colors[colorScheme ?? 'light'].text + '60'}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <ThemedText style={styles.label}>Phone Number *</ThemedText>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: Colors[colorScheme ?? 'light'].background,
                    borderColor: Colors[colorScheme ?? 'light'].text + '20',
                    color: Colors[colorScheme ?? 'light'].text,
                  },
                ]}
                value={formData.phone}
                onChangeText={value => updateFormData('phone', value)}
                placeholder="+263..."
                placeholderTextColor={Colors[colorScheme ?? 'light'].text + '60'}
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <ThemedText style={styles.label}>Website</ThemedText>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: Colors[colorScheme ?? 'light'].background,
                    borderColor: Colors[colorScheme ?? 'light'].text + '20',
                    color: Colors[colorScheme ?? 'light'].text,
                  },
                ]}
                value={formData.website}
                onChangeText={value => updateFormData('website', value)}
                placeholder="https://yourwebsite.com"
                placeholderTextColor={Colors[colorScheme ?? 'light'].text + '60'}
                keyboardType="url"
                autoCapitalize="none"
              />
            </View>
          </View>

          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Location</ThemedText>

            <View style={styles.inputGroup}>
              <ThemedText style={styles.label}>Address *</ThemedText>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: Colors[colorScheme ?? 'light'].background,
                    borderColor: Colors[colorScheme ?? 'light'].text + '20',
                    color: Colors[colorScheme ?? 'light'].text,
                  },
                ]}
                value={formData.address}
                onChangeText={value => updateFormData('address', value)}
                placeholder="Street address"
                placeholderTextColor={Colors[colorScheme ?? 'light'].text + '60'}
                multiline
              />
            </View>

            <View style={styles.inputGroup}>
              <ThemedText style={styles.label}>City *</ThemedText>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: Colors[colorScheme ?? 'light'].background,
                    borderColor: Colors[colorScheme ?? 'light'].text + '20',
                    color: Colors[colorScheme ?? 'light'].text,
                  },
                ]}
                value={formData.city}
                onChangeText={value => updateFormData('city', value)}
                placeholder="City name"
                placeholderTextColor={Colors[colorScheme ?? 'light'].text + '60'}
              />
            </View>
          </View>

          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Description</ThemedText>

            <View style={styles.inputGroup}>
              <ThemedText style={styles.label}>Tell us about your business</ThemedText>
              <TextInput
                style={[
                  styles.textArea,
                  {
                    backgroundColor: Colors[colorScheme ?? 'light'].background,
                    borderColor: Colors[colorScheme ?? 'light'].text + '20',
                    color: Colors[colorScheme ?? 'light'].text,
                  },
                ]}
                value={formData.description}
                onChangeText={value => updateFormData('description', value)}
                placeholder="Describe your business, services, and what makes you unique..."
                placeholderTextColor={Colors[colorScheme ?? 'light'].text + '60'}
                multiline
                numberOfLines={4}
              />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.submitButton, { backgroundColor: Colors[colorScheme ?? 'light'].tint }]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <Text style={styles.submitButtonText}>
              {loading ? 'Creating Account...' : 'Create Provider Account'}
            </Text>
          </TouchableOpacity>
        </ThemedView>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
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
  form: {
    padding: 20,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: responsiveFontSize(18),
    fontWeight: '600',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: responsiveFontSize(14),
    fontWeight: '500',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: responsiveFontSize(16),
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: responsiveFontSize(16),
    minHeight: 100,
    textAlignVertical: 'top',
  },
  businessTypeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  businessTypeButton: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 8,
  },
  businessTypeButtonActive: {
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
  },
  businessTypeText: {
    fontSize: responsiveFontSize(14),
    fontWeight: '500',
  },
  submitButton: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: responsiveFontSize(16),
    fontWeight: '600',
  },
});