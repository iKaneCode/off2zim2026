import React from 'react';
import { View, StyleSheet, ScrollView, Image, Linking } from 'react-native';
import { router } from 'expo-router';
import { CustomHeader } from '@/components/CustomHeader';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { IOSScreenWrapper } from '@/components/IOSScreenWrapper';
import { WallpaperPattern } from '@/components/WallpaperPattern';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useAppAlert } from '@/context/AppAlertContext';
import { Colors } from '@/constants/Colors';
import { responsiveFontSize, Fonts } from '@/constants/Fonts';
import { getCardSurfaceColors } from '@/constants/CardStyles';
import { ActionPillButton } from '@/components/ActionPillButton';
import { buildProviderMessage, openProviderMessagesTab } from '@/utils/messageNavigation';

const EMERGENCY_PROVIDER = {
  id: 'emergency-zrp',
  name: 'Zimbabwe Republic Police',
  phone: '999',
  image: require('@/assets/images/zrp.jpg'),
};

export default function EmergencyScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { showAlert } = useAppAlert();

  const handleGoBack = () => {
    router.back();
  };

  const cardColors = getCardSurfaceColors(colorScheme as 'light' | 'dark' | undefined);

  const handleCall = () => {
    Linking.openURL(`tel:${EMERGENCY_PROVIDER.phone}`).catch(() => {
      showAlert({
        title: 'Call failed',
        message: `Unable to call ${EMERGENCY_PROVIDER.name}.`,
        buttons: [{ text: 'OK' }],
      });
    });
  };

  const handleMessage = () => {
    openProviderMessagesTab(
      buildProviderMessage({
        id: EMERGENCY_PROVIDER.id,
        name: EMERGENCY_PROVIDER.name,
        sourceType: 'emergency',
        providerId: EMERGENCY_PROVIDER.id,
        prefilledMessage: 'Hi, I need emergency assistance.',
      })
    );
  };

  return (
    <IOSScreenWrapper>
      <ThemedView
        style={[styles.container]}
        lightColor={Colors.light.appBackground}
        darkColor={Colors.dark.appBackground}
      >
        <WallpaperPattern />
        <CustomHeader
          showLogo
          leftAction={{ icon: 'chevron-back', onPress: handleGoBack, color: '#FF3B30' }}
        />

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
                  source={EMERGENCY_PROVIDER.image}
                  style={{ width: '100%', height: '100%', borderRadius: 26 }}
                  resizeMode="cover"
                />
              </View>

              <View style={{ flex: 1 }}>
                <ThemedText style={styles.title}>{EMERGENCY_PROVIDER.name}</ThemedText>

                <View style={styles.pillsRow}>
                  <ActionPillButton
                    label="Call"
                    iconName="call"
                    onPress={handleCall}
                    isDark={isDark}
                    tone="call"
                  />

                  <ActionPillButton
                    label="Message"
                    iconName="chatbubble-ellipses"
                    onPress={handleMessage}
                    isDark={isDark}
                    tone="message"
                  />
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
  title: {
    fontSize: responsiveFontSize(20),
    lineHeight: 28,
    fontFamily: Fonts.bold,
    marginBottom: 10,
  },
  pillsRow: { flexDirection: 'row', gap: 12 },
});
