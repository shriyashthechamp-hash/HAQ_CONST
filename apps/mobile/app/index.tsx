import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../src/theme/colors';
import { useApp } from '../src/context/AppContext';
import { HeaderBar } from '../src/components/HeaderBar';
import { BottomNav } from '../src/components/BottomNav';
import { Language } from '@haq/shared';

export default function WelcomeScreen() {
  const router = useRouter();
  const { language, setLanguage, t } = useApp();

  const languages: { code: Language; label: string; nativeName: string }[] = [
    { code: 'mr', label: 'मराठी', nativeName: 'Marathi' },
    { code: 'hi', label: 'हिन्दी', nativeName: 'Hindi' },
    { code: 'en', label: 'English', nativeName: 'English' },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <HeaderBar showLanguageToggle={false} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Geometric Construction Motif */}
        <View style={styles.motifHero}>
          <View style={styles.geometricFrame}>
            <View style={styles.gridLineHorizontal} />
            <View style={styles.gridLineVertical} />
            <View style={styles.diamondOuter}>
              <View style={styles.diamondInner} />
            </View>
            <View style={styles.bracketTopLeft} />
            <View style={styles.bracketBottomRight} />
          </View>

          <Text style={styles.heroWordmark}>HAQ</Text>
          <Text style={styles.heroTagline}>{t('tagline')}</Text>
          <Text style={styles.heroTaglineSub}>{t('taglineEn')}</Text>
          <Text style={styles.heroSubcopy}>{t('subcopy')}</Text>
        </View>

        {/* Language Selection Card */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>{t('welcomeSelectLanguage')}</Text>
          <View style={styles.langSelectorRow}>
            {languages.map((item) => {
              const isSelected = language === item.code;
              return (
                <TouchableOpacity
                  key={item.code}
                  onPress={() => setLanguage(item.code)}
                  style={[styles.langChoiceCard, isSelected && styles.langChoiceCardSelected]}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel={`Select ${item.label}`}
                >
                  <View style={[styles.langRadio, isSelected && styles.langRadioSelected]}>
                    {isSelected && <View style={styles.langRadioDot} />}
                  </View>
                  <Text style={[styles.langLabel, isSelected && styles.langLabelSelected]}>
                    {item.label}
                  </Text>
                  <Text style={styles.langSubLabel}>{item.nativeName}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Feature Cards Grid */}
        <View style={styles.featuresContainer}>
          <View style={styles.featureItem}>
            <View style={styles.featureIconBox}>
              <Text style={styles.featureIcon}>📋</Text>
            </View>
            <View style={styles.featureTextBox}>
              <Text style={styles.featureTitle}>{t('welcomeFeature1Title')}</Text>
              <Text style={styles.featureDesc}>{t('welcomeFeature1Desc')}</Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <View style={styles.featureIconBox}>
              <Text style={styles.featureIcon}>📑</Text>
            </View>
            <View style={styles.featureTextBox}>
              <Text style={styles.featureTitle}>{t('welcomeFeature2Title')}</Text>
              <Text style={styles.featureDesc}>{t('welcomeFeature2Desc')}</Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <View style={styles.featureIconBox}>
              <Text style={styles.featureIcon}>🤖</Text>
            </View>
            <View style={styles.featureTextBox}>
              <Text style={styles.featureTitle}>{t('welcomeFeature3Title')}</Text>
              <Text style={styles.featureDesc}>{t('welcomeFeature3Desc')}</Text>
            </View>
          </View>
        </View>

        {/* Prominent Construction Orange Get Started Button */}
        <TouchableOpacity
          onPress={() => router.push('/eligibility')}
          style={styles.primaryButton}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={t('getStarted')}
        >
          <Text style={styles.primaryButtonText}>{t('getStarted')}</Text>
          <Text style={styles.primaryButtonArrow}>→</Text>
        </TouchableOpacity>

        {/* Privacy Note */}
        <View style={styles.privacyBox}>
          <Text style={styles.privacyLockIcon}>🔒</Text>
          <Text style={styles.privacyText}>{t('welcomeNoAccountNeeded')}</Text>
        </View>
      </ScrollView>

      <BottomNav />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },
  motifHero: {
    alignItems: 'center',
    marginVertical: 18,
  },
  geometricFrame: {
    width: 84,
    height: 84,
    backgroundColor: Colors.surface,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Colors.borderHighlight,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginBottom: 16,
  },
  gridLineHorizontal: {
    position: 'absolute',
    width: '100%',
    height: 1,
    backgroundColor: 'rgba(255, 107, 44, 0.2)',
  },
  gridLineVertical: {
    position: 'absolute',
    height: '100%',
    width: 1,
    backgroundColor: 'rgba(255, 107, 44, 0.2)',
  },
  diamondOuter: {
    width: 36,
    height: 36,
    borderWidth: 2,
    borderColor: Colors.constructionOrange,
    transform: [{ rotate: '45deg' }],
    justifyContent: 'center',
    alignItems: 'center',
  },
  diamondInner: {
    width: 16,
    height: 16,
    backgroundColor: Colors.constructionOrange,
  },
  bracketTopLeft: {
    position: 'absolute',
    top: 6,
    left: 6,
    width: 8,
    height: 8,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderColor: '#60A5FA',
  },
  bracketBottomRight: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    width: 8,
    height: 8,
    borderBottomWidth: 2,
    borderRightWidth: 2,
    borderColor: '#60A5FA',
  },
  heroWordmark: {
    fontSize: 40,
    fontWeight: '900',
    color: Colors.textPrimary,
    letterSpacing: 4,
    marginBottom: 4,
  },
  heroTagline: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.constructionOrange,
    marginBottom: 2,
  },
  heroTaglineSub: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  heroSubcopy: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 16,
  },
  sectionCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    marginVertical: 14,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 14,
    textAlign: 'center',
  },
  langSelectorRow: {
    flexDirection: 'row',
    gap: 10,
  },
  langChoiceCard: {
    flex: 1,
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  langChoiceCardSelected: {
    borderColor: Colors.constructionOrange,
    backgroundColor: Colors.constructionOrangeGlow,
  },
  langRadio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: Colors.textMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  langRadioSelected: {
    borderColor: Colors.constructionOrange,
  },
  langRadioDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: Colors.constructionOrange,
  },
  langLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  langLabelSelected: {
    color: Colors.textPrimary,
  },
  langSubLabel: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  featuresContainer: {
    gap: 10,
    marginVertical: 10,
  },
  featureItem: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  featureIconBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: Colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.borderHighlight,
  },
  featureIcon: {
    fontSize: 22,
  },
  featureTextBox: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  featureDesc: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 17,
  },
  primaryButton: {
    backgroundColor: Colors.constructionOrange,
    borderRadius: 16,
    minHeight: 56,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    marginTop: 18,
    marginBottom: 12,
    shadowColor: Colors.constructionOrange,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  primaryButtonArrow: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
  },
  privacyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
  },
  privacyLockIcon: {
    fontSize: 12,
  },
  privacyText: {
    fontSize: 11,
    color: Colors.textMuted,
    textAlign: 'center',
  },
});
