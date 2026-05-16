import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';

import { CustomHeader } from '@/components/CustomHeader';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { responsiveFontSize, Fonts } from '@/constants/Fonts';
import { useColorScheme } from '@/hooks/useColorScheme';
import { providerContentService } from '@/services/serviceProvider';

type ProviderContentItem = {
  id: string;
  name?: string;
  location?: string;
  approval_status?: string;
};

export default function ProviderContentScreen() {
  const colorScheme = useColorScheme();
  const palette = Colors[colorScheme ?? 'light'];
  const [destinations, setDestinations] = useState<ProviderContentItem[]>([]);
  const [stays, setStays] = useState<ProviderContentItem[]>([]);
  const [events, setEvents] = useState<ProviderContentItem[]>([]);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      const [destinationsResult, staysResult, eventsResult] = await Promise.all([
        providerContentService.getMyDestinations(),
        providerContentService.getMyStays(),
        providerContentService.getMyEvents(),
      ]);

      if (!mounted) return;
      setDestinations(destinationsResult.data as ProviderContentItem[]);
      setStays(staysResult.data as ProviderContentItem[]);
      setEvents(eventsResult.data as ProviderContentItem[]);
    };

    load();
    return () => {
      mounted = false;
    };
  }, []);

  const sections = useMemo(
    () => [
      { title: 'Destinations', count: destinations.length, items: destinations },
      { title: 'Stays', count: stays.length, items: stays },
      { title: 'Events', count: events.length, items: events },
    ],
    [destinations, stays, events]
  );

  return (
    <ThemedView style={styles.screen}>
      <CustomHeader
        title="Content"
        leftAction={{ icon: 'chevron-back', onPress: () => router.replace('/provider/dashboard') }}
        rightAction={{ icon: 'add', onPress: () => {} }}
        expandedTitle
      />
      <ScrollView contentContainerStyle={styles.content}>
        {sections.map(section => (
          <View key={section.title} style={styles.section}>
            <View style={styles.sectionHeader}>
              <ThemedText style={styles.sectionTitle}>{section.title}</ThemedText>
              <ThemedText style={[styles.sectionCount, { color: palette.inactive }]}>
                {section.count}
              </ThemedText>
            </View>
            {section.items.length ? (
              section.items.map(item => (
                <TouchableOpacity
                  key={item.id}
                  activeOpacity={0.85}
                  style={[
                    styles.itemRow,
                    {
                      backgroundColor:
                        colorScheme === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                      borderColor:
                        colorScheme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
                    },
                  ]}
                >
                  <View style={styles.itemText}>
                    <ThemedText style={styles.itemTitle}>{item.name || 'Untitled'}</ThemedText>
                    {!!item.location && (
                      <ThemedText style={[styles.itemMeta, { color: palette.inactive }]}>
                        {item.location}
                      </ThemedText>
                    )}
                  </View>
                  <ThemedText style={[styles.itemStatus, { color: palette.tint }]}>
                    {item.approval_status === 'active'
                      ? 'Live'
                      : item.approval_status === 'pending_review'
                        ? 'Review'
                        : 'Draft'}
                  </ThemedText>
                </TouchableOpacity>
              ))
            ) : (
              <View
                style={[
                  styles.emptyState,
                  {
                    backgroundColor:
                      colorScheme === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.025)',
                    borderColor:
                      colorScheme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
                  },
                ]}
              >
                <ThemedText style={[styles.emptyText, { color: palette.inactive }]}>
                  No items yet
                </ThemedText>
              </View>
            )}
          </View>
        ))}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 40, gap: 22 },
  section: { gap: 12 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontFamily: Fonts.bold, fontSize: responsiveFontSize(22) },
  sectionCount: { fontFamily: Fonts.medium, fontSize: responsiveFontSize(14) },
  itemRow: {
    borderWidth: 1,
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itemText: { flex: 1, gap: 4 },
  itemTitle: { fontFamily: Fonts.bold, fontSize: responsiveFontSize(16) },
  itemMeta: { fontFamily: Fonts.regular, fontSize: responsiveFontSize(13) },
  itemStatus: { fontFamily: Fonts.bold, fontSize: responsiveFontSize(13) },
  emptyState: { borderWidth: 1, borderRadius: 22, paddingHorizontal: 18, paddingVertical: 20 },
  emptyText: { fontFamily: Fonts.medium, fontSize: responsiveFontSize(14) },
});

