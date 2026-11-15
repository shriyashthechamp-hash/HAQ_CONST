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
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../src/theme/colors';
import { Typography } from '../src/theme/typography';
import { Spacing, Radius, Shadows } from '../src/theme/spacing';
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
    { key: 'Mason', label: t('q3Mason'), icon: 'hammer-outline' as const },
    { key: 'Carpenter', label: t('q3Carpenter'), icon: 'construct-outline' as const },
    { key: 'Bar Bender', label: t('q3BarBender'), icon: 'hardware-chip-outline' as const },
    { key: 'Electrician', label: t('q3Electrician'), icon: 'flash-outline' as const },
    { key: 'Plumber', label: t('q3Plumber'), icon: 'water-outline' as const },
    { key: 'Painter', label: t('q3Painter'), icon: 'color-palette-outline' as const },
    { key: 'Helper', label: t('q3Helper'), icon: 'people-outline' as const },
  ];

  const handleNext = async () => {
    setErrorMsg(null);

    // Validation
    if (step === 1) {
      const ageNum = Number(answers.age);
      if (!answers.age || isNaN(ageNum) || ageNum <= 0) {
        setErrorMsg(
          language === 'mr'
            ? 'कृपया तुमचे योग्य वय प्रविष्ट करा (उदा. ३२).'
            : language === 'hi'
            ? 'कृपया अपनी सही आयु दर्ज करें (उदा. ३२)।'
            : 'Please enter a valid age (e.g. 32).'
        );
        return;
      }
    } else if (step === 2) {
      if (!answers.workedDaysLast12Months) {
        setErrorMsg(
          language === 'mr'
            ? 'कृपया मागील १२ महिन्यांतील कामाचे दिवस निवडा.'
            : language === 'hi'
            ? 'कृपया पिछले १२ महीनों के कार्य दिवस चुनें।'
            : 'Please select your work days in the last 12 months.'
        );
        return;
      }
    } else if (step === 3) {
      if (!answers.tradeType) {
        setErrorMsg(
          language === 'mr'
            ? 'कृपया तुमचा मुख्य बांधकाम व्यवसाय निवडा.'
            : language === 'hi'
            ? 'कृपया अपना मुख्य निर्माण कार्य चुनें।'
            : 'Please select your primary construction trade.'
        );
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
          failedChecks: [
            ...(!isAgeOk
              ? [
                  {
                    ruleKey: 'RULE_AGE_RANGE_FAILED',
                    title: { en: 'Age Requirement Unmet', mr: 'वयाची अट पूर्ण होत नाही', hi: 'आयु मानदंड अपूर्ण' },
                    status: 'FAILED' as const,
                    explanation: {
                      en: `Age ${ageNum} is outside 18–60 statutory bracket.`,
                      mr: `वय ${ageNum} १८ ते ६० या अधिकृत वयोगटाबाहेर आहे.`,
                      hi: `आयु ${ageNum} वर्ष १८ से ६० के वैधानिक दायरे से बाहर है।`,
                    },
                    sourceCitation: {
                      sourceId: 'MAHABOCW-SRC-REG-01',
                      title: 'MAHABOCW Official Registration Criteria',
                      url: 'https://mahabocw.in/en/workers-registration/',
                      excerpt: 'Age must be between 18 and 60 years.',
                    },
                    nextStepRecommendation: {
                      en: 'Worker must be aged 18 to 60 at the date of registration.',
                      mr: 'नोंदणीच्या दिनांकास वय १८ ते ६० वर्षांच्या दरम्यान असणे आवश्यक आहे.',
                      hi: 'पंजीकरण की तिथि पर आयु १८ से ६० वर्ष के मध्य होनी चाहिए।',
                    },
                  },
                ]
              : []),
            ...(answers.workedDaysLast12Months === 'under_90'
              ? [
                  {
                    ruleKey: 'RULE_90_DAYS_FAILED',
                    title: { en: '90 Days Work Incomplete', mr: '९० दिवस काम अपूर्ण', hi: '९० दिन कार्य अपूर्ण' },
                    status: 'FAILED' as const,
                    explanation: {
                      en: 'Must complete at least 90 days construction work in past 12 months under Rule 282.',
                      mr: 'नियम २८२ अन्वये मागील १२ महिन्यांत किमान ९० दिवस बांधकाम काम पूर्ण असणे आवश्यक आहे.',
                      hi: 'नियम २८२ के तहत पिछले १२ महीनों में न्यूनतम ९० दिन निर्माण कार्य आवश्यक है।',
                    },
                    sourceCitation: {
                      sourceId: 'MAHABOCW-SRC-FORM-05',
                      title: 'MAHABOCW Form-V 90-Day Certificate',
                      url: 'https://mahabocw.in/en/download/',
                      excerpt: 'Form-V certificate of 90 days work from contractor or Gramsevak.',
                    },
                    nextStepRecommendation: {
                      en: 'Complete 90 days on construction sites and obtain Form-V from contractor.',
                      mr: 'बांधकाम साइटवर ९० दिवस काम पूर्ण करा व कंत्राटदाराकडून फॉर्म-५ घ्या.',
                      hi: 'निर्माण साइट पर ९० दिन कार्य पूर्ण करें और ठेकेदार से फॉर्म-५ प्राप्त करें।',
                    },
                  },
                ]
              : []),
          ],
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
        {/* Title Header */}
        <View style={styles.titleSection}>
          <Text style={styles.screenTitle}>{t('eligibilityTitle')}</Text>
          <Text style={styles.screenSubtitle}>{t('eligibilitySubtitle')}</Text>
        </View>

        {!result ? (
          <View style={styles.cardContainer}>
            {/* Modern Step Indicator */}
            <View style={styles.stepperContainer}>
              <View style={styles.stepperRow}>
                {[1, 2, 3, 4].map((s) => (
                  <View key={s} style={styles.stepItemWrapper}>
                    <View
                      style={[
                        styles.stepDot,
                        step === s && styles.stepDotActive,
                        step > s && styles.stepDotCompleted,
                      ]}
                    >
                      {step > s ? (
                        <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                      ) : (
                        <Text style={[styles.stepDotText, step === s && styles.stepDotTextActive]}>
                          {s}
                        </Text>
                      )}
                    </View>
                    {s < totalSteps && (
                      <View
                        style={[
                          styles.stepConnector,
                          step > s && styles.stepConnectorCompleted,
                        ]}
                      />
                    )}
                  </View>
                ))}
              </View>
              <Text style={styles.stepProgressText}>
                {t('stepOf', { current: step, total: totalSteps })}
              </Text>
            </View>

            {/* Error Message */}
            {errorMsg && (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={18} color={Colors.error} />
                <Text style={styles.errorBannerText}>{errorMsg}</Text>
              </View>
            )}

            {/* QUESTION 1: AGE */}
            {step === 1 && (
              <View style={styles.questionBox}>
                <View style={styles.questionHeaderRow}>
                  <Text style={styles.questionTitle}>{t('q1Title')}</Text>
                  <VoiceGuidanceButton
                    textToSpeak={
                      language === 'mr'
                        ? 'नोंदणीसाठी कामगाराचे वय १८ ते ६० वर्षांच्या दरम्यान असणे आवश्यक आहे. तुमचे वय प्रविष्ट करा.'
                        : language === 'hi'
                        ? 'पंजीकरण हेतु श्रमिक की आयु १८ से ६० वर्ष के मध्य होनी चाहिए। अपनी आयु दर्ज करें।'
                        : 'Worker must be between 18 and 60 years old to register with the Board.'
                    }
                    language={language}
                  />
                </View>
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

                <Text style={styles.quickSelectLabel}>
                  {language === 'mr' ? 'जलद निवडा:' : language === 'hi' ? 'जल्दी चुनें:' : 'Quick Select:'}
                </Text>
                <View style={styles.chipRow}>
                  {[22, 28, 35, 42, 50, 58].map((age) => (
                    <TouchableOpacity
                      key={age}
                      onPress={() => setAnswers({ ...answers, age })}
                      style={[
                        styles.chip,
                        Number(answers.age) === age && styles.chipSelected,
                      ]}
                      activeOpacity={0.8}
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
                  <Ionicons name="information-circle-outline" size={18} color={Colors.primaryNavy} />
                  <Text style={styles.contextHelpText}>
                    {language === 'mr'
                      ? 'नियम: इमारत व इतर बांधकाम कामगार कायदा, कलम १२ अन्वये वय १८ ते ६० वर्षे अनिवार्य आहे.'
                      : language === 'hi'
                      ? 'नियम: भवन एवं अन्य निर्माण श्रमिक अधिनियम की धारा १२ के तहत आयु १८ से ६० वर्ष अनिवार्य है।'
                      : 'Rule: Section 12 of the BOCW Act requires worker age between 18 and 60 years.'}
                  </Text>
                </View>
              </View>
            )}

            {/* QUESTION 2: 90 DAYS WORK */}
            {step === 2 && (
              <View style={styles.questionBox}>
                <View style={styles.questionHeaderRow}>
                  <Text style={styles.questionTitle}>{t('q2Title')}</Text>
                  <VoiceGuidanceButton
                    textToSpeak={
                      language === 'mr'
                        ? 'अधिकृत नियमांनुसार मागील बारा महिन्यांत किमान नव्वद दिवस बांधकाम कामाचा अनुभव बंधनकारक आहे.'
                        : language === 'hi'
                        ? 'आधिकारिक नियमों के अनुसार पिछले बारह महीनों में न्यूनतम नब्बे दिन का निर्माण कार्य आवश्यक है।'
                        : 'Official regulations require at least 90 days of construction work in the last 12 months.'
                    }
                    language={language}
                  />
                </View>
                <Text style={styles.questionDesc}>{t('q2Desc')}</Text>

                <View style={styles.optionStack}>
                  <TouchableOpacity
                    onPress={() => setAnswers({ ...answers, workedDaysLast12Months: 'under_90' })}
                    style={[
                      styles.choiceCard,
                      answers.workedDaysLast12Months === 'under_90' && styles.choiceCardSelected,
                    ]}
                    activeOpacity={0.85}
                  >
                    <View style={styles.choiceCardHeader}>
                      <Text style={styles.choiceCardTitle}>{t('q2Opt1')}</Text>
                      <View style={styles.radioDot}>
                        {answers.workedDaysLast12Months === 'under_90' && <View style={styles.radioFill} />}
                      </View>
                    </View>
                    <Text style={styles.choiceCardSub}>
                      {language === 'mr'
                        ? 'अर्जासाठी आणखी काही दिवस साइटवर काम पूर्ण करणे आवश्यक आहे'
                        : language === 'hi'
                        ? 'आवेदन हेतु कार्य दिवस पूरे करने की आवश्यकता होगी'
                        : 'May require completing more site days before filing'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setAnswers({ ...answers, workedDaysLast12Months: '90_180' })}
                    style={[
                      styles.choiceCard,
                      answers.workedDaysLast12Months === '90_180' && styles.choiceCardSelected,
                    ]}
                    activeOpacity={0.85}
                  >
                    <View style={styles.choiceCardHeader}>
                      <Text style={styles.choiceCardTitle}>{t('q2Opt2')}</Text>
                      <View style={styles.radioDot}>
                        {answers.workedDaysLast12Months === '90_180' && <View style={styles.radioFill} />}
                      </View>
                    </View>
                    <Text style={styles.choiceCardSub}>
                      {language === 'mr'
                        ? 'अधिकृत ९० दिवसांची अट पूर्ण होते (फॉर्म-५ साठी पात्र)'
                        : language === 'hi'
                        ? 'आधिकारिक ९० दिन की शर्त पूर्ण (फॉर्म-५ हेतु पात्र)'
                        : 'Meets official 90-day threshold (Form-V eligible)'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setAnswers({ ...answers, workedDaysLast12Months: '180_plus' })}
                    style={[
                      styles.choiceCard,
                      answers.workedDaysLast12Months === '180_plus' && styles.choiceCardSelected,
                    ]}
                    activeOpacity={0.85}
                  >
                    <View style={styles.choiceCardHeader}>
                      <Text style={styles.choiceCardTitle}>{t('q2Opt3')}</Text>
                      <View style={styles.radioDot}>
                        {answers.workedDaysLast12Months === '180_plus' && <View style={styles.radioFill} />}
                      </View>
                    </View>
                    <Text style={styles.choiceCardSub}>
                      {language === 'mr'
                        ? 'एका किंवा अनेक साइट्सवर पुरेसा कामाचा अनुभव आहे'
                        : language === 'hi'
                        ? 'एक या अधिक साइट्स पर पर्याप्त कार्य अनुभव है'
                        : 'Comfortably meets criteria across one or multiple sites'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* QUESTION 3: TRADE ROLE */}
            {step === 3 && (
              <View style={styles.questionBox}>
                <View style={styles.questionHeaderRow}>
                  <Text style={styles.questionTitle}>{t('q3Title')}</Text>
                  <VoiceGuidanceButton
                    textToSpeak={
                      language === 'mr'
                        ? 'इमारत किंवा इतर बांधकाम अनुसूचीमध्ये समाविष्ट असलेला तुमचा मुख्य व्यवसाय निवडा.'
                        : language === 'hi'
                        ? 'भवन या अन्य निर्माण कार्य सूची में सम्मिलित अपना मुख्य व्यवसाय चुनें।'
                        : 'Select your primary construction trade recognized under the regulations.'
                    }
                    language={language}
                  />
                </View>
                <Text style={styles.questionDesc}>{t('q3Desc')}</Text>

                <View style={styles.tradeGrid}>
                  {trades.map((item) => {
                    const isSelected = answers.tradeType === item.key;
                    return (
                      <TouchableOpacity
                        key={item.key}
                        onPress={() => setAnswers({ ...answers, tradeType: item.key })}
                        style={[styles.tradeItem, isSelected && styles.tradeItemSelected]}
                        activeOpacity={0.85}
                      >
                        <Ionicons
                          name={item.icon}
                          size={20}
                          color={isSelected ? Colors.accentSaffronDark : Colors.mutedSlate}
                          style={{ marginBottom: 4 }}
                        />
                        <Text style={[styles.tradeText, isSelected && styles.tradeTextSelected]}>
                          {item.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* QUESTION 4: RESIDENCY */}
            {step === 4 && (
              <View style={styles.questionBox}>
                <View style={styles.questionHeaderRow}>
                  <Text style={styles.questionTitle}>{t('q4Title')}</Text>
                  <VoiceGuidanceButton
                    textToSpeak={
                      language === 'mr'
                        ? 'तुम्ही महाराष्ट्रात राहता किंवा बांधकाम साइटवर काम करत असल्यास निवडा.'
                        : language === 'hi'
                        ? 'यदि आप महाराष्ट्र में रहते हैं या निर्माण स्थल पर काम करते हैं तो चुनें।'
                        : 'Confirm whether you live or work in Maharashtra.'
                    }
                    language={language}
                  />
                </View>
                <Text style={styles.questionDesc}>{t('q4Desc')}</Text>

                <View style={styles.optionStack}>
                  <TouchableOpacity
                    onPress={() => setAnswers({ ...answers, isMaharashtraResident: true })}
                    style={[
                      styles.choiceCard,
                      answers.isMaharashtraResident === true && styles.choiceCardSelected,
                    ]}
                    activeOpacity={0.85}
                  >
                    <View style={styles.choiceCardHeader}>
                      <Text style={styles.choiceCardTitle}>{t('q4Yes')}</Text>
                      <View style={styles.radioDot}>
                        {answers.isMaharashtraResident === true && <View style={styles.radioFill} />}
                      </View>
                    </View>
                    <Text style={styles.choiceCardSub}>
                      {language === 'mr'
                        ? 'महाराष्ट्र कल्याण मंडळाकडे थेट नोंदणीसाठी पात्र'
                        : language === 'hi'
                        ? 'महाराष्ट्र कल्याण बोर्ड में सीधे पंजीकरण हेतु पात्र'
                        : 'Direct registration under Pune / Maharashtra Board'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setAnswers({ ...answers, isMaharashtraResident: false })}
                    style={[
                      styles.choiceCard,
                      answers.isMaharashtraResident === false && styles.choiceCardSelected,
                    ]}
                    activeOpacity={0.85}
                  >
                    <View style={styles.choiceCardHeader}>
                      <Text style={styles.choiceCardTitle}>{t('q4No')}</Text>
                      <View style={styles.radioDot}>
                        {answers.isMaharashtraResident === false && <View style={styles.radioFill} />}
                      </View>
                    </View>
                    <Text style={styles.choiceCardSub}>
                      {language === 'mr'
                        ? 'महाराष्ट्रातील साइटवर ९० दिवस काम केल्यास नियोक्त्याचे प्रमाणपत्र आवश्यक'
                        : language === 'hi'
                        ? 'महाराष्ट्र की साइट पर ९० दिन कार्य करने पर नियोक्ता प्रमाण पत्र आवश्यक'
                        : 'Eligible if working 90+ days on Maharashtra sites with employer certificate'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Bottom Actions: Back and Continue */}
            <View style={styles.actionRow}>
              {step > 1 && (
                <TouchableOpacity onPress={handleBack} style={styles.secondaryButton} activeOpacity={0.8}>
                  <Text style={styles.secondaryButtonText}>{t('back')}</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                onPress={handleNext}
                style={[styles.continueButton, step === 1 && { flex: 1 }]}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.continueButtonText}>
                    {step === totalSteps ? (language === 'mr' ? 'पात्रता तपासा' : language === 'hi' ? 'जांच करें' : 'Evaluate') : t('continue')} →
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
              <Ionicons
                name={
                  result.assessmentStatus === 'PRELIMINARY_SATISFIED'
                    ? 'checkmark-circle'
                    : result.assessmentStatus === 'NEEDS_VERIFICATION'
                    ? 'warning'
                    : 'close-circle'
                }
                size={32}
                color={
                  result.assessmentStatus === 'PRELIMINARY_SATISFIED'
                    ? Colors.success
                    : result.assessmentStatus === 'NEEDS_VERIFICATION'
                    ? Colors.warning
                    : Colors.error
                }
              />
              <View style={styles.resultBannerTextCol}>
                <Text style={styles.resultBannerStatusTitle}>
                  {result.assessmentStatus === 'PRELIMINARY_SATISFIED'
                    ? t('statusSatisfied')
                    : result.assessmentStatus === 'NEEDS_VERIFICATION'
                    ? t('statusNeedsVerification')
                    : t('statusIneligible')}
                </Text>
                <Text style={styles.resultBannerStatusSub}>
                  MAHABOCW Rule Engine • {result.ruleVersion}
                </Text>
              </View>
            </View>

            {/* Accessible Voice Guidance Playback */}
            <View style={{ marginBottom: Spacing.md }}>
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
                      <View style={styles.checkPassBadgeWrap}>
                        <Text style={styles.checkPassBadge}>✓ पूर्ण</Text>
                      </View>
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
                      <View style={styles.checkFailBadgeWrap}>
                        <Text style={styles.checkFailBadge}>✕ अपूर्ण</Text>
                      </View>
                      <Text style={styles.checkTitle}>{item.title[language] || item.title.en}</Text>
                    </View>
                    <Text style={styles.checkExplanation}>{item.explanation[language] || item.explanation.en}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Official Legal Disclaimer Box */}
            <View style={styles.disclaimerCard}>
              <Ionicons name="scale-outline" size={20} color={Colors.mutedSlate} />
              <Text style={styles.disclaimerText}>
                {result.disclaimer[language] || result.disclaimer.en}
              </Text>
            </View>

            {/* Primary Action Button: Proceed to Documents */}
            <TouchableOpacity
              onPress={() => router.push('/documents')}
              style={styles.proceedButton}
              activeOpacity={0.88}
              accessibilityRole="button"
              accessibilityLabel={t('proceedToChecklist')}
            >
              <Text style={styles.proceedButtonText}>{t('proceedToChecklist')}</Text>
              <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
            </TouchableOpacity>

            <TouchableOpacity onPress={handleBack} style={styles.recheckButton} activeOpacity={0.8}>
              <Text style={styles.recheckButtonText}>← {language === 'mr' ? 'पुन्हा तपासा' : language === 'hi' ? 'पुनः जांचें' : 'Re-check Answers'}</Text>
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
    backgroundColor: Colors.backgroundWarm,
  },
  scrollContent: {
    paddingHorizontal: Spacing.screenPadding,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  titleSection: {
    marginBottom: Spacing.md,
  },
  screenTitle: {
    ...Typography.screenTitle,
    color: Colors.primaryNavy,
    marginBottom: 4,
  },
  screenSubtitle: {
    ...Typography.captionRegular,
    color: Colors.mutedSlate,
  },
  cardContainer: {
    backgroundColor: Colors.cardSurface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    ...Shadows.card,
  },
  stepperContainer: {
    marginBottom: Spacing.lg,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  stepItemWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.borderSubtle,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepDotActive: {
    backgroundColor: Colors.accentSaffron,
  },
  stepDotCompleted: {
    backgroundColor: Colors.primaryNavy,
  },
  stepDotText: {
    ...Typography.badgeText,
    fontSize: 12,
    color: Colors.mutedSlate,
  },
  stepDotTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  stepConnector: {
    width: 36,
    height: 3,
    backgroundColor: Colors.borderSubtle,
    marginHorizontal: 4,
  },
  stepConnectorCompleted: {
    backgroundColor: Colors.primaryNavy,
  },
  stepProgressText: {
    ...Typography.captionRegular,
    fontSize: 12,
    color: Colors.mutedSlate,
    textAlign: 'center',
    marginTop: 4,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.errorSurface,
    padding: Spacing.sm,
    borderRadius: Radius.sm,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.errorBorder,
    gap: Spacing.xs,
  },
  errorBannerText: {
    ...Typography.captionRegular,
    color: Colors.error,
    flex: 1,
  },
  questionBox: {
    marginBottom: Spacing.lg,
  },
  questionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  questionTitle: {
    ...Typography.sectionTitle,
    fontSize: 16,
    lineHeight: 22,
    color: Colors.primaryNavy,
    flex: 1,
  },
  questionDesc: {
    ...Typography.captionRegular,
    color: Colors.mutedSlate,
    marginBottom: Spacing.md,
    lineHeight: 18,
  },
  textInput: {
    backgroundColor: Colors.backgroundWarm,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    fontSize: 18,
    color: Colors.primaryNavy,
    fontWeight: '700',
    marginBottom: Spacing.md,
  },
  quickSelectLabel: {
    ...Typography.captionRegular,
    fontSize: 12,
    color: Colors.mutedSlate,
    marginBottom: Spacing.xs,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  chip: {
    backgroundColor: Colors.backgroundWarm,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipSelected: {
    backgroundColor: Colors.saffronOrangeLight,
    borderColor: Colors.accentSaffron,
  },
  chipText: {
    ...Typography.badgeText,
    fontSize: 12,
    color: Colors.textPrimary,
  },
  chipTextSelected: {
    color: Colors.accentSaffronDark,
    fontWeight: '700',
  },
  contextHelpBox: {
    flexDirection: 'row',
    backgroundColor: Colors.warmIvoryAlt,
    padding: Spacing.sm,
    borderRadius: Radius.sm,
    gap: Spacing.xs,
    alignItems: 'flex-start',
  },
  contextHelpText: {
    ...Typography.captionRegular,
    fontSize: 12,
    lineHeight: 16,
    color: Colors.textSecondary,
    flex: 1,
  },
  optionStack: {
    gap: Spacing.sm,
  },
  choiceCard: {
    backgroundColor: Colors.backgroundWarm,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  choiceCardSelected: {
    backgroundColor: Colors.saffronOrangeLight,
    borderColor: Colors.accentSaffron,
  },
  choiceCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  choiceCardTitle: {
    ...Typography.cardTitle,
    fontSize: 15,
    color: Colors.primaryNavy,
  },
  choiceCardSub: {
    ...Typography.captionRegular,
    fontSize: 12,
    color: Colors.mutedSlate,
    lineHeight: 16,
  },
  radioDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.borderHighlight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioFill: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.accentSaffron,
  },
  tradeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  tradeItem: {
    width: '48%',
    backgroundColor: Colors.backgroundWarm,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    minHeight: 74,
    justifyContent: 'center',
  },
  tradeItemSelected: {
    backgroundColor: Colors.saffronOrangeLight,
    borderColor: Colors.accentSaffron,
  },
  tradeText: {
    ...Typography.captionRegular,
    fontSize: 13,
    color: Colors.primaryNavy,
    lineHeight: 17,
  },
  tradeTextSelected: {
    fontWeight: '700',
    color: Colors.accentSaffronDark,
  },
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  secondaryButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: 14,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.backgroundWarm,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: Spacing.touchTargetMin,
  },
  secondaryButtonText: {
    ...Typography.buttonSecondary,
    fontSize: 14,
  },
  continueButton: {
    flex: 2,
    backgroundColor: Colors.accentSaffron,
    borderRadius: Radius.md,
    paddingVertical: 14,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: Spacing.touchTargetMin,
    ...Shadows.sm,
  },
  continueButtonText: {
    ...Typography.buttonPrimary,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  resultsContainer: {
    gap: Spacing.md,
  },
  resultBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    gap: Spacing.sm,
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
  resultBannerTextCol: {
    flex: 1,
  },
  resultBannerStatusTitle: {
    ...Typography.sectionTitle,
    fontSize: 17,
    color: Colors.primaryNavy,
  },
  resultBannerStatusSub: {
    ...Typography.captionRegular,
    fontSize: 11,
    color: Colors.mutedSlate,
  },
  checkSection: {
    gap: Spacing.sm,
  },
  checkSectionHeader: {
    ...Typography.sectionTitle,
    fontSize: 15,
    color: Colors.primaryNavy,
  },
  checkCard: {
    backgroundColor: Colors.cardSurface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    gap: Spacing.xs,
    ...Shadows.sm,
  },
  checkCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  checkPassBadgeWrap: {
    backgroundColor: Colors.successSurface,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.xs,
  },
  checkPassBadge: {
    ...Typography.badgeText,
    fontSize: 11,
    color: Colors.success,
  },
  checkFailBadgeWrap: {
    backgroundColor: Colors.errorSurface,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.xs,
  },
  checkFailBadge: {
    ...Typography.badgeText,
    fontSize: 11,
    color: Colors.error,
  },
  checkTitle: {
    ...Typography.cardTitle,
    fontSize: 14,
    color: Colors.primaryNavy,
    flex: 1,
  },
  checkExplanation: {
    ...Typography.bodyRegular,
    fontSize: 13,
    lineHeight: 18,
    color: Colors.textSecondary,
  },
  recommendationBox: {
    backgroundColor: Colors.backgroundWarm,
    padding: Spacing.sm,
    borderRadius: Radius.sm,
    marginTop: Spacing.xs,
  },
  recommendationLabel: {
    ...Typography.badgeText,
    fontSize: 11,
    color: Colors.accentSaffronDark,
  },
  recommendationText: {
    ...Typography.captionRegular,
    fontSize: 12,
    color: Colors.textPrimary,
  },
  disclaimerCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.md,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    alignItems: 'flex-start',
    gap: Spacing.xs,
  },
  disclaimerText: {
    ...Typography.captionRegular,
    fontSize: 11,
    lineHeight: 16,
    color: Colors.mutedSlate,
    flex: 1,
  },
  proceedButton: {
    backgroundColor: Colors.accentSaffron,
    borderRadius: Radius.md,
    paddingVertical: 14,
    paddingHorizontal: Spacing.lg,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.xs,
    minHeight: Spacing.touchTargetMin,
    ...Shadows.sm,
  },
  proceedButtonText: {
    ...Typography.buttonPrimary,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  recheckButton: {
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  recheckButtonText: {
    ...Typography.captionRegular,
    fontSize: 13,
    color: Colors.mutedSlate,
    fontWeight: '600',
  },
});
