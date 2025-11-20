import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React from 'react';
import {
  Dimensions,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import BottomSheet from './BottomSheet';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { getFaviconUrl } from '../utils/storage';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface DeleteBottomSheetProps {
  visible: boolean;
  website: { id: string; name: string; url: string; password?: string } | null;
  passwordRequired: boolean;
  passwordInput: string;
  onPasswordChange: (text: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function DeleteBottomSheet({
  visible,
  website,
  passwordRequired,
  passwordInput,
  onPasswordChange,
  onConfirm,
  onCancel,
}: DeleteBottomSheetProps) {
  const { colors } = useTheme();
  const { t } = useLanguage();

  return (
    <BottomSheet 
      visible={visible} 
      onClose={onCancel}
      defaultSnapPoint={0}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={[styles.iconContainer, { backgroundColor: colors.surface }]}>
            {website && (() => {
              const faviconUrl = getFaviconUrl(website.url);
              return faviconUrl ? (
                <Image
                  source={{ uri: faviconUrl }}
                  style={styles.favicon}
                  contentFit="cover"
                  transition={200}
                  cachePolicy="memory-disk"
                />
              ) : (
                <Ionicons name="globe-outline" size={24} color={colors.textSecondary} />
              );
            })()}
          </View>
          <View style={styles.headerText}>
            <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
              {website?.name}
            </Text>
            <Text style={[styles.url, { color: colors.textSecondary }]} numberOfLines={1}>
              {website?.password ? '********' : website?.url}
            </Text>
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        {passwordRequired && (
          <View style={styles.passwordContainer}>
            <View style={[styles.passwordWrapper, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Ionicons name="lock-closed-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={[styles.passwordInput, { color: colors.text }]}
                placeholder={t('delete.password.placeholder')}
                placeholderTextColor={colors.textSecondary}
                value={passwordInput}
                onChangeText={onPasswordChange}
                secureTextEntry
                autoFocus
                autoCapitalize="none"
                autoCorrect={false}
                onSubmitEditing={onConfirm}
              />
            </View>
          </View>
        )}

        <View style={[styles.warning, { backgroundColor: colors.error + '15' }]}>
          <Ionicons name="warning-outline" size={20} color={colors.error} />
          <Text style={[styles.warningText, { color: colors.textSecondary }]}>
            {t('delete.warning')}
          </Text>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.button, styles.buttonCancel, { borderColor: colors.border, backgroundColor: colors.surface }]}
            onPress={onCancel}
            activeOpacity={0.7}
          >
            <Text style={[styles.buttonText, { color: colors.text }]}>{t('common.cancel')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.button,
              styles.buttonDelete,
              { backgroundColor: colors.error },
              passwordRequired && !passwordInput.trim() && styles.buttonDisabled
            ]}
            onPress={onConfirm}
            activeOpacity={0.8}
            disabled={passwordRequired && !passwordInput.trim()}
          >
            <View style={styles.buttonContent}>
              <Ionicons name="trash-outline" size={18} color="#FFFFFF" />
              <Text style={styles.buttonTextDelete}>{t('delete.confirm')}</Text>
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
    marginBottom: 20,
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
  favicon: {
    width: 56,
    height: 56,
    borderRadius: 28,
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
  url: {
    fontSize: 14,
    lineHeight: 18,
    letterSpacing: -0.1,
  },
  divider: {
    height: 1,
    marginBottom: 20,
  },
  warning: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
    padding: 14,
    borderRadius: 14,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    marginLeft: 10,
    letterSpacing: -0.1,
    paddingRight: 4,
  },
  passwordContainer: {
    marginBottom: 18,
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
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonCancel: {
    borderWidth: 1.5,
  },
  buttonDelete: {
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
  buttonTextDelete: {
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

