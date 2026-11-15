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
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { Colors } from '../src/theme/colors';
import { Typography } from '../src/theme/typography';
import { Spacing, Radius, Shadows } from '../src/theme/spacing';
import { useApp } from '../src/context/AppContext';
import { HeaderBar } from '../src/components/HeaderBar';
import { BottomNav } from '../src/components/BottomNav';
import { FormVGeneratorService } from '../src/services/formVGenerator';
import { CertifierType, FormVDocumentType, FormVParams } from '@haq/shared';

export default function FormVScreen() {
  const router = useRouter();
  const { language, t } = useApp();

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

  const certifierOptions: { type: CertifierType; label: string }[] = [
    { type: 'CONTRACTOR', label: language === 'mr' ? 'कंत्राटदार (Contractor)' : language === 'hi' ? 'ठेकेदार (Contractor)' : 'Contractor' },
    { type: 'GRAMSEVAK', label: language === 'mr' ? 'ग्रामसेवक (Gramsevak)' : language === 'hi' ? 'ग्रामसेवक (Gramsevak)' : 'Gramsevak' },
    { type: 'MUNICIPAL_OFFICER', label: language === 'mr' ? 'महानगरपालिका अधिकारी (Municipal Officer)' : language === 'hi' ? 'नगर निगम अधिकारी' : 'Municipal Officer' },
    { type: 'TRADE_UNION', label: language === 'mr' ? 'नोंदणीकृत बांधकाम कामगार संघटना' : language === 'hi' ? 'पंजीकृत श्रमिक यूनियन' : 'Registered Trade Union' },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <HeaderBar />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Title Header with Back Navigation */}
        <View style={styles.titleSection}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.push('/documents')}
            accessibilityRole="button"
            accessibilityLabel="कागदपत्रांकडे परत जा"
          >
            <Ionicons name="arrow-back" size={16} color={Colors.primaryNavy} />
            <Text style={styles.backButtonText}>{language === 'mr' ? 'कागदपत्रे' : language === 'hi' ? 'दस्तावेज' : 'Documents'}</Text>
          </TouchableOpacity>
          <Text style={styles.screenTitle}>{t('formVNavTitle')}</Text>
          <Text style={styles.screenSubtitle}>
            {language === 'mr'
              ? 'MAHABOCW ९० दिवस काम प्रमाणपत्र आणि कंत्राटदार विनंती अर्ज'
              : language === 'hi'
              ? 'MAHABOCW ९० दिन कार्य प्रमाण पत्र व ठेकेदार आवेदन पत्र'
              : 'MAHABOCW Form-V 90-day working certificate & contractor letter'}
          </Text>
        </View>

        {/* Official Statutory Provenance Banner */}
        <View style={styles.provenanceBanner}>
          <Ionicons name="ribbon-outline" size={24} color={Colors.accentSaffronDark} style={{ marginTop: 2 }} />
          <View style={styles.provenanceContent}>
            <Text style={styles.provenanceTitle}>
              {language === 'mr' ? 'अधिकृत वैधानिक स्रोत: MAHABOCW नमुना ५' : language === 'hi' ? 'आधिकारिक वैधानिक स्रोत: MAHABOCW प्रारूप ५' : 'Official Statutory Source: MAHABOCW Form-V'}
            </Text>
            <Text style={styles.provenanceText}>
              {language === 'mr'
                ? 'महाराष्ट्र इमारत व इतर बांधकाम कामगार नियम २००७, नियम २८२ अन्वये विहित केलेला अधिकृत नमुना. हे पत्र भरून कंत्राटदार किंवा ग्रामसेवक यांच्याकडून सही-शिक्का घेणे आवश्यक आहे.'
                : language === 'hi'
                ? 'महाराष्ट्र भवन एवं अन्य निर्माण श्रमिक नियम २००७, नियम २८२ के तहत विहित आधिकारिक प्रारूप। इस पर ठेकेदार या ग्रामसेवक के हस्ताक्षर व मुहर अनिवार्य हैं।'
                : 'Prescribed under Maharashtra BOCW Rules 2007, Rule 282. Must be certified with signature and stamp from contractor or Gramsevak.'}
            </Text>
          </View>
        </View>

        {/* Tab Switcher: Form vs Preview */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'FORM' && styles.tabButtonActive]}
            onPress={() => setActiveTab('FORM')}
            activeOpacity={0.8}
          >
            <Ionicons name="create-outline" size={16} color={activeTab === 'FORM' ? '#FFFFFF' : Colors.mutedSlate} />
            <Text style={[styles.tabButtonText, activeTab === 'FORM' && styles.tabButtonTextActive]}>
              {language === 'mr' ? '१. तपशील भरा' : language === 'hi' ? '१. विवरण भरें' : '1. Fill Details'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'PREVIEW' && styles.tabButtonActive]}
            onPress={() => setActiveTab('PREVIEW')}
            activeOpacity={0.8}
          >
            <Ionicons name="eye-outline" size={16} color={activeTab === 'PREVIEW' ? '#FFFFFF' : Colors.mutedSlate} />
            <Text style={[styles.tabButtonText, activeTab === 'PREVIEW' && styles.tabButtonTextActive]}>
              {language === 'mr' ? '२. पूर्वावलोकन व PDF' : language === 'hi' ? '२. पूर्वावलोकन व PDF' : '2. Preview & PDF'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Document Type Selector */}
        <View style={styles.docTypeRow}>
          <TouchableOpacity
            style={[styles.docTypeBtn, docType === 'FORM_V_CERTIFICATE' && styles.docTypeBtnActive]}
            onPress={() => setDocType('FORM_V_CERTIFICATE')}
            activeOpacity={0.85}
          >
            <Text style={[styles.docTypeBtnText, docType === 'FORM_V_CERTIFICATE' && styles.docTypeBtnTextActive]}>
              {language === 'mr' ? 'फॉर्म-५ प्रमाणपत्र (Certificate)' : 'Form-V Certificate'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.docTypeBtn, docType === 'FORM_V_REQUEST_LETTER' && styles.docTypeBtnActive]}
            onPress={() => setDocType('FORM_V_REQUEST_LETTER')}
            activeOpacity={0.85}
          >
            <Text style={[styles.docTypeBtnText, docType === 'FORM_V_REQUEST_LETTER' && styles.docTypeBtnTextActive]}>
              {language === 'mr' ? 'विनंती अर्ज (Worker Request)' : 'Request Letter'}
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'FORM' ? (
          /* FORM TAB */
          <View style={styles.formCard}>
            <Text style={styles.sectionHeading}>{language === 'mr' ? 'कामगाराचा वैयक्तिक तपशील' : language === 'hi' ? 'श्रमिक व्यक्तिगत विवरण' : 'Worker Personal Details'}</Text>

            <Text style={styles.inputLabel}>{language === 'mr' ? 'कामगाराचे पूर्ण नाव *' : 'Worker Full Name *'}</Text>
            <TextInput
              style={styles.textInput}
              value={workerName}
              onChangeText={setWorkerName}
              placeholder="उदा. रमेश मारुती जाधव"
              placeholderTextColor={Colors.textMuted}
            />

            <Text style={styles.inputLabel}>{language === 'mr' ? 'वडिलांचे / पतीचे नाव *' : 'Father / Husband Name *'}</Text>
            <TextInput
              style={styles.textInput}
              value={fatherName}
              onChangeText={setFatherName}
              placeholder="उदा. मारुती विठ्ठल जाधव"
              placeholderTextColor={Colors.textMuted}
            />

            <View style={styles.twoColRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>{language === 'mr' ? 'वय (वर्षे) *' : 'Age *'}</Text>
                <TextInput
                  style={styles.textInput}
                  value={age}
                  onChangeText={setAge}
                  keyboardType="numeric"
                  placeholder="३२"
                  placeholderTextColor={Colors.textMuted}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>{language === 'mr' ? 'मोबाईल नंबर *' : 'Mobile *'}</Text>
                <TextInput
                  style={styles.textInput}
                  value={mobileNumber}
                  onChangeText={setMobileNumber}
                  keyboardType="phone-pad"
                  placeholder="९८७६५४३२१०"
                  placeholderTextColor={Colors.textMuted}
                />
              </View>
            </View>

            <Text style={styles.inputLabel}>{language === 'mr' ? 'पत्ता (महाराष्ट्रातील) *' : 'Residential Address *'}</Text>
            <TextInput
              style={[styles.textInput, { minHeight: 60 }]}
              value={address}
              onChangeText={setAddress}
              multiline
              placeholder="कात्रज, पुणे"
              placeholderTextColor={Colors.textMuted}
            />

            <Text style={styles.inputLabel}>{language === 'mr' ? 'कामाचे स्वरूप (व्यवसाय) *' : 'Trade Role *'}</Text>
            <TextInput
              style={styles.textInput}
              value={tradeType}
              onChangeText={setTradeType}
              placeholder="उदा. गवंडी कामगार (Masonry)"
              placeholderTextColor={Colors.textMuted}
            />

            {/* Certifier Section */}
            <Text style={[styles.sectionHeading, { marginTop: Spacing.md }]}>
              {language === 'mr' ? 'प्रमाणित करणाऱ्या व्यक्तीचा तपशील' : language === 'hi' ? 'प्रमाणित करने वाले का विवरण' : 'Certifier Details'}
            </Text>

            <Text style={styles.inputLabel}>{language === 'mr' ? 'प्रमाणित करणारी व्यक्ती / पद:' : 'Certifier Authority:'}</Text>
            <View style={styles.certifierStack}>
              {certifierOptions.map((opt) => (
                <TouchableOpacity
                  key={opt.type}
                  style={[
                    styles.certifierOption,
                    certifierType === opt.type && styles.certifierOptionActive,
                  ]}
                  onPress={() => setCertifierType(opt.type)}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={certifierType === opt.type ? 'radio-button-on' : 'radio-button-off'}
                    size={18}
                    color={certifierType === opt.type ? Colors.accentSaffronDark : Colors.mutedSlate}
                  />
                  <Text style={[styles.certifierOptionText, certifierType === opt.type && styles.certifierOptionTextActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>{language === 'mr' ? 'कंत्राटदार / आस्थापनेचे नाव *' : 'Contractor / Agency Name *'}</Text>
            <TextInput
              style={styles.textInput}
              value={certifierName}
              onChangeText={setCertifierName}
              placeholder="उदा. पाटील इन्फ्रास्ट्रक्चर प्रा. लि."
              placeholderTextColor={Colors.textMuted}
            />

            <Text style={styles.inputLabel}>{language === 'mr' ? 'कंत्राटदार नोंदणी क्रमांक / परवाना *' : 'Registration / License No *'}</Text>
            <TextInput
              style={styles.textInput}
              value={certifierRegNo}
              onChangeText={setCertifierRegNo}
              placeholder="उदा. MH-PUN-CONTR-44910"
              placeholderTextColor={Colors.textMuted}
            />

            {/* Work Details */}
            <Text style={[styles.sectionHeading, { marginTop: Spacing.md }]}>
              {language === 'mr' ? 'साइट व कामाचा तपशील' : language === 'hi' ? 'साइट व कार्य विवरण' : 'Site & Work Period'}
            </Text>

            <Text style={styles.inputLabel}>{language === 'mr' ? 'बांधकाम साइटचे नाव व ठिकाण *' : 'Site Name & Location *'}</Text>
            <TextInput
              style={styles.textInput}
              value={siteLocation}
              onChangeText={setSiteLocation}
              placeholder="गंगा व्हिलेज, बाणेर, पुणे"
              placeholderTextColor={Colors.textMuted}
            />

            <View style={styles.twoColRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>{language === 'mr' ? 'सुरुवात तारीख *' : 'Start Date *'}</Text>
                <TextInput
                  style={styles.textInput}
                  value={workStartDate}
                  onChangeText={setWorkStartDate}
                  placeholder="०१/११/२०२३"
                  placeholderTextColor={Colors.textMuted}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>{language === 'mr' ? 'शेवट तारीख *' : 'End Date *'}</Text>
                <TextInput
                  style={styles.textInput}
                  value={workEndDate}
                  onChangeText={setWorkEndDate}
                  placeholder="३१/०८/२०२४"
                  placeholderTextColor={Colors.textMuted}
                />
              </View>
            </View>

            <Text style={styles.inputLabel}>{language === 'mr' ? 'एकूण काम केलेले दिवस (किमान ९०) *' : 'Days Worked (Min 90) *'}</Text>
            <TextInput
              style={[styles.textInput, { fontWeight: '700' }]}
              value={daysWorked}
              onChangeText={setDaysWorked}
              keyboardType="numeric"
              placeholder="११०"
              placeholderTextColor={Colors.textMuted}
            />

            {/* Switch to preview button */}
            <TouchableOpacity
              style={styles.previewBtn}
              onPress={() => setActiveTab('PREVIEW')}
              activeOpacity={0.88}
            >
              <Text style={styles.previewBtnText}>
                {language === 'mr' ? 'पूर्वावलोकन पहा व PDF तयार करा' : language === 'hi' ? 'पूर्वावलोकन देखें व PDF बनाएं' : 'View Preview & Generate PDF'} →
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* PREVIEW TAB */
          <View style={styles.previewCard}>
            {copiedNotice && (
              <View style={styles.copiedBanner}>
                <Ionicons name="checkmark-circle" size={18} color={Colors.success} />
                <Text style={styles.copiedBannerText}>{t('copied')}</Text>
              </View>
            )}

            <View style={styles.documentSheet}>
              <View style={styles.docHeader}>
                <Text style={styles.docGovHeader}>MAHARASHTRA BUILDING & OTHER CONSTRUCTION WORKERS WELFARE BOARD</Text>
                <Text style={styles.docMainTitle}>
                  {docType === 'FORM_V_CERTIFICATE' ? 'नमुना क्रमांक ५ (FORM - V)' : 'कंत्राटदाराकडे अर्ज (APPLICATION)'}
                </Text>
                <Text style={styles.docSubTitle}>[ नियम २८२ पहा / See Rule 282 ]</Text>
                <Text style={styles.docCertTitle}>
                  {docType === 'FORM_V_CERTIFICATE'
                    ? '९० दिवस काम केल्याचे प्रमाणपत्र (CERTIFICATE OF 90 DAYS WORK)'
                    : 'फॉर्म-५ प्रमाणपत्र मिळण्याबाबत विनंती अर्ज'}
                </Text>
              </View>

              <View style={styles.docBody}>
                {docType === 'FORM_V_CERTIFICATE' ? (
                  <>
                    <Text style={styles.docParagraph}>
                      प्रमाणित करण्यात येते की, श्री/श्रीमती <Text style={styles.docBold}>{workerName}</Text>,
                      वडिलांचे/पतीचे नाव श्री. <Text style={styles.docBold}>{fatherName}</Text>,
                      वय अंदाजे <Text style={styles.docBold}>{age}</Text> वर्षे,
                      पत्ता: <Text style={styles.docBold}>{address}</Text>,
                      मोबाईल: <Text style={styles.docBold}>{mobileNumber}</Text>.
                    </Text>

                    <Text style={styles.docParagraph}>
                      हे आमच्या बांधकाम आस्थापनेवर <Text style={styles.docBold}>{siteLocation}</Text> येथे
                      <Text style={styles.docBold}> {tradeType}</Text> म्हणून दिनांक <Text style={styles.docBold}>{workStartDate}</Text> ते
                      दिनांक <Text style={styles.docBold}>{workEndDate}</Text> या कालावधीत प्रत्यक्ष कार्यरत होते.
                    </Text>

                    <Text style={styles.docParagraph}>
                      सदर कामगाराने मागील १२ महिन्यांत एकूण <Text style={styles.docHighlight}> {daysWorked} दिवस </Text>
                      बांधकाम काम पूर्ण केलेले आहे.
                    </Text>

                    <Text style={styles.docParagraph}>
                      हे प्रमाणपत्र महाराष्ट्र इमारत व इतर बांधकाम कामगार (रोजगार नियमन व सेवाशर्ती) नियम २००७
                      अन्वये नोंदणीसाठी देण्यात येत आहे.
                    </Text>

                    <View style={styles.docSignSection}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.docSignLabel}>ठिकाण: {issuePlace}</Text>
                        <Text style={styles.docSignLabel}>दिनांक: {issueDate}</Text>
                      </View>
                      <View style={{ alignItems: 'flex-end', flex: 1 }}>
                        <Text style={styles.docSignLine}>स्वाक्षरी व शिक्का</Text>
                        <Text style={styles.docSignerName}>{certifierName}</Text>
                        <Text style={styles.docSignerSub}>({certifierRegNo})</Text>
                      </View>
                    </View>
                  </>
                ) : (
                  <>
                    <Text style={styles.docParagraph}>प्रति,{"\n"}श्री. <Text style={styles.docBold}>{certifierName}</Text>{"\n"}{siteLocation}</Text>
                    <Text style={[styles.docParagraph, { fontWeight: '700' }]}>
                      विषय: MAHABOCW ९० दिवस काम केल्याचे प्रमाणपत्र (फॉर्म-५) मिळण्याबाबत.
                    </Text>
                    <Text style={styles.docParagraph}>
                      महोदय,{"\n"}
                      मी, <Text style={styles.docBold}>{workerName}</Text>, आपल्या बांधकाम साइटवर {workStartDate} ते {workEndDate} या कालावधीत {tradeType} म्हणून एकूण {daysWorked} दिवस काम केले आहे.
                    </Text>
                    <Text style={styles.docParagraph}>
                      मला महाराष्ट्र इमारत व इतर बांधकाम कामगार कल्याणकारी मंडळाकडे अधिकृत नोंदणी करायची असल्याने कृपया नियमानुसार नमुना ५ प्रमाणपत्र स्वाक्षरी व शिक्क्यानिशी द्यावे.
                    </Text>
                    <View style={{ marginTop: 24, alignItems: 'flex-end' }}>
                      <Text style={styles.docParagraph}>आपला नम्र,{"\n"}<Text style={styles.docBold}>{workerName}</Text>{"\n"}मोबाईल: {mobileNumber}</Text>
                    </View>
                  </>
                )}
              </View>
            </View>

            {/* Export and Share Actions */}
            <View style={styles.exportActionsContainer}>
              <TouchableOpacity
                style={styles.exportPdfBtn}
                onPress={handleExportPdf}
                disabled={exporting}
                activeOpacity={0.88}
              >
                {exporting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="download-outline" size={20} color="#FFFFFF" />
                    <Text style={styles.exportPdfBtnText}>
                      {language === 'mr' ? 'PDF डाउनलोड / शेअर करा' : language === 'hi' ? 'PDF डाउनलोड / शेयर करें' : 'Download / Share PDF'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.copyTextBtn}
                onPress={handleCopyText}
                activeOpacity={0.8}
              >
                <Ionicons name="copy-outline" size={18} color={Colors.primaryNavy} />
                <Text style={styles.copyTextBtnText}>
                  {language === 'mr' ? 'मजकूर कॉपी करा (WhatsApp)' : language === 'hi' ? 'कॉपी करें (WhatsApp)' : 'Copy Text (WhatsApp)'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.editBackBtn}
                onPress={() => setActiveTab('FORM')}
                activeOpacity={0.8}
              >
                <Text style={styles.editBackBtnText}>← {language === 'mr' ? 'तपशील संपादित करा' : 'Edit Details'}</Text>
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
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: Spacing.xs,
  },
  backButtonText: {
    ...Typography.captionRegular,
    fontWeight: '600',
    color: Colors.primaryNavy,
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
  provenanceBanner: {
    flexDirection: 'row',
    backgroundColor: Colors.warmIvoryAlt,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderHighlight,
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  provenanceContent: {
    flex: 1,
  },
  provenanceTitle: {
    ...Typography.labelMedium,
    fontSize: 13,
    color: Colors.primaryNavy,
    marginBottom: 2,
  },
  provenanceText: {
    ...Typography.captionRegular,
    fontSize: 11,
    lineHeight: 16,
    color: Colors.mutedSlate,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.cardSurface,
    borderRadius: Radius.md,
    padding: 3,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    marginBottom: Spacing.sm,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 6,
    borderRadius: Radius.sm,
  },
  tabButtonActive: {
    backgroundColor: Colors.primaryNavy,
  },
  tabButtonText: {
    ...Typography.badgeText,
    fontSize: 13,
    color: Colors.mutedSlate,
  },
  tabButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  docTypeRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  docTypeBtn: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.cardSurface,
    alignItems: 'center',
  },
  docTypeBtnActive: {
    borderColor: Colors.accentSaffron,
    backgroundColor: Colors.saffronOrangeLight,
    borderWidth: 1.5,
  },
  docTypeBtnText: {
    ...Typography.badgeText,
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  docTypeBtnTextActive: {
    color: Colors.accentSaffronDark,
    fontWeight: '700',
  },
  formCard: {
    backgroundColor: Colors.cardSurface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    marginBottom: Spacing.lg,
    ...Shadows.card,
  },
  sectionHeading: {
    ...Typography.sectionTitle,
    fontSize: 16,
    color: Colors.primaryNavy,
    marginBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
    paddingBottom: 6,
  },
  inputLabel: {
    ...Typography.labelMedium,
    fontSize: 12,
    color: Colors.textPrimary,
    marginBottom: 4,
    marginTop: Spacing.xs,
  },
  textInput: {
    backgroundColor: Colors.backgroundWarm,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.primaryNavy,
    marginBottom: Spacing.xs,
  },
  twoColRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  certifierStack: {
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  certifierOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.backgroundWarm,
  },
  certifierOptionActive: {
    borderColor: Colors.accentSaffron,
    backgroundColor: Colors.saffronOrangeLight,
  },
  certifierOptionText: {
    ...Typography.captionRegular,
    fontSize: 13,
    color: Colors.textPrimary,
  },
  certifierOptionTextActive: {
    fontWeight: '700',
    color: Colors.accentSaffronDark,
  },
  previewBtn: {
    backgroundColor: Colors.accentSaffron,
    borderRadius: Radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: Spacing.md,
    minHeight: Spacing.touchTargetMin,
    justifyContent: 'center',
    ...Shadows.sm,
  },
  previewBtnText: {
    ...Typography.buttonPrimary,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  previewCard: {
    marginBottom: Spacing.lg,
  },
  copiedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.successSurface,
    padding: Spacing.sm,
    borderRadius: Radius.md,
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  copiedBannerText: {
    ...Typography.captionRegular,
    color: Colors.success,
    fontWeight: '600',
  },
  documentSheet: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1.5,
    borderColor: Colors.borderHighlight,
    marginBottom: Spacing.md,
    ...Shadows.elevated,
  },
  docHeader: {
    alignItems: 'center',
    borderBottomWidth: 1.5,
    borderBottomColor: Colors.primaryNavy,
    paddingBottom: Spacing.md,
    marginBottom: Spacing.md,
  },
  docGovHeader: {
    ...Typography.badgeText,
    fontSize: 10,
    color: Colors.mutedSlate,
    textAlign: 'center',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  docMainTitle: {
    ...Typography.sectionTitle,
    fontSize: 17,
    color: Colors.primaryNavy,
    textAlign: 'center',
  },
  docSubTitle: {
    ...Typography.captionRegular,
    fontSize: 11,
    color: Colors.mutedSlate,
  },
  docCertTitle: {
    ...Typography.labelMedium,
    fontSize: 13,
    color: Colors.accentSaffronDark,
    textAlign: 'center',
    marginTop: 4,
  },
  docBody: {
    gap: Spacing.sm,
  },
  docParagraph: {
    ...Typography.bodyRegular,
    fontSize: 14,
    lineHeight: 22,
    color: Colors.textPrimary,
  },
  docBold: {
    fontWeight: '700',
    color: Colors.primaryNavy,
  },
  docHighlight: {
    fontWeight: '800',
    color: Colors.accentSaffronDark,
  },
  docSignSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: Spacing.xl,
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.borderSubtle,
  },
  docSignLabel: {
    ...Typography.captionRegular,
    fontSize: 12,
    color: Colors.mutedSlate,
  },
  docSignLine: {
    ...Typography.badgeText,
    fontSize: 12,
    color: Colors.primaryNavy,
    borderTopWidth: 1,
    borderTopColor: Colors.primaryNavy,
    paddingTop: 4,
    textAlign: 'right',
  },
  docSignerName: {
    ...Typography.captionRegular,
    fontWeight: '600',
    fontSize: 12,
    color: Colors.primaryNavy,
    textAlign: 'right',
  },
  docSignerSub: {
    ...Typography.captionRegular,
    fontSize: 10,
    color: Colors.mutedSlate,
    textAlign: 'right',
  },
  exportActionsContainer: {
    gap: Spacing.sm,
  },
  exportPdfBtn: {
    backgroundColor: Colors.accentSaffron,
    borderRadius: Radius.md,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.xs,
    minHeight: Spacing.touchTargetMin,
    ...Shadows.sm,
  },
  exportPdfBtnText: {
    ...Typography.buttonPrimary,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  copyTextBtn: {
    backgroundColor: Colors.cardSurface,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.xs,
    minHeight: Spacing.touchTargetMin,
  },
  copyTextBtnText: {
    ...Typography.buttonSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  editBackBtn: {
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  editBackBtnText: {
    ...Typography.captionRegular,
    fontSize: 13,
    color: Colors.mutedSlate,
    fontWeight: '600',
  },
});
