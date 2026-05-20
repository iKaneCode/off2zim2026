import React, { useCallback, useMemo, useState } from 'react';
import { responsiveFontSize } from '@/constants/Fonts';
import { View, StyleSheet, ScrollView, Pressable, Switch } from 'react-native';
import { router } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { CustomHeader } from '@/components/CustomHeader';
import { IOSScreenWrapper } from '@/components/IOSScreenWrapper';
import { WallpaperPattern } from '@/components/WallpaperPattern';
import { useColorScheme, useThemePreference, setThemePreference } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function SettingsScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const themePref = useThemePreference();
  const palette = Colors[colorScheme ?? 'light'];

  // Local toggles (persisted, but not yet wired globally)
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [hapticsEnabled, setHapticsEnabled] = useState(true);

  React.useEffect(() => {
    (async () => {
      const n = await AsyncStorage.getItem('notificationsEnabled');
      const h = await AsyncStorage.getItem('hapticsEnabled');
      if (n != null) setNotificationsEnabled(n === 'true');
      if (h != null) setHapticsEnabled(h === 'true');
    })();
  }, []);

  const saveToggle = useCallback(async (key: string, value: boolean) => {
    try {
      await AsyncStorage.setItem(key, value ? 'true' : 'false');
    } catch {}
  }, []);

  const handleGoBack = () => {
    router.back();
  };

  const themeIcon = useMemo(() => {
    switch (themePref) {
      case 'light':
        return 'light-mode' as const;
      case 'dark':
        return 'dark-mode' as const;
      case 'auto':
      default:
        return 'autorenew' as const;
    }
  }, [themePref]);

  const themeLabel = useMemo(() => {
    switch (themePref) {
      case 'light':
        return 'Light';
      case 'dark':
        return 'Dark';
      case 'auto':
      default:
        return 'Auto (System)';
    }
  }, [themePref]);

  const cycleThemePref = useCallback(async () => {
    const next = themePref === 'auto' ? 'light' : themePref === 'light' ? 'dark' : 'auto';
    await setThemePreference(next);
  }, [themePref]);

  return (
    <IOSScreenWrapper>
      <ThemedView
        style={styles.container}
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
            Settings
          </ThemedText>
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          <View style={styles.section}>
            <ThemedText type="sectionTitle" style={styles.sectionTitle}>
              Appearance
            </ThemedText>
            <Pressable onPress={cycleThemePref} android_ripple={{ color: '#00000022' }}>
              <ThemedView
                style={[styles.row, { backgroundColor: palette.cardBackground }]}
                lightColor={Colors.light.cardBackground}
                darkColor={Colors.dark.cardBackground}
              >
                <View style={styles.rowLeft}>
                  <MaterialIcons name={themeIcon} size={22} color={palette.icon} />
                  <ThemedText type="bodyStrong" style={styles.rowLabel}>
                    Theme
                  </ThemedText>
                </View>
                <View style={styles.rowRight}>
                  <ThemedText type="label" style={styles.valueLabel}>
                    {themeLabel}
                  </ThemedText>
                  <MaterialIcons name="chevron-right" size={22} color={palette.icon} />
                </View>
              </ThemedView>
            </Pressable>
          </View>

          <View style={styles.section}>
            <ThemedText type="sectionTitle" style={styles.sectionTitle}>
              Preferences
            </ThemedText>
            <ThemedView
              style={[styles.row, { backgroundColor: palette.cardBackground }]}
              lightColor={Colors.light.cardBackground}
              darkColor={Colors.dark.cardBackground}
            >
              <View style={styles.rowLeft}>
                <MaterialIcons name="notifications-active" size={22} color={palette.icon} />
                <ThemedText type="bodyStrong" style={styles.rowLabel}>
                  Notifications
                </ThemedText>
              </View>
              <Switch
                value={notificationsEnabled}
                onValueChange={v => {
                  setNotificationsEnabled(v);
                  saveToggle('notificationsEnabled', v);
                }}
                trackColor={{ false: '#767577', true: isDark ? '#34C759' : '#0A84FF' }}
                thumbColor={isDark ? '#ffffff' : '#f4f3f4'}
              />
            </ThemedView>

            <ThemedView
              style={[styles.row, { backgroundColor: palette.cardBackground }]}
              lightColor={Colors.light.cardBackground}
              darkColor={Colors.dark.cardBackground}
            >
              <View style={styles.rowLeft}>
                <MaterialIcons name="vibration" size={22} color={palette.icon} />
                <ThemedText type="bodyStrong" style={styles.rowLabel}>
                  Haptics
                </ThemedText>
              </View>
              <Switch
                value={hapticsEnabled}
                onValueChange={v => {
                  setHapticsEnabled(v);
                  saveToggle('hapticsEnabled', v);
                }}
                trackColor={{ false: '#767577', true: isDark ? '#34C759' : '#0A84FF' }}
                thumbColor={isDark ? '#ffffff' : '#f4f3f4'}
              />
            </ThemedView>
          </View>

          <View style={styles.section}>
            <ThemedText type="sectionTitle" style={styles.sectionTitle}>
              About
            </ThemedText>
            <ThemedView
              style={[styles.row, { backgroundColor: palette.cardBackground }]}
              lightColor={Colors.light.cardBackground}
              darkColor={Colors.dark.cardBackground}
            >
              <View style={styles.rowLeft}>
                <MaterialIcons name="info" size={22} color={palette.icon} />
                <ThemedText type="bodyStrong" style={styles.rowLabel}>
                  About Off2Zim
                </ThemedText>
              </View>
              <Pressable
                style={styles.rowRight}
                onPress={() => router.push('/about')}
                android_ripple={{ color: '#00000022' }}
              >
                <MaterialIcons name="chevron-right" size={22} color={palette.icon} />
              </Pressable>
            </ThemedView>
          </View>
        </ScrollView>
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
  content: { flex: 1 },
  contentContainer: { flexGrow: 1, padding: 20 },
  subtitle: { marginBottom: 8, textAlign: 'left' },
  section: { marginBottom: 24 },
  sectionTitle: { marginBottom: 12 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 12,
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowLabel: { textAlign: 'left' },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  valueLabel: { marginRight: 4 },
});
