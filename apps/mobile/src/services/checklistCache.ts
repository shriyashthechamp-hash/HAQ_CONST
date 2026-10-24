import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  CachedChecklistState,
  DocumentChecklistItem,
  DocumentStatus,
} from '@haq/shared';
import { ApiService } from './api';

const CACHE_SCHEMA_VERSION = 1;
const CACHE_KEY_PREFIX = '@haq:checklist:v1:';

export const getDefaultOfflineItems = (sessionId: string): DocumentChecklistItem[] => [
  {
    id: 'item-1',
    sessionId,
    requirementId: 'req-90-days-cert',
    status: 'ACTION_REQUIRED',
    userNotes: '',
    updatedAt: new Date().toISOString(),
    requirement: {
      id: 'req-90-days-cert',
      benefitType: 'MAHABOCW_REGISTRATION',
      documentKey: 'DOC_90_DAYS_CERT',
      title: {
        en: '90-Day Work Certificate (Form-V)',
        mr: '९० दिवस कामाचे प्रमाणपत्र (फॉर्म-५)',
        hi: '९० दिन कार्य प्रमाणपत्र (फॉर्म-५)',
      },
      description: {
        en: 'Proof that you worked at least 90 days in construction in the last 12 months. Signed by contractor, Gramsevak, or Municipal Officer.',
        mr: 'मागील १२ महिन्यांत बांधकाम क्षेत्रात किमान ९० दिवस काम केल्याचा पुरावा. कंत्राटदार, ग्रामसेवक किंवा पालिका अधिकाऱ्यांची स्वाक्षरी.',
        hi: 'पिछले १२ महीनों में निर्माण कार्य में कम से कम ९० दिन कार्य करने का प्रमाण। ठेकेदार या ग्रामसेवक के हस्ताक्षर।',
      },
      ruleVersion: 'v2024.1',
      sourceId: 'MAHABOCW-SRC-FORM-05',
      reviewStatus: 'REVIEWED',
      acceptedAlternatives: {
        en: [
          'Contractor Form-V on Letterhead',
          'Gramsevak / Gram Panchayat Certificate (Rural)',
          'Municipal Ward Officer Certificate (Urban/Pune)',
          'Registered Construction Trade Union Certificate',
        ],
        mr: [
          'कंत्राटदाराच्या लेटरहेडवर फॉर्म-५ प्रमाणपत्र',
          'ग्रामसेवक / ग्रामपंचायत प्रमाणपत्र (ग्रामीण भाग)',
          'महानगरपालिका वॉर्ड अधिकारी प्रमाणपत्र (पुणे/नागरी)',
          'नोंदणीकृत बांधकाम कामगार संघटना प्रमाणपत्र',
        ],
        hi: [
          'ठेकेदार के लेटरहेड पर फॉर्म-५ प्रमाण',
          'ग्रामसेवक प्रमाण पत्र (ग्रामीण)',
          'नगर निगम वार्ड अधिकारी प्रमाण (शहरी)',
          'पंजीकृत श्रमिक यूनियन प्रमाण पत्र',
        ],
      },
      formDownloadUrl: 'https://mahabocw.in/en/download/',
    },
  },
  {
    id: 'item-2',
    sessionId,
    requirementId: 'req-identity-proof',
    status: 'NEEDS_VERIFICATION',
    userNotes: '',
    updatedAt: new Date().toISOString(),
    requirement: {
      id: 'req-identity-proof',
      benefitType: 'MAHABOCW_REGISTRATION',
      documentKey: 'DOC_IDENTITY_PROOF',
      title: {
        en: 'Official Identity Proof',
        mr: 'अधिकृत ओळख पुरावा (Aadhaar / Voter ID)',
        hi: 'आधिकारिक पहचान प्रमाण',
      },
      description: {
        en: 'Government-issued photo identification verifying your legal identity.',
        mr: 'आपले नाव आणि ओळख प्रमाणित करणारा सरकारी फोटो ओळख पुरावा.',
        hi: 'सरकारी फोटो पहचान पत्र।',
      },
      ruleVersion: 'v2024.1',
      sourceId: 'MAHABOCW-SRC-REG-01',
      reviewStatus: 'REVIEWED',
      acceptedAlternatives: {
        en: ['Aadhaar Card', 'Voter ID (Election Card)', 'PAN Card', 'Driving Licence'],
        mr: ['आधार कार्ड', 'मतदान ओळखपत्र', 'पॅन कार्ड', 'वाहन परवाना'],
        hi: ['आधार कार्ड', 'मतदाता पहचान पत्र', 'पैन कार्ड', 'ड्राइविंग लाइसेंस'],
      },
    },
  },
  {
    id: 'item-3',
    sessionId,
    requirementId: 'req-age-proof',
    status: 'NEEDS_VERIFICATION',
    userNotes: '',
    updatedAt: new Date().toISOString(),
    requirement: {
      id: 'req-age-proof',
      benefitType: 'MAHABOCW_REGISTRATION',
      documentKey: 'DOC_AGE_PROOF',
      title: {
        en: 'Age Proof (18 to 60 Years)',
        mr: 'वयाचा पुरावा (१८ ते ६० वर्षे)',
        hi: 'आयु प्रमाण पत्र (१८ से ६० वर्ष)',
      },
      description: {
        en: 'Document verifying your age is strictly between 18 and 60 years.',
        mr: 'वय १८ ते ६० वर्षे दरम्यान असल्याचा अधिकृत दाखला.',
        hi: 'आयु १८ से ६० वर्ष के बीच होने का प्रमाण।',
      },
      ruleVersion: 'v2024.1',
      sourceId: 'MAHABOCW-SRC-REG-01',
      reviewStatus: 'REVIEWED',
      acceptedAlternatives: {
        en: ['School Leaving Certificate (LC)', 'Birth Certificate', 'Aadhaar with Full DOB', 'Govt Hospital Age Certificate'],
        mr: ['शाळा सोडल्याचा दाखला (TC/LC)', 'जन्म दाखला', 'आधार कार्ड (पूर्ण जन्मतारीख)', 'सरकारी रुग्णालय वय दाखला'],
        hi: ['स्कूल टीसी', 'जन्म प्रमाण पत्र', 'आधार कार्ड', 'सरकारी अस्पताल प्रमाण'],
      },
    },
  },
  {
    id: 'item-4',
    sessionId,
    requirementId: 'req-residence-proof',
    status: 'MISSING',
    userNotes: '',
    updatedAt: new Date().toISOString(),
    requirement: {
      id: 'req-residence-proof',
      benefitType: 'MAHABOCW_REGISTRATION',
      documentKey: 'DOC_RESIDENCE_PROOF',
      title: {
        en: 'Maharashtra Residence Proof',
        mr: 'महाराष्ट्रातील वास्तव्याचा पुरावा',
        hi: 'महाराष्ट्र में निवास का प्रमाण',
      },
      description: {
        en: 'Address proof showing your stay or work in Pune/Maharashtra.',
        mr: 'पुणे किंवा महाराष्ट्रातील सध्याच्या वास्तव्याचा पत्ता दाखवणारा पुरावा.',
        hi: 'पुणे या महाराष्ट्र में वर्तमान निवास का पता प्रमाण।',
      },
      ruleVersion: 'v2024.1',
      sourceId: 'MAHABOCW-SRC-PORTAL-01',
      reviewStatus: 'PROVISIONAL',
      acceptedAlternatives: {
        en: ['Ration Card', 'Electricity Bill (Recent)', 'Voter Card Address', 'Rental Agreement with Police NOC'],
        mr: ['रेशन कार्ड', 'वीज बिल', 'मतदान कार्ड पत्ता', 'भाडे करारनामा व पोलीस पडताळणी'],
        hi: ['राशन कार्ड', 'बिजली बिल', 'मतदाता पत्र पता', 'किराया अनुबंध'],
      },
    },
  },
  {
    id: 'item-5',
    sessionId,
    requirementId: 'req-passport-photos',
    status: 'MISSING',
    userNotes: '',
    updatedAt: new Date().toISOString(),
    requirement: {
      id: 'req-passport-photos',
      benefitType: 'MAHABOCW_REGISTRATION',
      documentKey: 'DOC_PASSPORT_PHOTOS',
      title: {
        en: '3 Passport Size Photographs',
        mr: '३ पासपोर्ट साईझ फोटो',
        hi: '३ पासपोर्ट साइज फोटो',
      },
      description: {
        en: 'Recent passport-sized color photos for the BOCW smart identity card.',
        mr: 'कामगार स्मार्ट ओळखपत्रासाठी अलिकडील पासपोर्ट फोटो.',
        hi: 'श्रमिक स्मार्ट पहचान पत्र हेतु रंगीन पासपोर्ट फोटो।',
      },
      ruleVersion: 'v2024.1',
      sourceId: 'MAHABOCW-SRC-REG-01',
      reviewStatus: 'REVIEWED',
      acceptedAlternatives: {
        en: ['3 Color passport photos (clear face, plain background)'],
        mr: ['३ रंगीन पासपोर्ट फोटो (स्पष्ट चेहरा)'],
        hi: ['३ रंगीन पासपोर्ट फोटो'],
      },
    },
  },
  {
    id: 'item-6',
    sessionId,
    requirementId: 'req-bank-passbook',
    status: 'MISSING',
    userNotes: '',
    updatedAt: new Date().toISOString(),
    requirement: {
      id: 'req-bank-passbook',
      benefitType: 'MAHABOCW_REGISTRATION',
      documentKey: 'DOC_BANK_PASSBOOK',
      title: {
        en: 'Bank Passbook Copy (for DBT Benefits)',
        mr: 'बँक पासबुक प्रत (थेट लाभासाठी)',
        hi: 'बैंक पासबुक प्रति (डीबीटी लाभ हेतु)',
      },
      description: {
        en: 'Bank account passbook copy with clear Account Number and IFSC Code for direct financial transfers.',
        mr: 'खाते क्रमांक व IFSC कोड स्पष्ट दिसणारी बँक पासबुक प्रत.',
        hi: 'खाता संख्या और IFSC कोड वाली बैंक पासबुक प्रति।',
      },
      ruleVersion: 'v2024.1',
      sourceId: 'MAHABOCW-SRC-PORTAL-01',
      reviewStatus: 'PROVISIONAL',
      acceptedAlternatives: {
        en: ['Bank Passbook first page', 'Cancelled Cheque leaf with printed name', 'Official Bank Statement with stamp'],
        mr: ['बँक पासबुकचे पहिले पान', 'नावासह कॅन्सल्ड चेक', 'बँक स्टेटमेंट'],
        hi: ['बैंक पासबुक का पहला पृष्ठ', 'कैंसिल्ड चेक', 'बैंक स्टेटमेंट'],
      },
    },
  },
];

