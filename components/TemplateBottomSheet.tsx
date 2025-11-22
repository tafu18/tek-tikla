import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
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
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { categories, getTemplatesByCategory, Template } from '../utils/templates';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface TemplateBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  onSelectTemplate?: (template: Template) => void;
  onSelectTemplates?: (templates: Template[]) => void;
}

export default function TemplateBottomSheet({ visible, onClose, onSelectTemplate, onSelectTemplates }: TemplateBottomSheetProps) {
  const { colors } = useTheme();
  const { t, language } = useLanguage();
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(SCREEN_HEIGHT);
  const opacity = useSharedValue(0);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplates, setSelectedTemplates] = useState<Set<string>>(new Set());

  const SHEET_HEIGHT = SCREEN_HEIGHT * 0.85;

  useEffect(() => {
    if (visible) {
      opacity.value = withTiming(1, { duration: 200 });
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
      setSelectedCategory(null);
      setTemplates([]);
      setSelectedTemplates(new Set());
    }
  }, [visible, SHEET_HEIGHT]);

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId);
    const categoryTemplates = getTemplatesByCategory(categoryId);
    setTemplates(categoryTemplates);
    setSelectedTemplates(new Set());
  };

  const handleTemplateSelect = (template: Template) => {
    if (onSelectTemplates) {
      // Çoklu seçim modu
      const newSelected = new Set(selectedTemplates);
      if (newSelected.has(template.id)) {
        newSelected.delete(template.id);
      } else {
        newSelected.add(template.id);
      }
      setSelectedTemplates(newSelected);
    } else if (onSelectTemplate) {
      // Tekli seçim modu (geriye dönük uyumluluk)
      onSelectTemplate(template);
      onClose();
    }
  };

  const handleAddSelected = () => {
    if (onSelectTemplates && selectedTemplates.size > 0) {
      const selected = templates.filter(t => selectedTemplates.has(t.id));
      onSelectTemplates(selected);
      setSelectedTemplates(new Set());
      onClose();
    }
  };

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    pointerEvents: visible ? 'auto' : 'none',
  }));

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  if (!visible) return null;

  const getCategoryName = (category: typeof categories[0]) => {
    return language === 'en' ? category.nameEn : category.name;
  };

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
            paddingBottom: insets.bottom,
          },
        ]}
      >
        <View style={[styles.handle, { backgroundColor: colors.border }]} />
        
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>{t('templates.title')}</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        {!selectedCategory ? (
          <View style={styles.content} key="categories-view">
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {t('templates.select.category')}
            </Text>
            <FlatList
              key="categories-list"
              data={categories}
              numColumns={2}
              keyExtractor={(item) => item.id}
              contentContainerStyle={[styles.categoriesList, { paddingBottom: insets.bottom + 20 }]}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.categoryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  onPress={() => handleCategorySelect(item.id)}
                  activeOpacity={0.7}
                >
                  <Ionicons name={item.icon as any} size={32} color={colors.primary} />
                  <Text style={[styles.categoryName, { color: colors.text }]}>
                    {getCategoryName(item)}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        ) : (
          <View style={styles.content} key={`templates-view-${selectedCategory}`}>
            <View style={styles.templateHeader}>
              <TouchableOpacity
                onPress={() => {
                  setSelectedCategory(null);
                  setTemplates([]);
                }}
                style={styles.backButton}
              >
                <Ionicons name="arrow-back" size={24} color={colors.text} />
              </TouchableOpacity>
              <Text style={[styles.sectionTitle, { color: colors.text, flex: 1 }]}>
                {getCategoryName(categories.find(c => c.id === selectedCategory)!)}
              </Text>
            </View>
            <FlatList
              key={`templates-list-${selectedCategory}`}
              data={templates}
              keyExtractor={(item) => item.id}
              contentContainerStyle={[styles.templatesList, { paddingBottom: insets.bottom + 80 }]}
              renderItem={({ item }) => {
                const isSelected = selectedTemplates.has(item.id);
                return (
                  <TouchableOpacity
                    style={[
                      styles.templateCard,
                      { backgroundColor: colors.surface, borderColor: colors.border },
                      isSelected && { borderColor: colors.primary, borderWidth: 2 }
                    ]}
                    onPress={() => handleTemplateSelect(item)}
                    activeOpacity={0.7}
                  >
                    {onSelectTemplates && (
                      <View style={[
                        styles.checkbox,
                        { borderColor: colors.border },
                        isSelected && { backgroundColor: colors.primary, borderColor: colors.primary }
                      ]}>
                        {isSelected && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
                      </View>
                    )}
                    <View style={styles.templateContent}>
                      <Text style={[styles.templateName, { color: colors.text }]}>{item.name}</Text>
                      <Text style={[styles.templateUrl, { color: colors.textSecondary }]} numberOfLines={1}>
                        {item.url}
                      </Text>
                    </View>
                    {!onSelectTemplates && (
                      <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                    )}
                  </TouchableOpacity>
                );
              }}
            />
            {onSelectTemplates && selectedTemplates.size > 0 && (
              <View style={[styles.addButtonContainer, { paddingBottom: insets.bottom + 20 }]}>
                <TouchableOpacity
                  style={[styles.addButton, { backgroundColor: colors.primary }]}
                  onPress={handleAddSelected}
                  activeOpacity={0.8}
                >
                  <Text style={styles.addButtonText}>
                    {t('common.add')} ({selectedTemplates.size})
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  categoriesList: {
    paddingBottom: 20,
  },
  categoryCard: {
    flex: 1,
    margin: 8,
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
  },
  categoryName: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  templateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  backButton: {
    padding: 4,
    marginRight: 12,
  },
  templatesList: {
    paddingBottom: 20,
  },
  templateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  templateContent: {
    flex: 1,
    marginRight: 12,
  },
  templateName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  templateUrl: {
    fontSize: 14,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 16,
    backgroundColor: 'transparent',
  },
  addButton: {
    borderRadius: 24,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

