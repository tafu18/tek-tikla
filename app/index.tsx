import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Pressable,
    RefreshControl,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import Animated, {
    FadeIn,
    FadeOut
} from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AlertBottomSheet from '../components/AlertBottomSheet';
import DeleteBottomSheet from '../components/DeleteBottomSheet';
import InfoBottomSheet from '../components/InfoBottomSheet';
import PasswordBottomSheet from '../components/PasswordBottomSheet';
import TemplateBottomSheet from '../components/TemplateBottomSheet';
import WebsiteOptionsBottomSheet from '../components/WebsiteOptionsBottomSheet';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { deleteWebSite, getFaviconUrl, getWebSites, isPasswordCached, reorderWebSites, saveWebSite, setPasswordCache, WebSite } from '../utils/storage';

export default function HomeScreen() {
  const { colors, isDark, theme, setTheme } = useTheme();
  const { t } = useLanguage();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [websites, setWebsites] = useState<WebSite[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [websiteToDelete, setWebsiteToDelete] = useState<{ id: string; name: string; url: string; password?: string } | null>(null);
  const [deletePasswordInput, setDeletePasswordInput] = useState('');
  const [deletePasswordRequired, setDeletePasswordRequired] = useState(false);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [websiteToOpen, setWebsiteToOpen] = useState<{ id: string; url: string; password?: string; isEdit?: boolean } | null>(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [infoModalVisible, setInfoModalVisible] = useState(false);
  const [templateModalVisible, setTemplateModalVisible] = useState(false);
  const [optionsModalVisible, setOptionsModalVisible] = useState(false);
  const [websiteForOptions, setWebsiteForOptions] = useState<WebSite | null>(null);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [isMoveMode, setIsMoveMode] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');

  const loadWebsites = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      const data = await getWebSites();
      setWebsites(data);
    } catch (error) {
      Alert.alert(t('common.error'), t('add.error.load.failed'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadWebsites();
  }, [loadWebsites]);

  // Sayfa her focus olduğunda listeyi yenile
  useFocusEffect(
    useCallback(() => {
      loadWebsites(false);
    }, [loadWebsites])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadWebsites(false);
  }, [loadWebsites]);

  const handleDelete = async (id: string, name: string, url: string) => {
    // Web sitesinin şifreli olup olmadığını kontrol et
    const websites = await getWebSites();
    const website = websites.find((w) => w.id === id);
    
    if (website?.password) {
      // Şifreli site - şifre kontrolü yap
      const cached = await isPasswordCached(id);
      if (cached) {
        // Cache'de varsa direkt silme modalını aç
        setWebsiteToDelete({ id, name, url, password: website.password });
        setDeletePasswordRequired(false);
        setDeleteModalVisible(true);
      } else {
        // Şifre sor
        setWebsiteToDelete({ id, name, url, password: website.password });
        setDeletePasswordRequired(true);
        setDeletePasswordInput('');
        setDeleteModalVisible(true);
      }
    } else {
      // Şifresiz site - direkt silme modalını aç
      setWebsiteToDelete({ id, name, url });
      setDeletePasswordRequired(false);
      setDeleteModalVisible(true);
    }
  };

  const confirmDelete = async () => {
    if (!websiteToDelete) return;
    
    // Şifre kontrolü gerekliyse kontrol et
    if (deletePasswordRequired && websiteToDelete.password) {
      if (deletePasswordInput.trim() !== websiteToDelete.password) {
        Alert.alert(t('common.error'), t('delete.password.wrong'));
        setDeletePasswordInput('');
        return;
      }
      // Şifre doğru - cache'e kaydet
      await setPasswordCache(websiteToDelete.id);
    }
    
    try {
      await deleteWebSite(websiteToDelete.id);
      loadWebsites();
      setDeleteModalVisible(false);
      setDeletePasswordInput('');
      setDeletePasswordRequired(false);
      setWebsiteToDelete(null);
    } catch (error: any) {
      if (error?.message === 'DEFAULT_WEBSITE_CANNOT_BE_DELETED') {
        Alert.alert(t('common.error'), t('delete.error.default'));
      } else {
        Alert.alert(t('common.error'), t('delete.error'));
      }
      setDeleteModalVisible(false);
      setDeletePasswordInput('');
      setDeletePasswordRequired(false);
      setWebsiteToDelete(null);
    }
  };

  const handlePasswordConfirm = async () => {
    if (!websiteToOpen) return;
    
    if (passwordInput.trim() === websiteToOpen.password) {
      // Şifre doğru
      await setPasswordCache(websiteToOpen.id);
      setPasswordModalVisible(false);
      setPasswordInput('');
      const id = websiteToOpen.id;
      const isEdit = websiteToOpen.isEdit;
      setWebsiteToOpen(null);
      if (isEdit) {
        router.push(`/add?id=${id}`);
      } else {
        router.push(`/webview/${id}`);
      }
    } else {
      Alert.alert(t('common.error'), t('password.wrong'));
      setPasswordInput('');
    }
  };

  const cancelDelete = () => {
    setDeleteModalVisible(false);
    setDeletePasswordInput('');
    setDeletePasswordRequired(false);
    setWebsiteToDelete(null);
  };

  const filteredWebsites = websites.filter(
    (site) =>
      site.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      site.url.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Website Card Component - hook kullanabilmek için ayrı component
  const WebsiteCard = ({ 
    item, 
    index, 
    onDelete, 
    onPress,
    isSelected,
    isRefreshing,
    isMoveMode
  }: { 
    item: WebSite; 
    index: number; 
    onDelete: (id: string, name: string, url: string) => void;
    onPress: (item: WebSite) => void;
    isSelected: boolean;
    isRefreshing: boolean;
    isMoveMode: boolean;
  }) => {
    const { colors } = useTheme();
    const router = useRouter();
    const [imageError, setImageError] = useState(false);
    const [imageLoaded, setImageLoaded] = useState(false);
    const faviconUrl = getFaviconUrl(item.url);

    return (
      <Animated.View
        entering={isRefreshing ? undefined : FadeIn.duration(100)}
        exiting={FadeOut.duration(80)}
        style={styles.cardContainer}
      >
        <TouchableOpacity
          style={[
            styles.card, 
            { 
              backgroundColor: colors.card, 
              borderColor: isSelected ? colors.primary : colors.border,
              borderWidth: isSelected ? 2 : 1,
              opacity: isMoveMode && !isSelected ? 0.6 : 1,
            }
          ]}
          onPress={() => {
            onPress(item);
          }}
          activeOpacity={0.7}
        >
          <View style={styles.cardContent}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconContainer, { backgroundColor: colors.surface }]}>
                {faviconUrl ? (
                  <>
                    <Image
                      source={{ uri: faviconUrl }}
                      style={[styles.favicon, imageLoaded && !imageError && styles.faviconVisible]}
                      contentFit="cover"
                      transition={200}
                      cachePolicy="memory-disk"
                      onLoad={() => {
                        setImageLoaded(true);
                        setImageError(false);
                      }}
                      onError={(error) => {
                        setImageError(true);
                      }}
                      recyclingKey={faviconUrl}
                    />
                    {/* Fallback icon - logo yüklenemezse veya yüklenmediyse gösterilir */}
                    {(!imageLoaded || imageError) && (
                      <View style={styles.faviconFallback}>
                        <Ionicons name="globe-outline" size={20} color={colors.textSecondary} />
                      </View>
                    )}
                  </>
                ) : (
                  <View style={styles.faviconFallback}>
                    <Ionicons name="globe-outline" size={20} color={colors.textSecondary} />
                  </View>
                )}
              </View>
              <View style={styles.cardActions}>
                {item.password && (
                  <Ionicons 
                    name="lock-closed" 
                    size={18} 
                    color={colors.primary} 
                    style={styles.lockIcon}
                  />
                )}
                <Pressable
                  onPress={(e) => {
                    e.stopPropagation();
                    setWebsiteForOptions(item);
                    setOptionsModalVisible(true);
                  }}
                  style={styles.optionsButton}
                >
                  <Ionicons name="ellipsis-vertical" size={20} color={colors.textSecondary} />
                </Pressable>
              </View>
            </View>
            <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={[styles.cardUrl, { color: colors.textSecondary }]} numberOfLines={1}>
              {item.password ? '********' : item.url}
            </Text>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const handleMove = (id: string) => {
    setSelectedCardId(id);
    setIsMoveMode(true);
  };

  const handleCardPress = async (item: WebSite) => {
    // Eğer taşıma modundaysa ve farklı bir kart seçildiyse yer değiştir
    if (isMoveMode && selectedCardId && selectedCardId !== item.id) {
      const fromIndex = filteredWebsites.findIndex(w => w.id === selectedCardId);
      const toIndex = filteredWebsites.findIndex(w => w.id === item.id);
      
      if (fromIndex !== -1 && toIndex !== -1) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const newOrder = [...filteredWebsites];
        // Swap işlemi - iki kartın yerini değiştir
        [newOrder[fromIndex], newOrder[toIndex]] = [newOrder[toIndex], newOrder[fromIndex]];
        const ids = newOrder.map(w => w.id);
        await reorderWebSites(ids);
        await loadWebsites(false);
        setSelectedCardId(null);
        setIsMoveMode(false);
      }
      return;
    }
    
    // Taşıma modunda değilse normal işlemi yap
    if (isMoveMode) {
      // Taşıma modunda ama aynı karta basıldıysa iptal et
      setSelectedCardId(null);
      setIsMoveMode(false);
      return;
    }
    
    // Normal kart açma işlemi
    if (item.password) {
      const cached = await isPasswordCached(item.id);
      if (cached) {
        router.push(`/webview/${item.id}`);
      } else {
        setWebsiteToOpen({ id: item.id, url: item.url, password: item.password });
        setPasswordModalVisible(true);
      }
    } else {
      router.push(`/webview/${item.id}`);
    }
  };

  const renderWebsiteCard = ({ item, index }: { item: WebSite; index: number }) => (
    <WebsiteCard 
      item={item} 
      index={index} 
      onDelete={handleDelete}
      onPress={handleCardPress}
      isSelected={selectedCardId === item.id}
      isRefreshing={refreshing}
      isMoveMode={isMoveMode}
    />
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Image
        source={require('../assets/images/tek-tikla.png')}
        style={styles.emptyLogo}
        contentFit="contain"
        transition={200}
      />
      <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
        {t('home.empty.title')}
      </Text>
      <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
        {t('home.empty.subtitle')}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.primary }]}>{t('home.title')}</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {isMoveMode ? t('common.move.hint') : `${websites.length} ${t('home.websites')}`}
          </Text>
        </View>
        {isMoveMode ? (
          <TouchableOpacity
            onPress={() => {
              setSelectedCardId(null);
              setIsMoveMode(false);
            }}
            style={[styles.cancelButton, { backgroundColor: colors.surface }]}
            activeOpacity={0.7}
          >
            <Text style={[styles.cancelButtonText, { color: colors.text }]}>
              {t('common.cancel')}
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={() => setTemplateModalVisible(true)}
            style={[styles.infoButton, { backgroundColor: colors.surface }]}
            activeOpacity={0.7}
          >
            <Ionicons name="grid-outline" size={22} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setInfoModalVisible(true)}
            style={[styles.infoButton, { backgroundColor: colors.surface }]}
            activeOpacity={0.7}
          >
            <Ionicons name="information-circle-outline" size={22} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              // Light -> Dark -> Auto -> Light döngüsü
              const newTheme = theme === 'light' ? 'dark' : theme === 'dark' ? 'auto' : 'light';
              setTheme(newTheme);
            }}
            style={[styles.themeButton, { backgroundColor: colors.surface }]}
            activeOpacity={0.7}
          >
            <Ionicons
              name={theme === 'auto' ? 'phone-portrait-outline' : isDark ? 'moon' : 'sunny'}
              size={22}
              color={colors.text}
            />
          </TouchableOpacity>
          </View>
        )}
      </View>

      {websites.length > 0 && (
        <View style={[styles.searchContainer, { backgroundColor: colors.surface }]}>
          <Ionicons name="search" size={20} color={colors.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder={t('home.search.placeholder')}
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      )}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredWebsites}
          renderItem={renderWebsiteCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.listContainer,
            { paddingBottom: 100 + insets.bottom },
            filteredWebsites.length === 0 && styles.listContainerEmpty,
          ]}
          ListEmptyComponent={renderEmptyState}
          showsVerticalScrollIndicator={false}
          numColumns={2}
          columnWrapperStyle={styles.row}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          removeClippedSubviews={false}
          initialNumToRender={10}
          maxToRenderPerBatch={5}
          windowSize={5}
        />
      )}

      <TouchableOpacity
        style={[styles.fab, { bottom: 20 + insets.bottom }]}
        onPress={() => router.push('/add')}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={32} color="#FFFFFF" />
      </TouchableOpacity>

      <DeleteBottomSheet
        visible={deleteModalVisible}
        website={websiteToDelete}
        passwordRequired={deletePasswordRequired}
        passwordInput={deletePasswordInput}
        onPasswordChange={setDeletePasswordInput}
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />

      <PasswordBottomSheet
        visible={passwordModalVisible}
        website={websiteToOpen}
        passwordInput={passwordInput}
        onPasswordChange={setPasswordInput}
        onConfirm={handlePasswordConfirm}
        onCancel={() => {
          setPasswordModalVisible(false);
          setPasswordInput('');
          setWebsiteToOpen(null);
        }}
      />

      <InfoBottomSheet
        visible={infoModalVisible}
        onClose={() => setInfoModalVisible(false)}
      />

      <TemplateBottomSheet
        visible={templateModalVisible}
        onClose={() => setTemplateModalVisible(false)}
          onSelectTemplates={async (templates) => {
            try {
              let addedCount = 0;
              let duplicateCount = 0;
              const duplicateNames: string[] = [];
              
              for (const template of templates) {
                try {
                  await saveWebSite({ name: template.name, url: template.url });
                  addedCount++;
                } catch (error: any) {
                  // URL zaten eklenmişse
                  if (error?.message === 'DUPLICATE_URL') {
                    duplicateCount++;
                    duplicateNames.push(template.name);
                  }
                  // Diğer hatalar için loglama yapılmıyor (kullanıcıya gösterilmiyor)
                }
              }
              
              // Sonuçları kullanıcıya bildir
              if (addedCount > 0) {
                await loadWebsites(false);
              }
              
              if (duplicateCount > 0) {
                const duplicateMessage = duplicateCount === 1
                  ? t('add.error.url.duplicate.message')
                  : `${duplicateCount} ${t('add.error.url.duplicate.count')}`;
                
                setAlertTitle(t('add.error.url.duplicate'));
                setAlertMessage(duplicateMessage);
                setAlertVisible(true);
              }
            } catch (error) {
              if (__DEV__) {
                console.error('Error adding templates:', error);
              }
            }
          }}
        />

        <AlertBottomSheet
          visible={alertVisible}
          title={alertTitle}
          message={alertMessage}
          onClose={() => setAlertVisible(false)}
          type="error"
        />

        <WebsiteOptionsBottomSheet
          visible={optionsModalVisible}
          website={websiteForOptions}
          onClose={() => {
            setOptionsModalVisible(false);
            setWebsiteForOptions(null);
          }}
          onEdit={async () => {
            if (!websiteForOptions) return;
            // Şifre kontrolü
            if (websiteForOptions.password) {
              const cached = await isPasswordCached(websiteForOptions.id);
              if (cached) {
                // Cache'de varsa direkt aç
                router.push(`/add?id=${websiteForOptions.id}`);
              } else {
                // Şifre sor
                setWebsiteToOpen({ id: websiteForOptions.id, url: websiteForOptions.url, password: websiteForOptions.password, isEdit: true });
                setPasswordModalVisible(true);
              }
            } else {
              // Şifre yoksa direkt aç
              router.push(`/add?id=${websiteForOptions.id}`);
            }
          }}
          onMove={() => {
            if (websiteForOptions) {
              handleMove(websiteForOptions.id);
            }
          }}
          onDelete={() => {
            if (websiteForOptions) {
              handleDelete(websiteForOptions.id, websiteForOptions.name, websiteForOptions.url);
            }
          }}
        />
      </SafeAreaView>
    );
  }

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  headerActions: {
    flexDirection: 'row',
  },
  infoButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  themeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  listContainerEmpty: {
    flex: 1,
  },
  row: {
    justifyContent: 'space-between',
  },
  cardContainer: {
    width: '48%',
    marginBottom: 16,
  },
  card: {
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
    minHeight: 140,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardContent: {
    padding: 16,
    flex: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  favicon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    opacity: 0,
    backgroundColor: 'transparent',
  },
  faviconVisible: {
    opacity: 1,
  },
  faviconFallback: {
    position: 'absolute',
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lockIcon: {
    marginRight: 4,
  },
  optionsButton: {
    padding: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  cardUrl: {
    fontSize: 12,
  },
  fab: {
    position: 'absolute',
    left: 20,
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    backgroundColor: '#34D399', // Yumuşak mint
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 8,
  },
  emptyLogo: {
    width: 120,
    height: 120,
    opacity: 0.6,
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
