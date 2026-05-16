import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  Modal,
  Animated,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/constants/Colors';
import { responsiveFontSize, Fonts } from '@/constants/Fonts';
import { cardSurfaceBaseStyle, getCardSurfaceColors } from '@/constants/CardStyles';
import { useColorScheme } from '@/hooks/useColorScheme';
import { getProfile, updateProfile, useAuth } from '@/context/AuthContext';
import { useAppAlert } from '@/context/AppAlertContext';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { WallpaperPattern } from '@/components/WallpaperPattern';
import { CustomHeader } from '@/components/CustomHeader';
import { IOSScreenWrapper } from '@/components/IOSScreenWrapper';
import { apiFetch } from '@/lib/api';
import { countries } from '@/countries-fixed';
import { PanGestureHandler, State } from 'react-native-gesture-handler';

const formatDateOfBirthForDisplay = (value?: string | null): string => {
  if (!value) {
    return '';
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return '';
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const [year, month, day] = trimmed.split('-');
    return `${day}/${month}/${year}`;
  }

  return trimmed;
};

const normalizeDateOfBirthInput = (value?: string): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  const match = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (match) {
    const [, day, month, year] = match;
    return `${year}-${month}-${day}`;
  }

  return trimmed;
};

export default function Profile() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { resetPassword, signOut, user } = useAuth();
  const { showAlert } = useAppAlert();

  const [saving, setSaving] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [editing, setEditing] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);

  const [fullName, setFullName] = useState(user?.user_metadata?.full_name || '');
  const [businessName, setBusinessName] = useState(user?.user_metadata?.business_name || '');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState(user?.email || '');
  const [title, setTitle] = useState('');
  const [gender, setGender] = useState('');
  const [idType, setIdType] = useState('');
  const [identityNumber, setIdentityNumber] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [nationality, setNationality] = useState('');
  const [nationalitySearch, setNationalitySearch] = useState('');
  const [showTitlePicker, setShowTitlePicker] = useState(false);
  const [showGenderPicker, setShowGenderPicker] = useState(false);
  const [showIdTypePicker, setShowIdTypePicker] = useState(false);
  const [showNationalityPicker, setShowNationalityPicker] = useState(false);
  const [showDobPicker, setShowDobPicker] = useState(false);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [currentDobCalendarMonth, setCurrentDobCalendarMonth] = useState(new Date());
  const [isAnimating, setIsAnimating] = useState(false);
  const opacityAnim = useRef(new Animated.Value(1)).current;
  const panGestureRef = useRef(null);
  const [userType, setUserType] = useState<'individual' | 'business'>(
    user?.user_metadata?.user_type || 'individual'
  );
  const [isExistingUser, setIsExistingUser] = useState(false);

  const [profile, setProfile] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);

  const [profileImage, setProfileImage] = useState<string | null>(
    () => user?.user_metadata?.avatar_url || null
  );

  // Store original values to detect changes
  const [originalValues, setOriginalValues] = useState({
    fullName: '',
    businessName: '',
    phone: '',
    email: '',
    title: '',
    gender: '',
    idType: '',
    identityNumber: '',
    dateOfBirth: '',
    nationality: '',
    userType: 'individual' as 'individual' | 'business',
  });

  const titles = ['Mr', 'Mrs', 'Ms', 'Dr', 'Prof'];
  const genders = ['Male', 'Female', 'Other'];
  const idTypes = ['National ID', 'Passport'];

  const months = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 1919 }, (_, i) => currentYear - i);

  const navigateDobMonth = (direction: 'prev' | 'next') => {
    setIsAnimating(true);
    Animated.timing(opacityAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      setCurrentDobCalendarMonth(prev => {
        const newMonth = new Date(prev);
        newMonth.setMonth(prev.getMonth() + (direction === 'next' ? 1 : -1));
        return newMonth;
      });
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }).start(() => {
        setIsAnimating(false);
      });
    });
  };

  const onDobPanGestureEvent = (event: any) => {
    if (isAnimating) return;
    const { translationX, state } = event.nativeEvent;
    const threshold = 50;
    if (state === State.END && Math.abs(translationX) > threshold) {
      navigateDobMonth(translationX > 0 ? 'prev' : 'next');
    }
  };

  const handleDobSelect = (dateString: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const [year, month, day] = dateString.split('-');
    setDateOfBirth(`${day}/${month}/${year}`);
    setShowDobPicker(false);
    const selectedDate = new Date(Number(year), Number(month) - 1, Number(day));
    setCurrentDobCalendarMonth(selectedDate);
  };

  const loadProfile = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await getProfile(user.id);
      if (error) throw error;

      if (data) {
        setProfile(data);
        setFullName(data.full_name ?? '');
        setBusinessName(data.business_name ?? '');
        setPhone(data.phone ?? '');
        setEmail(data.email ?? '');
        setUserType((data.user_type as 'individual' | 'business') ?? userType);
        setTitle(data.title ?? '');
        setGender(data.gender ?? '');
        setIdType(data.id_type ?? '');
        setIdentityNumber(data.identity_number ?? '');
        setDateOfBirth(formatDateOfBirthForDisplay(data.date_of_birth));
        setNationality(data.nationality ?? '');

        // Store original values for comparison
        setOriginalValues({
          fullName: data.full_name ?? '',
          businessName: data.business_name ?? '',
          phone: data.phone ?? '',
          email: data.email ?? '',
          title: data.title ?? '',
          gender: data.gender ?? '',
          idType: data.id_type ?? '',
          identityNumber: data.identity_number ?? '',
          dateOfBirth: formatDateOfBirthForDisplay(data.date_of_birth),
          nationality: data.nationality ?? '',
          userType: (data.user_type as 'individual' | 'business') ?? userType,
        });

        if (data.date_of_birth) {
          const [year, month] = data.date_of_birth.split('-');
          if (year && month) {
            const newMonth = new Date(Number(year), Number(month) - 1, 1);
            setCurrentDobCalendarMonth(newMonth);
          }
        }

        if (data.avatar_url && data.avatar_url !== profileImage) {
          setProfileImage(data.avatar_url);
        }

        setIsExistingUser(true);
      } else {
        setIsExistingUser(false);
      }
    } catch (error: any) {
      console.error('Error loading profile:', error);
    }
  }, [user, profileImage, userType]);

  const loadReviews = useCallback(async () => {
    setReviews([]);
  }, []);

  useEffect(() => {
    if (user) {
      setFullName(user.user_metadata?.full_name || '');
      setBusinessName(user.user_metadata?.business_name || '');
      setEmail(user.email || '');
      setUserType(user.user_metadata?.user_type || 'individual');

      const userAvatar = user.user_metadata?.avatar_url;
      if (userAvatar) {
        setProfileImage(userAvatar);
      }

      loadProfile();
      loadReviews();
    }
  }, [user, loadProfile, loadReviews]);

  useEffect(() => {
    if (!editing) {
      setShowTitlePicker(false);
      setShowGenderPicker(false);
      setShowIdTypePicker(false);
      setShowNationalityPicker(false);
      setShowDobPicker(false);
      setShowMonthPicker(false);
      setShowYearPicker(false);
      setNationalitySearch('');
    }
  }, [editing]);

  // Check if any values have changed
  const hasChanges = () => {
    return (
      fullName !== originalValues.fullName ||
      businessName !== originalValues.businessName ||
      phone !== originalValues.phone ||
      email !== originalValues.email ||
      title !== originalValues.title ||
      gender !== originalValues.gender ||
      idType !== originalValues.idType ||
      identityNumber !== originalValues.identityNumber ||
      dateOfBirth !== originalValues.dateOfBirth ||
      nationality !== originalValues.nationality ||
      userType !== originalValues.userType
    );
  };

  const saveProfile = async () => {
    if (!user) return;

    setAttemptedSubmit(true);

    // Validate required fields
    const requiredFieldsFilled =
      fullName.trim() &&
      title.trim() &&
      gender.trim() &&
      idType.trim() &&
      identityNumber.trim() &&
      dateOfBirth.trim() &&
      nationality.trim() &&
      email.trim() &&
      phone.trim();

    if (!requiredFieldsFilled) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setSaving(true);
    try {
      const normalizedDob = normalizeDateOfBirthInput(dateOfBirth);
      const trimmedTitle = title.trim();
      const trimmedGender = gender.trim();
      const trimmedIdType = idType.trim();
      const trimmedIdentityNumber = identityNumber.trim();
      const trimmedNationality = nationality.trim();
      const trimmedFullName = fullName.trim();
      const trimmedBusinessName = businessName.trim();
      const trimmedPhone = phone.trim();
      const trimmedEmail = email.trim();

      const profileData = {
        full_name: trimmedFullName,
        business_name: trimmedBusinessName || null,
        phone: trimmedPhone,
        user_type: userType,
        email: trimmedEmail,
        title: trimmedTitle,
        gender: trimmedGender,
        id_type: trimmedIdType,
        identity_number: trimmedIdentityNumber,
        date_of_birth: normalizedDob,
        nationality: trimmedNationality,
      };

      const { error: profileError } = await updateProfile(user.id, profileData);
      if (profileError) throw profileError;

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setEditing(false);
      setAttemptedSubmit(false);
      loadProfile();
    } catch (error: any) {
      console.error('Error saving profile:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = () => {
    showAlert({
      title: 'Change Password',
      message: 'A password reset link will be sent to your email address.',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send Reset Link',
          onPress: async () => {
            try {
              const { data, error } = await resetPassword(email || user?.email || '');
              if (error) throw error;

              showAlert({
                title: 'Password Reset Sent',
                message: data?.resetUrl
                  ? 'Email delivery is not configured yet. Use the reset link surfaced in the sign-in flow, or configure email delivery to send the reset email automatically.'
                  : 'Check your email for a password reset link.',
                buttons: [{ text: 'OK' }],
              });
            } catch (error: any) {
              showAlert({ title: 'Error', message: 'Failed to send password reset: ' + error.message, buttons: [{ text: 'OK' }] });
            }
          },
        },
      ],
    });
  };

  const handleDeleteAccount = () => {
    showAlert({
      title: 'Delete Account',
      message:
        'This will permanently remove your account, bookings, favorites, and provider data. This action cannot be undone.',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              if (!user) {
                throw new Error('No user found');
              }

              setDeletingAccount(true);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

              const { ok } = await apiFetch<{ ok: boolean }>('/api/profile', {
                method: 'DELETE',
              });

              if (!ok) {
                throw new Error('Delete request did not complete successfully.');
              }

              await signOut();

              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              router.replace('/auth');
            } catch (error: any) {
              console.error('Error deleting account:', error);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              showAlert({ title: 'Error', message: 'Failed to delete account: ' + error.message, buttons: [{ text: 'OK' }] });
            } finally {
              setDeletingAccount(false);
            }
          },
        },
      ],
    });
  };

  const bgColor = isDark ? Colors.dark.background : Colors.light.background;
  const textColor = isDark ? Colors.dark.text : Colors.light.text;
  const { background: cardBgColor, border: borderColor } = getCardSurfaceColors(colorScheme);

  const handleGoBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  const handleEditToggle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditing(prev => !prev);
  };

  const handleSave = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    saveProfile();
  };

  const handleImagePicker = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showAlert({ title: 'Permission Required', message: 'Please grant permission to access your photo library.', buttons: [{ text: 'OK' }] });
        return;
      }

      showAlert({
        title: 'Profile Picture',
        message: 'Choose an option',
        buttons: [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Take Photo', onPress: () => openCamera() },
          { text: 'Choose from Library', onPress: () => openImageLibrary() },
          ...(profileImage
            ? [{ text: 'Remove Photo', onPress: () => removeProfileImage(), style: 'destructive' as const }]
            : []),
        ],
      });
    } catch (error) {
      console.error('Error requesting permissions:', error);
      showAlert({ title: 'Error', message: 'Failed to request permissions', buttons: [{ text: 'OK' }] });
    }
  };

  const openCamera = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        showAlert({ title: 'Permission Required', message: 'Please grant permission to access your camera.', buttons: [{ text: 'OK' }] });
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadProfileImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error opening camera:', error);
      showAlert({ title: 'Error', message: 'Failed to open camera', buttons: [{ text: 'OK' }] });
    }
  };

  const openImageLibrary = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadProfileImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error opening image library:', error);
      showAlert({ title: 'Error', message: 'Failed to open image library', buttons: [{ text: 'OK' }] });
    }
  };

  const uploadProfileImage = async (imageUri: string) => {
    if (!user) return;

    setUploadingImage(true);
    try {
      void imageUri;
      showAlert({
        title: 'Coming Soon',
        message:
          'Profile photo uploads will be re-enabled once the shared backend storage flow is finalized.',
        buttons: [{ text: 'OK' }],
      });
    } catch (error: any) {
      console.error('Error uploading image:', error);
      showAlert({ title: 'Error', message: 'Failed to upload image: ' + error.message, buttons: [{ text: 'OK' }] });
    } finally {
      setUploadingImage(false);
    }
  };

  const removeProfileImage = async () => {
    if (!user || !profileImage) return;

    setUploadingImage(true);
    try {
      const { error } = await updateProfile(user.id, { avatar_url: null });

      if (error) throw error;

      setProfileImage(null);
      showAlert({ title: 'Success', message: 'Profile picture removed successfully', buttons: [{ text: 'OK' }] });
    } catch (error: any) {
      console.error('Error removing image:', error);
      showAlert({ title: 'Error', message: 'Failed to remove image: ' + error.message, buttons: [{ text: 'OK' }] });
    } finally {
      setUploadingImage(false);
    }
  };

  const displayImage = profileImage || user?.user_metadata?.avatar_url;

  return (
    <IOSScreenWrapper>
      <ThemedView style={styles.container} lightColor="#f2f2f7" darkColor="#000000">
        <WallpaperPattern />

        <CustomHeader
          showLogo
          leftAction={{
            icon: 'chevron-back',
            onPress: handleGoBack,
            color: '#FF3B30',
          }}
        />

        <View style={styles.titleSection}>
          <ThemedText type="title1" style={styles.pageTitle}>
            Profile
          </ThemedText>
        </View>

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={[styles.profileCard, { backgroundColor: cardBgColor, borderColor }]}>
            <View style={styles.avatarSection}>
              <TouchableOpacity onPress={handleEditToggle} style={styles.profileEditButton}>
                <View
                  style={[
                    styles.profileEditButtonInner,
                    {
                      backgroundColor: isDark
                        ? 'rgba(255, 59, 48, 0.15)'
                        : 'rgba(255, 59, 48, 0.1)',
                    },
                  ]}
                >
                  <Text style={[styles.profileEditButtonText, { color: '#FF3B30' }]}>
                    {editing ? 'Cancel' : 'Edit'}
                  </Text>
                </View>
              </TouchableOpacity>

              {editing ? (
                <TouchableOpacity
                  style={styles.avatarContainer}
                  onPress={handleImagePicker}
                  disabled={uploadingImage}
                >
                  <View style={[styles.avatarPlaceholder, { backgroundColor: borderColor }]}>
                    {displayImage ? (
                      <Image source={{ uri: displayImage }} style={styles.avatarImage} />
                    ) : (
                      <Ionicons name="person" size={50} color={textColor} />
                    )}
                  </View>
                  <View
                    style={[
                      styles.avatarEditButton,
                      { backgroundColor: isDark ? Colors.dark.tint : Colors.light.tint },
                    ]}
                  >
                    {uploadingImage ? (
                      <ActivityIndicator size="small" color={bgColor} />
                    ) : (
                      <Ionicons name="camera" size={16} color={bgColor} />
                    )}
                  </View>
                </TouchableOpacity>
              ) : (
                <View style={styles.avatarContainer}>
                  <View style={[styles.avatarPlaceholder, { backgroundColor: borderColor }]}>
                    {displayImage ? (
                      <Image source={{ uri: displayImage }} style={styles.avatarImage} />
                    ) : (
                      <Ionicons name="person" size={50} color={textColor} />
                    )}
                  </View>
                </View>
              )}
            </View>

            <View style={styles.ratingSection}>
              <View style={styles.ratingDisplay}>
                <View style={styles.starsContainer}>
                  {[1, 2, 3, 4, 5].map(star => (
                    <Ionicons
                      key={star}
                      name={star <= (profile?.rating || 0) ? 'star' : 'star-outline'}
                      size={20}
                      color={star <= (profile?.rating || 0) ? '#FFD700' : `${textColor}40`}
                      style={styles.star}
                    />
                  ))}
                </View>
                <Text style={[styles.ratingText, { color: textColor }]}>
                  {profile?.rating
                    ? `${profile.rating.toFixed(1)} (${profile.total_reviews || 0} reviews)`
                    : 'No reviews yet'}
                </Text>
              </View>
            </View>

            <View style={styles.infoSection}>
              {editing ? (
                <>
                  <View style={styles.formGroup}>
                    <Text style={[styles.label, { color: textColor }]}>Account Type</Text>
                    <View
                      style={[
                        styles.toggleContainer,
                        { backgroundColor: borderColor, opacity: isExistingUser ? 0.6 : 1 },
                      ]}
                    >
                      <TouchableOpacity
                        style={[
                          styles.toggleButton,
                          userType === 'individual' && {
                            backgroundColor: isDark ? Colors.dark.tint : Colors.light.tint,
                          },
                        ]}
                        onPress={() => !isExistingUser && setUserType('individual')}
                        disabled={isExistingUser}
                      >
                        <Text
                          style={[
                            styles.toggleText,
                            {
                              color:
                                userType === 'individual'
                                  ? bgColor
                                  : isExistingUser
                                    ? `${textColor}60`
                                    : textColor,
                              fontWeight: userType === 'individual' ? 'bold' : 'normal',
                            },
                          ]}
                        >
                          Individual
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.toggleButton,
                          userType === 'business' && {
                            backgroundColor: isDark ? Colors.dark.tint : Colors.light.tint,
                          },
                        ]}
                        onPress={() => !isExistingUser && setUserType('business')}
                        disabled={isExistingUser}
                      >
                        <Text
                          style={[
                            styles.toggleText,
                            {
                              color:
                                userType === 'business'
                                  ? bgColor
                                  : isExistingUser
                                    ? `${textColor}60`
                                    : textColor,
                              fontWeight: userType === 'business' ? 'bold' : 'normal',
                            },
                          ]}
                        >
                          Service Provider
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.formGroup}>
                    <View style={styles.labelErrorContainer}>
                      <Text style={[styles.label, { color: textColor }]}>Title</Text>
                      {attemptedSubmit && !title && (
                        <Text style={[styles.inputRequired, { color: '#FF3B30' }]}>
                          This field is required
                        </Text>
                      )}
                    </View>
                    <TouchableOpacity
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setShowTitlePicker(true);
                      }}
                      style={[
                        styles.passengerInput,
                        attemptedSubmit && !title && styles.errorBorder,
                        {
                          backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        },
                      ]}
                    >
                      <Text
                        style={{
                          color: title
                            ? isDark
                              ? '#FFFFFF'
                              : '#1C1C1E'
                            : isDark
                              ? 'rgba(235,235,245,0.5)'
                              : 'rgba(60,60,67,0.6)',
                          fontSize: responsiveFontSize(16),
                          fontFamily: Fonts.regular,
                        }}
                      >
                        {title || 'Select title'}
                      </Text>
                      <Ionicons
                        name="chevron-down"
                        size={20}
                        color={isDark ? 'rgba(235,235,245,0.5)' : 'rgba(60,60,67,0.6)'}
                      />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.formGroup}>
                    <View style={styles.labelErrorContainer}>
                      <Text style={[styles.label, { color: textColor }]}>
                        {userType === 'business' ? 'Service Provider Name' : 'Full Name'}
                      </Text>
                      {attemptedSubmit &&
                        (userType === 'business' ? !businessName.trim() : !fullName.trim()) && (
                          <Text style={[styles.inputRequired, { color: '#FF3B30' }]}>
                            This field is required
                          </Text>
                        )}
                    </View>
                    <TextInput
                      style={[
                        styles.passengerInput,
                        isExistingUser && styles.disabledInput,
                        attemptedSubmit &&
                          (userType === 'business' ? !businessName.trim() : !fullName.trim()) &&
                          styles.errorBorder,
                        {
                          backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
                          color: isExistingUser
                            ? isDark
                              ? 'rgba(235,235,245,0.5)'
                              : 'rgba(60,60,67,0.5)'
                            : isDark
                              ? '#FFFFFF'
                              : '#1C1C1E',
                        },
                      ]}
                      value={userType === 'business' ? businessName : fullName}
                      onChangeText={value => {
                        if (isExistingUser) {
                          return;
                        }
                        if (userType === 'business') {
                          setBusinessName(value);
                        } else {
                          setFullName(value);
                        }
                      }}
                      placeholder={
                        userType === 'business' ? 'Enter service provider name' : 'Enter full name'
                      }
                      placeholderTextColor={isDark ? 'rgba(235,235,245,0.5)' : 'rgba(60,60,67,0.6)'}
                      editable={!isExistingUser}
                      autoCapitalize="words"
                    />
                  </View>

                  <View style={styles.formGroup}>
                    <View style={styles.labelErrorContainer}>
                      <Text style={[styles.label, { color: textColor }]}>Gender</Text>
                      {attemptedSubmit && !gender && (
                        <Text style={[styles.inputRequired, { color: '#FF3B30' }]}>
                          This field is required
                        </Text>
                      )}
                    </View>
                    <TouchableOpacity
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setShowGenderPicker(true);
                      }}
                      style={[
                        styles.passengerInput,
                        attemptedSubmit && !gender && styles.errorBorder,
                        {
                          backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        },
                      ]}
                    >
                      <Text
                        style={{
                          color: gender
                            ? isDark
                              ? '#FFFFFF'
                              : '#1C1C1E'
                            : isDark
                              ? 'rgba(235,235,245,0.5)'
                              : 'rgba(60,60,67,0.6)',
                          fontSize: responsiveFontSize(16),
                          fontFamily: Fonts.regular,
                        }}
                      >
                        {gender || 'Select gender'}
                      </Text>
                      <Ionicons
                        name="chevron-down"
                        size={20}
                        color={isDark ? 'rgba(235,235,245,0.5)' : 'rgba(60,60,67,0.6)'}
                      />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.formGroup}>
                    <View style={styles.labelErrorContainer}>
                      <Text style={[styles.label, { color: textColor }]}>ID Type</Text>
                      {attemptedSubmit && !idType && (
                        <Text style={[styles.inputRequired, { color: '#FF3B30' }]}>
                          This field is required
                        </Text>
                      )}
                    </View>
                    <TouchableOpacity
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setShowIdTypePicker(true);
                      }}
                      style={[
                        styles.passengerInput,
                        attemptedSubmit && !idType && styles.errorBorder,
                        {
                          backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        },
                      ]}
                    >
                      <Text
                        style={{
                          color: idType
                            ? isDark
                              ? '#FFFFFF'
                              : '#1C1C1E'
                            : isDark
                              ? 'rgba(235,235,245,0.5)'
                              : 'rgba(60,60,67,0.6)',
                          fontSize: responsiveFontSize(16),
                          fontFamily: Fonts.regular,
                        }}
                      >
                        {idType || 'Select ID type'}
                      </Text>
                      <Ionicons
                        name="chevron-down"
                        size={20}
                        color={isDark ? 'rgba(235,235,245,0.5)' : 'rgba(60,60,67,0.6)'}
                      />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.formGroup}>
                    <View style={styles.labelErrorContainer}>
                      <Text style={[styles.label, { color: textColor }]}>Identity Number</Text>
                      {attemptedSubmit && !identityNumber && (
                        <Text style={[styles.inputRequired, { color: '#FF3B30' }]}>
                          This field is required
                        </Text>
                      )}
                    </View>
                    <TextInput
                      style={[
                        styles.passengerInput,
                        attemptedSubmit && !identityNumber && styles.errorBorder,
                        {
                          backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
                          color: isDark ? '#FFFFFF' : '#1C1C1E',
                        },
                      ]}
                      value={identityNumber}
                      onChangeText={setIdentityNumber}
                      placeholder="Enter identity number"
                      placeholderTextColor={isDark ? 'rgba(235,235,245,0.5)' : 'rgba(60,60,67,0.6)'}
                      autoCapitalize="characters"
                    />
                  </View>

                  <View style={styles.formGroup}>
                    <View style={styles.labelErrorContainer}>
                      <Text style={[styles.label, { color: textColor }]}>Date of Birth</Text>
                      {attemptedSubmit && !dateOfBirth && (
                        <Text style={[styles.inputRequired, { color: '#FF3B30' }]}>
                          This field is required
                        </Text>
                      )}
                    </View>
                    <TouchableOpacity
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setShowDobPicker(true);
                      }}
                      style={[
                        styles.passengerInput,
                        attemptedSubmit && !dateOfBirth && styles.errorBorder,
                        {
                          backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        },
                      ]}
                    >
                      <Text
                        style={{
                          color: dateOfBirth
                            ? isDark
                              ? '#FFFFFF'
                              : '#1C1C1E'
                            : isDark
                              ? 'rgba(235,235,245,0.5)'
                              : 'rgba(60,60,67,0.6)',
                          fontSize: responsiveFontSize(16),
                          fontFamily: Fonts.regular,
                        }}
                      >
                        {dateOfBirth || 'DD/MM/YYYY'}
                      </Text>
                      <Ionicons
                        name="calendar-outline"
                        size={20}
                        color={isDark ? 'rgba(235,235,245,0.5)' : 'rgba(60,60,67,0.6)'}
                      />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.formGroup}>
                    <View style={styles.labelErrorContainer}>
                      <Text style={[styles.label, { color: textColor }]}>Nationality</Text>
                      {attemptedSubmit && !nationality && (
                        <Text style={[styles.inputRequired, { color: '#FF3B30' }]}>
                          This field is required
                        </Text>
                      )}
                    </View>
                    <TouchableOpacity
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setShowNationalityPicker(true);
                      }}
                      style={[
                        styles.passengerInput,
                        attemptedSubmit && !nationality && styles.errorBorder,
                        {
                          backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 8,
                        },
                      ]}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        {nationality && countries.find(c => c.name === nationality) && (
                          <View style={{ height: 24, justifyContent: 'center' }}>
                            <Text
                              style={{
                                fontSize: responsiveFontSize(20),
                                lineHeight: 24,
                                includeFontPadding: false,
                              }}
                            >
                              {countries.find(c => c.name === nationality)?.flag}
                            </Text>
                          </View>
                        )}
                        <Text
                          style={{
                            color: nationality
                              ? isDark
                                ? '#FFFFFF'
                                : '#1C1C1E'
                              : isDark
                                ? 'rgba(235,235,245,0.5)'
                                : 'rgba(60,60,67,0.6)',
                            fontSize: responsiveFontSize(16),
                            fontFamily: Fonts.regular,
                          }}
                        >
                          {nationality || 'Select nationality'}
                        </Text>
                      </View>
                      <Ionicons
                        name="chevron-down"
                        size={20}
                        color={isDark ? 'rgba(235,235,245,0.5)' : 'rgba(60,60,67,0.6)'}
                      />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.formGroup}>
                    <View style={styles.labelErrorContainer}>
                      <Text style={[styles.label, { color: textColor }]}>Email Address</Text>
                      {attemptedSubmit && !email && (
                        <Text style={[styles.inputRequired, { color: '#FF3B30' }]}>
                          This field is required
                        </Text>
                      )}
                    </View>
                    <TextInput
                      style={[
                        styles.passengerInput,
                        attemptedSubmit && !email && styles.errorBorder,
                        {
                          backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
                          color: isDark ? '#FFFFFF' : '#1C1C1E',
                        },
                      ]}
                      value={email}
                      onChangeText={setEmail}
                      placeholder="Enter email address"
                      placeholderTextColor={isDark ? 'rgba(235,235,245,0.5)' : 'rgba(60,60,67,0.6)'}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                  </View>

                  <View style={styles.formGroup}>
                    <View style={styles.labelErrorContainer}>
                      <Text style={[styles.label, { color: textColor }]}>Cell Phone Number</Text>
                      {attemptedSubmit && !phone && (
                        <Text style={[styles.inputRequired, { color: '#FF3B30' }]}>
                          This field is required
                        </Text>
                      )}
                    </View>
                    <TextInput
                      style={[
                        styles.passengerInput,
                        attemptedSubmit && !phone && styles.errorBorder,
                        {
                          backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
                          color: isDark ? '#FFFFFF' : '#1C1C1E',
                        },
                      ]}
                      value={phone}
                      onChangeText={setPhone}
                      placeholder="Enter phone number"
                      placeholderTextColor={isDark ? 'rgba(235,235,245,0.5)' : 'rgba(60,60,67,0.6)'}
                      keyboardType="phone-pad"
                    />
                  </View>

                  <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={handleSave}
                    disabled={saving || !hasChanges()}
                    style={[
                      styles.profileSaveButton,
                      {
                        backgroundColor: '#34C759',
                        borderColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)',
                        opacity: saving ? 0.7 : !hasChanges() ? 0.3 : 1,
                      },
                    ]}
                  >
                    {saving ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Ionicons name="save" size={20} color="#FFFFFF" />
                    )}
                    <ThemedText style={[styles.profileSaveButtonText, { color: '#FFFFFF' }]}>
                      {saving ? 'SAVING...' : 'SAVE'}
                    </ThemedText>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <Text style={[styles.displayName, { color: textColor }]}>
                    {userType === 'business'
                      ? businessName || profile?.business_name || 'Service Provider'
                      : fullName || profile?.full_name || 'User'}
                  </Text>
                  <Text style={[styles.email, { color: `${textColor}80` }]}>{user?.email}</Text>
                  {phone ? (
                    <Text style={[styles.phone, { color: `${textColor}80` }]}>{phone}</Text>
                  ) : null}
                  <Text style={[styles.userTypeText, { color: `${textColor}60` }]}>
                    {userType === 'business' ? 'Service Provider Account' : 'Individual Account'}
                  </Text>
                </>
              )}
            </View>
          </View>

          {reviews.length > 0 && (
            <View style={[styles.reviewsCard, { backgroundColor: cardBgColor, borderColor }]}>
              <Text style={[styles.sectionTitle, { color: textColor }]}>Recent Reviews</Text>
              {reviews.map(review => (
                <View
                  key={review.id}
                  style={[styles.reviewItem, { borderBottomColor: borderColor }]}
                >
                  <View style={styles.reviewHeader}>
                    <View style={styles.reviewerInfo}>
                      <Ionicons name="person-circle" size={32} color={`${textColor}60`} />
                      <Text style={[styles.reviewerName, { color: textColor }]}>
                        {review.reviewer?.user_type === 'business'
                          ? review.reviewer?.business_name
                          : review.reviewer?.full_name}
                      </Text>
                    </View>
                    <View style={styles.reviewStars}>
                      {[1, 2, 3, 4, 5].map(star => (
                        <Ionicons
                          key={star}
                          name={star <= review.rating ? 'star' : 'star-outline'}
                          size={14}
                          color={star <= review.rating ? '#FFD700' : `${textColor}40`}
                        />
                      ))}
                    </View>
                  </View>
                  {review.comment ? (
                    <Text style={[styles.reviewComment, { color: `${textColor}80` }]}>
                      {review.comment}
                    </Text>
                  ) : null}
                </View>
              ))}
            </View>
          )}

          <View
            style={[
              styles.settingsCard,
              { backgroundColor: 'transparent', borderColor: 'transparent', marginTop: -15 },
            ]}
          >
            <TouchableOpacity
              activeOpacity={0.9}
              style={[
                styles.passwordButton,
                {
                  backgroundColor: isDark ? '#FFFFFF' : '#000000',
                  borderColor: 'transparent',
                  marginBottom: 12,
                  marginTop: 12,
                },
              ]}
              onPress={handlePasswordChange}
            >
              <Ionicons name="lock-closed" size={20} color={isDark ? '#000000' : '#FFFFFF'} />
              <Text style={[styles.passwordButtonText, { color: isDark ? '#000000' : '#FFFFFF' }]}>
                CHANGE PASSWORD
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.9}
              disabled={deletingAccount}
              style={[
                styles.deleteAccountItem,
                { backgroundColor: '#FF3B30', opacity: deletingAccount ? 0.6 : 1 },
              ]}
              onPress={handleDeleteAccount}
            >
              {deletingAccount ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="trash" size={20} color="white" />
              )}
              <Text style={[styles.deleteAccountText, { color: 'white' }]}>
                {deletingAccount ? 'DELETING...' : 'DELETE ACCOUNT'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.bottomSpacer} />
        </ScrollView>

        {/* Title Picker Modal */}
        <Modal
          visible={showTitlePicker}
          transparent={true}
          animationType="fade"
          statusBarTranslucent={true}
          onRequestClose={() => setShowTitlePicker(false)}
        >
          <TouchableOpacity
            style={styles.fullScreenBackdrop}
            onPress={() => setShowTitlePicker(false)}
            activeOpacity={1}
          >
            <View style={styles.guestDropdownContainer}>
              <View style={styles.cardWrapper}>
                <TouchableOpacity
                  activeOpacity={1}
                  onPress={e => e.stopPropagation()}
                  style={[
                    styles.guestDropdownCard,
                    {
                      backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
                      position: 'relative',
                    },
                  ]}
                >
                  <View style={styles.guestDropdownHeader}>
                    <ThemedText style={styles.guestDropdownTitle}>Select Title</ThemedText>
                    <TouchableOpacity
                      style={styles.guestDropdownCloseButton}
                      onPress={() => setShowTitlePicker(false)}
                    >
                      <View
                        style={[
                          styles.closeButtonCircle,
                          {
                            backgroundColor: isDark
                              ? 'rgba(255, 59, 48, 0.15)'
                              : 'rgba(255, 59, 48, 0.15)',
                          },
                        ]}
                      >
                        <Ionicons
                          name="close-sharp"
                          size={28}
                          color="#FF3B30"
                          style={{ textAlign: 'center', fontWeight: '900' }}
                        />
                      </View>
                    </TouchableOpacity>
                  </View>

                  <ScrollView style={{ maxHeight: 400 }}>
                    <View style={styles.guestSection}>
                      {titles.map(titleOption => (
                        <TouchableOpacity
                          key={titleOption}
                          style={[
                            styles.guestRow,
                            {
                              backgroundColor:
                                title === titleOption
                                  ? isDark
                                    ? 'rgba(52, 199, 89, 0.15)'
                                    : 'rgba(52, 199, 89, 0.1)'
                                  : isDark
                                    ? 'rgba(255,255,255,0.05)'
                                    : 'rgba(0,0,0,0.03)',
                              marginTop: 8,
                            },
                          ]}
                          onPress={e => {
                            e.stopPropagation();
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                            setTitle(titleOption);
                            setShowTitlePicker(false);
                          }}
                        >
                          <ThemedText
                            style={[
                              styles.guestSubLabel,
                              title === titleOption && { fontFamily: Fonts.bold },
                            ]}
                          >
                            {titleOption}
                          </ThemedText>
                          <View
                            style={{
                              width: 28,
                              height: 28,
                              justifyContent: 'center',
                              alignItems: 'center',
                            }}
                          >
                            {title === titleOption && (
                              <Ionicons name="checkmark-circle" size={28} color="#34C759" />
                            )}
                          </View>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Gender Picker Modal */}
        <Modal
          visible={showGenderPicker}
          transparent={true}
          animationType="fade"
          statusBarTranslucent={true}
          onRequestClose={() => setShowGenderPicker(false)}
        >
          <TouchableOpacity
            style={styles.fullScreenBackdrop}
            onPress={() => setShowGenderPicker(false)}
            activeOpacity={1}
          >
            <View style={styles.guestDropdownContainer}>
              <View style={styles.cardWrapper}>
                <TouchableOpacity
                  activeOpacity={1}
                  onPress={e => e.stopPropagation()}
                  style={[
                    styles.guestDropdownCard,
                    {
                      backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
                      position: 'relative',
                    },
                  ]}
                >
                  <View style={styles.guestDropdownHeader}>
                    <ThemedText style={styles.guestDropdownTitle}>Select Gender</ThemedText>
                    <TouchableOpacity
                      style={styles.guestDropdownCloseButton}
                      onPress={() => setShowGenderPicker(false)}
                    >
                      <View
                        style={[
                          styles.closeButtonCircle,
                          {
                            backgroundColor: isDark
                              ? 'rgba(255, 59, 48, 0.15)'
                              : 'rgba(255, 59, 48, 0.15)',
                          },
                        ]}
                      >
                        <Ionicons
                          name="close-sharp"
                          size={28}
                          color="#FF3B30"
                          style={{ textAlign: 'center', fontWeight: '900' }}
                        />
                      </View>
                    </TouchableOpacity>
                  </View>

                  <ScrollView style={{ maxHeight: 400 }}>
                    <View style={styles.guestSection}>
                      {genders.map(genderOption => (
                        <TouchableOpacity
                          key={genderOption}
                          style={[
                            styles.guestRow,
                            {
                              backgroundColor:
                                gender === genderOption
                                  ? isDark
                                    ? 'rgba(52, 199, 89, 0.15)'
                                    : 'rgba(52, 199, 89, 0.1)'
                                  : isDark
                                    ? 'rgba(255,255,255,0.05)'
                                    : 'rgba(0,0,0,0.03)',
                              marginTop: 8,
                            },
                          ]}
                          onPress={e => {
                            e.stopPropagation();
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                            setGender(genderOption);
                            setShowGenderPicker(false);
                          }}
                        >
                          <ThemedText
                            style={[
                              styles.guestSubLabel,
                              gender === genderOption && { fontFamily: Fonts.bold },
                            ]}
                          >
                            {genderOption}
                          </ThemedText>
                          <View
                            style={{
                              width: 28,
                              height: 28,
                              justifyContent: 'center',
                              alignItems: 'center',
                            }}
                          >
                            {gender === genderOption && (
                              <Ionicons name="checkmark-circle" size={28} color="#34C759" />
                            )}
                          </View>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* ID Type Picker Modal */}
        <Modal
          visible={showIdTypePicker}
          transparent={true}
          animationType="fade"
          statusBarTranslucent={true}
          onRequestClose={() => setShowIdTypePicker(false)}
        >
          <TouchableOpacity
            style={styles.fullScreenBackdrop}
            onPress={() => setShowIdTypePicker(false)}
            activeOpacity={1}
          >
            <View style={styles.guestDropdownContainer}>
              <View style={styles.cardWrapper}>
                <TouchableOpacity
                  activeOpacity={1}
                  onPress={e => e.stopPropagation()}
                  style={[
                    styles.guestDropdownCard,
                    {
                      backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
                      position: 'relative',
                    },
                  ]}
                >
                  <View style={styles.guestDropdownHeader}>
                    <ThemedText style={styles.guestDropdownTitle}>Select ID Type</ThemedText>
                    <TouchableOpacity
                      style={styles.guestDropdownCloseButton}
                      onPress={() => setShowIdTypePicker(false)}
                    >
                      <View
                        style={[
                          styles.closeButtonCircle,
                          {
                            backgroundColor: isDark
                              ? 'rgba(255, 59, 48, 0.15)'
                              : 'rgba(255, 59, 48, 0.15)',
                          },
                        ]}
                      >
                        <Ionicons
                          name="close-sharp"
                          size={28}
                          color="#FF3B30"
                          style={{ textAlign: 'center', fontWeight: '900' }}
                        />
                      </View>
                    </TouchableOpacity>
                  </View>

                  <ScrollView style={{ maxHeight: 400 }}>
                    <View style={styles.guestSection}>
                      {idTypes.map(idTypeOption => (
                        <TouchableOpacity
                          key={idTypeOption}
                          style={[
                            styles.guestRow,
                            {
                              backgroundColor:
                                idType === idTypeOption
                                  ? isDark
                                    ? 'rgba(52, 199, 89, 0.15)'
                                    : 'rgba(52, 199, 89, 0.1)'
                                  : isDark
                                    ? 'rgba(255,255,255,0.05)'
                                    : 'rgba(0,0,0,0.03)',
                              marginTop: 8,
                            },
                          ]}
                          onPress={e => {
                            e.stopPropagation();
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                            setIdType(idTypeOption);
                            setShowIdTypePicker(false);
                          }}
                        >
                          <ThemedText
                            style={[
                              styles.guestSubLabel,
                              idType === idTypeOption && { fontFamily: Fonts.bold },
                            ]}
                          >
                            {idTypeOption}
                          </ThemedText>
                          <View
                            style={{
                              width: 28,
                              height: 28,
                              justifyContent: 'center',
                              alignItems: 'center',
                            }}
                          >
                            {idType === idTypeOption && (
                              <Ionicons name="checkmark-circle" size={28} color="#34C759" />
                            )}
                          </View>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Nationality Picker Modal */}
        <Modal
          visible={showNationalityPicker}
          transparent={true}
          animationType="fade"
          statusBarTranslucent={true}
          onRequestClose={() => {
            setShowNationalityPicker(false);
            setNationalitySearch('');
          }}
        >
          <TouchableOpacity
            style={styles.fullScreenBackdrop}
            onPress={() => {
              setShowNationalityPicker(false);
              setNationalitySearch('');
            }}
            activeOpacity={1}
          >
            <View style={styles.guestDropdownContainer}>
              <View style={styles.cardWrapper}>
                <TouchableOpacity
                  activeOpacity={1}
                  onPress={e => e.stopPropagation()}
                  style={[
                    styles.guestDropdownCard,
                    {
                      backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
                      position: 'relative',
                    },
                  ]}
                >
                  <View style={styles.guestDropdownHeader}>
                    <ThemedText style={styles.guestDropdownTitle}>Select Nationality</ThemedText>
                    <TouchableOpacity
                      style={styles.guestDropdownCloseButton}
                      onPress={() => {
                        setShowNationalityPicker(false);
                        setNationalitySearch('');
                      }}
                    >
                      <View
                        style={[
                          styles.closeButtonCircle,
                          {
                            backgroundColor: isDark
                              ? 'rgba(255, 59, 48, 0.15)'
                              : 'rgba(255, 59, 48, 0.15)',
                          },
                        ]}
                      >
                        <Ionicons
                          name="close-sharp"
                          size={28}
                          color="#FF3B30"
                          style={{ textAlign: 'center', fontWeight: '900' }}
                        />
                      </View>
                    </TouchableOpacity>
                  </View>

                  <View style={{ paddingHorizontal: 20, paddingBottom: 12 }}>
                    <View
                      style={[
                        styles.passengerInput,
                        {
                          backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 8,
                        },
                      ]}
                    >
                      <Ionicons
                        name="search"
                        size={20}
                        color={isDark ? 'rgba(235,235,245,0.5)' : 'rgba(60,60,67,0.6)'}
                      />
                      <TextInput
                        placeholder="Search"
                        placeholderTextColor={
                          isDark ? 'rgba(235,235,245,0.5)' : 'rgba(60,60,67,0.6)'
                        }
                        style={{
                          flex: 1,
                          fontSize: responsiveFontSize(16),
                          fontFamily: Fonts.regular,
                          color: isDark ? '#FFFFFF' : '#1C1C1E',
                          padding: 0,
                        }}
                        value={nationalitySearch}
                        onChangeText={setNationalitySearch}
                        autoCapitalize="none"
                      />
                      {nationalitySearch.length > 0 && (
                        <TouchableOpacity onPress={() => setNationalitySearch('')}>
                          <Ionicons
                            name="close-circle"
                            size={20}
                            color={isDark ? 'rgba(235,235,245,0.5)' : 'rgba(60,60,67,0.6)'}
                          />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>

                  <ScrollView style={{ height: 400 }}>
                    <View style={styles.guestSection}>
                      {(() => {
                        const searchLower = nationalitySearch.toLowerCase();
                        const zimbabwe = countries.find(c => c.name === 'Zimbabwe');
                        if (!zimbabwe || !zimbabwe.name.toLowerCase().includes(searchLower)) {
                          return null;
                        }
                        const isSelected = nationality === zimbabwe.name;
                        return (
                          <TouchableOpacity
                            key="zimbabwe-top"
                            style={[
                              styles.guestRow,
                              {
                                backgroundColor: isSelected
                                  ? isDark
                                    ? 'rgba(52, 199, 89, 0.15)'
                                    : 'rgba(52, 199, 89, 0.1)'
                                  : isDark
                                    ? 'rgba(255,255,255,0.05)'
                                    : 'rgba(0,0,0,0.03)',
                                marginTop: 8,
                              },
                            ]}
                            onPress={e => {
                              e.stopPropagation();
                              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                              setNationality(zimbabwe.name);
                              setShowNationalityPicker(false);
                              setNationalitySearch('');
                            }}
                          >
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                              <ThemedText
                                style={{ fontSize: responsiveFontSize(28), lineHeight: 34, includeFontPadding: false }}
                              >
                                {zimbabwe.flag}
                              </ThemedText>
                              <ThemedText
                                style={[
                                  styles.guestSubLabel,
                                  isSelected && { fontFamily: Fonts.bold },
                                ]}
                              >
                                {zimbabwe.name}
                              </ThemedText>
                            </View>
                            <View
                              style={{
                                width: 28,
                                height: 28,
                                justifyContent: 'center',
                                alignItems: 'center',
                              }}
                            >
                              {isSelected && (
                                <Ionicons name="checkmark-circle" size={28} color="#34C759" />
                              )}
                            </View>
                          </TouchableOpacity>
                        );
                      })()}

                      {nationalitySearch === '' && (
                        <View
                          style={{
                            height: 1,
                            backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                            marginVertical: 12,
                          }}
                        />
                      )}

                      {countries
                        .filter(
                          country =>
                            country.name !== 'Zimbabwe' &&
                            country.name.toLowerCase().includes(nationalitySearch.toLowerCase())
                        )
                        .map(country => {
                          const isSelected = nationality === country.name;
                          return (
                            <TouchableOpacity
                              key={country.name}
                              style={[
                                styles.guestRow,
                                {
                                  backgroundColor: isSelected
                                    ? isDark
                                      ? 'rgba(52, 199, 89, 0.15)'
                                      : 'rgba(52, 199, 89, 0.1)'
                                    : isDark
                                      ? 'rgba(255,255,255,0.05)'
                                      : 'rgba(0,0,0,0.03)',
                                  marginTop: 8,
                                },
                              ]}
                              onPress={e => {
                                e.stopPropagation();
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                setNationality(country.name);
                                setShowNationalityPicker(false);
                                setNationalitySearch('');
                              }}
                            >
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                <ThemedText
                                  style={{
                                    fontSize: responsiveFontSize(28),
                                    lineHeight: 34,
                                    includeFontPadding: false,
                                  }}
                                >
                                  {country.flag}
                                </ThemedText>
                                <ThemedText
                                  style={[
                                    styles.guestSubLabel,
                                    isSelected && { fontFamily: Fonts.bold },
                                  ]}
                                >
                                  {country.name}
                                </ThemedText>
                              </View>
                              <View
                                style={{
                                  width: 28,
                                  height: 28,
                                  justifyContent: 'center',
                                  alignItems: 'center',
                                }}
                              >
                                {isSelected && (
                                  <Ionicons name="checkmark-circle" size={28} color="#34C759" />
                                )}
                              </View>
                            </TouchableOpacity>
                          );
                        })}
                    </View>
                  </ScrollView>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Date of Birth Picker Modal */}
        <Modal
          visible={showDobPicker}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowDobPicker(false)}
        >
          <TouchableOpacity
            style={styles.fullScreenBackdrop}
            onPress={() => setShowDobPicker(false)}
            activeOpacity={1}
          >
            <View style={styles.calendarModalContainer}>
              <View style={[styles.calendarModal, { backgroundColor: cardBgColor }]}>
                <View style={styles.calendarModalHeader}>
                  <ThemedText style={styles.calendarModalTitle}>Date of Birth</ThemedText>
                  <TouchableOpacity
                    style={styles.calendarModalCloseButton}
                    onPress={() => setShowDobPicker(false)}
                  >
                    <View
                      style={[
                        styles.closeButtonCircle,
                        {
                          backgroundColor: isDark
                            ? 'rgba(255, 59, 48, 0.15)'
                            : 'rgba(255, 59, 48, 0.15)',
                        },
                      ]}
                    >
                      <Ionicons name="close-sharp" size={28} color="#FF3B30" />
                    </View>
                  </TouchableOpacity>
                </View>

                <View style={styles.calendarHeader}>
                  <TouchableOpacity
                    style={[
                      styles.monthNavButton,
                      {
                        backgroundColor: isDark
                          ? 'rgba(255, 59, 48, 0.15)'
                          : 'rgba(255, 59, 48, 0.1)',
                      },
                    ]}
                    onPress={() => navigateDobMonth('prev')}
                  >
                    <FontAwesome6 name="chevron-left" size={20} color="#FF3B30" />
                  </TouchableOpacity>

                  <View style={styles.monthYearContainer}>
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={e => {
                        e?.stopPropagation?.();
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setShowDobPicker(false);
                        setTimeout(() => setShowMonthPicker(true), 100);
                      }}
                    >
                      <ThemedText style={styles.monthTitle}>
                        {currentDobCalendarMonth.toLocaleDateString('en-US', {
                          month: 'long',
                        })}
                      </ThemedText>
                    </TouchableOpacity>
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={e => {
                        e?.stopPropagation?.();
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setShowDobPicker(false);
                        setTimeout(() => setShowYearPicker(true), 100);
                      }}
                    >
                      <ThemedText style={styles.monthTitle}>
                        {currentDobCalendarMonth.getFullYear()}
                      </ThemedText>
                    </TouchableOpacity>
                  </View>

                  {(() => {
                    const today = new Date();
                    const isCurrentMonth =
                      currentDobCalendarMonth.getMonth() === today.getMonth() &&
                      currentDobCalendarMonth.getFullYear() === today.getFullYear();
                    return (
                      <TouchableOpacity
                        style={[
                          styles.monthNavButton,
                          {
                            backgroundColor: isCurrentMonth
                              ? isDark
                                ? 'rgba(255, 255, 255, 0.05)'
                                : 'rgba(0, 0, 0, 0.05)'
                              : isDark
                                ? 'rgba(255, 59, 48, 0.15)'
                                : 'rgba(255, 59, 48, 0.1)',
                            opacity: isCurrentMonth ? 0.3 : 1,
                          },
                        ]}
                        onPress={() => {
                          if (!isCurrentMonth) {
                            navigateDobMonth('next');
                          }
                        }}
                        disabled={isCurrentMonth}
                      >
                        <FontAwesome6
                          name="chevron-right"
                          size={20}
                          color={isCurrentMonth ? (isDark ? '#666' : '#999') : '#FF3B30'}
                        />
                      </TouchableOpacity>
                    );
                  })()}
                </View>

                <View style={styles.weekDaysHeader}>
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                    <View key={day} style={styles.weekDayItem}>
                      <ThemedText style={styles.weekDayText}>{day}</ThemedText>
                    </View>
                  ))}
                </View>

                <PanGestureHandler
                  ref={panGestureRef}
                  onHandlerStateChange={onDobPanGestureEvent}
                  onGestureEvent={onDobPanGestureEvent}
                  activeOffsetX={[-20, 20]}
                  failOffsetY={[-10, 10]}
                  shouldCancelWhenOutside={true}
                  enabled={!isAnimating}
                >
                  <Animated.View style={[styles.calendarGrid, { opacity: opacityAnim }]}>
                    {Array.from({ length: 6 }, (_, weekIndex) => {
                      const weekDays = [] as Array<null | {
                        day: number;
                        date: string;
                        isSelected: boolean;
                        isFutureDate: boolean;
                      }>;

                      for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
                        const totalDayIndex = weekIndex * 7 + dayIndex;
                        const firstDay = new Date(
                          currentDobCalendarMonth.getFullYear(),
                          currentDobCalendarMonth.getMonth(),
                          1
                        );
                        const startDay = (firstDay.getDay() + 6) % 7;
                        const daysInMonth = new Date(
                          currentDobCalendarMonth.getFullYear(),
                          currentDobCalendarMonth.getMonth() + 1,
                          0
                        ).getDate();

                        const dayNumber = totalDayIndex - startDay + 1;
                        const isValidDay = dayNumber > 0 && dayNumber <= daysInMonth;

                        if (!isValidDay) {
                          weekDays.push(null);
                          continue;
                        }

                        const currentDate = new Date(
                          currentDobCalendarMonth.getFullYear(),
                          currentDobCalendarMonth.getMonth(),
                          dayNumber
                        );
                        const dateString = `${currentDate.getFullYear()}-${String(
                          currentDate.getMonth() + 1
                        ).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
                        const displayedDob = dateOfBirth
                          ? dateOfBirth.split('/').reverse().join('-')
                          : '';
                        const isSelected = displayedDob === dateString;

                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        const isFutureDate = currentDate > today;

                        weekDays.push({
                          day: dayNumber,
                          date: dateString,
                          isSelected,
                          isFutureDate,
                        });
                      }

                      if (weekDays.every(day => day === null)) return null;

                      return (
                        <View key={`week-${weekIndex}`} style={styles.weekRow}>
                          {weekDays.map((day, dayIndex) => (
                            <View key={dayIndex} style={styles.calendarDayContainer}>
                              {day && (
                                <TouchableOpacity
                                  onPress={() => {
                                    if (!day.isFutureDate) {
                                      handleDobSelect(day.date);
                                    }
                                  }}
                                  disabled={day.isFutureDate}
                                  style={[
                                    styles.calendarDay,
                                    day.isSelected && styles.calendarDaySelected,
                                    {
                                      backgroundColor: day.isSelected
                                        ? '#FF3B30'
                                        : day.isFutureDate
                                          ? 'transparent'
                                          : isDark
                                            ? 'rgba(255,255,255,0.05)'
                                            : 'rgba(0,0,0,0.03)',
                                      opacity: day.isFutureDate ? 0.3 : 1,
                                    },
                                  ]}
                                >
                                  <ThemedText
                                    style={[
                                      styles.calendarDayText,
                                      day.isSelected && styles.calendarDayTextSelected,
                                      day.isFutureDate && {
                                        color: isDark ? '#666' : '#999',
                                      },
                                    ]}
                                  >
                                    {day.day}
                                  </ThemedText>
                                </TouchableOpacity>
                              )}
                            </View>
                          ))}
                        </View>
                      );
                    })}
                  </Animated.View>
                </PanGestureHandler>
              </View>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Month Picker Modal */}
        <Modal
          visible={showMonthPicker}
          transparent={true}
          animationType="fade"
          statusBarTranslucent={true}
          onRequestClose={() => setShowMonthPicker(false)}
        >
          <TouchableOpacity
            style={styles.fullScreenBackdrop}
            onPress={() => {
              setShowMonthPicker(false);
              setTimeout(() => setShowDobPicker(true), 100);
            }}
            activeOpacity={1}
          >
            <View style={styles.guestDropdownContainer}>
              <View style={styles.cardWrapper}>
                <TouchableOpacity
                  activeOpacity={1}
                  onPress={e => e.stopPropagation()}
                  style={[
                    styles.guestDropdownCard,
                    {
                      backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
                      position: 'relative',
                    },
                  ]}
                >
                  <View style={styles.guestDropdownHeader}>
                    <ThemedText style={styles.guestDropdownTitle}>Select Month</ThemedText>
                    <TouchableOpacity
                      style={styles.guestDropdownCloseButton}
                      onPress={() => {
                        setShowMonthPicker(false);
                        setTimeout(() => setShowDobPicker(true), 100);
                      }}
                    >
                      <View
                        style={[
                          styles.closeButtonCircle,
                          {
                            backgroundColor: isDark
                              ? 'rgba(255, 59, 48, 0.15)'
                              : 'rgba(255, 59, 48, 0.15)',
                          },
                        ]}
                      >
                        <Ionicons
                          name="close-sharp"
                          size={28}
                          color="#FF3B30"
                          style={{ textAlign: 'center', fontWeight: '900' }}
                        />
                      </View>
                    </TouchableOpacity>
                  </View>

                  <ScrollView style={{ maxHeight: 400 }}>
                    <View style={styles.guestSection}>
                      {months.map((month, index) => {
                        const isSelected = currentDobCalendarMonth.getMonth() === index;
                        const today = new Date();
                        const selectedYear = currentDobCalendarMonth.getFullYear();
                        const isFutureMonth =
                          selectedYear === today.getFullYear() && index > today.getMonth();

                        return (
                          <TouchableOpacity
                            key={month}
                            disabled={isFutureMonth}
                            style={[
                              styles.guestRow,
                              {
                                backgroundColor: isSelected
                                  ? isDark
                                    ? 'rgba(52, 199, 89, 0.15)'
                                    : 'rgba(52, 199, 89, 0.1)'
                                  : isFutureMonth
                                    ? 'transparent'
                                    : isDark
                                      ? 'rgba(255,255,255,0.05)'
                                      : 'rgba(0,0,0,0.03)',
                                marginTop: 8,
                                opacity: isFutureMonth ? 0.3 : 1,
                              },
                            ]}
                            onPress={e => {
                              if (!isFutureMonth) {
                                e.stopPropagation();
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                const newDate = new Date(currentDobCalendarMonth);
                                newDate.setMonth(index);
                                setCurrentDobCalendarMonth(newDate);
                                setShowMonthPicker(false);
                                setTimeout(() => setShowDobPicker(true), 100);
                              }
                            }}
                          >
                            <ThemedText
                              style={[
                                styles.guestSubLabel,
                                isSelected && { fontFamily: Fonts.bold },
                                isFutureMonth && { color: isDark ? '#666' : '#999' },
                              ]}
                            >
                              {month}
                            </ThemedText>
                            <View
                              style={{
                                width: 28,
                                height: 28,
                                justifyContent: 'center',
                                alignItems: 'center',
                              }}
                            >
                              {isSelected && (
                                <Ionicons name="checkmark-circle" size={28} color="#34C759" />
                              )}
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </ScrollView>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Year Picker Modal */}
        <Modal
          visible={showYearPicker}
          transparent={true}
          animationType="fade"
          statusBarTranslucent={true}
          onRequestClose={() => setShowYearPicker(false)}
        >
          <TouchableOpacity
            style={styles.fullScreenBackdrop}
            onPress={() => {
              setShowYearPicker(false);
              setTimeout(() => setShowDobPicker(true), 100);
            }}
            activeOpacity={1}
          >
            <View style={styles.guestDropdownContainer}>
              <View style={styles.cardWrapper}>
                <TouchableOpacity
                  activeOpacity={1}
                  onPress={e => e.stopPropagation()}
                  style={[
                    styles.guestDropdownCard,
                    {
                      backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
                      position: 'relative',
                    },
                  ]}
                >
                  <View style={styles.guestDropdownHeader}>
                    <ThemedText style={styles.guestDropdownTitle}>Select Year</ThemedText>
                    <TouchableOpacity
                      style={styles.guestDropdownCloseButton}
                      onPress={() => {
                        setShowYearPicker(false);
                        setTimeout(() => setShowDobPicker(true), 100);
                      }}
                    >
                      <View
                        style={[
                          styles.closeButtonCircle,
                          {
                            backgroundColor: isDark
                              ? 'rgba(255, 59, 48, 0.15)'
                              : 'rgba(255, 59, 48, 0.15)',
                          },
                        ]}
                      >
                        <Ionicons
                          name="close-sharp"
                          size={28}
                          color="#FF3B30"
                          style={{ textAlign: 'center', fontWeight: '900' }}
                        />
                      </View>
                    </TouchableOpacity>
                  </View>

                  <ScrollView style={{ maxHeight: 400 }}>
                    <View style={styles.guestSection}>
                      {years.map(yearOption => {
                        const isSelected = currentDobCalendarMonth.getFullYear() === yearOption;
                        const today = new Date();
                        const isFutureYear = yearOption > today.getFullYear();

                        return (
                          <TouchableOpacity
                            key={yearOption}
                            disabled={isFutureYear}
                            style={[
                              styles.guestRow,
                              {
                                backgroundColor: isSelected
                                  ? isDark
                                    ? 'rgba(52, 199, 89, 0.15)'
                                    : 'rgba(52, 199, 89, 0.1)'
                                  : isFutureYear
                                    ? 'transparent'
                                    : isDark
                                      ? 'rgba(255,255,255,0.05)'
                                      : 'rgba(0,0,0,0.03)',
                                marginTop: 8,
                                opacity: isFutureYear ? 0.3 : 1,
                              },
                            ]}
                            onPress={e => {
                              if (!isFutureYear) {
                                e.stopPropagation();
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                const newDate = new Date(currentDobCalendarMonth);
                                newDate.setFullYear(yearOption);
                                const todayDate = new Date();
                                if (newDate > todayDate) {
                                  newDate.setMonth(todayDate.getMonth());
                                  newDate.setDate(todayDate.getDate());
                                }
                                setCurrentDobCalendarMonth(newDate);
                                setShowYearPicker(false);
                                setTimeout(() => setShowDobPicker(true), 100);
                              }
                            }}
                          >
                            <ThemedText
                              style={[
                                styles.guestSubLabel,
                                isSelected && { fontFamily: Fonts.bold },
                                isFutureYear && { color: isDark ? '#666' : '#999' },
                              ]}
                            >
                              {yearOption}
                            </ThemedText>
                            <View
                              style={{
                                width: 28,
                                height: 28,
                                justifyContent: 'center',
                                alignItems: 'center',
                              }}
                            >
                              {isSelected && (
                                <Ionicons name="checkmark-circle" size={28} color="#34C759" />
                              )}
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </ScrollView>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </Modal>
      </ThemedView>
    </IOSScreenWrapper>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    paddingBottom: 20,
  },
  profileCard: {
    ...cardSurfaceBaseStyle,
    marginBottom: 20,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarEditButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoSection: {
    marginBottom: 24,
  },
  displayName: {
    fontFamily: Fonts.bold,
    fontSize: responsiveFontSize(24),
    textAlign: 'center',
    marginBottom: 8,
  },
  email: {
    fontFamily: Fonts.regular,
    fontSize: responsiveFontSize(16),
    textAlign: 'center',
    marginBottom: 4,
  },
  phone: {
    fontFamily: Fonts.regular,
    fontSize: responsiveFontSize(16),
    textAlign: 'center',
    marginBottom: 4,
  },
  userTypeText: {
    fontFamily: Fonts.regular,
    fontSize: responsiveFontSize(14),
    textAlign: 'center',
  },
  detailList: {
    marginTop: 16,
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontFamily: Fonts.medium,
    fontSize: responsiveFontSize(14),
  },
  detailValue: {
    fontFamily: Fonts.regular,
    fontSize: responsiveFontSize(16),
  },
  formGroup: {
    marginBottom: 18,
  },
  label: {
    fontFamily: Fonts.medium,
    fontSize: responsiveFontSize(16),
    marginBottom: 8,
  },
  labelErrorContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  inputRequired: {
    fontSize: responsiveFontSize(13),
    fontFamily: Fonts.bold,
    color: '#FF3B30',
  },
  input: {
    borderRadius: 12,
    padding: 16,
    fontFamily: Fonts.regular,
    fontSize: responsiveFontSize(16),
  },
  toggleContainer: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  toggleText: {
    fontFamily: Fonts.medium,
    fontSize: responsiveFontSize(16),
  },
  ratingSection: {
    alignItems: 'center',
  },
  ratingDisplay: {
    alignItems: 'center',
  },
  starsContainer: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  star: {
    marginHorizontal: 2,
  },
  ratingText: {
    fontFamily: Fonts.regular,
    fontSize: responsiveFontSize(14),
  },
  reviewsCard: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontFamily: Fonts.bold,
    fontSize: responsiveFontSize(18),
    marginBottom: 16,
  },
  reviewItem: {
    paddingBottom: 16,
    marginBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  reviewerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  reviewerName: {
    fontFamily: Fonts.medium,
    fontSize: responsiveFontSize(14),
    marginLeft: 8,
  },
  reviewStars: {
    flexDirection: 'row',
  },
  reviewComment: {
    fontFamily: Fonts.regular,
    fontSize: responsiveFontSize(14),
    lineHeight: 20,
  },
  settingsCard: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 0,
  },
  deleteAccountItem: {
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderWidth: 0,
  },
  deleteAccountText: {
    fontFamily: Fonts.bold,
    fontSize: responsiveFontSize(18),
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  passwordButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 18,
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  passwordButtonText: {
    fontFamily: Fonts.bold,
    fontSize: responsiveFontSize(18),
    letterSpacing: 0.5,
  },
  bottomSpacer: {
    height: 0,
  },
  profileEditButton: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 1,
  },
  profileEditButtonInner: {
    width: 70,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileEditButtonText: {
    fontSize: responsiveFontSize(16),
    fontWeight: '600',
  },
  profileSaveButton: {
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    marginTop: 20,
    marginBottom: -18,
    borderWidth: 1,
    alignSelf: 'stretch',
  },
  profileSaveButtonText: {
    fontSize: responsiveFontSize(18),
    fontFamily: Fonts.bold,
    letterSpacing: 0.5,
  },
  passengerInput: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    fontSize: responsiveFontSize(16),
    fontFamily: Fonts.regular,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'transparent',
  },
  errorBorder: {
    borderColor: '#FF3B30',
  },
  disabledInput: {
    opacity: 0.6,
  },
  fullScreenBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  guestDropdownContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
    zIndex: 1002,
    backgroundColor: 'transparent',
  },
  cardWrapper: {
    position: 'relative',
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  guestDropdownCard: {
    borderRadius: 12,
    paddingTop: 20,
    paddingHorizontal: 16,
    paddingBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 0,
    gap: 12,
    width: '100%',
    maxWidth: 400,
  },
  guestDropdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 0,
    paddingTop: 0,
  },
  guestDropdownTitle: {
    fontSize: responsiveFontSize(20),
    fontFamily: Fonts.bold,
  },
  guestDropdownCloseButton: {},
  closeButtonCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 59, 48, 0.15)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 0,
  },
  guestSection: {
    marginBottom: 20,
  },
  guestRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginTop: 0,
  },
  guestSubLabel: {
    fontSize: responsiveFontSize(16),
    fontWeight: '600',
  },
  calendarModalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
    zIndex: 1002,
    backgroundColor: 'transparent',
  },
  calendarModal: {
    borderRadius: 12,
    paddingTop: 20,
    paddingHorizontal: 16,
    paddingBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 0,
    gap: 12,
    width: '100%',
    maxWidth: 400,
  },
  calendarModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 0,
    paddingTop: 0,
  },
  calendarModalTitle: {
    fontSize: responsiveFontSize(20),
    fontFamily: Fonts.bold,
  },
  calendarModalCloseButton: {},
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'transparent',
  },
  monthNavButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthYearContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  monthTitle: {
    fontSize: responsiveFontSize(22),
    fontWeight: '600',
  },
  weekDaysHeader: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: 'transparent',
  },
  weekDayItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  weekDayText: {
    fontSize: responsiveFontSize(12),
    fontWeight: '600',
    opacity: 0.5,
    textTransform: 'uppercase',
  },
  calendarGrid: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  weekRow: {
    flexDirection: 'row',
  },
  calendarDayContainer: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 2,
    paddingHorizontal: 2,
  },
  calendarDay: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 0,
    minWidth: 36,
    maxWidth: 36,
    minHeight: 36,
    maxHeight: 36,
  },
  calendarDaySelected: {
    backgroundColor: '#FF3B30',
    overflow: 'hidden',
    width: 36,
    height: 36,
    borderRadius: 18,
    marginBottom: 0,
  },
  calendarDayText: {
    fontSize: responsiveFontSize(20),
    fontWeight: '400',
  },
  calendarDayTextSelected: {
    fontWeight: '600',
    fontSize: responsiveFontSize(20),
    color: '#FFFFFF',
  },
});
