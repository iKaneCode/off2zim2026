import React, { useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Colors } from '@/constants/Colors';
import { responsiveFontSize, Fonts } from '@/constants/Fonts';

type ThemeMode = 'light' | 'dark' | null | undefined;

type BaseFieldProps = {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (value: string) => void;
  colorScheme: ThemeMode;
  placeholderColor?: string;
  errorMessage?: string;
  hasError?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
};

export type AuthTextFieldProps = BaseFieldProps &
  Pick<
    React.ComponentProps<typeof TextInput>,
    | 'autoCapitalize'
    | 'autoComplete'
    | 'autoCorrect'
    | 'autoFocus'
    | 'blurOnSubmit'
    | 'enablesReturnKeyAutomatically'
    | 'importantForAutofill'
    | 'keyboardType'
    | 'maxLength'
    | 'onSubmitEditing'
    | 'returnKeyType'
    | 'textContentType'
  >;

export function AuthTextField({
  label,
  placeholder,
  value,
  onChangeText,
  colorScheme,
  placeholderColor,
  errorMessage,
  hasError,
  containerStyle,
  ...rest
}: AuthTextFieldProps) {
  const isDark = colorScheme === 'dark';
  const textColor = isDark ? Colors.dark.text : Colors.light.text;
  const backgroundColor = isDark ? '#3A3A3C' : '#E5E5EA';
  const borderColor = isDark ? '#4A4A4A' : '#D4D4DA';
  const resolvedPlaceholder = placeholderColor ?? (isDark ? '#8E8E93' : '#999');

  return (
    <View style={[styles.fieldContainer, containerStyle]}>
      <View style={styles.labelErrorContainer}>
        <Text style={[styles.inputLabel, { color: textColor }]}>{label}</Text>
        {errorMessage ? <Text style={styles.inputRequired}>{errorMessage}</Text> : null}
      </View>
      <View
        style={[
          styles.inputWrapper,
          { backgroundColor, borderColor },
          hasError && styles.errorBorder,
        ]}
      >
        <TextInput
          style={[styles.textInput, { color: textColor }]}
          placeholder={placeholder}
          placeholderTextColor={resolvedPlaceholder}
          value={value}
          onChangeText={onChangeText}
          {...rest}
        />
      </View>
    </View>
  );
}

export type AuthPasswordFieldProps = BaseFieldProps &
  Pick<
    React.ComponentProps<typeof TextInput>,
    'autoComplete' | 'onSubmitEditing' | 'returnKeyType' | 'textContentType'
  >;

export function AuthPasswordField({
  label,
  placeholder,
  value,
  onChangeText,
  colorScheme,
  placeholderColor,
  errorMessage,
  hasError,
  containerStyle,
  autoComplete,
  onSubmitEditing,
  returnKeyType,
  textContentType,
}: AuthPasswordFieldProps) {
  const [showPassword, setShowPassword] = useState(false);
  const isDark = colorScheme === 'dark';
  const textColor = isDark ? Colors.dark.text : Colors.light.text;
  const backgroundColor = isDark ? '#3A3A3C' : '#E5E5EA';
  const borderColor = isDark ? '#4A4A4A' : '#D4D4DA';
  const resolvedPlaceholder = placeholderColor ?? (isDark ? '#8E8E93' : '#999');

  return (
    <View style={[styles.fieldContainer, containerStyle]}>
      <View style={styles.labelErrorContainer}>
        <Text style={[styles.inputLabel, { color: textColor }]}>{label}</Text>
        {errorMessage ? <Text style={styles.inputRequired}>{errorMessage}</Text> : null}
      </View>
      <View
        style={[
          styles.inputWrapper,
          { backgroundColor, borderColor },
          hasError && styles.errorBorder,
        ]}
      >
        <TextInput
          style={[styles.textInput, { color: textColor }]}
          placeholder={placeholder}
          placeholderTextColor={resolvedPlaceholder}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={!showPassword}
          textContentType={textContentType ?? 'password'}
          autoComplete={autoComplete}
          returnKeyType={returnKeyType ?? 'go'}
          onSubmitEditing={onSubmitEditing}
        />
        <TouchableOpacity
          style={styles.passwordEye}
          onPress={() => setShowPassword(prev => !prev)}
          activeOpacity={0.7}
        >
          <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={22} color={textColor} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

export type AuthActionButtonProps = {
  label: string;
  onPress: () => void;
  colorScheme: ThemeMode;
  variant?: 'primary' | 'secondary' | 'danger';
  iconName?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
  disabled?: boolean;
  uppercase?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
};

export function AuthActionButton({
  label,
  onPress,
  colorScheme,
  variant = 'primary',
  iconName,
  loading = false,
  disabled = false,
  uppercase = false,
  style,
  textStyle,
}: AuthActionButtonProps) {
  const isDark = colorScheme === 'dark';
  const isPrimary = variant === 'primary';
  const isDanger = variant === 'danger';
  const backgroundColor = isDanger
    ? '#FF3B30'
    : isPrimary
      ? isDark
        ? '#FFFFFF'
        : '#000000'
      : isDark
        ? '#000000'
        : '#FFFFFF';
  const borderColor = isDanger
    ? '#FF3B30'
    : isPrimary
      ? backgroundColor
      : isDark
        ? '#FFFFFF'
        : '#000000';
  const textColor = isDanger
    ? '#FFFFFF'
    : isPrimary
      ? isDark
        ? '#000000'
        : '#FFFFFF'
      : isDark
        ? '#FFFFFF'
        : '#000000';

  return (
    <TouchableOpacity
      style={[
        styles.actionButton,
        {
          backgroundColor,
          borderColor,
          borderWidth: isPrimary || isDanger ? 0 : 2,
          opacity: disabled || loading ? 0.7 : 1,
        },
        style,
      ]}
      onPress={onPress}
      activeOpacity={0.75}
      disabled={disabled || loading}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <>
          {iconName ? <Ionicons name={iconName} size={18} color={textColor} /> : null}
          <Text style={[styles.actionButtonText, { color: textColor }, textStyle]}>
            {uppercase ? label.toUpperCase() : label}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  fieldContainer: {
    gap: 8,
  },
  labelErrorContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  inputLabel: {
    fontFamily: Fonts.medium,
    fontSize: responsiveFontSize(15),
  },
  inputRequired: {
    fontSize: responsiveFontSize(13),
    fontFamily: Fonts.bold,
    color: '#FF3B30',
  },
  inputWrapper: {
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  textInput: {
    flex: 1,
    fontFamily: Fonts.regular,
    fontSize: responsiveFontSize(16),
    paddingVertical: 14,
    paddingHorizontal: 4,
  },
  passwordEye: {
    paddingHorizontal: 6,
    paddingVertical: 8,
  },
  errorBorder: {
    borderColor: '#FF3B30',
  },
  actionButton: {
    minHeight: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
  },
  actionButtonText: {
    fontSize: responsiveFontSize(17),
    fontFamily: Fonts.bold,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
});
