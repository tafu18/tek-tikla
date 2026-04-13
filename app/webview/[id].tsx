import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';
import { formatUrl, getWebSites } from '../../utils/storage';

export default function WebViewScreen() {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id: string }>();
  const webViewRef = useRef<WebView>(null);

  const [url, setUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [currentUrl, setCurrentUrl] = useState<string>('');
  const [title, setTitle] = useState<string>('');

  useEffect(() => {
    loadWebsite();
  }, [params.id]);

  const loadWebsite = async () => {
    try {
      const websites = await getWebSites();
      const website = websites.find((w) => w.id === params.id);

      if (website) {
        // Parametre bozulmalarını engellemek için decode işlemi
        const decodedUrl = decodeURIComponent(website.url);
        const formattedUrl = formatUrl(decodedUrl);
        setUrl(formattedUrl);
        setTitle(website.name);
      } else {
        Alert.alert(t('common.error'), t('webview.error.notfound'), [
          { text: t('common.ok'), onPress: () => router.back() },
        ]);
      }
    } catch (error) {
      if (__DEV__) console.error('Error loading website:', error);
      Alert.alert(t('common.error'), t('webview.error.loadfailed'), [
        { text: t('common.ok'), onPress: () => router.back() },
      ]);
    }
  };

  const getDomainFromUrl = (urlString: string): string => {
    try {
      const urlObj = new URL(urlString);
      return urlObj.hostname.replace('www.', '');
    } catch {
      return '';
    }
  };

  // Sadece PDF ve dosya indirmelerini dışarı fırlatacak fonksiyon
  const handleExternalLink = async (targetUrl: string) => {
    try {
      if (targetUrl.toLowerCase().endsWith('.pdf') || targetUrl.includes('blob:')) {
        await Linking.openURL(targetUrl);
        return true;
      }
    } catch (error) {
      console.error("Link açma hatası:", error);
    }
    return false;
  };

  const handleShouldStartLoadWithRequest = (request: any) => {
    // PDF dahil HER ŞEYİN WebView içinde kalmasına izin veriyoruz.
    // iOS PDF'leri doğrudan ekranda açar.
    // Android ise PDF olduğunu anlayıp arka planda kendi güvenli indiricisini çalıştırır.
    return true;
  };

  const handleNavigationStateChange = (navState: any) => {
    const { url: navUrl, canGoBack: newCanGoBack, canGoForward: newCanGoForward, title: navTitle } = navState;

    setCanGoBack(newCanGoBack);
    setCanGoForward(newCanGoForward);
    setCurrentUrl(navUrl);
    setTitle(navTitle || title);
  };

  const handleBack = () => {
    if (webViewRef.current && canGoBack) {
      webViewRef.current.goBack();
    } else {
      router.back();
    }
  };

  const handleForward = () => {
    if (webViewRef.current && canGoForward) {
      webViewRef.current.goForward();
    }
  };

  const handleRefresh = () => {
    if (webViewRef.current) {
      webViewRef.current.reload();
    }
  };

  const handleLoadStart = () => setLoading(true);
  const handleLoadEnd = () => setLoading(false);

  const handleError = (syntheticEvent: any) => {
    const { nativeEvent } = syntheticEvent;
    if (__DEV__) console.error('WebView error: ', nativeEvent);
    setLoading(false);

    if (!nativeEvent.description?.includes('net::ERR')) {
      Alert.alert(t('webview.error.title'), t('webview.error.message'), [{ text: t('common.ok') }]);
    }
  };

  if (!url) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={handleBack} style={styles.headerButton} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <TouchableOpacity style={styles.urlContainer} activeOpacity={0.7}>
            {loading && <ActivityIndicator size="small" color={colors.primary} style={styles.loadingIndicator} />}
            <View style={styles.urlTextContainer}>
              {currentUrl && currentUrl.startsWith('https://') && (
                <Ionicons name="lock-closed" size={14} color={colors.primary} style={styles.lockIcon} />
              )}
              <Ionicons name="globe-outline" size={14} color={colors.textSecondary} style={styles.globeIcon} />
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity onPress={handleRefresh} style={[styles.headerButton, !loading && styles.headerButtonActive]} activeOpacity={0.7} disabled={loading}>
            <Ionicons name={loading ? 'hourglass-outline' : 'refresh'} size={22} color={loading ? colors.textSecondary : colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Navigation Bar */}
      <View style={[styles.navBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={handleBack} style={[styles.navButton, { backgroundColor: colors.card }, !canGoBack && styles.navButtonDisabled]} activeOpacity={0.7} disabled={!canGoBack}>
          <Ionicons name="chevron-back" size={20} color={canGoBack ? colors.text : colors.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity onPress={handleForward} style={[styles.navButton, { backgroundColor: colors.card }, !canGoForward && styles.navButtonDisabled]} activeOpacity={0.7} disabled={!canGoForward}>
          <Ionicons name="chevron-forward" size={20} color={canGoForward ? colors.text : colors.textSecondary} />
        </TouchableOpacity>

        <View style={[styles.urlDisplay, { backgroundColor: colors.card }]}>
          {currentUrl ? (
            <>
              <Ionicons name={currentUrl.startsWith('https://') ? 'lock-closed' : 'globe-outline'} size={12} color={currentUrl.startsWith('https://') ? colors.primary : colors.textSecondary} style={styles.urlIcon} />
              <Text style={[styles.urlText, { color: colors.textSecondary }]} numberOfLines={1} ellipsizeMode="middle">
                {getDomainFromUrl(currentUrl) || title}
              </Text>
            </>
          ) : (
            <Ionicons name="globe-outline" size={14} color={colors.textSecondary} style={styles.urlIcon} />
          )}
        </View>
      </View>

      {/* WebView */}
      <WebView
        ref={webViewRef}
        source={{ uri: url }}
        style={[styles.webview, { marginBottom: insets.bottom }]}

        onShouldStartLoadWithRequest={handleShouldStartLoadWithRequest}
        onNavigationStateChange={handleNavigationStateChange}
        onLoadStart={handleLoadStart}
        onLoadEnd={handleLoadEnd}
        onError={handleError}

        // 1. YENİ SEKME YÖNETİMİ: Tıklanan her şeyi aynı pencerede aç
        setSupportMultipleWindows={true}
        onOpenWindow={(syntheticEvent) => {
          const { targetUrl } = syntheticEvent.nativeEvent;
          if (targetUrl) {
            // İlan detayı da olsa, PDF de olsa YENİ SEKME yerine MEVCUT sekmede aç.
            // Bu sayede çerezler korunur ve Android indirmeyi başarıyla başlatır.
            webViewRef.current?.injectJavaScript(`window.location.href = '${targetUrl}';`);
          }
        }}

        // Çerez, Session ve Storage Ayarları
        sharedCookiesEnabled={true}
        thirdPartyCookiesEnabled={true}
        domStorageEnabled={true}
        javaScriptEnabled={true}
        cacheEnabled={true}
        cacheMode="LOAD_DEFAULT"
        allowsBackForwardNavigationGestures={true}
        allowsLinkPreview={false}
        originWhitelist={['*']}

        // SBB Bot korumasını aşmak için güncel UserAgent
        userAgent={Platform.OS === 'android'
          ? 'Mozilla/5.0 (Linux; Android 13; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36'
          : 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.4 Mobile/15E148 Safari/604.1'
        }

        startInLoadingState={true}
        renderLoading={() => (
          <View style={[styles.loadingOverlay, { backgroundColor: `${colors.background}CC` }]}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        )}
      />

      {loading && (
        <View style={styles.loadingBarContainer}>
          <View style={[styles.loadingBar, { backgroundColor: colors.primary }]} />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, paddingVertical: 12, borderBottomWidth: 1, minHeight: 56 },
  headerButton: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  headerButtonActive: { opacity: 1 },
  headerCenter: { flex: 1, alignItems: 'center', paddingHorizontal: 8 },
  urlContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  loadingIndicator: { marginRight: 8 },
  urlTextContainer: { flexDirection: 'row', alignItems: 'center' },
  lockIcon: { marginRight: 4 },
  globeIcon: { marginLeft: 4 },
  headerRight: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  navBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, gap: 8 },
  navButton: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  navButtonDisabled: { opacity: 0.5 },
  urlDisplay: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 18, marginLeft: 8, minHeight: 36, gap: 6 },
  urlIcon: { marginRight: 0 },
  urlText: { fontSize: 13, flex: 1 },
  webview: { flex: 1, backgroundColor: 'transparent' },
  loadingOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' },
  loadingBarContainer: { position: 'absolute', top: 0, left: 0, right: 0, height: 3, backgroundColor: 'transparent' },
  loadingBar: { height: '100%', width: '30%', borderRadius: 2 },
});