export const calculateChecklistCounts = (items: DocumentChecklistItem[]) => {
  const totalCount = items.length;
  const availableCount = items.filter((i) => i.status === 'AVAILABLE').length;
  const needsVerificationCount = items.filter((i) => i.status === 'NEEDS_VERIFICATION').length;
  const missingCount = items.filter(
    (i) => i.status === 'MISSING' || i.status === 'ACTION_REQUIRED'
  ).length;
  const progressPercent = totalCount > 0 ? Math.round((availableCount / totalCount) * 100) : 0;

  return {
    totalCount,
    availableCount,
    needsVerificationCount,
    missingCount,
    progressPercent,
  };
};

export class ChecklistOfflineService {
  private static getCacheKey(sessionId: string): string {
    return `${CACHE_KEY_PREFIX}${sessionId}`;
  }

  /**
   * Returns a complete default state for a session.
   */
  static createInitialState(sessionId: string): CachedChecklistState {
    const items = getDefaultOfflineItems(sessionId);
    const counts = calculateChecklistCounts(items);

    return {
      schemaVersion: CACHE_SCHEMA_VERSION,
      sessionId,
      items,
      ...counts,
      lastFetchedAt: null,
      lastSyncedAt: null,
      pendingUpdates: {},
      syncStatus: 'OFFLINE',
      lastError: null,
    };
  }

