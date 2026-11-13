import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { Typography } from '../theme/typography';
import { Spacing, Radius } from '../theme/spacing';
import { VoicePlaybackService } from '../services/voicePlaybackService';
import { Language } from '@haq/shared';

interface AudioPlayerBarProps {
  messageId: string;
  audioBase64?: string;
  textFallback: string;
  language?: Language;
}

/**
 * Audio Player Bar for Assistant Messages.
 * Plays Sarvam bulbul:v3 synthesized speech or fallback OS TTS.
 * Shows live playback state, waveform bars, and stop/replay controls.
 */
export const AudioPlayerBar: React.FC<AudioPlayerBarProps> = ({
  messageId,
  audioBase64,
  textFallback,
  language = 'mr',
}) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [playbackSource, setPlaybackSource] = useState<'SARVAM' | 'OS' | null>(null);

  useEffect(() => {
    // If another message started playing, reset our local playing state
    const currentId = VoicePlaybackService.getCurrentPlayingId();
    if (currentId !== messageId && isPlaying) {
      setIsPlaying(false);
    }
  }, [messageId, isPlaying]);

  const handleTogglePlay = async () => {
    if (isPlaying) {
      await VoicePlaybackService.stop();
      setIsPlaying(false);
      return;
    }

    setIsLoading(true);
    try {
      const res = await VoicePlaybackService.playAudio({
        id: messageId,
        audioBase64,
        textFallback,
        language,
        callbacks: {
          onStart: () => {
            setIsLoading(false);
            setIsPlaying(true);
          },
          onFinish: () => {
            setIsPlaying(false);
          },
          onError: () => {
            setIsLoading(false);
            setIsPlaying(false);
          },
        },
      });

      setPlaybackSource(res.source === 'SARVAM_NATIVE' ? 'SARVAM' : 'OS');
    } catch (err) {
      console.warn('[AudioPlayerBar] Playback error:', err);
      setIsLoading(false);
      setIsPlaying(false);
    }
  };

  const label = isPlaying
    ? language === 'mr'
      ? 'आवाज सुरू आहे (थांबवा)'
      : language === 'hi'
      ? 'आवाज चल रहा है (रोकें)'
      : 'Playing voice (Tap to stop)'
    : language === 'mr'
    ? 'आवाज ऐका (Sarvam AI)'
    : language === 'hi'
    ? 'आवाज सुनें (Sarvam AI)'
    : 'Listen to answer';

  return (
    <View style={[styles.container, isPlaying && styles.containerActive]}>
      <TouchableOpacity
        style={[styles.playBtn, isPlaying && styles.playBtnActive]}
        onPress={handleTogglePlay}
        disabled={isLoading}
        activeOpacity={0.8}
        accessible={true}
        accessibilityLabel={label}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color={Colors.textInverse} />
        ) : (
          <Ionicons
            name={isPlaying ? 'pause' : 'volume-high'}
            size={18}
            color={isPlaying ? Colors.textInverse : Colors.primary}
          />
        )}
      </TouchableOpacity>

      <View style={styles.infoCol}>
        <Text style={[styles.labelText, isPlaying && styles.labelTextActive]}>{label}</Text>
        <Text style={styles.subtext}>
          {playbackSource === 'OS' ? 'Native Voice' : 'Sarvam bulbul:v3'}
        </Text>
      </View>

      {isPlaying && (
        <View style={styles.waveformContainer}>
          <View style={[styles.waveBar, styles.waveBar1]} />
          <View style={[styles.waveBar, styles.waveBar2]} />
          <View style={[styles.waveBar, styles.waveBar3]} />
          <View style={[styles.waveBar, styles.waveBar4]} />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginTop: Spacing.sm,
  },
  containerActive: {
    borderColor: Colors.accent,
    backgroundColor: Colors.saffronOrangeLight,
  },
  playBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.warmIvory,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  playBtnActive: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  infoCol: {
    flex: 1,
  },
  labelText: {
    ...Typography.badgeText,
    color: Colors.textPrimary,
  },
  labelTextActive: {
    color: Colors.textAccent,
  },
  subtext: {
    ...Typography.meta,
    fontSize: 10,
    color: Colors.textSecondary,
  },
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingRight: Spacing.xs,
  },
  waveBar: {
    width: 3,
    borderRadius: 2,
    backgroundColor: Colors.accent,
  },
  waveBar1: { height: 8 },
  waveBar2: { height: 16 },
  waveBar3: { height: 12 },
  waveBar4: { height: 6 },
});
