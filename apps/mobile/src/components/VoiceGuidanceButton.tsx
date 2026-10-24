import React, { useState, useEffect } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  View,
} from 'react-native';
import { Colors } from '../theme/colors';
import { VoiceGuidanceService } from '../services/voiceGuidance';
import { Language } from '@haq/shared';

interface VoiceGuidanceButtonProps {
  textToSpeak: string;
  language: Language;
  label?: string;
  stopLabel?: string;
  style?: ViewStyle;
  textStyle?: TextStyle;
  size?: 'normal' | 'compact';
}

export const VoiceGuidanceButton: React.FC<VoiceGuidanceButtonProps> = ({
  textToSpeak,
  language,
  label,
  stopLabel,
  style,
  textStyle,
  size = 'normal',
}) => {
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  // Stop speech when navigating away from this screen
  useEffect(() => {
    return () => {
      VoiceGuidanceService.stop();
    };
  }, []);

  const handleToggleVoice = async () => {
    if (isSpeaking) {
      await VoiceGuidanceService.stop();
      setIsSpeaking(false);
      return;
    }

    setLoading(true);
    await VoiceGuidanceService.speak(textToSpeak, language, {
      onStart: () => {
        setLoading(false);
        setIsSpeaking(true);
      },
      onDone: () => {
        setIsSpeaking(false);
      },
      onError: (err) => {
        setLoading(false);
        setIsSpeaking(false);
        console.warn('[VoiceGuidanceButton] Playback failed:', err);
      },
    });
  };

  const defaultLabel =
    language === 'mr' ? '🔊 आवाजात ऐका' : language === 'hi' ? '🔊 आवाज में सुनें' : '🔊 Listen';

  const defaultStopLabel =
    language === 'mr' ? '⏹️ आवाज थांबवा' : language === 'hi' ? '⏹️ बंद करें' : '⏹️ Stop';

  const isCompact = size === 'compact';

  return (
    <TouchableOpacity
      style={[
        styles.button,
        isCompact && styles.buttonCompact,
        isSpeaking && styles.buttonActive,
        style,
      ]}
      onPress={handleToggleVoice}
      accessibilityRole="button"
      accessibilityLabel={isSpeaking ? 'आवाज थांबवा (Stop Audio)' : 'आवाजात मार्गदर्शन ऐका (Listen to Guidance)'}
      accessibilityHint="यावर क्लिक करून मार्गदर्शन आवाजात ऐका किंवा थांबवा."
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 6 }} />
      ) : (
        <View style={[styles.indicatorDot, isSpeaking && styles.indicatorDotActive]} />
      )}
      <Text
        style={[
          styles.text,
          isCompact && styles.textCompact,
          isSpeaking && styles.textActive,
          textStyle,
        ]}
      >
        {isSpeaking ? (stopLabel || defaultStopLabel) : (label || defaultLabel)}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F172A',
    borderColor: '#334155',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    minHeight: 44, // Accessible touch target
  },
  buttonCompact: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    minHeight: 36,
  },
  buttonActive: {
    backgroundColor: 'rgba(255, 107, 44, 0.15)',
    borderColor: Colors.constructionOrange,
  },
  indicatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#64748B',
    marginRight: 8,
  },
  indicatorDotActive: {
    backgroundColor: Colors.constructionOrange,
  },
  text: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '600',
  },
  textCompact: {
    fontSize: 13,
  },
  textActive: {
    color: Colors.constructionOrange,
  },
});
