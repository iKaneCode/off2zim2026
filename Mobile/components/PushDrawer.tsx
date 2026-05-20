import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Dimensions,
  PanResponder,
  Text,
  TouchableOpacity,
  StatusBar,
  Easing,
  TouchableWithoutFeedback,
  Image,
  Modal,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/Colors';
import { useColorScheme, useThemePreference, setThemePreference } from '@/hooks/useColorScheme';
import { useAppAlert } from '@/context/AppAlertContext';
import { CircleIcon } from '@/components/DrawerContent';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faHeart as regularHeart } from '@fortawesome/free-regular-svg-icons/faHeart';
import { faHeart as solidHeart } from '@fortawesome/free-solid-svg-icons/faHeart';
import { router } from 'expo-router';
import { responsiveFontSize, responsiveSize, responsiveLineHeight, Fonts } from '@/constants/Fonts';
import { useAuth } from '@/context/AuthContext';
import {
  AuthActionButton,
  AuthPasswordField,
  AuthTextField,
  CalendarDatePickerModal,
  Logo,
} from '@/components';
import { Ionicons } from '@expo/vector-icons';
import { getProfile } from '@/context/AuthContext';
import { countries } from '@/countries-fixed';
import * as Haptics from 'expo-haptics';
import { SvgUri } from 'react-native-svg';
import { Asset } from 'expo-asset';

const { width } = Dimensions.get('window');
const DRAWER_WIDTH = width * 0.82;
const CLOSE_THRESHOLD = 0.75;
const OPEN_THRESHOLD = 0.18;
const EDGE_HIT_WIDTH = 24;

const flagAsset = Asset.fromModule(require('@/assets/images/coa.svg'));

const FlagIcon = ({ size, color }: { size: number; color: string }) => {
  const [uri, setUri] = useState<string | null>(
    flagAsset.localUri ?? (flagAsset.downloaded ? flagAsset.uri : null)
  );

  useEffect(() => {
    if (!uri) {
      flagAsset.downloadAsync().then(() => {
        setUri(flagAsset.localUri || flagAsset.uri);
      });
    }
  }, [uri]);

  if (!uri) return null;
  return <SvgUri uri={uri} width={size} height={size} color={color} fill={color} />;
};

const formatDateForDisplay = (isoDate: string) => {
  const [year, month, day] = isoDate.split('-');
  return `${day}/${month}/${year}`;
};

const parseDisplayDate = (value?: string) => {
  if (!value) return null;
  const trimmed = value.trim();
  const match = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;
  const [, day, month, year] = match;
  return `${year}-${month}-${day}`;
};

interface PushDrawerProps {
  isVisible: boolean;
  onClose: () => void;
  onOpen: () => void;
  children: React.ReactNode;
}

