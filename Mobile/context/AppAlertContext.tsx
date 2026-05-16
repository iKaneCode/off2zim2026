import React, {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from 'react';
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Dimensions } from 'react-native';
import { GlassPanel } from '@/components/GlassPanel';
import { ThemedText } from '@/components/ThemedText';
import { Fonts, responsiveFontSize, responsiveLineHeight, responsiveSize } from '@/constants/Fonts';
import { useColorScheme } from '@/hooks/useColorScheme';

// ─── Types ───────────────────────────────────────────────────────────────────

type AlertButtonStyle = 'default' | 'cancel' | 'destructive';

export interface AppAlertButton {
  text: string;
  style?: AlertButtonStyle;
  onPress?: () => void;
}

export interface AppAlertConfig {
  title: string;
  message: string;
  buttons?: AppAlertButton[];
}

interface AppAlertContextValue {
  showAlert: (config: AppAlertConfig) => void;
  hideAlert: () => void;
}

// ─── Context ─────────────────────────────────────────────────────────────────

const AppAlertContext = createContext<AppAlertContextValue>({
  showAlert: () => {},
  hideAlert: () => {},
});

export function useAppAlert() {
  return useContext(AppAlertContext);
}

// ─── Layout constants ────────────────────────────────────────────────────────

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ALERT_WIDTH = Math.min(SCREEN_WIDTH - responsiveSize(48, 40, 60), responsiveSize(320, 304, 340));
const ALERT_RADIUS = responsiveSize(22, 20, 26);
const ALERT_PADDING = responsiveSize(18, 16, 20);
const ALERT_BUTTON_HEIGHT = responsiveSize(44, 42, 48);
const GLASS_BORDER_WIDTH = StyleSheet.hairlineWidth * 1.5;

// ─── Provider ────────────────────────────────────────────────────────────────

export function AppAlertProvider({ children }: { children: ReactNode }) {
  const [alertConfig, setAlertConfig] = useState<AppAlertConfig | null>(null);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const showAlert = useCallback((config: AppAlertConfig) => {
    setAlertConfig(config);
  }, []);

  const hideAlert = useCallback(() => {
    setAlertConfig(null);
  }, []);

  const handleButtonPress = useCallback(
    (button: AppAlertButton) => {
      hideAlert();
      if (button.onPress) {
        setTimeout(button.onPress, 50);
      }
    },
    [hideAlert]
  );

  const buttons: AppAlertButton[] = alertConfig?.buttons ?? [{ text: 'OK', style: 'default' }];

  return (
    <AppAlertContext.Provider value={{ showAlert, hideAlert }}>
      {children}

      <Modal
        visible={!!alertConfig}
        transparent
        animationType="fade"
        presentationStyle="overFullScreen"
        statusBarTranslucent
        onRequestClose={hideAlert}
      >
        <Pressable style={styles.backdrop} onPress={hideAlert}>
          <Pressable style={styles.card}>
            <GlassPanel
              intensity={isDark ? 22 : 32}
              tint={isDark ? 'dark' : 'light'}
              style={[
                styles.glass,
                {
                  backgroundColor: isDark
                    ? Platform.OS === 'android'
                      ? 'rgba(38,38,40,0.97)'
                      : 'rgba(44,44,46,0.82)'
                    : Platform.OS === 'android'
                    ? 'rgba(248,248,250,0.98)'
                    : 'rgba(246,246,248,0.88)',
                  borderColor: isDark ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.82)',
                },
              ]}
            >
              <View style={styles.content}>
                <ThemedText allowFontScaling={false} style={styles.title}>
                  {alertConfig?.title}
                </ThemedText>
                <ThemedText
                  allowFontScaling={false}
                  style={[
                    styles.message,
                    { color: isDark ? 'rgba(235,235,245,0.78)' : '#2F2F36' },
                  ]}
                >
                  {alertConfig?.message}
                </ThemedText>
              </View>

              <View style={styles.buttonRow}>
                {buttons.map((btn, index) => (
                  <TouchableOpacity
                    key={`${btn.text}-${index}`}
                    style={[
                      styles.button,
                      btn.style === 'cancel' && {
                        backgroundColor: isDark
                          ? 'rgba(120,120,128,0.28)'
                          : 'rgba(120,120,128,0.14)',
                      },
                      btn.style === 'destructive' && {
                        backgroundColor: isDark
                          ? 'rgba(255,69,58,0.22)'
                          : 'rgba(255,59,48,0.12)',
                      },
                      (!btn.style || btn.style === 'default') && {
                        backgroundColor: isDark
                          ? 'rgba(10,132,255,0.24)'
                          : 'rgba(0,122,255,0.12)',
                      },
                    ]}
                    activeOpacity={0.68}
                    onPress={() => handleButtonPress(btn)}
                  >
                    <ThemedText
                      allowFontScaling={false}
                      style={[
                        styles.buttonText,
                        btn.style === 'destructive' && styles.buttonDestructive,
                        btn.style === 'cancel' && styles.buttonCancel,
                      ]}
                    >
                      {btn.text}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </View>
            </GlassPanel>
          </Pressable>
        </Pressable>
      </Modal>
    </AppAlertContext.Provider>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.26)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: responsiveSize(16, 14, 20),
  },
  card: {
    width: ALERT_WIDTH,
    borderRadius: ALERT_RADIUS,
    overflow: 'hidden',
  },
  glass: {
    overflow: 'hidden',
    borderRadius: ALERT_RADIUS,
    borderWidth: GLASS_BORDER_WIDTH,
  },
  content: {
    paddingHorizontal: ALERT_PADDING,
    paddingTop: ALERT_PADDING,
    paddingBottom: responsiveSize(14, 12, 17),
    alignItems: 'center',
  },
  title: {
    fontSize: responsiveFontSize(20),
    lineHeight: responsiveLineHeight(20),
    fontFamily: Fonts.bold,
    textAlign: 'center',
  },
  message: {
    marginTop: responsiveSize(4, 3, 7),
    fontSize: responsiveFontSize(15),
    lineHeight: responsiveLineHeight(15),
    fontFamily: Fonts.regular,
    textAlign: 'center',
    opacity: 0.92,
  },
  buttonRow: {
    flexDirection: 'row',
    paddingHorizontal: responsiveSize(14, 12, 18),
    paddingBottom: responsiveSize(14, 12, 18),
    paddingTop: responsiveSize(4, 3, 6),
    gap: responsiveSize(9, 8, 11),
  },
  button: {
    flex: 1,
    height: ALERT_BUTTON_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 100,
    paddingHorizontal: responsiveSize(10, 8, 13),
  },
  buttonText: {
    fontSize: responsiveFontSize(17),
    lineHeight: responsiveLineHeight(17),
    fontFamily: Fonts.bold,
    color: '#007AFF',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  buttonCancel: {
    fontFamily: Fonts.bold,
    color: '#007AFF',
  },
  buttonDestructive: {
    fontFamily: Fonts.bold,
    color: '#FF3B30',
  },
});
