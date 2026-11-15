import { describe, it, expect, vi } from 'vitest';
import fs from 'fs';
import path from 'path';

// Mock react-native & storage before importing mobile modules
vi.mock('react-native', () => ({
  Platform: { OS: 'android' },
  NativeModules: {},
  StyleSheet: { create: (s: any) => s },
  Image: {},
  View: {},
  Text: {},
  TouchableOpacity: {},
}));

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(async () => null),
    setItem: vi.fn(async () => {}),
    removeItem: vi.fn(async () => {}),
  },
}));

vi.mock('expo-modules-core', () => {
  class MockEventEmitter {
    addListener() {
      return { remove: vi.fn() };
    }
    removeAllListeners() {}
    emit() {}
  }
  return {
    EventEmitter: MockEventEmitter,
    NativeModulesProxy: {},
    requireNativeModule: vi.fn(() => ({})),
    requireOptionalNativeModule: vi.fn(() => ({})),
  };
});

vi.mock('expo-constants', () => ({
  default: {
    expoConfig: { hostUri: 'localhost:4000' },
    isDevice: false,
  },
}));

// Now safely import mobile sources
import { TRANSLATIONS } from '../../apps/mobile/src/i18n/translations';
import { Colors } from '../../apps/mobile/src/theme/colors';
import { Spacing, Radius, Shadows } from '../../apps/mobile/src/theme/spacing';
import { Typography } from '../../apps/mobile/src/theme/typography';
import { getDefaultOfflineItems } from '../../apps/mobile/src/services/checklistCache';

