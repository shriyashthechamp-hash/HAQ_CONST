import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';

// Mock expo-speech
const mockSpeechState = {
  isSpeaking: false,
  lastSpokenText: '',
  lastSpokenOptions: null as any,
  stopCalled: false,
};

vi.mock('expo-speech', () => ({
  speak: vi.fn((text: string, options?: any) => {
    mockSpeechState.isSpeaking = true;
    mockSpeechState.lastSpokenText = text;
    mockSpeechState.lastSpokenOptions = options;
    if (options?.onStart) options.onStart();
    if (options?.onDone) {
      mockSpeechState.isSpeaking = false;
      options.onDone();
    }
  }),
  stop: vi.fn(async () => {
    mockSpeechState.stopCalled = true;
    mockSpeechState.isSpeaking = false;
  }),
  isSpeakingAsync: vi.fn(async () => mockSpeechState.isSpeaking),
}));

// Mock react-native Platform
vi.mock('react-native', () => ({
  Platform: {
    OS: 'android',
  },
}));

// Mock expo-constants
const { mockConstants } = vi.hoisted(() => ({
  mockConstants: {
    expoConfig: {
      hostUri: '192.168.1.50:8081',
    } as any,
    isDevice: false,
  },
}));

vi.mock('expo-constants', () => ({
  default: mockConstants,
}));

import * as Speech from 'expo-speech';
import { VoiceGuidanceService } from '../../mobile/src/services/voiceGuidance';
import { getApiBaseUrl } from '../../mobile/src/services/api';

