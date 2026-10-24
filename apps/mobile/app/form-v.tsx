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
  Alert,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { Colors } from '../src/theme/colors';
import { useApp } from '../src/context/AppContext';
import { HeaderBar } from '../src/components/HeaderBar';
import { BottomNav } from '../src/components/BottomNav';
import { FormVGeneratorService } from '../src/services/formVGenerator';
import { CertifierType, FormVDocumentType, FormVParams } from '@haq/shared';

export default function FormVScreen() {
  const router = useRouter();
  const { t, language } = useApp();

  const [activeTab, setActiveTab] = useState<'FORM' | 'PREVIEW'>('FORM');
  const [docType, setDocType] = useState<FormVDocumentType>('FORM_V_CERTIFICATE');
  const [exporting, setExporting] = useState<boolean>(false);
  const [copiedNotice, setCopiedNotice] = useState<boolean>(false);

  // Form Fields with realistic Pune construction worker defaults
  const [workerName, setWorkerName] = useState<string>('रमेश मारुती जाधव');
  const [fatherName, setFatherName] = useState<string>('मारुती विठ्ठल जाधव');
  const [age, setAge] = useState<string>('३२');
  const [address, setAddress] = useState<string>('रूम नं. १२, कात्रज कोंढवा रोड, पुणे - ४११०४६');
  const [mobileNumber, setMobileNumber] = useState<string>('९८७६५४३२१०');
  const [tradeType, setTradeType] = useState<string>('गवंडी कामगार (Masonry / Brickwork)');
  const [certifierType, setCertifierType] = useState<CertifierType>('CONTRACTOR');
  const [certifierName, setCertifierName] = useState<string>('पाटील इन्फ्रास्ट्रक्चर प्रा. लि.');
  const [certifierRegNo, setCertifierRegNo] = useState<string>('MH-PUN-CONTR-44910');
  const [siteLocation, setSiteLocation] = useState<string>('गंगा व्हिलेज रेसिडेन्सी, बाणेर, पुणे');
  const [workStartDate, setWorkStartDate] = useState<string>('०१/११/२०२३');
  const [workEndDate, setWorkEndDate] = useState<string>('३१/०८/२०२४');
  const [daysWorked, setDaysWorked] = useState<string>('११०');
  const [issuePlace, setIssuePlace] = useState<string>('पुणे (Pune)');
  const [issueDate, setIssueDate] = useState<string>(new Date().toLocaleDateString('mr-IN'));

  const currentParams: FormVParams = {
    documentType: docType,
    workerName,
    fatherOrHusbandName: fatherName,
    age,
    address,
    mobileNumber,
    tradeType,
    certifierType,
    certifierName,
    certifierRegistrationNo: certifierRegNo,
    siteNameAndLocation: siteLocation,
    workStartDate,
    workEndDate,
    daysWorked,
    issueDate,
    issuePlace,
  };

  const handleExportPdf = async () => {
    setExporting(true);
    try {
      const result = await FormVGeneratorService.exportOrSharePdf(currentParams);
      if (!result.success && result.error) {
        if (Platform.OS === 'web') {
          alert(`त्रुटी: ${result.error}`);
        } else {
          Alert.alert('त्रुटी', result.error);
        }
      }
    } catch (err: any) {
      const msg = err?.message || 'PDF निर्मिती अयशस्वी झाली';
      if (Platform.OS === 'web') {
        alert(msg);
      } else {
        Alert.alert('त्रुटी', msg);
      }
    } finally {
      setExporting(false);
    }
  };

  const handleCopyText = async () => {
    const isCert = docType === 'FORM_V_CERTIFICATE';
    const text = isCert
      ? `नमुना ५ - ९० दिवस काम केल्याचे प्रमाणपत्र (MAHABOCW)\n\nकामगाराचे नाव: ${workerName}\nवडिलांचे नाव: ${fatherName}\nवय: ${age} वर्षे\nपत्ता: ${address}\nमोबाईल: ${mobileNumber}\nकामाचे स्वरूप: ${tradeType}\nसाइट: ${siteLocation}\nकालावधी: ${workStartDate} ते ${workEndDate} (${daysWorked} दिवस)\nकंत्राटदार: ${certifierName} (${certifierRegNo})\n\nस्वाक्षरी व शिक्का: ________________________`
      : `प्रति, ${certifierName}, ${siteLocation}\nविषय: MAHABOCW ९० दिवस कामाचे प्रमाणपत्र (फॉर्म-५) मिळण्याबाबत.\n\nमी, ${workerName}, आपल्याकडे ${workStartDate} ते ${workEndDate} या कालावधीत ${daysWorked} दिवस काम केले आहे. कृपया मला फॉर्म-५ प्रमाणपत्र द्यावे.\n\nआपला नम्र,\n${workerName}\nमोबाईल: ${mobileNumber}`;

    await Clipboard.setStringAsync(text);
    setCopiedNotice(true);
    setTimeout(() => setCopiedNotice(false), 3000);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <HeaderBar />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Title Header */}
        <View style={styles.titleSection}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.push('/documents')}
            accessibilityLabel="कागदपत्रांकडे परत जा"
          >
            <Text style={styles.backButtonText}>← कागदपत्रे</Text>
          </TouchableOpacity>
          <Text style={styles.screenTitle}>फॉर्म-५ लेटर जनरेटर</Text>
          <Text style={styles.screenSubtitle}>
            MAHABOCW ९० दिवस काम प्रमाणपत्र आणि कंत्राटदार विनंती अर्ज
          </Text>
        </View>

        {/* Official Provenance Banner */}
        <View style={styles.provenanceBanner}>
          <View style={styles.provenanceIconBadge}>
            <Text style={styles.provenanceIconText}>📜</Text>
          </View>
          <View style={styles.provenanceContent}>
            <Text style={styles.provenanceTitle}>अधिकृत स्रोत: MAHABOCW नमुना क्रमांक ५</Text>
            <Text style={styles.provenanceText}>
              महाराष्ट्र इमारत व इतर बांधकाम कामगार नियम २००७, नियम २८२ अन्वये विहित केलेला अधिकृत नमुना.
              हे पत्र भरून कंत्राटदार / ग्रामसेवक यांच्याकडून सही व शिक्का घेणे आवश्यक आहे.
            </Text>
          </View>
        </View>

        {/* Tab Switcher: Form vs Preview */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'FORM' && styles.tabButtonActive]}
            onPress={() => setActiveTab('FORM')}
          >
            <Text style={[styles.tabButtonText, activeTab === 'FORM' && styles.tabButtonTextActive]}>
              १. तपशील भरा
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'PREVIEW' && styles.tabButtonActive]}
            onPress={() => setActiveTab('PREVIEW')}
          >
            <Text style={[styles.tabButtonText, activeTab === 'PREVIEW' && styles.tabButtonTextActive]}>
              २. पूर्वावलोकन व PDF
            </Text>
          </TouchableOpacity>
        </View>

        {/* Document Type Selector */}
        <View style={styles.docTypeRow}>
          <TouchableOpacity
            style={[styles.docTypeBtn, docType === 'FORM_V_CERTIFICATE' && styles.docTypeBtnActive]}
            onPress={() => setDocType('FORM_V_CERTIFICATE')}
          >
            <Text
              style={[
                styles.docTypeBtnText,
                docType === 'FORM_V_CERTIFICATE' && styles.docTypeBtnTextActive,
              ]}
            >
              फॉर्म-५ प्रमाणपत्र (Certificate)
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.docTypeBtn, docType === 'FORM_V_REQUEST_LETTER' && styles.docTypeBtnActive]}
            onPress={() => setDocType('FORM_V_REQUEST_LETTER')}
          >
            <Text
              style={[
                styles.docTypeBtnText,
                docType === 'FORM_V_REQUEST_LETTER' && styles.docTypeBtnTextActive,
              ]}
            >
              विनंती अर्ज (Worker Letter)
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'FORM' ? (
          /* FORM TAB */
          <View style={styles.formCard}>
            <Text style={styles.sectionHeading}>कामगाराचा वैयक्तिक तपशील</Text>

            <Text style={styles.inputLabel}>कामगाराचे पूर्ण नाव *</Text>
            <TextInput
              style={styles.textInput}
              value={workerName}
              onChangeText={setWorkerName}
              placeholder="उदा. रमेश मारुती जाधव"
              placeholderTextColor="#64748B"
            />

            <Text style={styles.inputLabel}>वडिलांचे / पतीचे नाव *</Text>
            <TextInput
              style={styles.textInput}
              value={fatherName}
              onChangeText={setFatherName}
              placeholder="उदा. मारुती विठ्ठल जाधव"
              placeholderTextColor="#64748B"
            />

            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={styles.inputLabel}>वय (वर्षे) *</Text>
                <TextInput
                  style={styles.textInput}
                  value={age}
                  onChangeText={setAge}
                  keyboardType="numeric"
                  placeholder="उदा. ३२"
                  placeholderTextColor="#64748B"
                />
              </View>
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={styles.inputLabel}>मोबाईल क्रमांक</Text>
                <TextInput
                  style={styles.textInput}
                  value={mobileNumber}
                  onChangeText={setMobileNumber}
                  keyboardType="phone-pad"
                  placeholder="उदा. ९८७६५४३२१०"
                  placeholderTextColor="#64748B"
                />
              </View>
            </View>

            <Text style={styles.inputLabel}>राहण्याचा पत्ता *</Text>
            <TextInput
              style={[styles.textInput, { height: 60 }]}
              value={address}
              onChangeText={setAddress}
              multiline
              placeholder="उदा. रूम नं. १२, कात्रज कोंढवा रोड, पुणे"
              placeholderTextColor="#64748B"
            />

            <Text style={styles.inputLabel}>कामाचे स्वरूप (Trade) *</Text>
            <TextInput
              style={styles.textInput}
              value={tradeType}
              onChangeText={setTradeType}
              placeholder="उदा. गवंडीकाम / सेंट्रींग / प्लंबिंग"
              placeholderTextColor="#64748B"
            />

            <Text style={[styles.sectionHeading, { marginTop: 24 }]}>
              कामाचा कालावधी व साइट तपशील
            </Text>

            <Text style={styles.inputLabel}>साइटचे नाव व पत्ता *</Text>
            <TextInput
              style={styles.textInput}
              value={siteLocation}
              onChangeText={setSiteLocation}
              placeholder="उदा. गंगा व्हिलेज रेसिडेन्सी, बाणेर, पुणे"
              placeholderTextColor="#64748B"
            />

            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={styles.inputLabel}>सुरुवातीचा दिनांक *</Text>
                <TextInput
                  style={styles.textInput}
                  value={workStartDate}
                  onChangeText={setWorkStartDate}
                  placeholder="उदा. ०१/११/२०२३"
                  placeholderTextColor="#64748B"
                />
              </View>
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={styles.inputLabel}>शेवटचा दिनांक *</Text>
                <TextInput
                  style={styles.textInput}
                  value={workEndDate}
                  onChangeText={setWorkEndDate}
                  placeholder="उदा. ३१/०८/२०२४"
                  placeholderTextColor="#64748B"
                />
              </View>
            </View>

            <Text style={styles.inputLabel}>मागील १२ महिन्यांतील एकूण कामाचे दिवस *</Text>
            <TextInput
              style={styles.textInput}
              value={daysWorked}
              onChangeText={setDaysWorked}
              keyboardType="numeric"
              placeholder="किमान ९० दिवस आवश्यक"
              placeholderTextColor="#64748B"
            />

            <Text style={[styles.sectionHeading, { marginTop: 24 }]}>
              प्रमाणपत्र देणारा प्राधिकारी / कंत्राटदार
            </Text>

            {/* Certifier Type Selector */}
            <View style={styles.certifierTypeContainer}>
              {[
                { key: 'CONTRACTOR', label: 'कंत्राटदार / बिल्डर' },
                { key: 'GRAMSEVAK', label: 'ग्रामसेवक (ग्रामीण)' },
                { key: 'MUNICIPAL_OFFICER', label: 'पालिका अधिकारी (पुणे)' },
                { key: 'TRADE_UNION', label: 'कामगार संघटना' },
              ].map((opt) => (
                <TouchableOpacity
                  key={opt.key}
                  style={[
                    styles.certifierChip,
                    certifierType === opt.key && styles.certifierChipActive,
                  ]}
                  onPress={() => setCertifierType(opt.key as CertifierType)}
                >
                  <Text
                    style={[
                      styles.certifierChipText,
                      certifierType === opt.key && styles.certifierChipTextActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>कंत्राटदार / अधिकारी / संस्था नाव *</Text>
            <TextInput
              style={styles.textInput}
              value={certifierName}
              onChangeText={setCertifierName}
              placeholder="उदा. पाटील कन्स्ट्रक्शन / ग्रामसेवक"
              placeholderTextColor="#64748B"
            />

            <Text style={styles.inputLabel}>नोंदणी / परवाना क्रमांक (ऐच्छिक)</Text>
            <TextInput
              style={styles.textInput}
              value={certifierRegNo}
              onChangeText={setCertifierRegNo}
              placeholder="उदा. MH-PUN-CONTR-44910"
              placeholderTextColor="#64748B"
            />

            <TouchableOpacity
              style={styles.primaryActionButton}
              onPress={() => setActiveTab('PREVIEW')}
            >
              <Text style={styles.primaryActionButtonText}>पुढील पायरी: पूर्वावलोकन पहा →</Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* PREVIEW TAB */
          <View style={styles.previewCard}>
            <View style={styles.draftWatermarkBar}>
              <Text style={styles.draftWatermarkText}>
                ⚠️ नमुना मसुदा (DRAFT) — सक्षम प्राधिकाऱ्याची प्रत्यक्ष सही व शिक्का आवश्यक आहे.
              </Text>
            </View>

            {/* Document Preview Box */}
            <View style={styles.documentSheet}>
              <Text style={styles.docHeaderTitle}>
                {docType === 'FORM_V_CERTIFICATE'
                  ? 'महाराष्ट्र इमारत व इतर बांधकाम कामगार कल्याणकारी मंडळ'
                  : 'कंत्राटदाराकडे फॉर्म-५ साठी विनंती अर्ज'}
              </Text>
              {docType === 'FORM_V_CERTIFICATE' && (
                <Text style={styles.docHeaderSub}>नमुना ५ — ९० दिवस कामाचे प्रमाणपत्र</Text>
              )}

              <View style={styles.divider} />

              <View style={styles.previewLine}>
                <Text style={styles.previewLabel}>कामगाराचे नाव:</Text>
                <Text style={styles.previewValue}>{workerName}</Text>
              </View>
              <View style={styles.previewLine}>
                <Text style={styles.previewLabel}>वडिलांचे नाव:</Text>
                <Text style={styles.previewValue}>{fatherName}</Text>
              </View>
              <View style={styles.previewLine}>
                <Text style={styles.previewLabel}>वय व मोबाईल:</Text>
                <Text style={styles.previewValue}>{age} वर्षे | {mobileNumber}</Text>
              </View>
              <View style={styles.previewLine}>
                <Text style={styles.previewLabel}>पत्ता:</Text>
                <Text style={styles.previewValue}>{address}</Text>
              </View>
              <View style={styles.previewLine}>
                <Text style={styles.previewLabel}>कामाचे स्वरूप:</Text>
                <Text style={styles.previewValue}>{tradeType}</Text>
              </View>
              <View style={styles.previewLine}>
                <Text style={styles.previewLabel}>साइट ठिकाण:</Text>
                <Text style={styles.previewValue}>{siteLocation}</Text>
              </View>
              <View style={styles.previewLine}>
                <Text style={styles.previewLabel}>कामाचा कालावधी:</Text>
                <Text style={styles.previewValue}>
                  {workStartDate} ते {workEndDate} ({daysWorked} दिवस)
                </Text>
              </View>
              <View style={styles.previewLine}>
                <Text style={styles.previewLabel}>प्राधिकारी / कंत्राटदार:</Text>
                <Text style={styles.previewValue}>
                  {certifierName} {certifierRegNo ? `(${certifierRegNo})` : ''}
                </Text>
              </View>

              <View style={styles.signaturePlaceholderRow}>
                <View style={styles.sigBox}>
                  <Text style={styles.sigLabel}>कामगाराची सही / अंगठा</Text>
                </View>
                <View style={styles.sigBox}>
                  <Text style={styles.sigLabel}>कंत्राटदार सही व शिक्का</Text>
                </View>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionButtonsContainer}>
              <TouchableOpacity
                style={styles.exportPdfButton}
                onPress={handleExportPdf}
                disabled={exporting}
              >
                {exporting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.exportPdfButtonText}>
                    📄 {Platform.OS === 'web' ? 'PDF डाउनलोड / प्रिंट करा' : 'PDF जतन / शेअर करा'}
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity style={styles.copyButton} onPress={handleCopyText}>
                <Text style={styles.copyButtonText}>
                  {copiedNotice ? '✓ मजकूर कॉपी झाला!' : '📋 मजकूर कॉपी करा'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.editButton}
                onPress={() => setActiveTab('FORM')}
              >
                <Text style={styles.editButtonText}>✏️ मसुदा संपादित करा</Text>
              </TouchableOpacity>
            </View>
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
    padding: 20,
    paddingBottom: 110,
  },
  titleSection: {
    marginBottom: 16,
  },
  backButton: {
    marginBottom: 8,
  },
  backButtonText: {
    color: Colors.primaryCobalt,
    fontSize: 14,
    fontWeight: '600',
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  screenSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
    lineHeight: 20,
  },
  provenanceBanner: {
    flexDirection: 'row',
    backgroundColor: '#0F1E36',
    borderWidth: 1,
    borderColor: '#1D3B6F',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    alignItems: 'center',
  },
  provenanceIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#1E3A8A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  provenanceIconText: {
    fontSize: 18,
  },
  provenanceContent: {
    flex: 1,
  },
  provenanceTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#93C5FD',
    marginBottom: 2,
  },
  provenanceText: {
    fontSize: 11,
    color: '#CBD5E1',
    lineHeight: 16,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabButtonActive: {
    backgroundColor: Colors.primaryCobalt,
  },
  tabButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  tabButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  docTypeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  docTypeBtn: {
    flex: 1,
    backgroundColor: Colors.surface,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  docTypeBtnActive: {
    borderColor: Colors.constructionOrange,
    backgroundColor: 'rgba(255, 107, 44, 0.1)',
  },
  docTypeBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  docTypeBtnTextActive: {
    color: Colors.constructionOrange,
    fontWeight: '700',
  },
  formCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingBottom: 6,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 6,
    marginTop: 10,
  },
  textInput: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  row: {
    flexDirection: 'row',
  },
  certifierTypeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
    marginTop: 4,
  },
  certifierChip: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  certifierChipActive: {
    borderColor: Colors.primaryCobalt,
    backgroundColor: 'rgba(30, 58, 138, 0.25)',
  },
  certifierChipText: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  certifierChipTextActive: {
    color: Colors.primaryCobalt,
    fontWeight: '700',
  },
  primaryActionButton: {
    backgroundColor: Colors.primaryCobalt,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 24,
  },
  primaryActionButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  previewCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  draftWatermarkBar: {
    backgroundColor: '#78350F',
    borderRadius: 6,
    padding: 8,
    marginBottom: 14,
  },
  draftWatermarkText: {
    fontSize: 11,
    color: '#FEF3C7',
    fontWeight: '700',
    textAlign: 'center',
  },
  documentSheet: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  docHeaderTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
  },
  docHeaderSub: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E3A8A',
    textAlign: 'center',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#CBD5E1',
    marginVertical: 12,
  },
  previewLine: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  previewLabel: {
    width: '38%',
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  previewValue: {
    width: '62%',
    fontSize: 11,
    color: '#0F172A',
  },
  signaturePlaceholderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    paddingTop: 12,
  },
  sigBox: {
    width: '46%',
    borderTopWidth: 1,
    borderTopColor: '#94A3B8',
    paddingTop: 4,
    alignItems: 'center',
  },
  sigLabel: {
    fontSize: 10,
    color: '#475569',
    textAlign: 'center',
  },
  actionButtonsContainer: {
    gap: 10,
  },
  exportPdfButton: {
    backgroundColor: Colors.constructionOrange,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  exportPdfButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  copyButton: {
    backgroundColor: Colors.surfaceElevated,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  copyButtonText: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  editButton: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  editButtonText: {
    color: Colors.primaryCobalt,
    fontSize: 13,
    fontWeight: '600',
  },
});
