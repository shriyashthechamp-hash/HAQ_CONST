import { describe, it, expect, vi, beforeEach } from 'vitest';

// Initialize globalThis.expo for Node test environment
(globalThis as any).expo = {
  EventEmitter: class EventEmitter {
    addListener() { return { remove: () => {} }; }
    removeListeners() {}
    emit() {}
  },
  modules: {},
};

vi.mock('expo-modules-core', () => ({
  EventEmitter: class EventEmitter {
    addListener() { return { remove: () => {} }; }
    removeListeners() {}
    emit() {}
  },
  NativeModulesProxy: {},
  requireNativeModule: () => ({}),
  requireOptionalNativeModule: () => null,
  Platform: { OS: 'web' },
}));

vi.mock('expo-constants', () => ({
  default: {
    expoConfig: {
      hostUri: 'localhost:8081',
    },
  },
}));

// Mock AsyncStorage in-memory
const mockStorage: Record<string, string> = {};
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(async (key: string) => mockStorage[key] || null),
    setItem: vi.fn(async (key: string, val: string) => {
      mockStorage[key] = val;
    }),
    removeItem: vi.fn(async (key: string) => {
      delete mockStorage[key];
    }),
    clear: vi.fn(async () => {
      Object.keys(mockStorage).forEach((k) => delete mockStorage[k]);
    }),
  },
}));

// Mock expo-print and expo-sharing
vi.mock('expo-print', () => ({
  printAsync: vi.fn(async () => {}),
  printToFileAsync: vi.fn(async () => ({ uri: 'file:///tmp/mock-form-v.pdf' })),
}));

vi.mock('expo-sharing', () => ({
  isAvailableAsync: vi.fn(async () => true),
  shareAsync: vi.fn(async () => {}),
}));

// Mock react-native Platform
vi.mock('react-native', () => ({
  Platform: {
    OS: 'web',
  },
}));

import {
  FormVParams,
  CachedChecklistState,
} from '@haq/shared';
import { FormVGeneratorService } from '../../mobile/src/services/formVGenerator';
import {
  ChecklistOfflineService,
  getDefaultOfflineItems,
} from '../../mobile/src/services/checklistCache';
import { ApiService } from '../../mobile/src/services/api';