describe('HAQ 2.0 — Phase 3 Mobile UI Revamp & Screen Verification Tests', () => {
  const mobileRoot = path.resolve(__dirname, '../../mobile');

  describe('1. Brand Identity & Official Logo Integrity', () => {
    it('official HAQ logo exists at apps/mobile/assets/haq-logo.png', () => {
      const logoPath = path.join(mobileRoot, 'assets/haq-logo.png');
      expect(fs.existsSync(logoPath)).toBe(true);

      const stats = fs.statSync(logoPath);
      // Ensure it is the real uncompressed high-resolution asset (1774x887, ~160KB)
      expect(stats.size).toBeGreaterThan(50000);
    });

    it('branding strictly adheres to HAQ without "2.0" in customer-facing titles', () => {
      expect(TRANSLATIONS.mr.appName).toBe('HAQ');
      expect(TRANSLATIONS.hi.appName).toBe('HAQ');
      expect(TRANSLATIONS.en.appName).toBe('HAQ');

      // Tagline tests
      expect(TRANSLATIONS.mr.tagline).toContain('आपला हक्क');
      expect(TRANSLATIONS.mr.tagline).not.toContain('2.0');
      expect(TRANSLATIONS.en.tagline).not.toContain('2.0');
    });
  });

  describe('2. Modern Premium Design Tokens & Accessibility', () => {
    it('palette includes all mandatory brand colors', () => {
      expect(Colors.midnightNavy).toBe('#101A3A');
      expect(Colors.primary).toBe('#101A3A');
      expect(Colors.warmIvory).toBe('#FAF8F3');
      expect(Colors.background).toBe('#FAF8F3');
      expect(Colors.saffronOrange).toBe('#F59A23');
      expect(Colors.accent).toBe('#F59A23');
      expect(Colors.mutedSlate).toBe('#687386');
      expect(Colors.secondary).toBe('#687386');
      expect(Colors.pureWhite).toBe('#FFFFFF');
      expect(Colors.surface).toBe('#FFFFFF');
      expect(Colors.softGrey).toBe('#E9E5DC');
      expect(Colors.border).toBe('#E9E5DC');
    });

    it('spacing enforces minimum 48px touch targets for accessibility', () => {
      expect(Spacing.touchTargetMin).toBeGreaterThanOrEqual(48);
    });

    it('typography provides ample line height for Devanagari scripts', () => {
      expect(Typography.bodyLarge.lineHeight).toBeGreaterThan(Typography.bodyLarge.fontSize);
      expect(Typography.bodyRegular.lineHeight).toBeGreaterThan(Typography.bodyRegular.fontSize);
      expect(Typography.displayHero.lineHeight).toBeGreaterThan(Typography.displayHero.fontSize);
      expect(Typography.screenTitle.lineHeight).toBeGreaterThan(Typography.screenTitle.fontSize);
    });

    it('elevation shadows are defined for card surfaces', () => {
      expect(Shadows.card).toBeDefined();
      expect(Shadows.elevated).toBeDefined();
      expect(Shadows.card.elevation).toBe(2);
    });
  });

  describe('3. Trilingual Localization Parity (Marathi, Hindi, English)', () => {
    it('every translation key in English exists in Marathi and Hindi', () => {
      const enKeys = Object.keys(TRANSLATIONS.en);
      const mrKeys = new Set(Object.keys(TRANSLATIONS.mr));
      const hiKeys = new Set(Object.keys(TRANSLATIONS.hi));

      const missingMr = enKeys.filter((k) => !mrKeys.has(k));
      const missingHi = enKeys.filter((k) => !hiKeys.has(k));

      expect(missingMr).toEqual([]);
      expect(missingHi).toEqual([]);
    });

    it('core dashboard keys are present across all languages', () => {
      const dashboardKeys = [
        'dashboardVoicePrompt',
        'dashboardVoiceSubtitle',
        'quickActions',
        'activeSchemes',
        'schemeNondaniTitle',
        'schemeAwasTitle',
        'schemeShikshanTitle',
        'formVNavTitle',
        'recentStatus',
      ];

      for (const lang of ['mr', 'hi', 'en'] as const) {
        for (const key of dashboardKeys) {
          expect(TRANSLATIONS[lang][key]).toBeDefined();
          expect(TRANSLATIONS[lang][key].length).toBeGreaterThan(0);
        }
      }
    });
  });

  describe('4. Screen Layout & Navigation Invariants', () => {
    it('bottom navigation file defines all 5 primary app routes', () => {
      const bottomNavPath = path.join(mobileRoot, 'src/components/BottomNav.tsx');
      const content = fs.readFileSync(bottomNavPath, 'utf8');

      expect(content).toContain("route: '/'");
      expect(content).toContain("route: '/eligibility'");
      expect(content).toContain("route: '/assistant'");
      expect(content).toContain("route: '/documents'");
      expect(content).toContain("route: '/journey'");
    });

    it('root layout applies warm ivory background and dark status bar', () => {
      const layoutPath = path.join(mobileRoot, 'app/_layout.tsx');
      const content = fs.readFileSync(layoutPath, 'utf8');

      expect(content).toContain('AppProvider');
      expect(content).toContain('StatusBar');
      expect(content).toContain('Colors.background');
    });

    it('home dashboard imports and uses real SchemeCard and HeaderBar', () => {
      const indexPath = path.join(mobileRoot, 'app/index.tsx');
      const content = fs.readFileSync(indexPath, 'utf8');

      expect(content).toContain('HeaderBar');
      expect(content).toContain('BottomNav');
      expect(content).toContain('SchemeCard');
      expect(content).toContain('ChecklistOfflineService');
      expect(content).toContain('/assistant');
      expect(content).toContain('/eligibility');
      expect(content).toContain('/documents');
      expect(content).toContain('/form-v');
      expect(content).toContain('/journey');
    });

    it('eligibility assessment incorporates 4 steps and deterministic evaluation', () => {
      const elPath = path.join(mobileRoot, 'app/eligibility.tsx');
      const content = fs.readFileSync(elPath, 'utf8');

      expect(content).toContain('totalSteps = 4');
      expect(content).toContain('ApiService.assessEligibility');
      expect(content).toContain('PRELIMINARY_SATISFIED');
      expect(content).toContain('SourceCitationCard');
      expect(content).toContain('VoiceGuidanceButton');
    });

    it('document checklist provides offline caching, filters and modal editing', () => {
      const docPath = path.join(mobileRoot, 'app/documents.tsx');
      const content = fs.readFileSync(docPath, 'utf8');

      expect(content).toContain('ChecklistOfflineService.loadCachedChecklist');
      expect(content).toContain('DocumentRow');
      expect(content).toContain('handleOpenStatusModal');
      expect(content).toContain('/form-v');
    });

    it('journey screen enforces anti-fraud gating on SUBMITTED stage', () => {
      const journeyPath = path.join(mobileRoot, 'app/journey.tsx');
      const content = fs.readFileSync(journeyPath, 'utf8');

      expect(content).toContain('evidenceModalVisible');
      expect(content).toContain('handleSubmitEvidence');
      expect(content).toContain('evidenceRef.trim().length < 4');
      expect(content).toContain('TaskCard');
      expect(content).toContain('ApiService.recordJourneyEvent');
    });

    it('Form-V generator supports both official certificate and worker request letter', () => {
      const formVPath = path.join(mobileRoot, 'app/form-v.tsx');
      const content = fs.readFileSync(formVPath, 'utf8');

      expect(content).toContain('FORM_V_CERTIFICATE');
      expect(content).toContain('FORM_V_REQUEST_LETTER');
      expect(content).toContain('FormVGeneratorService.exportOrSharePdf');
      expect(content).toContain('Clipboard.setStringAsync');
    });
  });

  describe('5. Offline Resilience & Initial State Data', () => {
    it('default offline checklist supplies all mandatory BOCW documents', () => {
      const items = getDefaultOfflineItems('test-session');
      expect(items.length).toBeGreaterThanOrEqual(5);

      const keys = items.map((i) => i.requirement?.documentKey);
      expect(keys).toContain('DOC_90_DAYS_CERT');
      expect(keys).toContain('DOC_IDENTITY_PROOF');
      expect(keys).toContain('DOC_AGE_PROOF');
      expect(keys).toContain('DOC_RESIDENCE_PROOF');
      expect(keys).toContain('DOC_BANK_PASSBOOK');
      expect(keys).toContain('DOC_PASSPORT_PHOTOS');
    });
  });
});
