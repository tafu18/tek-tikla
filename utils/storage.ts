import AsyncStorage from '@react-native-async-storage/async-storage';

export interface WebSite {
  id: string;
  name: string;
  url: string;
  password?: string; // Şifre koruması için (opsiyonel)
  createdAt: number;
}

const STORAGE_KEY = '@tek_tikla_websites';
const PASSWORD_CACHE_KEY = '@tek_tikla_password_cache'; // Şifre cache için

// Şifre doğrulama cache'i (1 gün geçerli)
export async function setPasswordCache(websiteId: string): Promise<void> {
  try {
    const cache = await AsyncStorage.getItem(PASSWORD_CACHE_KEY);
    const cacheData = cache ? JSON.parse(cache) : {};
    cacheData[websiteId] = Date.now() + (24 * 60 * 60 * 1000); // 1 gün sonra
    await AsyncStorage.setItem(PASSWORD_CACHE_KEY, JSON.stringify(cacheData));
  } catch (error) {
    console.error('Error setting password cache:', error);
  }
}

export async function isPasswordCached(websiteId: string): Promise<boolean> {
  try {
    const cache = await AsyncStorage.getItem(PASSWORD_CACHE_KEY);
    if (!cache) return false;
    const cacheData = JSON.parse(cache);
    const expiryTime = cacheData[websiteId];
    if (!expiryTime) return false;
    // Süre dolmuş mu kontrol et
    if (Date.now() > expiryTime) {
      // Süresi dolmuş, cache'den sil
      delete cacheData[websiteId];
      await AsyncStorage.setItem(PASSWORD_CACHE_KEY, JSON.stringify(cacheData));
      return false;
    }
    return true;
  } catch (error) {
    console.error('Error checking password cache:', error);
    return false;
  }
}

export async function clearPasswordCache(websiteId?: string): Promise<void> {
  try {
    if (websiteId) {
      // Belirli bir site için cache'i temizle
      const cache = await AsyncStorage.getItem(PASSWORD_CACHE_KEY);
      if (cache) {
        const cacheData = JSON.parse(cache);
        delete cacheData[websiteId];
        await AsyncStorage.setItem(PASSWORD_CACHE_KEY, JSON.stringify(cacheData));
      }
    } else {
      // Tüm cache'i temizle
      await AsyncStorage.removeItem(PASSWORD_CACHE_KEY);
    }
  } catch (error) {
    console.error('Error clearing password cache:', error);
  }
}

export async function getWebSites(): Promise<WebSite[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error loading websites:', error);
    return [];
  }
}

export async function saveWebSite(website: Omit<WebSite, 'id' | 'createdAt'>): Promise<WebSite> {
  try {
    const websites = await getWebSites();
    const formattedUrl = formatUrl(website.url);
    
    // Aynı URL kontrolü (path dahil tam URL karşılaştırması)
    const urlExists = websites.some((w) => {
      const existingUrl = formatUrl(w.url);
      return existingUrl === formattedUrl;
    });
    
    if (urlExists) {
      throw new Error('Bu URL zaten eklenmiş.');
    }
    
    const newWebsite: WebSite = {
      ...website,
      id: Date.now().toString(),
      createdAt: Date.now(),
    };
    websites.push(newWebsite);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(websites));
    return newWebsite;
  } catch (error) {
    console.error('Error saving website:', error);
    throw error;
  }
}

export async function updateWebSite(id: string, updates: Partial<Omit<WebSite, 'id' | 'createdAt'>>): Promise<void> {
  try {
    const websites = await getWebSites();
    const index = websites.findIndex((w) => w.id === id);
    if (index !== -1) {
      // Şifre undefined ise sil
      const updatedWebsite = { ...websites[index], ...updates };
      if (updates.password === undefined) {
        delete updatedWebsite.password;
      }
      websites[index] = updatedWebsite;
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(websites));
    }
  } catch (error) {
    console.error('Error updating website:', error);
    throw error;
  }
}

