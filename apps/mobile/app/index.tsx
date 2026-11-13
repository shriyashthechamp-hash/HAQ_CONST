import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  RefreshControl,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../src/theme/colors';
import { Typography } from '../src/theme/typography';
import { Spacing, Radius, Shadows } from '../src/theme/spacing';
import { useApp } from '../src/context/AppContext';
import { HeaderBar } from '../src/components/HeaderBar';
import { BottomNav } from '../src/components/BottomNav';
import { SchemeCard } from '../src/components/SchemeCard';
import { ChecklistOfflineService } from '../src/services/checklistCache';
import { ApiService } from '../src/services/api';

export default function HomeDashboardScreen() {
  const router = useRouter();
  const { sessionId, language, t } = useApp();

  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [checklistProgress, setChecklistProgress] = useState<number>(0);
  const [totalDocs, setTotalDocs] = useState<number>(0);
  const [availableDocs, setAvailableDocs] = useState<number>(0);
  const [currentStageLabel, setCurrentStageLabel] = useState<string>('');
  const [whatToDoNext, setWhatToDoNext] = useState<string>('');

  useEffect(() => {
    loadDashboardData();
  }, [sessionId, language]);

  const loadDashboardData = async () => {
    try {
      // 1. Load actual document checklist state
      const checklist = await ChecklistOfflineService.loadCachedChecklist(sessionId);
      setChecklistProgress(checklist.progressPercent || 0);
      setTotalDocs(checklist.items.length);
      const available = checklist.items.filter((i) => i.status === 'AVAILABLE').length;
      setAvailableDocs(available);

      // 2. Load actual journey stage
      const journey = await ApiService.getJourney(sessionId);
      if (journey) {
        const nextText =
          language === 'mr'
            ? journey.whatToDoNext.mr
            : language === 'hi'
            ? journey.whatToDoNext.hi
            : journey.whatToDoNext.en;
        setWhatToDoNext(nextText);

        const stageName =
          journey.currentStage === 'ELIGIBILITY_GUIDANCE'
            ? t('stage1')
            : journey.currentStage === 'DOCUMENT_PREPARATION'
            ? t('stage2')
            : journey.currentStage === 'PORTAL_HANDOFF'
            ? t('stage3')
            : journey.currentStage === 'SUBMITTED'
            ? t('stage4')
            : t('stage5');
        setCurrentStageLabel(stageName);
      }
    } catch {
      // Fallback sensible defaults matching actual local state
      setWhatToDoNext(
        language === 'mr'
          ? 'कागदपत्र चेकलिस्टमध्ये तुमचे ९० दिवस कामाचे प्रमाणपत्र (फॉर्म-५) तयार करा.'
          : language === 'hi'
          ? 'दस्तावेज चेकलिस्ट में अपना ९० दिन कार्य प्रमाण पत्र (फॉर्म-५) तैयार करें।'
          : 'Prepare your 90-day work certificate (Form-V) in the Document Checklist.'
      );
      setCurrentStageLabel(t('stage2'));
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const quickServices = [
    {
      id: 'eligibility',
      title: language === 'mr' ? 'पात्रता तपासा' : language === 'hi' ? 'पात्रता जांच' : 'Check Eligibility',
      desc: language === 'mr' ? 'वय १८-६० व ९० दिवस काम' : language === 'hi' ? 'आयु १८-६० व ९० दिन' : 'Age 18-60 & 90 days',
      icon: 'shield-checkmark-outline' as const,
      route: '/eligibility',
      accentColor: Colors.saffronOrange,
    },
    {
      id: 'documents',
      title: language === 'mr' ? 'कागदपत्रे चेकलिस्ट' : language === 'hi' ? 'दस्तावेज चेकलिस्ट' : 'Document Checklist',
      desc: language === 'mr' ? 'आधार, फोटो व पासबुक' : language === 'hi' ? 'आधार, फोटो व पासबुक' : 'Aadhaar, Photos, Bank',
      icon: 'document-text-outline' as const,
      route: '/documents',
      accentColor: '#2563EB',
    },
    {
      id: 'form-v',
      title: t('formVNavTitle'),
      desc: t('formVNavDesc'),
      icon: 'document-attach-outline' as const,
      route: '/form-v',
      accentColor: '#059669',
      badge: language === 'mr' ? 'महत्त्वाचे' : language === 'hi' ? 'महत्वपूर्ण' : 'Essential',
    },
    {
      id: 'journey',
      title: language === 'mr' ? 'नोंदणी प्रवास' : language === 'hi' ? 'पंजीकरण यात्रा' : 'Journey Tracker',
      desc: language === 'mr' ? 'तयारी ते अधिकृत नोंदणी' : language === 'hi' ? 'तैयारी से पंजीकरण' : 'Steps to submission',
      icon: 'navigate-outline' as const,
      route: '/journey',
      accentColor: '#7C3AED',
    },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <HeaderBar />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {/* Modern Premium Hero Banner */}
        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View style={styles.sessionBadge}>
              <View style={styles.activeDot} />
              <Text style={styles.sessionBadgeText}>{t('activeSession')}</Text>
            </View>
            <Text style={styles.heroGovPill}>MAHABOCW • MH</Text>
          </View>

          <Text style={styles.heroGreeting}>
            {language === 'mr' ? 'आपला हक्क, तुमचा साथी' : language === 'hi' ? 'हक, आपका साथी' : 'Benefits, Unlocked.'}
          </Text>
          <Text style={styles.heroSubGreeting}>
            {language === 'mr'
              ? 'महाराष्ट्र इमारत व इतर बांधकाम कामगार मंडळाच्या कल्याणकारी योजनांचे अधिकृत मार्गदर्शन'
              : language === 'hi'
              ? 'महाराष्ट्र भवन एवं अन्य निर्माण श्रमिक कल्याण मंडल की योजनाओं का अधिकृत मार्गदर्शन'
              : 'Verified assistance for Maharashtra Building & Other Construction Workers'}
          </Text>

          {/* Prominent Saffron Voice Action Trigger */}
          <TouchableOpacity
            style={styles.voicePromptCard}
            onPress={() => router.push('/assistant')}
            activeOpacity={0.88}
            accessibilityRole="button"
            accessibilityLabel={t('dashboardVoicePrompt')}
          >
            <View style={styles.voiceIconHalo}>
              <Ionicons name="mic" size={24} color="#FFFFFF" />
            </View>
            <View style={styles.voicePromptTextWrap}>
              <Text style={styles.voicePromptTitle}>{t('dashboardVoicePrompt')}</Text>
              <Text style={styles.voicePromptSubtitle}>{t('dashboardVoiceSubtitle')}</Text>
            </View>
            <View style={styles.voiceArrowButton}>
              <Ionicons name="arrow-forward" size={18} color={Colors.primaryNavy} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Live Registration Progress & Next Action Card */}
        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <View>
              <Text style={styles.progressCardTitle}>{t('recentStatus')}</Text>
              <Text style={styles.progressStageSubtitle}>{currentStageLabel}</Text>
            </View>
            <View style={styles.progressBadge}>
              <Text style={styles.progressBadgeText}>{checklistProgress}%</Text>
            </View>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressBarTrack}>
            <View style={[styles.progressBarFill, { width: `${Math.max(10, checklistProgress)}%` }]} />
          </View>

          <View style={styles.progressStatsRow}>
            <Text style={styles.progressStatItem}>
              ✓ {availableDocs}/{totalDocs || 5} {language === 'mr' ? 'कागदपत्रे तयार' : language === 'hi' ? 'दस्तावेज तैयार' : 'documents ready'}
            </Text>
            <TouchableOpacity onPress={() => router.push('/documents')}>
              <Text style={styles.progressLink}>{t('proceedToChecklist')} →</Text>
            </TouchableOpacity>
          </View>

          {whatToDoNext ? (
            <View style={styles.nextActionBox}>
              <Ionicons name="compass-outline" size={18} color={Colors.accent} style={{ marginTop: 2 }} />
              <Text style={styles.nextActionText} numberOfLines={2}>
                {whatToDoNext}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Quick Actions Grid */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>{t('quickActions')}</Text>
        </View>

        <View style={styles.gridContainer}>
          {quickServices.map((service) => (
            <TouchableOpacity
              key={service.id}
              style={styles.gridCard}
              onPress={() => router.push(service.route as any)}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={service.title}
            >
              <View style={styles.gridTopRow}>
                <View style={[styles.gridIconWrap, { backgroundColor: `${service.accentColor}18` }]}>
                  <Ionicons name={service.icon} size={24} color={service.accentColor} />
                </View>
                {service.badge && (
                  <View style={styles.serviceBadge}>
                    <Text style={styles.serviceBadgeText}>{service.badge}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.gridCardTitle}>{service.title}</Text>
              <Text style={styles.gridCardDesc} numberOfLines={2}>
                {service.desc}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Major Welfare Schemes Showcase */}
        <View style={styles.sectionHeaderRow}>
          <View>
            <Text style={styles.sectionTitle}>{t('activeSchemes')}</Text>
            <Text style={styles.sectionSubtitle}>
              {language === 'mr'
                ? 'मंडळामार्फत मिळणारे प्रमुख वैधानिक लाभ'
                : language === 'hi'
                ? 'कल्याण मंडल द्वारा प्रमुख वैधानिक लाभ'
                : 'Core statutory benefits provided by MAHABOCW'}
            </Text>
          </View>
        </View>

        <SchemeCard
          id="scheme-nondani"
          title={t('schemeNondaniTitle')}
          description={
            language === 'mr'
              ? '१८ ते ६० वयोगटातील ९० दिवस काम केलेल्या कामगारांसाठी स्मार्ट कार्ड व नोंदणी.'
              : language === 'hi'
              ? '१८ से ६० आयु वर्ग में ९० दिन काम करने वाले श्रमिकों के लिए स्मार्ट कार्ड व पंजीयन।'
              : 'Smart registration card and lifetime welfare eligibility for workers completing 90 days work.'
          }
          benefitAmount={t('schemeNondaniBenefit')}
          categoryTag="REGISTRATION"
          eligibilityStatus="POTENTIALLY_ELIGIBLE"
          sourceId="MAHABOCW-REG-01"
          language={language}
          onPress={() => router.push('/eligibility')}
        />

        <SchemeCard
          id="scheme-awas"
          title={t('schemeAwasTitle')}
          description={
            language === 'mr'
              ? 'नोंदणीकृत बांधकाम कामगारांना स्वतःचे पक्के घर बांधण्यासाठी किंवा खरेदीसाठी आर्थिक अनुदान.'
              : language === 'hi'
              ? 'पंजीकृत श्रमिकों को अपना पक्का मकान बनाने अथवा खरीदने हेतु वित्तीय सहायता।'
              : 'Direct financial subsidy for registered construction workers to construct or purchase a permanent house.'
          }
          benefitAmount={t('schemeAwasBenefit')}
          categoryTag="HOUSING"
          eligibilityStatus="POTENTIALLY_ELIGIBLE"
          sourceId="MAHABOCW-SCH-AWAS"
          language={language}
          onPress={() => router.push('/assistant')}
        />

        <SchemeCard
          id="scheme-shikshan"
          title={t('schemeShikshanTitle')}
          description={
            language === 'mr'
              ? 'पहिली ते पदव्युत्तर शिक्षण घेणाऱ्या कामगारांच्या मुलांसाठी दरवर्षी थेट शिष्यवृत्ती.'
              : language === 'hi'
              ? 'कक्षा १ से उच्च शिक्षा प्राप्त करने वाले श्रमिक बच्चों हेतु प्रतिवर्ष छात्रवृत्ति।'
              : 'Annual educational financial grant deposited directly into children bank accounts from Class 1 to Post-Graduation.'
          }
          benefitAmount={t('schemeShikshanBenefit')}
          categoryTag="EDUCATION"
          eligibilityStatus="POTENTIALLY_ELIGIBLE"
          sourceId="MAHABOCW-SCH-EDU"
          language={language}
          onPress={() => router.push('/assistant')}
        />

        {/* Trust & Transparency Footer */}
        <View style={styles.trustBanner}>
          <Ionicons name="shield-checkmark" size={22} color={Colors.accent} />
          <View style={styles.trustTextWrap}>
            <Text style={styles.trustBannerTitle}>
              {language === 'mr'
                ? 'अधिकृत व खाजगीपणाची हमी'
                : language === 'hi'
                ? 'आधिकारिक व गोपनीयता गारंटी'
                : 'Official & Privacy Protected'}
            </Text>
            <Text style={styles.trustBannerDesc}>
              {language === 'mr'
                ? 'HAQ केवळ अचूक माहिती व कागदपत्रांसाठी सहाय्य करते. कोणतीही वैयक्तिक माहिती विकली किंवा सामायिक केली जात नाही.'
                : language === 'hi'
                ? 'HAQ केवल सही जानकारी व दस्तावेज तैयारी में मदद करता है। आपकी कोई भी निजी जानकारी साझा नहीं की जाती।'
                : 'HAQ provides guidance and document preparation only. No personal data is shared or sold.'}
            </Text>
          </View>
        </View>
      </ScrollView>

      <BottomNav />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.backgroundWarm,
  },
  scrollContent: {
    paddingHorizontal: Spacing.screenPadding,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  heroCard: {
    backgroundColor: Colors.primaryNavy,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    ...Shadows.md,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  sessionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 6,
  },
  sessionBadgeText: {
    ...Typography.badgeText,
    fontSize: 10,
    color: '#E5E7EB',
  },
  heroGovPill: {
    ...Typography.badgeText,
    fontSize: 10,
    color: Colors.accentSaffron,
    letterSpacing: 0.5,
  },
  heroGreeting: {
    ...Typography.screenHeader,
    fontSize: 22,
    lineHeight: 28,
    color: '#FFFFFF',
    marginBottom: 6,
  },
  heroSubGreeting: {
    ...Typography.bodyRegular,
    fontSize: 13,
    lineHeight: 18,
    color: '#D1D5DB',
    marginBottom: Spacing.md,
  },
  voicePromptCard: {
    backgroundColor: Colors.cardSurface,
    borderRadius: Radius.lg,
    padding: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.accentSaffron,
    ...Shadows.sm,
  },
  voiceIconHalo: {
    width: 44,
    height: 44,
    borderRadius: Radius.full,
    backgroundColor: Colors.accentSaffron,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  voicePromptTextWrap: {
    flex: 1,
  },
  voicePromptTitle: {
    ...Typography.actionButton,
    fontSize: 15,
    color: Colors.primaryNavy,
  },
  voicePromptSubtitle: {
    ...Typography.captionRegular,
    fontSize: 12,
    color: Colors.mutedSlate,
  },
  voiceArrowButton: {
    width: 32,
    height: 32,
    borderRadius: Radius.full,
    backgroundColor: Colors.backgroundWarm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressCard: {
    backgroundColor: Colors.cardSurface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    marginBottom: Spacing.md,
    ...Shadows.sm,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  progressCardTitle: {
    ...Typography.labelMedium,
    fontSize: 12,
    color: Colors.mutedSlate,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  progressStageSubtitle: {
    ...Typography.sectionTitle,
    fontSize: 16,
    color: Colors.primaryNavy,
    marginTop: 2,
  },
  progressBadge: {
    backgroundColor: Colors.saffronOrangeLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  progressBadgeText: {
    ...Typography.badgeText,
    color: Colors.accentSaffronDark,
    fontSize: 13,
  },
  progressBarTrack: {
    height: 8,
    backgroundColor: Colors.borderSubtle,
    borderRadius: Radius.full,
    overflow: 'hidden',
    marginBottom: Spacing.sm,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.accentSaffron,
    borderRadius: Radius.full,
  },
  progressStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressStatItem: {
    ...Typography.captionRegular,
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  progressLink: {
    ...Typography.captionRegular,
    fontSize: 12,
    color: Colors.accentSaffronDark,
    fontWeight: '700',
  },
  nextActionBox: {
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.borderSubtle,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.xs,
  },
  nextActionText: {
    ...Typography.captionRegular,
    fontSize: 12,
    lineHeight: 17,
    color: Colors.textPrimary,
    flex: 1,
  },
  sectionHeaderRow: {
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    ...Typography.sectionTitle,
    fontSize: 18,
    color: Colors.primaryNavy,
  },
  sectionSubtitle: {
    ...Typography.captionRegular,
    fontSize: 12,
    color: Colors.mutedSlate,
    marginTop: 2,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  gridCard: {
    width: '48%',
    backgroundColor: Colors.cardSurface,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    marginBottom: Spacing.sm,
    minHeight: 124,
    justifyContent: 'space-between',
    ...Shadows.sm,
  },
  gridTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.xs,
  },
  gridIconWrap: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  serviceBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.xs,
  },
  serviceBadgeText: {
    ...Typography.badgeText,
    fontSize: 9,
    color: '#15803D',
  },
  gridCardTitle: {
    ...Typography.cardHeader,
    fontSize: 14,
    lineHeight: 18,
    color: Colors.primaryNavy,
    marginBottom: 2,
  },
  gridCardDesc: {
    ...Typography.captionRegular,
    fontSize: 11,
    lineHeight: 15,
    color: Colors.mutedSlate,
  },
  trustBanner: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    alignItems: 'flex-start',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  trustTextWrap: {
    flex: 1,
  },
  trustBannerTitle: {
    ...Typography.labelMedium,
    fontSize: 13,
    color: Colors.primaryNavy,
    marginBottom: 2,
  },
  trustBannerDesc: {
    ...Typography.captionRegular,
    fontSize: 11,
    lineHeight: 16,
    color: Colors.mutedSlate,
  },
});
