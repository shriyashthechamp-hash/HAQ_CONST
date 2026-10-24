import * as Speech from 'expo-speech';
import { Platform } from 'react-native';
import { Language } from '@haq/shared';

export interface VoiceState {
  isSpeaking: boolean;
  supported: boolean;
  currentLanguage: string;
}

export class VoiceGuidanceService {
  private static activeOnDone: (() => void) | null = null;

  /**
   * Resolve locale code from HAQ Language enum.
   */
  static getLocaleForLanguage(lang: Language): string {
    switch (lang) {
      case 'mr':
        return 'mr-IN';
      case 'hi':
        return 'hi-IN';
      case 'en':
      default:
        return 'en-IN';
    }
  }

  /**
   * Stop any currently ongoing speech immediately.
   */
  static async stop(): Promise<void> {
    try {
      if (Speech && typeof Speech.stop === 'function') {
        await Speech.stop();
      }
      if (this.activeOnDone) {
        this.activeOnDone();
        this.activeOnDone = null;
      }
    } catch (err) {
      console.warn('[VoiceGuidance] stop error:', err);
    }
  }

  /**
   * Check if speech is currently playing.
   */
  static async isSpeaking(): Promise<boolean> {
    try {
      if (Speech && typeof Speech.isSpeakingAsync === 'function') {
        return await Speech.isSpeakingAsync();
      }
      return false;
    } catch {
      return false;
    }
  }

  /**
   * Check if speech synthesis is available on the current platform/device.
   */
  static async isAvailable(): Promise<boolean> {
    if (Platform.OS === 'web') {
      return typeof window !== 'undefined' && 'speechSynthesis' in window;
    }
    return Boolean(Speech && typeof Speech.speak === 'function');
  }

  /**
   * Speak user-initiated guidance. Stops previous speech to prevent overlapping.
   */
  static async speak(
    text: string,
    lang: Language,
    callbacks?: {
      onStart?: () => void;
      onDone?: () => void;
      onError?: (error: any) => void;
    }
  ): Promise<void> {
    try {
      // 1. Immediately stop any active speech to prevent overlap
      await this.stop();

      const locale = this.getLocaleForLanguage(lang);

      this.activeOnDone = callbacks?.onDone || null;

      Speech.speak(text, {
        language: locale,
        pitch: 1.0,
        rate: 0.88, // Slightly relaxed pace for accessible Marathi/Hindi comprehension
        onStart: () => {
          if (callbacks?.onStart) callbacks.onStart();
        },
        onDone: () => {
          this.activeOnDone = null;
          if (callbacks?.onDone) callbacks.onDone();
        },
        onStopped: () => {
          this.activeOnDone = null;
          if (callbacks?.onDone) callbacks.onDone();
        },
        onError: (err) => {
          this.activeOnDone = null;
          console.warn('[VoiceGuidance] Speak error:', err);
          if (callbacks?.onError) callbacks.onError(err);
        },
      });
    } catch (err: any) {
      this.activeOnDone = null;
      console.warn('[VoiceGuidance] Speak failed to initiate:', err?.message || err);
      if (callbacks?.onError) callbacks.onError(err);
    }
  }

  /**
   * Concise, natural Marathi/Hindi/English voice scripts for each stage.
   */
  static getScript(
    key: 'ELIGIBILITY_ELIGIBLE' | 'ELIGIBILITY_NOT_ELIGIBLE' | 'CHECKLIST_NEXT' | 'JOURNEY_STAGE',
    lang: Language,
    extra?: { name?: string; stage?: string }
  ): string {
    switch (key) {
      case 'ELIGIBILITY_ELIGIBLE':
        if (lang === 'mr') {
          return 'अभिनंदन! तुम्ही महाराष्ट्र इमारत व इतर बांधकाम कामगार मंडळासाठी पात्र आहात. मागील १२ महिन्यांत ९० दिवस काम केल्यामुळे तुम्हाला नोंदणी करता येईल. आता कागदपत्रे तपासा.';
        } else if (lang === 'hi') {
          return 'बधाई हो! आप महाराष्ट्र भवन एवं अन्य निर्माण श्रमिक कल्याण बोर्ड के लिए पात्र हैं। पिछले १२ महीनों में ९० दिन कार्य करने के आधार पर आप पंजीकरण करा सकते हैं।';
        } else {
          return 'Congratulations! You are eligible for the Maharashtra Building and Construction Workers Board based on completing 90 days of work in the past 12 months.';
        }

      case 'ELIGIBILITY_NOT_ELIGIBLE':
        if (lang === 'mr') {
          return 'सध्या तुम्ही या योजनेसाठी पात्र नाही. नियमानुसार मागील १२ महिन्यांत किमान ९० दिवस बांधकाम काम पूर्ण असणे अनिवार्य आहे. ९० दिवस पूर्ण झाल्यावर पुन्हा अर्ज करा.';
        } else if (lang === 'hi') {
          return 'वर्तमान में आप इस योजना के लिए पात्र नहीं हैं। नियमानुसार पिछले १२ महीनों में कम से कम ९० दिन निर्माण कार्य पूरा होना अनिवार्य है।';
        } else {
          return 'Currently you do not meet the requirement. Minimum 90 days of construction work within the past 12 months is mandatory under Rule 282.';
        }

      case 'CHECKLIST_NEXT':
        if (lang === 'mr') {
          return 'नोंदणीसाठी सर्वात आवश्यक कागदपत्र म्हणजे कंत्राटदाराचे ९० दिवस कामाचे प्रमाणपत्र, म्हणजेच फॉर्म-५. हा फॉर्म तयार करण्यासाठी वरील फॉर्म-५ बटणावर क्लिक करा.';
        } else if (lang === 'hi') {
          return 'पंजीकरण के लिए सबसे महत्वपूर्ण दस्तावेज ठेकेदार का ९० दिन कार्य प्रमाण पत्र, यानी फॉर्म-५ है। इसे तैयार करने के लिए ऊपर दिए गए फॉर्म-५ बटन पर क्लिक करें।';
        } else {
          return 'The most critical document for registration is the 90-day contractor work certificate, known as Form-V. Click the Form-V button above to prepare it.';
        }

      case 'JOURNEY_STAGE':
        if (lang === 'mr') {
          return 'तुमची सध्याची पायरी कागदपत्रे गोळा करणे ही आहे. सर्व कागदपत्रे पूर्ण झाल्यावरच अधिकृत MAHABOCW पोर्टल किंवा आपले सरकार केंद्रावर जाऊन अर्ज सादर करा.';
        } else if (lang === 'hi') {
          return 'आपका वर्तमान चरण दस्तावेज एकत्र करना है। सभी दस्तावेज तैयार होने के बाद ही आधिकारिक MAHABOCW पोर्टल या आपले सरकार केंद्र पर आवेदन जमा करें।';
        } else {
          return 'Your current stage is document preparation. Once all documents are ready, submit your verified application through the official portal or Aaple Sarkar centre.';
        }

      default:
        return '';
    }
  }
}
