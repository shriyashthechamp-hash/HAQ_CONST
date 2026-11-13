import { ISpeechToTextProvider, ITextToSpeechProvider } from './interfaces';

export class SarvamVoiceProvider implements ISpeechToTextProvider, ITextToSpeechProvider {
  private apiKey: string;
  private ttsModel: string;
  private ttsSpeaker: string;
  private sttModel: string;

  constructor() {
    this.apiKey = process.env.SARVAM_API_KEY || '';
    this.ttsModel = process.env.SARVAM_TTS_MODEL || 'bulbul:v3';
    this.ttsSpeaker = process.env.SARVAM_TTS_SPEAKER || 'ritu';
    this.sttModel = process.env.SARVAM_STT_MODEL || 'saaras:v2';
  }

  isConfigured(): boolean {
    return Boolean(
      this.apiKey &&
      this.apiKey.trim() !== '' &&
      !this.apiKey.startsWith('your_')
    );
  }

  /**
   * Synthesize natural Indian language speech using Sarvam bulbul:v3
   */
  async synthesize(
    text: string,
    languageCode: string = 'mr-IN',
    speaker?: string
  ): Promise<{ audioBase64: string; format: string }> {
    if (!this.isConfigured()) {
      throw new Error('SarvamVoiceProvider: SARVAM_API_KEY is not configured.');
    }

    const cleanText = text
      .replace(/\[REDACTED\]/g, '')
      .replace(/SOURCES:.*$/g, '')
      .replace(/https?:\/\/\S+/g, '')
      .trim();

    if (!cleanText) {
      throw new Error('SarvamVoiceProvider: Empty text provided for synthesis.');
    }

    // Limit text length to at most 480 characters on sentence/word boundary for Sarvam
    let inputChunk = cleanText;
    if (inputChunk.length > 480) {
      inputChunk = inputChunk.slice(0, 480);
      const lastSentenceEnd = Math.max(
        inputChunk.lastIndexOf('।'),
        inputChunk.lastIndexOf('.'),
        inputChunk.lastIndexOf('?')
      );
      if (lastSentenceEnd > 200) {
        inputChunk = inputChunk.substring(0, lastSentenceEnd + 1);
      } else {
        const lastSpace = inputChunk.lastIndexOf(' ');
        if (lastSpace > 200) {
          inputChunk = inputChunk.substring(0, lastSpace);
        }
      }
    }

    const response = await fetch('https://api.sarvam.ai/text-to-speech', {
      method: 'POST',
      headers: {
        'api-subscription-key': this.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: [inputChunk],
        target_language_code: languageCode,
        speaker: speaker || this.ttsSpeaker,
        model: this.ttsModel,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Sarvam TTS Error]:', response.status, errorText);
      throw new Error(`Sarvam TTS failed with status ${response.status}: ${errorText}`);
    }

    const data = (await response.json()) as { audios: string[] };
    if (!data.audios || data.audios.length === 0) {
      throw new Error('Sarvam TTS returned no audio frames.');
    }

    return {
      audioBase64: data.audios[0],
      format: 'wav',
    };
  }

  /**
   * Transcribe speech using Sarvam saaras:v2
   */
  async transcribe(
    audioBase64: string,
    languageCode: string = 'mr-IN'
  ): Promise<{ text: string; language: string; confidence?: number }> {
    if (!this.isConfigured()) {
      throw new Error('SarvamVoiceProvider: SARVAM_API_KEY is not configured.');
    }

    const cleanBase64 = audioBase64.replace(/^data:audio\/\w+;base64,/, '');
    const audioBuffer = Buffer.from(cleanBase64, 'base64');

    const formData = new FormData();
    const blob = new Blob([audioBuffer], { type: 'audio/wav' });
    formData.append('file', blob, 'recording.wav');
    formData.append('model', this.sttModel);
    if (languageCode) {
      formData.append('language_code', languageCode);
    }

    const response = await fetch('https://api.sarvam.ai/speech-to-text', {
      method: 'POST',
      headers: {
        'api-subscription-key': this.apiKey,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Sarvam STT Error]:', response.status, errorText);
      throw new Error(`Sarvam STT failed with status ${response.status}: ${errorText}`);
    }

    const data = (await response.json()) as { transcript: string; language_code?: string };
    return {
      text: data.transcript || '',
      language: data.language_code || languageCode,
      confidence: 0.95,
    };
  }
}