describe('HAQ Milestone 2: Offline-First Checklist & Form-V Generator', () => {
  const testSessionId = 'test-session-milestone-2';

  beforeEach(() => {
    Object.keys(mockStorage).forEach((k) => delete mockStorage[k]);
    vi.clearAllMocks();
  });

  /* ========================================================================= */
  /* PHASE 1: OFFLINE-FIRST CHECKLIST TESTS                                    */
  /* ========================================================================= */
  describe('Phase 1: Offline-First Document Checklist', () => {
    it('Starting offline without cache creates default versioned cache immediately', async () => {
      const state = await ChecklistOfflineService.loadCachedChecklist(testSessionId);

      expect(state.schemaVersion).toBe(1);
      expect(state.sessionId).toBe(testSessionId);
      expect(state.items.length).toBe(6);
      expect(state.totalCount).toBe(6);
      expect(state.syncStatus).toBe('OFFLINE');
      expect(state.lastFetchedAt).toBeNull();
      // Verify Form-V requirement item exists
      const form5 = state.items.find((i) => i.requirementId === 'req-90-days-cert');
      expect(form5).toBeDefined();
      expect(form5?.status).toBe('ACTION_REQUIRED');
    });

    it('Starting with an existing local cache reads cached state instantly without network', async () => {
      // Pre-seed mock storage with cached state
      const existingItems = getDefaultOfflineItems(testSessionId);
      existingItems[0].status = 'AVAILABLE';
      existingItems[0].userNotes = 'कंत्राटदाराची सही घेतली';

      const cachedState: CachedChecklistState = {
        schemaVersion: 1,
        sessionId: testSessionId,
        items: existingItems,
        progressPercent: 17,
        availableCount: 1,
        totalCount: 6,
        needsVerificationCount: 2,
        missingCount: 3,
        lastFetchedAt: '2026-10-24T10:00:00.000Z',
        lastSyncedAt: '2026-10-24T10:00:00.000Z',
        pendingUpdates: {},
        syncStatus: 'SYNCED',
        lastError: null,
      };

      mockStorage[`@haq:checklist:v1:${testSessionId}`] = JSON.stringify(cachedState);

      const loaded = await ChecklistOfflineService.loadCachedChecklist(testSessionId);
      expect(loaded.items[0].status).toBe('AVAILABLE');
      expect(loaded.items[0].userNotes).toBe('कंत्राटदाराची सही घेतली');
      expect(loaded.availableCount).toBe(1);
      expect(loaded.progressPercent).toBe(17);
      expect(loaded.syncStatus).toBe('SYNCED');
    });

    it('Updating completion status offline persists locally and queues pending update', async () => {
      // User marks Bank passbook as AVAILABLE while offline
      const updatedState = await ChecklistOfflineService.updateItemLocally(
        testSessionId,
        'item-6',
        'AVAILABLE',
        'बँक ऑफ महाराष्ट्र पासबुक झेरॉक्स तयार आहे'
      );

      expect(updatedState.syncStatus).toBe('PENDING');
      const item6 = updatedState.items.find((i) => i.id === 'item-6');
      expect(item6?.status).toBe('AVAILABLE');
      expect(item6?.userNotes).toBe('बँक ऑफ महाराष्ट्र पासबुक झेरॉक्स तयार आहे');

      // Verify pendingUpdates queue contains the change
      expect(updatedState.pendingUpdates['item-6']).toBeDefined();
      expect(updatedState.pendingUpdates['item-6'].status).toBe('AVAILABLE');
      expect(updatedState.pendingUpdates['item-6'].userNotes).toBe(
        'बँक ऑफ महाराष्ट्र पासबुक झेरॉक्स तयार आहे'
      );

      // Verify reloaded from cache maintains pending state
      const reloaded = await ChecklistOfflineService.loadCachedChecklist(testSessionId);
      expect(reloaded.pendingUpdates['item-6']).toBeDefined();
      expect(reloaded.syncStatus).toBe('PENDING');
    });

    it('Successful synchronization flushes pending updates and updates lastSyncedAt', async () => {
      // Seed pending update
      await ChecklistOfflineService.updateItemLocally(
        testSessionId,
        'item-2',
        'AVAILABLE',
        'Aadhaar verified'
      );

      // Mock ApiService.updateDocumentItem success
      const updateSpy = vi
        .spyOn(ApiService, 'updateDocumentItem')
        .mockResolvedValueOnce({ id: 'item-2', status: 'AVAILABLE' });

      // Mock ApiService.getChecklist success
      const serverItems = getDefaultOfflineItems(testSessionId);
      serverItems[1].status = 'AVAILABLE';
      serverItems[1].userNotes = 'Aadhaar verified';

      const getSpy = vi.spyOn(ApiService, 'getChecklist').mockResolvedValueOnce({
        sessionId: testSessionId,
        items: serverItems,
        progressPercent: 17,
      });

      const syncResult = await ChecklistOfflineService.syncWithServer(testSessionId);

      expect(syncResult.isOffline).toBe(false);
      expect(syncResult.syncedCount).toBe(1);
      expect(syncResult.failedCount).toBe(0);
      expect(Object.keys(syncResult.state.pendingUpdates).length).toBe(0);
      expect(syncResult.state.syncStatus).toBe('SYNCED');
      expect(syncResult.state.lastSyncedAt).not.toBeNull();
      expect(updateSpy).toHaveBeenCalledWith('item-2', testSessionId, 'AVAILABLE', 'Aadhaar verified');
      expect(getSpy).toHaveBeenCalledWith(testSessionId);
    });

    it('Failed network during sync retains pending changes locally for automatic retry', async () => {
      // Seed pending update
      await ChecklistOfflineService.updateItemLocally(
        testSessionId,
        'item-3',
        'AVAILABLE',
        'School LC ready'
      );

      // Mock network failure
      vi.spyOn(ApiService, 'updateDocumentItem').mockRejectedValueOnce(
        new Error('Network request failed')
      );
      vi.spyOn(ApiService, 'getChecklist').mockRejectedValueOnce(
        new Error('Network request failed')
      );

      const syncResult = await ChecklistOfflineService.syncWithServer(testSessionId);

      expect(syncResult.isOffline).toBe(true);
      expect(syncResult.syncedCount).toBe(0);
      expect(syncResult.failedCount).toBe(1);
      // Pending update MUST remain in queue for next retry
      expect(syncResult.state.pendingUpdates['item-3']).toBeDefined();
      expect(syncResult.state.syncStatus).toBe('PENDING');
      expect(syncResult.state.items.find((i) => i.id === 'item-3')?.status).toBe('AVAILABLE');
    });

    it('Repeated synchronization is idempotent without duplicate side effects', async () => {
      vi.spyOn(ApiService, 'updateDocumentItem')
        .mockResolvedValue({ id: 'item-1', status: 'AVAILABLE' });

      vi.spyOn(ApiService, 'getChecklist').mockResolvedValue({
        sessionId: testSessionId,
        items: getDefaultOfflineItems(testSessionId),
        progressPercent: 17,
      });

      await ChecklistOfflineService.updateItemLocally(testSessionId, 'item-1', 'AVAILABLE', 'Done');

      // Sync 1
      const res1 = await ChecklistOfflineService.syncWithServer(testSessionId);
      expect(res1.syncedCount).toBe(1);
      expect(Object.keys(res1.state.pendingUpdates).length).toBe(0);

      // Sync 2 (immediately after)
      const res2 = await ChecklistOfflineService.syncWithServer(testSessionId);
      expect(res2.syncedCount).toBe(0); // No extra calls made
      expect(res2.state.syncStatus).toBe('SYNCED');
    });

    it('Deterministic Conflict Resolution: client un-synced edit takes precedence during merge', async () => {
      // User marked item-4 locally while offline
      await ChecklistOfflineService.updateItemLocally(
        testSessionId,
        'item-4',
        'AVAILABLE',
        'रेशन कार्ड व वीज बिल जोडले'
      );

      // Simulate server having older or differing state (e.g. MISSING)
      const serverItems = getDefaultOfflineItems(testSessionId);
      serverItems[3].status = 'MISSING';

      vi.spyOn(ApiService, 'updateDocumentItem').mockRejectedValueOnce(new Error('500 Error'));
      vi.spyOn(ApiService, 'getChecklist').mockResolvedValueOnce({
        sessionId: testSessionId,
        items: serverItems,
        progressPercent: 0,
      });

      const res = await ChecklistOfflineService.syncWithServer(testSessionId);
      // The local pending change must NOT be clobbered by server's stale MISSING state
      const mergedItem4 = res.state.items.find((i) => i.id === 'item-4');
      expect(mergedItem4?.status).toBe('AVAILABLE');
      expect(mergedItem4?.userNotes).toBe('रेशन कार्ड व वीज बिल जोडले');
    });

    it('Two updates to the same item preserve the latest intended value', async () => {
      // First update
      await ChecklistOfflineService.updateItemLocally(
        testSessionId,
        'item-5',
        'ACTION_REQUIRED',
        'Need to go to photo studio'
      );

      // Second update to the same item
      const latestState = await ChecklistOfflineService.updateItemLocally(
        testSessionId,
        'item-5',
        'AVAILABLE',
        '3 color photos taken and ready'
      );

      const item5 = latestState.items.find((i) => i.id === 'item-5');
      expect(item5?.status).toBe('AVAILABLE');
      expect(item5?.userNotes).toBe('3 color photos taken and ready');
      expect(latestState.pendingUpdates['item-5'].status).toBe('AVAILABLE');
      expect(latestState.pendingUpdates['item-5'].userNotes).toBe('3 color photos taken and ready');
    });

    it('Checklist cache records are strictly scoped to their respective sessionId', async () => {
      const sessionA = 'session-user-aaa';
      const sessionB = 'session-user-bbb';

      await ChecklistOfflineService.updateItemLocally(sessionA, 'item-1', 'AVAILABLE', 'Notes for User A');
      await ChecklistOfflineService.updateItemLocally(sessionB, 'item-1', 'MISSING', 'Notes for User B');

      const cacheA = await ChecklistOfflineService.loadCachedChecklist(sessionA);
      const cacheB = await ChecklistOfflineService.loadCachedChecklist(sessionB);

      expect(cacheA.sessionId).toBe(sessionA);
      expect(cacheB.sessionId).toBe(sessionB);
      expect(cacheA.items.find((i) => i.id === 'item-1')?.userNotes).toBe('Notes for User A');
      expect(cacheB.items.find((i) => i.id === 'item-1')?.userNotes).toBe('Notes for User B');
      expect(cacheA.items.find((i) => i.id === 'item-1')?.status).toBe('AVAILABLE');
      expect(cacheB.items.find((i) => i.id === 'item-1')?.status).toBe('MISSING');
    });
  });

  /* ========================================================================= */
  /* PHASE 2: MARATHI FORM-V GENERATOR TESTS                                   */
  /* ========================================================================= */
  describe('Phase 2: Marathi Form-V Contractor Letter Generator', () => {
    const validParams: FormVParams = {
      documentType: 'FORM_V_CERTIFICATE',
      workerName: 'रमेश मारुती जाधव',
      fatherOrHusbandName: 'मारुती विठ्ठल जाधव',
      age: 34,
      address: 'रूम नं. १२, कात्रज कोंढवा रोड, पुणे - ४११०४६',
      mobileNumber: '९८७६५४३२१०',
      tradeType: 'गवंडी कामगार (Mason)',
      certifierType: 'CONTRACTOR',
      certifierName: 'पाटील इन्फ्रास्ट्रक्चर प्रा. लि.',
      certifierRegistrationNo: 'MH-PUN-CONTR-44910',
      siteNameAndLocation: 'गंगा व्हिलेज रेसिडेन्सी, बाणेर, पुणे',
      workStartDate: '०१/११/२०२३',
      workEndDate: '३१/०८/२०२४',
      daysWorked: 110,
      issueDate: '२४/१०/२०२६',
      issuePlace: 'पुणे (Pune)',
    };

    it('Validates required fields successfully with genuine Marathi parameters', () => {
      const result = FormVGeneratorService.validate(validParams);
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('Rejects missing or invalid information (e.g. days worked < 90 or workerName missing)', () => {
      const invalidParams = {
        ...validParams,
        workerName: 'A', // Too short
        daysWorked: 45,  // Under statutory 90 days
      };

      const result = FormVGeneratorService.validate(invalidParams as any);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('Generates authentic Marathi Unicode HTML with required statutory citations', () => {
      const html = FormVGeneratorService.generateHtml(validParams);

      // Verify Marathi Devanagari content
      expect(html).toContain('महाराष्ट्र इमारत व इतर बांधकाम कामगार कल्याणकारी मंडळ');
      expect(html).toContain('नमुना क्रमांक ५ (फॉर्म-५)');
      expect(html).toContain('९० दिवस काम केल्याचे अधिकृत प्रमाणपत्र');
      expect(html).toContain('रमेश मारुती जाधव');
      expect(html).toContain('पाटील इन्फ्रास्ट्रक्चर प्रा. लि.');
      expect(html).toContain('110 दिवस');

      // Verify Draft watermark & disclaimer (prevents fake government certification)
      expect(html).toContain('अधिकृत स्वाक्षरीसाठी मसुदा / DRAFT FOR OFFICIAL ATTESTATION');
      expect(html).toContain('या पत्रावर अधिकृत कंत्राटदार, ग्रामसेवक किंवा सक्षम प्राधिकाऱ्याची सही व शिक्का असल्याशिवाय');

      // Verify statutory rule reference
      expect(html).toContain('महाराष्ट्र इमारत व इतर बांधकाम कामगार (रोजगार नियमन व सेवाशर्ती) नियम २००७, नियम २८२');
    });

    it('Generates formal Worker Request Letter when documentType is FORM_V_REQUEST_LETTER', () => {
      const requestLetterParams: FormVParams = {
        ...validParams,
        documentType: 'FORM_V_REQUEST_LETTER',
      };

      const html = FormVGeneratorService.generateHtml(requestLetterParams);
      expect(html).toContain('कंत्राटदाराकडे फॉर्म-५ साठी विनंती अर्ज');
      expect(html).toContain('WORKER REQUEST APPLICATION');
      expect(html).toContain('विषय: महाराष्ट्र इमारत व इतर बांधकाम कामगार कल्याणकारी मंडळासाठी');
      expect(html).toContain('आपला नम्र कामगार');
    });

    it('Masks Aadhaar number when provided to preserve user privacy', () => {
      const paramsWithAadhaar: FormVParams = {
        ...validParams,
        aadhaarNumber: '123456789012',
      };

      const html = FormVGeneratorService.generateHtml(paramsWithAadhaar);
      expect(html).toContain('XXXX-XXXX-9012');
      expect(html).not.toContain('123456789012');
    });

    it('Handles long names and addresses without crashing or schema rejection', () => {
      const longParams: FormVParams = {
        ...validParams,
        workerName: 'दत्तात्रय रामचंद्र तुकाराम संभाजीराव गायकवाड-पाटील',
        address:
          'फ्लॅट नंबर ४०२, साई समर्थ रेसिडेन्सी, सर्वे नंबर ४८/३/१, सिंहगड इन्स्टिट्यूट जवळ, आंबेगाव बुद्रुक, हवेली, पुणे, महाराष्ट्र - ४११०४६',
      };

      const result = FormVGeneratorService.validate(longParams);
      expect(result.valid).toBe(true);

      const html = FormVGeneratorService.generateHtml(longParams);
      expect(html).toContain('दत्तात्रय रामचंद्र तुकाराम संभाजीराव गायकवाड-पाटील');
    });

    it('Executes exportOrSharePdf successfully on web platform with print fallback', async () => {
      const result = await FormVGeneratorService.exportOrSharePdf(validParams);
      expect(result.success).toBe(true);
      expect(result.isWeb).toBe(true);
      expect(result.html.length).toBeGreaterThan(100);
    });
  });
});
