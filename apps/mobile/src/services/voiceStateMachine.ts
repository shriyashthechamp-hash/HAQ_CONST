/**
 * Central Voice State Machine Definition for HAQ
 * Enforces a single authoritative state across recording, transcription,
 * review, agent processing, and audio playback.
 */

export type VoiceState =
  | 'idle'
  | 'requesting_permission'
  | 'recording'
  | 'transcribing'
  | 'reviewing_transcript'
  | 'processing'
  | 'generating_audio'
  | 'playing'
  | 'error'
  | 'cancelled';

export interface VoiceStateContext {
  state: VoiceState;
  durationMs: number;
  transcript: string;
  transcriptionLanguage?: string;
  errorMessage?: string;
  audioBase64?: string;
  currentPlayingId?: string;
}

export const INITIAL_VOICE_STATE: VoiceStateContext = {
  state: 'idle',
  durationMs: 0,
  transcript: '',
};
