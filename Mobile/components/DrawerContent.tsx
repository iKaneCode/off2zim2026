import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Text,
  Image,
  Platform,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import {
  DrawerContentScrollView,
  DrawerItem,
  DrawerContentComponentProps,
} from '@react-navigation/drawer';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { responsiveFontSize, Fonts } from '@/constants/Fonts';
import { Logo } from './Logo';

// Custom DrawerLabel component to ensure bold text
const DrawerLabel = ({
  label,
  color,
  bold = false,
}: {
  label: string;
  color?: string;
  bold?: boolean;
}) => (
  <Text
    style={{
      fontFamily: bold ? Fonts.bold : Fonts.regular,
      fontSize: bold ? 18 : 16, // Make bold text larger
      color: color || '#000000',
    }}
  >
    {label}
  </Text>
);

// Use a lightweight, optimized image for the profile
// Using a tiny placeholder image that will load instantly
const PROFILE_IMAGE = 'https://via.placeholder.com/65x65/FFA500/FFFFFF?text=Safari';

// Profile image component with loading state
const ProfileImage = ({ imageUrl }: { imageUrl: string }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  return (
    <View style={{ width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' }}>
      {isLoading && (
        <ActivityIndicator size="small" color="#666666" style={{ position: 'absolute' }} />
      )}
      <Image
        source={{ uri: imageUrl }}
        style={styles.profileImage}
        onLoadStart={() => setIsLoading(true)}
        onLoadEnd={() => setIsLoading(false)}
        onError={() => {
          setIsLoading(false);
          setHasError(true);
        }}
      />
      {hasError && (
        <View
          style={[
            styles.profileImage,
            {
              position: 'absolute',
              backgroundColor: '#FFA500',
              justifyContent: 'center',
              alignItems: 'center',
            },
          ]}
        >
          <Text style={{ color: '#FFFFFF', fontSize: responsiveFontSize(16) }}>Safari</Text>
        </View>
      )}
    </View>
  );
};

// Standardized rating component for the entire app
// Format: * 4.9 (123) - shows a gold star icon with rating and number of ratings
const RatingCard = ({ rating, ratingCount }: { rating: number; ratingCount: number }) => {
  // Get the current color scheme to adapt text color
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Format the rating count appropriately
  const formattedCount =
    ratingCount > 999 ? `${(ratingCount / 1000).toFixed(1)}k` : ratingCount.toString();

  return (
    <View style={styles.ratingContainer}>
      <Ionicons name="star" size={16} color="#FFB800" style={{ marginRight: 4 }} />
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Text style={[styles.ratingBold, { color: isDark ? '#FFFFFF' : '#000000' }]}>
          {rating.toFixed(1)}
        </Text>
        <Text
          style={[styles.ratingCount, { color: isDark ? 'rgba(255, 255, 255, 0.6)' : '#666666' }]}
        >
          {' '}
          ({formattedCount})
        </Text>
      </View>
    </View>
  );
};

// Custom circular icon like the header icons
export const CircleIcon = ({
  name,
  color,
  size = 20,
}: {
  name: any;
  color?: string;
  size?: number;
}) => {
  // Get the current color scheme to match other components
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = Colors[colorScheme ?? 'light'];
  // Shadow styles that match the user card and logout button - more subtle
  const darkModeShadow =
    Platform.OS === 'ios'
      ? {
          shadowColor: '#FFF',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.12,
          shadowRadius: 2,
        }
      : { elevation: 0 };

  const lightModeShadow =
    Platform.OS === 'ios'
      ? {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.15,
          shadowRadius: 2,
        }
      : { elevation: 0 };
  return (
    <View
      style={[
        styles.iconCircle,
        {
          backgroundColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.8)',
          overflow: 'visible', // Ensure shadow is visible
        },
        isDark ? darkModeShadow : lightModeShadow,
      ]}
    >
      <Ionicons name={name} size={size} color={color ?? colors.icon} />
    </View>
  );
};

// Plain icon without background for Log Out button
const PlainIcon = ({ name, color }: { name: any; color: string }) => {
  return <Ionicons name={name} size={24} color={color} />;
};

// Custom centered Log Out button component
const CenteredLogOutButton = ({ onPress, isDark }: { onPress: () => void; isDark: boolean }) => {
  return (
    <View
      style={[
        styles.logoutCard,
        {
          backgroundColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.8)',
          overflow: 'visible', // Ensure shadow is visible
          ...Platform.select({
            ios: {
              shadowColor: isDark ? '#FFF' : '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: isDark ? 0.12 : 0.15,
              shadowRadius: 2,
            },
            android: {
              elevation: 0,
            },
          }),
        },
      ]}
    >
      <View style={styles.centeredLogoutContent}>
        <PlainIcon name="log-out-outline" color="#FF3B30" />
        <Text
          style={{
            fontFamily: Fonts.bold,
            fontSize: responsiveFontSize(18),
            color: '#FF3B30',
            marginLeft: 8,
          }}
        >
          Log Out
        </Text>
      </View>
    </View>
  );
};

