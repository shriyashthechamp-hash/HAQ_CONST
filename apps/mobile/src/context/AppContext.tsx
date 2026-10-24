import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Language } from '@haq/shared';
import { TRANSLATIONS } from '../i18n/translations';
import { ApiService, API_BASE_URL } from '../services/api';

interface AppContextType {
  language: Language;
  setLanguage: (lang: Language) => Promise<void>;
  sessionId: string;
  t: (key: string, replacements?: Record<string, string | number>) => string;
  isBackendConnected: boolean;
  checkBackendHealth: () => Promise<void>;
  resetSession: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>('mr');
  const [sessionId, setSessionId] = useState<string>('demo-session-pune-01');
  const [isBackendConnected, setIsBackendConnected] = useState<boolean>(false);

  useEffect(() => {
    async function loadStoredState() {
      try {
        const storedLang = await AsyncStorage.getItem('@haq_language');
        if (storedLang === 'mr' || storedLang === 'hi' || storedLang === 'en') {
          setLanguageState(storedLang);
        }

        const storedSession = await AsyncStorage.getItem('@haq_session_id');
        if (storedSession) {
          setSessionId(storedSession);
        } else {
          // Initialize a session
          try {
            const res = await ApiService.createSession(storedLang as Language || 'mr');
            if (res && res.id) {
              setSessionId(res.id);
              await AsyncStorage.setItem('@haq_session_id', res.id);
              setIsBackendConnected(true);
            }
          } catch {
            const fallbackId = `haq-${Date.now().toString(36)}`;
            setSessionId(fallbackId);
            await AsyncStorage.setItem('@haq_session_id', fallbackId);
          }
        }
      } catch (err) {
        console.warn('Failed to load local storage state:', err);
      }
    }

    loadStoredState();
    checkBackendHealth();
  }, []);

  const checkBackendHealth = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/health`);
      if (res.ok) {
        setIsBackendConnected(true);
      }
    } catch {
      setIsBackendConnected(false);
    }
  };

  const setLanguage = async (newLang: Language) => {
    setLanguageState(newLang);
    await AsyncStorage.setItem('@haq_language', newLang);
  };

  const resetSession = async () => {
    try {
      await AsyncStorage.removeItem('@haq_session_id');
      const newSession = await ApiService.createSession(language);
      setSessionId(newSession.id);
      await AsyncStorage.setItem('@haq_session_id', newSession.id);
    } catch {
      const fallbackId = `haq-${Date.now().toString(36)}`;
      setSessionId(fallbackId);
      await AsyncStorage.setItem('@haq_session_id', fallbackId);
    }
  };

  const t = (key: string, replacements?: Record<string, string | number>): string => {
    const dict = TRANSLATIONS[language] || TRANSLATIONS.en;
    let text = dict[key] || TRANSLATIONS.en[key] || key;
    if (replacements) {
      Object.keys(replacements).forEach((placeholder) => {
        text = text.replace(new RegExp(`\\{${placeholder}\\}`, 'g'), String(replacements[placeholder]));
      });
    }
    return text;
  };

  return (
    <AppContext.Provider
      value={{
        language,
        setLanguage,
        sessionId,
        t,
        isBackendConnected,
        checkBackendHealth,
        resetSession,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
