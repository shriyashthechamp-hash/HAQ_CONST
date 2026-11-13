import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';

export interface VoiceRecordingResult {
  uri: string;
  audioBase64: string;
  durationMs: number;
}

export type RecordingStatusCallback = (status: {
  isRecording: boolean;
  durationMillis: number;
}) => void;

/**
 * Native Voice Recording Service using Expo SDK 52 Audio.
 * Handles permissions, hardware audio modes, recording lifecycle,
 * and base64 encoding for Sarvam STT.
 */
export class VoiceRecordingService {
  private static activeRecording: Audio.Recording | null = null;
  private static recordingStartTime: number = 0;

  /**
   * Request microphone recording permissions.
   */
  static async requestPermissions(): Promise<boolean> {
    try {
      const current = await Audio.getPermissionsAsync();
      if (current.granted) {
        return true;
      }
      const response = await Audio.requestPermissionsAsync();
      return response.granted;
    } catch (err) {
      console.warn('[VoiceRecordingService] Permission check error:', err);
      return false;
    }
  }

  /**
   * Configure audio session mode for recording.
   */
  private static async configureAudioMode(): Promise<void> {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
      staysActiveInBackground: false,
    });
  }

  /**
   * Starts a real native microphone recording session.
   */
  static async startRecording(onStatusUpdate?: RecordingStatusCallback): Promise<void> {
    // 1. Guard permissions
    const hasPermission = await this.requestPermissions();
    if (!hasPermission) {
      throw new Error('MICROPHONE_PERMISSION_DENIED');
    }

    // 2. Tear down any lingering recording
    await this.cancelRecording();

    // 3. Configure hardware audio mode
    await this.configureAudioMode();

    // 4. Create and start native recorder
    const recording = new Audio.Recording();

    if (onStatusUpdate) {
      recording.setOnRecordingStatusUpdate((status) => {
        onStatusUpdate({
          isRecording: status.isRecording,
          durationMillis: status.durationMillis,
        });
      });
    }

    await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
    await recording.startAsync();

    this.activeRecording = recording;
    this.recordingStartTime = Date.now();
  }

  /**
   * Stops recording, extracts URI, validates duration, and reads audio file as base64.
   */
  static async stopRecording(): Promise<VoiceRecordingResult> {
    const recording = this.activeRecording;
    if (!recording) {
      throw new Error('NO_ACTIVE_RECORDING');
    }

    this.activeRecording = null;
    const durationMs = Date.now() - this.recordingStartTime;

    try {
      const status = await recording.getStatusAsync();
      if (status.isRecording) {
        await recording.stopAndUnloadAsync();
      }
    } catch (unloadErr) {
      console.warn('[VoiceRecordingService] Unload warning:', unloadErr);
    }

    const uri = recording.getURI();
    if (!uri) {
      throw new Error('RECORDING_URI_UNAVAILABLE');
    }

    // Validate minimum duration (at least 500ms to avoid empty tap artifacts)
    if (durationMs < 500) {
      await this.cleanupFile(uri);
      throw new Error('RECORDING_TOO_SHORT');
    }

    // Read recorded binary audio as clean base64 string
    const audioBase64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    if (!audioBase64 || audioBase64.trim() === '') {
      await this.cleanupFile(uri);
      throw new Error('RECORDING_EMPTY');
    }

    return {
      uri,
      audioBase64,
      durationMs,
    };
  }

  /**
   * Aborts active recording without producing output.
   */
  static async cancelRecording(): Promise<void> {
    if (!this.activeRecording) return;
    const recording = this.activeRecording;
    this.activeRecording = null;

    try {
      const uri = recording.getURI();
      await recording.stopAndUnloadAsync();
      if (uri) {
        await this.cleanupFile(uri);
      }
    } catch (err) {
      console.warn('[VoiceRecordingService] Cancel error:', err);
    }
  }

  /**
   * Cleans up temporary recording file from app cache.
   */
  static async cleanupFile(uri: string): Promise<void> {
    try {
      const info = await FileSystem.getInfoAsync(uri);
      if (info.exists) {
        await FileSystem.deleteAsync(uri, { idempotent: true });
      }
    } catch (err) {
      console.warn('[VoiceRecordingService] File cleanup error:', err);
    }
  }

  /**
   * Check if recording is currently active.
   */
  static isRecording(): boolean {
    return this.activeRecording !== null;
  }
}

