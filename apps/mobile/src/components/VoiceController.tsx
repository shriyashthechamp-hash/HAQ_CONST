import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { Typography } from '../theme/typography';
import { Spacing, Radius, Shadows } from '../theme/spacing';
import { VoiceState } from '../services/voiceStateMachine';

interface VoiceControllerProps {
  state: VoiceState;
  durationMs: number;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onCancelRecording?: () => void;
  disabled?: boolean;
  language?: string;
}

/**
 * Modern Premium Voice Microphone Controller.
 * Saffron Orange button with pulsing halo, live duration timer,
 * and clear visual state transitions.
 */
export const VoiceController: React.FC<VoiceControllerProps> = ({
  state,
  durationMs,
  onStartRecording,
  onStopRecording,
  onCancelRecording,
  disabled = false,
  language = 'mr',
}) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const isRecording = state === 'recording';
  const isTranscribing = state === 'transcribing';
  const isProcessing = state === 'processing';

  useEffect(() => {
    if (isRecording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.25,
            duration: 750,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 750,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isRecording, pulseAnim]);

  const formatDuration = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const getStatusText = () => {
    if (isRecording) {
      return language === 'mr'
        ? 'ऐकत आहे... (थांबवण्यासाठी टॅप करा)'
        : language === 'hi'
        ? 'सुन रहा हूँ... (रोकने के लिए टैप करें)'
        : 'Listening... (Tap to stop)';
    }
    if (isTranscribing) {
      return language === 'mr'
        ? 'आवाज समजून घेत आहे...'
        : language === 'hi'
        ? 'आवाज पहचान रहा हूँ...'
        : 'Transcribing speech...';
    }
    if (isProcessing) {
      return language === 'mr'
        ? 'उत्तर तयार करत आहे...'
        : language === 'hi'
        ? 'उत्तर तैयार कर रहा हूँ...'
        : 'Preparing answer...';
    }
    return language === 'mr'
      ? 'बोलण्यासाठी टॅप करा'
      : language === 'hi'
      ? 'बोलने के लिए टैप करें'
      : 'Tap to speak';
  };

  const handlePress = () => {
    if (disabled || isTranscribing || isProcessing) return;
    if (isRecording) {
      onStopRecording();
    } else {
      onStartRecording();
    }
  };

  return (
    <View style={styles.container}>
      {isRecording && (
        <View style={styles.timerRow}>
          <View style={styles.recordingDot} />
          <Text style={styles.timerText}>{formatDuration(durationMs)}</Text>
          {onCancelRecording && (
            <TouchableOpacity
              onPress={onCancelRecording}
              style={styles.cancelChip}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.cancelText}>
                {language === 'mr' ? 'रद्द करा' : language === 'hi' ? 'रद्द करें' : 'Cancel'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <View style={styles.buttonWrapper}>
        {isRecording && (
          <Animated.View
            style={[
              styles.pulseRing,
              {
                transform: [{ scale: pulseAnim }],
              },
            ]}
          />
        )}

        <TouchableOpacity
          style={[
            styles.micButton,
            isRecording && styles.micButtonActive,
            (disabled || isTranscribing || isProcessing) && styles.micButtonDisabled,
          ]}
          onPress={handlePress}
          activeOpacity={0.8}
          accessible={true}
          accessibilityLabel={getStatusText()}
          accessibilityRole="button"
        >
          {isTranscribing || isProcessing ? (
            <ActivityIndicator color={Colors.textInverse} size="small" />
          ) : (
            <Ionicons
              name={isRecording ? 'stop' : 'mic'}
              size={28}
              color={Colors.textInverse}
            />
          )}
        </TouchableOpacity>
      </View>

      <Text style={[styles.statusLabel, isRecording && styles.statusLabelActive]}>
        {getStatusText()}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.error,
    marginRight: Spacing.xs,
  },
  timerText: {
    ...Typography.badgeText,
    color: Colors.textPrimary,
  },
  cancelChip: {
    marginLeft: Spacing.md,
    paddingLeft: Spacing.sm,
    borderLeftWidth: 1,
    borderLeftColor: Colors.border,
  },
  cancelText: {
    ...Typography.caption,
    color: Colors.error,
    fontWeight: '600',
  },
  buttonWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 80,
    height: 80,
  },
  pulseRing: {
    position: 'absolute',
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: Colors.accentGlow,
  },
  micButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.floatingMic,
  },
  micButtonActive: {
    backgroundColor: Colors.error,
    shadowColor: Colors.error,
  },
  micButtonDisabled: {
    backgroundColor: Colors.secondary,
    opacity: 0.6,
  },
  statusLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
  statusLabelActive: {
    color: Colors.accent,
    fontWeight: '600',
  },
});