export const PushDrawer: React.FC<PushDrawerProps> = ({ isVisible, onClose, onOpen, children }) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const themePref = useThemePreference();
  const insets = useSafeAreaInsets();
  const { signOut, signIn, signUp, user, isGuest, setGuestMode, setNeedsBusinessOnboarding } =
    useAuth();
  const { showAlert } = useAppAlert();
  const isAuthenticated = !!user && !isGuest;
  const colors = Colors[colorScheme ?? 'light'];

  const themeIconName = useMemo(() => {
    switch (themePref) {
      case 'light':
        return 'sunny' as const;
      case 'dark':
        return 'moon' as const;
      case 'auto':
      default:
        return 'sync' as const;
    }
  }, [themePref]);

  const themeLabelText = useMemo(() => {
    switch (themePref) {
      case 'light':
        return 'Appearance: Light';
      case 'dark':
        return 'Appearance: Dark';
      case 'auto':
      default:
        return 'Appearance: Auto';
    }
  }, [themePref]);

  const cycleThemePref = useCallback(async () => {
    const next = themePref === 'auto' ? 'light' : themePref === 'light' ? 'dark' : 'auto';
    await setThemePreference(next);
  }, [themePref]);

  const [profileData, setProfileData] = useState<{
    avatar_url?: string;
    full_name?: string;
    user_type?: 'individual' | 'business';
  } | null>(null);
  const [showSignInSheet, setShowSignInSheet] = useState(false);
  const [showSignUpSheet, setShowSignUpSheet] = useState(false);
  const modalAnimation = useRef(new Animated.Value(0)).current;
  const signUpModalAnimation = useRef(new Animated.Value(0)).current;

  // Login form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Sign-up form state
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [signUpConfirmPassword, setSignUpConfirmPassword] = useState('');
  const [signUpShowPassword, setSignUpShowPassword] = useState(false);
  const [signUpShowConfirmPassword, setSignUpShowConfirmPassword] = useState(false);
  const [signUpLoading, setSignUpLoading] = useState(false);
  const [signUpUserType, setSignUpUserType] = useState<'individual' | 'business'>('individual');
  const [signUpFullName, setSignUpFullName] = useState('');
  const [signUpBusinessName, setSignUpBusinessName] = useState('');
  const [signUpTitle, setSignUpTitle] = useState('');
  const [signUpGender, setSignUpGender] = useState('');
  const [signUpIdType, setSignUpIdType] = useState('');
  const [signUpIdentityNumber, setSignUpIdentityNumber] = useState('');
  const [signUpDateOfBirth, setSignUpDateOfBirth] = useState('');
  const [signUpNationality, setSignUpNationality] = useState('');
  const [signUpPhone, setSignUpPhone] = useState('');
  const [signUpAttemptedSubmit, setSignUpAttemptedSubmit] = useState(false);
  const [showTitlePicker, setShowTitlePicker] = useState(false);
  const [showGenderPicker, setShowGenderPicker] = useState(false);
  const [showIdTypePicker, setShowIdTypePicker] = useState(false);
  const [showNationalityPicker, setShowNationalityPicker] = useState(false);
  const [showDobPicker, setShowDobPicker] = useState(false);

  // Constants for sign-up form
  const titles = useMemo(() => ['Mr', 'Mrs', 'Ms', 'Dr', 'Prof'], []);
  const genders = useMemo(() => ['Male', 'Female', 'Other'], []);
  const idTypes = useMemo(() => ['National ID', 'Passport'], []);

  // Using default React Native Alert for notifications

  // Modal swipe gesture state
  const modalPanY = useRef(new Animated.Value(0)).current;
  const signUpModalPanY = useRef(new Animated.Value(0)).current;

  const progress = useRef(new Animated.Value(isVisible ? 1 : 0)).current;
  const isOpenRef = useRef(isVisible);
  const dragProgressRef = useRef(isVisible ? 1 : 0);

  // Fetch profile data when user changes or drawer becomes visible
  useEffect(() => {
    const fetchProfileData = async () => {
      if (!isAuthenticated || !user) {
        setProfileData(null);
        return;
      }

      try {
        const { data, error } = await getProfile(user.id);

        if (error) {
          console.log('Error fetching profile:', error.message);
          setProfileData(null);
        } else {
          setProfileData({
            avatar_url: data?.avatar_url,
            full_name: data?.full_name,
            user_type: data?.user_type,
          });
        }
      } catch (error) {
        console.log('Error:', error);
        setProfileData(null);
      }
    };

    fetchProfileData();
  }, [user, isGuest, isAuthenticated]);

  // Refetch profile data when drawer becomes visible
  useEffect(() => {
    if (isVisible && isAuthenticated) {
      if (!user) {
        return;
      }
      const fetchProfileData = async () => {
        try {
          const { data, error } = await getProfile(user.id);

          if (error) {
            console.log('Error fetching profile:', error.message);
          } else {
            setProfileData({
              avatar_url: data?.avatar_url,
              full_name: data?.full_name,
              user_type: data?.user_type,
            });
          }
        } catch (error) {
          console.log('Error:', error);
        }
      };

      fetchProfileData();
    }
  }, [isVisible, user, isGuest, isAuthenticated]);

  useEffect(() => {
    isOpenRef.current = isVisible;
  }, [isVisible]);

  useEffect(() => {
    const id = progress.addListener(({ value }) => {
      dragProgressRef.current = value;
    });

    return () => {
      progress.removeListener(id);
    };
  }, [progress]);

  const animateTo = useCallback(
    (value: number) => {
      Animated.timing(progress, {
        toValue: value,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    },
    [progress]
  );

  useEffect(() => {
    animateTo(isVisible ? 1 : 0);
  }, [animateTo, isVisible]);

  const drawerTranslate = useMemo(
    () =>
      progress.interpolate({
        inputRange: [0, 1],
        outputRange: [-DRAWER_WIDTH, 0],
      }),
    [progress]
  );

  const contentTranslate = useMemo(
    () =>
      progress.interpolate({
        inputRange: [0, 1],
        outputRange: [0, DRAWER_WIDTH],
      }),
    [progress]
  );

  const overlayOpacity = useMemo(
    () =>
      progress.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 0.25],
      }),
    [progress]
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: evt => {
          if (isOpenRef.current) {
            return false;
          }

          return evt.nativeEvent.pageX <= EDGE_HIT_WIDTH;
        },
        onMoveShouldSetPanResponder: (evt, gestureState) => {
          const horizontal = Math.abs(gestureState.dx);
          const vertical = Math.abs(gestureState.dy);

          if (horizontal <= vertical) {
            return false;
          }

          if (isOpenRef.current) {
            return gestureState.dx < 0;
          }

          if (evt.nativeEvent.pageX > EDGE_HIT_WIDTH) {
            return false;
          }

          return gestureState.dx > 0;
        },
        onPanResponderMove: (_, gestureState) => {
          if (isOpenRef.current) {
            const drag = Math.min(0, gestureState.dx);
            const nextProgress = Math.max(0, Math.min(1, 1 + drag / DRAWER_WIDTH));
            progress.setValue(nextProgress);
            return;
          }

          const drag = Math.max(0, gestureState.dx);
          const nextProgress = Math.max(0, Math.min(1, drag / DRAWER_WIDTH));
          progress.setValue(nextProgress);
        },
        onPanResponderRelease: (_, gestureState) => {
          const currentProgress = dragProgressRef.current;

          if (isOpenRef.current) {
            const shouldClose = currentProgress < CLOSE_THRESHOLD || gestureState.vx < -0.5;

            if (shouldClose) {
              animateTo(0);
              onClose();
            } else {
              animateTo(1);
            }
            return;
          }

          const shouldOpen = currentProgress > OPEN_THRESHOLD || gestureState.vx > 0.5;

          if (shouldOpen) {
            onOpen();
            animateTo(1);
          } else {
            animateTo(0);
          }
        },
        onPanResponderTerminate: () => {
          if (!isOpenRef.current) {
            animateTo(0);
          }
        },
      }),
    [animateTo, onClose, onOpen, progress]
  );

  // Modal swipe-to-dismiss PanResponder
  const modalPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (evt, gestureState) => {
          // Only respond to downward swipes with some threshold
          return gestureState.dy > 5 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
        },
        onPanResponderMove: (evt, gestureState) => {
          // Only allow downward movement, with some damping for smoother feel
          if (gestureState.dy > 0) {
            // Add some resistance to make it feel more natural
            const dampedValue = gestureState.dy * 0.8;
            modalPanY.setValue(dampedValue);
          }
        },
        onPanResponderRelease: (evt, gestureState) => {
          // If swiped down enough or fast enough, dismiss modal
          if (gestureState.dy > 80 || gestureState.vy > 0.3) {
            // Use parallel animations for smoother dismiss
            Animated.parallel([
              Animated.timing(modalAnimation, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
              }),
              Animated.timing(modalPanY, {
                toValue: 300,
                duration: 200,
                useNativeDriver: true,
              }),
            ]).start(() => {
              setShowSignInSheet(false);
              modalPanY.setValue(0);
            });
          } else {
            // Snap back to original position
            Animated.spring(modalPanY, {
              toValue: 0,
              tension: 100,
              friction: 8,
              useNativeDriver: true,
            }).start();
          }
        },
        onPanResponderTerminate: () => {
          // Snap back to original position
          Animated.spring(modalPanY, {
            toValue: 0,
            tension: 100,
            friction: 8,
            useNativeDriver: true,
          }).start();
        },
      }),
    [modalAnimation, modalPanY]
  );

  // Sign-up modal swipe-to-dismiss PanResponder
  const signUpModalPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (evt, gestureState) => {
          return gestureState.dy > 5 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
        },
        onPanResponderMove: (evt, gestureState) => {
          if (gestureState.dy > 0) {
            const dampedValue = gestureState.dy * 0.8;
            signUpModalPanY.setValue(dampedValue);
          }
        },
        onPanResponderRelease: (evt, gestureState) => {
          if (gestureState.dy > 80 || gestureState.vy > 0.3) {
            Animated.parallel([
              Animated.timing(signUpModalAnimation, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
              }),
              Animated.timing(signUpModalPanY, {
                toValue: 300,
                duration: 200,
                useNativeDriver: true,
              }),
            ]).start(() => {
              setShowSignUpSheet(false);
              signUpModalPanY.setValue(0);
            });
          } else {
            Animated.spring(signUpModalPanY, {
              toValue: 0,
              tension: 100,
              friction: 8,
              useNativeDriver: true,
            }).start();
          }
        },
        onPanResponderTerminate: () => {
          Animated.spring(signUpModalPanY, {
            toValue: 0,
            tension: 100,
            friction: 8,
            useNativeDriver: true,
          }).start();
        },
      }),
    [signUpModalAnimation, signUpModalPanY]
  );

  useEffect(() => {
    return () => {
      progress.stopAnimation();
    };
  }, [progress]);

  // Helper function to show custom notifications
  const showNotification = (
    title: string,
    message: string,
    buttons: {
      text: string;
      onPress?: () => void;
      style?: 'default' | 'cancel' | 'destructive';
    }[]
  ) => {
    showAlert({ title, message, buttons });
  };

  const panHandlers = panResponder.panHandlers;
  const themeTextColor = isDark ? Colors.dark.text : Colors.light.text;
  const avatarBgColor = isDark ? '#3A3A3C' : '#F2F2F7';

  const handleSignOut = () => {
    showNotification('Logout', 'Are you sure you want to logout?', [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          try {
            await signOut();
            setGuestMode?.(false);
            setNeedsBusinessOnboarding?.(false);
            onClose();
            // Let the _layout.tsx handle navigation
          } catch (logoutError) {
            console.error('Error logging out:', logoutError);
            showAlert({
              title: 'Error',
              message: 'Failed to logout. Please try again.',
              buttons: [{ text: 'OK', style: 'default' }],
            });
          }
        },
      },
    ]);
  };

  const handleLogin = async () => {
    if (!email || !password) {
      showAlert({
        title: 'Error',
        message: 'Please fill in all fields',
        buttons: [{ text: 'OK' }],
      });
      return;
    }

    setLoading(true);
    try {
      const result = await signIn(email, password);

      if (result.error) {
        showAlert({
          title: 'Error',
          message: result.error.message || 'Login failed',
          buttons: [{ text: 'OK' }],
        });
      } else {
        // Exit guest mode and reset form
        if (setGuestMode) {
          setGuestMode(false);
        }
        setEmail('');
        setPassword('');
        hideModal();
        onClose();
      }
    } catch (error: any) {
      showAlert({
        title: 'Error',
        message: error.message || 'An unexpected error occurred',
        buttons: [{ text: 'OK' }],
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async () => {
    setSignUpAttemptedSubmit(true);

    const trimmedEmail = signUpEmail.trim().toLowerCase();
    const trimmedPassword = signUpPassword.trim();
    const trimmedConfirmPassword = signUpConfirmPassword.trim();
    const trimmedFullName = signUpFullName.trim();
    const trimmedBusinessName = signUpBusinessName.trim();
    const trimmedTitle = signUpTitle.trim();
    const trimmedGender = signUpGender.trim();
    const trimmedIdType = signUpIdType.trim();
    const trimmedIdentityNumber = signUpIdentityNumber.trim();
    const trimmedDobDisplay = signUpDateOfBirth.trim();
    const trimmedNationality = signUpNationality.trim();
    const trimmedPhone = signUpPhone.trim();

    // Helper function to normalize date
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

    const normalizedDob = normalizeDateOfBirthInput(trimmedDobDisplay);

    const missingFields: string[] = [];

    if (!trimmedEmail) missingFields.push('Email');
    if (!trimmedPassword) missingFields.push('Password');
    if (!trimmedConfirmPassword) missingFields.push('Confirm Password');

    if (signUpUserType === 'business') {
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

    setSignUpLoading(true);
    try {
      const { error } = await signUp(
        trimmedEmail,
        trimmedPassword,
        signUpUserType === 'business' ? undefined : trimmedFullName,
        signUpUserType,
        signUpUserType === 'business' ? trimmedBusinessName : undefined,
        signUpUserType === 'individual'
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
          showAlert({
            title: 'Network issue',
            message: 'Please check your internet connection and try again.',
            buttons: [{ text: 'OK' }],
          });
        } else {
          showAlert({ title: 'Sign up failed', message, buttons: [{ text: 'OK' }] });
        }
        return;
      }

      // Show verification notification
      showNotification(
        'Verify your email',
        `Enter the 6-digit code we just sent to ${trimmedEmail}.`,
        [
          {
            text: 'OK',
            onPress: () => {
              hideSignUpModal();
              onClose();
              router.push('/auth');
            },
            style: 'default',
          },
        ]
      );
    } catch (error: any) {
      const message = error?.message ?? 'Something went wrong. Please try again.';
      showAlert({ title: 'Authentication error', message, buttons: [{ text: 'OK' }] });
    } finally {
      setSignUpLoading(false);
    }
  };

  const handleForgotPassword = () => {
    if (!email) {
      showAlert({
        title: 'Error',
        message: 'Please enter your email address first',
        buttons: [{ text: 'OK' }],
      });
      return;
    }

    showAlert({
      title: 'Reset Password',
      message: 'Password reset functionality will be implemented soon.',
      buttons: [{ text: 'OK' }],
    });
  };

  const showModal = () => {
    setShowSignInSheet(true);
    Animated.spring(modalAnimation, {
      toValue: 1,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start();
  };

  const hideModal = () => {
    Animated.timing(modalAnimation, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setShowSignInSheet(false);
      // Reset swipe position when modal is hidden
      modalPanY.setValue(0);
    });
  };

  const showSignUpModal = () => {
    setShowSignUpSheet(true);
    Animated.spring(signUpModalAnimation, {
      toValue: 1,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start();
  };

  const hideSignUpModal = () => {
    Animated.timing(signUpModalAnimation, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setShowSignUpSheet(false);
      // Reset swipe position when modal is hidden
      signUpModalPanY.setValue(0);
    });
  };

  return (
    <View style={styles.root}>
      {/* Default RN Alert used; custom notification removed */}
      <Animated.View
        style={[
          styles.drawer,
          {
            transform: [{ translateX: drawerTranslate }],
            backgroundColor: isDark ? '#000000' : '#f2f2f7',
            paddingTop: insets.top > 0 ? insets.top : StatusBar.currentHeight || 20,
            overflow: 'hidden',
          },
        ]}
      >
        {/* Drawer Content Wrapper */}
        <View style={styles.drawerContentWrapper}>
          <View style={styles.drawerHeader}>
            <Logo size="medium" />
          </View>

          {/* User Profile Section */}
          <View
            style={[styles.profileContainer, { backgroundColor: isDark ? '#1C1C1E' : '#ffffff' }]}
          >
            <TouchableOpacity
              style={styles.userProfileSection}
              onPress={() => {
                if (isAuthenticated) {
                  onClose();
                  router.push('/profile');
                }
              }}
              disabled={!isAuthenticated}
            >
              <View style={styles.avatarContainer}>
                {profileData?.avatar_url ? (
                  <Image source={{ uri: profileData.avatar_url }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatarIcon, { backgroundColor: avatarBgColor }]}>
                    <Ionicons name="person" size={32} color={themeTextColor} />
                  </View>
                )}
              </View>
              <View style={styles.userInfo}>
                {!isAuthenticated ? (
                  <Text style={[styles.guestText, { color: themeTextColor }]}>Guest</Text>
                ) : (
                  <>
                    <Text style={[styles.userName, { color: themeTextColor }]}>
                      {user?.user_metadata?.user_type === 'business'
                        ? user?.user_metadata?.business_name || 'Business User'
                        : profileData?.full_name || user?.user_metadata?.full_name || 'User'}
                    </Text>
                    <View style={styles.ratingContainer}>
                      {[1, 2, 3, 4, 5].map(star => (
                        <Ionicons
                          key={star}
                          name={
                            star <= (user?.user_metadata?.rating || 0) ? 'star' : 'star-outline'
                          }
                          size={14}
                          color={
                            star <= (user?.user_metadata?.rating || 0)
                              ? '#FFD700'
                              : themeTextColor + '40'
                          }
                          style={styles.starIcon}
                        />
                      ))}
                      <Text style={[styles.ratingText, { color: themeTextColor }]}>
                        ({user?.user_metadata?.rating || 0}.0)
                      </Text>
                    </View>
                  </>
                )}
              </View>
            </TouchableOpacity>
          </View>

          {/* Emergency Services Section */}
          <View
            style={[
              styles.menuContainer,
              { backgroundColor: isDark ? '#1C1C1E' : '#ffffff', marginTop: 8 },
            ]}
          >
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                router.push('/emergency');
                onClose();
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    justifyContent: 'center',
                    alignItems: 'center',
                    backgroundColor: '#FF3B30',
                    ...(isDark
                      ? { shadowOpacity: 0, elevation: 0 }
                      : {
                          shadowColor: '#000',
                          shadowOffset: { width: 0, height: 1 },
                          shadowOpacity: 0.1,
                          shadowRadius: 2,
                          elevation: 0,
                        }),
                  }}
                >
                  <Ionicons name="warning" size={18} color="#FFFFFF" />
                </View>
                <Text style={[styles.drawerItemText, { color: themeTextColor, marginLeft: 12 }]}>
                  Emergency Services
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Appearance toggle moved under Emergency */}
          <View
            style={[
              styles.menuContainer,
              { backgroundColor: isDark ? '#1C1C1E' : '#ffffff', marginTop: 8 },
            ]}
          >
            <TouchableOpacity style={styles.menuItem} onPress={cycleThemePref}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    justifyContent: 'center',
                    alignItems: 'center',
                    backgroundColor: '#0A84FF',
                    ...(isDark
                      ? { shadowOpacity: 0, elevation: 0 }
                      : {
                          shadowColor: '#000',
                          shadowOffset: { width: 0, height: 1 },
                          shadowOpacity: 0.1,
                          shadowRadius: 2,
                          elevation: 0,
                        }),
                  }}
                >
                  <Ionicons name={themeIconName} size={18} color="#FFFFFF" />
                </View>
                <Text style={[styles.drawerItemText, { color: themeTextColor, marginLeft: 12 }]}>
                  {themeLabelText}
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles.drawerContent}>
            {/* Grouped Menu Items */}
            {isAuthenticated && (
              <View
                style={[
                  styles.menuContainer,
                  { backgroundColor: isDark ? '#1C1C1E' : '#ffffff', marginTop: 8 },
                ]}
              >
                {/* Likes */}
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => {
                    router.push('/likes');
                    onClose();
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    {/* Match LocationPill icon wrapper properties */}
                    <View
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 18,
                        justifyContent: 'center',
                        alignItems: 'center',
                        backgroundColor: isDark ? avatarBgColor : '#FFFFFF',
                        // Shadow matches LocationPill but disabled in dark mode to avoid darkening the gray
                        ...(isDark
                          ? {
                              shadowOpacity: 0,
                              elevation: 0,
                            }
                          : {
                              shadowColor: '#000',
                              shadowOffset: { width: 0, height: 1 },
                              shadowOpacity: 0.1,
                              shadowRadius: 2,
                              elevation: 0,
                            }),
                      }}
                    >
                      <FontAwesomeIcon icon={solidHeart} size={18} color="#FF4757" />
                    </View>
                    <Text
                      style={[styles.drawerItemText, { color: themeTextColor, marginLeft: 12 }]}
                    >
                      Likes
                    </Text>
                  </View>
                </TouchableOpacity>

                {/* eVisa */}
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => {
                    router.push('/evisa');
                    onClose();
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 18,
                        justifyContent: 'center',
                        alignItems: 'center',
                        backgroundColor: isDark ? avatarBgColor : '#FFFFFF',
                        ...(isDark
                          ? { shadowOpacity: 0, elevation: 0 }
                          : {
                              shadowColor: '#000',
                              shadowOffset: { width: 0, height: 1 },
                              shadowOpacity: 0.1,
                              shadowRadius: 2,
                              elevation: 0,
                            }),
                      }}
                    >
                      <FlagIcon size={26} color={colors.icon} />
                    </View>
                    <Text
                      style={[styles.drawerItemText, { color: themeTextColor, marginLeft: 12 }]}
                    >
                      eVisa
                    </Text>
                  </View>
                </TouchableOpacity>

                {/* Translate */}
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => {
                    router.push('/translate');
                    onClose();
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 18,
                        justifyContent: 'center',
                        alignItems: 'center',
                        backgroundColor: isDark ? avatarBgColor : '#FFFFFF',
                        ...(isDark
                          ? { shadowOpacity: 0, elevation: 0 }
                          : {
                              shadowColor: '#000',
                              shadowOffset: { width: 0, height: 1 },
                              shadowOpacity: 0.1,
                              shadowRadius: 2,
                              elevation: 0,
                            }),
                      }}
                    >
                      <Ionicons name="language" size={18} color={colors.icon} />
                    </View>
                    <Text
                      style={[styles.drawerItemText, { color: themeTextColor, marginLeft: 12 }]}
                    >
                      Translate
                    </Text>
                  </View>
                </TouchableOpacity>

                {/* Travel Insurance */}
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => {
                    router.push('/travel-insurance');
                    onClose();
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 18,
                        justifyContent: 'center',
                        alignItems: 'center',
                        backgroundColor: isDark ? avatarBgColor : '#FFFFFF',
                        ...(isDark
                          ? { shadowOpacity: 0, elevation: 0 }
                          : {
                              shadowColor: '#000',
                              shadowOffset: { width: 0, height: 1 },
                              shadowOpacity: 0.1,
                              shadowRadius: 2,
                              elevation: 0,
                            }),
                      }}
                    >
                      <Ionicons name="shield-checkmark" size={18} color={colors.icon} />
                    </View>
                    <Text
                      style={[styles.drawerItemText, { color: themeTextColor, marginLeft: 12 }]}
                    >
                      Travel Insurance
                    </Text>
                  </View>
                </TouchableOpacity>

                {/* Help */}
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => {
                    router.push('/help');
                    onClose();
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 18,
                        justifyContent: 'center',
                        alignItems: 'center',
                        backgroundColor: isDark ? avatarBgColor : '#FFFFFF',
                        ...(isDark
                          ? { shadowOpacity: 0, elevation: 0 }
                          : {
                              shadowColor: '#000',
                              shadowOffset: { width: 0, height: 1 },
                              shadowOpacity: 0.1,
                              shadowRadius: 2,
                              elevation: 0,
                            }),
                      }}
                    >
                      <Ionicons name="help-circle" size={18} color={colors.icon} />
                    </View>
                    <Text
                      style={[styles.drawerItemText, { color: themeTextColor, marginLeft: 12 }]}
                    >
                      Help Centre
                    </Text>
                  </View>
                </TouchableOpacity>

                {/* Temporary Test Button for Business Onboarding - Only show for business accounts */}
                {profileData?.user_type === 'business' && (
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => {
                      console.log('Test button pressed - triggering business onboarding');
                      setNeedsBusinessOnboarding?.(true);
                      onClose();
                    }}
                  >
                    <Text style={[styles.drawerItemText, { color: '#FF6B35' }]}>
                      🧪 Test Business Setup
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Spacer to push login/logout to bottom */}
            <View style={styles.spacer} />

            {/* Authentication Section */}
            {isAuthenticated ? (
              <TouchableOpacity
                style={[styles.drawerLogoutButton, { backgroundColor: '#FF3B30' }]}
                onPress={handleSignOut}
              >
                <Text
                  style={[
                    styles.drawerLogoutButtonText,
                    { color: isDark ? Colors.light.background : Colors.dark.background },
                  ]}
                >
                  LOGOUT
                </Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.guestButtonRow}>
                <AuthActionButton
                  label="Login"
                  iconName="log-in-outline"
                  colorScheme={colorScheme}
                  onPress={showModal}
                  style={styles.drawerAuthButton}
                />

                <AuthActionButton
                  label="Sign Up"
                  iconName="person-add-outline"
                  colorScheme={colorScheme}
                  variant="secondary"
                  onPress={() => {
                    onClose();
                    router.push('/sign-up');
                  }}
                  style={styles.drawerAuthButton}
                />
              </View>
            )}
          </View>
        </View>
      </Animated.View>

      <Animated.View
        style={[
          styles.contentWrapper,
          {
            transform: [{ translateX: contentTranslate }],
          },
        ]}
        {...panHandlers}
      >
        <View style={styles.contentSurface}>{children}</View>

        <TouchableWithoutFeedback onPress={onClose} disabled={!isVisible}>
          <Animated.View
            pointerEvents={isVisible ? 'auto' : 'none'}
            style={[StyleSheet.absoluteFillObject, styles.scrim, { opacity: overlayOpacity }]}
          />
        </TouchableWithoutFeedback>
      </Animated.View>

      {/* Login Modal */}
      <Modal visible={showSignInSheet} transparent animationType="none" onRequestClose={hideModal}>
        <Animated.View
          style={[
            styles.modalOverlay,
            {
              opacity: modalAnimation,
            },
          ]}
        >
          <TouchableWithoutFeedback onPress={hideModal}>
            <View style={StyleSheet.absoluteFillObject} />
          </TouchableWithoutFeedback>

          <KeyboardAvoidingView
            style={styles.modalKeyboardView}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <Animated.View
              style={[
                styles.loginModalContainer,
                {
                  backgroundColor: isDark ? '#000000' : '#f2f2f7',
                  transform: [
                    {
                      translateY: Animated.add(
                        modalAnimation.interpolate({
                          inputRange: [0, 1],
                          outputRange: [300, 0],
                        }),
                        modalPanY
                      ),
                    },
                  ],
                },
              ]}
              {...modalPanResponder.panHandlers}
            >
              {/* Modal Handle */}
              <View style={styles.modalHandle} />

              {/* Logo Header */}
              <View style={styles.modalLogoHeader}>
                <Logo size="large" style={styles.modalLogo} />
              </View>

              {/* Form Container */}
              <View
                style={[
                  styles.modalFormContainer,
                  { backgroundColor: isDark ? '#1C1C1E' : '#ffffff' },
                ]}
              >
                <View style={styles.modalForm}>
                  {/* Email Input */}
                  <AuthTextField
                    label="Email"
                    value={email}
                    onChangeText={setEmail}
                    placeholder="Enter your email"
                    placeholderColor={isDark ? '#8E8E93' : '#999'}
                    colorScheme={colorScheme}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    autoCorrect={false}
                    textContentType="emailAddress"
                    importantForAutofill="yes"
                    autoFocus={false}
                    enablesReturnKeyAutomatically
                    returnKeyType="next"
                    blurOnSubmit={false}
                  />

                  {/* Password Input */}
                  <AuthPasswordField
                    label="Password"
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Enter your password"
                    placeholderColor={isDark ? '#8E8E93' : '#999'}
                    colorScheme={colorScheme}
                    autoComplete="password"
                    textContentType="password"
                    returnKeyType="go"
                    onSubmitEditing={handleLogin}
                  />

                  {/* Forgot Password */}
                  <TouchableOpacity onPress={handleForgotPassword}>
                    <Text
                      style={[
                        styles.modalForgotPassword,
                        { color: isDark ? Colors.dark.tint : Colors.light.tint },
                      ]}
                    >
                      Forgot Password?
                    </Text>
                  </TouchableOpacity>

                  {/* Login Button */}
                  <AuthActionButton
                    label="Login"
                    iconName="log-in-outline"
                    colorScheme={colorScheme}
                    onPress={handleLogin}
                    loading={loading}
                    disabled={loading}
                  />

                  {/* Cancel Button */}
                  <AuthActionButton
                    label="Cancel"
                    iconName="close-outline"
                    colorScheme={colorScheme}
                    variant="secondary"
                    onPress={hideModal}
                  />
                </View>
              </View>
            </Animated.View>
          </KeyboardAvoidingView>
        </Animated.View>
      </Modal>

      {/* Sign Up Modal */}
      <Modal
        visible={showSignUpSheet}
        transparent
        animationType="none"
        onRequestClose={hideSignUpModal}
      >
        <Animated.View
          style={[
            styles.modalOverlay,
            {
              opacity: signUpModalAnimation,
            },
          ]}
        >
          <TouchableWithoutFeedback onPress={hideSignUpModal}>
            <View style={StyleSheet.absoluteFillObject} />
          </TouchableWithoutFeedback>

          <KeyboardAvoidingView
            style={styles.modalKeyboardView}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <Animated.View
              style={[
                styles.signUpModalContainer,
                {
                  backgroundColor: isDark ? '#000000' : '#f2f2f7',
                  transform: [
                    {
                      translateY: Animated.add(
                        signUpModalAnimation.interpolate({
                          inputRange: [0, 1],
                          outputRange: [300, 0],
                        }),
                        signUpModalPanY
                      ),
                    },
                  ],
                },
              ]}
            >
              {/* Modal Handle with pan gesture - larger hit area */}
              <View
                {...signUpModalPanResponder.panHandlers}
                style={{ paddingVertical: 16, paddingHorizontal: 50 }}
              >
                <View style={styles.modalHandle} />
              </View>

              {/* Logo Header */}
              <View style={styles.modalLogoHeader}>
                <Logo size="medium" style={styles.modalLogo} />
              </View>

              {/* Scrollable Form Container */}
              <View
                style={[
                  styles.signUpFormContainer,
                  { backgroundColor: isDark ? '#1C1C1E' : '#ffffff' },
                ]}
              >
                <ScrollView
                  style={styles.signUpScrollView}
                  contentContainerStyle={styles.signUpScrollContent}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                >
                  <View style={styles.modalForm}>
                    <Text style={[styles.modalTitle, { color: themeTextColor }]}>
                      Create Account
                    </Text>

                    {/* Account Type Selector */}
                    <View style={{ gap: 8 }}>
                      <Text style={[styles.modalLabel, { color: themeTextColor }]}>
                        Account Type
                      </Text>
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
                            signUpUserType === 'individual' && {
                              backgroundColor: isDark ? '#ffffff' : '#000000',
                            },
                          ]}
                          onPress={() => setSignUpUserType('individual')}
                        >
                          <Text
                            style={[
                              styles.userTypeButtonText,
                              {
                                color:
                                  signUpUserType === 'individual'
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
                            signUpUserType === 'business' && {
                              backgroundColor: isDark ? '#ffffff' : '#000000',
                            },
                          ]}
                          onPress={() => setSignUpUserType('business')}
                        >
                          <Text
                            style={[
                              styles.userTypeButtonText,
                              {
                                color:
                                  signUpUserType === 'business'
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

                    {signUpUserType === 'business' ? (
                      /* Business Name Field */
                      <View style={styles.modalInputContainer}>
                        <View style={styles.labelErrorContainer}>
                          <Text style={[styles.modalLabel, { color: themeTextColor }]}>
                            Business name
                          </Text>
                          {signUpAttemptedSubmit && !signUpBusinessName.trim() && (
                            <Text style={styles.inputRequired}>This field is required</Text>
                          )}
                        </View>
                        <TextInput
                          style={[
                            styles.modalInput,
                            {
                              color: themeTextColor,
                              backgroundColor: isDark ? '#2C2C2E' : '#f8f9fa',
                              borderColor:
                                signUpAttemptedSubmit && !signUpBusinessName.trim()
                                  ? '#FF3B30'
                                  : isDark
                                    ? '#4A4A4A'
                                    : '#D4D4DA',
                              borderWidth: 1,
                            },
                          ]}
                          value={signUpBusinessName}
                          onChangeText={setSignUpBusinessName}
                          placeholder="Enter your business name"
                          placeholderTextColor={isDark ? '#8E8E93' : '#999'}
                          autoCapitalize="words"
                          returnKeyType="next"
                        />
                      </View>
                    ) : (
                      <>
                        {/* Title Picker */}
                        <View style={{ gap: 8 }}>
                          <View style={styles.labelErrorContainer}>
                            <Text style={[styles.modalLabel, { color: themeTextColor }]}>
                              Title
                            </Text>
                            {signUpAttemptedSubmit && !signUpTitle && (
                              <Text style={styles.inputRequired}>This field is required</Text>
                            )}
                          </View>
                          <TouchableOpacity
                            activeOpacity={0.7}
                            onPress={() => {
                              setShowTitlePicker(true);
                            }}
                            style={[
                              styles.pickerField,
                              {
                                backgroundColor: isDark ? '#2C2C2E' : '#f8f9fa',
                                borderColor:
                                  signUpAttemptedSubmit && !signUpTitle
                                    ? '#FF3B30'
                                    : isDark
                                      ? '#4A4A4A'
                                      : '#D4D4DA',
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.pickerValue,
                                {
                                  color: signUpTitle ? themeTextColor : isDark ? '#8E8E93' : '#999',
                                },
                              ]}
                            >
                              {signUpTitle || 'Select title'}
                            </Text>
                            <Ionicons
                              name="chevron-down"
                              size={20}
                              color={isDark ? '#8E8E93' : '#999'}
                            />
                          </TouchableOpacity>
                        </View>

                        {/* Full Name */}
                        <View style={styles.modalInputContainer}>
                          <View style={styles.labelErrorContainer}>
                            <Text style={[styles.modalLabel, { color: themeTextColor }]}>
                              Full name
                            </Text>
                            {signUpAttemptedSubmit && !signUpFullName.trim() && (
                              <Text style={styles.inputRequired}>This field is required</Text>
                            )}
                          </View>
                          <TextInput
                            style={[
                              styles.modalInput,
                              {
                                color: themeTextColor,
                                backgroundColor: isDark ? '#2C2C2E' : '#f8f9fa',
                                borderColor:
                                  signUpAttemptedSubmit && !signUpFullName.trim()
                                    ? '#FF3B30'
                                    : isDark
                                      ? '#4A4A4A'
                                      : '#D4D4DA',
                                borderWidth: 1,
                              },
                            ]}
                            value={signUpFullName}
                            onChangeText={setSignUpFullName}
                            placeholder="Enter your full name"
                            placeholderTextColor={isDark ? '#8E8E93' : '#999'}
                            autoCapitalize="words"
                            returnKeyType="next"
                          />
                        </View>

                        {/* Gender Picker */}
                        <View style={{ gap: 8 }}>
                          <View style={styles.labelErrorContainer}>
                            <Text style={[styles.modalLabel, { color: themeTextColor }]}>
                              Gender
                            </Text>
                            {signUpAttemptedSubmit && !signUpGender && (
                              <Text style={styles.inputRequired}>This field is required</Text>
                            )}
                          </View>
                          <TouchableOpacity
                            activeOpacity={0.7}
                            onPress={() => {
                              setShowGenderPicker(true);
                            }}
                            style={[
                              styles.pickerField,
                              {
                                backgroundColor: isDark ? '#2C2C2E' : '#f8f9fa',
                                borderColor:
                                  signUpAttemptedSubmit && !signUpGender
                                    ? '#FF3B30'
                                    : isDark
                                      ? '#4A4A4A'
                                      : '#D4D4DA',
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.pickerValue,
                                {
                                  color: signUpGender
                                    ? themeTextColor
                                    : isDark
                                      ? '#8E8E93'
                                      : '#999',
                                },
                              ]}
                            >
                              {signUpGender || 'Select gender'}
                            </Text>
                            <Ionicons
                              name="chevron-down"
                              size={20}
                              color={isDark ? '#8E8E93' : '#999'}
                            />
                          </TouchableOpacity>
                        </View>

                        {/* ID Type Picker */}
                        <View style={{ gap: 8 }}>
                          <View style={styles.labelErrorContainer}>
                            <Text style={[styles.modalLabel, { color: themeTextColor }]}>
                              ID Type
                            </Text>
                            {signUpAttemptedSubmit && !signUpIdType && (
                              <Text style={styles.inputRequired}>This field is required</Text>
                            )}
                          </View>
                          <TouchableOpacity
                            activeOpacity={0.7}
                            onPress={() => {
                              setShowIdTypePicker(true);
                            }}
                            style={[
                              styles.pickerField,
                              {
                                backgroundColor: isDark ? '#2C2C2E' : '#f8f9fa',
                                borderColor:
                                  signUpAttemptedSubmit && !signUpIdType
                                    ? '#FF3B30'
                                    : isDark
                                      ? '#4A4A4A'
                                      : '#D4D4DA',
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.pickerValue,
                                {
                                  color: signUpIdType
                                    ? themeTextColor
                                    : isDark
                                      ? '#8E8E93'
                                      : '#999',
                                },
                              ]}
                            >
                              {signUpIdType || 'Select ID type'}
                            </Text>
                            <Ionicons
                              name="chevron-down"
                              size={20}
                              color={isDark ? '#8E8E93' : '#999'}
                            />
                          </TouchableOpacity>
                        </View>

                        {/* Identity Number */}
                        <View style={styles.modalInputContainer}>
                          <View style={styles.labelErrorContainer}>
                            <Text style={[styles.modalLabel, { color: themeTextColor }]}>
                              Identity number
                            </Text>
                            {signUpAttemptedSubmit && !signUpIdentityNumber.trim() && (
                              <Text style={styles.inputRequired}>This field is required</Text>
                            )}
                          </View>
                          <TextInput
                            style={[
                              styles.modalInput,
                              {
                                color: themeTextColor,
                                backgroundColor: isDark ? '#2C2C2E' : '#f8f9fa',
                                borderColor:
                                  signUpAttemptedSubmit && !signUpIdentityNumber.trim()
                                    ? '#FF3B30'
                                    : isDark
                                      ? '#4A4A4A'
                                      : '#D4D4DA',
                                borderWidth: 1,
                              },
                            ]}
                            value={signUpIdentityNumber}
                            onChangeText={setSignUpIdentityNumber}
                            placeholder="Enter identity number"
                            placeholderTextColor={isDark ? '#8E8E93' : '#999'}
                            autoCapitalize="characters"
                            returnKeyType="next"
                          />
                        </View>

                        {/* Date of Birth Picker */}
                        <View style={{ gap: 8 }}>
                          <View style={styles.labelErrorContainer}>
                            <Text style={[styles.modalLabel, { color: themeTextColor }]}>
                              Date of birth
                            </Text>
                            {signUpAttemptedSubmit && !signUpDateOfBirth && (
                              <Text style={styles.inputRequired}>This field is required</Text>
                            )}
                          </View>
                          <TouchableOpacity
                            activeOpacity={0.7}
                            onPress={() => {
                              setShowDobPicker(true);
                            }}
                            style={[
                              styles.pickerField,
                              {
                                backgroundColor: isDark ? '#2C2C2E' : '#f8f9fa',
                                borderColor:
                                  signUpAttemptedSubmit && !signUpDateOfBirth
                                    ? '#FF3B30'
                                    : isDark
                                      ? '#4A4A4A'
                                      : '#D4D4DA',
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.pickerValue,
                                {
                                  color: signUpDateOfBirth
                                    ? themeTextColor
                                    : isDark
                                      ? '#8E8E93'
                                      : '#999',
                                },
                              ]}
                            >
                              {signUpDateOfBirth || 'DD/MM/YYYY'}
                            </Text>
                            <Ionicons
                              name="calendar-outline"
                              size={20}
                              color={isDark ? '#8E8E93' : '#999'}
                            />
                          </TouchableOpacity>
                        </View>

                        {/* Nationality Picker */}
                        <View style={{ gap: 8 }}>
                          <View style={styles.labelErrorContainer}>
                            <Text style={[styles.modalLabel, { color: themeTextColor }]}>
                              Nationality
                            </Text>
                            {signUpAttemptedSubmit && !signUpNationality && (
                              <Text style={styles.inputRequired}>This field is required</Text>
                            )}
                          </View>
                          <TouchableOpacity
                            activeOpacity={0.7}
                            onPress={() => {
                              setShowNationalityPicker(true);
                            }}
                            style={[
                              styles.pickerField,
                              {
                                backgroundColor: isDark ? '#2C2C2E' : '#f8f9fa',
                                borderColor:
                                  signUpAttemptedSubmit && !signUpNationality
                                    ? '#FF3B30'
                                    : isDark
                                      ? '#4A4A4A'
                                      : '#D4D4DA',
                              },
                            ]}
                          >
                            <View style={styles.pickerValueRow}>
                              {signUpNationality && (
                                <Text style={styles.pickerFlag}>
                                  {countries.find(c => c.name === signUpNationality)?.flag}
                                </Text>
                              )}
                              <Text
                                style={[
                                  styles.pickerValue,
                                  {
                                    color: signUpNationality
                                      ? themeTextColor
                                      : isDark
                                        ? '#8E8E93'
                                        : '#999',
                                  },
                                ]}
                              >
                                {signUpNationality || 'Select nationality'}
                              </Text>
                            </View>
                            <Ionicons
                              name="chevron-down"
                              size={20}
                              color={isDark ? '#8E8E93' : '#999'}
                            />
                          </TouchableOpacity>
                        </View>

                        {/* Cell Phone Number */}
                        <View style={styles.modalInputContainer}>
                          <View style={styles.labelErrorContainer}>
                            <Text style={[styles.modalLabel, { color: themeTextColor }]}>
                              Cell phone number
                            </Text>
                            {signUpAttemptedSubmit && !signUpPhone.trim() && (
                              <Text style={styles.inputRequired}>This field is required</Text>
                            )}
                          </View>
                          <TextInput
                            style={[
                              styles.modalInput,
                              {
                                color: themeTextColor,
                                backgroundColor: isDark ? '#2C2C2E' : '#f8f9fa',
                                borderColor:
                                  signUpAttemptedSubmit && !signUpPhone.trim()
                                    ? '#FF3B30'
                                    : isDark
                                      ? '#4A4A4A'
                                      : '#D4D4DA',
                                borderWidth: 1,
                              },
                            ]}
                            value={signUpPhone}
                            onChangeText={setSignUpPhone}
                            placeholder="Enter phone number"
                            placeholderTextColor={isDark ? '#8E8E93' : '#999'}
                            keyboardType="phone-pad"
                            returnKeyType="next"
                          />
                        </View>
                      </>
                    )}

                    {/* Email Input */}
                    <View style={styles.modalInputContainer}>
                      <View style={styles.labelErrorContainer}>
                        <Text style={[styles.modalLabel, { color: themeTextColor }]}>Email</Text>
                        {signUpAttemptedSubmit && !signUpEmail.trim() && (
                          <Text style={styles.inputRequired}>This field is required</Text>
                        )}
                      </View>
                      <TextInput
                        style={[
                          styles.modalInput,
                          {
                            color: themeTextColor,
                            backgroundColor: isDark ? '#2C2C2E' : '#f8f9fa',
                            borderColor:
                              signUpAttemptedSubmit && !signUpEmail.trim()
                                ? '#FF3B30'
                                : isDark
                                  ? '#4A4A4A'
                                  : '#D4D4DA',
                            borderWidth: 1,
                          },
                        ]}
                        value={signUpEmail}
                        onChangeText={setSignUpEmail}
                        placeholder="Enter your email"
                        placeholderTextColor={isDark ? '#8E8E93' : '#999'}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoComplete="email"
                        autoCorrect={false}
                        textContentType="emailAddress"
                        returnKeyType="next"
                        blurOnSubmit={false}
                      />
                    </View>

                    {/* Password Input */}
                    <View style={styles.modalInputContainer}>
                      <View style={styles.labelErrorContainer}>
                        <Text style={[styles.modalLabel, { color: themeTextColor }]}>Password</Text>
                        {signUpAttemptedSubmit && !signUpPassword.trim() && (
                          <Text style={styles.inputRequired}>This field is required</Text>
                        )}
                      </View>
                      <View
                        style={[
                          styles.modalPasswordContainer,
                          {
                            backgroundColor: isDark ? '#2C2C2E' : '#f8f9fa',
                            borderColor:
                              signUpAttemptedSubmit && !signUpPassword.trim()
                                ? '#FF3B30'
                                : isDark
                                  ? '#4A4A4A'
                                  : '#D4D4DA',
                            borderWidth: 1,
                          },
                        ]}
                      >
                        <TextInput
                          style={[styles.modalPasswordInput, { color: themeTextColor }]}
                          value={signUpPassword}
                          onChangeText={setSignUpPassword}
                          placeholder="Create a password"
                          placeholderTextColor={isDark ? '#8E8E93' : '#999'}
                          secureTextEntry={!signUpShowPassword}
                          autoComplete="password-new"
                          textContentType="newPassword"
                          returnKeyType="next"
                          blurOnSubmit={false}
                        />
                        <TouchableOpacity
                          style={styles.modalEyeIcon}
                          onPress={() => setSignUpShowPassword(!signUpShowPassword)}
                        >
                          <Ionicons
                            name={signUpShowPassword ? 'eye-off' : 'eye'}
                            size={24}
                            color={themeTextColor}
                          />
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Confirm Password Input */}
                    <View style={styles.modalInputContainer}>
                      <View style={styles.labelErrorContainer}>
                        <Text style={[styles.modalLabel, { color: themeTextColor }]}>
                          Confirm password
                        </Text>
                        {signUpAttemptedSubmit && !signUpConfirmPassword.trim() && (
                          <Text style={styles.inputRequired}>This field is required</Text>
                        )}
                        {signUpAttemptedSubmit &&
                          signUpPassword !== signUpConfirmPassword &&
                          signUpConfirmPassword.trim() && (
                            <Text style={styles.inputRequired}>Passwords do not match</Text>
                          )}
                      </View>
                      <View
                        style={[
                          styles.modalPasswordContainer,
                          {
                            backgroundColor: isDark ? '#2C2C2E' : '#f8f9fa',
                            borderColor:
                              signUpAttemptedSubmit &&
                              (!signUpConfirmPassword.trim() ||
                                signUpPassword !== signUpConfirmPassword)
                                ? '#FF3B30'
                                : isDark
                                  ? '#4A4A4A'
                                  : '#D4D4DA',
                            borderWidth: 1,
                          },
                        ]}
                      >
                        <TextInput
                          style={[styles.modalPasswordInput, { color: themeTextColor }]}
                          value={signUpConfirmPassword}
                          onChangeText={setSignUpConfirmPassword}
                          placeholder="Re-enter your password"
                          placeholderTextColor={isDark ? '#8E8E93' : '#999'}
                          secureTextEntry={!signUpShowConfirmPassword}
                          autoComplete="password-new"
                          textContentType="newPassword"
                          returnKeyType="done"
                          onSubmitEditing={handleSignUp}
                        />
                        <TouchableOpacity
                          style={styles.modalEyeIcon}
                          onPress={() => setSignUpShowConfirmPassword(!signUpShowConfirmPassword)}
                        >
                          <Ionicons
                            name={signUpShowConfirmPassword ? 'eye-off' : 'eye'}
                            size={24}
                            color={themeTextColor}
                          />
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Create Account Button */}
                    <TouchableOpacity
                      style={[
                        styles.modalLoginButton,
                        { backgroundColor: isDark ? Colors.dark.tint : Colors.light.tint },
                        signUpLoading && styles.modalLoginButtonDisabled,
                      ]}
                      onPress={handleSignUp}
                      disabled={signUpLoading}
                    >
                      {signUpLoading ? (
                        <ActivityIndicator
                          color={isDark ? Colors.dark.background : Colors.light.background}
                        />
                      ) : (
                        <Text
                          style={[
                            styles.modalLoginButtonText,
                            { color: isDark ? Colors.dark.background : Colors.light.background },
                          ]}
                        >
                          CREATE ACCOUNT
                        </Text>
                      )}
                    </TouchableOpacity>

                    {/* Cancel Button */}
                    <TouchableOpacity
                      style={[
                        styles.modalCancelButton,
                        { borderColor: isDark ? '#3A3A3C' : '#ddd' },
                      ]}
                      onPress={hideSignUpModal}
                    >
                      <Text style={[styles.modalCancelButtonText, { color: themeTextColor }]}>
                        Cancel
                      </Text>
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              </View>
            </Animated.View>
          </KeyboardAvoidingView>
        </Animated.View>
      </Modal>

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
                          signUpTitle === titleOption
                            ? isDark
                              ? 'rgba(52, 199, 89, 0.15)'
                              : 'rgba(52, 199, 89, 0.1)'
                            : 'transparent',
                      },
                    ]}
                    onPress={() => {
                      setSignUpTitle(titleOption);
                      setShowTitlePicker(false);
                    }}
                  >
                    <Text style={[styles.pickerModalOptionText, { color: themeTextColor }]}>
                      {titleOption}
                    </Text>
                    {signUpTitle === titleOption && (
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
                          signUpGender === genderOption
                            ? isDark
                              ? 'rgba(52, 199, 89, 0.15)'
                              : 'rgba(52, 199, 89, 0.1)'
                            : 'transparent',
                      },
                    ]}
                    onPress={() => {
                      setSignUpGender(genderOption);
                      setShowGenderPicker(false);
                    }}
                  >
                    <Text style={[styles.pickerModalOptionText, { color: themeTextColor }]}>
                      {genderOption}
                    </Text>
                    {signUpGender === genderOption && (
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
                          signUpIdType === idTypeOption
                            ? isDark
                              ? 'rgba(52, 199, 89, 0.15)'
                              : 'rgba(52, 199, 89, 0.1)'
                            : 'transparent',
                      },
                    ]}
                    onPress={() => {
                      setSignUpIdType(idTypeOption);
                      setShowIdTypePicker(false);
                    }}
                  >
                    <Text style={[styles.pickerModalOptionText, { color: themeTextColor }]}>
                      {idTypeOption}
                    </Text>
                    {signUpIdType === idTypeOption && (
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
                          signUpNationality === country.name
                            ? isDark
                              ? 'rgba(52, 199, 89, 0.15)'
                              : 'rgba(52, 199, 89, 0.1)'
                            : 'transparent',
                      },
                    ]}
                    onPress={() => {
                      setSignUpNationality(country.name);
                      setShowNationalityPicker(false);
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <Text style={{ fontSize: responsiveFontSize(24) }}>{country.flag}</Text>
                      <Text style={[styles.pickerModalOptionText, { color: themeTextColor }]}>
                        {country.name}
                      </Text>
                    </View>
                    {signUpNationality === country.name && (
                      <Ionicons name="checkmark-circle" size={24} color="#34C759" />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <CalendarDatePickerModal
        visible={showDobPicker}
        title="Date of Birth"
        selectedDate={parseDisplayDate(signUpDateOfBirth)}
        colorScheme={colorScheme}
        maximumDate={new Date()}
        onClose={() => setShowDobPicker(false)}
        onSelectDate={date => {
          setSignUpDateOfBirth(formatDateForDisplay(date));
          setShowDobPicker(false);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  drawer: {
    width: DRAWER_WIDTH,
    height: '100%',
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    zIndex: 10,
  },
  drawerContentWrapper: {
    flex: 1,
    position: 'relative',
    zIndex: 10,
  },
  profileContainer: {
    marginHorizontal: 20,
    marginVertical: 8,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 0,
  },
  menuContainer: {
    marginHorizontal: 20,
    marginVertical: 8,
    borderRadius: 16,
    paddingVertical: 2,
    paddingHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 0,
  },
  menuItem: {
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  contentWrapper: {
    flex: 1,
    position: 'relative',
  },
  contentSurface: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  drawerHeader: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(128, 128, 128, 0.2)',
  },
  profileDivider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 20,
    marginVertical: 8,
  },
  userProfileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 0, // Remove horizontal padding since container has it
    paddingVertical: 0, // Remove vertical padding since container has it
    borderBottomWidth: 0, // Remove border since we have container
    borderBottomColor: 'transparent',
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  avatarIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontFamily: Fonts.bold,
    fontSize: responsiveFontSize(18),
    marginBottom: 2,
  },
  userStatus: {
    fontFamily: Fonts.regular,
    fontSize: responsiveFontSize(14),
    opacity: 0.7,
  },
  guestText: {
    fontFamily: Fonts.bold,
    fontSize: responsiveFontSize(18),
  },
  userEmail: {
    fontFamily: Fonts.regular,
    fontSize: responsiveFontSize(14),
    opacity: 0.8,
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starIcon: {
    marginRight: 2,
  },
  ratingText: {
    fontFamily: Fonts.regular,
    fontSize: responsiveFontSize(12),
    marginLeft: 4,
    opacity: 0.8,
  },
  drawerTitle: {
    fontFamily: Fonts.bold,
    fontSize: responsiveFontSize(24),
  },
  drawerContent: {
    flex: 1,
  },
  spacer: {
    flex: 0.5,
  },
  drawerItem: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(128, 128, 128, 0.1)',
  },
  drawerItemText: {
    fontFamily: Fonts.bold,
    fontSize: responsiveFontSize(18),
  },
  divider: {
    height: 1,
    marginVertical: 10,
    marginHorizontal: 20,
  },
  userSection: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  logoutItem: {
    marginTop: 10,
  },
  guestButtonRow: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 12,
    marginBottom: 16,
    gap: responsiveSize(9, 8, 11),
  },
  drawerAuthButton: {
    flex: 1,
    height: responsiveSize(44, 42, 48),
    borderRadius: 100,
    paddingHorizontal: responsiveSize(10, 8, 13),
  },
  drawerLoginButton: {
    flex: 1,
    height: responsiveSize(44, 42, 48),
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 100,
    paddingHorizontal: responsiveSize(10, 8, 13),
  },
  drawerLoginButtonText: {
    fontSize: responsiveFontSize(17),
    lineHeight: responsiveLineHeight(17),
    fontFamily: Fonts.bold,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  drawerSignUpButton: {
    flex: 1,
    height: responsiveSize(44, 42, 48),
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 100,
    paddingHorizontal: responsiveSize(10, 8, 13),
  },
  drawerSignUpButtonText: {
    fontSize: responsiveFontSize(17),
    lineHeight: responsiveLineHeight(17),
    fontFamily: Fonts.bold,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  drawerLogoutButton: {
    marginHorizontal: 20,
    marginTop: 0,
    marginBottom: 8,
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 0,
  },
  drawerLogoutButtonText: {
    fontSize: responsiveFontSize(18),
    fontFamily: Fonts.bold,
  },
  scrim: {
    backgroundColor: '#000',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalKeyboardView: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  loginModalContainer: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    minHeight: 600,
    maxHeight: '95%',
    position: 'relative',
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#C7C7CC',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 20,
    zIndex: 10,
  },
  modalLogoHeader: {
    alignItems: 'center',
    paddingVertical: 10,
    zIndex: 10,
  },
  modalLogo: {
    transform: [{ scale: 1.2 }],
  },
  modalFormContainer: {
    marginHorizontal: 24,
    marginTop: 10,
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 0,
    zIndex: 10,
  },
  modalFormTitle: {
    fontSize: responsiveFontSize(24),
    fontFamily: Fonts.bold,
    textAlign: 'center',
    marginBottom: 24,
  },
  modalForm: {
    gap: 20,
  },
  modalTitle: {
    fontSize: responsiveFontSize(24),
    fontFamily: Fonts.bold,
    textAlign: 'center',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: responsiveFontSize(15),
    fontFamily: Fonts.regular,
    textAlign: 'center',
    marginBottom: 12,
  },
  modalInputContainer: {
    gap: 8,
  },
  modalLabel: {
    fontSize: responsiveFontSize(16),
    fontFamily: Fonts.medium,
  },
  modalInput: {
    height: 50,
    paddingHorizontal: 16,
    fontSize: responsiveFontSize(16),
    fontFamily: Fonts.regular,
    borderRadius: 8,
  },
  modalPasswordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    height: 50,
  },
  modalPasswordInput: {
    flex: 1,
    paddingHorizontal: 16,
    fontSize: responsiveFontSize(16),
    fontFamily: Fonts.regular,
  },
  modalEyeIcon: {
    paddingHorizontal: 12,
  },
  modalForgotPassword: {
    textAlign: 'right',
    fontSize: responsiveFontSize(14),
    fontFamily: Fonts.medium,
    marginTop: -8,
  },
  modalLoginButton: {
    height: 50,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  modalLoginButtonDisabled: {
    opacity: 0.7,
  },
  modalLoginButtonText: {
    fontSize: responsiveFontSize(18),
    fontFamily: Fonts.bold,
  },
  modalCancelButton: {
    backgroundColor: 'transparent',
    height: 50,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginTop: 8,
  },
  modalCancelButtonText: {
    fontSize: responsiveFontSize(16),
    fontFamily: Fonts.medium,
  },
  signUpModalContainer: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    minHeight: '85%',
    maxHeight: '95%',
    position: 'relative',
  },
  signUpFormContainer: {
    flex: 1,
    marginHorizontal: 24,
    marginTop: 10,
    marginBottom: 24,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 0,
    overflow: 'hidden',
  },
  signUpScrollView: {
    flex: 1,
  },
  signUpScrollContent: {
    padding: 24,
    paddingBottom: 40,
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
  labelErrorContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  inputRequired: {
    fontSize: responsiveFontSize(13),
    fontFamily: Fonts.medium,
    color: '#FF3B30',
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
