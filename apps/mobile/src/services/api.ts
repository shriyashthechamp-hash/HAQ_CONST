import { Platform } from 'react-native';
import Constants from 'expo-constants';
import {
  AssistantChatResponse,
  EligibilityAssessmentResult,
  JourneyStatusSummary,
  Language,
  QuestionnaireAnswers,
} from '@haq/shared';

export const getApiBaseUrl = (): string => {
  // 1. Explicit runtime environment variable takes highest precedence
  if (process.env.EXPO_PUBLIC_API_URL && process.env.EXPO_PUBLIC_API_URL.trim() !== '') {
    return process.env.EXPO_PUBLIC_API_URL.trim();
  }

  // 2. If running via Expo Go / Metro on a physical device, use Metro host's LAN IP
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const host = hostUri.split(':')[0];
    if (host && host !== 'localhost' && host !== '127.0.0.1') {
      return `http://${host}:4000`;
    }
  }

  // 3. Android: Distinguish emulator vs physical device
  if (Platform.OS === 'android') {
    if (Constants.isDevice) {
      // Physical Android device without explicit EXPO_PUBLIC_API_URL
      console.warn(
        '[API] Running on physical Android device without EXPO_PUBLIC_API_URL. Set EXPO_PUBLIC_API_URL to your reachable backend.'
      );
      return '';
    }
    // Android emulator loopback
    return 'http://10.0.2.2:4000';
  }

  // 4. iOS simulator or Web browser
  return 'http://localhost:4000';
};

export const API_BASE_URL = getApiBaseUrl();

export class ApiService {
  private static async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    if (!API_BASE_URL) {
      throw new Error(
        'Backend unreachable: No EXPO_PUBLIC_API_URL configured for physical device. Running in offline-first mode.'
      );
    }

    try {
      const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(options?.headers || {}),
        },
      });

      if (!res.ok) {
        const errorJson = await res.json().catch(() => ({}));
        throw new Error(errorJson.message || `Request failed with status ${res.status}`);
      }

      return (await res.json()) as T;
    } catch (err: any) {
      console.warn(`[API] Network request to ${endpoint} failed:`, err?.message || err);
      throw err;
    }
  }

  static async createSession(preferredLanguage: Language): Promise<{ id: string }> {
    return this.request<{ id: string }>('/api/sessions', {
      method: 'POST',
      body: JSON.stringify({ preferredLanguage }),
    });
  }

  static async assessEligibility(
    sessionId: string,
    answers: QuestionnaireAnswers
  ): Promise<EligibilityAssessmentResult> {
    return this.request<EligibilityAssessmentResult>('/api/eligibility/assess', {
      method: 'POST',
      body: JSON.stringify({ sessionId, answers }),
    });
  }

  static async getChecklist(sessionId: string): Promise<any> {
    return this.request(`/api/documents/checklist/${sessionId}`);
  }

  static async updateDocumentItem(
    itemId: string,
    sessionId: string,
    status?: string,
    userNotes?: string
  ): Promise<any> {
    return this.request(`/api/documents/${itemId}`, {
      method: 'PATCH',
      headers: {
        'x-session-id': sessionId,
      },
      body: JSON.stringify({ sessionId, status, userNotes }),
    });
  }

  static async askAssistant(
    sessionId: string,
    message: string,
    language: Language
  ): Promise<AssistantChatResponse> {
    return this.request<AssistantChatResponse>('/api/assistant/chat', {
      method: 'POST',
      body: JSON.stringify({ sessionId, message, language }),
    });
  }

  static async draftContractorRequest(params: {
    sessionId: string;
    workerName: string;
    contractorName: string;
    siteLocation: string;
    tradeType: string;
    workDatesDescription: string;
    language: Language;
  }): Promise<{ draftText: string; instructions: string }> {
    return this.request('/api/assistant/draft-request', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  static async getJourney(sessionId: string): Promise<JourneyStatusSummary> {
    return this.request<JourneyStatusSummary>(`/api/journey/${sessionId}`);
  }

  static async recordJourneyEvent(
    sessionId: string,
    eventType: string,
    evidenceType?: string,
    evidenceReference?: string
  ): Promise<any> {
    return this.request('/api/journey/events', {
      method: 'POST',
      body: JSON.stringify({
        sessionId,
        eventType,
        evidenceType,
        evidenceReference,
      }),
    });
  }
}