export async function deleteWebSite(id: string): Promise<void> {
  try {
    const websites = await getWebSites();
    const filtered = websites.filter((w) => w.id !== id);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Error deleting website:', error);
    throw error;
  }
}

export function formatUrl(url: string): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  return `https://${url}`;
}

export function getFaviconUrl(url: string): string {
  try {
    const formattedUrl = formatUrl(url);
    const urlObj = new URL(formattedUrl);
    const domain = urlObj.hostname.replace('www.', '');
    
    // Google Favicon API - daha büyük boyut için sz parametresi
    return `https://icons.duckduckgo.com/ip3/${domain}.ico`;

  } catch (error) {
    console.error('Error generating favicon URL:', error);
    // Hata durumunda boş string döndür
    return '';
  }
}

// Alternatif favicon URL'leri (fallback için)
export function getFaviconUrlAlternatives(url: string): string[] {
  try {
    const formattedUrl = formatUrl(url);
    const urlObj = new URL(formattedUrl);
    const domain = urlObj.hostname.replace('www.', '');
    const protocol = urlObj.protocol;
    const hostname = urlObj.hostname;
    
    return [
      // Google Favicon API
      `https://www.google.com/s2/favicons?domain=${domain}&sz=64`,
      // DuckDuckGo Favicon API
      `https://icons.duckduckgo.com/ip3/${domain}.ico`,
      // Direkt domain'den favicon.ico
      `${protocol}//${hostname}/favicon.ico`,
      // www olmadan
      `${protocol}//${domain}/favicon.ico`,
    ];
  } catch (error) {
    return [];
  }
}

export function getDomainFromUrl(url: string): string {
  try {
    const formattedUrl = formatUrl(url);
    const urlObj = new URL(formattedUrl);
    return urlObj.hostname.replace('www.', '');
  } catch (error) {
    return url;
  }
}

// Yasaklı içerik kontrolü
const BLOCKED_KEYWORDS = [
  // Porno içerik
  'porn', 'xxx', 'sex', 'adult', 'nsfw', 'erotic', 'nude', 'naked',
  'pornhub', 'xvideos', 'xnxx', 'redtube', 'youporn', 'tube8',
  // Alkol
  'alcohol', 'beer', 'wine', 'vodka', 'whiskey', 'rum', 'gin',
  'liquor', 'drink', 'cocktail', 'bar', 'pub',
  // Müstehcenlik
  'explicit', 'mature', '18+', 'adult-content', 'xxx-content',
  // Kumar
  'casino', 'gambling', 'bet', 'poker', 'slot', 'lottery',
  // Diğer yasaklı içerikler
  'drug', 'cannabis', 'marijuana', 'cocaine', 'heroin',
];

const BLOCKED_DOMAINS = [
  'pornhub.com',
  'xvideos.com',
  'xnxx.com',
  'redtube.com',
  'youporn.com',
  'tube8.com',
  'xhamster.com',
  'chaturbate.com',
];

export function isUrlBlocked(url: string, name?: string): { blocked: boolean; reason?: string } {
  try {
    const formattedUrl = formatUrl(url);
    const urlLower = formattedUrl.toLowerCase();
    const nameLower = (name || '').toLowerCase();
    const combined = `${urlLower} ${nameLower}`;
    
    // Domain kontrolü
    const urlObj = new URL(formattedUrl);
    const domain = urlObj.hostname.replace('www.', '').toLowerCase();
    
    for (const blockedDomain of BLOCKED_DOMAINS) {
      if (domain.includes(blockedDomain) || blockedDomain.includes(domain)) {
        return {
          blocked: true,
          reason: 'Bu site yasaklı içerik kategorisinde yer almaktadır.',
        };
      }
    }
    
    // Keyword kontrolü
    for (const keyword of BLOCKED_KEYWORDS) {
      if (combined.includes(keyword)) {
        return {
          blocked: true,
          reason: 'Bu site yasaklı içerik kategorisinde yer almaktadır.',
        };
      }
    }
    
    return { blocked: false };
  } catch (error) {
    // URL parse hatası durumunda engelleme yapma
    return { blocked: false };
  }
}

