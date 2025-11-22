import AsyncStorage from '@react-native-async-storage/async-storage';

export interface WebSite {
  id: string;
  name: string;
  url: string;
  password?: string; // Şifre koruması için (opsiyonel)
  createdAt: number;
  order?: number; // Sıralama için
  isDefault?: boolean; // Varsayılan site - silinemez
}

const STORAGE_KEY = '@tek_tikla_websites';
const PASSWORD_CACHE_KEY = '@tek_tikla_password_cache'; // Şifre cache için
const INITIALIZED_KEY = '@tek_tikla_initialized'; // İlk kurulum kontrolü için

// Varsayılan siteler
const DEFAULT_WEBSITES: Omit<WebSite, 'id' | 'createdAt' | 'order'>[] = [

    {
    name: 'Vakt-i Huzur',
    url: 'https://vaktihuzur.com.tr/',
    isDefault: true,
  },
  {
    name: 'Tayfun Taşdemir',
    url: 'https://tayfuntasdemir.com.tr/',
    isDefault: true,
  }

];

// Şifre doğrulama cache'i (1 gün geçerli)
export async function setPasswordCache(websiteId: string): Promise<void> {
  try {
    const cache = await AsyncStorage.getItem(PASSWORD_CACHE_KEY);
    const cacheData = cache ? JSON.parse(cache) : {};
    cacheData[websiteId] = Date.now() + (24 * 60 * 60 * 1000); // 1 gün sonra
    await AsyncStorage.setItem(PASSWORD_CACHE_KEY, JSON.stringify(cacheData));
  } catch (error) {
    if (__DEV__) {
      console.error('Error setting password cache:', error);
    }
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
    if (__DEV__) {
      console.error('Error checking password cache:', error);
    }
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
    if (__DEV__) {
      console.error('Error clearing password cache:', error);
    }
  }
}

export async function getWebSites(): Promise<WebSite[]> {
  try {
    // İlk kurulum kontrolü
    const initialized = await AsyncStorage.getItem(INITIALIZED_KEY);
    if (!initialized) {
      // İlk kurulum - varsayılan siteleri ekle
      const now = Date.now();
      const defaultWebsites: WebSite[] = DEFAULT_WEBSITES.map((site, index) => ({
        ...site,
        id: `default-${index}`,
        createdAt: now + index,
        order: now + index,
      }));
      
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(defaultWebsites));
      await AsyncStorage.setItem(INITIALIZED_KEY, 'true');
      return defaultWebsites;
    }

    const data = await AsyncStorage.getItem(STORAGE_KEY);
    let websites: WebSite[] = data ? JSON.parse(data) : [];
    
    // Varsayılan sitelerin hala mevcut olduğundan emin ol
    const defaultUrls = DEFAULT_WEBSITES.map(site => formatUrl(site.url));
    const existingUrls = websites.map(site => formatUrl(site.url));
    
    const missingDefaults: WebSite[] = [];
    DEFAULT_WEBSITES.forEach((site, index) => {
      const formattedUrl = formatUrl(site.url);
      if (!existingUrls.includes(formattedUrl)) {
        const now = Date.now();
        missingDefaults.push({
          ...site,
          id: `default-${Date.now()}-${index}`,
          createdAt: now + index,
          order: now + index,
        });
      }
    });
    
    // Eksik varsayılan siteleri ekle
    if (missingDefaults.length > 0) {
      websites = [...missingDefaults, ...websites];
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(websites));
    }
    
    // Order'a göre sırala, yoksa createdAt'e göre
    return websites.sort((a: WebSite, b: WebSite) => {
      const orderA = a.order ?? a.createdAt;
      const orderB = b.order ?? b.createdAt;
      return orderA - orderB;
    });
  } catch (error) {
    if (__DEV__) {
      console.error('Error loading websites:', error);
    }
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
      const existingWebsite = websites.find((w) => {
        const existingUrl = formatUrl(w.url);
        return existingUrl === formattedUrl;
      });
      const error: any = new Error('DUPLICATE_URL');
      error.existingWebsite = existingWebsite;
      throw error;
    }
    
    const now = Date.now();
    const newWebsite: WebSite = {
      ...website,
      id: now.toString(),
      createdAt: now,
      order: websites.length > 0 ? Math.max(...websites.map(w => w.order ?? w.createdAt)) + 1 : now,
    };
    websites.push(newWebsite);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(websites));
    return newWebsite;
  } catch (error: any) {
    // Beklenen hatalar için konsola loglama yapma (DUPLICATE_URL gibi)
    if (__DEV__ && error?.message !== 'DUPLICATE_URL') {
      console.error('Error saving website:', error);
    }
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
    if (__DEV__) {
      console.error('Error updating website:', error);
    }
    throw error;
  }
}

export async function deleteWebSite(id: string): Promise<void> {
  try {
    const websites = await getWebSites();
    const website = websites.find((w) => w.id === id);
    
    // Varsayılan siteler silinemez
    if (website?.isDefault) {
      throw new Error('DEFAULT_WEBSITE_CANNOT_BE_DELETED');
    }
    
    const filtered = websites.filter((w) => w.id !== id);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    
    // Şifre cache'ini de temizle
    await clearPasswordCache(id);
  } catch (error) {
    if (__DEV__) {
      console.error('Error deleting website:', error);
    }
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
    if (__DEV__) {
      console.error('Error generating favicon URL:', error);
    }
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

// Websites sırasını güncelle
export async function reorderWebSites(newOrder: string[]): Promise<void> {
  try {
    const websites = await getWebSites();
    const websiteMap = new Map(websites.map(w => [w.id, w]));
    
    // Yeni sıralamaya göre order'ları güncelle
    const reordered: WebSite[] = [];
    newOrder.forEach((id, index) => {
      const website = websiteMap.get(id);
      if (website) {
        reordered.push({ ...website, order: index });
      }
    });
    
    // Eksik olanları ekle (silinenler olabilir)
    websites.forEach(w => {
      if (!newOrder.includes(w.id)) {
        reordered.push({ ...w, order: reordered.length });
      }
    });
    
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(reordered));
  } catch (error) {
    if (__DEV__) {
      console.error('Error reordering websites:', error);
    }
    throw error;
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

