import { Ionicons } from '@expo/vector-icons';
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
import { useTheme } from '../../contexts/ThemeContext';
import { formatUrl, getWebSites } from '../../utils/storage';

export default function WebViewScreen() {
  const { colors } = useTheme();
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
        const formattedUrl = formatUrl(website.url);
        setUrl(formattedUrl);
        setTitle(website.name);
      } else {
        Alert.alert('Hata', 'Web sitesi bulunamadı.', [
          { text: 'Tamam', onPress: () => router.back() },
        ]);
      }
    } catch (error) {
      console.error('Error loading website:', error);
      Alert.alert('Hata', 'Web sitesi yüklenirken bir hata oluştu.', [
        { text: 'Tamam', onPress: () => router.back() },
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

  const handleNavigationStateChange = (navState: any) => {
    setCanGoBack(navState.canGoBack);
    setCanGoForward(navState.canGoForward);
    setCurrentUrl(navState.url);
    setTitle(navState.title || title);
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

  const handleLoadStart = () => {
    setLoading(true);
  };

  const handleLoadEnd = () => {
    setLoading(false);
  };

  const handleError = (syntheticEvent: any) => {
    const { nativeEvent } = syntheticEvent;
    console.error('WebView error: ', nativeEvent);
    setLoading(false);
    
    // Bazı hataları kullanıcıya göstermeyelim (ör: network timeout)
    if (!nativeEvent.description?.includes('net::ERR')) {
      Alert.alert(
        'Yükleme Hatası',
        'Web sayfası yüklenirken bir hata oluştu. Lütfen internet bağlantınızı kontrol edin.',
        [{ text: 'Tamam' }]
      );
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
        <TouchableOpacity
          onPress={handleBack}
          style={styles.headerButton}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <TouchableOpacity
            style={styles.urlContainer}
            activeOpacity={0.7}
            onPress={() => {
              // URL'yi göster/kopyala vs. yapılabilir
            }}
          >
            {loading && (
              <ActivityIndicator
                size="small"
                color={colors.primary}
                style={styles.loadingIndicator}
              />
            )}
            <View style={styles.urlTextContainer}>
              {currentUrl && currentUrl.startsWith('https://') && (
                <Ionicons name="lock-closed" size={14} color={colors.primary} style={styles.lockIcon} />
              )}
              <Ionicons name="globe-outline" size={14} color={colors.textSecondary} style={styles.globeIcon} />
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity
            onPress={handleRefresh}
            style={[styles.headerButton, !loading && styles.headerButtonActive]}
            activeOpacity={0.7}
            disabled={loading}
          >
            <Ionicons
              name={loading ? 'hourglass-outline' : 'refresh'}
              size={22}
              color={loading ? colors.textSecondary : colors.text}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Navigation Bar */}
      <View style={[styles.navBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={handleBack}
          style={[
            styles.navButton,
            { backgroundColor: colors.card },
            !canGoBack && styles.navButtonDisabled,
          ]}
          activeOpacity={0.7}
          disabled={!canGoBack}
        >
          <Ionicons
            name="chevron-back"
            size={20}
            color={canGoBack ? colors.text : colors.textSecondary}
          />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleForward}
          style={[
            styles.navButton,
            { backgroundColor: colors.card },
            !canGoForward && styles.navButtonDisabled,
          ]}
          activeOpacity={0.7}
          disabled={!canGoForward}
        >
          <Ionicons
            name="chevron-forward"
            size={20}
            color={canGoForward ? colors.text : colors.textSecondary}
          />
        </TouchableOpacity>

        <View style={[styles.urlDisplay, { backgroundColor: colors.card }]}>
          {currentUrl ? (
            <>
              {currentUrl.startsWith('https://') && (
                <Ionicons name="lock-closed" size={12} color={colors.primary} style={styles.urlIcon} />
              )}
              {!currentUrl.startsWith('https://') && (
                <Ionicons name="globe-outline" size={12} color={colors.textSecondary} style={styles.urlIcon} />
              )}
              <Text
                style={[styles.urlText, { color: colors.textSecondary }]}
                numberOfLines={1}
                ellipsizeMode="middle"
              >
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
        onNavigationStateChange={handleNavigationStateChange}
        onLoadStart={handleLoadStart}
        onLoadEnd={handleLoadEnd}
        onError={handleError}
        // Cookie ve Session Yönetimi
        sharedCookiesEnabled={true} // iOS: Safari cookie store ile paylaşır
        thirdPartyCookiesEnabled={true} // Android: 3. parti cookie'lere izin verir
        cacheEnabled={true} // Cache'i etkinleştir
        cacheMode="LOAD_DEFAULT" // Android: Default cache modu
        incognito={false} // Private mode kapalı - cookie'ler korunur
        // iOS Özel Ayarlar
        allowsBackForwardNavigationGestures={true} // Swipe ile geri/ileri
        allowsLinkPreview={false} // Link preview'i kapat
        // Android Özel Ayarlar
        domStorageEnabled={true} // LocalStorage ve SessionStorage etkin
        javaScriptEnabled={true} // JavaScript etkin
        // Güvenlik
        originWhitelist={['*']} // Tüm origin'lere izin ver
        // Performans
        startInLoadingState={true}
        renderLoading={() => (
          <View style={[styles.loadingOverlay, { backgroundColor: `${colors.background}CC` }]}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        )}
        // User Agent (Opsiyonel - gerekirse değiştirilebilir)
        userAgent={Platform.select({
          ios: undefined, // iOS varsayılan user agent
          android: undefined, // Android varsayılan user agent
        })}
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
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderBottomWidth: 1,
    minHeight: 56,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerButtonActive: {
    opacity: 1,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  urlContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingIndicator: {
    marginRight: 8,
  },
  urlTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lockIcon: {
    marginRight: 4,
  },
  globeIcon: {
    marginLeft: 4,
  },
  headerRight: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    gap: 8,
  },
  navButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navButtonDisabled: {
    opacity: 0.5,
  },
  urlDisplay: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    marginLeft: 8,
    minHeight: 36,
    gap: 6,
  },
  urlIcon: {
    marginRight: 0,
  },
  urlText: {
    fontSize: 13,
    flex: 1,
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingBarContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: 'transparent',
  },
  loadingBar: {
    height: '100%',
    width: '30%',
    borderRadius: 2,
  },
});
