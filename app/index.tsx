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
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import DeleteBottomSheet from '../components/DeleteBottomSheet';
import InfoBottomSheet from '../components/InfoBottomSheet';
import PasswordBottomSheet from '../components/PasswordBottomSheet';
import TemplateBottomSheet from '../components/TemplateBottomSheet';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { deleteWebSite, getFaviconUrl, getWebSites, isPasswordCached, setPasswordCache, WebSite } from '../utils/storage';
import { Template } from '../utils/templates';

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
    } catch (error) {
      Alert.alert(t('common.error'), t('delete.error'));
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
  const WebsiteCard = ({ item, index, onDelete }: { item: WebSite; index: number; onDelete: (id: string, name: string, url: string) => void }) => {
    const { colors } = useTheme();
    const router = useRouter();
    const [imageError, setImageError] = useState(false);
    const [imageLoaded, setImageLoaded] = useState(false);
    const faviconUrl = getFaviconUrl(item.url);
    

    return (
      <Animated.View
        entering={FadeInDown.delay(index * 50).springify()}
        exiting={FadeOutUp}
        style={styles.cardContainer}
      >
        <TouchableOpacity
          style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={async () => {
            // Şifre kontrolü
            if (item.password) {
              const cached = await isPasswordCached(item.id);
              if (cached) {
                // Cache'de varsa direkt aç
                router.push(`/webview/${item.id}`);
              } else {
                // Şifre sor
                setWebsiteToOpen({ id: item.id, url: item.url, password: item.password });
                setPasswordModalVisible(true);
              }
            } else {
              // Şifre yoksa direkt aç
              router.push(`/webview/${item.id}`);
            }
          }}
          onLongPress={async () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            // Şifre kontrolü
            if (item.password) {
              const cached = await isPasswordCached(item.id);
              if (cached) {
                // Cache'de varsa direkt aç
                router.push(`/add?id=${item.id}`);
              } else {
                // Şifre sor
                setWebsiteToOpen({ id: item.id, url: item.url, password: item.password, isEdit: true });
                setPasswordModalVisible(true);
              }
            } else {
              // Şifre yoksa direkt aç
              router.push(`/add?id=${item.id}`);
            }
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
                  onPress={() => onDelete(item.id, item.name, item.url)}
                  style={styles.deleteButton}
                >
                  <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
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

  const renderWebsiteCard = ({ item, index }: { item: WebSite; index: number }) => (
    <WebsiteCard item={item} index={index} onDelete={handleDelete} />
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
        <View>
          <Text style={[styles.title, { color: colors.primary }]}>{t('home.title')}</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {websites.length} {t('home.websites')}
          </Text>
        </View>
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
        onSelectTemplate={(template) => {
          router.push(`/add?name=${encodeURIComponent(template.name)}&url=${encodeURIComponent(template.url)}`);
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
  deleteButton: {
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
});
