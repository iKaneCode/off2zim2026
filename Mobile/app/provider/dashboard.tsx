import React, { useState, useEffect } from 'react';
import { responsiveFontSize } from '@/constants/Fonts';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  Image,
} from 'react-native';
import { router } from 'expo-router';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useAppAlert } from '@/context/AppAlertContext';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import {
  serviceProviderService,
  providerAnalyticsService,
  type ServiceProvider,
} from '@/services/serviceProvider';

interface DashboardStats {
  destinations: { total: number; approved: number; pending: number };
  stays: { total: number; approved: number; pending: number };
  events: { total: number; approved: number; pending: number };
  bookings: { total: number; confirmed: number; totalRevenue: number };
}

export default function ProviderDashboard() {
  const colorScheme = useColorScheme();
  const { showAlert } = useAppAlert();
  const [provider, setProvider] = useState<ServiceProvider | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadDashboardData = async () => {
    try {
      const [providerResult, statsResult] = await Promise.all([
        serviceProviderService.getCurrentProvider(),
        providerAnalyticsService.getDashboardStats(),
      ]);

      if (providerResult.error) {
        console.error('Error loading provider:', providerResult.error);
        // Redirect to provider registration if no provider found
        router.replace('/provider-register');
        return;
      }

      setProvider(providerResult.data);
      setStats(statsResult.data);
    } catch (error) {
      console.error('Error loading dashboard:', error);
      showAlert({ title: 'Error', message: 'Failed to load dashboard data', buttons: [{ text: 'OK' }] });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  const getVerificationStatusColor = (status: string) => {
    switch (status) {
      case 'verified':
        return '#22C55E';
      case 'under_review':
        return '#F59E0B';
      case 'rejected':
        return '#EF4444';
      default:
        return '#6B7280';
    }
  };

  const getVerificationStatusText = (status: string) => {
    switch (status) {
      case 'verified':
        return 'Verified âœ“';
      case 'under_review':
        return 'Under Review';
      case 'rejected':
        return 'Rejected';
      default:
        return 'Pending';
    }
  };

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText>Loading dashboard...</ThemedText>
      </ThemedView>
    );
  }

  if (!provider) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText>Provider not found</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: Colors[colorScheme ?? 'light'].background }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Header */}
      <ThemedView style={styles.header}>
        <View style={styles.providerInfo}>
          {provider.logo_url && <Image source={{ uri: provider.logo_url }} style={styles.logo} />}
          <View style={styles.providerDetails}>
            <ThemedText style={styles.businessName}>{provider.business_name}</ThemedText>
            <ThemedText style={styles.businessType}>
              {provider.business_type.replace('_', ' ').toUpperCase()}
            </ThemedText>
            <View style={styles.verificationBadge}>
              <Text
                style={[
                  styles.verificationText,
                  { color: getVerificationStatusColor(provider.verification_status) },
                ]}
              >
                {getVerificationStatusText(provider.verification_status)}
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity style={styles.editButton} onPress={() => router.push('/provider/account')}>
          <ThemedText style={styles.editButtonText}>Edit Profile</ThemedText>
        </TouchableOpacity>
      </ThemedView>

      {/* Verification Alert */}
      {provider.verification_status !== 'verified' && (
        <ThemedView style={[styles.alertCard, styles.warningCard]}>
          <ThemedText style={styles.alertTitle}>Account Verification Required</ThemedText>
          <ThemedText style={styles.alertText}>
            {provider.verification_status === 'pending' &&
              'Please complete your business verification to start publishing content.'}
            {provider.verification_status === 'under_review' &&
              "Your verification is under review. We'll notify you once it's complete."}
            {provider.verification_status === 'rejected' &&
              'Your verification was rejected. Please update your documents and resubmit.'}
          </ThemedText>
          {provider.verification_status !== 'under_review' && (
            <TouchableOpacity
              style={styles.alertButton}
              onPress={() => router.push('/provider-verification')}
            >
              <Text style={styles.alertButtonText}>
                {provider.verification_status === 'pending' ? 'Start Verification' : 'Resubmit'}
              </Text>
            </TouchableOpacity>
          )}
        </ThemedView>
      )}

      {/* Quick Stats */}
      {stats && (
        <ThemedView style={styles.statsContainer}>
          <ThemedText style={styles.sectionTitle}>Overview</ThemedText>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <ThemedText style={styles.statNumber}>
                {stats.destinations.total + stats.stays.total + stats.events.total}
              </ThemedText>
              <ThemedText style={styles.statLabel}>Total Listings</ThemedText>
              <ThemedText style={styles.statSubtext}>
                {stats.destinations.approved + stats.stays.approved + stats.events.approved}{' '}
                approved
              </ThemedText>
            </View>
            <View style={styles.statCard}>
              <ThemedText style={styles.statNumber}>{stats.bookings.confirmed}</ThemedText>
              <ThemedText style={styles.statLabel}>Bookings</ThemedText>
              <ThemedText style={styles.statSubtext}>This month</ThemedText>
            </View>
            <View style={styles.statCard}>
              <ThemedText style={styles.statNumber}>
                ${stats.bookings.totalRevenue.toFixed(2)}
              </ThemedText>
              <ThemedText style={styles.statLabel}>Revenue</ThemedText>
              <ThemedText style={styles.statSubtext}>Total earned</ThemedText>
            </View>
          </View>
        </ThemedView>
      )}

      {/* Content Management */}
      <ThemedView style={styles.section}>
        <ThemedText style={styles.sectionTitle}>Manage Content</ThemedText>

        <TouchableOpacity
          style={styles.contentCard}
          onPress={() => router.push('/provider/content')}
        >
          <View style={styles.contentHeader}>
            <ThemedText style={styles.contentTitle}>Destinations</ThemedText>
            {stats && (
              <View style={styles.contentStats}>
                <ThemedText style={styles.contentCount}>{stats.destinations.total}</ThemedText>
                {stats.destinations.pending > 0 && (
                  <View style={styles.pendingBadge}>
                    <Text style={styles.pendingText}>{stats.destinations.pending} pending</Text>
                  </View>
                )}
              </View>
            )}
          </View>
          <ThemedText style={styles.contentDescription}>Destination listings</ThemedText>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.contentCard}
          onPress={() => router.push('/provider/content')}
        >
          <View style={styles.contentHeader}>
            <ThemedText style={styles.contentTitle}>Accommodations</ThemedText>
            {stats && (
              <View style={styles.contentStats}>
                <ThemedText style={styles.contentCount}>{stats.stays.total}</ThemedText>
                {stats.stays.pending > 0 && (
                  <View style={styles.pendingBadge}>
                    <Text style={styles.pendingText}>{stats.stays.pending} pending</Text>
                  </View>
                )}
              </View>
            )}
          </View>
          <ThemedText style={styles.contentDescription}>Accommodation inventory</ThemedText>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.contentCard}
          onPress={() => router.push('/provider/content')}
        >
          <View style={styles.contentHeader}>
            <ThemedText style={styles.contentTitle}>Events & Activities</ThemedText>
            {stats && (
              <View style={styles.contentStats}>
                <ThemedText style={styles.contentCount}>{stats.events.total}</ThemedText>
                {stats.events.pending > 0 && (
                  <View style={styles.pendingBadge}>
                    <Text style={styles.pendingText}>{stats.events.pending} pending</Text>
                  </View>
                )}
              </View>
            )}
          </View>
          <ThemedText style={styles.contentDescription}>Events and experiences</ThemedText>
        </TouchableOpacity>
      </ThemedView>

      {/* Quick Actions */}
      <ThemedView style={styles.section}>
        <ThemedText style={styles.sectionTitle}>Quick Actions</ThemedText>
        <View style={styles.actionGrid}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/provider/content')}
          >
            <ThemedText style={styles.actionButtonText}>+ Add Destination</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/provider/content')}
          >
            <ThemedText style={styles.actionButtonText}>+ Add Stay</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/provider/orders')}
          >
            <ThemedText style={styles.actionButtonText}>View Bookings</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/provider/account')}
          >
            <ThemedText style={styles.actionButtonText}>Account</ThemedText>
          </TouchableOpacity>
        </View>
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  providerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  logo: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 15,
  },
  providerDetails: {
    flex: 1,
  },
  businessName: {
    fontSize: responsiveFontSize(20),
    fontWeight: 'bold',
    marginBottom: 4,
  },
  businessType: {
    fontSize: responsiveFontSize(14),
    opacity: 0.7,
    marginBottom: 8,
  },
  verificationBadge: {
    alignSelf: 'flex-start',
  },
  verificationText: {
    fontSize: responsiveFontSize(12),
    fontWeight: '600',
  },
  editButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  editButtonText: {
    color: '#FFFFFF',
    fontSize: responsiveFontSize(14),
    fontWeight: '600',
  },
  alertCard: {
    margin: 20,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  warningCard: {
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B',
  },
  alertTitle: {
    fontSize: responsiveFontSize(16),
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#92400E',
  },
  alertText: {
    fontSize: responsiveFontSize(14),
    marginBottom: 12,
    color: '#92400E',
  },
  alertButton: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  alertButtonText: {
    color: '#FFFFFF',
    fontSize: responsiveFontSize(14),
    fontWeight: '600',
  },
  statsContainer: {
    margin: 20,
    padding: 16,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: responsiveFontSize(18),
    fontWeight: 'bold',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  statNumber: {
    fontSize: responsiveFontSize(24),
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: responsiveFontSize(12),
    opacity: 0.7,
    marginBottom: 2,
  },
  statSubtext: {
    fontSize: responsiveFontSize(10),
    opacity: 0.5,
  },
  section: {
    margin: 20,
    marginTop: 0,
  },
  contentCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    marginBottom: 12,
  },
  contentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  contentTitle: {
    fontSize: responsiveFontSize(16),
    fontWeight: '600',
  },
  contentStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contentCount: {
    fontSize: responsiveFontSize(14),
    fontWeight: '600',
    marginRight: 8,
  },
  pendingBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  pendingText: {
    fontSize: responsiveFontSize(10),
    color: '#92400E',
    fontWeight: '600',
  },
  contentDescription: {
    fontSize: responsiveFontSize(14),
    opacity: 0.7,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionButton: {
    width: '48%',
    backgroundColor: '#F3F4F6',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  actionButtonText: {
    fontSize: responsiveFontSize(14),
    fontWeight: '600',
  },
});