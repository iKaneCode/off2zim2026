import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';

import { CustomHeader } from '@/components/CustomHeader';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { responsiveFontSize, Fonts } from '@/constants/Fonts';
import { useAuth } from '@/context/AuthContext';
import { useColorScheme } from '@/hooks/useColorScheme';
import { serviceProviderService, type ServiceProvider } from '@/services/serviceProvider';

export default function ProviderAccountScreen() {
  const colorScheme = useColorScheme();
  const palette = Colors[colorScheme ?? 'light'];
  const { signOut } = useAuth();
  const [provider, setProvider] = useState<ServiceProvider | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const result = await serviceProviderService.getCurrentProvider();
      if (mounted) setProvider(result.data);
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <ThemedView style={styles.screen}>
      <CustomHeader
        title="Account"
        leftAction={{ icon: 'chevron-back', onPress: () => router.replace('/provider/dashboard') }}
        expandedTitle
      />
      <ScrollView contentContainerStyle={styles.content}>
        <View
          style={[
            styles.profileCard,
            {
              backgroundColor:
                colorScheme === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
              borderColor:
                colorScheme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
            },
          ]}
        >
          <ThemedText style={styles.businessName}>{provider?.business_name || 'Provider account'}</ThemedText>
          {!!provider?.email && (
            <ThemedText style={[styles.profileMeta, { color: palette.inactive }]}>{provider.email}</ThemedText>
          )}
          {!!provider?.phone && (
            <ThemedText style={[styles.profileMeta, { color: palette.inactive }]}>{provider.phone}</ThemedText>
          )}
        </View>

        <TouchableOpacity
          style={[
            styles.actionRow,
            {
              backgroundColor:
                colorScheme === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
              borderColor:
                colorScheme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
            },
          ]}
          onPress={() => router.push('/provider-verification')}
        >
          <ThemedText style={styles.actionTitle}>Verification</ThemedText>
          <ThemedText style={[styles.actionMeta, { color: palette.inactive }]}>Review documents</ThemedText>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.actionRow,
            {
              backgroundColor:
                colorScheme === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
              borderColor:
                colorScheme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
            },
          ]}
          onPress={async () => {
            await signOut();
            router.replace('/auth');
          }}
        >
          <ThemedText style={[styles.actionTitle, { color: '#FF3B30' }]}>Sign out</ThemedText>
        </TouchableOpacity>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 40, gap: 16 },
  profileCard: { borderWidth: 1, borderRadius: 24, paddingHorizontal: 18, paddingVertical: 22, gap: 6 },
  businessName: { fontFamily: Fonts.bold, fontSize: responsiveFontSize(22) },
  profileMeta: { fontFamily: Fonts.medium, fontSize: responsiveFontSize(14) },
  actionRow: { borderWidth: 1, borderRadius: 24, paddingHorizontal: 18, paddingVertical: 18, gap: 4 },
  actionTitle: { fontFamily: Fonts.bold, fontSize: responsiveFontSize(16) },
  actionMeta: { fontFamily: Fonts.regular, fontSize: responsiveFontSize(13) },
});
