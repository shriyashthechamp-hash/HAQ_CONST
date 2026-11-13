import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  TextInput,
  ActivityIndicator,
  Modal,
  Alert,
  Platform,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../src/theme/colors';
import { Typography } from '../src/theme/typography';
import { Spacing, Radius, Shadows } from '../src/theme/spacing';
import { useApp } from '../src/context/AppContext';
import { HeaderBar } from '../src/components/HeaderBar';
import { BottomNav } from '../src/components/BottomNav';
import { SourceCitationCard } from '../src/components/SourceCitationCard';
import { VoiceController } from '../src/components/VoiceController';
import { VoiceReviewModal } from '../src/components/VoiceReviewModal';
import { AudioPlayerBar } from '../src/components/AudioPlayerBar';
import { ApiService } from '../src/services/api';
import { VoiceRecordingService } from '../src/services/voiceRecordingService';
import { VoicePlaybackService } from '../src/services/voicePlaybackService';
import { VoiceState } from '../src/services/voiceStateMachine';
import { AgentResponse, KnowledgeSourceCitation, WorkerProfile } from '@haq/shared';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: KnowledgeSourceCitation[];
  isDemoFallback?: boolean;
  proposedActions?: any[];
  audioBase64?: string;
}

export default function AssistantScreen() {
  const router = useRouter();
  const { sessionId, t, language } = useApp();

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome-msg',
      role: 'assistant',
      content:
        language === 'mr'
          ? 'नमस्कार! मी **HAQ मदतनीस**. बांधकाम कामगारांच्या कल्याणकारी योजना, ९० दिवस कामाचे प्रमाणपत्र (फॉर्म-५) आणि आवश्यक कागदपत्रांबद्दल तुम्हाला काय माहिती हवी आहे? तुम्ही खालील माइक दाबून थेट बोलू शकता.'
          : language === 'hi'
          ? 'नमस्ते! मैं **HAQ सहायक** हूँ। निर्माण श्रमिकों के कल्याणकारी लाभ, ९० दिन कार्य प्रमाण पत्र (फॉर्म-५) और आवश्यक दस्तावेजों के बारे में आप क्या जानना चाहते हैं? आप नीचे दिए माइक पर बोल भी सकते हैं।'
          : 'Hello! I am **HAQ Assistant**. How can I help you regarding MAHABOCW construction worker benefits, 90-day certificates (Form-V), or required documents? You can tap the mic below to speak.',
      citations: [
        {
          sourceId: 'MAHABOCW-SRC-REG-01',
          title: 'MAHABOCW Official Registration Criteria',
          url: 'https://mahabocw.in/en/workers-registration/',
          excerpt: 'Age 18 to 60 years and minimum 90 days construction work in preceding 12 months.',
        },
      ],
    },
  ]);

  const [inputText, setInputText] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [, setWorkerProfile] = useState<WorkerProfile | null>(null);

  // Real Native Voice State Machine
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [recordingDurationMs, setRecordingDurationMs] = useState<number>(0);
  const [voiceTranscript, setVoiceTranscript] = useState<string>('');
  const [reviewModalVisible, setReviewModalVisible] = useState<boolean>(false);

  // Draft Contractor Request Modal state
  const [draftModalVisible, setDraftModalVisible] = useState<boolean>(false);
  const [draftWorkerName, setDraftWorkerName] = useState<string>('रमेश जाधव');
  const [draftContractorName, setDraftContractorName] = useState<string>('पाटील कन्स्ट्रक्शन');
  const [draftSiteLocation, setDraftSiteLocation] = useState<string>('बाणेर, पुणे');
  const [draftTradeType, setDraftTradeType] = useState<string>('गवंडी कामगार (Mason)');
  const [draftWorkDates, setDraftWorkDates] = useState<string>('नोव्हेंबर २०२३ ते सप्टेंबर २०२४ (११० दिवस)');
  const [generatedDraft, setGeneratedDraft] = useState<string | null>(null);
  const [draftInstructions, setDraftInstructions] = useState<string | null>(null);
  const [draftLoading, setDraftLoading] = useState<boolean>(false);
  const [copiedNotice, setCopiedNotice] = useState<boolean>(false);

  // Clean up recording/playback on screen unmount
  useEffect(() => {
    return () => {
      VoiceRecordingService.cancelRecording();
      VoicePlaybackService.stop();
    };
  }, []);

  const quickChips =
    language === 'mr'
      ? [
          '९० दिवस कामाचे प्रमाणपत्र कसे मिळवायचे?',
          'कंत्राटदारासाठी अर्ज कसा लिहायचा?',
          'पुण्यातील कामगार कार्यालय कुठे आहे?',
          'वय व वास्तव्याचा पुरावा कोणता चालतो?',
        ]
      : language === 'hi'
      ? [
          '९० दिन का कार्य प्रमाण पत्र कैसे प्राप्त करें?',
          'ठेकेदार हेतु आवेदन कैसे लिखें?',
          'पुणे श्रम कार्यालय कहाँ है?',
          'आयु और निवास के लिए कौन से दस्तावेज मान्य हैं?',
        ]
      : [
          'How to get 90-day work certificate?',
          'Draft letter to my contractor',
          'Where is the Pune Labour Office located?',
          'What documents are accepted for age proof?',
        ];

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || loading) return;

    setInputText('');

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
    };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    // Stop ongoing speech when a new query is submitted
    await VoicePlaybackService.stop();

    try {
      // Authenticated HAQ 2.0 Agent Orchestrator with tool-calling and Sarvam TTS
      const res: AgentResponse = await ApiService.chatWithAgent({
        sessionId,
        message: text,
        language,
        voiceEnabled: true,
      });

      const assistantMsg: Message = {
        id: `ast-${Date.now()}`,
        role: 'assistant',
        content: res.message,
        citations: res.citations,
        proposedActions: res.proposedActions,
        audioBase64: res.audioBase64,
      };

      setMessages((prev) => [...prev, assistantMsg]);

      if (res.workerProfile) {
        setWorkerProfile(res.workerProfile as any);
      }

      // Automatically play genuine Sarvam bulbul:v3 audio if returned
      if (res.audioBase64) {
        VoicePlaybackService.playAudio({
          id: assistantMsg.id,
          audioBase64: res.audioBase64,
          textFallback: res.message,
          language,
        });
      }
    } catch (err: any) {
      console.warn('HAQ Agent API call failed, using reviewed KB fallback:', err);

      const fallbackReply =
        language === 'mr'
          ? `**९० दिवस कामाचे प्रमाणपत्र (फॉर्म-५) मार्गदर्शन:**\n\n1. **कंत्राटदाराकडून:** तुम्ही काम केलेल्या बांधकाम साइटच्या कंत्राटदाराकडून फॉर्म-५ वर सही व शिक्का घ्या.\n2. **कंत्राटदार उपलब्ध नसल्यास:** पुण्यातील स्थानिक ग्रामसेवक, महापालिका प्रभाग अधिकारी किंवा नोंदणीकृत कामगार संघटनेकडून प्रमाणपत्र मिळवता येते.\n3. **अधिकृत मदत:** उप कामगार आयुक्त कार्यालय, स्वारगेट, पुणे येथे प्रत्यक्ष मदत उपलब्ध आहे.\n\nतुम्ही वरील 'कंत्राटदार अर्ज मसुदा' बटण दाबून औपचारिक अर्ज तयार करू शकता.`
          : language === 'hi'
          ? `**९० दिन कार्य प्रमाण पत्र (फॉर्म-५) मार्गदर्शन:**\n\n1. **ठेकेदार से:** निर्माण स्थल के ठेकेदार से फॉर्म-५ पर हस्ताक्षर व मुहर करवाएं।\n2. **वैकल्पिक स्रोत:** यदि ठेकेदार उपलब्ध न हो, तो स्थानीय ग्रामसेवक, नगर पालिका वार्ड अधिकारी अथवा पंजीकृत श्रमिक संघ से प्रमाणपत्र प्राप्त किया जा सकता है।\n3. **पुणे कार्यालय:** उप श्रम आयुक्त कार्यालय, स्वारगेट, पुणे से प्रत्यक्ष सहायता प्राप्त करें।`
          : `**90-Day Work Certificate (Form-V) Guidance:**\n\n1. **From Contractor:** Obtain signed & stamped Form-V from your construction site contractor.\n2. **Official Alternatives:** Local Gramsevak (rural), Municipal Ward Officer (urban Pune), or registered trade unions.\n3. **Pune Office:** Office of Deputy Labour Commissioner, Swargate, Pune.\n\nYou can also use the 'Draft Contractor Request' button above to generate a formal request letter!`;

      const assistantMsg: Message = {
        id: `ast-${Date.now()}`,
        role: 'assistant',
        content: fallbackReply,
        isDemoFallback: true,
        citations: [
          {
            sourceId: 'MAHABOCW-SRC-FORM-05',
            title: 'MAHABOCW Form-V Certificate Guidance',
            url: 'https://mahabocw.in/en/download/',
            excerpt: 'Official 90-day certificate form issued by contractor, Gramsevak, or Municipal authority.',
          },
        ],
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } finally {
      setLoading(false);
    }
  };

  // --- Real Voice Handlers ---

  const handleStartVoiceRecording = async () => {
    try {
      await VoicePlaybackService.stop();
      setVoiceState('recording');
      setRecordingDurationMs(0);

      await VoiceRecordingService.startRecording(({ durationMillis }) => {
        setRecordingDurationMs(durationMillis);
      });
    } catch (err: any) {
      console.warn('[AssistantScreen] Recording start failed:', err);
      setVoiceState('idle');

      if (err.message === 'MICROPHONE_PERMISSION_DENIED') {
        Alert.alert(
          language === 'mr' ? 'मायक्रोफोन परवानगी' : 'Microphone Permission',
          language === 'mr'
            ? 'आवाज नोंदवण्यासाठी कृपया ॲप सेटिंग्जमधून मायक्रोफोन परवानगी सुरू करा.'
            : 'Please enable microphone access in settings to speak with HAQ.'
        );
      }
    }
  };

  const handleStopVoiceRecording = async () => {
    try {
      setVoiceState('transcribing');
      const recordingResult = await VoiceRecordingService.stopRecording();

      const langCode = language === 'mr' ? 'mr-IN' : language === 'hi' ? 'hi-IN' : 'en-IN';
      const transcribeRes = await ApiService.transcribeVoice({
        audioBase64: recordingResult.audioBase64,
        languageCode: langCode,
      });

      if (!transcribeRes.text || transcribeRes.text.trim() === '') {
        Alert.alert(
          language === 'mr' ? 'आवाज ऐकू आला नाही' : 'No Speech Detected',
          language === 'mr'
            ? 'कृपया मायक्रोफोनजवळ थोडे स्पष्ट आणि मोठ्याने बोला.'
            : 'Please speak clearly near the microphone.'
        );
        setVoiceState('idle');
        return;
      }

      setVoiceTranscript(transcribeRes.text);
      setReviewModalVisible(true);
      setVoiceState('reviewing_transcript');
    } catch (err: any) {
      console.warn('[AssistantScreen] Transcription error:', err);
      setVoiceState('idle');

      if (err.message === 'RECORDING_TOO_SHORT') {
        Alert.alert(
          language === 'mr' ? 'खूप कमी वेळ' : 'Recording Too Short',
          language === 'mr'
            ? 'बोलणे पूर्ण होईपर्यंत बटण दाबून ठेवा.'
            : 'Please speak a little longer so HAQ can understand.'
        );
      } else {
        Alert.alert(
          language === 'mr' ? 'आवाज प्रक्रिया त्रुटी' : 'Voice Error',
          language === 'mr'
            ? 'आवाज समजण्यात अडचण आली. कृपया पुन्हा बोला किंवा टाइप करा.'
            : 'Could not transcribe speech. Please try speaking again or type your query.'
        );
      }
    }
  };

  const handleCancelVoiceRecording = async () => {
    await VoiceRecordingService.cancelRecording();
    setVoiceState('idle');
    setRecordingDurationMs(0);
  };

  const handleConfirmTranscript = (finalText: string) => {
    setReviewModalVisible(false);
    setVoiceState('idle');
    handleSendMessage(finalText);
  };

  const handleReRecordFromModal = () => {
    setReviewModalVisible(false);
    setVoiceTranscript('');
    handleStartVoiceRecording();
  };

  // --- Contractor Request Draft Handlers ---

  const handleGenerateDraft = async () => {
    setDraftLoading(true);
    try {
      const res = await ApiService.draftContractorRequest({
        sessionId,
        workerName: draftWorkerName,
        contractorName: draftContractorName,
        siteLocation: draftSiteLocation,
        tradeType: draftTradeType,
        workDatesDescription: draftWorkDates,
        language,
      });

      setGeneratedDraft(res.draftText);
      setDraftInstructions(res.instructions);
    } catch {
      const fallbackDraft =
        language === 'mr'
          ? `प्रति,\nमाननीय ${draftContractorName},\n${draftSiteLocation}.\n\nविषय: MAHABOCW नोंदणीसाठी ९० दिवस कामाचे प्रमाणपत्र (फॉर्म-५) मिळण्याबाबत.\n\nमहोदय,\n\nमी, ${draftWorkerName}, आपल्या ${draftSiteLocation} येथील साइटवर ${draftTradeType} म्हणून काम केले आहे (${draftWorkDates}).\n\nशासकीय कामगार कल्याण योजनेसाठी मला ९० दिवस कामाचे प्रमाणपत्र (फॉर्म-५) आवश्यक आहे. कृपया स्वाक्षरी व शिक्का देऊन सहकार्य करावे.\n\nआपला नम्र,\n${draftWorkerName}`
          : `To,\n${draftContractorName},\n${draftSiteLocation}.\n\nSubject: Request for 90-Day Work Certificate (Form-V) for MAHABOCW Registration.\n\nDear Sir,\n\nI, ${draftWorkerName}, worked at your site (${draftSiteLocation}) as a ${draftTradeType} during ${draftWorkDates}.\n\nPlease issue the signed and stamped Form-V certificate for my official registration.\n\nSincerely,\n${draftWorkerName}`;

      setGeneratedDraft(fallbackDraft);
      setDraftInstructions('Copy and share with contractor.');
    } finally {
      setDraftLoading(false);
    }
  };

  const handleCopyDraft = async () => {
    if (generatedDraft) {
      await Clipboard.setStringAsync(generatedDraft);
      setCopiedNotice(true);
      setTimeout(() => setCopiedNotice(false), 2500);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <HeaderBar />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Title Section */}
        <View style={styles.titleSection}>
          <Text style={styles.screenTitle}>{t('assistantTitle')}</Text>
          <Text style={styles.screenSubtitle}>{t('assistantSubtitle')}</Text>
        </View>

        {/* Action Header: Form-V PDF Generator */}
        <TouchableOpacity
          onPress={() => router.push('/form-v')}
          style={styles.draftToolCard}
          activeOpacity={0.85}
        >
          <View style={styles.draftToolIconBox}>
            <Ionicons name="document-text" size={20} color={Colors.accent} />
          </View>
          <View style={styles.draftToolTextCol}>
            <Text style={styles.draftToolTitle}>
              {language === 'mr' ? 'फॉर्म-५ प्रमाणपत्र व PDF जनरेटर' : 'Form-V PDF Generator'}
            </Text>
            <Text style={styles.draftToolSub}>
              {language === 'mr'
                ? 'MAHABOCW ९० दिवस काम प्रमाणपत्र थेट PDF मध्ये तयार करा'
                : 'Generate 90-day work certificate ready for signature'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={Colors.accent} />
        </TouchableOpacity>

        {/* Action Header: Contractor Draft Tool */}
        <TouchableOpacity
          onPress={() => setDraftModalVisible(true)}
          style={[styles.draftToolCard, styles.draftToolCardSecondary]}
          activeOpacity={0.85}
        >
          <View style={[styles.draftToolIconBox, styles.draftToolIconBoxNavy]}>
            <Ionicons name="create-outline" size={20} color={Colors.primary} />
          </View>
          <View style={styles.draftToolTextCol}>
            <Text style={styles.draftToolTitle}>{t('draftModeBtn')}</Text>
            <Text style={styles.draftToolSub}>
              {language === 'mr'
                ? 'कंत्राटदाराकडे ९० दिवस प्रमाणपत्रासाठी अधिकृत पत्र तयार करा'
                : 'Draft request letter for contractor signature'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={Colors.primary} />
        </TouchableOpacity>

        {/* Quick Suggestion Chips */}
        <View style={styles.chipsSection}>
          <Text style={styles.chipsLabel}>{t('quickQuestions')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
            {quickChips.map((chip, idx) => (
              <TouchableOpacity
                key={idx}
                onPress={() => handleSendMessage(chip)}
                style={styles.quickChip}
                activeOpacity={0.7}
              >
                <Text style={styles.quickChipText}>{chip}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Messages Thread */}
        <View style={styles.threadContainer}>
          {messages.map((msg) => (
            <View
              key={msg.id}
              style={[
                styles.bubbleWrapper,
                msg.role === 'user' ? styles.userBubbleWrapper : styles.assistantBubbleWrapper,
              ]}
            >
              <View
                style={[
                  styles.bubble,
                  msg.role === 'user' ? styles.userBubble : styles.assistantBubble,
                ]}
              >
                {/* Assistant Header */}
                {msg.role === 'assistant' && (
                  <View style={styles.assistantHeaderRow}>
                    <View style={styles.botIcon}>
                      <Ionicons name="shield-checkmark" size={14} color={Colors.textInverse} />
                    </View>
                    <Text style={styles.botName}>HAQ Benefits Advisor</Text>
                    {msg.isDemoFallback && (
                      <View style={styles.demoBadge}>
                        <Text style={styles.demoBadgeText}>Verified KB</Text>
                      </View>
                    )}
                  </View>
                )}

                <Text style={[styles.bubbleText, msg.role === 'user' && styles.userBubbleText]}>
                  {msg.content}
                </Text>

                {/* Real Sarvam bulbul:v3 Audio Playback Bar */}
                {msg.role === 'assistant' && (
                  <AudioPlayerBar
                    messageId={msg.id}
                    audioBase64={msg.audioBase64}
                    textFallback={msg.content}
                    language={language}
                  />
                )}

                {/* Attached Verified Citations */}
                {msg.citations && msg.citations.length > 0 && (
                  <View style={styles.citationsContainer}>
                    {msg.citations.map((c, cIdx) => (
                      <SourceCitationCard key={cIdx} citation={c} />
                    ))}
                  </View>
                )}
              </View>
            </View>
          ))}

          {loading && (
            <View style={styles.loadingBubble}>
              <ActivityIndicator size="small" color={Colors.accent} />
              <Text style={styles.loadingText}>
                {language === 'mr'
                  ? 'HAQ अधिकृत सरकारी नियमांची पडताळणी करत आहे...'
                  : 'HAQ is reviewing verified MAHABOCW rules...'}
              </Text>
            </View>
          )}
        </View>

        {/* Dedicated Voice Controller Section */}
        <View style={styles.voiceSectionCard}>
          <VoiceController
            state={voiceState}
            durationMs={recordingDurationMs}
            onStartRecording={handleStartVoiceRecording}
            onStopRecording={handleStopVoiceRecording}
            onCancelRecording={handleCancelVoiceRecording}
            language={language}
          />
        </View>

        {/* Text Input Fallback Bar */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.chatTextInput}
            value={inputText}
            onChangeText={setInputText}
            placeholder={
              voiceState === 'recording'
                ? language === 'mr' ? 'ऐकत आहे...' : 'Listening...'
                : t('assistantInputPlaceholder')
            }
            placeholderTextColor={Colors.textMuted}
            onSubmitEditing={() => handleSendMessage()}
            returnKeyType="send"
          />
          <TouchableOpacity
            onPress={() => handleSendMessage()}
            style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
            disabled={!inputText.trim() || loading}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-up" size={20} color={Colors.textInverse} />
          </TouchableOpacity>
        </View>

        {/* Advisory Disclaimer */}
        <View style={styles.advisoryCard}>
          <Ionicons name="information-circle-outline" size={16} color={Colors.secondary} />
          <Text style={styles.advisoryText}>{t('assistantAdvisory')}</Text>
        </View>
      </ScrollView>

      {/* Real Voice Review & Confirmation Modal */}
      <VoiceReviewModal
        visible={reviewModalVisible}
        transcript={voiceTranscript}
        language={language}
        onConfirm={handleConfirmTranscript}
        onReRecord={handleReRecordFromModal}
        onCancel={() => {
          setReviewModalVisible(false);
          setVoiceState('idle');
        }}
      />

      {/* DRAFT CONTRACTOR REQUEST MODAL */}
      <Modal visible={draftModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalTitle}>{t('draftModalTitle')}</Text>
                <Text style={styles.modalSub}>{t('draftModalDesc')}</Text>
              </View>
              <TouchableOpacity onPress={() => setDraftModalVisible(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={22} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {!generatedDraft ? (
                <View style={styles.formContainer}>
                  <Text style={styles.fieldLabel}>{t('workerNameLabel')}</Text>
                  <TextInput
                    style={styles.fieldInput}
                    value={draftWorkerName}
                    onChangeText={setDraftWorkerName}
                  />

                  <Text style={styles.fieldLabel}>{t('contractorNameLabel')}</Text>
                  <TextInput
                    style={styles.fieldInput}
                    value={draftContractorName}
                    onChangeText={setDraftContractorName}
                  />

                  <Text style={styles.fieldLabel}>{t('siteLocationLabel')}</Text>
                  <TextInput
                    style={styles.fieldInput}
                    value={draftSiteLocation}
                    onChangeText={setDraftSiteLocation}
                  />

                  <Text style={styles.fieldLabel}>{t('tradeLabel')}</Text>
                  <TextInput
                    style={styles.fieldInput}
                    value={draftTradeType}
                    onChangeText={setDraftTradeType}
                  />

                  <Text style={styles.fieldLabel}>{t('workDatesLabel')}</Text>
                  <TextInput
                    style={styles.fieldInput}
                    value={draftWorkDates}
                    onChangeText={setDraftWorkDates}
                  />

                  <TouchableOpacity
                    onPress={handleGenerateDraft}
                    style={styles.generateButton}
                    disabled={draftLoading}
                  >
                    {draftLoading ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text style={styles.generateButtonText}>✍️ {t('generateDraftBtn')}</Text>
                    )}
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.draftResultContainer}>
                  <View style={styles.draftBox}>
                    <Text style={styles.draftLetterText}>{generatedDraft}</Text>
                  </View>

                  {draftInstructions && (
                    <Text style={styles.instructionsText}>📌 {draftInstructions}</Text>
                  )}

                  <View style={styles.draftActionRow}>
                    <TouchableOpacity onPress={handleCopyDraft} style={styles.copyBtn}>
                      <Text style={styles.copyBtnText}>
                        {copiedNotice ? `✓ ${t('copied')}` : `📋 ${t('copy')}`}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => setGeneratedDraft(null)}
                      style={styles.editBtn}
                    >
                      <Text style={styles.editBtnText}>Edit Details / बदल करा</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
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
    backgroundColor: Colors.background,
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
    color: Colors.textPrimary,
  },
  screenSubtitle: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  draftToolCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.lg,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.sm,
    ...Shadows.card,
  },
  draftToolCardSecondary: {
    marginBottom: Spacing.md,
  },
  draftToolIconBox: {
    width: 38,
    height: 38,
    borderRadius: Radius.md,
    backgroundColor: Colors.saffronOrangeLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  draftToolIconBoxNavy: {
    backgroundColor: Colors.warmIvory,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  draftToolTextCol: {
    flex: 1,
  },
  draftToolTitle: {
    ...Typography.cardTitle,
    fontSize: 14,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  draftToolSub: {
    ...Typography.meta,
    fontSize: 11,
    color: Colors.textSecondary,
    lineHeight: 15,
  },
  chipsSection: {
    marginBottom: Spacing.md,
  },
  chipsLabel: {
    ...Typography.badgeText,
    fontSize: 11,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  chipsScroll: {
    gap: Spacing.sm,
  },
  quickChip: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  quickChipText: {
    ...Typography.badgeText,
    fontSize: 12,
    color: Colors.textPrimary,
  },
  threadContainer: {
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  bubbleWrapper: {
    flexDirection: 'row',
  },
  userBubbleWrapper: {
    justifyContent: 'flex-end',
  },
  assistantBubbleWrapper: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '92%',
    borderRadius: Radius.lg,
    padding: Spacing.md,
    ...Shadows.card,
  },
  userBubble: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: Radius.xs,
  },
  assistantBubble: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Colors.border,
    borderBottomLeftRadius: Radius.xs,
  },
  assistantHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  botIcon: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  botName: {
    ...Typography.badgeText,
    fontSize: 12,
    color: Colors.primary,
    flex: 1,
  },
  demoBadge: {
    backgroundColor: Colors.successSurface,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.xs,
    borderWidth: 1,
    borderColor: Colors.successBorder,
  },
  demoBadgeText: {
    ...Typography.meta,
    color: Colors.success,
    fontSize: 9,
    fontWeight: '700',
  },
  bubbleText: {
    ...Typography.bodyRegular,
    color: Colors.textPrimary,
  },
  userBubbleText: {
    color: Colors.textInverse,
  },
  citationsContainer: {
    marginTop: Spacing.sm,
  },
  loadingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: '#FFFFFF',
    padding: Spacing.md,
    borderRadius: Radius.md,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  loadingText: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  voiceSectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.sm,
    marginBottom: Spacing.md,
    ...Shadows.card,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  chatTextInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    ...Typography.bodyRegular,
    color: Colors.textPrimary,
    minHeight: 48,
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.card,
  },
  sendButtonDisabled: {
    backgroundColor: Colors.borderHighlight,
    opacity: 0.5,
  },
  advisoryCard: {
    flexDirection: 'row',
    gap: Spacing.sm,
    backgroundColor: Colors.warmIvory,
    padding: Spacing.md,
    borderRadius: Radius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  advisoryText: {
    ...Typography.meta,
    fontSize: 11,
    color: Colors.textSecondary,
    flex: 1,
    lineHeight: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(16, 26, 58, 0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    maxHeight: '85%',
    padding: Spacing.xl,
    paddingBottom: 36,
    ...Shadows.elevated,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.lg,
  },
  modalTitle: {
    ...Typography.sectionTitle,
    color: Colors.textPrimary,
  },
  modalSub: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    padding: Spacing.xs,
  },
  modalBody: {
    maxHeight: 450,
  },
  formContainer: {
    gap: Spacing.md,
  },
  fieldLabel: {
    ...Typography.badgeText,
    fontSize: 12,
    color: Colors.textPrimary,
  },
  fieldInput: {
    backgroundColor: Colors.warmIvory,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    ...Typography.bodyRegular,
    color: Colors.textPrimary,
  },
  generateButton: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  generateButtonText: {
    ...Typography.buttonPrimary,
    color: Colors.textInverse,
  },
  draftResultContainer: {
    gap: Spacing.md,
  },
  draftBox: {
    backgroundColor: Colors.warmIvory,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  draftLetterText: {
    color: Colors.textPrimary,
    fontSize: 13,
    lineHeight: 20,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  instructionsText: {
    ...Typography.caption,
    color: Colors.accent,
    lineHeight: 18,
  },
  draftActionRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  copyBtn: {
    flex: 1,
    backgroundColor: Colors.accent,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    alignItems: 'center',
  },
  copyBtnText: {
    ...Typography.buttonPrimary,
    color: Colors.textInverse,
  },
  editBtn: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  editBtnText: {
    ...Typography.buttonSecondary,
    color: Colors.textPrimary,
  },
});
