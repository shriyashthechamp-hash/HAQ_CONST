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
  Linking,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../src/theme/colors';
import { useApp } from '../src/context/AppContext';
import { HeaderBar } from '../src/components/HeaderBar';
import { BottomNav } from '../src/components/BottomNav';
import { SourceCitationCard } from '../src/components/SourceCitationCard';
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
  const [selectedItem, setSelectedItem] = useState<DocumentChecklistItem | null>(null);
  const [editingNotes, setEditingNotes] = useState<string>('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState<boolean>(false);

  useEffect(() => {
    loadChecklist();
  }, [sessionId]);

  const loadChecklist = async () => {
    setLoading(true);
    try {
      // 1. Read immediate cache for instantaneous, offline-ready UI
      const cached = await ChecklistOfflineService.loadCachedChecklist(sessionId);
      setCacheState(cached);
      setItems(cached.items);
      setProgressPercent(cached.progressPercent);
    } finally {
      setLoading(false);
    }

    // 2. Perform background sync with server
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
      console.warn('[Documents] Background sync error:', err?.message || err);
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
    setEditingNotes(item.userNotes || '');
    setModalVisible(true);
  };

  const handleUpdateStatus = async (newStatus: DocumentStatus) => {
    if (!selectedItem) return;

    // 1. Local-first update: instant persistence & UI feedback
    const newState = await ChecklistOfflineService.updateItemLocally(
      sessionId,
      selectedItem.id,
      newStatus,
      editingNotes
    );

    setCacheState(newState);
    setItems(newState.items);
    setProgressPercent(newState.progressPercent);
    setModalVisible(false);
    setSelectedItem(null);

    // 2. Trigger asynchronous background sync
    performSync();
  };

  const getStatusBadge = (status: DocumentStatus) => {
    switch (status) {
      case 'AVAILABLE':
        return {
          label: t('docAvailable'),
          color: Colors.statusAvailable,
          bg: Colors.successSurface,
        };
      case 'NEEDS_VERIFICATION':
        return {
          label: t('docNeedsVerification'),
          color: Colors.statusNeedsVerification,
          bg: Colors.warningSurface,
        };
      case 'ACTION_REQUIRED':
        return {
          label: t('docActionRequired'),
          color: Colors.statusActionRequired,
          bg: 'rgba(255, 107, 44, 0.15)',
        };
      case 'MISSING':
      default:
        return {
          label: t('docMissing'),
          color: Colors.statusMissing,
          bg: 'rgba(100, 116, 139, 0.15)',
        };
    }
  };

  const pendingCount = Object.keys(cacheState?.pendingUpdates || {}).length;

  return (
    <SafeAreaView style={styles.safeArea}>
      <HeaderBar />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.constructionOrange}
            colors={[Colors.constructionOrange]}
          />
        }
      >
        {/* Title Section */}
        <View style={styles.titleSection}>
          <View style={styles.titleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.screenTitle}>{t('docsTitle')}</Text>
              <Text style={styles.screenSubtitle}>{t('docsSubtitle')}</Text>
            </View>

            {/* Quick Action: Open Form-V Generator */}
            <TouchableOpacity
              style={styles.topFormVButton}
              onPress={() => router.push('/form-v')}
              accessibilityLabel="फॉर्म-५ जनरेटर उघडा"
            >
              <Text style={styles.topFormVButtonText}>📄 फॉर्म-५ जनरेटर</Text>
            </TouchableOpacity>
          </View>

          {/* Voice Guidance Button */}
          <View style={{ marginTop: 12 }}>
            <VoiceGuidanceButton
              textToSpeak={VoiceGuidanceService.getScript('CHECKLIST_NEXT', language)}
              language={language}
              label={language === 'mr' ? '🔊 कागदपत्र मार्गदर्शन ऐका' : '🔊 Listen to Document Guidance'}
            />
          </View>
        </View>

        {/* Offline / Synchronization Status Banner */}
        <View style={styles.syncBannerContainer}>
          {pendingCount > 0 ? (
            <View style={styles.pendingSyncBanner}>
              <View style={{ flex: 1 }}>
                <Text style={styles.pendingSyncTitle}>
                  ⏳ {pendingCount} बदल स्थानिक सेव्ह (सिंक बाकी)
                </Text>
                <Text style={styles.pendingSyncSub}>
                  इंटरनेट चालू होताच बदल आपोआप सर्व्हरवर सिंक होतील.
                </Text>
              </View>
              <TouchableOpacity
                style={styles.syncNowBtn}
                onPress={performSync}
                disabled={syncing}
              >
                {syncing ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.syncNowBtnText}>आता सिंक करा</Text>
                )}
              </TouchableOpacity>
            </View>
          ) : cacheState?.syncStatus === 'OFFLINE' ? (
            <View style={styles.offlineBanner}>
              <Text style={styles.offlineBannerText}>
                📶 ऑफलाइन मोड • स्थानिक पातळीवर जतन केलेली कागदपत्रे दिसत आहेत.
              </Text>
            </View>
          ) : (
            <View style={styles.syncedBanner}>
              <Text style={styles.syncedBannerText}>
                ✓ सर्व्हरवर अद्ययावत{' '}
                {cacheState?.lastSyncedAt
                  ? `(शेवटचे सिंक: ${new Date(cacheState.lastSyncedAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })})`
                  : ''}
              </Text>
              <TouchableOpacity onPress={performSync} disabled={syncing}>
                <Text style={styles.syncRefreshLink}>
                  {syncing ? 'सिंक होत आहे...' : 'ताजे करा ↻'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Preparation Progress Bar */}
        <View style={styles.progressHero}>
          <View style={styles.progressHeaderRow}>
            <View>
              <Text style={styles.progressHeroLabel}>{t('preparationProgress')}</Text>
              <Text style={styles.progressHeroSub}>
                {items.filter((i) => i.status === 'AVAILABLE').length} of {items.length} Ready
              </Text>
            </View>
            <Text style={styles.progressPercentText}>{progressPercent}%</Text>
          </View>

          <View style={styles.progressBarTrack}>
            <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
          </View>
        </View>

        {/* Document Cards List */}
        {loading && items.length === 0 ? (
          <View style={styles.loaderBox}>
            <ActivityIndicator size="large" color={Colors.constructionOrange} />
            <Text style={styles.loaderText}>{t('loading')}</Text>
          </View>
        ) : (
          <View style={styles.itemsList}>
            {items.map((item) => {
              const badge = getStatusBadge(item.status);
              const isExpanded = expandedId === item.id;
              const req = item.requirement;
              const titleText = req?.title
                ? (req.title as any)[language] || req.title.en
                : item.requirementId;
              const descText = req?.description
                ? (req.description as any)[language] || req.description.en
                : '';
              const alts = req?.acceptedAlternatives
                ? (req.acceptedAlternatives as any)[language] || req.acceptedAlternatives.en || []
                : [];

              const hasPendingLocalUpdate = Boolean(cacheState?.pendingUpdates?.[item.id]);

              return (
                <View key={item.id} style={styles.docCard}>
                  {/* Card Header Row */}
                  <View style={styles.cardHeader}>
                    <View style={styles.titleCol}>
                      <View style={styles.titleBadgeRow}>
                        <Text style={styles.docTitle}>{titleText}</Text>
                        {hasPendingLocalUpdate && (
                          <View style={styles.pendingDotBadge}>
                            <Text style={styles.pendingDotText}>स्थानिक सेव्ह</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.docDesc}>{descText}</Text>
                    </View>

                    {/* Status Badge & Edit Trigger */}
                    <TouchableOpacity
                      onPress={() => handleOpenStatusModal(item)}
                      style={[styles.statusBadge, { backgroundColor: badge.bg }]}
                    >
                      <Text style={[styles.statusBadgeText, { color: badge.color }]}>
                        {badge.label} ▾
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Special Form-V Generator Entry Point */}
                  {req?.documentKey === 'DOC_90_DAYS_CERT' && (
                    <View style={styles.formVActionBox}>
                      <View style={{ flex: 1, marginRight: 10 }}>
                        <Text style={styles.formVActionTitle}>
                          📄 ९० दिवस कामाचा दाखला (फॉर्म-५) तयार करा
                        </Text>
                        <Text style={styles.formVActionSub}>
                          कंत्राटदाराकडे सही-शिक्क्यासाठी अर्ज किंवा अधिकृत नमुना PDF मध्ये लगेच बनवा.
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={styles.formVLaunchBtn}
                        onPress={() => router.push('/form-v')}
                      >
                        <Text style={styles.formVLaunchBtnText}>तयार करा →</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {req?.reviewStatus === 'PROVISIONAL' && (
                    <View style={styles.provisionalWarningBox}>
                      <Text style={styles.provisionalWarningText}>
                        ⚠️{' '}
                        {language === 'mr'
                          ? 'पडताळणी आवश्यक • हा निकष सर्व कामगारांसाठी बंधनकारक नाही'
                          : language === 'hi'
                          ? 'सत्यापन आवश्यक • यह शर्त सभी श्रमिकों पर अनिवार्य नहीं है'
                          : 'Needs Verification • Applicability varies by site jurisdiction'}
                      </Text>
                    </View>
                  )}

                  {/* User Notes Preview if present */}
                  {item.userNotes ? (
                    <View style={styles.notesBox}>
                      <Text style={styles.notesLabel}>Note / टीप:</Text>
                      <Text style={styles.notesText}>{item.userNotes}</Text>
                    </View>
                  ) : null}

                  {/* Expand / Collapse Toggle */}
                  <TouchableOpacity
                    onPress={() => setExpandedId(isExpanded ? null : item.id)}
                    style={styles.expandToggle}
                  >
                    <Text style={styles.expandToggleText}>
                      {isExpanded ? 'तपशील लपवा ▲' : 'पर्यायी कागदपत्रे व माहिती पहा ▼'}
                    </Text>
                  </TouchableOpacity>

                  {/* Expanded Detail Panel */}
                  {isExpanded && (
                    <View style={styles.expandedContent}>
                      {/* Accepted Alternatives */}
                      <Text style={styles.altsHeader}>{t('alternativesLabel')}</Text>
                      <View style={styles.altsList}>
                        {alts.map((alt: string, aIdx: number) => (
                          <View key={aIdx} style={styles.altRow}>
                            <Text style={styles.altBullet}>•</Text>
                            <Text style={styles.altText}>{alt}</Text>
                          </View>
                        ))}
                      </View>

                      {/* Official Download link if applicable */}
                      {req?.formDownloadUrl ? (
                        <TouchableOpacity
                          onPress={() => Linking.openURL(req.formDownloadUrl!)}
                          style={styles.downloadFormBtn}
                        >
                          <Text style={styles.downloadFormBtnText}>
                            📥 Download Official Form-V PDF (mahabocw.in) ↗
                          </Text>
                        </TouchableOpacity>
                      ) : null}

                      {/* Source Citation if present */}
                      {(req as any)?.sourceCitation && (
                        <SourceCitationCard citation={(req as any).sourceCitation} />
                      )}

                      {/* Quick Actions */}
                      <View style={styles.quickActionRow}>
                        <TouchableOpacity
                          onPress={() => handleOpenStatusModal(item)}
                          style={styles.quickEditBtn}
                        >
                          <Text style={styles.quickEditBtnText}>✏️ {t('editStatus')}</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Edit Status Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>{t('updateDocumentStatus')}</Text>
            <Text style={styles.modalSub}>
              {selectedItem?.requirement?.title
                ? (selectedItem.requirement.title as any)[language] ||
                  selectedItem.requirement.title.en
                : ''}
            </Text>

            {/* Status Options */}
            <View style={styles.statusOptions}>
              {(['AVAILABLE', 'NEEDS_VERIFICATION', 'ACTION_REQUIRED', 'MISSING'] as DocumentStatus[]).map(
                (st) => {
                  const b = getStatusBadge(st);
                  const isCurrent = selectedItem?.status === st;

                  return (
                    <TouchableOpacity
                      key={st}
                      onPress={() => handleUpdateStatus(st)}
                      style={[
                        styles.statusOptionBtn,
                        isCurrent && { borderColor: b.color, backgroundColor: b.bg },
                      ]}
                    >
                      <View style={[styles.statusDot, { backgroundColor: b.color }]} />
                      <Text
                        style={[
                          styles.statusOptionText,
                          isCurrent && { color: Colors.textPrimary, fontWeight: '700' },
                        ]}
                      >
                        {b.label}
                      </Text>
                      {isCurrent && <Text style={{ color: b.color }}>✓</Text>}
                    </TouchableOpacity>
                  );
                }
              )}
            </View>

            {/* User Notes Input */}
            <Text style={styles.notesInputLabel}>{t('addNotesOptional')}</Text>
            <TextInput
              style={styles.notesInput}
              value={editingNotes}
              onChangeText={setEditingNotes}
              placeholder="उदा. आधार कार्ड झेरॉक्स प्रत तयार आहे, कंत्राटदाराशी बोलणे झाले आहे."
              placeholderTextColor="#64748B"
              multiline
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.modalCancelBtn}
              >
                <Text style={styles.modalCancelBtnText}>{t('cancel')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleUpdateStatus(selectedItem?.status || 'AVAILABLE')}
                style={styles.modalSaveBtn}
              >
                <Text style={styles.modalSaveBtnText}>{t('save')}</Text>
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
    paddingBottom: 110,
  },
  titleSection: {
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  topFormVButton: {
    backgroundColor: 'rgba(255, 107, 44, 0.15)',
    borderWidth: 1,
    borderColor: Colors.constructionOrange,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  topFormVButtonText: {
    color: Colors.constructionOrange,
    fontSize: 12,
    fontWeight: '700',
  },
  syncBannerContainer: {
    marginBottom: 14,
  },
  pendingSyncBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#3B1A05',
    borderWidth: 1,
    borderColor: Colors.constructionOrange,
    borderRadius: 10,
    padding: 10,
  },
  pendingSyncTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FED7AA',
  },
  pendingSyncSub: {
    fontSize: 11,
    color: '#CBD5E1',
    marginTop: 2,
  },
  syncNowBtn: {
    backgroundColor: Colors.constructionOrange,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    marginLeft: 8,
  },
  syncNowBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  offlineBanner: {
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#475569',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  offlineBannerText: {
    fontSize: 11,
    color: '#94A3B8',
    textAlign: 'center',
  },
  syncedBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  syncedBannerText: {
    fontSize: 11,
    color: '#10B981',
    fontWeight: '600',
  },
  syncRefreshLink: {
    fontSize: 11,
    color: Colors.primaryCobalt,
    fontWeight: '600',
  },
  progressHero: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 16,
  },
  progressHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  progressHeroLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  progressHeroSub: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  progressPercentText: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.constructionOrange,
  },
  progressBarTrack: {
    height: 8,
    backgroundColor: Colors.background,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.constructionOrange,
    borderRadius: 4,
  },
  loaderBox: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  loaderText: {
    marginTop: 10,
    color: Colors.textSecondary,
    fontSize: 14,
  },
  itemsList: {
    gap: 12,
  },
  docCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  titleCol: {
    flex: 1,
    marginRight: 10,
  },
  titleBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 4,
  },
  docTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  pendingDotBadge: {
    backgroundColor: '#78350F',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  pendingDotText: {
    fontSize: 9,
    color: '#FEF3C7',
    fontWeight: '700',
  },
  docDesc: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 17,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  formVActionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0F1E36',
    borderWidth: 1,
    borderColor: '#1D3B6F',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  formVActionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#93C5FD',
  },
  formVActionSub: {
    fontSize: 10,
    color: '#CBD5E1',
    marginTop: 2,
    lineHeight: 14,
  },
  formVLaunchBtn: {
    backgroundColor: Colors.primaryCobalt,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  formVLaunchBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  provisionalWarningBox: {
    backgroundColor: 'rgba(234, 179, 8, 0.1)',
    borderRadius: 6,
    padding: 8,
    marginTop: 10,
  },
  provisionalWarningText: {
    fontSize: 11,
    color: '#EAB308',
    lineHeight: 15,
  },
  notesBox: {
    backgroundColor: Colors.background,
    borderRadius: 6,
    padding: 8,
    marginTop: 10,
  },
  notesLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  notesText: {
    fontSize: 12,
    color: Colors.textPrimary,
  },
  expandToggle: {
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  expandToggleText: {
    fontSize: 11,
    color: Colors.primaryCobalt,
    fontWeight: '600',
  },
  expandedContent: {
    marginTop: 10,
  },
  altsHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 6,
  },
  altsList: {
    marginBottom: 10,
  },
  altRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  altBullet: {
    color: Colors.textSecondary,
    marginRight: 6,
    fontSize: 12,
  },
  altText: {
    color: Colors.textSecondary,
    fontSize: 12,
    flex: 1,
    lineHeight: 16,
  },
  downloadFormBtn: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  downloadFormBtnText: {
    fontSize: 11,
    color: Colors.primaryCobalt,
    fontWeight: '600',
  },
  quickActionRow: {
    flexDirection: 'row',
    marginTop: 6,
  },
  quickEditBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  quickEditBtnText: {
    fontSize: 11,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  modalSub: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 16,
  },
  statusOptions: {
    gap: 8,
    marginBottom: 16,
  },
  statusOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  statusOptionText: {
    flex: 1,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  notesInputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  notesInput: {
    backgroundColor: Colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 10,
    fontSize: 13,
    color: Colors.textPrimary,
    height: 60,
    marginBottom: 18,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modalCancelBtnText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  modalSaveBtn: {
    flex: 1,
    backgroundColor: Colors.primaryCobalt,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalSaveBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
