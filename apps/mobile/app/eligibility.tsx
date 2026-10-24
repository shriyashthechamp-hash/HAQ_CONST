import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../src/theme/colors';
import { useApp } from '../src/context/AppContext';
import { HeaderBar } from '../src/components/HeaderBar';
import { BottomNav } from '../src/components/BottomNav';
import { SourceCitationCard } from '../src/components/SourceCitationCard';
import { ApiService } from '../src/services/api';
import { EligibilityAssessmentResult, QuestionnaireAnswers } from '@haq/shared';
import { VoiceGuidanceButton } from '../src/components/VoiceGuidanceButton';
import { VoiceGuidanceService } from '../src/services/voiceGuidance';

export default function EligibilityScreen() {
  const router = useRouter();
  const { sessionId, t, language } = useApp();

  const [step, setStep] = useState<number>(1);
  const [answers, setAnswers] = useState<QuestionnaireAnswers>({
    age: '',
    workedDaysLast12Months: '',
    tradeType: '',
    isMaharashtraResident: true,
  });

  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<EligibilityAssessmentResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const totalSteps = 4;

  const trades = [
    { key: 'Mason', label: t('q3Mason') },
    { key: 'Carpenter', label: t('q3Carpenter') },
    { key: 'Bar Bender', label: t('q3BarBender') },
    { key: 'Electrician', label: t('q3Electrician') },
    { key: 'Plumber', label: t('q3Plumber') },
    { key: 'Painter', label: t('q3Painter') },
    { key: 'Helper', label: t('q3Helper') },
  ];

  const handleNext = async () => {
    setErrorMsg(null);

    // Validation
    if (step === 1) {
      const ageNum = Number(answers.age);
      if (!answers.age || isNaN(ageNum) || ageNum <= 0) {
        setErrorMsg('Please enter a valid age / कृपया योग्य वय प्रविष्ट करा.');
        return;
      }
    } else if (step === 2) {
      if (!answers.workedDaysLast12Months) {
        setErrorMsg('Please select or enter your work days / कृपया कामाचे दिवस निवडा.');
        return;
      }
    } else if (step === 3) {
      if (!answers.tradeType) {
        setErrorMsg('Please select your trade role / कृपया तुमचा व्यवसाय निवडा.');
        return;
      }
    }

    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      // Final step: evaluate eligibility
      setLoading(true);
      try {
        const assessment = await ApiService.assessEligibility(sessionId, answers);
        setResult(assessment);
      } catch (err: any) {
        console.warn('API assessment failed, using local rule evaluation:', err);
        // Resilient deterministic local fallback matching MAHABOCW rules
        const ageNum = Number(answers.age);
        const daysNum =
          answers.workedDaysLast12Months === '90_180'
            ? 120
            : answers.workedDaysLast12Months === '180_plus'
            ? 200
            : Number(answers.workedDaysLast12Months);

        const isAgeOk = ageNum >= 18 && ageNum <= 60;
        const isDaysOk = daysNum >= 90;

        const fallbackResult: EligibilityAssessmentResult = {
          sessionId,
          benefitType: 'MAHABOCW_REGISTRATION',
          assessmentStatus:
            isAgeOk && isDaysOk ? 'PRELIMINARY_SATISFIED' : !isAgeOk || (daysNum && daysNum < 90) ? 'INELIGIBLE' : 'NEEDS_VERIFICATION',
          ruleVersion: 'v2024.1',
          satisfiedChecks: [
            ...(isAgeOk
              ? [
                  {
                    ruleKey: 'RULE_AGE_RANGE',
                    title: { en: 'Age Eligibility (18–60 Years)', mr: 'वयाची पात्रता (१८ ते ६० वर्षे)', hi: 'आयु पात्रता (१८ से ६० वर्ष)' },
                    status: 'SATISFIED' as const,
                    explanation: {
                      en: `Age ${ageNum} satisfies official criteria (18 to 60).`,
                      mr: `तुमचे वय ${ageNum} वर्षे १८ ते ६० या अधिकृत अटीची पूर्तता करते.`,
                      hi: `आपकी आयु ${ageNum} वर्ष १८ से ६० वर्ष के मानदंड में आती है।`,
                    },
                    sourceCitation: {
                      sourceId: 'MAHABOCW-SRC-REG-01',
                      title: 'MAHABOCW Official Registration Criteria',
                      url: 'https://mahabocw.in/en/workers-registration/',
                      excerpt: 'Age must be between 18 and 60 years.',
                    },
                    nextStepRecommendation: {
                      en: 'Keep School LC, Birth Certificate, or Aadhaar ready.',
                      mr: 'शाळा सोडल्याचा दाखला किंवा आधार कार्ड तयार ठेवा.',
                      hi: 'स्कूल टीसी या आधार कार्ड तैयार रखें।',
                    },
                  },
                ]
              : []),
            ...(isDaysOk
              ? [
                  {
                    ruleKey: 'RULE_90_DAYS_WORK',
                    title: { en: '90-Day Construction Work Requirement', mr: '९० दिवस कामाची अट', hi: '९० दिन निर्माण कार्य की आवश्यकता' },
                    status: 'SATISFIED' as const,
                    explanation: {
                      en: 'Meets minimum 90 days construction work criteria in past 12 months.',
                      mr: 'मागील १२ महिन्यांत ९० दिवस कामाची अट पूर्ण होते.',
                      hi: 'पिछले १२ महीनों में ९० दिन कार्य की न्यूनतम शर्त पूरी है।',
                    },
                    sourceCitation: {
                      sourceId: 'MAHABOCW-SRC-FORM-05',
                      title: 'MAHABOCW Form-V 90-Day Certificate',
                      url: 'https://mahabocw.in/en/download/',
                      excerpt: 'Form-V certificate of 90 days work from contractor or Gramsevak.',
                    },
                    nextStepRecommendation: {
                      en: 'Request Form-V signed by contractor or Gramsevak.',
                      mr: 'कंत्राटदार किंवा ग्रामसेवकाकडून फॉर्म-५ घ्या.',
                      hi: 'ठेकेदार या ग्रामसेवक से फॉर्म-५ प्राप्त करें।',
                    },
                  },
                ]
              : []),
          ],
          unresolvedChecks: [],
          failedChecks: [],
          disclaimer: {
            en: 'Preliminary guidance only. Final eligibility is determined by MAHABOCW upon official application.',
            mr: 'केवळ प्राथमिक मार्गदर्शन. अंतिम निर्णय अधिकृत MAHABOCW मंडळाचा असतो.',
            hi: 'केवल प्रारंभिक मार्गदर्शन। अंतिम निर्णय MAHABOCW बोर्ड द्वारा लिया जाता है।',
          },
          evaluatedAt: new Date().toISOString(),
        };

        setResult(fallbackResult);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleBack = () => {
    if (result) {
      setResult(null);
      setStep(totalSteps);
    } else if (step > 1) {
      setStep(step - 1);
    } else {
      router.back();
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <HeaderBar />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header Title */}
        <View style={styles.titleSection}>
          <Text style={styles.screenTitle}>{t('eligibilityTitle')}</Text>
          <Text style={styles.screenSubtitle}>{t('eligibilitySubtitle')}</Text>
        </View>

        {!result ? (
          <View style={styles.cardContainer}>
            {/* Progress Indicator */}
            <View style={styles.progressContainer}>
              <View style={styles.progressBarBg}>
                <View
                  style={[
                    styles.progressBarFill,
                    { width: `${(step / totalSteps) * 100}%` },
                  ]}
                />
              </View>
              <Text style={styles.stepIndicatorText}>
                {t('stepOf', { current: step, total: totalSteps })}
              </Text>
            </View>

            {/* Error Message */}
            {errorMsg && (
              <View style={styles.errorBanner}>
                <Text style={styles.errorBannerText}>{errorMsg}</Text>
              </View>
            )}

            {/* QUESTION 1: AGE */}
            {step === 1 && (
              <View style={styles.questionBox}>
                <Text style={styles.questionTitle}>{t('q1Title')}</Text>
                <Text style={styles.questionDesc}>{t('q1Desc')}</Text>

                <TextInput
                  style={styles.textInput}
                  value={String(answers.age || '')}
                  onChangeText={(val) => setAnswers({ ...answers, age: val })}
                  placeholder={t('q1Placeholder')}
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="numeric"
                  maxLength={3}
                />

                <Text style={styles.quickSelectLabel}>Quick Select / जलद निवडा:</Text>
                <View style={styles.chipRow}>
                  {[22, 28, 35, 42, 50, 58].map((age) => (
                    <TouchableOpacity
                      key={age}
                      onPress={() => setAnswers({ ...answers, age })}
                      style={[
                        styles.chip,
                        Number(answers.age) === age && styles.chipSelected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          Number(answers.age) === age && styles.chipTextSelected,
                        ]}
                      >
                        {age} yrs
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={styles.contextHelpBox}>
                  <Text style={styles.contextHelpIcon}>ℹ️</Text>
                  <Text style={styles.contextHelpText}>
                    Rule: Section 12 of BOCW Act requires ages 18 to 60.
                  </Text>
                </View>
              </View>
            )}

            {/* QUESTION 2: 90 DAYS WORK */}
            {step === 2 && (
              <View style={styles.questionBox}>
                <Text style={styles.questionTitle}>{t('q2Title')}</Text>
                <Text style={styles.questionDesc}>{t('q2Desc')}</Text>

                <View style={styles.optionStack}>
                  <TouchableOpacity
                    onPress={() => setAnswers({ ...answers, workedDaysLast12Months: 'under_90' })}
                    style={[
                      styles.choiceCard,
                      answers.workedDaysLast12Months === 'under_90' && styles.choiceCardSelected,
                    ]}
                  >
                    <View style={styles.choiceCardHeader}>
                      <Text style={styles.choiceCardTitle}>{t('q2Opt1')}</Text>
                      <View style={styles.radioDot}>
                        {answers.workedDaysLast12Months === 'under_90' && <View style={styles.radioFill} />}
                      </View>
                    </View>
                    <Text style={styles.choiceCardSub}>May require completing more site days before filing</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setAnswers({ ...answers, workedDaysLast12Months: '90_180' })}
                    style={[
                      styles.choiceCard,
                      answers.workedDaysLast12Months === '90_180' && styles.choiceCardSelected,
                    ]}
                  >
                    <View style={styles.choiceCardHeader}>
                      <Text style={styles.choiceCardTitle}>{t('q2Opt2')}</Text>
                      <View style={styles.radioDot}>
                        {answers.workedDaysLast12Months === '90_180' && <View style={styles.radioFill} />}
                      </View>
                    </View>
                    <Text style={styles.choiceCardSub}>Meets official 90-day threshold (Form-V eligible)</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setAnswers({ ...answers, workedDaysLast12Months: '180_plus' })}
                    style={[
                      styles.choiceCard,
                      answers.workedDaysLast12Months === '180_plus' && styles.choiceCardSelected,
                    ]}
                  >
                    <View style={styles.choiceCardHeader}>
                      <Text style={styles.choiceCardTitle}>{t('q2Opt3')}</Text>
                      <View style={styles.radioDot}>
                        {answers.workedDaysLast12Months === '180_plus' && <View style={styles.radioFill} />}
                      </View>
                    </View>
                    <Text style={styles.choiceCardSub}>Comfortably meets criteria across one or multiple sites</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* QUESTION 3: TRADE ROLE */}
            {step === 3 && (
              <View style={styles.questionBox}>
                <Text style={styles.questionTitle}>{t('q3Title')}</Text>
                <Text style={styles.questionDesc}>{t('q3Desc')}</Text>

                <View style={styles.tradeGrid}>
                  {trades.map((item) => {
                    const isSelected = answers.tradeType === item.key;
                    return (
                      <TouchableOpacity
                        key={item.key}
                        onPress={() => setAnswers({ ...answers, tradeType: item.key })}
                        style={[styles.tradeItem, isSelected && styles.tradeItemSelected]}
                      >
                        <Text style={[styles.tradeText, isSelected && styles.tradeTextSelected]}>
                          {item.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* QUESTION 4: RESIDENCY & JURISDICTION */}
            {step === 4 && (
              <View style={styles.questionBox}>
                <Text style={styles.questionTitle}>{t('q4Title')}</Text>
                <Text style={styles.questionDesc}>{t('q4Desc')}</Text>

                <View style={styles.optionStack}>
                  <TouchableOpacity
                    onPress={() => setAnswers({ ...answers, isMaharashtraResident: true })}
                    style={[
                      styles.choiceCard,
                      answers.isMaharashtraResident === true && styles.choiceCardSelected,
                    ]}
                  >
                    <View style={styles.choiceCardHeader}>
                      <Text style={styles.choiceCardTitle}>{t('q4Yes')}</Text>
                      <View style={styles.radioDot}>
                        {answers.isMaharashtraResident === true && <View style={styles.radioFill} />}
                      </View>
                    </View>
                    <Text style={styles.choiceCardSub}>Direct registration under Pune / Maharashtra Board</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setAnswers({ ...answers, isMaharashtraResident: false })}
                    style={[
                      styles.choiceCard,
                      answers.isMaharashtraResident === false && styles.choiceCardSelected,
                    ]}
                  >
                    <View style={styles.choiceCardHeader}>
                      <Text style={styles.choiceCardTitle}>{t('q4No')}</Text>
                      <View style={styles.radioDot}>
                        {answers.isMaharashtraResident === false && <View style={styles.radioFill} />}
                      </View>
                    </View>
                    <Text style={styles.choiceCardSub}>
                      Eligible if working 90+ days on Maharashtra sites; needs employer certificate
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Bottom Actions: Back and Continue */}
            <View style={styles.actionRow}>
              {step > 1 && (
                <TouchableOpacity onPress={handleBack} style={styles.secondaryButton}>
                  <Text style={styles.secondaryButtonText}>{t('back')}</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                onPress={handleNext}
                style={[styles.continueButton, step === 1 && { flex: 1 }]}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.continueButtonText}>
                    {step === totalSteps ? t('continue') : t('continue')} →
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          /* RESULTS VIEW */
          <View style={styles.resultsContainer}>
            {/* Status Banner */}
            <View
              style={[
                styles.resultBanner,
                result.assessmentStatus === 'PRELIMINARY_SATISFIED' && styles.bannerSatisfied,
                result.assessmentStatus === 'NEEDS_VERIFICATION' && styles.bannerNeedsVerification,
                result.assessmentStatus === 'INELIGIBLE' && styles.bannerIneligible,
              ]}
            >
              <Text style={styles.resultBannerIcon}>
                {result.assessmentStatus === 'PRELIMINARY_SATISFIED'
                  ? '✅'
                  : result.assessmentStatus === 'NEEDS_VERIFICATION'
                  ? '⚠️'
                  : '❌'}
              </Text>
              <View style={styles.resultBannerTextCol}>
                <Text style={styles.resultBannerStatusTitle}>
                  {result.assessmentStatus === 'PRELIMINARY_SATISFIED'
                    ? t('statusSatisfied')
                    : result.assessmentStatus === 'NEEDS_VERIFICATION'
                    ? t('statusNeedsVerification')
                    : t('statusIneligible')}
                </Text>
                <Text style={styles.resultBannerStatusSub}>
                  Rule Version: {result.ruleVersion}
                </Text>
              </View>
            </View>

            {/* Accessible Voice Guidance Playback */}
            <View style={{ marginBottom: 16 }}>
              <VoiceGuidanceButton
                textToSpeak={
                  result.assessmentStatus === 'PRELIMINARY_SATISFIED'
                    ? VoiceGuidanceService.getScript('ELIGIBILITY_ELIGIBLE', language)
                    : VoiceGuidanceService.getScript('ELIGIBILITY_NOT_ELIGIBLE', language)
                }
                language={language}
              />
            </View>

            {/* Satisfied Checks Section */}
            {result.satisfiedChecks.length > 0 && (
              <View style={styles.checkSection}>
                <Text style={styles.checkSectionHeader}>{t('satisfiedHeader')}</Text>
                {result.satisfiedChecks.map((item, idx) => (
                  <View key={idx} style={styles.checkCard}>
                    <View style={styles.checkCardRow}>
                      <Text style={styles.checkPassBadge}>✓ SATISFIED</Text>
                      <Text style={styles.checkTitle}>{item.title[language] || item.title.en}</Text>
                    </View>
                    <Text style={styles.checkExplanation}>{item.explanation[language] || item.explanation.en}</Text>

                    {item.sourceCitation && <SourceCitationCard citation={item.sourceCitation} />}

                    <View style={styles.recommendationBox}>
                      <Text style={styles.recommendationLabel}>{t('nextStepsRecommendation')}:</Text>
                      <Text style={styles.recommendationText}>
                        {item.nextStepRecommendation[language] || item.nextStepRecommendation.en}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Unresolved Checks Section */}
            {result.unresolvedChecks.length > 0 && (
              <View style={styles.checkSection}>
                <Text style={[styles.checkSectionHeader, { color: Colors.warning }]}>
                  {t('unresolvedHeader')}
                </Text>
                {result.unresolvedChecks.map((item, idx) => (
                  <View key={idx} style={[styles.checkCard, { borderColor: Colors.warningBorder }]}>
                    <View style={styles.checkCardRow}>
                      <Text style={styles.checkWarnBadge}>⚠ NEEDS VERIFICATION</Text>
                      <Text style={styles.checkTitle}>{item.title[language] || item.title.en}</Text>
                    </View>
                    <Text style={styles.checkExplanation}>{item.explanation[language] || item.explanation.en}</Text>

                    {item.sourceCitation && <SourceCitationCard citation={item.sourceCitation} />}

                    <View style={styles.recommendationBox}>
                      <Text style={styles.recommendationLabel}>{t('nextStepsRecommendation')}:</Text>
                      <Text style={styles.recommendationText}>
                        {item.nextStepRecommendation[language] || item.nextStepRecommendation.en}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Failed Checks Section */}
            {result.failedChecks.length > 0 && (
              <View style={styles.checkSection}>
                <Text style={[styles.checkSectionHeader, { color: Colors.error }]}>
                  {t('failedHeader')}
                </Text>
                {result.failedChecks.map((item, idx) => (
                  <View key={idx} style={[styles.checkCard, { borderColor: Colors.errorBorder }]}>
                    <View style={styles.checkCardRow}>
                      <Text style={styles.checkFailBadge}>✕ UNMET</Text>
                      <Text style={styles.checkTitle}>{item.title[language] || item.title.en}</Text>
                    </View>
                    <Text style={styles.checkExplanation}>{item.explanation[language] || item.explanation.en}</Text>

                    {item.sourceCitation && <SourceCitationCard citation={item.sourceCitation} />}
                  </View>
                ))}
              </View>
            )}

            {/* Official Disclaimer Box */}
            <View style={styles.disclaimerCard}>
              <Text style={styles.disclaimerIcon}>⚖️</Text>
              <Text style={styles.disclaimerText}>
                {result.disclaimer[language] || result.disclaimer.en}
              </Text>
            </View>

            {/* Action to proceed to checklist */}
            <TouchableOpacity
              onPress={() => router.push('/documents')}
              style={styles.proceedButton}
              activeOpacity={0.85}
            >
              <Text style={styles.proceedButtonText}>{t('proceedToChecklist')}</Text>
              <Text style={styles.proceedButtonArrow}>→</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleBack} style={styles.recheckButton}>
              <Text style={styles.recheckButtonText}>← Re-check Answers / पुन्हा तपासा</Text>
            </TouchableOpacity>
          </View>
        )}
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
  titleSection: {
    marginBottom: 16,
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  screenSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  cardContainer: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  progressContainer: {
    marginBottom: 18,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.constructionOrange,
  },
  stepIndicatorText: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: '600',
    textAlign: 'right',
  },
  errorBanner: {
    backgroundColor: Colors.errorSurface,
    borderWidth: 1,
    borderColor: Colors.errorBorder,
    padding: 10,
    borderRadius: 8,
    marginBottom: 14,
  },
  errorBannerText: {
    color: Colors.error,
    fontSize: 13,
    fontWeight: '600',
  },
  questionBox: {
    marginBottom: 18,
  },
  questionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 6,
  },
  questionDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginBottom: 16,
  },
  textInput: {
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.borderHighlight,
    color: Colors.textPrimary,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 14,
  },
  quickSelectLabel: {
    fontSize: 12,
    color: Colors.textMuted,
    marginBottom: 8,
    fontWeight: '600',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  chip: {
    backgroundColor: Colors.backgroundSecondary,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipSelected: {
    borderColor: Colors.constructionOrange,
    backgroundColor: Colors.constructionOrangeGlow,
  },
  chipText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  chipTextSelected: {
    color: Colors.constructionOrange,
    fontWeight: '700',
  },
  contextHelpBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(22, 119, 255, 0.08)',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(22, 119, 255, 0.2)',
  },
  contextHelpIcon: {
    fontSize: 14,
  },
  contextHelpText: {
    fontSize: 12,
    color: '#93C5FD',
    flex: 1,
  },
  optionStack: {
    gap: 12,
  },
  choiceCard: {
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  choiceCardSelected: {
    borderColor: Colors.constructionOrange,
    backgroundColor: Colors.constructionOrangeGlow,
  },
  choiceCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  choiceCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  radioDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.textMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioFill: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.constructionOrange,
  },
  choiceCardSub: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
  tradeGrid: {
    gap: 8,
  },
  tradeItem: {
    backgroundColor: Colors.backgroundSecondary,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    minHeight: 48,
    justifyContent: 'center',
  },
  tradeItemSelected: {
    borderColor: Colors.constructionOrange,
    backgroundColor: Colors.constructionOrangeGlow,
  },
  tradeText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  tradeTextSelected: {
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 12,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  secondaryButtonText: {
    color: Colors.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },
  continueButton: {
    flex: 2,
    backgroundColor: Colors.constructionOrange,
    borderRadius: 12,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  resultsContainer: {
    gap: 14,
  },
  resultBanner: {
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1.5,
  },
  bannerSatisfied: {
    backgroundColor: Colors.successSurface,
    borderColor: Colors.successBorder,
  },
  bannerNeedsVerification: {
    backgroundColor: Colors.warningSurface,
    borderColor: Colors.warningBorder,
  },
  bannerIneligible: {
    backgroundColor: Colors.errorSurface,
    borderColor: Colors.errorBorder,
  },
  resultBannerIcon: {
    fontSize: 28,
  },
  resultBannerTextCol: {
    flex: 1,
  },
  resultBannerStatusTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  resultBannerStatusSub: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  checkSection: {
    marginTop: 6,
  },
  checkSectionHeader: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.success,
    marginBottom: 8,
  },
  checkCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 10,
  },
  checkCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  checkPassBadge: {
    backgroundColor: Colors.successSurface,
    color: Colors.success,
    fontSize: 10,
    fontWeight: '800',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  checkWarnBadge: {
    backgroundColor: Colors.warningSurface,
    color: Colors.warning,
    fontSize: 10,
    fontWeight: '800',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  checkFailBadge: {
    backgroundColor: Colors.errorSurface,
    color: Colors.error,
    fontSize: 10,
    fontWeight: '800',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  checkTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
    flex: 1,
  },
  checkExplanation: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginBottom: 8,
  },
  recommendationBox: {
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
    borderLeftWidth: 3,
    borderLeftColor: Colors.constructionOrange,
  },
  recommendationLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.constructionOrange,
    marginBottom: 2,
  },
  recommendationText: {
    fontSize: 12,
    color: Colors.textPrimary,
    lineHeight: 16,
  },
  disclaimerCard: {
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  disclaimerIcon: {
    fontSize: 18,
  },
  disclaimerText: {
    fontSize: 12,
    color: Colors.textMuted,
    lineHeight: 17,
    flex: 1,
  },
  proceedButton: {
    backgroundColor: Colors.constructionOrange,
    borderRadius: 14,
    minHeight: 52,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  proceedButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  proceedButtonArrow: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  recheckButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  recheckButtonText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
});
