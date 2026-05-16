import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { useColorScheme } from '@/hooks/useColorScheme';
import { useAppAlert } from '@/context/AppAlertContext';
import { Colors } from '@/constants/Colors';
import { responsiveFontSize, Fonts } from '@/constants/Fonts';
import { useAuth } from '@/context/AuthContext';
import { countries } from '@/countries-fixed';
import { CustomHeader } from '@/components/CustomHeader';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { WallpaperPattern } from '@/components/WallpaperPattern';

export default function SignUpScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { showAlert } = useAppAlert();
  const insets = useSafeAreaInsets();
  const { signUp } = useAuth();

  const [userType, setUserType] = useState<'individual' | 'business'>('individual');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);

  // Individual fields
  const [fullName, setFullName] = useState('');
  const [title, setTitle] = useState('');
  const [gender, setGender] = useState('');
  const [idType, setIdType] = useState('');
  const [identityNumber, setIdentityNumber] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [nationality, setNationality] = useState('');
  const [phone, setPhone] = useState('');

  // Business fields
  const [businessName, setBusinessName] = useState('');

  // Pickers
  const [showTitlePicker, setShowTitlePicker] = useState(false);
  const [showGenderPicker, setShowGenderPicker] = useState(false);
  const [showIdTypePicker, setShowIdTypePicker] = useState(false);
  const [showNationalityPicker, setShowNationalityPicker] = useState(false);
  const [showDobPicker, setShowDobPicker] = useState(false);

  const titles = useMemo(() => ['Mr', 'Mrs', 'Ms', 'Dr', 'Prof'], []);
  const genders = useMemo(() => ['Male', 'Female', 'Other'], []);
  const idTypes = useMemo(() => ['National ID', 'Passport'], []);

  const themeTextColor = isDark ? Colors.dark.text : Colors.light.text;
  const backgroundColor = isDark ? Colors.dark.background : Colors.light.background;
  const cardBackground = isDark ? '#1C1C1E' : '#ffffff';
  const inputBackground = isDark ? '#2C2C2E' : '#f8f9fa';
  const borderColor = isDark ? '#4A4A4A' : '#D4D4DA';
  const placeholderColor = isDark ? '#8E8E93' : '#999';

  const normalizeDateOfBirthInput = (value?: string): string | null => {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
    const match = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (match) {
      const [, day, month, year] = match;
      return `${year}-${month}-${day}`;
    }
    return trimmed;
  };

  const handleSignUp = async () => {
    setAttemptedSubmit(true);

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPassword = password.trim();
    const trimmedConfirmPassword = confirmPassword.trim();
    const trimmedFullName = fullName.trim();
    const trimmedBusinessName = businessName.trim();
    const trimmedTitle = title.trim();
    const trimmedGender = gender.trim();
    const trimmedIdType = idType.trim();
    const trimmedIdentityNumber = identityNumber.trim();
    const trimmedDobDisplay = dateOfBirth.trim();
    const normalizedDob = normalizeDateOfBirthInput(trimmedDobDisplay);
    const trimmedNationality = nationality.trim();
    const trimmedPhone = phone.trim();

    const missingFields: string[] = [];

    if (!trimmedEmail) missingFields.push('Email');
    if (!trimmedPassword) missingFields.push('Password');
    if (!trimmedConfirmPassword) missingFields.push('Confirm Password');

    if (userType === 'business') {
      if (!trimmedBusinessName) missingFields.push('Business Name');
    } else {
      if (!trimmedTitle) missingFields.push('Title');
      if (!trimmedFullName) missingFields.push('Full Name');
      if (!trimmedGender) missingFields.push('Gender');
      if (!trimmedIdType) missingFields.push('ID Type');
      if (!trimmedIdentityNumber) missingFields.push('Identity Number');
      if (!trimmedDobDisplay || !normalizedDob) missingFields.push('Date of Birth');
      if (!trimmedNationality) missingFields.push('Nationality');
      if (!trimmedPhone) missingFields.push('Cell Phone Number');
    }

    if (missingFields.length > 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      return;
    }

    if (trimmedPassword !== trimmedConfirmPassword) {
      showAlert({ title: 'Error', message: 'Passwords do not match', buttons: [{ text: 'OK' }] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      return;
    }

    setLoading(true);
    try {
      const { error } = await signUp(
        trimmedEmail,
        trimmedPassword,
        userType === 'business' ? undefined : trimmedFullName,
        userType,
        userType === 'business' ? trimmedBusinessName : undefined,
        userType === 'individual'
          ? {
              title: trimmedTitle,
              gender: trimmedGender,
              id_type: trimmedIdType,
              identity_number: trimmedIdentityNumber,
              date_of_birth: normalizedDob,
              nationality: trimmedNationality,
              phone: trimmedPhone,
            }
          : undefined
      );

      if (error) {
        const message = error.message ?? 'Unable to create the account at the moment.';
        const lower = message.toLowerCase();

        if (lower.includes('already registered') || lower.includes('already exists')) {
          showAlert({
            title: 'Account exists',
            message: 'It looks like this email already has an account. Try signing in instead.',
            buttons: [{ text: 'OK' }],
          });
        } else if (lower.includes('network')) {
          showAlert({ title: 'Network issue', message: 'Please check your internet connection and try again.', buttons: [{ text: 'OK' }] });
        } else {
          showAlert({ title: 'Sign up failed', message, buttons: [{ text: 'OK' }] });
        }
        return;
      }

      showAlert({
        title: 'Verify your email',
        message: `Enter the 6-digit code we just sent to ${trimmedEmail}.`,
        buttons: [
          {
            text: 'OK',
            onPress: () => {
              router.replace('/auth');
            },
          },
        ],
      });
    } catch (error: any) {
      const message = error?.message ?? 'Something went wrong. Please try again.';
      showAlert({ title: 'Authentication error', message, buttons: [{ text: 'OK' }] });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemedView style={styles.container} lightColor="#f2f2f7" darkColor="#000000">
      <WallpaperPattern />

      <CustomHeader
        showLogo
        leftAction={{
          icon: 'chevron-back',
          onPress: () => router.back(),
          color: '#FF3B30',
        }}
      />

      <View style={styles.titleSection}>
        <ThemedText type="title1" style={styles.pageTitle}>
          Sign Up
        </ThemedText>
      </View>

      {/* Scrollable Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.card, { backgroundColor: cardBackground }]}>
          {/* Account Type Selector */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: themeTextColor }]}>Account Type</Text>
            <View
              style={[
                styles.userTypeSwitch,
                {
                  backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                  borderColor: isDark ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.08)',
                },
              ]}
            >
              <TouchableOpacity
                style={[
                  styles.userTypeButton,
                  userType === 'individual' && {
                    backgroundColor: isDark ? '#ffffff' : '#000000',
                  },
                ]}
                onPress={() => setUserType('individual')}
              >
                <Text
                  style={[
                    styles.userTypeButtonText,
                    {
                      color:
                        userType === 'individual'
                          ? isDark
                            ? '#000000'
                            : '#ffffff'
                          : isDark
                            ? 'rgba(255,255,255,0.7)'
                            : 'rgba(0,0,0,0.7)',
                    },
                  ]}
                >
                  Individual
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.userTypeButton,
                  userType === 'business' && {
                    backgroundColor: isDark ? '#ffffff' : '#000000',
                  },
                ]}
                onPress={() => setUserType('business')}
              >
                <Text
                  style={[
                    styles.userTypeButtonText,
                    {
                      color:
                        userType === 'business'
                          ? isDark
                            ? '#000000'
                            : '#ffffff'
                          : isDark
                            ? 'rgba(255,255,255,0.7)'
                            : 'rgba(0,0,0,0.7)',
                    },
                  ]}
                >
                  Service Provider
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {userType === 'business' ? (
            /* Business Name Field */
            <View style={styles.section}>
              <View style={styles.labelErrorContainer}>
                <Text style={[styles.label, { color: themeTextColor }]}>Business name</Text>
                {attemptedSubmit && !businessName.trim() && (
                  <Text style={styles.errorText}>This field is required</Text>
                )}
              </View>
              <TextInput
                style={[
                  styles.input,
                  {
                    color: themeTextColor,
                    backgroundColor: inputBackground,
                    borderColor: attemptedSubmit && !businessName.trim() ? '#FF3B30' : borderColor,
                    borderWidth: 1,
                  },
                ]}
                value={businessName}
                onChangeText={setBusinessName}
                placeholder="Enter your business name"
                placeholderTextColor={placeholderColor}
                autoCapitalize="words"
                returnKeyType="next"
              />
            </View>
          ) : (
            <>
              {/* Title Picker */}
              <View style={styles.section}>
                <View style={styles.labelErrorContainer}>
                  <Text style={[styles.label, { color: themeTextColor }]}>Title</Text>
                  {attemptedSubmit && !title && (
                    <Text style={styles.errorText}>This field is required</Text>
                  )}
                </View>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setShowTitlePicker(true);
                  }}
                  style={[
                    styles.pickerField,
                    {
                      backgroundColor: inputBackground,
                      borderColor: attemptedSubmit && !title ? '#FF3B30' : borderColor,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.pickerValue,
                      { color: title ? themeTextColor : placeholderColor },
                    ]}
                  >
                    {title || 'Select title'}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color={placeholderColor} />
                </TouchableOpacity>
              </View>

              {/* Full Name */}
              <View style={styles.section}>
                <View style={styles.labelErrorContainer}>
                  <Text style={[styles.label, { color: themeTextColor }]}>Full name</Text>
                  {attemptedSubmit && !fullName.trim() && (
                    <Text style={styles.errorText}>This field is required</Text>
                  )}
                </View>
                <TextInput
                  style={[
                    styles.input,
                    {
                      color: themeTextColor,
                      backgroundColor: inputBackground,
                      borderColor: attemptedSubmit && !fullName.trim() ? '#FF3B30' : borderColor,
                      borderWidth: 1,
                    },
                  ]}
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="Enter your full name"
                  placeholderTextColor={placeholderColor}
                  autoCapitalize="words"
                  returnKeyType="next"
                />
              </View>

              {/* Gender Picker */}
              <View style={styles.section}>
                <View style={styles.labelErrorContainer}>
                  <Text style={[styles.label, { color: themeTextColor }]}>Gender</Text>
                  {attemptedSubmit && !gender && (
                    <Text style={styles.errorText}>This field is required</Text>
                  )}
                </View>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setShowGenderPicker(true);
                  }}
                  style={[
                    styles.pickerField,
                    {
                      backgroundColor: inputBackground,
                      borderColor: attemptedSubmit && !gender ? '#FF3B30' : borderColor,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.pickerValue,
                      { color: gender ? themeTextColor : placeholderColor },
                    ]}
                  >
                    {gender || 'Select gender'}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color={placeholderColor} />
                </TouchableOpacity>
              </View>

              {/* ID Type Picker */}
              <View style={styles.section}>
                <View style={styles.labelErrorContainer}>
                  <Text style={[styles.label, { color: themeTextColor }]}>ID Type</Text>
                  {attemptedSubmit && !idType && (
                    <Text style={styles.errorText}>This field is required</Text>
                  )}
                </View>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setShowIdTypePicker(true);
                  }}
                  style={[
                    styles.pickerField,
                    {
                      backgroundColor: inputBackground,
                      borderColor: attemptedSubmit && !idType ? '#FF3B30' : borderColor,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.pickerValue,
                      { color: idType ? themeTextColor : placeholderColor },
                    ]}
                  >
                    {idType || 'Select ID type'}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color={placeholderColor} />
                </TouchableOpacity>
              </View>

              {/* Identity Number */}
              <View style={styles.section}>
                <View style={styles.labelErrorContainer}>
                  <Text style={[styles.label, { color: themeTextColor }]}>Identity number</Text>
                  {attemptedSubmit && !identityNumber.trim() && (
                    <Text style={styles.errorText}>This field is required</Text>
                  )}
                </View>
                <TextInput
                  style={[
                    styles.input,
                    {
                      color: themeTextColor,
                      backgroundColor: inputBackground,
                      borderColor:
                        attemptedSubmit && !identityNumber.trim() ? '#FF3B30' : borderColor,
                      borderWidth: 1,
                    },
                  ]}
                  value={identityNumber}
                  onChangeText={setIdentityNumber}
                  placeholder="Enter identity number"
                  placeholderTextColor={placeholderColor}
                  autoCapitalize="characters"
                  returnKeyType="next"
                />
              </View>

              {/* Date of Birth Picker */}
              <View style={styles.section}>
                <View style={styles.labelErrorContainer}>
                  <Text style={[styles.label, { color: themeTextColor }]}>Date of birth</Text>
                  {attemptedSubmit && !dateOfBirth && (
                    <Text style={styles.errorText}>This field is required</Text>
                  )}
                </View>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setShowDobPicker(true);
                  }}
                  style={[
                    styles.pickerField,
                    {
                      backgroundColor: inputBackground,
                      borderColor: attemptedSubmit && !dateOfBirth ? '#FF3B30' : borderColor,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.pickerValue,
                      { color: dateOfBirth ? themeTextColor : placeholderColor },
                    ]}
                  >
                    {dateOfBirth || 'DD/MM/YYYY'}
                  </Text>
                  <Ionicons name="calendar-outline" size={20} color={placeholderColor} />
                </TouchableOpacity>
              </View>

              {/* Nationality Picker */}
              <View style={styles.section}>
                <View style={styles.labelErrorContainer}>
                  <Text style={[styles.label, { color: themeTextColor }]}>Nationality</Text>
                  {attemptedSubmit && !nationality && (
                    <Text style={styles.errorText}>This field is required</Text>
                  )}
                </View>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setShowNationalityPicker(true);
                  }}
                  style={[
                    styles.pickerField,
                    {
                      backgroundColor: inputBackground,
                      borderColor: attemptedSubmit && !nationality ? '#FF3B30' : borderColor,
                    },
                  ]}
                >
                  <View style={styles.pickerValueRow}>
                    {nationality && (
                      <Text style={styles.pickerFlag}>
                        {countries.find(c => c.name === nationality)?.flag}
                      </Text>
                    )}
                    <Text
                      style={[
                        styles.pickerValue,
                        { color: nationality ? themeTextColor : placeholderColor },
                      ]}
                    >
                      {nationality || 'Select nationality'}
                    </Text>
                  </View>
                  <Ionicons name="chevron-down" size={20} color={placeholderColor} />
                </TouchableOpacity>
              </View>

              {/* Cell Phone Number */}
              <View style={styles.section}>
                <View style={styles.labelErrorContainer}>
                  <Text style={[styles.label, { color: themeTextColor }]}>Cell phone number</Text>
                  {attemptedSubmit && !phone.trim() && (
                    <Text style={styles.errorText}>This field is required</Text>
                  )}
                </View>
                <TextInput
                  style={[
                    styles.input,
                    {
                      color: themeTextColor,
                      backgroundColor: inputBackground,
                      borderColor: attemptedSubmit && !phone.trim() ? '#FF3B30' : borderColor,
                      borderWidth: 1,
                    },
                  ]}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="Enter phone number"
                  placeholderTextColor={placeholderColor}
                  keyboardType="phone-pad"
                  returnKeyType="next"
                />
              </View>
            </>
          )}

          {/* Email Input */}
          <View style={styles.section}>
            <View style={styles.labelErrorContainer}>
              <Text style={[styles.label, { color: themeTextColor }]}>Email</Text>
              {attemptedSubmit && !email.trim() && (
                <Text style={styles.errorText}>This field is required</Text>
              )}
            </View>
            <TextInput
              style={[
                styles.input,
                {
                  color: themeTextColor,
                  backgroundColor: inputBackground,
                  borderColor: attemptedSubmit && !email.trim() ? '#FF3B30' : borderColor,
                  borderWidth: 1,
                },
              ]}
              value={email}
              onChangeText={setEmail}
              placeholder="Enter your email"
              placeholderTextColor={placeholderColor}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect={false}
              textContentType="emailAddress"
              returnKeyType="next"
            />
          </View>

          {/* Password Input */}
          <View style={styles.section}>
            <View style={styles.labelErrorContainer}>
              <Text style={[styles.label, { color: themeTextColor }]}>Password</Text>
              {attemptedSubmit && !password.trim() && (
                <Text style={styles.errorText}>This field is required</Text>
              )}
            </View>
            <View
              style={[
                styles.passwordContainer,
                {
                  backgroundColor: inputBackground,
                  borderColor: attemptedSubmit && !password.trim() ? '#FF3B30' : borderColor,
                  borderWidth: 1,
                },
              ]}
            >
              <TextInput
                style={[styles.passwordInput, { color: themeTextColor }]}
                value={password}
                onChangeText={setPassword}
                placeholder="Create a password"
                placeholderTextColor={placeholderColor}
                secureTextEntry={!showPassword}
                autoComplete="password-new"
                textContentType="newPassword"
                returnKeyType="next"
              />
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Ionicons
                  name={showPassword ? 'eye-off' : 'eye'}
                  size={24}
                  color={themeTextColor}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Confirm Password Input */}
          <View style={styles.section}>
            <View style={styles.labelErrorContainer}>
              <Text style={[styles.label, { color: themeTextColor }]}>Confirm password</Text>
              {attemptedSubmit && !confirmPassword.trim() && (
                <Text style={styles.errorText}>This field is required</Text>
              )}
              {attemptedSubmit && password !== confirmPassword && confirmPassword.trim() && (
                <Text style={styles.errorText}>Passwords do not match</Text>
              )}
            </View>
            <View
              style={[
                styles.passwordContainer,
                {
                  backgroundColor: inputBackground,
                  borderColor:
                    attemptedSubmit && (!confirmPassword.trim() || password !== confirmPassword)
                      ? '#FF3B30'
                      : borderColor,
                  borderWidth: 1,
                },
              ]}
            >
              <TextInput
                style={[styles.passwordInput, { color: themeTextColor }]}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Re-enter your password"
                placeholderTextColor={placeholderColor}
                secureTextEntry={!showConfirmPassword}
                autoComplete="password-new"
                textContentType="newPassword"
                returnKeyType="done"
                onSubmitEditing={handleSignUp}
              />
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                <Ionicons
                  name={showConfirmPassword ? 'eye-off' : 'eye'}
                  size={24}
                  color={themeTextColor}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Create Account Button */}
          <TouchableOpacity
            style={[
              styles.createButton,
              { backgroundColor: isDark ? Colors.dark.tint : Colors.light.tint },
              loading && styles.createButtonDisabled,
            ]}
            onPress={handleSignUp}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator
                color={isDark ? Colors.dark.background : Colors.light.background}
              />
            ) : (
              <Text
                style={[
                  styles.createButtonText,
                  { color: isDark ? Colors.dark.background : Colors.light.background },
                ]}
              >
                CREATE ACCOUNT
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Picker Modals */}
      {/* Title Picker Modal */}
      <Modal
        visible={showTitlePicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowTitlePicker(false)}
      >
        <TouchableOpacity
          style={styles.pickerModalBackdrop}
          onPress={() => setShowTitlePicker(false)}
          activeOpacity={1}
        >
          <View style={styles.pickerModalContainer}>
            <TouchableOpacity
              activeOpacity={1}
              onPress={e => e.stopPropagation()}
              style={[styles.pickerModalCard, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' }]}
            >
              <Text style={[styles.pickerModalTitle, { color: themeTextColor }]}>Select Title</Text>
              <ScrollView style={{ maxHeight: 300 }}>
                {titles.map(titleOption => (
                  <TouchableOpacity
                    key={titleOption}
                    style={[
                      styles.pickerModalOption,
                      {
                        backgroundColor:
                          title === titleOption
                            ? isDark
                              ? 'rgba(52, 199, 89, 0.15)'
                              : 'rgba(52, 199, 89, 0.1)'
                            : 'transparent',
                      },
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      setTitle(titleOption);
                      setShowTitlePicker(false);
                    }}
                  >
                    <Text style={[styles.pickerModalOptionText, { color: themeTextColor }]}>
                      {titleOption}
                    </Text>
                    {title === titleOption && (
                      <Ionicons name="checkmark-circle" size={24} color="#34C759" />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Gender Picker Modal */}
      <Modal
        visible={showGenderPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowGenderPicker(false)}
      >
        <TouchableOpacity
          style={styles.pickerModalBackdrop}
          onPress={() => setShowGenderPicker(false)}
          activeOpacity={1}
        >
          <View style={styles.pickerModalContainer}>
            <TouchableOpacity
              activeOpacity={1}
              onPress={e => e.stopPropagation()}
              style={[styles.pickerModalCard, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' }]}
            >
              <Text style={[styles.pickerModalTitle, { color: themeTextColor }]}>
                Select Gender
              </Text>
              <ScrollView style={{ maxHeight: 300 }}>
                {genders.map(genderOption => (
                  <TouchableOpacity
                    key={genderOption}
                    style={[
                      styles.pickerModalOption,
                      {
                        backgroundColor:
                          gender === genderOption
                            ? isDark
                              ? 'rgba(52, 199, 89, 0.15)'
                              : 'rgba(52, 199, 89, 0.1)'
                            : 'transparent',
                      },
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      setGender(genderOption);
                      setShowGenderPicker(false);
                    }}
                  >
                    <Text style={[styles.pickerModalOptionText, { color: themeTextColor }]}>
                      {genderOption}
                    </Text>
                    {gender === genderOption && (
                      <Ionicons name="checkmark-circle" size={24} color="#34C759" />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ID Type Picker Modal */}
      <Modal
        visible={showIdTypePicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowIdTypePicker(false)}
      >
        <TouchableOpacity
          style={styles.pickerModalBackdrop}
          onPress={() => setShowIdTypePicker(false)}
          activeOpacity={1}
        >
          <View style={styles.pickerModalContainer}>
            <TouchableOpacity
              activeOpacity={1}
              onPress={e => e.stopPropagation()}
              style={[styles.pickerModalCard, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' }]}
            >
              <Text style={[styles.pickerModalTitle, { color: themeTextColor }]}>
                Select ID Type
              </Text>
              <ScrollView style={{ maxHeight: 300 }}>
                {idTypes.map(idTypeOption => (
                  <TouchableOpacity
                    key={idTypeOption}
                    style={[
                      styles.pickerModalOption,
                      {
                        backgroundColor:
                          idType === idTypeOption
                            ? isDark
                              ? 'rgba(52, 199, 89, 0.15)'
                              : 'rgba(52, 199, 89, 0.1)'
                            : 'transparent',
                      },
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      setIdType(idTypeOption);
                      setShowIdTypePicker(false);
                    }}
                  >
                    <Text style={[styles.pickerModalOptionText, { color: themeTextColor }]}>
                      {idTypeOption}
                    </Text>
                    {idType === idTypeOption && (
                      <Ionicons name="checkmark-circle" size={24} color="#34C759" />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Nationality Picker Modal */}
      <Modal
        visible={showNationalityPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowNationalityPicker(false)}
      >
        <TouchableOpacity
          style={styles.pickerModalBackdrop}
          onPress={() => setShowNationalityPicker(false)}
          activeOpacity={1}
        >
          <View style={styles.pickerModalContainer}>
            <TouchableOpacity
              activeOpacity={1}
              onPress={e => e.stopPropagation()}
              style={[styles.pickerModalCard, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' }]}
            >
              <Text style={[styles.pickerModalTitle, { color: themeTextColor }]}>
                Select Nationality
              </Text>
              <ScrollView style={{ maxHeight: 400 }}>
                {countries.map(country => (
                  <TouchableOpacity
                    key={country.name}
                    style={[
                      styles.pickerModalOption,
                      {
                        backgroundColor:
                          nationality === country.name
                            ? isDark
                              ? 'rgba(52, 199, 89, 0.15)'
                              : 'rgba(52, 199, 89, 0.1)'
                            : 'transparent',
                      },
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      setNationality(country.name);
                      setShowNationalityPicker(false);
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <Text style={{ fontSize: responsiveFontSize(24) }}>{country.flag}</Text>
                      <Text style={[styles.pickerModalOptionText, { color: themeTextColor }]}>
                        {country.name}
                      </Text>
                    </View>
                    {nationality === country.name && (
                      <Ionicons name="checkmark-circle" size={24} color="#34C759" />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Date of Birth Modal - Simple text input */}
      <Modal
        visible={showDobPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDobPicker(false)}
      >
        <TouchableOpacity
          style={styles.pickerModalBackdrop}
          onPress={() => setShowDobPicker(false)}
          activeOpacity={1}
        >
          <View style={styles.pickerModalContainer}>
            <TouchableOpacity
              activeOpacity={1}
              onPress={e => e.stopPropagation()}
              style={[styles.pickerModalCard, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' }]}
            >
              <Text style={[styles.pickerModalTitle, { color: themeTextColor }]}>
                Enter Date of Birth
              </Text>
              <View style={{ padding: 20 }}>
                <Text style={[styles.label, { color: themeTextColor, marginBottom: 8 }]}>
                  Format: DD/MM/YYYY
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      color: themeTextColor,
                      backgroundColor: inputBackground,
                      borderColor: borderColor,
                      borderWidth: 1,
                    },
                  ]}
                  value={dateOfBirth}
                  onChangeText={setDateOfBirth}
                  placeholder="DD/MM/YYYY"
                  placeholderTextColor={placeholderColor}
                  keyboardType="numbers-and-punctuation"
                  maxLength={10}
                />
                <TouchableOpacity
                  style={[
                    styles.createButton,
                    {
                      backgroundColor: isDark ? Colors.dark.tint : Colors.light.tint,
                      marginTop: 20,
                    },
                  ]}
                  onPress={() => setShowDobPicker(false)}
                >
                  <Text
                    style={[
                      styles.createButtonText,
                      { color: isDark ? Colors.dark.background : Colors.light.background },
                    ]}
                  >
                    Done
                  </Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  titleSection: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderBottomWidth: 0,
  },
  pageTitle: {
    fontSize: responsiveFontSize(24),
    textAlign: 'left',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: responsiveFontSize(17),
    fontFamily: Fonts.bold,
    flex: 1,
    textAlign: 'center',
  },
  headerRight: {
    width: 36,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    borderRadius: 16,
    padding: 20,
    gap: 20,
  },
  section: {
    gap: 8,
  },
  labelErrorContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: responsiveFontSize(16),
    fontFamily: Fonts.medium,
  },
  errorText: {
    fontSize: responsiveFontSize(13),
    fontFamily: Fonts.medium,
    color: '#FF3B30',
  },
  input: {
    height: 50,
    paddingHorizontal: 16,
    fontSize: responsiveFontSize(16),
    fontFamily: Fonts.regular,
    borderRadius: 8,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    height: 50,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 16,
    fontSize: responsiveFontSize(16),
    fontFamily: Fonts.regular,
  },
  eyeIcon: {
    paddingHorizontal: 12,
  },
  userTypeSwitch: {
    flexDirection: 'row',
    borderRadius: 10,
    borderWidth: 1,
    padding: 4,
  },
  userTypeButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userTypeButtonText: {
    fontSize: responsiveFontSize(15),
    fontFamily: Fonts.medium,
  },
  pickerField: {
    height: 50,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pickerValue: {
    fontSize: responsiveFontSize(16),
    fontFamily: Fonts.regular,
  },
  pickerValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  pickerFlag: {
    fontSize: responsiveFontSize(24),
  },
  createButton: {
    height: 50,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  createButtonDisabled: {
    opacity: 0.7,
  },
  createButtonText: {
    fontSize: responsiveFontSize(18),
    fontFamily: Fonts.bold,
  },
  pickerModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerModalContainer: {
    width: '85%',
    maxWidth: 400,
  },
  pickerModalCard: {
    borderRadius: 16,
    padding: 20,
    maxHeight: '80%',
  },
  pickerModalTitle: {
    fontSize: responsiveFontSize(20),
    fontFamily: Fonts.bold,
    marginBottom: 16,
    textAlign: 'center',
  },
  pickerModalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  pickerModalOptionText: {
    fontSize: responsiveFontSize(16),
    fontFamily: Fonts.regular,
  },
});