  /**
   * Load the checklist immediately from local AsyncStorage.
   */
  static async loadCachedChecklist(sessionId: string): Promise<CachedChecklistState> {
    try {
      const key = this.getCacheKey(sessionId);
      const raw = await AsyncStorage.getItem(key);

      if (!raw) {
        const initial = this.createInitialState(sessionId);
        await this.saveCache(sessionId, initial);
        return initial;
      }

      const parsed: CachedChecklistState = JSON.parse(raw);

      // Validate schema version
      if (parsed.schemaVersion !== CACHE_SCHEMA_VERSION || !Array.isArray(parsed.items)) {
        const reset = this.createInitialState(sessionId);
        await this.saveCache(sessionId, reset);
        return reset;
      }

      // Re-calculate counts to maintain integrity
      const counts = calculateChecklistCounts(parsed.items);
      const hasPending = Object.keys(parsed.pendingUpdates || {}).length > 0;

      return {
        ...parsed,
        ...counts,
        syncStatus: hasPending ? 'PENDING' : parsed.syncStatus || 'SYNCED',
      };
    } catch (err: any) {
      console.warn('[ChecklistCache] Failed to load local cache:', err?.message || err);
      return this.createInitialState(sessionId);
    }
  }

  /**
   * Save checklist state to AsyncStorage.
   */
  static async saveCache(sessionId: string, state: CachedChecklistState): Promise<void> {
    try {
      const key = this.getCacheKey(sessionId);
      await AsyncStorage.setItem(key, JSON.stringify(state));
    } catch (err: any) {
      console.error('[ChecklistCache] Failed to persist cache:', err?.message || err);
    }
  }