describe('HAQ Milestone 4: Android Readiness & Marathi Voice Guidance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSpeechState.isSpeaking = false;
    mockSpeechState.lastSpokenText = '';
    mockSpeechState.lastSpokenOptions = null;
    mockSpeechState.stopCalled = false;
    delete process.env.EXPO_PUBLIC_API_URL;
  });

  /* ========================================================================= */
  /* 1. EAS & ANDROID CONFIGURATION AUDIT                                      */
  /* ========================================================================= */
  describe('1. Android Preview & EAS Configuration', () => {
    it('app.json contains valid Android package identifier and adaptiveIcon', () => {
      const appJsonPath = path.resolve(__dirname, '../../mobile/app.json');
      expect(fs.existsSync(appJsonPath)).toBe(true);

      const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
      expect(appJson.expo.android).toBeDefined();
      expect(appJson.expo.android.package).toBe('com.haq.benefits');
      expect(appJson.expo.android.adaptiveIcon).toBeDefined();
      expect(appJson.expo.android.adaptiveIcon.foregroundImage).toBe('./assets/icon.png');
      expect(appJson.expo.android.adaptiveIcon.backgroundColor).toBe('#070A0F');
      expect(appJson.expo.android.usesCleartextTraffic).toBe(true);
    });

    it('eas.json defines a preview profile that outputs an installable APK with a valid LAN endpoint', () => {
      const easJsonPath = path.resolve(__dirname, '../../mobile/eas.json');
      expect(fs.existsSync(easJsonPath)).toBe(true);

      const easJson = JSON.parse(fs.readFileSync(easJsonPath, 'utf8'));
      expect(easJson.build).toBeDefined();
      expect(easJson.build.preview).toBeDefined();
      expect(easJson.build.preview.android).toBeDefined();
      expect(easJson.build.preview.android.buildType).toBe('apk');
      expect(easJson.build.preview.distribution).toBe('internal');
      expect(easJson.build.preview.env.EXPO_PUBLIC_API_URL).not.toContain('10.0.2.2');
    });

    it('Separates production App Bundle from preview APK in eas.json', () => {
      const easJsonPath = path.resolve(__dirname, '../../mobile/eas.json');
      const easJson = JSON.parse(fs.readFileSync(easJsonPath, 'utf8'));

      expect(easJson.build.production.android.buildType).toBe('app-bundle');
      expect(easJson.build.preview.android.buildType).toBe('apk');
    });
  });

  /* ========================================================================= */
  /* 2. DYNAMIC API RESOLUTION FOR REAL DEVICES & PREVIEW APKS                 */
  /* ========================================================================= */
  describe('2. Dynamic Backend URL Resolution', () => {
    it('Respects EXPO_PUBLIC_API_URL runtime environment variable with highest priority', () => {
      process.env.EXPO_PUBLIC_API_URL = 'https://haq-api.stage.example.com';
      const url = getApiBaseUrl();
      expect(url).toBe('https://haq-api.stage.example.com');
    });

    it('Extracts Metro LAN IP from hostUri when running on a physical development phone', () => {
      delete process.env.EXPO_PUBLIC_API_URL;
      mockConstants.isDevice = true;
      mockConstants.expoConfig = { hostUri: '192.168.1.50:8081' };

      const url = getApiBaseUrl();
      expect(url).toBe('http://192.168.1.50:4000');
    });

    it('Guards against silently falling back to 10.0.2.2 on standalone physical devices', () => {
      delete process.env.EXPO_PUBLIC_API_URL;
      mockConstants.isDevice = true;
      mockConstants.expoConfig = null; // Standalone build without Metro

      const url = getApiBaseUrl();
      expect(url).not.toBe('http://10.0.2.2:4000');
      expect(url).toBe('');
    });
  });

  /* ========================================================================= */
  /* 3. MARATHI VOICE GUIDANCE SERVICE (EXPO-SPEECH)                           */
  /* ========================================================================= */
  describe('3. Marathi Voice Guidance Engine', () => {
    it('Resolves correct locale codes for Marathi, Hindi, and English', () => {
      expect(VoiceGuidanceService.getLocaleForLanguage('mr')).toBe('mr-IN');
      expect(VoiceGuidanceService.getLocaleForLanguage('hi')).toBe('hi-IN');
      expect(VoiceGuidanceService.getLocaleForLanguage('en')).toBe('en-IN');
    });

    it('Generates authentic, short, and natural Marathi voice scripts', () => {
      const eligibleScript = VoiceGuidanceService.getScript('ELIGIBILITY_ELIGIBLE', 'mr');
      expect(eligibleScript).toContain('महाराष्ट्र इमारत व इतर बांधकाम कामगार');
      expect(eligibleScript).toContain('९० दिवस');
      expect(eligibleScript).toContain('पात्र आहात');

      const ineligibleScript = VoiceGuidanceService.getScript('ELIGIBILITY_NOT_ELIGIBLE', 'mr');
      expect(ineligibleScript).toContain('किमान ९० दिवस');
      expect(ineligibleScript).toContain('पात्र नाही');

      const checklistScript = VoiceGuidanceService.getScript('CHECKLIST_NEXT', 'mr');
      expect(checklistScript).toContain('फॉर्म-५');
      expect(checklistScript).toContain('कंत्राटदाराचे ९० दिवस कामाचे प्रमाणपत्र');

      const journeyScript = VoiceGuidanceService.getScript('JOURNEY_STAGE', 'mr');
      expect(journeyScript).toContain('कागदपत्रे गोळा करणे');
      expect(journeyScript).toContain('MAHABOCW पोर्टल');
    });

    it('Immediately stops existing speech before speaking to prevent overlapping audio', async () => {
      const stopSpy = vi.spyOn(Speech, 'stop');

      await VoiceGuidanceService.speak('पहिला संदेश', 'mr');
      expect(stopSpy).toHaveBeenCalled();
      expect(Speech.speak).toHaveBeenCalledWith(
        'पहिला संदेश',
        expect.objectContaining({
          language: 'mr-IN',
          rate: 0.88,
        })
      );

      // Second speech call must trigger stop again before starting new speech
      await VoiceGuidanceService.speak('दुसरा संदेश', 'mr');
      expect(stopSpy).toHaveBeenCalledTimes(2);
      expect(Speech.speak).toHaveBeenLastCalledWith(
        'दुसरा संदेश',
        expect.objectContaining({
          language: 'mr-IN',
        })
      );
    });

    it('Calls onDone callback when speech finishes or stops', async () => {
      const onDone = vi.fn();
      await VoiceGuidanceService.speak('चाचणी संदेश', 'mr', { onDone });

      expect(onDone).toHaveBeenCalled();
    });

    it('Calling VoiceGuidanceService.stop() successfully halts speech', async () => {
      await VoiceGuidanceService.stop();
      expect(Speech.stop).toHaveBeenCalled();
    });

    it('Does not crash or reject if speech engine fails (graceful resilience)', async () => {
      vi.spyOn(Speech, 'speak').mockImplementationOnce(() => {
        throw new Error('TTS Native Engine Unavailable');
      });

      const onError = vi.fn();
      await expect(
        VoiceGuidanceService.speak('चाचणी', 'mr', { onError })
      ).resolves.not.toThrow();

      expect(onError).toHaveBeenCalledWith(expect.any(Error));
    });
  });
});
