// Deprecated component. This file intentionally left blank after removal.
export {};
/*
import {
  ActivityIndicator,
  Animated,
  Modal,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { cardSurfaceBaseStyle, getCardSurfaceColors } from '@/constants/CardStyles';
import { responsiveFontSize, Fonts } from '@/constants/Fonts';
import { useColorScheme } from '@/hooks/useColorScheme';
import { WallpaperPattern } from '@/components';

type ButtonVariant = 'default' | 'cancel' | 'destructive';

interface CustomNotificationButton {
  text: string;
  onPress: () => void;
  style?: ButtonVariant;
}

interface CustomNotificationProps {
  visible: boolean;
  title: string;
  message: string;
  buttons?: CustomNotificationButton[];
  onDismiss: () => void;
  isLoading?: boolean;
}

const CustomNotification: React.FC<CustomNotificationProps> = ({
  visible,
  title,
  message,
  buttons = [],
  onDismiss,
  isLoading = false,
}) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const scale = useRef(new Animated.Value(0.95)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const iconPulse = useRef(new Animated.Value(0)).current;
  const [modalVisible, setModalVisible] = useState(false);

  const { background: cardBackground, border: cardBorder } = getCardSurfaceColors(
    colorScheme ?? 'light'
  );

  const textPrimary = isDark ? '#FFFFFF' : '#1C1C1E';
  const textSecondary = isDark ? 'rgba(235,235,245,0.82)' : '#3A3A3C';
  const overlayColor = isDark ? 'rgba(0,0,0,0.65)' : 'rgba(0,0,0,0.4)';

  useEffect(() => {
    if (visible) {
      setModalVisible(true);

      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 160,
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          damping: 14,
          stiffness: 160,
          useNativeDriver: true,
        }),
        Animated.spring(iconPulse, {
          toValue: 1,
          damping: 16,
          stiffness: 180,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (modalVisible) {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 120,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 0.95,
          duration: 120,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) {
          iconPulse.setValue(0);
          setModalVisible(false);
        }
      });
    }
  }, [visible, modalVisible, opacity, scale, iconPulse]);

  const handleBackdropPress = () => {
    if (isLoading) {
      return;
    }
    onDismiss();
  };

  const formatTitle = (text: string) => {
    const normalized = text.trim();
    const lowerText = normalized.toLowerCase();

    if (lowerText.includes('missing information') || lowerText.includes('missing details')) {
      return 'Missing Information';
    }
    if (
      lowerText.includes("passwords don't match") ||
      lowerText.includes('passwords do not match')
    ) {
      return "Passwords Don't Match";
    }
    if (lowerText.includes('invalid email')) {
      return 'Invalid Email Format';
    }
    if (lowerText.includes('password required')) {
      return 'Password Required';
    }
    if (lowerText.includes('name required')) {
      return 'Name Required';
    }
    if (lowerText.includes('business name required')) {
      return 'Business Name Required';
    }
    if (lowerText.includes('confirm password')) {
      return 'Confirm Password';
    }
    if (lowerText.includes('invalid credentials')) {
      return 'Invalid Credentials';
    }
    if (lowerText.includes('email not verified')) {
      return 'Email Not Verified';
    }
    if (lowerText.includes('too many attempts')) {
      return 'Too Many Attempts';
    }
    if (lowerText.includes('network error')) {
      return 'Network Error';
    }
    if (lowerText.includes('account exists')) {
      return 'Account Exists';
    }
    if (lowerText.includes('authentication error')) {
      return 'Authentication Error';
    }

    return normalized
      .split(' ')
      .map(segment => segment.charAt(0).toUpperCase() + segment.slice(1))
      .join(' ');
  };

  const extractMissingDetails = (text: string) => {
    const normalized = text.replace(/\n/g, ' ').trim();
    if (!normalized) {
      return [] as string[];
    }

    const missingMatch = normalized.match(/missing (?:fields|information|details)[:\-]?\s*(.*)/i);
    if (!missingMatch) {
      return [] as string[];
    }

    const detailSection = missingMatch[1];
    if (!detailSection) {
      return [] as string[];
    }

    return detailSection
      .split(/(?:,|;|\band\b)/gi)
      .map(segment => segment.replace(/[^a-z0-9\s]/gi, '').trim())
      .filter(Boolean)
      .map(segment => segment.charAt(0).toUpperCase() + segment.slice(1));
  };

  const formatMessage = (text: string, details: string[]) => {
    const baseText = details.length
      ? text.replace(
          /missing (?:fields|information|details)[:\-]?\s*(.*)/i,
          'Please complete the items below'
        )
      : text;

    const normalized = baseText.trim();
    if (!normalized) {
      return '';
    }

    const withSentenceCase =
      normalized.charAt(0).toUpperCase() + normalized.slice(1).replace(/\s+/g, ' ');

    if (/[.!?]$/.test(withSentenceCase)) {
      return withSentenceCase;
    }

    return `${withSentenceCase}.`;
  };

  const getNotificationVisuals = (heading: string, body: string, loading: boolean) => {
    const palette = {
      success: { icon: 'checkmark-circle' as const, color: '#30D158', badge: '#E8FBEF' },
      warning: { icon: 'warning' as const, color: '#FF9F0A', badge: '#FFF4E5' },
      danger: { icon: 'alert-circle' as const, color: '#FF453A', badge: '#FFE8E6' },
      info: { icon: 'information-circle' as const, color: '#0A84FF', badge: '#E5F0FF' },
      missing: { icon: 'information-circle' as const, color: '#0A84FF', badge: '#E5F0FF' },
      email: { icon: 'mail-unread' as const, color: '#0A84FF', badge: '#E5F0FF' },
      password: { icon: 'lock-closed' as const, color: '#5E5CE6', badge: '#ECEAFF' },
      profile: { icon: 'person-circle' as const, color: '#64D2FF', badge: '#E5F9FF' },
      payment: { icon: 'card' as const, color: '#FF9F0A', badge: '#FFF4E5' },
      network: { icon: 'wifi' as const, color: '#0A84FF', badge: '#E5F0FF' },
    } as const;

    const searchText = `${heading} ${body}`.toLowerCase();

    if (searchText.includes('missing information') || searchText.includes('missing fields')) {
      return palette.missing;
    }

    if (loading && searchText.includes('success')) {
      return palette.success;
    }

    if (searchText.includes('email')) {
      return palette.email;
    }

    if (searchText.includes('password')) {
      return palette.password;
    }

    if (searchText.includes('profile') || searchText.includes('name')) {
      return palette.profile;
    }

    if (
      searchText.includes('payment') ||
      searchText.includes('card') ||
      searchText.includes('billing') ||
      searchText.includes('subscription')
    ) {
      return palette.payment;
    }

    if (searchText.includes('network') || searchText.includes('connection')) {
      return palette.network;
    }

    if (
      searchText.includes('success') ||
      searchText.includes('verified') ||
      searchText.includes('completed') ||
      searchText.includes('ready')
    ) {
      return palette.success;
    }

    if (
      searchText.includes('invalid') ||
      searchText.includes('incorrect') ||
      searchText.includes('not verified') ||
      searchText.includes('confirm')
    ) {
      return palette.warning;
    }

    if (searchText.includes('missing')) {
      return palette.warning;
    }

    if (searchText.includes('error') || searchText.includes('failed')) {
      return palette.danger;
    }

    return palette.info;
  };

  const resolveDetailVisual = (detail: string) => {
    const normalized = detail.toLowerCase();

    if (normalized.includes('business')) {
      return 'briefcase' as const;
    }

    if (normalized.includes('name')) {
      return 'person-circle' as const;
    }

    if (normalized.includes('email')) {
      return 'mail-unread' as const;
    }

    if (normalized.includes('confirm')) {
      return 'lock-closed' as const;
    }

    if (normalized.includes('password')) {
      return 'lock-closed' as const;
    }

    return 'information-circle-outline' as const;
  };

  const missingDetails = extractMissingDetails(message);
  const displayMessage = formatMessage(message, missingDetails);
  const {
    icon: iconName,
    color: iconColor,
    badge: baseBadge,
  } = getNotificationVisuals(title, message, isLoading);
  const useSimpleLayout = isLoading && buttons.length === 0;
  const iconBadgeBackground = isDark ? 'rgba(44,44,46,0.95)' : baseBadge;
  const loadingMessageFallback: Record<string, string> = {
    'mail-unread': 'Updating your email settings…',
    'lock-closed': 'Securing your password changes…',
    'person-circle': 'Saving your profile details…',
    card: 'Saving your billing details…',
    wifi: 'Reconnecting your session…',
    'checkmark-circle': 'Wrapping up your changes…',
    warning: 'Reviewing the highlighted items…',
    'alert-circle': 'Resolving the issue…',
    'information-circle': 'Processing the latest update…',
  };

  const loadingCopy =
    displayMessage || loadingMessageFallback[iconName] || 'Processing your request…';

  const resolveButtonAppearance = (variant: ButtonVariant = 'default') => {
    if (variant === 'destructive') {
      return {
        backgroundColor: isDark ? '#FF453A' : '#FF3B30',
        textColor: '#FFFFFF',
        borderColor: isDark ? '#FF6B58' : '#FFA094',
      } as const;
    }

    if (variant === 'cancel') {
      return {
        backgroundColor: isDark ? '#3A3A3C' : '#E5E5EA',
        textColor: isDark ? '#F2F2F7' : '#1C1C1E',
        borderColor: isDark ? '#545458' : '#C7C7CC',
      } as const;
    }

    return {
      backgroundColor: isDark ? Colors.dark.tint : Colors.light.tint,
      textColor: isDark ? Colors.dark.background : Colors.light.background,
      borderColor: isDark ? '#0A84FF' : '#0A84FF',
    } as const;
  };

  if (!visible && !modalVisible) {
    return null;
  }

  return (
    <Modal
      transparent
      visible={modalVisible}
      statusBarTranslucent
      animationType="none"
      onRequestClose={onDismiss}
      presentationStyle="overFullScreen"
      supportedOrientations={['portrait', 'landscape']}
    >
      <View style={styles.modalContainer}>
        <StatusBar translucent backgroundColor="rgba(0,0,0,0.35)" />

        <View
          style={[
            styles.overlay,
            { backgroundColor: isDark ? 'rgba(0,0,0,0.55)' : 'rgba(0,0,0,0.35)' },
          ]}
        />

        <Animated.View style={[styles.backdrop, { opacity, backgroundColor: overlayColor }]}>
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            activeOpacity={1}
            onPress={handleBackdropPress}
          />
        </Animated.View>

        <Animated.View style={[styles.alertContainer, { transform: [{ scale }] }]}>
          <View
            style={[
              styles.alertCard,
              {
                ...cardSurfaceBaseStyle,
                backgroundColor: cardBackground,
                borderColor: cardBorder,
              },
              useSimpleLayout && styles.simpleCard,
            ]}
          >
            {!useSimpleLayout ? (
              <>
                <View style={styles.wallpaperContainer}>
                  <WallpaperPattern offsetTop={0} />
                </View>

                <Animated.View
                  style={[
                    styles.iconWrapper,
                    {
                      transform: [
                        {
                          scale: iconPulse.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0.9, 1],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  <View style={[styles.iconBadge, { backgroundColor: iconBadgeBackground }]}>
                    <Ionicons name={iconName} size={44} color={iconColor} />
                  </View>
                </Animated.View>
              </>
            ) : null}

            <View style={[styles.content, useSimpleLayout && styles.simpleContent]}>
              <Text style={[styles.title, { color: textPrimary }]}>{formatTitle(title)}</Text>

              {displayMessage && !useSimpleLayout ? (
                <Text style={[styles.message, { color: textSecondary }]}>{displayMessage}</Text>
              ) : null}

              {missingDetails.length > 0 ? (
                <View style={styles.messageList}>
                  {missingDetails.map(detail => {
                    const icon = resolveDetailVisual(detail);
                    const bulletColor = isDark ? '#FFFFFF' : '#000000';

                    return (
                      <View key={detail} style={styles.detailRow}>
                        <Ionicons name={icon} size={18} color={bulletColor} />
                        <Text style={[styles.detailText, { color: textPrimary }]}>{detail}</Text>
                      </View>
                    );
                  })}
                </View>
              ) : null}

              {isLoading ? (
                useSimpleLayout ? (
                  <View style={styles.simpleLoadingContent}>
                    <ActivityIndicator
                      size="large"
                      color={isDark ? Colors.dark.tint : Colors.light.tint}
                    />
                    <Text style={[styles.simpleLoadingText, { color: textPrimary }]}>
                      {loadingCopy}
                    </Text>
                  </View>
                ) : (
                  <View
                    style={[
                      styles.loadingContainer,
                      {
                        backgroundColor: isDark ? Colors.dark.tint : Colors.light.tint,
                      },
                    ]}
                  >
                    <ActivityIndicator
                      style={styles.loadingIndicator}
                      size="large"
                      color={isDark ? Colors.dark.background : Colors.light.background}
                    />
                    <Text
                      style={[
                        styles.loadingText,
                        { color: isDark ? Colors.dark.background : Colors.light.background },
                      ]}
                    >
                      {loadingCopy}
                    </Text>
                  </View>
                )
              ) : (
                buttons.length > 0 && (
                  <View style={styles.actions}>
                    {buttons.map((button, index) => {
                      const {
                        backgroundColor: buttonBackground,
                        textColor: buttonTextColor,
                        borderColor: buttonBorder,
                      } = resolveButtonAppearance(button.style);

                      return (
                        <TouchableOpacity
                          key={`${button.text}-${index}`}
                          style={[
                            styles.actionButton,
                            {
                              backgroundColor: buttonBackground,
                              borderColor: buttonBorder,
                              borderWidth: StyleSheet.hairlineWidth,
                            },
                          ]}
                          onPress={() => {
                            setModalVisible(false);
                            button.onPress();
                            if (button.style !== 'cancel') {
                              onDismiss();
                            }
                          }}
                          activeOpacity={0.85}
                          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                        >
                          <Text style={[styles.actionButtonText, { color: buttonTextColor }]}>
                            {button.text}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )
              )}
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    paddingVertical: 36,
    paddingHorizontal: 20,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertContainer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertCard: {
    width: '88%',
    maxWidth: 340,
    borderRadius: 20,
    overflow: 'visible',
    paddingHorizontal: 24,
    paddingTop: 64,
    paddingBottom: 22,
    alignItems: 'center',
  },
  simpleCard: {
    paddingTop: 32,
    paddingBottom: 28,
    overflow: 'hidden',
  },
  wallpaperContainer: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 24,
    overflow: 'hidden',
    zIndex: 0,
  },
  iconWrapper: {
    position: 'absolute',
    top: -38,
    alignSelf: 'center',
    zIndex: 2,
  },
  iconBadge: {
    width: 76,
    height: 76,
    borderRadius: 38,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 0,
  },
  content: {
    width: '100%',
    alignItems: 'center',
    gap: 14,
    zIndex: 1,
  },
  simpleContent: {
    gap: 18,
    paddingTop: 4,
  },
  title: {
    fontFamily: Fonts.bold,
    fontSize: responsiveFontSize(24),
    lineHeight: 30,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  message: {
    fontFamily: Fonts.medium,
    fontSize: responsiveFontSize(17),
    lineHeight: 24,
    textAlign: 'center',
    opacity: 0.92,
  },
  actions: {
    width: '100%',
    marginTop: 6,
    gap: 10,
  },
  actionButton: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderColor: 'rgba(0,0,0,0.06)',
  },
  actionButtonText: {
    fontFamily: Fonts.bold,
    fontSize: responsiveFontSize(17),
    lineHeight: 22,
  },
  loadingContainer: {
    width: '100%',
    borderRadius: 14,
    paddingVertical: 18,
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: 10,
  },
  loadingIndicator: {
    marginBottom: 4,
  },
  loadingText: {
    fontFamily: Fonts.medium,
    fontSize: responsiveFontSize(17),
    lineHeight: 24,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  simpleLoadingContent: {
    width: '100%',
    alignItems: 'center',
    gap: 16,
    paddingTop: 4,
  },
  simpleLoadingText: {
    fontFamily: Fonts.medium,
    fontSize: responsiveFontSize(16),
    lineHeight: 22,
    textAlign: 'center',
    opacity: 0.9,
  },
  messageList: {
    width: '100%',
    marginTop: 4,
    gap: 6,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  detailText: {
    flex: 1,
    fontFamily: Fonts.bold,
    fontSize: responsiveFontSize(18),
    lineHeight: 24,
    letterSpacing: 0.1,
  },
});

*/
