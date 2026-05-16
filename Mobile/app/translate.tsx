import React, { useMemo, useRef, useState } from 'react';
import { View, StyleSheet, ScrollView, TextInput, TouchableOpacity, Modal, Pressable } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { CustomHeader } from '@/components/CustomHeader';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { IOSScreenWrapper } from '@/components/IOSScreenWrapper';
import { WallpaperPattern } from '@/components/WallpaperPattern';
import Ionicons from '@expo/vector-icons/Ionicons';
import { responsiveFontSize, Fonts } from '@/constants/Fonts';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { getCardSurfaceColors } from '@/constants/CardStyles';

export default function TranslateScreen() {
  const backgroundColor = useThemeColor({}, 'background');
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const subtleBackground = useMemo(() => (isDark ? '#2C2C2E' : '#F2F2F7'), [isDark]);
  const accentSurface = useMemo(() => (isDark ? '#1C1C1E' : '#FFFFFF'), [isDark]);
  const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
  const cardColors = getCardSurfaceColors(colorScheme as 'light' | 'dark' | undefined);

  const [sourceText, setSourceText] = useState('');
  const [targetText, setTargetText] = useState('');
  const [detectSource, setDetectSource] = useState(true);
  const [sourceLang, setSourceLang] = useState<string>('Auto');
  const [targetLang, setTargetLang] = useState<string>('English');
  const [showSourcePicker, setShowSourcePicker] = useState(false);
  const [showTargetPicker, setShowTargetPicker] = useState(false);

  const sourceInputRef = useRef<TextInput>(null);
  const targetInputRef = useRef<TextInput>(null);

  const languages = useMemo(
    () => [
      'Auto',
      'English',
      'Shona',
      'Ndebele',
      'French',
      'Spanish',
      'Portuguese',
      'German',
      'Chinese',
      'Afrikaans',
      'Swahili',
    ],
    []
  );

  const detectedLang = useMemo(() => {
    if (!detectSource || sourceText.trim().length === 0) return null;
    const text = sourceText;
    // naive detection heuristic for UI purposes only
    if (/[ñáéíóúü]/i.test(text)) return 'Spanish';
    if (/[çéàèùâêîôûëïüÿ]/i.test(text)) return 'French';
    if (/[äöüß]/i.test(text)) return 'German';
    if (/[-]/.test(text) && /[a-zA-Z]/.test(text)) return 'English';
    return 'English';
  }, [detectSource, sourceText]);

  const handleGoBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  return (
    <IOSScreenWrapper>
      <ThemedView style={[styles.container]} lightColor={Colors.light.appBackground} darkColor={Colors.dark.appBackground}>
        <WallpaperPattern />

        <CustomHeader showLogo leftAction={{ icon: 'chevron-back', onPress: handleGoBack, color: '#FF3B30' }} />

        <View style={styles.titleSection}>
          <ThemedText type="title1" style={styles.pageTitle}>
            Translate
          </ThemedText>
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          <View
            style={[
              styles.card,
              {
                backgroundColor: cardColors.background,
                borderColor: cardColors.border,
                shadowColor: isDark ? 'rgba(0,0,0,0.9)' : '#000',
              },
            ]}
          >
            {/* Language Selection Row */}
            <View style={styles.section}>
            <View style={styles.langRow}>
              <TouchableOpacity
                style={[styles.langPill, { backgroundColor: subtleBackground }]}
                activeOpacity={0.85}
                onPress={() => {
                  // Allow opening even when detect is enabled
                  setShowSourcePicker(true);
                }}
              >
                <View style={[styles.iconBubble, { backgroundColor: accentSurface }]}>                    
                  <Ionicons name="language" size={12} color={isDark ? '#FFFFFF' : '#1C1C1E'} />
                </View>
                  <ThemedText style={[styles.langText, { color: textColor }]} numberOfLines={1}>
                  {detectSource ? 'Auto' : sourceLang}
                </ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.swapButton, { backgroundColor: subtleBackground }]}
                activeOpacity={0.85}
                onPress={() => {
                  Haptics.selectionAsync();
                  if (!detectSource) {
                    const prevSource = sourceLang;
                    setSourceLang(targetLang);
                    setTargetLang(prevSource);
                  } else {
                    // when Auto, just swap target language with detected or keep target
                    setSourceLang(targetLang);
                    setTargetLang(detectedLang || targetLang);
                    setDetectSource(false);
                  }
                  // also swap text
                  const prevSrcText = sourceText;
                  setSourceText(targetText);
                  setTargetText(prevSrcText);
                }}
              >
                <Ionicons name="swap-horizontal" size={18} color={isDark ? '#FFFFFF' : '#1C1C1E'} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.langPill, { backgroundColor: subtleBackground }]}
                activeOpacity={0.85}
                onPress={() => setShowTargetPicker(true)}
              >
                <View style={[styles.iconBubble, { backgroundColor: accentSurface }]}>                    
                  <Ionicons name="language" size={12} color={isDark ? '#FFFFFF' : '#1C1C1E'} />
                </View>
                <ThemedText style={[styles.langText, { color: textColor }]} numberOfLines={1}>
                  {targetLang}
                </ThemedText>
              </TouchableOpacity>
            </View>

            <View style={styles.detectRow}>
              {detectSource && detectedLang ? (
                <View style={[styles.detectBadge, { backgroundColor: subtleBackground }]}>                    
                  <View style={[styles.iconBubbleSmall, { backgroundColor: accentSurface }]}>                    
                    <Ionicons name="information-circle" size={12} color={isDark ? '#FFFFFF' : '#1C1C1E'} />
                  </View>
                  <ThemedText style={[styles.detectText, { color: textColor }]} numberOfLines={1}>
                    Detected: {detectedLang}
                  </ThemedText>
                </View>
              ) : null}
            </View>
            </View>

            <View style={styles.section}>
              <Pressable
                style={[styles.inputContainer, { backgroundColor: subtleBackground }]}
                onPress={() => sourceInputRef.current?.focus()}
              >              
                <TextInput
                  ref={sourceInputRef}
                  value={sourceText}
                  onChangeText={setSourceText}
                  style={[styles.input, { color: textColor }]}
                  multiline
                  textAlignVertical="top"
                  placeholder=""
                />
              </Pressable>
            </View>

            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.translateButton, { backgroundColor: isDark ? '#FFFFFF' : '#000000' }]}
                activeOpacity={0.9}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  // For now, mirror source text as placeholder translation
                  setTargetText(sourceText);
                }}
              >
                <View style={[styles.translateIconBubble, { backgroundColor: accentSurface }]}>                    
                  <Ionicons name="swap-vertical" size={18} color={isDark ? '#FFFFFF' : '#1C1C1E'} />
                </View>
                <ThemedText style={[styles.translateButtonText, { color: isDark ? '#000000' : '#FFFFFF' }]}>Translate</ThemedText>
              </TouchableOpacity>
            </View>

            <View style={styles.section}>
              <Pressable
                style={[styles.inputContainer, { backgroundColor: subtleBackground }]}
                onPress={() => targetInputRef.current?.focus()}
              >              
                <TextInput
                  ref={targetInputRef}
                  value={targetText}
                  onChangeText={setTargetText}
                  style={[styles.input, { color: textColor }]}
                  multiline
                  textAlignVertical="top"
                  editable
                  placeholder=""
                />
              </Pressable>
            </View>
          </View>

          {/* Source Language Picker Modal */}
          <Modal
            visible={showSourcePicker}
            transparent={true}
            animationType="fade"
            statusBarTranslucent={true}
            onRequestClose={() => setShowSourcePicker(false)}
          >
            <TouchableOpacity style={styles.fullScreenBackdrop} onPress={() => setShowSourcePicker(false)} activeOpacity={1}>
              <View style={styles.guestDropdownContainer}>
                <View style={styles.cardWrapper}>
                  <TouchableOpacity
                    activeOpacity={1}
                    onPress={e => e.stopPropagation()}
                    style={[styles.guestDropdownCard, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF', position: 'relative' }]}
                  >
                    <View style={styles.guestDropdownHeader}>
                      <ThemedText style={styles.guestDropdownTitle}>Source Language</ThemedText>
                      <TouchableOpacity style={styles.guestDropdownCloseButton} onPress={() => setShowSourcePicker(false)}>
                        <View style={[styles.closeButtonCircle, { backgroundColor: isDark ? 'rgba(255, 59, 48, 0.15)' : 'rgba(255, 59, 48, 0.15)' }]}>
                          <Ionicons name="close-sharp" size={28} color="#FF3B30" style={{ textAlign: 'center', fontWeight: '900' }} />
                        </View>
                      </TouchableOpacity>
                    </View>

                    <ScrollView style={{ maxHeight: 400 }}>
                      <View style={styles.guestSection}>
                        {languages.map(lang => (
                          <TouchableOpacity
                            key={`src-${lang}`}
                            style={[
                              styles.guestRow,
                              {
                                backgroundColor:
                                  sourceLang === lang
                                    ? isDark
                                      ? 'rgba(52, 199, 89, 0.15)'
                                      : 'rgba(52, 199, 89, 0.1)'
                                    : isDark
                                      ? 'rgba(255,255,255,0.05)'
                                      : 'rgba(0,0,0,0.03)',
                                marginTop: 8,
                              },
                            ]}
                            activeOpacity={0.8}
                            onPress={e => {
                              e.stopPropagation();
                              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                              setSourceLang(lang);
                              setDetectSource(lang === 'Auto');
                              setShowSourcePicker(false);
                            }}
                          >
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                              <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: accentSurface, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 0 }}>
                                <Ionicons name="language" size={14} color={isDark ? '#FFFFFF' : '#1C1C1E'} />
                              </View>
                              <ThemedText style={[styles.guestSubLabel, sourceLang === lang && { fontFamily: Fonts.bold }]}>
                                {lang}
                              </ThemedText>
                            </View>
                            <View style={{ width: 28, height: 28, justifyContent: 'center', alignItems: 'center' }}>
                              {sourceLang === lang && <Ionicons name="checkmark-circle" size={28} color="#34C759" />}
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

          {/* Target Language Picker Modal */}
          <Modal
            visible={showTargetPicker}
            transparent={true}
            animationType="fade"
            statusBarTranslucent={true}
            onRequestClose={() => setShowTargetPicker(false)}
          >
            <TouchableOpacity style={styles.fullScreenBackdrop} onPress={() => setShowTargetPicker(false)} activeOpacity={1}>
              <View style={styles.guestDropdownContainer}>
                <View style={styles.cardWrapper}>
                  <TouchableOpacity
                    activeOpacity={1}
                    onPress={e => e.stopPropagation()}
                    style={[styles.guestDropdownCard, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF', position: 'relative' }]}
                  >
                    <View style={styles.guestDropdownHeader}>
                      <ThemedText style={styles.guestDropdownTitle}>Target Language</ThemedText>
                      <TouchableOpacity style={styles.guestDropdownCloseButton} onPress={() => setShowTargetPicker(false)}>
                        <View style={[styles.closeButtonCircle, { backgroundColor: isDark ? 'rgba(255, 59, 48, 0.15)' : 'rgba(255, 59, 48, 0.15)' }]}>
                          <Ionicons name="close-sharp" size={28} color="#FF3B30" style={{ textAlign: 'center', fontWeight: '900' }} />
                        </View>
                      </TouchableOpacity>
                    </View>

                    <ScrollView style={{ maxHeight: 400 }}>
                      <View style={styles.guestSection}>
                        {languages.filter(l => l !== 'Auto').map(lang => (
                          <TouchableOpacity
                            key={`tgt-${lang}`}
                            style={[
                              styles.guestRow,
                              {
                                backgroundColor:
                                  targetLang === lang
                                    ? isDark
                                      ? 'rgba(52, 199, 89, 0.15)'
                                      : 'rgba(52, 199, 89, 0.1)'
                                    : isDark
                                      ? 'rgba(255,255,255,0.05)'
                                      : 'rgba(0,0,0,0.03)',
                                marginTop: 8,
                              },
                            ]}
                            activeOpacity={0.8}
                            onPress={e => {
                              e.stopPropagation();
                              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                              setTargetLang(lang);
                              setShowTargetPicker(false);
                            }}
                          >
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                              <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: accentSurface, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 0 }}>
                                <Ionicons name="language" size={14} color={isDark ? '#FFFFFF' : '#1C1C1E'} />
                              </View>
                              <ThemedText style={[styles.guestSubLabel, targetLang === lang && { fontFamily: Fonts.bold }]}>
                                {lang}
                              </ThemedText>
                            </View>
                            <View style={{ width: 28, height: 28, justifyContent: 'center', alignItems: 'center' }}>
                              {targetLang === lang && <Ionicons name="checkmark-circle" size={28} color="#34C759" />}
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
        </ScrollView>
      </ThemedView>
    </IOSScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  titleSection: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderBottomWidth: 0,
  },
  pageTitle: { fontSize: responsiveFontSize(24), textAlign: 'left' },
  content: { flex: 1 },
  contentContainer: {
    flexGrow: 1,
    paddingHorizontal: 12,
    paddingBottom: 100,
  },
  card: {
    marginHorizontal: 8,
    marginTop: 8,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 0,
  },
  section: { marginTop: 12 },
  langRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  langPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    flex: 1,
    minHeight: 40,
  },
  langText: {
    fontSize: responsiveFontSize(15),
    fontFamily: Fonts.bold,
    flexShrink: 1,
    letterSpacing: 0.2,
  },
  detectedLabel: {
    marginLeft: 8,
    opacity: 0.7,
    fontSize: responsiveFontSize(13),
  },
  inputContainer: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 120,
  },
  input: {
    fontSize: responsiveFontSize(16),
    lineHeight: 22,
    padding: 0,
  },
  swapButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detectRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detectPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  detectBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  iconBubble: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 0,
  },
  translateIconBubble: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 0,
  },
  iconBubbleSmall: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 0,
  },
  detectText: {
    fontSize: responsiveFontSize(14),
    fontFamily: Fonts.bold,
  },
  actionRow: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  translateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  translateButtonText: {
    fontSize: responsiveFontSize(15),
    fontFamily: Fonts.bold,
    letterSpacing: 0.2,
  },
  fullScreenBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  guestDropdownContainer: {
    width: '100%',
    paddingHorizontal: 12,
  },
  cardWrapper: {
    width: '100%',
  },
  guestDropdownCard: {
    marginHorizontal: 16,
    borderRadius: 18,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  guestDropdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  guestDropdownTitle: {
    fontSize: responsiveFontSize(18),
    fontFamily: Fonts.bold,
  },
  guestDropdownCloseButton: {
    padding: 6,
    marginRight: -6,
  },
  closeButtonCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  guestSection: {
    paddingBottom: 8,
  },
  guestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
  },
  guestSubLabel: {
    fontSize: responsiveFontSize(16),
    fontFamily: Fonts.medium,
  },
});
