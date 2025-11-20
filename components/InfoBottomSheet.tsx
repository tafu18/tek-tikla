import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React, { useEffect } from 'react';
import {
  Dimensions,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
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

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface InfoBottomSheetProps {
  visible: boolean;
  onClose: () => void;
}

export default function InfoBottomSheet({ visible, onClose }: InfoBottomSheetProps) {
  const { colors } = useTheme();
  const { t, language, setLanguage } = useLanguage();
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(SCREEN_HEIGHT);
  const opacity = useSharedValue(0);
  const keyboardHeight = useSharedValue(0);

  // Sheet ekranın %85'ini kaplar
  const SHEET_HEIGHT = SCREEN_HEIGHT * 0.86;

  useEffect(() => {
    if (visible) {
      opacity.value = withTiming(1, { duration: 200 });
      // Sheet en altta başlar, SHEET_HEIGHT kadar yukarı çıkar
      translateY.value = withSpring(-(SCREEN_HEIGHT - SHEET_HEIGHT), {
        damping: 15,
        stiffness: 150,
        mass: 0.5,
      });
    } else {
      opacity.value = withTiming(0, { duration: 200 });
      translateY.value = withSpring(SCREEN_HEIGHT, {
        damping: 15,
        stiffness: 150,
        mass: 0.5,
      });
      keyboardHeight.value = 0;
    }
  }, [visible, SHEET_HEIGHT]);

  useEffect(() => {
    if (!visible) return;

    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        keyboardHeight.value = withTiming(e.endCoordinates.height, {
          duration: Platform.OS === 'ios' ? e.duration || 250 : 100,
        });
      }
    );

    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      (e) => {
        keyboardHeight.value = withTiming(0, {
          duration: Platform.OS === 'ios' ? e.duration || 250 : 100,
        });
      }
    );

    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
  }, [visible]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    pointerEvents: visible ? 'auto' : 'none',
  }));

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value - keyboardHeight.value }],
  }));

  if (!visible) return null;

  return (
    <KeyboardAvoidingView
      style={StyleSheet.absoluteFill}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      pointerEvents="box-none"
    >
      <Animated.View
        style={[
          styles.backdrop,
          backdropStyle,
          { backgroundColor: 'rgba(0, 0, 0, 0.5)' },
        ]}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      <Animated.View
        style={[
          styles.sheet,
          sheetStyle,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            height: SHEET_HEIGHT,
          },
        ]}
      >
        <View style={[styles.handle, { backgroundColor: colors.border }]} />
        <ScrollView
          showsVerticalScrollIndicator={true}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled={true}
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom }]}
          bounces={true}
        >
          <View style={styles.infoHeader}>
            <Image
              source={require('../assets/images/tek-tikla.png')}
              style={styles.logo}
              contentFit="contain"
              transition={200}
            />
            <Text style={[styles.infoTitle, { color: colors.text }]}>{t('info.title')}</Text>
            <Text style={[styles.infoSubtitle, { color: colors.textSecondary }]}>
              {t('info.subtitle')}
            </Text>
          </View>

          <View style={[styles.infoDivider, { backgroundColor: colors.border }]} />

          <View style={styles.infoSection}>
            <Text style={[styles.infoSectionTitle, { color: colors.text }]}>{t('language.title')}</Text>
            <View style={styles.infoLanguageContainer}>
              <TouchableOpacity
                style={[
                  styles.infoLanguageButton,
                  { 
                    backgroundColor: language === 'tr' ? colors.primary : colors.surface,
                    borderColor: colors.border 
                  }
                ]}
                onPress={() => setLanguage('tr')}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.infoLanguageText,
                  { color: language === 'tr' ? '#FFFFFF' : colors.text }
                ]}>
                  {t('language.turkish')}
                </Text>
                {language === 'tr' && (
                  <Ionicons name="checkmark" size={20} color="#FFFFFF" style={{ marginLeft: 8 }} />
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.infoLanguageButton,
                  { 
                    backgroundColor: language === 'en' ? colors.primary : colors.surface,
                    borderColor: colors.border 
                  }
                ]}
                onPress={() => setLanguage('en')}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.infoLanguageText,
                  { color: language === 'en' ? '#FFFFFF' : colors.text }
                ]}>
                  {t('language.english')}
                </Text>
                {language === 'en' && (
                  <Ionicons name="checkmark" size={20} color="#FFFFFF" style={{ marginLeft: 8 }} />
                )}
              </TouchableOpacity>
            </View>
          </View>

          <View style={[styles.infoDivider, { backgroundColor: colors.border }]} />

          <View style={styles.infoSection}>
            <Text style={[styles.infoSectionTitle, { color: colors.text }]}>{t('info.what.title')}</Text>
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              {t('info.what.text')}
            </Text>
          </View>

          <View style={styles.infoSection}>
            <Text style={[styles.infoSectionTitle, { color: colors.text }]}>{t('info.features.title')}</Text>
            <View style={styles.infoFeatureList}>
              <View style={styles.infoFeatureItem}>
                <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                <Text style={[styles.infoFeatureText, { color: colors.textSecondary }]}>
                  {t('info.features.1')}
                </Text>
              </View>
              <View style={styles.infoFeatureItem}>
                <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                <Text style={[styles.infoFeatureText, { color: colors.textSecondary }]}>
                  {t('info.features.2')}
                </Text>
              </View>
              <View style={styles.infoFeatureItem}>
                <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                <Text style={[styles.infoFeatureText, { color: colors.textSecondary }]}>
                  {t('info.features.3')}
                </Text>
              </View>
              <View style={styles.infoFeatureItem}>
                <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                <Text style={[styles.infoFeatureText, { color: colors.textSecondary }]}>
                  {t('info.features.4')}
                </Text>
              </View>
              <View style={styles.infoFeatureItem}>
                <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                <Text style={[styles.infoFeatureText, { color: colors.textSecondary }]}>
                  {t('info.features.5')}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.infoSection}>
            <Text style={[styles.infoSectionTitle, { color: colors.text }]}>{t('info.specs.title')}</Text>
            <View style={styles.infoFeatureList}>
              <View style={styles.infoFeatureItem}>
                <Ionicons name="star" size={20} color={colors.primary} />
                <Text style={[styles.infoFeatureText, { color: colors.textSecondary }]}>
                  {t('info.specs.1')}
                </Text>
              </View>
              <View style={styles.infoFeatureItem}>
                <Ionicons name="star" size={20} color={colors.primary} />
                <Text style={[styles.infoFeatureText, { color: colors.textSecondary }]}>
                  {t('info.specs.2')}
                </Text>
              </View>
              <View style={styles.infoFeatureItem}>
                <Ionicons name="star" size={20} color={colors.primary} />
                <Text style={[styles.infoFeatureText, { color: colors.textSecondary }]}>
                  {t('info.specs.3')}
                </Text>
              </View>
              <View style={styles.infoFeatureItem}>
                <Ionicons name="star" size={20} color={colors.primary} />
                <Text style={[styles.infoFeatureText, { color: colors.textSecondary }]}>
                  {t('info.specs.4')}
                </Text>
              </View>
            </View>
          </View>

          <View style={[styles.infoDivider, { backgroundColor: colors.border }]} />

          <View style={styles.infoSection}>
            <Text style={[styles.infoSectionTitle, { color: colors.text }]}>{t('info.developer.title')}</Text>
            <Text style={[styles.infoText, { color: colors.textSecondary, marginBottom: 16 }]}>
              {t('info.developer.name')}
            </Text>
            
            <View style={styles.infoLinksContainer}>
              <TouchableOpacity
                style={[styles.infoLink, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => Linking.openURL('https://tayfuntasdemir.com.tr/')}
                activeOpacity={0.7}
              >
                <Ionicons name="globe-outline" size={18} color={colors.primary} />
                <Text style={[styles.infoLinkText, { color: colors.text }]}>{t('info.developer.website')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.infoLink, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => Linking.openURL('https://vaktihuzur.com.tr/')}
                activeOpacity={0.7}
              >
                <Ionicons name="moon-outline" size={18} color={colors.primary} />
                <Text style={[styles.infoLinkText, { color: colors.text }]}>{t('info.developer.vakti')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.infoLink, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => Linking.openURL('https://www.linkedin.com/in/tayfuntasdemir/')}
                activeOpacity={0.7}
              >
                <Ionicons name="logo-linkedin" size={18} color={colors.primary} />
                <Text style={[styles.infoLinkText, { color: colors.text }]}>{t('info.developer.linkedin')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.infoLink, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => Linking.openURL('https://play.google.com/store/apps/details?id=com.tayfuntasdemir.VaktiHuzurApp')}
                activeOpacity={0.7}
              >
                <Ionicons name="logo-google-playstore" size={18} color={colors.primary} />
                <Text style={[styles.infoLinkText, { color: colors.text }]}>{t('info.developer.app')}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.infoCloseButton, { backgroundColor: colors.primary }]}
            onPress={onClose}
            activeOpacity={0.8}
          >
            <Text style={styles.infoCloseButtonText}>{t('common.close')}</Text>
          </TouchableOpacity>
        </ScrollView>
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: -120,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    paddingTop: 12,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  infoHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 16,
  },
  infoTitle: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  infoSubtitle: {
    fontSize: 16,
    letterSpacing: -0.2,
  },
  infoDivider: {
    height: 1,
    marginVertical: 24,
  },
  infoSection: {
    marginBottom: 24,
  },
  infoSectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  infoText: {
    fontSize: 15,
    lineHeight: 24,
    letterSpacing: -0.2,
  },
  infoFeatureList: {
  },
  infoFeatureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  infoFeatureText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
    marginLeft: 12,
    letterSpacing: -0.2,
  },
  infoLinksContainer: {
  },
  infoLanguageContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  infoLanguageButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  infoLanguageText: {
    fontSize: 16,
    fontWeight: '600',
  },
  infoLink: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1.5,
    marginBottom: 12,
  },
  infoLinkText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 12,
  },
  infoCloseButton: {
    paddingVertical: 16,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    minHeight: 56,
  },
  infoCloseButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
});
