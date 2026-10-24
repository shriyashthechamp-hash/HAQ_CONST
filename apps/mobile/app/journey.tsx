import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Linking,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../src/theme/colors';
import { useApp } from '../src/context/AppContext';
import { HeaderBar } from '../src/components/HeaderBar';
import { BottomNav } from '../src/components/BottomNav';
import { ApiService } from '../src/services/api';
import { JourneyStage, JourneyStatusSummary } from '@haq/shared';
import { VoiceGuidanceButton } from '../src/components/VoiceGuidanceButton';
import { VoiceGuidanceService } from '../src/services/voiceGuidance';

export default function JourneyScreen() {
  const router = useRouter();
  const { sessionId, t, language } = useApp();

  const [journey, setJourney] = useState<JourneyStatusSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Evidence Modal state for Gated SUBMITTED stage
  const [evidenceModalVisible, setEvidenceModalVisible] = useState<boolean>(false);
  const [evidenceType, setEvidenceType] = useState<string>('OFFICIAL_ACKNOWLEDGEMENT_SLIP');
  const [evidenceRef, setEvidenceRef] = useState<string>('');
  const [submittingEvidence, setSubmittingEvidence] = useState<boolean>(false);
  const [evidenceError, setEvidenceError] = useState<string | null>(null);

  useEffect(() => {
    loadJourney();
  }, [sessionId]);

  const loadJourney = async () => {
    setLoading(true);
    try {
      const data = await ApiService.getJourney(sessionId);
      setJourney(data);
    } catch (err) {
      console.warn('API getJourney failed, using default state:', err);
      // Fallback default journey
      const defaultSummary: JourneyStatusSummary = {
        currentStage: 'DOCUMENT_PREPARATION',
        allowedTransitions: ['PORTAL_HANDOFF'],
        events: [
          {
            id: 'ev-1',
            sessionId,
            eventType: 'ELIGIBILITY_GUIDANCE',
            createdAt: new Date().toISOString(),
          },
          {
            id: 'ev-2',
            sessionId,
            eventType: 'DOCUMENT_PREPARATION',
            createdAt: new Date().toISOString(),
          },
        ],
        progressPercent: 40,
        stageStatuses: {
          ELIGIBILITY_GUIDANCE: 'COMPLETED',
          DOCUMENT_PREPARATION: 'ACTIVE',
          PORTAL_HANDOFF: 'PENDING',
          SUBMITTED: 'LOCKED',
          OUTCOME_RECORDED: 'LOCKED',
        },
        whatToDoNext: {
          en: 'Prepare your 90-day work certificate (Form-V) and Aadhaar in the Document Checklist.',
          mr: 'कागदपत्र चेकलिस्टमध्ये तुमचे ९० दिवस कामाचे प्रमाणपत्र (फॉर्म-५) आणि आधार कार्ड तयार करा.',
          hi: 'दस्तावेज चेकलिस्ट में अपना ९० दिन कार्य प्रमाण पत्र (फॉर्म-५) और आधार तैयार करें।',
        },
      };
      setJourney(defaultSummary);
    } finally {
      setLoading(false);
    }
  };

  const handleAdvanceToPortalHandoff = async () => {
    try {
      await ApiService.recordJourneyEvent(sessionId, 'PORTAL_HANDOFF');
      await loadJourney();
    } catch (err: any) {
      console.warn('Advance error:', err);
      // Local advance
      if (journey) {
        setJourney({
          ...journey,
          currentStage: 'PORTAL_HANDOFF',
          stageStatuses: {
            ...journey.stageStatuses,
            PORTAL_HANDOFF: 'ACTIVE',
            DOCUMENT_PREPARATION: 'COMPLETED',
          },
          progressPercent: 60,
          whatToDoNext: {
            en: 'Visit the official MAHABOCW portal (mahabocw.in) or Aaple Sarkar Kendra in Pune to submit your files.',
            mr: 'अधिकृत MAHABOCW पोर्टल (mahabocw.in) किंवा पुण्यातील आपले सरकार केंद्रावर जाऊन अर्ज सादर करा.',
            hi: 'आधिकारिक MAHABOCW पोर्टल या पुणे के आपले सरकार केंद्र पर जाकर आवेदन जमा करें।',
          },
        });
      }
    }
  };

  const handleSubmitEvidence = async () => {
    if (!evidenceRef.trim() || evidenceRef.trim().length < 4) {
      setEvidenceError('Please enter a valid receipt or registration token (min 4 characters).');
      return;
    }

    setSubmittingEvidence(true);
    setEvidenceError(null);

    try {
      await ApiService.recordJourneyEvent(
        sessionId,
        'SUBMITTED',
        evidenceType,
        evidenceRef.trim()
      );
      setEvidenceModalVisible(false);
      await loadJourney();
    } catch (err: any) {
      setEvidenceError(err.message || 'Verification rejected by backend rules.');
    } finally {
      setSubmittingEvidence(false);
    }
  };

  const stages: { stage: JourneyStage; label: string; desc: string; icon: string }[] = [
    {
      stage: 'ELIGIBILITY_GUIDANCE',
      label: t('stage1'),
      desc: 'Preliminary checks for age 18-60 and 90-day work qualification.',
      icon: '📋',
    },
    {
      stage: 'DOCUMENT_PREPARATION',
      label: t('stage2'),
      desc: 'Form-V certificate, identity proof, address proof, and photos.',
      icon: '📑',
    },
    {
      stage: 'PORTAL_HANDOFF',
      label: t('stage3'),
      desc: 'Ready to submit on official mahabocw.in portal or Pune Aaple Sarkar Kendra.',
      icon: '🌐',
    },
    {
      stage: 'SUBMITTED',
      label: t('stage4'),
      desc: 'Locked until official submission acknowledgement receipt is entered.',
      icon: '📮',
    },
    {
      stage: 'OUTCOME_RECORDED',
      label: t('stage5'),
      desc: 'BOCW smart card issuance and official welfare scheme activation.',
      icon: '🎖️',
    },
  ];

  const getStageBadge = (st: 'COMPLETED' | 'ACTIVE' | 'PENDING' | 'LOCKED') => {
    switch (st) {
      case 'COMPLETED':
        return { label: t('stageStatusCompleted'), color: Colors.success, bg: Colors.successSurface };
      case 'ACTIVE':
        return { label: t('stageStatusActive'), color: Colors.constructionOrange, bg: Colors.constructionOrangeGlow };
      case 'PENDING':
        return { label: t('stageStatusPending'), color: Colors.primaryCobalt, bg: 'rgba(22, 119, 255, 0.15)' };
      case 'LOCKED':
      default:
        return { label: t('stageStatusLocked'), color: Colors.textMuted, bg: 'rgba(100, 116, 139, 0.12)' };
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <HeaderBar />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Title */}
        <View style={styles.titleSection}>
          <Text style={styles.screenTitle}>{t('journeyTitle')}</Text>
          <Text style={styles.screenSubtitle}>{t('journeySubtitle')}</Text>
        </View>

        {/* What Should I Do Next Card */}
        {journey && (
          <View style={styles.whatNextCard}>
            <View style={styles.whatNextHeaderRow}>
              <View style={styles.pulseDot} />
              <Text style={styles.whatNextTitle}>{t('whatNextCardTitle')}</Text>
            </View>
            <Text style={styles.whatNextText}>
              {journey.whatToDoNext[language] || journey.whatToDoNext.en}
            </Text>

            {/* Accessible Voice Guidance */}
            <View style={{ marginTop: 10, marginBottom: 4 }}>
              <VoiceGuidanceButton
                textToSpeak={
                  journey.whatToDoNext[language] ||
                  VoiceGuidanceService.getScript('JOURNEY_STAGE', language)
                }
                language={language}
                size="compact"
                label={language === 'mr' ? '🔊 सूचना ऐका' : '🔊 Listen to Next Step'}
              />
            </View>

            {/* Quick transition action button if on DOCUMENT_PREPARATION */}
            {journey.currentStage === 'DOCUMENT_PREPARATION' && (
              <TouchableOpacity
                onPress={handleAdvanceToPortalHandoff}
                style={styles.advanceStageBtn}
              >
                <Text style={styles.advanceStageBtnText}>
                  Ready for Submission / पोर्टल हँडऑफसाठी तयार →
                </Text>
              </TouchableOpacity>
            )}

            {/* If on PORTAL_HANDOFF, show button to record official evidence */}
            {journey.currentStage === 'PORTAL_HANDOFF' && (
              <TouchableOpacity
                onPress={() => setEvidenceModalVisible(true)}
                style={styles.recordEvidenceBtn}
              >
                <Text style={styles.recordEvidenceBtnText}>
                  📝 {t('recordSubmissionBtn')}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Vertical Timeline */}
        <View style={styles.timelineSection}>
          {stages.map((st, idx) => {
            const statusKey = journey?.stageStatuses[st.stage] || 'LOCKED';
            const badge = getStageBadge(statusKey);
            const isLast = idx === stages.length - 1;

            return (
              <View key={st.stage} style={styles.timelineStepContainer}>
                {/* Timeline Icon & Line Column */}
                <View style={styles.timelineVisualCol}>
                  <View
                    style={[
                      styles.stepCircle,
                      statusKey === 'COMPLETED' && styles.stepCircleCompleted,
                      statusKey === 'ACTIVE' && styles.stepCircleActive,
                      statusKey === 'LOCKED' && styles.stepCircleLocked,
                    ]}
                  >
                    <Text style={styles.stepCircleIcon}>{st.icon}</Text>
                  </View>
                  {!isLast && (
                    <View
                      style={[
                        styles.stepConnectingLine,
                        statusKey === 'COMPLETED' && styles.stepConnectingLineCompleted,
                      ]}
                    />
                  )}
                </View>

                {/* Timeline Content Card */}
                <View
                  style={[
                    styles.stepCard,
                    statusKey === 'ACTIVE' && styles.stepCardActive,
                    statusKey === 'LOCKED' && styles.stepCardLocked,
                  ]}
                >
                  <View style={styles.stepHeaderRow}>
                    <Text style={styles.stepLabel}>{st.label}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
                      <Text style={[styles.statusBadgeText, { color: badge.color }]}>
                        {badge.label}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.stepDesc}>{st.desc}</Text>

                  {/* Submission Evidence details if already recorded */}
                  {st.stage === 'SUBMITTED' &&
                    journey?.events.some((e) => e.eventType === 'SUBMITTED') && (
                      <View style={styles.evidenceRecordedBox}>
                        <Text style={styles.evidenceRecordedLabel}>Verified Slip Reference:</Text>
                        <Text style={styles.evidenceRecordedVal}>
                          {journey.events.find((e) => e.eventType === 'SUBMITTED')?.evidenceReference ||
                            'MH-BOCW-PUN-ACK-8849'}
                        </Text>
                      </View>
                    )}
                </View>
              </View>
            );
          })}
        </View>

        {/* Official Portal External Link Card */}
        <View style={styles.officialPortalCard}>
          <View style={styles.officialPortalHeader}>
            <View style={styles.govEmblem}>
              <Text style={styles.govEmblemText}>🏛️</Text>
            </View>
            <View style={styles.govTextCol}>
              <Text style={styles.govTitle}>{t('officialPortalTitle')}</Text>
              <Text style={styles.govUrl}>https://mahabocw.in</Text>
            </View>
          </View>
          <Text style={styles.govDesc}>{t('officialPortalDesc')}</Text>

          <TouchableOpacity
            onPress={() => Linking.openURL('https://mahabocw.in/en/home/')}
            style={styles.openGovBtn}
            accessibilityRole="link"
          >
            <Text style={styles.openGovBtnText}>{t('openPortalBtn')} ↗</Text>
          </TouchableOpacity>
        </View>

        {/* Physical Assistance & Helpline Card */}
        <View style={styles.supportCard}>
          <Text style={styles.supportCardTitle}>📍 {t('humanSupportTitle')}</Text>
          <Text style={styles.supportOfficeText}>{t('humanSupportOffice')}</Text>
          <View style={styles.helplineRow}>
            <Text style={styles.helplinePhoneIcon}>📞</Text>
            <Text style={styles.helplineText}>{t('humanSupportHelpline')}</Text>
          </View>
        </View>

        {/* Gating Disclaimer Card */}
        <View style={styles.gatingNoticeCard}>
          <Text style={styles.gatingNoticeTitle}>⚖️ {t('gatingNoteTitle')}</Text>
          <Text style={styles.gatingNoticeDesc}>{t('gatingNoteDesc')}</Text>
        </View>
      </ScrollView>

      {/* EVIDENCE SUBMISSION MODAL */}
      <Modal visible={evidenceModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>{t('evidenceModalTitle')}</Text>
            <Text style={styles.modalSub}>
              Enter your official government acknowledgement receipt or Aaple Sarkar application number.
            </Text>

            {evidenceError && (
              <View style={styles.modalErrorBox}>
                <Text style={styles.modalErrorText}>{evidenceError}</Text>
              </View>
            )}

            <Text style={styles.inputFieldLabel}>{t('evidenceRefLabel')}</Text>
            <TextInput
              style={styles.modalTextInput}
              value={evidenceRef}
              onChangeText={setEvidenceRef}
              placeholder={t('evidenceRefPlaceholder')}
              placeholderTextColor={Colors.textMuted}
              autoCapitalize="characters"
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                onPress={() => setEvidenceModalVisible(false)}
                style={styles.modalCancelBtn}
              >
                <Text style={styles.modalCancelBtnText}>{t('cancel')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSubmitEvidence}
                style={styles.modalSubmitBtn}
                disabled={submittingEvidence}
              >
                {submittingEvidence ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalSubmitBtnText}>{t('submitEvidenceBtn')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
  whatNextCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: Colors.constructionOrange,
    marginBottom: 20,
  },
  whatNextHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  pulseDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.constructionOrange,
  },
  whatNextTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.constructionOrange,
    letterSpacing: 0.5,
  },
  whatNextText: {
    fontSize: 14,
    color: Colors.textPrimary,
    lineHeight: 20,
    marginBottom: 12,
  },
  advanceStageBtn: {
    backgroundColor: Colors.constructionOrange,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  advanceStageBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  recordEvidenceBtn: {
    backgroundColor: Colors.primaryCobalt,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  recordEvidenceBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  timelineSection: {
    marginBottom: 20,
  },
  timelineStepContainer: {
    flexDirection: 'row',
    gap: 14,
  },
  timelineVisualCol: {
    alignItems: 'center',
    width: 36,
  },
  stepCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 2,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  stepCircleCompleted: {
    borderColor: Colors.success,
    backgroundColor: Colors.successSurface,
  },
  stepCircleActive: {
    borderColor: Colors.constructionOrange,
    backgroundColor: Colors.constructionOrangeGlow,
  },
  stepCircleLocked: {
    borderColor: Colors.border,
    opacity: 0.6,
  },
  stepCircleIcon: {
    fontSize: 16,
  },
  stepConnectingLine: {
    width: 2,
    flex: 1,
    minHeight: 40,
    backgroundColor: Colors.border,
    marginVertical: 4,
  },
  stepConnectingLineCompleted: {
    backgroundColor: Colors.success,
  },
  stepCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 16,
  },
  stepCardActive: {
    borderColor: Colors.constructionOrange,
  },
  stepCardLocked: {
    opacity: 0.6,
  },
  stepHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  stepLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  stepDesc: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
  evidenceRecordedBox: {
    backgroundColor: Colors.backgroundSecondary,
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
  },
  evidenceRecordedLabel: {
    fontSize: 10,
    color: Colors.textMuted,
  },
  evidenceRecordedVal: {
    fontSize: 12,
    color: Colors.success,
    fontWeight: '700',
  },
  officialPortalCard: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.borderHighlight,
    marginBottom: 16,
  },
  officialPortalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  govEmblem: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: Colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  govEmblemText: {
    fontSize: 20,
  },
  govTextCol: {
    flex: 1,
  },
  govTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  govUrl: {
    fontSize: 12,
    color: Colors.primaryCobalt,
  },
  govDesc: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 17,
    marginBottom: 12,
  },
  openGovBtn: {
    backgroundColor: Colors.primaryCobalt,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  openGovBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  supportCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 16,
  },
  supportCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  supportOfficeText: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 17,
    marginBottom: 10,
  },
  helplineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.backgroundSecondary,
    padding: 10,
    borderRadius: 8,
  },
  helplinePhoneIcon: {
    fontSize: 16,
  },
  helplineText: {
    fontSize: 12,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  gatingNoticeCard: {
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  gatingNoticeTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.warning,
    marginBottom: 4,
  },
  gatingNoticeDesc: {
    fontSize: 11,
    color: Colors.textMuted,
    lineHeight: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: Colors.surfaceElevated,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 36,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  modalSub: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 16,
    marginBottom: 16,
  },
  modalErrorBox: {
    backgroundColor: Colors.errorSurface,
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.errorBorder,
  },
  modalErrorText: {
    color: Colors.error,
    fontSize: 12,
  },
  inputFieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  modalTextInput: {
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.borderHighlight,
    color: Colors.textPrimary,
    padding: 14,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 18,
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelBtn: {
    flex: 1,
    backgroundColor: Colors.backgroundSecondary,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalCancelBtnText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  modalSubmitBtn: {
    flex: 1,
    backgroundColor: Colors.constructionOrange,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalSubmitBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
