import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  TextInput,
  Modal,
  ActivityIndicator,
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
import { DocumentRow } from '../src/components/DocumentRow';
import { ChecklistOfflineService } from '../src/services/checklistCache';
import { CachedChecklistState, DocumentChecklistItem, DocumentStatus } from '@haq/shared';
import { VoiceGuidanceButton } from '../src/components/VoiceGuidanceButton';
import { VoiceGuidanceService } from '../src/services/voiceGuidance';

export default function DocumentsScreen() {
  const router = useRouter();
  const { sessionId, t, language } = useApp();

  const [cacheState, setCacheState] = useState<CachedChecklistState | null>(null);
  const [items, setItems] = useState<DocumentChecklistItem[]>([]);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'AVAILABLE' | 'PENDING'>('ALL');

  // Modal State
  const [selectedItem, setSelectedItem] = useState<DocumentChecklistItem | null>(null);
  const [editingNotes, setEditingNotes] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<DocumentStatus>('MISSING');
  const [modalVisible, setModalVisible] = useState<boolean>(false);

  useEffect(() => {
    loadChecklist();
  }, [sessionId]);

  const loadChecklist = async () => {
    setLoading(true);
    try {
      const cached = await ChecklistOfflineService.loadCachedChecklist(sessionId);
      setCacheState(cached);
      setItems(cached.items);
      setProgressPercent(cached.progressPercent);
    } finally {
      setLoading(false);
    }
    await performSync();
  };

  const performSync = async () => {
    setSyncing(true);
    try {
      const result = await ChecklistOfflineService.syncWithServer(sessionId);
      setCacheState(result.state);
      setItems(result.state.items);
      setProgressPercent(result.state.progressPercent);
    } catch (err: any) {
      console.warn('[Documents] Background sync:', err?.message || err);
    } finally {
      setSyncing(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await performSync();
  };

  const handleOpenStatusModal = (item: DocumentChecklistItem) => {
    setSelectedItem(item);
    setSelectedStatus(item.status);
    setEditingNotes(item.userNotes || '');
    setModalVisible(true);
  };

  const handleSaveModal = async () => {
    if (!selectedItem) return;

    const newState = await ChecklistOfflineService.updateItemLocally(
      sessionId,
      selectedItem.id,
      selectedStatus,
      editingNotes
    );

    setCacheState(newState);
    setItems(newState.items);
    setProgressPercent(newState.progressPercent);
    setModalVisible(false);
    setSelectedItem(null);

    // Asynchronous background sync
    performSync();
  };

  const filteredItems = items.filter((item) => {
    if (activeFilter === 'AVAILABLE') {
      return item.status === 'AVAILABLE';
    }
    if (activeFilter === 'PENDING') {
      return item.status !== 'AVAILABLE';
    }
    return true;
  });

  const availableCount = items.filter((i) => i.status === 'AVAILABLE').length;
  const pendingCount = items.filter((i) => i.status !== 'AVAILABLE').length;

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
          <Text style={styles.screenTitle}>{t('docsTitle')}</Text>
          <Text style={styles.screenSubtitle}>{t('docsSubtitle')}</Text>
        </View>

        {/* Progress & Offline Sync Status Card */}
        <View style={styles.progressCard}>
          <View style={styles.progressCardHeader}>
            <View>
              <Text style={styles.progressCardLabel}>{t('preparationProgress')}</Text>
              <Text style={styles.progressCardNumber}>
                {availableCount} / {items.length} {language === 'mr' ? 'कागदपत्रे तयार' : language === 'hi' ? 'दस्तावेज तैयार' : 'Documents Ready'}
              </Text>
            </View>
            <View style={styles.progressBadge}>
              <Text style={styles.progressBadgeText}>{progressPercent}%</Text>
            </View>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressBarTrack}>
            <View style={[styles.progressBarFill, { width: `${Math.max(8, progressPercent)}%` }]} />
          </View>

          {/* Offline Sync Banner */}
          <View style={styles.syncRow}>
            <View style={styles.syncStatusLeft}>
              <View style={styles.syncDot} />
              <Text style={styles.syncStatusText}>
                {syncing
                  ? (language === 'mr' ? 'सर्व्हरशी सिंक होत आहे...' : language === 'hi' ? 'सिंक हो रहा है...' : 'Syncing with server...')
                  : (language === 'mr' ? 'ऑफलाइन उपलब्ध • स्थानिक कॅश' : language === 'hi' ? 'ऑफलाइन सुरक्षित • स्थानीय कैश' : 'Offline ready • Local storage')}
              </Text>
            </View>
            <VoiceGuidanceButton
              textToSpeak={
                language === 'mr'
                  ? 'महाराष्ट्र इमारत व इतर बांधकाम कामगार नोंदणीसाठी फॉर्म-५, आधार कार्ड, रहिवासी दाखला व बँक पासबुक आवश्यक आहे.'
                  : language === 'hi'
                  ? 'महाराष्ट्र निर्माण श्रमिक पंजीकरण हेतु फॉर्म-५, आधार कार्ड, निवास प्रमाण एवं बैंक पासबुक आवश्यक है।'
                  : 'Form-V certificate, Aadhaar card, residence proof, and bank passbook are required for registration.'
              }
              language={language}
            />
          </View>
        </View>

        {/* Form-V Highlight Banner */}
        <TouchableOpacity
          style={styles.formVCalloutCard}
          onPress={() => router.push('/form-v')}
          activeOpacity={0.88}
        >
          <View style={styles.formVIconBox}>
            <Ionicons name="document-attach" size={24} color="#FFFFFF" />
          </View>
          <View style={styles.formVTextCol}>
            <View style={styles.formVTagRow}>
              <Text style={styles.formVTagText}>{language === 'mr' ? 'विशेष सहाय्य' : language === 'hi' ? 'विशेष सहायता' : 'Essential Tool'}</Text>
            </View>
            <Text style={styles.formVCardTitle}>
              {language === 'mr' ? 'फॉर्म-५ जनरेटर (९० दिवस काम प्रमाणपत्र)' : language === 'hi' ? 'फॉर्म-५ जनरेटर (९० दिन कार्य प्रमाण पत्र)' : 'Form-V 90-Day Work Certificate Generator'}
            </Text>
            <Text style={styles.formVCardSub}>
              {language === 'mr' ? 'कंत्राटदाराकडे देण्यासाठी अर्ज किंवा प्रमाणपत्र एका क्लिकवर तयार करा' : language === 'hi' ? 'ठेकेदार हेतु आवेदन या प्रमाण पत्र एक क्लिक में बनाएं' : 'Generate official PDF certificate or contractor request letter'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.accentSaffronDark} />
        </TouchableOpacity>

        {/* Filter Tabs */}
        <View style={styles.filterTabsRow}>
          <TouchableOpacity
            style={[styles.filterTab, activeFilter === 'ALL' && styles.filterTabActive]}
            onPress={() => setActiveFilter('ALL')}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterTabText, activeFilter === 'ALL' && styles.filterTabTextActive]}>
              {language === 'mr' ? 'सर्व' : language === 'hi' ? 'सभी' : 'All'} ({items.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterTab, activeFilter === 'AVAILABLE' && styles.filterTabActive]}
            onPress={() => setActiveFilter('AVAILABLE')}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterTabText, activeFilter === 'AVAILABLE' && styles.filterTabTextActive]}>
              {language === 'mr' ? 'तयार' : language === 'hi' ? 'तैयार' : 'Ready'} ({availableCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterTab, activeFilter === 'PENDING' && styles.filterTabActive]}
            onPress={() => setActiveFilter('PENDING')}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterTabText, activeFilter === 'PENDING' && styles.filterTabTextActive]}>
              {language === 'mr' ? 'बाकी' : language === 'hi' ? 'शेष' : 'Pending'} ({pendingCount})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Document Rows */}
        {loading ? (
          <ActivityIndicator size="large" color={Colors.accentSaffron} style={{ marginTop: 24 }} />
        ) : (
          <View style={styles.documentList}>
            {filteredItems.map((item) => {
              const req = item.requirement;
              const title = req?.title?.[language] || req?.title?.en || item.requirementId;
              const desc = req?.description?.[language] || req?.description?.en || '';
              const alts = req?.acceptedAlternatives?.[language] || req?.acceptedAlternatives?.en || [];
              const isFormV = item.requirementId.includes('90-days');

              return (
                <DocumentRow
                  key={item.id}
                  id={item.id}
                  title={title}
                  description={desc}
                  status={item.status}
                  userNotes={item.userNotes}
                  alternatives={alts}
                  language={language}
                  onToggleStatus={() => handleOpenStatusModal(item)}
                  onPressFormV={isFormV ? () => router.push('/form-v') : undefined}
                />
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Interactive Status & Notes Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalHeaderTitle}>{t('actionChangeStatus')}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={22} color={Colors.mutedSlate} />
              </TouchableOpacity>
            </View>

            {selectedItem && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.modalDocTitle}>
                  {selectedItem.requirement?.title?.[language] || selectedItem.requirement?.title?.en}
                </Text>

                {/* Status Selection Buttons */}
                <Text style={styles.modalSectionLabel}>
                  {language === 'mr' ? 'सध्याची स्थिती निवडा:' : language === 'hi' ? 'वर्तमान स्थिति चुनें:' : 'Select Current Status:'}
                </Text>

                <View style={styles.statusButtonStack}>
                  {[
                    {
                      status: 'AVAILABLE' as DocumentStatus,
                      label: t('docAvailable'),
                      icon: 'checkmark-circle' as const,
                      color: Colors.success,
                      bg: Colors.successSurface,
                    },
                    {
                      status: 'NEEDS_VERIFICATION' as DocumentStatus,
                      label: t('docNeedsVerification'),
                      icon: 'help-circle' as const,
                      color: Colors.warning,
                      bg: Colors.warningSurface,
                    },
                    {
                      status: 'ACTION_REQUIRED' as DocumentStatus,
                      label: t('docActionRequired'),
                      icon: 'alert-circle' as const,
                      color: Colors.accentSaffronDark,
                      bg: Colors.saffronOrangeLight,
                    },
                    {
                      status: 'MISSING' as DocumentStatus,
                      label: t('docMissing'),
                      icon: 'close-circle' as const,
                      color: Colors.mutedSlate,
                      bg: Colors.borderSubtle,
                    },
                  ].map((s) => {
                    const isSelected = selectedStatus === s.status;
                    return (
                      <TouchableOpacity
                        key={s.status}
                        style={[
                          styles.statusOptionBtn,
                          isSelected && { borderColor: s.color, backgroundColor: s.bg, borderWidth: 2 },
                        ]}
                        onPress={() => setSelectedStatus(s.status)}
                        activeOpacity={0.8}
                      >
                        <Ionicons name={s.icon} size={20} color={s.color} />
                        <Text style={[styles.statusOptionText, isSelected && { color: s.color, fontWeight: '700' }]}>
                          {s.label}
                        </Text>
                        {isSelected && <Ionicons name="checkmark" size={18} color={s.color} style={{ marginLeft: 'auto' }} />}
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Personal User Notes */}
                <Text style={styles.modalSectionLabel}>
                  {language === 'mr' ? 'खाजगी टीप (उदा. कंत्राटदाराकडे मागितले आहे):' : language === 'hi' ? 'निजी टिप्पणी (उदा. ठेकेदार से मांगा गया है):' : 'Private Notes:'}
                </Text>
                <TextInput
                  style={styles.modalNotesInput}
                  value={editingNotes}
                  onChangeText={setEditingNotes}
                  placeholder={t('notesPlaceholder')}
                  placeholderTextColor={Colors.textMuted}
                  multiline
                  numberOfLines={3}
                />

                {/* Save and Cancel Actions */}
                <View style={styles.modalActionRow}>
                  <TouchableOpacity
                    style={styles.modalCancelBtn}
                    onPress={() => setModalVisible(false)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.modalCancelBtnText}>{t('cancel')}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.modalSaveBtn}
                    onPress={handleSaveModal}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.modalSaveBtnText}>{t('save')}</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
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
  progressCard: {
    backgroundColor: Colors.cardSurface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    marginBottom: Spacing.md,
    ...Shadows.sm,
  },
  progressCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  progressCardLabel: {
    ...Typography.labelMedium,
    fontSize: 12,
    color: Colors.mutedSlate,
    textTransform: 'uppercase',
  },
  progressCardNumber: {
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
  syncRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing.xs,
  },
  syncStatusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  syncDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.success,
  },
  syncStatusText: {
    ...Typography.captionRegular,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  formVCalloutCard: {
    backgroundColor: Colors.cardSurface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.accentSaffron,
    marginBottom: Spacing.md,
    ...Shadows.sm,
  },
  formVIconBox: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    backgroundColor: Colors.accentSaffron,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  formVTextCol: {
    flex: 1,
  },
  formVTagRow: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.saffronOrangeLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.xs,
    marginBottom: 2,
  },
  formVTagText: {
    ...Typography.badgeText,
    fontSize: 9,
    color: Colors.accentSaffronDark,
  },
  formVCardTitle: {
    ...Typography.cardTitle,
    fontSize: 14,
    color: Colors.primaryNavy,
  },
  formVCardSub: {
    ...Typography.captionRegular,
    fontSize: 11,
    color: Colors.mutedSlate,
    lineHeight: 15,
  },
  filterTabsRow: {
    flexDirection: 'row',
    backgroundColor: Colors.cardSurface,
    borderRadius: Radius.md,
    padding: 3,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    marginBottom: Spacing.md,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: Radius.sm,
  },
  filterTabActive: {
    backgroundColor: Colors.primaryNavy,
  },
  filterTabText: {
    ...Typography.badgeText,
    fontSize: 12,
    color: Colors.mutedSlate,
  },
  filterTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  documentList: {
    gap: Spacing.sm,
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
  modalDocTitle: {
    ...Typography.cardTitle,
    fontSize: 16,
    color: Colors.primaryNavy,
    marginBottom: Spacing.md,
  },
  modalSectionLabel: {
    ...Typography.labelMedium,
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  statusButtonStack: {
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  statusOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.backgroundWarm,
    gap: Spacing.sm,
    minHeight: 46,
  },
  statusOptionText: {
    ...Typography.bodyRegular,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  modalNotesInput: {
    backgroundColor: Colors.backgroundWarm,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    fontSize: 14,
    color: Colors.primaryNavy,
    minHeight: 70,
    textAlignVertical: 'top',
    marginBottom: Spacing.lg,
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
  modalSaveBtn: {
    flex: 2,
    backgroundColor: Colors.accentSaffron,
    paddingVertical: 14,
    borderRadius: Radius.md,
    alignItems: 'center',
    minHeight: Spacing.touchTargetMin,
    ...Shadows.sm,
  },
  modalSaveBtnText: {
    ...Typography.buttonPrimary,
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
