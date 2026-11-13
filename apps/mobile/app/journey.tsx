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
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../src/theme/colors';
import { Typography } from '../src/theme/typography';
import { Spacing, Radius, Shadows } from '../src/theme/spacing';
import { useApp } from '../src/context/AppContext';
import { HeaderBar } from '../src/components/HeaderBar';
import { BottomNav } from '../src/components/BottomNav';
import { TaskCard } from '../src/components/TaskCard';
import { ApiService } from '../src/services/api';
import { ApplicationTaskItem, JourneyStage, JourneyStatusSummary } from '@haq/shared';
import { VoiceGuidanceButton } from '../src/components/VoiceGuidanceButton';
import { VoiceGuidanceService } from '../src/services/voiceGuidance';

export default function JourneyScreen() {
  const router = useRouter();
  const { sessionId, t, language } = useApp();

  const [journey, setJourney] = useState<JourneyStatusSummary | null>(null);
  const [tasks, setTasks] = useState<ApplicationTaskItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Evidence Modal state for Gated SUBMITTED stage
  const [evidenceModalVisible, setEvidenceModalVisible] = useState<boolean>(false);
  const [evidenceType, setEvidenceType] = useState<string>('OFFICIAL_ACKNOWLEDGEMENT_SLIP');
  const [evidenceRef, setEvidenceRef] = useState<string>('');
  const [submittingEvidence, setSubmittingEvidence] = useState<boolean>(false);
  const [evidenceError, setEvidenceError] = useState<string | null>(null);

  useEffect(() => {
    loadJourneyAndTasks();
  }, [sessionId]);

  const loadJourneyAndTasks = async () => {
    setLoading(true);
    try {
      // 1. Load journey summary
      const journeyData = await ApiService.getJourney(sessionId);
      setJourney(journeyData);
    } catch (err) {
      console.warn('API getJourney failed, using default state:', err);
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
    }

    try {
      // 2. Load application tasks
      const taskList = await ApiService.getApplicationTasks(sessionId);
      setTasks(taskList);
    } catch {
      // Fallback default tasks
      setTasks([
        {
          id: 'task-1',
          sessionId,
          title: language === 'mr' ? 'फॉर्म-५ वर कंत्राटदाराची सही व शिक्का घेणे' : language === 'hi' ? 'फॉर्म-५ पर ठेकेदार के हस्ताक्षर व मुहर' : 'Obtain contractor signature on Form-V',
          description: language === 'mr' ? 'साइट इन-चार्ज किंवा ग्रामसेवक यांच्याकडून ९० दिवस कामाचे प्रमाणपत्र प्रमाणित करून घ्या.' : 'Get 90-day work certificate signed by contractor or Gramsevak.',
          status: 'IN_PROGRESS',
          priority: 'HIGH',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'task-2',
          sessionId,
          title: language === 'mr' ? 'आधार कार्डशी बँक खाते जोडलेले असल्याची खात्री करा' : language === 'hi' ? 'बैंक खाते से आधार लिंक सुनिश्चित करें' : 'Verify bank account is linked to Aadhaar (DBT)',
          description: language === 'mr' ? 'थेट बँक खात्यात सरकारी अनुदान मिळण्यासाठी DBT सक्रिय असणे आवश्यक आहे.' : 'DBT active account required for direct grant transfer.',
          status: 'PENDING',
          priority: 'MEDIUM',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'task-3',
          sessionId,
          title: language === 'mr' ? 'आपले सरकार केंद्रावर अर्ज सादर करणे' : language === 'hi' ? 'आपले सरकार केंद्र पर आवेदन जमा करें' : 'Submit files at Aaple Sarkar Kendra Swargate',
          description: language === 'mr' ? 'कागदपत्रे तयार झाल्यावर पोचपावती पावती मिळवण्यासाठी केंद्राला भेट द्या.' : 'Visit Kendra with prepared files to receive official acknowledgment slip.',
          status: 'PENDING',
          priority: 'HIGH',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadJourneyAndTasks();
  };

  const handleAdvanceToPortalHandoff = async () => {
    try {
      await ApiService.recordJourneyEvent(sessionId, 'PORTAL_HANDOFF');
      await loadJourneyAndTasks();
    } catch {
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
            en: 'Visit the official MAHABOCW portal (mahabocw.in) or Aaple Sarkar Kendra in Swargate, Pune.',
            mr: 'अधिकृत MAHABOCW पोर्टल (mahabocw.in) किंवा पुण्यातील स्वारगेट आपले सरकार केंद्रावर जाऊन अर्ज सादर करा.',
            hi: 'आधिकारिक MAHABOCW पोर्टल या पुणे के स्वारगेट केंद्र पर जाकर आवेदन जमा करें।',
          },
        });
      }
    }
  };

  const handleSubmitEvidence = async () => {
    if (!evidenceRef.trim() || evidenceRef.trim().length < 4) {
      setEvidenceError(
        language === 'mr'
          ? 'कृपया योग्य पोचपावती किंवा टोकन क्रमांक प्रविष्ट करा (किमान ४ अक्षरे).'
          : language === 'hi'
          ? 'कृपया वैध पावती या टोकन संख्या दर्ज करें (न्यूनतम ४ अक्षर)।'
          : 'Please enter a valid receipt or registration token (min 4 characters).'
      );
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
      setEvidenceRef('');
      await loadJourneyAndTasks();
    } catch (err: any) {
      setEvidenceError(err.message || 'Verification rejected by backend rules.');
    } finally {
      setSubmittingEvidence(false);
    }
  };

  const handleToggleTask = async (task: ApplicationTaskItem) => {
    const nextStatus = task.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED';
    // Optimistic local update
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, status: nextStatus } : t))
    );

    try {
      await ApiService.updateApplicationTask({
        taskId: task.id,
        sessionId,
        status: nextStatus,
      });
    } catch (err) {
      console.warn('Failed to update task:', err);
    }
  };

  const stages: { stage: JourneyStage; label: string; desc: string; icon: any }[] = [
    {
      stage: 'ELIGIBILITY_GUIDANCE',
      label: t('stage1'),
      desc: language === 'mr' ? '१८-६० वय व ९० दिवस कामाची तपासणी' : language === 'hi' ? '१८-६० आयु व ९० दिन कार्य जांच' : 'Age 18-60 and 90-day work qualification',
      icon: 'shield-checkmark-outline',
    },
    {
      stage: 'DOCUMENT_PREPARATION',
      label: t('stage2'),
      desc: language === 'mr' ? 'फॉर्म-५, आधार, रहिवासी दाखला व पासबुक' : language === 'hi' ? 'फॉर्म-५, आधार, निवास व पासबुक' : 'Form-V certificate, ID proof, photos',
      icon: 'document-text-outline',
    },
    {
      stage: 'PORTAL_HANDOFF',
      label: t('stage3'),
      desc: language === 'mr' ? 'mahabocw.in किंवा आपले सरकार केंद्र' : language === 'hi' ? 'mahabocw.in या आपले सरकार केंद्र' : 'Official MAHABOCW portal / CSC Kendra',
      icon: 'laptop-outline',
    },
    {
      stage: 'SUBMITTED',
      label: t('stage4'),
      desc: language === 'mr' ? 'अधिकृत पोचपावती क्रमांक नोंदवून पूर्ण' : language === 'hi' ? 'आधिकारिक पावती संख्या दर्ज करें' : 'Gated with official acknowledgment slip',
      icon: 'checkmark-done-circle-outline',
    },
    {
      stage: 'OUTCOME_RECORDED',
      label: t('stage5'),
      desc: language === 'mr' ? 'स्मार्ट कार्ड व योजनांचे थेट लाभ' : language === 'hi' ? 'स्मार्ट कार्ड व प्रत्यक्ष लाभ' : 'Smart card issued & benefits unlocked',
      icon: 'ribbon-outline',
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
        {/* Title Header */}
        <View style={styles.titleSection}>
          <Text style={styles.screenTitle}>{t('journeyTitle')}</Text>
          <Text style={styles.screenSubtitle}>{t('journeySubtitle')}</Text>
        </View>

        {/* Milestone Summary Card */}
        {journey && (
          <View style={styles.heroCard}>
            <View style={styles.heroHeader}>
              <View>
                <Text style={styles.heroLabel}>{language === 'mr' ? 'सध्याचा नोंदणी टप्पा' : language === 'hi' ? 'वर्तमान पंजीकरण चरण' : 'CURRENT STAGE'}</Text>
                <Text style={styles.heroStageName}>
                  {journey.currentStage === 'ELIGIBILITY_GUIDANCE'
                    ? t('stage1')
                    : journey.currentStage === 'DOCUMENT_PREPARATION'
                    ? t('stage2')
                    : journey.currentStage === 'PORTAL_HANDOFF'
                    ? t('stage3')
                    : journey.currentStage === 'SUBMITTED'
                    ? t('stage4')
                    : t('stage5')}
                </Text>
              </View>
              <View style={styles.progressPill}>
                <Text style={styles.progressPillText}>{journey.progressPercent}%</Text>
              </View>
            </View>

            {/* Progress Bar */}
            <View style={styles.progressBarTrack}>
              <View style={[styles.progressBarFill, { width: `${Math.max(10, journey.progressPercent)}%` }]} />
            </View>

            {/* What to do next */}
            {journey.whatToDoNext && (
              <View style={styles.nextBox}>
                <Ionicons name="compass" size={20} color={Colors.accentSaffron} style={{ marginTop: 2 }} />
                <View style={styles.nextTextCol}>
                  <Text style={styles.nextBoxLabel}>{t('whatNextCardTitle')}</Text>
                  <Text style={styles.nextBoxContent}>
                    {journey.whatToDoNext[language] || journey.whatToDoNext.en}
                  </Text>
                </View>
              </View>
            )}

            {/* Stage Advancement Action Button */}
            {journey.currentStage === 'DOCUMENT_PREPARATION' && (
              <TouchableOpacity
                style={styles.advanceBtn}
                onPress={handleAdvanceToPortalHandoff}
                activeOpacity={0.88}
              >
                <Text style={styles.advanceBtnText}>
                  {language === 'mr' ? 'पोर्टल हँडऑफकडे जा' : language === 'hi' ? 'पोर्टल हैंडऑफ पर जाएं' : 'Proceed to Portal Handoff'} →
                </Text>
              </TouchableOpacity>
            )}

            {journey.currentStage === 'PORTAL_HANDOFF' && (
              <TouchableOpacity
                style={styles.advanceBtn}
                onPress={() => setEvidenceModalVisible(true)}
                activeOpacity={0.88}
              >
                <Text style={styles.advanceBtnText}>{t('recordSubmissionBtn')} →</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* 5-Stage Visual Timeline */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>{language === 'mr' ? 'नोंदणीचे ५ महत्त्वाचे टप्पे' : language === 'hi' ? 'पंजीकरण के ५ मुख्य चरण' : '5-Stage Registration Roadmap'}</Text>
        </View>

        <View style={styles.timelineCard}>
          {stages.map((st, idx) => {
            const status = journey?.stageStatuses?.[st.stage] || 'PENDING';
            const isCompleted = status === 'COMPLETED';
            const isActive = status === 'ACTIVE';
            const isLocked = status === 'LOCKED';

            return (
              <View key={st.stage} style={styles.timelineRow}>
                {/* Left indicator column */}
                <View style={styles.timelineIndicatorCol}>
                  <View
                    style={[
                      styles.timelineDot,
                      isCompleted && styles.timelineDotCompleted,
                      isActive && styles.timelineDotActive,
                      isLocked && styles.timelineDotLocked,
                    ]}
                  >
                    <Ionicons
                      name={isCompleted ? 'checkmark' : st.icon}
                      size={16}
                      color={isCompleted || isActive ? '#FFFFFF' : Colors.mutedSlate}
                    />
                  </View>
                  {idx < stages.length - 1 && (
                    <View
                      style={[
                        styles.timelineConnector,
                        isCompleted && styles.timelineConnectorCompleted,
                      ]}
                    />
                  )}
                </View>

                {/* Right content column */}
                <View style={[styles.timelineContent, isActive && styles.timelineContentActive]}>
                  <View style={styles.timelineHeaderRow}>
                    <Text style={[styles.timelineStageTitle, isActive && styles.timelineStageTitleActive]}>
                      {idx + 1}. {st.label}
                    </Text>
                    <View
                      style={[
                        styles.statusPill,
                        isCompleted && styles.statusPillCompleted,
                        isActive && styles.statusPillActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusPillText,
                          isCompleted && styles.statusPillTextCompleted,
                          isActive && styles.statusPillTextActive,
                        ]}
                      >
                        {isCompleted
                          ? t('stageStatusCompleted')
                          : isActive
                          ? t('stageStatusActive')
                          : isLocked
                          ? t('stageStatusLocked')
                          : t('stageStatusPending')}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.timelineStageDesc}>{st.desc}</Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* Application Tasks Section */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>{language === 'mr' ? 'महत्त्वाची आवश्यक कामे' : language === 'hi' ? 'आवश्यक कार्य सूची' : 'Actionable Application Tasks'}</Text>
          <Text style={styles.sectionSubtitle}>
            {language === 'mr' ? 'पूर्ण झाल्यावर टिक मार्क करा' : language === 'hi' ? 'पूर्ण होने पर टिक करें' : 'Check off items as completed'}
          </Text>
        </View>

        <View style={styles.tasksContainer}>
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              id={task.id}
              title={task.title}
              description={task.description}
              status={task.status}
              priority={task.priority}
              language={language}
              onToggleStatus={() => handleToggleTask(task)}
            />
          ))}
        </View>

        {/* Official MAHABOCW Portal & Swargate Assistance Box */}
        <View style={styles.supportCard}>
          <View style={styles.supportHeaderRow}>
            <Ionicons name="business" size={24} color={Colors.primaryNavy} />
            <Text style={styles.supportTitle}>{t('humanSupportTitle')}</Text>
          </View>
          <Text style={styles.supportAddress}>{t('humanSupportOffice')}</Text>

          <TouchableOpacity
            style={styles.helplineBtn}
            onPress={() => Linking.openURL('tel:18008892816')}
            activeOpacity={0.8}
          >
            <Ionicons name="call" size={18} color="#FFFFFF" />
            <Text style={styles.helplineBtnText}>{t('humanSupportHelpline')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.portalBtn}
            onPress={() => Linking.openURL('https://mahabocw.in')}
            activeOpacity={0.8}
          >
            <Ionicons name="globe-outline" size={18} color={Colors.primaryNavy} />
            <Text style={styles.portalBtnText}>{t('openPortalBtn')} (mahabocw.in) →</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Evidence Submission Modal for Gated SUBMITTED stage */}
      <Modal
        visible={evidenceModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEvidenceModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalHeaderTitle}>{t('evidenceModalTitle')}</Text>
              <TouchableOpacity
                onPress={() => setEvidenceModalVisible(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={22} color={Colors.mutedSlate} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.gatingNotice}>
                <Ionicons name="warning-outline" size={22} color={Colors.warning} />
                <Text style={styles.gatingNoticeText}>{t('gatingNoteDesc')}</Text>
              </View>

              <Text style={styles.modalFieldLabel}>{t('evidenceTypeLabel')}</Text>
              <View style={styles.evidenceTypeStack}>
                {[
                  { key: 'OFFICIAL_ACKNOWLEDGEMENT_SLIP', label: language === 'mr' ? 'अधिकृत सरकारी अर्ज पावती (Slip)' : 'Official Acknowledgement Slip' },
                  { key: 'CSC_TOKEN', label: language === 'mr' ? 'आपले सरकार केंद्र टोकन पावती' : 'Aaple Sarkar Kendra / CSC Token' },
                  { key: 'SEVA_KENDRA_RECEIPT', label: language === 'mr' ? 'कामगार सुविधा केंद्र पोचपावती' : 'Labor Seva Kendra Receipt' },
                ].map((type) => (
                  <TouchableOpacity
                    key={type.key}
                    style={[
                      styles.evidenceTypeOption,
                      evidenceType === type.key && styles.evidenceTypeOptionActive,
                    ]}
                    onPress={() => setEvidenceType(type.key)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.evidenceTypeOptionText,
                        evidenceType === type.key && styles.evidenceTypeOptionTextActive,
                      ]}
                    >
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.modalFieldLabel}>{t('evidenceRefLabel')}</Text>
              <TextInput
                style={styles.modalInput}
                value={evidenceRef}
                onChangeText={setEvidenceRef}
                placeholder={t('evidenceRefPlaceholder')}
                placeholderTextColor={Colors.textMuted}
                autoCapitalize="characters"
              />

              {evidenceError && (
                <View style={styles.modalErrorBox}>
                  <Ionicons name="alert-circle" size={16} color={Colors.error} />
                  <Text style={styles.modalErrorText}>{evidenceError}</Text>
                </View>
              )}

              <View style={styles.modalActionRow}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => setEvidenceModalVisible(false)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.modalCancelBtnText}>{t('cancel')}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.modalSubmitBtn}
                  onPress={handleSubmitEvidence}
                  disabled={submittingEvidence}
                  activeOpacity={0.85}
                >
                  {submittingEvidence ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.modalSubmitBtnText}>{t('submitEvidenceBtn')}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
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
  heroCard: {
    backgroundColor: Colors.primaryNavy,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    ...Shadows.md,
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  heroLabel: {
    ...Typography.badgeText,
    fontSize: 10,
    color: Colors.accentSaffron,
    letterSpacing: 0.5,
  },
  heroStageName: {
    ...Typography.sectionTitle,
    fontSize: 18,
    color: '#FFFFFF',
    marginTop: 2,
  },
  progressPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  progressPillText: {
    ...Typography.badgeText,
    color: '#FFFFFF',
    fontSize: 13,
  },
  progressBarTrack: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: Radius.full,
    overflow: 'hidden',
    marginBottom: Spacing.md,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.accentSaffron,
    borderRadius: Radius.full,
  },
  nextBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  nextTextCol: {
    flex: 1,
  },
  nextBoxLabel: {
    ...Typography.badgeText,
    fontSize: 11,
    color: Colors.accentSaffron,
    marginBottom: 2,
  },
  nextBoxContent: {
    ...Typography.bodyRegular,
    fontSize: 13,
    lineHeight: 18,
    color: '#F3F4F6',
  },
  advanceBtn: {
    backgroundColor: Colors.accentSaffron,
    borderRadius: Radius.md,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  advanceBtnText: {
    ...Typography.buttonPrimary,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  sectionHeaderRow: {
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    ...Typography.sectionTitle,
    color: Colors.primaryNavy,
  },
  sectionSubtitle: {
    ...Typography.captionRegular,
    color: Colors.mutedSlate,
  },
  timelineCard: {
    backgroundColor: Colors.cardSurface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    marginBottom: Spacing.md,
    ...Shadows.sm,
  },
  timelineRow: {
    flexDirection: 'row',
    marginBottom: Spacing.sm,
  },
  timelineIndicatorCol: {
    alignItems: 'center',
    marginRight: Spacing.sm,
    width: 32,
  },
  timelineDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.borderSubtle,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timelineDotCompleted: {
    backgroundColor: Colors.success,
  },
  timelineDotActive: {
    backgroundColor: Colors.accentSaffron,
  },
  timelineDotLocked: {
    backgroundColor: Colors.borderSubtle,
  },
  timelineConnector: {
    width: 2,
    flex: 1,
    backgroundColor: Colors.borderSubtle,
    marginVertical: 4,
  },
  timelineConnectorCompleted: {
    backgroundColor: Colors.success,
  },
  timelineContent: {
    flex: 1,
    paddingBottom: Spacing.sm,
  },
  timelineContentActive: {
    backgroundColor: Colors.saffronOrangeLight,
    padding: Spacing.sm,
    borderRadius: Radius.sm,
  },
  timelineHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  timelineStageTitle: {
    ...Typography.cardTitle,
    fontSize: 14,
    color: Colors.primaryNavy,
  },
  timelineStageTitleActive: {
    fontWeight: '700',
    color: Colors.primaryNavy,
  },
  timelineStageDesc: {
    ...Typography.captionRegular,
    fontSize: 12,
    color: Colors.mutedSlate,
    lineHeight: 16,
  },
  statusPill: {
    backgroundColor: Colors.backgroundWarm,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.xs,
  },
  statusPillCompleted: {
    backgroundColor: Colors.successSurface,
  },
  statusPillActive: {
    backgroundColor: Colors.accentSaffron,
  },
  statusPillText: {
    ...Typography.badgeText,
    fontSize: 10,
    color: Colors.mutedSlate,
  },
  statusPillTextCompleted: {
    color: Colors.success,
  },
  statusPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  tasksContainer: {
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  supportCard: {
    backgroundColor: Colors.cardSurface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    marginTop: Spacing.sm,
    gap: Spacing.sm,
    ...Shadows.sm,
  },
  supportHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  supportTitle: {
    ...Typography.sectionTitle,
    fontSize: 15,
    color: Colors.primaryNavy,
  },
  supportAddress: {
    ...Typography.captionRegular,
    fontSize: 12,
    color: Colors.mutedSlate,
    lineHeight: 17,
  },
  helplineBtn: {
    backgroundColor: Colors.primaryNavy,
    borderRadius: Radius.md,
    paddingVertical: 12,
    paddingHorizontal: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  helplineBtnText: {
    ...Typography.badgeText,
    color: '#FFFFFF',
    fontSize: 13,
  },
  portalBtn: {
    backgroundColor: Colors.backgroundWarm,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  portalBtnText: {
    ...Typography.captionRegular,
    fontWeight: '600',
    color: Colors.primaryNavy,
    fontSize: 13,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(16, 26, 58, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.cardSurface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing.lg,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  modalHeaderTitle: {
    ...Typography.sectionTitle,
    color: Colors.primaryNavy,
  },
  modalCloseBtn: {
    padding: 4,
  },
  gatingNotice: {
    flexDirection: 'row',
    backgroundColor: Colors.warningSurface,
    padding: Spacing.sm,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.warningBorder,
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  gatingNoticeText: {
    ...Typography.captionRegular,
    fontSize: 12,
    lineHeight: 16,
    color: Colors.textPrimary,
    flex: 1,
  },
  modalFieldLabel: {
    ...Typography.labelMedium,
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  evidenceTypeStack: {
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  evidenceTypeOption: {
    padding: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.backgroundWarm,
  },
  evidenceTypeOptionActive: {
    borderColor: Colors.accentSaffron,
    backgroundColor: Colors.saffronOrangeLight,
    borderWidth: 1.5,
  },
  evidenceTypeOptionText: {
    ...Typography.bodyRegular,
    fontSize: 13,
    color: Colors.textPrimary,
  },
  evidenceTypeOptionTextActive: {
    fontWeight: '700',
    color: Colors.accentSaffronDark,
  },
  modalInput: {
    backgroundColor: Colors.backgroundWarm,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.primaryNavy,
    fontWeight: '700',
    marginBottom: Spacing.md,
  },
  modalErrorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.errorSurface,
    padding: Spacing.sm,
    borderRadius: Radius.sm,
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  modalErrorText: {
    ...Typography.captionRegular,
    fontSize: 12,
    color: Colors.error,
    flex: 1,
  },
  modalActionRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    minHeight: Spacing.touchTargetMin,
  },
  modalCancelBtnText: {
    ...Typography.buttonSecondary,
    fontSize: 14,
  },
  modalSubmitBtn: {
    flex: 2,
    backgroundColor: Colors.accentSaffron,
    paddingVertical: 14,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: Spacing.touchTargetMin,
    ...Shadows.sm,
  },
  modalSubmitBtnText: {
    ...Typography.buttonPrimary,
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