  /**
   * Local-first update: Immediately updates the local document status/notes,
   * recalculates progress, queues a pending sync record, and returns the updated state.
   */
  static async updateItemLocally(
    sessionId: string,
    itemId: string,
    status: DocumentStatus,
    userNotes?: string
  ): Promise<CachedChecklistState> {
    const current = await this.loadCachedChecklist(sessionId);
    const now = new Date().toISOString();

    const updatedItems = current.items.map((item) => {
      if (item.id === itemId || item.requirementId === itemId) {
        return {
          ...item,
          status,
          userNotes: userNotes !== undefined ? userNotes : item.userNotes,
          updatedAt: now,
        };
      }
      return item;
    });

    const counts = calculateChecklistCounts(updatedItems);
    const itemTarget = current.items.find(
      (i) => i.id === itemId || i.requirementId === itemId
    );
    const resolvedId = itemTarget?.id || itemId;

    const pendingUpdates = {
      ...(current.pendingUpdates || {}),
      [resolvedId]: {
        status,
        userNotes: userNotes !== undefined ? userNotes : itemTarget?.userNotes || '',
        clientUpdatedAt: now,
      },
    };

    const newState: CachedChecklistState = {
      ...current,
      items: updatedItems,
      ...counts,
      pendingUpdates,
      syncStatus: 'PENDING',
      lastError: null,
    };

    await this.saveCache(sessionId, newState);
    return newState;
  }

