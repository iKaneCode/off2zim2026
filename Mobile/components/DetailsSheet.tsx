import React from 'react';
import {
  Modal,
  View,
  StyleSheet,
  Pressable,
  ScrollView,
  Platform,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { ThemedText } from '@/components/ThemedText';
import { StatusPill } from '@/components/StatusPill';
import { useColorScheme } from '@/hooks/useColorScheme';
import type { IoniconName } from '@/components/DateTimePill';
import { responsiveFontSize, Fonts } from '@/constants/Fonts';

export type StatusConfig = {
  label: string;
  backgroundColor: string;
  iconBackgroundColor: string;
  iconColor: string;
  iconName: IoniconName;
  textColor: string;
};

export type DetailsItem = {
  label: string;
  value: string;
};

interface DetailsSheetProps {
  title: string;
  statusConfig?: StatusConfig | null;
  details: DetailsItem[];
  messageTitle?: string;
  messageContent?: string;
  onClose: () => void;
  instanceId?: number;
}

export function DetailsSheet({
  title,
  statusConfig,
  details,
  messageTitle,
  messageContent,
  onClose,
  instanceId,
}: DetailsSheetProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const cardBackground = isDark ? '#1C1C1E' : '#FFFFFF';
  const cardBorder = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)';
  const primaryText = isDark ? '#FFFFFF' : '#111827';
  const secondaryText = isDark ? '#A1A1AA' : '#6B7280';

  return (
    <Modal
      key={instanceId}
      visible={true}
      transparent
      animationType="fade"
      presentationStyle="overFullScreen"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: cardBackground, borderColor: cardBorder }]}
        >
          <View style={styles.headerRow}>
            <ThemedText style={[styles.title, { color: primaryText }]}>{title}</ThemedText>
            <Pressable onPress={onClose} hitSlop={12}>
              <Ionicons name="close" size={22} color={secondaryText} />
            </Pressable>
          </View>

          {statusConfig ? (
            <StatusPill
              label={statusConfig.label}
              iconName={statusConfig.iconName}
              backgroundColor={statusConfig.backgroundColor}
              iconBackgroundColor={statusConfig.iconBackgroundColor}
              iconColor={statusConfig.iconColor}
              lightTextColor={statusConfig.textColor}
              darkTextColor={statusConfig.textColor}
              style={styles.statusPill}
            />
          ) : null}

          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
          >
            {details.map(item => (
              <View key={`${item.label}-${item.value}`} style={styles.detailRow}>
                <ThemedText style={[styles.detailLabel, { color: secondaryText }]}
                >
                  {item.label}
                </ThemedText>
                <ThemedText style={[styles.detailValue, { color: primaryText }]}
                >
                  {item.value}
                </ThemedText>
              </View>
            ))}

            {messageContent ? (
              <View style={styles.messageBlock}>
                <ThemedText style={[styles.messageTitle, { color: primaryText }]}
                >
                  {messageTitle ?? 'Message'}
                </ThemedText>
                <ThemedText style={[styles.messageBody, { color: secondaryText }]}
                >
                  {messageContent}
                </ThemedText>
              </View>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
  },
  sheet: {
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 12,
    borderWidth: StyleSheet.hairlineWidth,
    maxHeight: '80%',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: responsiveFontSize(20),
    fontFamily: Fonts.bold,
  },
  statusPill: {
    marginTop: 12,
    marginBottom: 4,
  },
  content: {
    marginTop: 8,
  },
  contentContainer: {
    paddingBottom: 8,
  },
  detailRow: {
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(130,130,130,0.15)',
  },
  detailLabel: {
    fontSize: responsiveFontSize(13),
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    fontFamily: Fonts.bold,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: responsiveFontSize(16),
    fontFamily: Fonts.medium,
  },
  messageBlock: {
    marginTop: 16,
  },
  messageTitle: {
    fontSize: responsiveFontSize(15),
    fontFamily: Fonts.bold,
    marginBottom: 6,
  },
  messageBody: {
    fontSize: responsiveFontSize(15),
    lineHeight: 20,
    fontFamily: Fonts.regular,
  },
});
