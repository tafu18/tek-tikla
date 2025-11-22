import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React from 'react';
import {
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { getFaviconUrl, WebSite } from '../utils/storage';
import BottomSheet from './BottomSheet';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface WebsiteOptionsBottomSheetProps {
  visible: boolean;
  website: WebSite | null;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onMove?: () => void;
}

export default function WebsiteOptionsBottomSheet({
  visible,
  website,
  onClose,
  onEdit,
  onDelete,
  onMove,
}: WebsiteOptionsBottomSheetProps) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();

  if (!website) return null;

  const faviconUrl = getFaviconUrl(website.url);

  return (
    <BottomSheet visible={visible} onClose={onClose} defaultSnapPoint={0}>
      <View style={styles.container}>
        <View style={[styles.handle, { backgroundColor: colors.border }]} />
        
        <View style={styles.header}>
          <View style={[styles.iconContainer, { backgroundColor: colors.surface }]}>
            {faviconUrl ? (
              <Image
                source={{ uri: faviconUrl }}
                style={styles.favicon}
                contentFit="cover"
                transition={200}
                cachePolicy="memory-disk"
              />
            ) : (
              <Ionicons name="globe-outline" size={24} color={colors.textSecondary} />
            )}
          </View>
          <View style={styles.headerText}>
            <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
              {website.name}
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]} numberOfLines={1}>
              {website.password ? '********' : website.url}
            </Text>
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <View style={styles.options}>
          <TouchableOpacity
            style={[styles.option, { backgroundColor: colors.surface }]}
            onPress={() => {
              onEdit();
              onClose();
            }}
            activeOpacity={0.7}
          >
            <View style={[styles.optionIcon, { backgroundColor: colors.primary + '20' }]}>
              <Ionicons name="create-outline" size={24} color={colors.primary} />
            </View>
            <Text style={[styles.optionText, { color: colors.text }]}>
              {t('common.edit')}
            </Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          {onMove && (
            <TouchableOpacity
              style={[styles.option, { backgroundColor: colors.surface }]}
              onPress={() => {
                onMove();
                onClose();
              }}
              activeOpacity={0.7}
            >
              <View style={[styles.optionIcon, { backgroundColor: '#34D399' + '20' }]}>
                <Ionicons name="move-outline" size={24} color="#34D399" />
              </View>
              <Text style={[styles.optionText, { color: colors.text }]}>
                {t('common.move')}
              </Text>
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.option, { backgroundColor: colors.surface }]}
            onPress={() => {
              onDelete();
              onClose();
            }}
            activeOpacity={0.7}
          >
            <View style={[styles.optionIcon, { backgroundColor: '#EF4444' + '20' }]}>
              <Ionicons name="trash-outline" size={24} color="#EF4444" />
            </View>
            <Text style={[styles.optionText, { color: '#EF4444' }]}>
              {t('common.delete')}
            </Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 20,
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
    marginRight: 16,
    overflow: 'hidden',
  },
  favicon: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
  },
  divider: {
    height: 1,
    marginBottom: 20,
  },
  options: {
    gap: 12,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  optionText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
});

