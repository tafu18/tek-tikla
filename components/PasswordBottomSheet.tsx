import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import BottomSheet from './BottomSheet';
import { useTheme } from '../contexts/ThemeContext';

interface PasswordBottomSheetProps {
  visible: boolean;
  website: { id: string; url: string; password?: string; isEdit?: boolean } | null;
  passwordInput: string;
  onPasswordChange: (text: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function PasswordBottomSheet({
  visible,
  website,
  passwordInput,
  onPasswordChange,
  onConfirm,
  onCancel,
}: PasswordBottomSheetProps) {
  const { colors } = useTheme();

  const handleSubmit = () => {
    onConfirm();
  };

  return (
    <BottomSheet visible={visible} onClose={onCancel}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={[styles.iconContainer, { backgroundColor: colors.primary + '20' }]}>
            <Ionicons name="lock-closed-outline" size={24} color={colors.primary} />
          </View>
          <View style={styles.headerText}>
            <Text style={[styles.title, { color: colors.text }]}>
              {website?.isEdit ? 'Düzenleme İçin Şifre Gerekli' : 'Şifre Gerekli'}
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]} numberOfLines={2}>
              {website?.isEdit ? 'Bu web sitesini düzenlemek için şifre girin' : 'Bu web sitesi şifre korumalı'}
            </Text>
          </View>
        </View>

        <View style={styles.passwordContainer}>
          <View style={[styles.passwordWrapper, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="lock-closed-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
            <TextInput
              style={[styles.passwordInput, { color: colors.text }]}
              placeholder="Şifre girin"
              placeholderTextColor={colors.textSecondary}
              value={passwordInput}
              onChangeText={onPasswordChange}
              secureTextEntry
              autoFocus
              autoCapitalize="none"
              autoCorrect={false}
              onSubmitEditing={handleSubmit}
              returnKeyType="done"
            />
          </View>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.button, styles.buttonCancel, { borderColor: colors.border, backgroundColor: colors.surface }]}
            onPress={onCancel}
            activeOpacity={0.7}
          >
            <Text style={[styles.buttonText, { color: colors.text }]}>İptal</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.buttonConfirm, { backgroundColor: colors.primary }]}
            onPress={handleSubmit}
            activeOpacity={0.8}
          >
            <View style={styles.buttonContent}>
              <Ionicons name="checkmark-outline" size={18} color="#FFFFFF" />
              <Text style={styles.buttonTextConfirm}>Aç</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    flexShrink: 0,
    overflow: 'hidden',
  },
  headerText: {
    flex: 1,
    minWidth: 0,
    paddingRight: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
    letterSpacing: -0.2,
    lineHeight: 26,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 18,
    letterSpacing: -0.1,
  },
  passwordContainer: {
    marginBottom: 24,
  },
  passwordWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 2,
    paddingHorizontal: 14,
    minHeight: 52,
  },
  passwordInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 14,
    paddingHorizontal: 4,
  },
  inputIcon: {
    marginRight: 12,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  buttonCancel: {
    borderWidth: 1.5,
  },
  buttonConfirm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  buttonText: {
    fontSize: 17,
    fontWeight: '600',
  },
  buttonTextConfirm: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 6,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

