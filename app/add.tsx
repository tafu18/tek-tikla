import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { formatUrl, getWebSites, saveWebSite, updateWebSite, isUrlBlocked } from '../utils/storage';

export default function AddScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [password, setPassword] = useState('');
  const [hasPassword, setHasPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (params.id) {
      loadWebsite();
    }
  }, [params.id]);

  const loadWebsite = async () => {
    try {
      const websites = await getWebSites();
      const website = websites.find((w) => w.id === params.id);
      if (website) {
        setName(website.name);
        setUrl(website.url);
        setHasPassword(!!website.password);
        setIsEditing(true);
      }
    } catch (error) {
      Alert.alert('Hata', 'Web sitesi yüklenirken bir hata oluştu.');
    }
  };

  const validateUrl = (urlString: string): boolean => {
    try {
      const formatted = formatUrl(urlString);
      new URL(formatted);
      return true;
    } catch {
      return false;
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Hata', 'Lütfen bir isim girin.');
      return;
    }

    if (!url.trim()) {
      Alert.alert('Hata', 'Lütfen bir URL girin.');
      return;
    }

    if (!validateUrl(url)) {
      Alert.alert('Hata', 'Geçerli bir URL girin.');
      return;
    }

    // Yasaklı içerik kontrolü
    const blockCheck = isUrlBlocked(url, name);
    if (blockCheck.blocked) {
      Alert.alert(
        'Yasaklı İçerik',
        blockCheck.reason || 'Bu site eklenemez. Lütfen farklı bir site deneyin.',
        [{ text: 'Tamam' }]
      );
      return;
    }

    try {
      setLoading(true);
      const formattedUrl = formatUrl(url);

      const websiteData: any = { 
        name: name.trim(), 
        url: formattedUrl 
      };

      // Şifre varsa ekle, yoksa veya kaldırılmışsa undefined yap
      if (hasPassword && password.trim()) {
        websiteData.password = password.trim();
      } else if (isEditing && !hasPassword) {
        // Düzenleme modunda şifre kaldırılmışsa undefined gönder
        websiteData.password = undefined;
      }

      if (isEditing && params.id) {
        await updateWebSite(params.id, websiteData);
      } else {
        await saveWebSite(websiteData);
      }

      router.back();
    } catch (error: any) {
      const errorMessage = error?.message || 'Kayıt işlemi başarısız oldu.';
      Alert.alert('Hata', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {isEditing ? 'Düzenle' : 'Yeni Web Sitesi'}
          </Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>İsim</Text>
              <View style={[styles.inputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="Örn: Tek Tıkla"
                  placeholderTextColor={colors.textSecondary}
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                  autoFocus
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>URL</Text>
              <View style={[styles.inputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Ionicons name="globe-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="Örn: tektikla.com"
                  placeholderTextColor={colors.textSecondary}
                  value={url}
                  onChangeText={setUrl}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.passwordHeader}>
                <Text style={[styles.label, { color: colors.text }]}>Şifre Koruması</Text>
                <TouchableOpacity
                  onPress={() => {
                    setHasPassword(!hasPassword);
                    if (!hasPassword) {
                      setPassword('');
                    }
                  }}
                  style={styles.switchContainer}
                >
                  <View style={[styles.switch, hasPassword && { backgroundColor: colors.primary }]}>
                    <View style={[styles.switchThumb, hasPassword && styles.switchThumbActive]} />
                  </View>
                </TouchableOpacity>
              </View>
              {hasPassword && (
                <View style={[styles.inputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Ionicons name="lock-closed-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    placeholder="Şifre girin (opsiyonel)"
                    placeholderTextColor={colors.textSecondary}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
              )}
            </View>

            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: colors.primary }, loading && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.saveButtonText}>Kaydet</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  placeholder: {
    width: 32,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  form: {
    flex: 1,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 24, // Card ile aynı
    borderWidth: 1, // Card ile aynı
    paddingHorizontal: 16,
    minHeight: 56,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 }, // Card ile aynı
    shadowOpacity: 0.05, // Card ile aynı
    shadowRadius: 8, // Card ile aynı
    elevation: 2, // Card ile aynı
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 16,
  },
  saveButton: {
    borderRadius: 24, // Card ile aynı
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    minHeight: 56,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 }, // Card ile aynı
    shadowOpacity: 0.1, // Biraz daha belirgin
    shadowRadius: 8,
    elevation: 3,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  passwordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  switchContainer: {
    padding: 4,
  },
  switch: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  switchThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  switchThumbActive: {
    transform: [{ translateX: 20 }],
  },
});

