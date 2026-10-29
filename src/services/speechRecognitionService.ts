import type { Language } from '../types';

export class SpeechRecognitionService {
  private recognition: any = null;
  private currentTranscript: string = '';
  private isListening: boolean = false;
  private onUpdateCallback: ((text: string) => void) | null = null;

  public isSupported(): boolean {
    if (typeof window === 'undefined') return false;
    return !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
  }

  public setUpdateCallback(cb: ((text: string) => void) | null) {
    this.onUpdateCallback = cb;
  }

  public start(lang: Language): boolean {
    if (typeof window === 'undefined') return false;
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn('Web Speech API không được hỗ trợ trên trình duyệt này.');
      return false;
    }

    // Always instantiate fresh instance to prevent browser session lockup
    try {
      if (this.recognition) {
        try {
          this.recognition.abort();
        } catch (e) {
          // Ignore
        }
      }

      this.currentTranscript = '';
      this.isListening = true;

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      const langMap: Record<Language, string> = {
        vi: 'vi-VN',
        zh: 'zh-CN',
        en: 'en-US',
      };
      recognition.lang = langMap[lang] || 'vi-VN';

      recognition.onresult = (event: any) => {
        let finalStr = '';
        let interimStr = '';
        for (let i = 0; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalStr += event.results[i][0].transcript + ' ';
          } else {
            interimStr += event.results[i][0].transcript;
          }
        }
        const full = (finalStr + interimStr).trim();
        if (full) {
          this.currentTranscript = full;
          if (this.onUpdateCallback) {
            this.onUpdateCallback(this.currentTranscript);
          }
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('SpeechRecognition event error:', event.error);
        if (event.error === 'not-allowed') {
          console.warn('Microphone permission denied for speech recognition.');
        }
      };

      recognition.onend = () => {
        this.isListening = false;
      };

      recognition.start();
      this.recognition = recognition;
      return true;
    } catch (err) {
      console.warn('Lỗi khởi động SpeechRecognition:', err);
      this.isListening = false;
      return false;
    }
  }

  public stop(): Promise<string> {
    return new Promise((resolve) => {
      if (!this.recognition || !this.isListening) {
        resolve(this.currentTranscript.trim());
        return;
      }

      this.isListening = false;
      try {
        this.recognition.stop();
      } catch (e) {
        // Ignore
      }

      // Fast-resolve if transcript already has content, otherwise allow brief window for final audio buffer
      const waitTime = this.currentTranscript.trim() ? 40 : 180;
      setTimeout(() => {
        resolve(this.currentTranscript.trim());
      }, waitTime);
    });
  }

  public getCurrentTranscript(): string {
    return this.currentTranscript.trim();
  }

  /**
   * Free, zero-API-key serverless Speech-to-Text fallback using Puter.js
   */
  public async transcribeAudioBlobWithPuter(blob: Blob): Promise<string> {
    try {
      const puter = typeof window !== 'undefined' ? (window as any).puter : null;
      if (puter?.ai?.speech2txt) {
        const res = await puter.ai.speech2txt(blob);
        if (typeof res === 'string') return res.trim();
        if (res && typeof res.text === 'string') return res.text.trim();
      }
    } catch (e) {
      console.warn('Puter STT fallback:', e);
    }
    return '';
  }
}

export const speechRecognitionHelper = new SpeechRecognitionService();
