import React, { useMemo } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { CustomHeader } from '@/components/CustomHeader';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { IOSScreenWrapper } from '@/components/IOSScreenWrapper';
import { WallpaperPattern } from '@/components/WallpaperPattern';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useAppAlert } from '@/context/AppAlertContext';
import { Colors } from '@/constants/Colors';
import { responsiveFontSize, Fonts } from '@/constants/Fonts';
import Ionicons from '@expo/vector-icons/Ionicons';
import { getCardSurfaceColors } from '@/constants/CardStyles';

export default function EmergencyScreen() {
  const backgroundColor = useThemeColor({}, 'background');
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { showAlert } = useAppAlert();

  const handleGoBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  const cardColors = getCardSurfaceColors(colorScheme as 'light' | 'dark' | undefined);

  const contactPillBase = useMemo(
    () => ({
      backgroundCall: isDark ? 'rgba(52,199,89,0.15)' : 'rgba(52,199,89,0.1)',
      backgroundMessage: isDark ? 'rgba(0,122,255,0.15)' : 'rgba(0,122,255,0.1)',
      textColor: isDark ? '#FFFFFF' : '#1C1C1E',
      surface: isDark ? '#1C1C1E' : '#FFFFFF',
    }),
    [isDark]
  );

  const handleCall = () => {
    showAlert({ title: 'Call', message: 'Phone number not configured yet.', buttons: [{ text: 'OK' }] });
  };

  const handleMessage = () => {
    showAlert({ title: 'Message', message: 'Messaging number not configured yet.', buttons: [{ text: 'OK' }] });
  };

  return (
    <IOSScreenWrapper>
      <ThemedView style={[styles.container]} lightColor={Colors.light.appBackground} darkColor={Colors.dark.appBackground}>
        <WallpaperPattern />
        <CustomHeader showLogo leftAction={{ icon: 'chevron-back', onPress: handleGoBack, color: '#FF3B30' }} />

        <View style={styles.titleSection}>
          <ThemedText type="title1" style={styles.pageTitle}>
            Emergency Services
          </ThemedText>
        </View>

        <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 100 }}>
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
            <View style={styles.row}>
              <View
                style={[
                  styles.iconCircle,
                  {
                    backgroundColor: isDark ? 'rgba(255, 71, 87, 0.18)' : 'rgba(255, 71, 87, 0.08)',
                  },
                ]}
              >
                <Image
                  source={require('@/assets/images/zrp.jpg')}
                  style={{ width: '100%', height: '100%', borderRadius: 26 }}
                  resizeMode="cover"
                />
              </View>

              <View style={{ flex: 1 }}>
                <ThemedText style={styles.title}>Zimbabwe Republic Police</ThemedText>

                <View style={styles.pillsRow}>
                  <TouchableOpacity
                    onPress={handleCall}
                    activeOpacity={0.85}
                    style={[styles.contactPill, { backgroundColor: contactPillBase.backgroundCall }]}
                  >
                    <View style={[styles.iconBubble, { backgroundColor: contactPillBase.surface }]}>                    
                      <Ionicons name="call" size={12} color="#34C759" />
                    </View>
                    <ThemedText style={[styles.pillText, { color: contactPillBase.textColor }]}>Call</ThemedText>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleMessage}
                    activeOpacity={0.85}
                    style={[styles.contactPill, { backgroundColor: contactPillBase.backgroundMessage }]}
                  >
                    <View style={[styles.iconBubble, { backgroundColor: contactPillBase.surface }]}>                    
                      <Ionicons name="chatbubble-ellipses" size={12} color="#007AFF" />
                    </View>
                    <ThemedText style={[styles.pillText, { color: contactPillBase.textColor }]}>Message</ThemedText>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      </ThemedView>
    </IOSScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  titleSection: { paddingHorizontal: 20, paddingVertical: 8, borderBottomWidth: 0 },
  pageTitle: { fontSize: responsiveFontSize(24), textAlign: 'left' },
  content: { flex: 1 },
  card: {
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 0,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0,
    marginRight: 8,
    overflow: 'hidden',
  },
  title: { fontSize: responsiveFontSize(20), lineHeight: 28, fontFamily: Fonts.bold, marginBottom: 10 },
  pillsRow: { flexDirection: 'row', gap: 12 },
  contactPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    flexShrink: 0,
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
  pillText: { fontSize: responsiveFontSize(15), lineHeight: 20, fontFamily: Fonts.bold, letterSpacing: 0.2 },
});
