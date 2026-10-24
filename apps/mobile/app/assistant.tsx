import React, { useState } from 'react';
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
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { Colors } from '../src/theme/colors';
import { useApp } from '../src/context/AppContext';
import { HeaderBar } from '../src/components/HeaderBar';
import { BottomNav } from '../src/components/BottomNav';
import { SourceCitationCard } from '../src/components/SourceCitationCard';
import { ApiService } from '../src/services/api';
import { AssistantChatResponse, KnowledgeSourceCitation } from '@haq/shared';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: KnowledgeSourceCitation[];
  isDemoFallback?: boolean;
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
          ? 'नमस्कार! मी **HAQ मदतनीस**. बांधकाम कामगारांच्या कल्याणकारी योजना, ९० दिवस कामाचे प्रमाणपत्र (फॉर्म-५) आणि आवश्यक कागदपत्रांबद्दल तुम्हाला काय माहिती हवी आहे?'
          : language === 'hi'
          ? 'नमस्ते! मैं **HAQ सहायक** हूँ। निर्माण श्रमिकों के कल्याणकारी लाभ, ९० दिन कार्य प्रमाण पत्र (फॉर्म-५) और आवश्यक दस्तावेजों के बारे में आप क्या जानना चाहते हैं?'
          : 'Hello! I am **HAQ Assistant**. How can I help you regarding MAHABOCW construction worker benefits, 90-day certificates (Form-V), or required documents?',
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
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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

    setErrorMsg(null);
    setInputText('');

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
    };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const res: AssistantChatResponse = await ApiService.askAssistant(sessionId, text, language);

      const assistantMsg: Message = {
        id: `ast-${Date.now()}`,
        role: 'assistant',
        content: res.reply,
        citations: res.citations,
        isDemoFallback: res.isDemoFallback,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      console.warn('Groq Assistant API call failed, using reviewed KB fallback:', err);

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
      // Local fallback template
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

        {/* Action Header: Form-V PDF Generator & Contractor Letter */}
        <TouchableOpacity
          onPress={() => router.push('/form-v')}
          style={[styles.draftToolCard, { borderColor: Colors.constructionOrange, marginBottom: 10 }]}
          activeOpacity={0.85}
        >
          <View style={[styles.draftToolIconBox, { backgroundColor: 'rgba(255, 107, 44, 0.2)' }]}>
            <Text style={styles.draftToolIcon}>📄</Text>
          </View>
          <View style={styles.draftToolTextCol}>
            <Text style={[styles.draftToolTitle, { color: Colors.constructionOrange }]}>
              फॉर्म-५ प्रमाणपत्र व PDF जनरेटर
            </Text>
            <Text style={styles.draftToolSub}>
              MAHABOCW ९० दिवस काम प्रमाणपत्र थेट PDF मध्ये तयार व डाउनलोड करा
            </Text>
          </View>
          <Text style={[styles.draftToolArrow, { color: Colors.constructionOrange }]}>→</Text>
        </TouchableOpacity>

        {/* Action Header Card: Contractor Draft Tool */}
        <TouchableOpacity
          onPress={() => setDraftModalVisible(true)}
          style={styles.draftToolCard}
          activeOpacity={0.85}
        >
          <View style={styles.draftToolIconBox}>
            <Text style={styles.draftToolIcon}>✍️</Text>
          </View>
          <View style={styles.draftToolTextCol}>
            <Text style={styles.draftToolTitle}>{t('draftModeBtn')}</Text>
            <Text style={styles.draftToolSub}>
              कंत्राटदाराकडे ९० दिवस प्रमाणपत्रासाठी अधिकृत पत्र तयार करा
            </Text>
          </View>
          <Text style={styles.draftToolArrow}>→</Text>
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
                {/* Assistant Badge */}
                {msg.role === 'assistant' && (
                  <View style={styles.assistantHeaderRow}>
                    <View style={styles.botIcon}>
                      <Text style={styles.botIconText}>🤖</Text>
                    </View>
                    <Text style={styles.botName}>HAQ Benefits Advisor</Text>
                    {msg.isDemoFallback && (
                      <View style={styles.demoBadge}>
                        <Text style={styles.demoBadgeText}>Verified KB</Text>
                      </View>
                    )}
                  </View>
                )}

                <Text style={styles.bubbleText}>{msg.content}</Text>

                {/* Attached Citations */}
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
              <ActivityIndicator size="small" color={Colors.constructionOrange} />
              <Text style={styles.loadingText}>HAQ is reviewing official rules...</Text>
            </View>
          )}
        </View>

        {/* Input Bar */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.chatTextInput}
            value={inputText}
            onChangeText={setInputText}
            placeholder={t('assistantInputPlaceholder')}
            placeholderTextColor={Colors.textMuted}
            onSubmitEditing={() => handleSendMessage()}
            returnKeyType="send"
          />
          <TouchableOpacity
            onPress={() => handleSendMessage()}
            style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
            disabled={!inputText.trim() || loading}
          >
            <Text style={styles.sendButtonArrow}>↑</Text>
          </TouchableOpacity>
        </View>

        {/* Advisory Disclaimer */}
        <View style={styles.advisoryCard}>
          <Text style={styles.advisoryIcon}>ℹ️</Text>
          <Text style={styles.advisoryText}>{t('assistantAdvisory')}</Text>
        </View>
      </ScrollView>

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
                <Text style={styles.closeBtnText}>✕</Text>
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
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },
  titleSection: {
    marginBottom: 14,
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
  draftToolCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1.5,
    borderColor: Colors.constructionOrange,
    marginBottom: 16,
  },
  draftToolIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: Colors.constructionOrangeGlow,
    justifyContent: 'center',
    alignItems: 'center',
  },
  draftToolIcon: {
    fontSize: 20,
  },
  draftToolTextCol: {
    flex: 1,
  },
  draftToolTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  draftToolSub: {
    fontSize: 11,
    color: Colors.textSecondary,
    lineHeight: 15,
  },
  draftToolArrow: {
    fontSize: 18,
    color: Colors.constructionOrange,
    fontWeight: '800',
  },
  chipsSection: {
    marginBottom: 16,
  },
  chipsLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textMuted,
    marginBottom: 8,
  },
  chipsScroll: {
    gap: 8,
  },
  quickChip: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  quickChipText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  threadContainer: {
    gap: 12,
    marginBottom: 16,
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
    borderRadius: 14,
    padding: 14,
  },
  userBubble: {
    backgroundColor: Colors.constructionOrange,
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.borderHighlight,
    borderBottomLeftRadius: 4,
  },
  assistantHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  botIcon: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: 'rgba(22, 119, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  botIconText: {
    fontSize: 12,
  },
  botName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#60A5FA',
    flex: 1,
  },
  demoBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  demoBadgeText: {
    color: Colors.success,
    fontSize: 9,
    fontWeight: '700',
  },
  bubbleText: {
    fontSize: 14,
    color: Colors.textPrimary,
    lineHeight: 20,
  },
  citationsContainer: {
    marginTop: 10,
  },
  loadingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.surface,
    padding: 12,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  loadingText: {
    color: Colors.textSecondary,
    fontSize: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  chatTextInput: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.borderHighlight,
    color: Colors.textPrimary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    minHeight: 48,
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: Colors.constructionOrange,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sendButtonArrow: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
  },
  advisoryCard: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: Colors.backgroundSecondary,
    padding: 10,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  advisoryIcon: {
    fontSize: 14,
  },
  advisoryText: {
    fontSize: 11,
    color: Colors.textMuted,
    flex: 1,
    lineHeight: 15,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: Colors.surfaceElevated,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    padding: 20,
    paddingBottom: 36,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  modalSub: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtnText: {
    color: Colors.textSecondary,
    fontSize: 16,
  },
  modalBody: {
    maxHeight: 450,
  },
  formContainer: {
    gap: 10,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  fieldInput: {
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    color: Colors.textPrimary,
    padding: 12,
    fontSize: 13,
  },
  generateButton: {
    backgroundColor: Colors.constructionOrange,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  generateButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  draftResultContainer: {
    gap: 12,
  },
  draftBox: {
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  draftLetterText: {
    color: Colors.textPrimary,
    fontSize: 13,
    lineHeight: 20,
    fontFamily: 'monospace',
  },
  instructionsText: {
    fontSize: 12,
    color: Colors.constructionOrange,
    lineHeight: 17,
  },
  draftActionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  copyBtn: {
    flex: 1,
    backgroundColor: Colors.constructionOrange,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  copyBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  editBtn: {
    flex: 1,
    backgroundColor: Colors.backgroundSecondary,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  editBtnText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
});