  /**
   * Synchronize pending updates with backend API and refresh server snapshot.
   * Deterministic Conflict Resolution:
   * 1. Push pending local updates to the server.
   * 2. If network fails, retain pending changes locally without data loss.
   * 3. Fetch latest server checklist snapshot.
   * 4. Merge: Local pending updates take precedence for conflicting items until confirmed by server.
   */
  static async syncWithServer(sessionId: string): Promise<{
    state: CachedChecklistState;
    syncedCount: number;
    failedCount: number;
    isOffline: boolean;
    error?: string;
  }> {
    const current = await this.loadCachedChecklist(sessionId);
    const pendingEntries = Object.entries(current.pendingUpdates || {});
    let syncedCount = 0;
    let failedCount = 0;
    const successfullySyncedIds: string[] = [];
    const remainingPending: CachedChecklistState['pendingUpdates'] = {
      ...current.pendingUpdates,
    };

    // 1. Flush pending local updates
    for (const [itemId, update] of pendingEntries) {
      try {
        await ApiService.updateDocumentItem(
          itemId,
          sessionId,
          update.status,
          update.userNotes
        );
        delete remainingPending[itemId];
        successfullySyncedIds.push(itemId);
        syncedCount++;
      } catch (err: any) {
        // If forbidden (403), item belongs to another session or cannot be edited
        if (err?.message?.includes('403') || err?.message?.includes('Forbidden')) {
          delete remainingPending[itemId]; // discard invalid cross-session
        }
        failedCount++;
      }
    }

    // 2. Fetch latest server checklist
    try {
      const serverData = await ApiService.getChecklist(sessionId);

      if (serverData && Array.isArray(serverData.items)) {
        const serverItems: DocumentChecklistItem[] = serverData.items;

        // Merge server snapshot with any unresolved pending local updates
        const mergedItems = serverItems.map((sItem) => {
          const pending = remainingPending[sItem.id] || remainingPending[sItem.requirementId];
          if (pending) {
            // Client un-synced edit takes priority
            return {
              ...sItem,
              status: pending.status,
              userNotes: pending.userNotes,
              updatedAt: pending.clientUpdatedAt,
            };
          }
          return sItem;
        });

        // Reconcile with latest cache to ensure concurrent local edits while sync was in-flight are preserved
        const freshCache = await this.loadCachedChecklist(sessionId);
        const finalPending: CachedChecklistState['pendingUpdates'] = {
          ...freshCache.pendingUpdates,
        };

        for (const syncedId of successfullySyncedIds) {
          if (
            finalPending[syncedId]?.clientUpdatedAt ===
            current.pendingUpdates[syncedId]?.clientUpdatedAt
          ) {
            delete finalPending[syncedId];
          }
        }

        const counts = calculateChecklistCounts(mergedItems);
        const hasRemainingPending = Object.keys(finalPending).length > 0;
        const now = new Date().toISOString();

        const newState: CachedChecklistState = {
          schemaVersion: CACHE_SCHEMA_VERSION,
          sessionId,
          items: mergedItems,
          ...counts,
          lastFetchedAt: now,
          lastSyncedAt: syncedCount > 0 || !hasRemainingPending ? now : current.lastSyncedAt,
          pendingUpdates: finalPending,
          syncStatus: hasRemainingPending ? 'PENDING' : 'SYNCED',
          lastError: null,
        };

        await this.saveCache(sessionId, newState);
        return {
          state: newState,
          syncedCount,
          failedCount,
          isOffline: false,
        };
      }
    } catch (netErr: any) {
      // Network unreachable or server offline
      const hasPending = Object.keys(remainingPending).length > 0;
      const offlineState: CachedChecklistState = {
        ...current,
        pendingUpdates: remainingPending,
        syncStatus: hasPending ? 'PENDING' : 'OFFLINE',
        lastError: 'नेटवर्क अनुपलब्ध आहे. बदल स्थानिक पातळीवर जतन केले आहेत.',
      };

      await this.saveCache(sessionId, offlineState);
      return {
        state: offlineState,
        syncedCount,
        failedCount,
        isOffline: true,
        error: netErr?.message || 'Network unreachable',
      };
    }

    return {
      state: current,
      syncedCount,
      failedCount,
      isOffline: false,
    };
  }

  /**
   * Clear cache for testing or session reset.
   */
  static async clearCache(sessionId: string): Promise<void> {
    await AsyncStorage.removeItem(this.getCacheKey(sessionId));
  }
}