export function CustomDrawerContent(props: DrawerContentComponentProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';

  const userData = {
    name: 'Ranga Kanengoni',
    rating: 4.9,
    ratingCount: 123,
    profileImage: PROFILE_IMAGE,
  };

  return (
    <DrawerContentScrollView
      {...props}
      style={[styles.container, { backgroundColor: isDark ? '#262626' : '#EEEEEE' }]}
      contentContainerStyle={styles.scrollContent}
    >
      <View
        style={[
          styles.profileSection,
          { borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.1)' },
        ]}
      >
        <View style={styles.logoContainer}>
          <Logo size="medium" />
        </View>
        <View
          style={[
            styles.userInfoCard,
            { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.8)' },
          ]}
        >
          <View style={styles.userInfoRow}>
            <View style={styles.profileImageContainer}>
              <ProfileImage imageUrl={userData.profileImage} />
            </View>
            <View style={styles.userDetailsContainer}>
              <Text style={[styles.userName, { color: colors.text, fontFamily: Fonts.bold }]}>
                {' '}
                {userData.name}
              </Text>
              <RatingCard rating={userData.rating} ratingCount={userData.ratingCount} />
            </View>
          </View>
        </View>
      </View>

      <View style={styles.menuSection}>
        {['Home', 'Profile', 'Itinerary', 'Bookmarks', 'Wishlist', 'Wallet', 'Help & Support'].map(
          (label, index) => (
            <DrawerItem
              key={index}
              label={({ focused, color }) => (
                <DrawerLabel label={label} color={colors.text} bold={true} />
              )}
              icon={({ color }) => (
                <CircleIcon
                  name={label.toLowerCase().replace(/ /g, '-') + '-outline'}
                  color={color}
                />
              )}
              onPress={() => {
                console.log(`${label} pressed`);
                props.navigation.closeDrawer();
              }}
              style={styles.menuItem}
              activeTintColor={colors.icon}
            />
          )
        )}

        <View
          style={[
            styles.separator,
            { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.1)' },
          ]}
        />

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => {
            console.log('Log out pressed');
            props.navigation.closeDrawer();
          }}
        >
          <CenteredLogOutButton
            onPress={() => {
              console.log('Log out pressed');
              props.navigation.closeDrawer();
            }}
            isDark={isDark}
          />
        </TouchableOpacity>
      </View>
    </DrawerContentScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 0,
  },
  profileSection: {
    paddingTop: 30, // Less top padding to account for logo
    paddingBottom: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    marginBottom: 10,
  },
  logoContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
    paddingTop: 20, // Add padding to push logo down
  },
  userInfoCard: {
    width: '90%',
    borderRadius: 15,
    // Shadow styles are applied dynamically based on dark mode in the component
  },
  userInfoRow: {
    flexDirection: 'row',
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 12,
  },
  profileImageContainer: {
    width: 65, // Slightly smaller to fit better in card
    height: 65, // Slightly smaller to fit better in card
    borderRadius: 32.5,
    overflow: 'hidden',
    marginRight: 15, // Space between image and text
  },
  profileImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  userDetailsContainer: {
    flex: 1, // Take remaining space
    justifyContent: 'center',
  },
  userName: {
    fontSize: responsiveFontSize(18),
    marginBottom: 6,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 0, // Removed bottom margin since it's now in the right column
  },
  ratingBold: {
    fontSize: responsiveFontSize(14),
    fontFamily: Fonts.bold,
    // Color is applied dynamically based on theme
  },
  ratingCount: {
    fontSize: responsiveFontSize(14),
    fontFamily: Fonts.regular,
    // Color is applied dynamically based on theme
  },
  menuSection: {
    flex: 1,
    paddingTop: 8,
  },
  menuItem: {
    paddingVertical: 4,
  },
  menuItemLabel: {
    fontSize: responsiveFontSize(16),
    fontFamily: Fonts.regular,
  },
  separator: {
    height: 1,
    marginVertical: 15,
    marginHorizontal: 20,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    // Background color and shadows are set dynamically in the component
  },
  logoutCard: {
    width: '67.5%', // Reduced to 3/4 of original 90% width
    borderRadius: 15,
    marginTop: 10,
    marginBottom: 10,
    alignSelf: 'center',
    // Shadow styles are applied dynamically based on dark mode in the component
  },
  logoutButton: {
    marginVertical: 0,
    padding: 0,
    height: 50, // Ensure consistent height
    justifyContent: 'center', // Center the content vertically
  },
  centeredLogoutContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    width: '100%',
    paddingHorizontal: 16,
  },
});
