import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons, FontAwesome6 } from '@expo/vector-icons';
import { SvgUri } from 'react-native-svg';
import { Asset } from 'expo-asset';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';

import { Logo } from '@/components';
import { ThemedText } from '@/components/ThemedText';
import { useHeaderHeight } from '@react-navigation/elements';
import { Colors } from '@/constants/Colors';
import { cardSurfaceBaseStyle, getCardSurfaceColors } from '@/constants/CardStyles';
import { responsiveFontSize, Fonts } from '@/constants/Fonts';
import { useAuth } from '@/context/AuthContext';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useAppAlert } from '@/context/AppAlertContext';
import { countries } from '@/countries-fixed';
import { getMobilePostAuthRoute, getMobileVariantConfig } from '@/config/appVariant';

type AuthMode = 'sign-in' | 'sign-up';

type SocialProvider = 'google' | 'facebook' | 'twitter';

type SocialProviderConfig = {
  id: SocialProvider;
  label: string;
  color: string;
  renderIcon: (props: { size: number; color: string }) => React.ReactNode;
  getIconColor?: (theme: 'light' | 'dark') => string;
};

type ExplorerType = 'local' | 'foreign';

const gmailAsset = Asset.fromModule(require('@/assets/images/gmail.svg'));

const GmailIcon = ({ size }: { size: number }) => {
  const [uri, setUri] = useState<string | null>(
    gmailAsset.localUri ?? (gmailAsset.downloaded ? gmailAsset.uri : null)
  );

  useEffect(() => {
    let isMounted = true;

    const prepareAsset = async () => {
      if (!gmailAsset.localUri && !gmailAsset.downloaded) {
        try {
          await gmailAsset.downloadAsync();
        } catch (error) {
          console.warn('Failed to load Gmail icon asset', error);
        }
      }

      if (isMounted) {
        setUri(gmailAsset.localUri ?? gmailAsset.uri ?? null);
      }
    };

    if (!uri) {
      prepareAsset();
    }

    return () => {
      isMounted = false;
    };
  }, [uri]);

  if (!uri) {
    return <View style={{ width: size, height: size }} />;
  }

  const scaledSize = size * 1.08;
  const verticalOffset = size * 0.12;

  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <SvgUri
        uri={uri}
        width={scaledSize}
        height={scaledSize}
        preserveAspectRatio="xMidYMid meet"
        viewBox="52 42 88 66"
        style={{ transform: [{ translateY: verticalOffset }] }}
      />
    </View>
  );
};

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

