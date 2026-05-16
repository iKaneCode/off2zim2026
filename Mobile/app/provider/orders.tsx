import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';

import { CustomHeader } from '@/components/CustomHeader';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { responsiveFontSize, Fonts } from '@/constants/Fonts';
import { useColorScheme } from '@/hooks/useColorScheme';
import { serviceProviderService } from '@/services/serviceProvider';

type ProviderOrder = {
  id: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  listing?: { title: string; location: string } | null;
};

export default function ProviderOrdersScreen() {
  const colorScheme = useColorScheme();
  const palette = Colors[colorScheme ?? 'light'];
  const [orders, setOrders] = useState<ProviderOrder[]>([]);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      const result = await serviceProviderService.getMyOrders();
      if (mounted) setOrders(result.data as ProviderOrder[]);
    };

    load();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <ThemedView style={styles.screen}>
      <CustomHeader
        title="Orders"
        leftAction={{ icon: 'chevron-back', onPress: () => router.replace('/provider/dashboard') }}
        expandedTitle
      />
      <ScrollView contentContainerStyle={styles.content}>
        {orders.length ? (
          orders.map(order => (
            <TouchableOpacity
              key={order.id}
              activeOpacity={0.85}
              style={[
                styles.orderCard,
                {
                  backgroundColor:
                    colorScheme === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                  borderColor:
                    colorScheme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
                },
              ]}
            >
              <View style={styles.orderHeader}>
                <ThemedText style={styles.orderTitle}>{order.listing?.title || 'Booking'}</ThemedText>
                <ThemedText style={[styles.orderStatus, { color: palette.tint }]}>
                  {order.status}
                </ThemedText>
              </View>
              {!!order.listing?.location && (
                <ThemedText style={[styles.orderMeta, { color: palette.inactive }]}>
                  {order.listing.location}
                </ThemedText>
              )}
              <View style={styles.orderFooter}>
                <ThemedText style={[styles.orderMeta, { color: palette.inactive }]}>
                  {new Date(order.createdAt).toLocaleDateString()}
                </ThemedText>
                <ThemedText style={styles.orderAmount}>${Number(order.totalAmount || 0).toFixed(2)}</ThemedText>
              </View>
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
            <ThemedText style={[styles.emptyTitle, { color: palette.text }]}>No orders yet</ThemedText>
            <ThemedText style={[styles.emptyMeta, { color: palette.inactive }]}>
              Confirmed bookings will appear here.
            </ThemedText>
          </View>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 40, gap: 16 },
  orderCard: { borderWidth: 1, borderRadius: 24, paddingHorizontal: 18, paddingVertical: 18, gap: 10 },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  orderTitle: { flex: 1, fontFamily: Fonts.bold, fontSize: responsiveFontSize(17) },
  orderStatus: { fontFamily: Fonts.bold, fontSize: responsiveFontSize(13), textTransform: 'capitalize' },
  orderMeta: { fontFamily: Fonts.medium, fontSize: responsiveFontSize(13) },
  orderFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderAmount: { fontFamily: Fonts.bold, fontSize: responsiveFontSize(16) },
  emptyState: { borderWidth: 1, borderRadius: 24, paddingHorizontal: 18, paddingVertical: 22, gap: 8 },
  emptyTitle: { fontFamily: Fonts.bold, fontSize: responsiveFontSize(18) },
  emptyMeta: { fontFamily: Fonts.regular, fontSize: responsiveFontSize(14) },
});

