import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useColorScheme } from '@/hooks/useColorScheme';
import { responsiveFontSize, Fonts } from '@/constants/Fonts';

export interface EmptyStateAction {
  label: string;
  onPress: () => void;
  icon?: string;
  variant?: 'primary' | 'secondary';
}

interface EmptyStateProps {
  icon: string;
  title: string;
  description: string;
  style?: any;
  iconSize?: number;
  actions?: EmptyStateAction[];
}

export function EmptyState({
  icon,
  title,
  description,
  style,
  iconSize = 60,
  actions = [],
}: EmptyStateProps) {
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';

  return (
    <View style={[styles.emptyContainer, style]}>
      <Ionicons name={icon as any} size={iconSize} color={isDarkMode ? '#555' : '#ccc'} />
      <ThemedText style={styles.emptyText}>{title}</ThemedText>
      <ThemedText style={styles.emptySubText}>{description}</ThemedText>

      {actions.length > 0 && (
        <View style={styles.actionsContainer}>
          {actions.map((action, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.actionButton,
                action.variant === 'primary' && styles.primaryButton,
                action.variant === 'secondary' && styles.secondaryButton,
                !action.variant && styles.defaultButton,
              ]}
              onPress={action.onPress}
              activeOpacity={0.7}
            >
              {action.icon && (
                <Ionicons
                  name={action.icon as any}
                  size={16}
                  color={
                    action.variant === 'primary' ? '#FFFFFF' : isDarkMode ? '#FFFFFF' : '#007AFF'
                  }
                  style={styles.actionIcon}
                />
              )}
              <ThemedText
                style={[
                  styles.actionText,
                  action.variant === 'primary' && styles.primaryButtonText,
                  action.variant === 'secondary' && styles.secondaryButtonText,
                  !action.variant && styles.defaultButtonText,
                ]}
              >
                {action.label}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  emptyContainer: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 80,
    position: 'relative',
    height: '70%',
  },
  emptyText: {
    fontSize: responsiveFontSize(18),
    fontFamily: Fonts.bold,
    marginTop: 12,
  },
  emptySubText: {
    fontSize: responsiveFontSize(14),
    textAlign: 'center',
    marginTop: 6,
    color: '#8E8E93',
  },
  actionsContainer: {
    marginTop: 24,
    gap: 12,
    alignItems: 'center',
  },
  actionButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 120,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  defaultButton: {
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
  },
  actionIcon: {
    marginRight: 6,
  },
  actionText: {
    fontSize: responsiveFontSize(16),
    fontFamily: Fonts.medium,
  },
  primaryButtonText: {
    color: '#FFFFFF',
  },
  secondaryButtonText: {
    color: '#007AFF',
  },
  defaultButtonText: {
    color: '#007AFF',
  },
});