export default function AuthScreen() {
  const colorScheme = useColorScheme();
  const palette = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';
  const headerHeight = useHeaderHeight();
  const { loading, user, signIn, signUp, signOut, setGuestMode, resetPassword } = useAuth();
  const { showAlert } = useAppAlert();
  const variantConfig = getMobileVariantConfig();

  const [mode, setMode] = useState<AuthMode>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [userType, setUserType] = useState<'individual' | 'business'>(
    variantConfig.defaultUserType
  );
  const [explorerType, setExplorerType] = useState<ExplorerType>('foreign');
  const [submitting, setSubmitting] = useState(false);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [title, setTitle] = useState('');
  const [gender, setGender] = useState('');
  const [idType, setIdType] = useState('');
  const [identityNumber, setIdentityNumber] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [nationality, setNationality] = useState('');
  const [phone, setPhone] = useState('');
  const [tradingName, setTradingName] = useState('');
  const [businessRegistrationNumber, setBusinessRegistrationNumber] = useState('');
  const [mainContactPerson, setMainContactPerson] = useState('');
  const [businessPhone, setBusinessPhone] = useState('');
  const [physicalAddress, setPhysicalAddress] = useState('');
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

  const [notificationVisible, setNotificationVisible] = useState(false);
  const [notificationTitle, setNotificationTitle] = useState('');
  const [notificationMessage, setNotificationMessage] = useState('');
  const [notificationButtons, setNotificationButtons] = useState<
    {
      text: string;
      onPress: () => void;
      style?: 'default' | 'cancel' | 'destructive';
    }[]
  >([]);
  const [isLoading, setIsLoading] = useState(false);

  const titles = useMemo(() => ['Mr', 'Mrs', 'Ms', 'Dr', 'Prof'], []);
  const genders = useMemo(() => ['Male', 'Female', 'Other'], []);
  const idTypes = useMemo(() => ['National ID', 'Passport'], []);
  const currentYear = useMemo(() => new Date().getFullYear(), []);
  const years = useMemo(
    () => Array.from({ length: currentYear - 1919 }, (_, index) => currentYear - index),
    [currentYear]
  );

  const placeholderColor = useMemo(
    () => (colorScheme === 'dark' ? '#8E8E93' : '#999'),
    [colorScheme]
  );
  const { background: cardBackground, border: cardBorderColor } = getCardSurfaceColors(colorScheme);
  const cardSurface = cardBackground;
  const activeTabBackground = colorScheme === 'dark' ? '#ffffff' : '#000000';
  const activeTabTextColor = colorScheme === 'dark' ? '#000000' : '#ffffff';
  const inactiveTabTextColor = colorScheme === 'dark' ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)';
  const segmentBackground = colorScheme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)';
  const segmentBorderColor = colorScheme === 'dark' ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.08)';
  const primaryButtonTextColor = colorScheme === 'dark' ? '#000000' : '#ffffff';
  const guestButtonBackground = colorScheme === 'dark' ? 'rgba(255,255,255,0.05)' : '#ffffff';
  const guestButtonBorderColor =
    colorScheme === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)';
  const guestButtonTextColor = colorScheme === 'dark' ? '#ffffff' : '#000000';

  const socialProviders = useMemo<SocialProviderConfig[]>(
    () => [
      {
        id: 'facebook',
        label: 'Facebook',
        color: '#1877F2',
        renderIcon: ({ size, color }) => (
          <FontAwesome6 name="facebook-f" size={size} color={color} />
        ),
        getIconColor: () => '#1877F2',
      },
      {
        id: 'google',
        label: 'Gmail',
        color: '#DB4437',
        renderIcon: ({ size }) => <GmailIcon size={size} />,
      },
      {
        id: 'twitter',
        label: 'X',
        color: '#000000',
        renderIcon: ({ size, color }) => (
          <FontAwesome6 name="x-twitter" size={size} color={color} />
        ),
        getIconColor: theme => (theme === 'dark' ? '#ffffff' : '#000000'),
      },
    ],
    []
  );

  const themeMode: 'light' | 'dark' = colorScheme === 'dark' ? 'dark' : 'light';

  const handleNotificationDismiss = () => {
    setNotificationVisible(false);
    setIsLoading(false);
    setNotificationButtons([]);
    setNotificationTitle('');
    setNotificationMessage('');
  };

  const showNotification = (
    title: string,
    message: string,
    buttons: {
      text: string;
      onPress: () => void;
      style?: 'default' | 'cancel' | 'destructive';
    }[] = [
      {
        text: 'OK',
        onPress: () => {},
        style: 'default',
      },
    ]
  ) => {
    setIsLoading(false);
    setNotificationTitle(title);
    setNotificationMessage(message);
    setNotificationButtons(buttons);
    setNotificationVisible(true);
  };

  const showLoadingNotification = (title: string, message: string) => {
    setNotificationTitle(title);
    setNotificationMessage(message);
    setNotificationButtons([]);
    setIsLoading(true);
    setNotificationVisible(true);
  };

  const hideNotification = () => {
    setIsLoading(false);
    setNotificationVisible(false);
    setNotificationButtons([]);
    setNotificationTitle('');
    setNotificationMessage('');
  };

  const handleDobSelect = (isoDate: string) => {
    const [year, month, day] = isoDate.split('-');
    setDateOfBirth(`${day}/${month}/${year}`);
    setShowDobPicker(false);
    setShowMonthPicker(false);
    setShowYearPicker(false);
    const selectedDate = new Date(Number(year), Number(month) - 1, Number(day));
    setCurrentDobCalendarMonth(selectedDate);
  };

  const navigateDobMonth = (direction: 'prev' | 'next') => {
    setIsAnimating(true);
    Animated.timing(opacityAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      setCurrentDobCalendarMonth(prev => {
        const next = new Date(prev);
        next.setMonth(prev.getMonth() + (direction === 'next' ? 1 : -1));
        return next;
      });
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }).start(() => setIsAnimating(false));
    });
  };

  const handleMonthSelect = (monthIndex: number) => {
    const today = new Date();
    const selectedYear = currentDobCalendarMonth.getFullYear();
    const isFutureMonth = selectedYear === today.getFullYear() && monthIndex > today.getMonth();

    if (isFutureMonth) {
      return;
    }

    const newDate = new Date(currentDobCalendarMonth);
    newDate.setMonth(monthIndex);
    setCurrentDobCalendarMonth(newDate);
    setShowMonthPicker(false);
    setTimeout(() => setShowDobPicker(true), 100);
  };

  const handleYearSelect = (year: number) => {
    const today = new Date();
    if (year > today.getFullYear()) {
      return;
    }

    const newDate = new Date(currentDobCalendarMonth);
    newDate.setFullYear(year);

    if (newDate > today) {
      newDate.setMonth(today.getMonth());
      newDate.setDate(today.getDate());
    }

    setCurrentDobCalendarMonth(newDate);
    setShowYearPicker(false);
    setTimeout(() => setShowDobPicker(true), 100);
  };

  const onDobPanGestureEvent = (event: any) => {
    if (isAnimating) return;
    const { translationX, state } = event.nativeEvent;
    const threshold = 50;
    if (state === State.END && Math.abs(translationX) > threshold) {
      navigateDobMonth(translationX > 0 ? 'prev' : 'next');
    }
  };

  const handleSubmit = async () => {
    if (submitting || isLoading) {
      return;
    }

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
    const trimmedTradingName = tradingName.trim();
    const trimmedBusinessRegistrationNumber = businessRegistrationNumber.trim();
    const trimmedMainContactPerson = mainContactPerson.trim();
    const trimmedBusinessPhone = businessPhone.trim();
    const trimmedPhysicalAddress = physicalAddress.trim();

    const missingFields: string[] = [];

    if (!trimmedEmail) {
      missingFields.push('Email');
    }

    if (!trimmedPassword) {
      missingFields.push('Password');
    }

    if (mode === 'sign-up') {
      if (!trimmedConfirmPassword) {
        missingFields.push('Confirm Password');
      }

      if (userType === 'business') {
        if (!trimmedBusinessName) {
          missingFields.push('Business Name');
        }
        if (!trimmedTradingName) {
          missingFields.push('Trading Name');
        }
        if (!trimmedBusinessRegistrationNumber) {
          missingFields.push('Business Registration Number');
        }
        if (!trimmedMainContactPerson) {
          missingFields.push('Main Contact Person');
        }
        if (!trimmedBusinessPhone) {
          missingFields.push('Business Phone Number');
        }
        if (!trimmedPhysicalAddress) {
          missingFields.push('Physical Address');
        }
      } else {
        if (!trimmedTitle) {
          missingFields.push('Title');
        }
        if (!trimmedFullName) {
          missingFields.push('Full Name');
        }
        if (!trimmedGender) {
          missingFields.push('Gender');
        }
        if (!trimmedIdType) {
          missingFields.push('ID Type');
        }
        if (!trimmedIdentityNumber) {
          missingFields.push('Identity Number');
        }
        if (!trimmedDobDisplay || !normalizedDob) {
          missingFields.push('Date of Birth');
        }
        if (!trimmedNationality) {
          missingFields.push('Nationality');
        }
        if (!trimmedPhone) {
          missingFields.push('Cell Phone Number');
        }
      }
    }

    if (missingFields.length > 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      return;
    }

    try {
      setSubmitting(true);

      if (mode === 'sign-in') {
        showLoadingNotification('Signing in', 'Checking your credentials...');
        const { error } = await signIn(trimmedEmail, trimmedPassword);
        hideNotification();

        if (error) {
          const message = error.message ?? 'Invalid credentials. Please try again.';
          const lower = message.toLowerCase();

          if (lower.includes('invalid login credentials')) {
            showNotification(
              'Invalid credentials',
              'That email and password combination does not match.'
            );
          } else if (lower.includes('network')) {
            showNotification(
              'Network issue',
              'Please check your internet connection and try again.'
            );
          } else {
            showNotification('Authentication error', message);
          }
          return;
        }

        router.replace(
          getMobilePostAuthRoute(
            { id: 'signed-in', email: trimmedEmail, user_metadata: { user_type: userType } },
            false
          )
        );
        return;
      }

      if (mode === 'sign-up') {
        if (trimmedPassword !== trimmedConfirmPassword) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
          return;
        }

        showLoadingNotification('Creating account', 'Setting up your Off2Zim profile...');
        const { data, error } = await signUp(
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
            : undefined,
          {
            explorerType,
            providerProfile:
              userType === 'business'
                ? {
                    tradingName: trimmedTradingName,
                    businessRegistrationNumber: trimmedBusinessRegistrationNumber,
                    mainContactPerson: trimmedMainContactPerson,
                    businessPhone: trimmedBusinessPhone,
                    physicalAddress: trimmedPhysicalAddress,
                  }
                : undefined,
          }
        );
        hideNotification();

        if (error) {
          const message = error.message ?? 'Unable to create the account at the moment.';
          const lower = message.toLowerCase();

          if (lower.includes('already registered') || lower.includes('already exists')) {
            showNotification(
              'Account exists',
              'It looks like this email already has an account. Try signing in instead.'
            );
          } else if (lower.includes('network')) {
            showNotification(
              'Network issue',
              'Please check your internet connection and try again.'
            );
          } else {
            showNotification('Sign up failed', message);
          }
          return;
        }

        const verificationUrl = data?.session?.verificationUrl || data?.verificationUrl;
        const verificationSent = data?.session?.verificationSent ?? data?.verificationSent;
        const postAuthRoute = getMobilePostAuthRoute(
          {
            id: 'new-account',
            email: trimmedEmail,
            user_metadata: { user_type: userType },
          },
          false
        );

        if (verificationUrl) {
          showAlert({
            title: 'Account ready',
            message:
              'Your account has been created. Email delivery is not configured yet, so open the verification link now to verify your email address.',
            buttons: [
              {
                text: 'Open Verification Link',
                onPress: async () => {
                  try {
                    await Linking.openURL(verificationUrl);
                  } catch {
                    showNotification(
                      'Verification link',
                      'Copy and open this link in your browser: ' + verificationUrl
                    );
                  }
                  router.replace(postAuthRoute);
                },
              },
              {
                text: 'Continue',
                onPress: () => router.replace(postAuthRoute),
              },
            ],
          });
          return;
        }

        showAlert({
          title: 'Account ready',
          message: verificationSent
            ? 'Your account has been created and a verification email has been sent. Please check your inbox.'
            : 'Your account has been created and you are now signed in.',
          buttons: [{ text: 'Continue', onPress: () => router.replace(postAuthRoute) }],
        });
        return;
      }
    } catch (error: any) {
      const message = error?.message ?? 'Something went wrong. Please try again.';
      showNotification('Authentication error', message);
    } finally {
      setSubmitting(false);
      setIsLoading(false);
    }
  };

  const handleGuest = () => {
    setGuestMode(true);
    router.replace(getMobilePostAuthRoute(null, true));
  };

  const handleSocialSignUp = (provider: SocialProvider) => {
    const providerName =
      provider === 'google' ? 'Google' : provider === 'facebook' ? 'Facebook' : 'X';

    showNotification(
      `${providerName} sign-up`,
      'Social authentication is almost ready. For now, please continue with email and password.'
    );
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      setGuestMode(false);
    } catch (error: any) {
      showNotification('Error', error.message ?? 'Unable to sign out. Please try again.');
    }
  };

  useEffect(() => {
    setSubmitting(false);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (!variantConfig.allowSelfSignup && mode !== 'sign-in') {
      setMode('sign-in');
    }

    if (!variantConfig.showAccountTypeSwitch && userType !== variantConfig.defaultUserType) {
      setUserType(variantConfig.defaultUserType);
    }
  }, [mode, userType, variantConfig]);

  if (loading) {
    return null;
  }

  if (user) {
    return (
      <View style={[styles.signedInRoot, { backgroundColor: palette.appBackground }]}>
        <View style={[styles.signedInCard, { backgroundColor: cardSurface }]}>
          <Logo size="large" />
          <Text style={[styles.signedInTitle, { color: palette.text }]}>
            {variantConfig.label} access active
          </Text>
          <Text style={[styles.signedInSubtitle, { color: palette.text }]}>{user.email}</Text>
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: palette.tint }]}
            onPress={handleSignOut}
          >
            <Text style={styles.primaryButtonText}>Sign out</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const headerSpacing = headerHeight + 12;

  return (
    <View style={[styles.root, { backgroundColor: palette.appBackground }]}>
      {/* CustomNotification removed; alerts now use RN Alert */}

      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.scrollWrapper, { marginTop: headerSpacing }]}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scrollContent}
          >
            <View
              style={[
                styles.formSurface,
                { backgroundColor: cardBackground, borderColor: cardBorderColor },
              ]}
            >
              <>
                <View
                  style={[
                    styles.modeSwitch,
                    {
                      borderColor: segmentBorderColor,
                      backgroundColor: segmentBackground,
                    },
                  ]}
                >
                  <TouchableOpacity
                    style={[
                      styles.modeButton,
                      mode === 'sign-in' && { backgroundColor: activeTabBackground },
                      mode === 'sign-in' && styles.modeButtonActive,
                    ]}
                    onPress={() => {
                      setMode('sign-in');
                      setAttemptedSubmit(false);
                    }}
                    disabled={mode === 'sign-in'}
                  >
                    <Text
                      style={[
                        styles.modeButtonText,
                        { color: inactiveTabTextColor },
                        mode === 'sign-in' && { color: activeTabTextColor },
                        mode === 'sign-in' && styles.modeButtonTextActive,
                      ]}
                    >
                      Sign In
                    </Text>
                  </TouchableOpacity>
                  {variantConfig.allowSelfSignup ? (
                    <TouchableOpacity
                      style={[
                        styles.modeButton,
                        mode === 'sign-up' && { backgroundColor: activeTabBackground },
                        mode === 'sign-up' && styles.modeButtonActive,
                      ]}
                      onPress={() => {
                        setMode('sign-up');
                        setAttemptedSubmit(false);
                      }}
                      disabled={mode === 'sign-up'}
                    >
                      <Text
                        style={[
                          styles.modeButtonText,
                          { color: inactiveTabTextColor },
                          mode === 'sign-up' && { color: activeTabTextColor },
                          mode === 'sign-up' && styles.modeButtonTextActive,
                        ]}
                      >
                        Sign Up
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                </View>

                {mode === 'sign-up' && variantConfig.showAccountTypeSwitch && (
                  <View style={{ gap: 8 }}>
                    <View style={styles.labelErrorContainer}>
                      <Text
                        style={[
                          styles.inputLabel,
                          {
                            color: colorScheme === 'dark' ? Colors.dark.text : Colors.light.text,
                          },
                        ]}
                      >
                        Account Type
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.userTypeSwitch,
                        {
                          borderColor: segmentBorderColor,
                          backgroundColor: segmentBackground,
                        },
                      ]}
                    >
                      <TouchableOpacity
                        style={[
                          styles.userTypeButton,
                          userType === 'individual' && {
                            backgroundColor: activeTabBackground,
                          },
                          userType === 'individual' && styles.userTypeButtonActive,
                        ]}
                        onPress={() => setUserType('individual')}
                        disabled={userType === 'individual'}
                      >
                        <Text
                          style={[
                            styles.userTypeButtonText,
                            { color: inactiveTabTextColor },
                            userType === 'individual' && {
                              color: activeTabTextColor,
                            },
                            userType === 'individual' && styles.userTypeButtonTextActive,
                          ]}
                        >
                          Individual
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.userTypeButton,
                          userType === 'business' && {
                            backgroundColor: activeTabBackground,
                          },
                          userType === 'business' && styles.userTypeButtonActive,
                        ]}
                        onPress={() => setUserType('business')}
                        disabled={userType === 'business'}
                      >
                        <Text
                          style={[
                            styles.userTypeButtonText,
                            { color: inactiveTabTextColor },
                            userType === 'business' && {
                              color: activeTabTextColor,
                            },
                            userType === 'business' && styles.userTypeButtonTextActive,
                          ]}
                        >
                          Service Provider
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {mode === 'sign-in' ? (
                  <>
                    <LabeledInput
                      label="Email"
                      value={email}
                      onChangeText={text => {
                        setEmail(text);
                      }}
                      placeholder="Enter your email"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoComplete="email"
                      textContentType="emailAddress"
                      colorScheme={colorScheme}
                      placeholderColor={placeholderColor}
                      returnKeyType="next"
                      errorMessage={
                        attemptedSubmit && !email.trim() ? 'This field is required' : undefined
                      }
                      hasError={attemptedSubmit && !email.trim()}
                    />

                    <PasswordInput
                      label="Password"
                      value={password}
                      onChangeText={text => {
                        setPassword(text);
                      }}
                      placeholder="Enter your password"
                      colorScheme={colorScheme}
                      placeholderColor={placeholderColor}
                      autoComplete="password"
                      textContentType="password"
                      returnKeyType="go"
                      onSubmitEditing={handleSubmit}
                      errorMessage={
                        attemptedSubmit && !password.trim() ? 'This field is required' : undefined
                      }
                      hasError={attemptedSubmit && !password.trim()}
                    />

                    <TouchableOpacity
                      style={styles.signInForgotWrapper}
                      onPress={async () => {
                        const resetEmail = email.trim().toLowerCase();
                        if (!resetEmail) {
                          showAlert({
                            title: 'Email required',
                            message:
                              'Enter your email address first, then tap Forgot Password again.',
                            buttons: [{ text: 'OK' }],
                          });
                          return;
                        }

                        try {
                          const { data, error } = await resetPassword(resetEmail);
                          if (error) {
                            throw error;
                          }

                          if (data?.resetUrl) {
                            showAlert({
                              title: 'Reset ready',
                              message:
                                'Email delivery is not configured yet, so open the reset link now to choose a new password.',
                              buttons: [
                                {
                                  text: 'Open Reset Link',
                                  onPress: async () => {
                                    try {
                                      await Linking.openURL(data.resetUrl);
                                    } catch {
                                      showNotification(
                                        'Reset link',
                                        'Copy and open this link in your browser: ' + data.resetUrl
                                      );
                                    }
                                  },
                                },
                                { text: 'OK', style: 'cancel' },
                              ],
                            });
                            return;
                          }

                          showAlert({
                            title: 'Password reset sent',
                            message: 'Check your email for a password reset link.',
                            buttons: [{ text: 'OK' }],
                          });
                        } catch (error: any) {
                          showAlert({
                            title: 'Reset failed',
                            message: error?.message ?? 'Unable to start password reset right now.',
                            buttons: [{ text: 'OK' }],
                          });
                        }
                      }}
                    >
                      <Text style={[styles.signInForgotPassword, { color: palette.tint }]}>
                        Forgot Password?
                      </Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    {userType === 'business' ? (
                      <>
                        <LabeledInput
                          label="Business name"
                          value={businessName}
                          onChangeText={setBusinessName}
                          placeholder="Enter your business name"
                          autoCapitalize="words"
                          autoComplete="organization"
                          colorScheme={colorScheme}
                          placeholderColor={placeholderColor}
                          returnKeyType="next"
                          errorMessage={
                            attemptedSubmit && !businessName.trim()
                              ? 'This field is required'
                              : undefined
                          }
                          hasError={attemptedSubmit && !businessName.trim()}
                        />

                        <LabeledInput
                          label="Trading name"
                          value={tradingName}
                          onChangeText={setTradingName}
                          placeholder="Enter your trading name"
                          autoCapitalize="words"
                          colorScheme={colorScheme}
                          placeholderColor={placeholderColor}
                          returnKeyType="next"
                          errorMessage={
                            attemptedSubmit && !tradingName.trim()
                              ? 'This field is required'
                              : undefined
                          }
                          hasError={attemptedSubmit && !tradingName.trim()}
                        />

                        <LabeledInput
                          label="Business registration number"
                          value={businessRegistrationNumber}
                          onChangeText={setBusinessRegistrationNumber}
                          placeholder="Enter registration number"
                          autoCapitalize="characters"
                          colorScheme={colorScheme}
                          placeholderColor={placeholderColor}
                          returnKeyType="next"
                          errorMessage={
                            attemptedSubmit && !businessRegistrationNumber.trim()
                              ? 'This field is required'
                              : undefined
                          }
                          hasError={attemptedSubmit && !businessRegistrationNumber.trim()}
                        />

                        <LabeledInput
                          label="Main contact person"
                          value={mainContactPerson}
                          onChangeText={setMainContactPerson}
                          placeholder="Enter contact person name"
                          autoCapitalize="words"
                          autoComplete="name"
                          colorScheme={colorScheme}
                          placeholderColor={placeholderColor}
                          returnKeyType="next"
                          errorMessage={
                            attemptedSubmit && !mainContactPerson.trim()
                              ? 'This field is required'
                              : undefined
                          }
                          hasError={attemptedSubmit && !mainContactPerson.trim()}
                        />

                        <LabeledInput
                          label="Business phone number"
                          value={businessPhone}
                          onChangeText={setBusinessPhone}
                          placeholder="Enter business phone number"
                          keyboardType="phone-pad"
                          autoComplete="tel"
                          colorScheme={colorScheme}
                          placeholderColor={placeholderColor}
                          returnKeyType="next"
                          errorMessage={
                            attemptedSubmit && !businessPhone.trim()
                              ? 'This field is required'
                              : undefined
                          }
                          hasError={attemptedSubmit && !businessPhone.trim()}
                        />

                        <LabeledInput
                          label="Physical address"
                          value={physicalAddress}
                          onChangeText={setPhysicalAddress}
                          placeholder="Enter physical address"
                          autoCapitalize="sentences"
                          colorScheme={colorScheme}
                          placeholderColor={placeholderColor}
                          returnKeyType="next"
                          errorMessage={
                            attemptedSubmit && !physicalAddress.trim()
                              ? 'This field is required'
                              : undefined
                          }
                          hasError={attemptedSubmit && !physicalAddress.trim()}
                        />
                      </>
                    ) : (
                      <>
                        <View style={{ gap: 8 }}>
                          <View style={styles.labelErrorContainer}>
                            <Text style={[styles.inputLabel, { color: palette.text }]}>Title</Text>
                            {attemptedSubmit && !title && (
                              <Text style={styles.inputRequired}>This field is required</Text>
                            )}
                          </View>
                          <TouchableOpacity
                            activeOpacity={0.7}
                            onPress={() => {
                              setShowTitlePicker(true);
                            }}
                            style={[
                              styles.authPickerField,
                              {
                                backgroundColor: colorScheme === 'dark' ? '#3A3A3C' : '#E5E5EA',
                                borderColor: colorScheme === 'dark' ? '#4A4A4A' : '#D4D4DA',
                              },
                              attemptedSubmit && !title && styles.authErrorBorder,
                            ]}
                          >
                            <Text
                              style={[
                                styles.authPickerValue,
                                { color: title ? palette.text : placeholderColor },
                              ]}
                            >
                              {title || 'Select title'}
                            </Text>
                            <Ionicons name="chevron-down" size={20} color={placeholderColor} />
                          </TouchableOpacity>
                        </View>

                        <LabeledInput
                          label="Full name"
                          value={fullName}
                          onChangeText={setFullName}
                          placeholder="Enter your full name"
                          autoCapitalize="words"
                          autoComplete="name"
                          colorScheme={colorScheme}
                          placeholderColor={placeholderColor}
                          returnKeyType="next"
                          errorMessage={
                            attemptedSubmit && !fullName.trim()
                              ? 'This field is required'
                              : undefined
                          }
                          hasError={attemptedSubmit && !fullName.trim()}
                        />

                        <View style={{ gap: 8 }}>
                          <View style={styles.labelErrorContainer}>
                            <Text style={[styles.inputLabel, { color: palette.text }]}>Gender</Text>
                            {attemptedSubmit && !gender && (
                              <Text style={styles.inputRequired}>This field is required</Text>
                            )}
                          </View>
                          <TouchableOpacity
                            activeOpacity={0.7}
                            onPress={() => {
                              setShowGenderPicker(true);
                            }}
                            style={[
                              styles.authPickerField,
                              {
                                backgroundColor: colorScheme === 'dark' ? '#3A3A3C' : '#E5E5EA',
                                borderColor: colorScheme === 'dark' ? '#4A4A4A' : '#D4D4DA',
                              },
                              attemptedSubmit && !gender && styles.authErrorBorder,
                            ]}
                          >
                            <Text
                              style={[
                                styles.authPickerValue,
                                { color: gender ? palette.text : placeholderColor },
                              ]}
                            >
                              {gender || 'Select gender'}
                            </Text>
                            <Ionicons name="chevron-down" size={20} color={placeholderColor} />
                          </TouchableOpacity>
                        </View>

                        <View style={{ gap: 8 }}>
                          <View style={styles.labelErrorContainer}>
                            <Text style={[styles.inputLabel, { color: palette.text }]}>
                              ID Type
                            </Text>
                            {attemptedSubmit && !idType && (
                              <Text style={styles.inputRequired}>This field is required</Text>
                            )}
                          </View>
                          <TouchableOpacity
                            activeOpacity={0.7}
                            onPress={() => {
                              setShowIdTypePicker(true);
                            }}
                            style={[
                              styles.authPickerField,
                              {
                                backgroundColor: colorScheme === 'dark' ? '#3A3A3C' : '#E5E5EA',
                                borderColor: colorScheme === 'dark' ? '#4A4A4A' : '#D4D4DA',
                              },
                              attemptedSubmit && !idType && styles.authErrorBorder,
                            ]}
                          >
                            <Text
                              style={[
                                styles.authPickerValue,
                                { color: idType ? palette.text : placeholderColor },
                              ]}
                            >
                              {idType || 'Select ID type'}
                            </Text>
                            <Ionicons name="chevron-down" size={20} color={placeholderColor} />
                          </TouchableOpacity>
                        </View>

                        <LabeledInput
                          label="Identity number"
                          value={identityNumber}
                          onChangeText={setIdentityNumber}
                          placeholder="Enter identity number"
                          autoCapitalize="characters"
                          colorScheme={colorScheme}
                          placeholderColor={placeholderColor}
                          returnKeyType="next"
                          errorMessage={
                            attemptedSubmit && !identityNumber.trim()
                              ? 'This field is required'
                              : undefined
                          }
                          hasError={attemptedSubmit && !identityNumber.trim()}
                        />

                        <View style={{ gap: 8 }}>
                          <View style={styles.labelErrorContainer}>
                            <Text style={[styles.inputLabel, { color: palette.text }]}>
                              Date of birth
                            </Text>
                            {attemptedSubmit && !dateOfBirth && (
                              <Text style={styles.inputRequired}>This field is required</Text>
                            )}
                          </View>
                          <TouchableOpacity
                            activeOpacity={0.7}
                            onPress={() => {
                              setShowDobPicker(true);
                            }}
                            style={[
                              styles.authPickerField,
                              {
                                backgroundColor: colorScheme === 'dark' ? '#3A3A3C' : '#E5E5EA',
                                borderColor: colorScheme === 'dark' ? '#4A4A4A' : '#D4D4DA',
                              },
                              attemptedSubmit && !dateOfBirth && styles.authErrorBorder,
                            ]}
                          >
                            <Text
                              style={[
                                styles.authPickerValue,
                                { color: dateOfBirth ? palette.text : placeholderColor },
                              ]}
                            >
                              {dateOfBirth || 'DD/MM/YYYY'}
                            </Text>
                            <Ionicons name="calendar-outline" size={20} color={placeholderColor} />
                          </TouchableOpacity>
                        </View>

                        <View style={{ gap: 8 }}>
                          <View style={styles.labelErrorContainer}>
                            <Text style={[styles.inputLabel, { color: palette.text }]}>
                              Nationality
                            </Text>
                            {attemptedSubmit && !nationality && (
                              <Text style={styles.inputRequired}>This field is required</Text>
                            )}
                          </View>
                          <TouchableOpacity
                            activeOpacity={0.7}
                            onPress={() => {
                              setNationalitySearch('');
                              setShowNationalityPicker(true);
                            }}
                            style={[
                              styles.authPickerField,
                              {
                                backgroundColor: colorScheme === 'dark' ? '#3A3A3C' : '#E5E5EA',
                                borderColor: colorScheme === 'dark' ? '#4A4A4A' : '#D4D4DA',
                              },
                              attemptedSubmit && !nationality && styles.authErrorBorder,
                            ]}
                          >
                            <View style={styles.authPickerValueRow}>
                              {nationality && (
                                <Text style={styles.authPickerFlag}>
                                  {countries.find(c => c.name === nationality)?.flag}
                                </Text>
                              )}
                              <Text
                                style={[
                                  styles.authPickerValue,
                                  { color: nationality ? palette.text : placeholderColor },
                                ]}
                              >
                                {nationality || 'Select nationality'}
                              </Text>
                            </View>
                            <Ionicons name="chevron-down" size={20} color={placeholderColor} />
                          </TouchableOpacity>
                        </View>

                        <LabeledInput
                          label="Cell phone number"
                          value={phone}
                          onChangeText={setPhone}
                          placeholder="Enter phone number"
                          colorScheme={colorScheme}
                          placeholderColor={placeholderColor}
                          keyboardType="phone-pad"
                          autoComplete="tel"
                          returnKeyType="next"
                          errorMessage={
                            attemptedSubmit && !phone.trim() ? 'This field is required' : undefined
                          }
                          hasError={attemptedSubmit && !phone.trim()}
                        />
                      </>
                    )}

                    <LabeledInput
                      label="Email"
                      value={email}
                      onChangeText={text => {
                        setEmail(text);
                      }}
                      placeholder="Enter your email"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoComplete="email"
                      textContentType="emailAddress"
                      colorScheme={colorScheme}
                      placeholderColor={placeholderColor}
                      returnKeyType="next"
                      errorMessage={
                        attemptedSubmit && !email.trim() ? 'This field is required' : undefined
                      }
                      hasError={attemptedSubmit && !email.trim()}
                    />

                    <PasswordInput
                      label="Password"
                      value={password}
                      onChangeText={text => {
                        setPassword(text);
                      }}
                      placeholder="Enter your password"
                      colorScheme={colorScheme}
                      placeholderColor={placeholderColor}
                      autoComplete="password-new"
                      textContentType="newPassword"
                      returnKeyType="next"
                      errorMessage={
                        attemptedSubmit && !password.trim() ? 'This field is required' : undefined
                      }
                      hasError={attemptedSubmit && !password.trim()}
                    />

                    <PasswordInput
                      label="Confirm password"
                      value={confirmPassword}
                      onChangeText={text => {
                        setConfirmPassword(text);
                      }}
                      placeholder="Re-enter your password"
                      colorScheme={colorScheme}
                      placeholderColor={placeholderColor}
                      autoComplete="password-new"
                      textContentType="newPassword"
                      onSubmitEditing={handleSubmit}
                      errorMessage={
                        attemptedSubmit
                          ? !confirmPassword.trim()
                            ? 'This field is required'
                            : password !== confirmPassword
                              ? 'Passwords do not match'
                              : undefined
                          : undefined
                      }
                      hasError={
                        attemptedSubmit && (!confirmPassword.trim() || password !== confirmPassword)
                      }
                    />

                    {userType === 'individual' && (
                      <View style={styles.socialSection}>
                        <View style={styles.socialDivider}>
                          <View
                            style={[
                              styles.socialDividerLine,
                              { backgroundColor: segmentBorderColor },
                            ]}
                          />
                          <Text style={[styles.socialDividerText, { color: palette.text }]}>
                            Or sign up with
                          </Text>
                          <View
                            style={[
                              styles.socialDividerLine,
                              { backgroundColor: segmentBorderColor },
                            ]}
                          />
                        </View>
                        <View style={styles.socialButtonsRow}>
                          {socialProviders.map(provider => (
                            <TouchableOpacity
                              key={provider.id}
                              style={styles.socialButton}
                              onPress={() => handleSocialSignUp(provider.id)}
                            >
                              <View
                                style={[
                                  styles.socialIconWrapper,
                                  {
                                    backgroundColor:
                                      provider.id === 'google'
                                        ? themeMode === 'dark'
                                          ? 'rgba(219, 68, 55, 0.22)'
                                          : 'rgba(219, 68, 55, 0.12)'
                                        : provider.id === 'twitter' && themeMode === 'dark'
                                          ? '#1F1F1F'
                                          : `${provider.color}20`,
                                    borderColor:
                                      provider.id === 'google'
                                        ? 'rgba(219, 68, 55, 0.28)'
                                        : provider.id === 'twitter' && themeMode === 'dark'
                                          ? '#2E2E2E'
                                          : `${provider.color}40`,
                                  },
                                ]}
                              >
                                {provider.renderIcon({
                                  size: 26,
                                  color: provider.getIconColor
                                    ? provider.getIconColor(themeMode)
                                    : provider.color,
                                })}
                              </View>
                              <Text style={[styles.socialButtonText, { color: palette.text }]}>
                                {provider.label}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                    )}
                  </>
                )}

                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={[
                      mode === 'sign-in' ? styles.signInButton : styles.primaryButton,
                      { backgroundColor: palette.tint },
                    ]}
                    onPress={handleSubmit}
                    activeOpacity={0.5}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Text
                      style={[
                        mode === 'sign-in' ? styles.signInButtonText : styles.primaryButtonText,
                        { color: primaryButtonTextColor },
                      ]}
                    >
                      {mode === 'sign-in' ? 'Sign In' : 'CREATE ACCOUNT'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {mode === 'sign-in' && variantConfig.allowGuest && (
                  <>
                    <View style={styles.socialDivider}>
                      <View
                        style={[styles.socialDividerLine, { backgroundColor: segmentBorderColor }]}
                      />
                      <Text style={[styles.socialDividerText, { color: palette.text }]}>Or</Text>
                      <View
                        style={[styles.socialDividerLine, { backgroundColor: segmentBorderColor }]}
                      />
                    </View>
                    <TouchableOpacity
                      style={[
                        styles.guestPrimaryButton,
                        {
                          backgroundColor: guestButtonBackground,
                          borderColor: guestButtonBorderColor,
                        },
                      ]}
                      onPress={handleGuest}
                    >
                      <Text
                        style={[styles.guestPrimaryButtonText, { color: guestButtonTextColor }]}
                      >
                        Continue as guest
                      </Text>
                    </TouchableOpacity>
                  </>
                )}

                {mode === 'sign-up' && variantConfig.allowSelfSignup && (
                  <View style={styles.switchAuthRow}>
                    <Text style={[styles.switchAuthLabel, { color: palette.text }]}>
                      Already have an account?
                    </Text>
                    <TouchableOpacity onPress={() => setMode('sign-in')}>
                      <Text style={[styles.switchAuthButton, { color: palette.tint }]}>
                        Sign in
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </>
            </View>

            <Text style={styles.footer}>
              © {new Date().getFullYear()} Off2Zim. All rights reserved.
            </Text>
          </ScrollView>

          {/* Title Picker Modal */}
          <Modal
            visible={showTitlePicker}
            transparent
            animationType="fade"
            statusBarTranslucent
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
                      { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' },
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
                            { backgroundColor: 'rgba(255, 59, 48, 0.15)' },
                          ]}
                        >
                          <Ionicons name="close-sharp" size={28} color="#FF3B30" />
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
            transparent
            animationType="fade"
            statusBarTranslucent
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
                      { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' },
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
                            { backgroundColor: 'rgba(255, 59, 48, 0.15)' },
                          ]}
                        >
                          <Ionicons name="close-sharp" size={28} color="#FF3B30" />
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
            transparent
            animationType="fade"
            statusBarTranslucent
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
                      { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' },
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
                            { backgroundColor: 'rgba(255, 59, 48, 0.15)' },
                          ]}
                        >
                          <Ionicons name="close-sharp" size={28} color="#FF3B30" />
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
            transparent
            animationType="fade"
            statusBarTranslucent
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
                      { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' },
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
                            { backgroundColor: 'rgba(255, 59, 48, 0.15)' },
                          ]}
                        >
                          <Ionicons name="close-sharp" size={28} color="#FF3B30" />
                        </View>
                      </TouchableOpacity>
                    </View>

                    <View style={{ paddingHorizontal: 20, paddingBottom: 12 }}>
                      <View
                        style={[
                          styles.authPickerField,
                          {
                            backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
                            borderColor: 'transparent',
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
                                setNationality(zimbabwe.name);
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
                                  setNationality(country.name);
                                  setShowNationalityPicker(false);
                                  setNationalitySearch('');
                                }}
                              >
                                <View
                                  style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}
                                >
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
            transparent
            animationType="fade"
            statusBarTranslucent
            onRequestClose={() => setShowDobPicker(false)}
          >
            <TouchableOpacity
              style={styles.fullScreenBackdrop}
              onPress={() => setShowDobPicker(false)}
              activeOpacity={1}
            >
              <View style={styles.calendarModalContainer}>
                <View style={[styles.calendarModal, { backgroundColor: cardBackground }]}>
                  <View style={styles.calendarModalHeader}>
                    <ThemedText style={styles.calendarModalTitle}>Date of Birth</ThemedText>
                    <TouchableOpacity
                      style={styles.calendarModalCloseButton}
                      onPress={() => setShowDobPicker(false)}
                    >
                      <View
                        style={[
                          styles.closeButtonCircle,
                          { backgroundColor: 'rgba(255, 59, 48, 0.15)' },
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
                    shouldCancelWhenOutside
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
            transparent
            animationType="fade"
            statusBarTranslucent
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
                      { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' },
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
                            { backgroundColor: 'rgba(255, 59, 48, 0.15)' },
                          ]}
                        >
                          <Ionicons name="close-sharp" size={28} color="#FF3B30" />
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
                                if (isFutureMonth) {
                                  return;
                                }
                                e.stopPropagation();
                                handleMonthSelect(index);
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
            transparent
            animationType="fade"
            statusBarTranslucent
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
                      { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' },
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
                            { backgroundColor: 'rgba(255, 59, 48, 0.15)' },
                          ]}
                        >
                          <Ionicons name="close-sharp" size={28} color="#FF3B30" />
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
                                if (isFutureYear) {
                                  return;
                                }
                                e.stopPropagation();
                                handleYearSelect(yearOption);
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
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

interface BaseInputProps {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholderColor: string;
  colorScheme: 'light' | 'dark' | null | undefined;
  hasError?: boolean;
}

type LabeledInputProps = BaseInputProps &
  Pick<
    React.ComponentProps<typeof TextInput>,
    | 'autoCapitalize'
    | 'autoComplete'
    | 'keyboardType'
    | 'returnKeyType'
    | 'textContentType'
    | 'onSubmitEditing'
  >;

function LabeledInput({
  label,
  placeholder,
  value,
  onChangeText,
  placeholderColor,
  colorScheme,
  errorMessage,
  hasError,
  ...rest
}: LabeledInputProps & { errorMessage?: string }) {
  const textColor = colorScheme === 'dark' ? Colors.dark.text : Colors.light.text;
  const isDarkMode = colorScheme === 'dark';
  const backgroundColor = isDarkMode ? '#3A3A3C' : '#E5E5EA';
  const borderColor = isDarkMode ? '#4A4A4A' : '#D4D4DA';

  return (
    <View style={{ gap: 8 }}>
      <View style={styles.labelErrorContainer}>
        <Text style={[styles.inputLabel, { color: textColor }]}>{label}</Text>
        {errorMessage && <Text style={styles.inputRequired}>{errorMessage}</Text>}
      </View>
      <View
        style={[
          styles.inputWrapper,
          { backgroundColor, borderColor },
          hasError && styles.authErrorBorder,
        ]}
      >
        <TextInput
          style={[styles.textInput, { color: textColor }]}
          placeholder={placeholder}
          placeholderTextColor={placeholderColor}
          value={value}
          onChangeText={onChangeText}
          {...rest}
        />
      </View>
    </View>
  );
}

interface PasswordInputProps extends BaseInputProps {
  onSubmitEditing?: () => void;
  textContentType?: React.ComponentProps<typeof TextInput>['textContentType'];
  autoComplete?: React.ComponentProps<typeof TextInput>['autoComplete'];
  returnKeyType?: React.ComponentProps<typeof TextInput>['returnKeyType'];
}

function PasswordInput({
  label,
  placeholder,
  value,
  onChangeText,
  placeholderColor,
  colorScheme,
  onSubmitEditing,
  textContentType,
  autoComplete,
  returnKeyType,
  errorMessage,
  hasError,
}: PasswordInputProps & { errorMessage?: string }) {
  const [showPassword, setShowPassword] = useState(false);
  const textColor = colorScheme === 'dark' ? Colors.dark.text : Colors.light.text;
  const isDarkMode = colorScheme === 'dark';
  const backgroundColor = isDarkMode ? '#3A3A3C' : '#E5E5EA';
  const borderColor = isDarkMode ? '#4A4A4A' : '#D4D4DA';

  return (
    <View style={{ gap: 8 }}>
      <View style={styles.labelErrorContainer}>
        <Text style={[styles.inputLabel, { color: textColor }]}>{label}</Text>
        {errorMessage && <Text style={styles.inputRequired}>{errorMessage}</Text>}
      </View>
      <View
        style={[
          styles.inputWrapper,
          { backgroundColor, borderColor },
          hasError && styles.authErrorBorder,
        ]}
      >
        <TextInput
          style={[styles.textInput, { color: textColor }]}
          placeholder={placeholder}
          placeholderTextColor={placeholderColor}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={!showPassword}
          textContentType={textContentType ?? 'password'}
          autoComplete={autoComplete}
          returnKeyType={returnKeyType ?? 'go'}
          onSubmitEditing={onSubmitEditing}
        />
        <TouchableOpacity style={styles.passwordEye} onPress={() => setShowPassword(prev => !prev)}>
          <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={22} color={textColor} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  labelErrorContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  root: {
    flex: 1,
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollWrapper: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 24,
    paddingBottom: 60,
    paddingHorizontal: 24,
  },
  authIntro: {
    gap: 6,
    marginBottom: 20,
  },
  authIntroTitle: {
    fontFamily: Fonts.bold,
    fontSize: responsiveFontSize(28),
    lineHeight: 32,
  },
  authIntroSubtitle: {
    fontFamily: Fonts.regular,
    fontSize: responsiveFontSize(15),
    lineHeight: 22,
  },
  formSurface: {
    ...cardSurfaceBaseStyle,
  },
  verificationContainer: {
    gap: 24,
  },
  verificationHeader: {
    gap: 8,
  },
  verificationTitle: {
    fontFamily: Fonts.bold,
    fontSize: responsiveFontSize(24),
    letterSpacing: 0.4,
  },
  verificationDescription: {
    fontFamily: Fonts.medium,
    fontSize: responsiveFontSize(15),
    lineHeight: 22,
  },
  verificationCodeWrapper: {
    borderWidth: 1,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  verificationCodeInput: {
    fontFamily: Fonts.bold,
    fontSize: responsiveFontSize(26),
    letterSpacing: 12,
    textAlign: 'center',
  },
  verificationError: {
    fontFamily: Fonts.medium,
    fontSize: responsiveFontSize(14),
  },
  verificationFooter: {
    gap: 12,
  },
  verificationResend: {
    fontFamily: Fonts.bold,
    fontSize: responsiveFontSize(15),
    textAlign: 'center',
  },
  verificationChangeEmail: {
    fontFamily: Fonts.medium,
    fontSize: responsiveFontSize(15),
    textAlign: 'center',
  },
  modeSwitch: {
    flexDirection: 'row',
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    padding: 4,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  modeButtonText: {
    fontFamily: Fonts.medium,
    fontSize: responsiveFontSize(16),
    letterSpacing: 0.3,
  },
  modeButtonTextActive: {
    fontFamily: Fonts.bold,
  },
  modeButtonActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 0,
  },
  userTypeSwitch: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    padding: 4,
  },
  userTypeButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  userTypeButtonActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 0,
  },
  userTypeButtonText: {
    fontFamily: Fonts.medium,
    fontSize: responsiveFontSize(15),
    letterSpacing: 0.2,
  },
  userTypeButtonTextActive: {
    fontFamily: Fonts.bold,
  },
  actionButtons: {
    gap: 12,
  },
  signInButton: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.17,
    shadowRadius: 18,
    elevation: 0,
  },
  signInButtonText: {
    fontFamily: Fonts.bold,
    fontSize: responsiveFontSize(17),
    letterSpacing: 0.3,
  },
  primaryButton: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.17,
    shadowRadius: 18,
    elevation: 0,
  },
  primaryButtonText: {
    fontFamily: Fonts.bold,
    fontSize: responsiveFontSize(17),
    letterSpacing: 0.4,
    color: '#ffffff',
  },
  socialSection: {
    gap: 16,
  },
  socialDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  socialDividerLine: {
    flex: 1,
    height: 1,
  },
  socialDividerText: {
    fontFamily: Fonts.medium,
    fontSize: responsiveFontSize(13),
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  socialButtonsRow: {
    flexDirection: 'row',
    gap: 16,
    justifyContent: 'space-evenly',
    alignItems: 'flex-start',
  },
  socialButton: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    maxWidth: 120,
  },
  socialIconWrapper: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginBottom: 4,
  },
  socialButtonText: {
    fontFamily: Fonts.medium,
    fontSize: responsiveFontSize(14),
    textAlign: 'center',
    lineHeight: 18,
  },
  signInForgotWrapper: {
    alignSelf: 'flex-end',
  },
  signInForgotPassword: {
    textAlign: 'right',
    fontSize: responsiveFontSize(14),
    fontFamily: Fonts.medium,
    marginTop: -8,
  },
  guestPrimaryButton: {
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guestPrimaryButtonText: {
    fontFamily: Fonts.bold,
    fontSize: responsiveFontSize(15),
  },
  switchAuthRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    alignItems: 'center',
  },
  switchAuthLabel: {
    fontFamily: Fonts.medium,
    fontSize: responsiveFontSize(14),
  },
  switchAuthButton: {
    fontFamily: Fonts.bold,
    fontSize: responsiveFontSize(14),
  },
  footer: {
    textAlign: 'center',
    marginTop: 32,
    fontSize: responsiveFontSize(14),
    fontFamily: Fonts.medium,
    color: 'rgba(255,255,255,0.6)',
  },
  inputWrapper: {
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  textInput: {
    flex: 1,
    fontFamily: Fonts.regular,
    fontSize: responsiveFontSize(16),
    paddingVertical: 14,
    paddingHorizontal: 4,
  },
  passwordEye: {
    paddingHorizontal: 6,
    paddingVertical: 8,
  },
  inputLabel: {
    fontFamily: Fonts.medium,
    fontSize: responsiveFontSize(15),
  },
  inputRequired: {
    fontSize: responsiveFontSize(13),
    fontFamily: Fonts.bold,
    color: '#FF3B30',
  },
  authPickerField: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 14,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  authErrorBorder: {
    borderColor: '#FF3B30',
  },
  authPickerValue: {
    fontFamily: Fonts.regular,
    fontSize: responsiveFontSize(16),
  },
  authPickerValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  authPickerFlag: {
    fontSize: responsiveFontSize(18),
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
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
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
    shadowOpacity: 0.2,
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
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
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
  signedInRoot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  signedInCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.18,
    shadowRadius: 28,
    elevation: 0,
  },
  signedInTitle: {
    fontFamily: Fonts.bold,
    fontSize: responsiveFontSize(22),
  },
  signedInSubtitle: {
    fontFamily: Fonts.medium,
    fontSize: responsiveFontSize(16),
  },
});
