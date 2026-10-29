import type { Language } from '../types';

export class SpeechRecognitionService {
  private recognition: any = null;
  private currentTranscript: string = '';
  private isListening: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.maxAlternatives = 1;

        this.recognition.onresult = (event: any) => {
          let final = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              final += event.results[i][0].transcript;
            } else {
              // interim
            }
          }
          if (final) {
            this.currentTranscript += ' ' + final;
          } else if (event.results[0]?.[0]?.transcript) {
            this.currentTranscript = event.results[0][0].transcript;
          }
        };

        this.recognition.onerror = (event: any) => {
          // Ignore harmless speech recognition errors (like no-speech)
          if (event.error !== 'no-speech') {
            console.warn('SpeechRecognition warning:', event.error);
          }
        };
      }
    }
  }

  public isSupported(): boolean {
    return !!this.recognition;
  }

  public start(lang: Language): void {
    if (!this.recognition) return;
    this.currentTranscript = '';
    this.isListening = true;

    const langMap: Record<Language, string> = {
      vi: 'vi-VN',
      zh: 'zh-CN',
      en: 'en-US',
    };

    this.recognition.lang = langMap[lang] || 'vi-VN';

    try {
      this.recognition.start();
    } catch (e) {
      // Already started or restarting
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

      // Small delay to allow final onresult to fire
      setTimeout(() => {
        resolve(this.currentTranscript.trim());
      }, 150);
    });
  }
}

export const speechRecognitionHelper = new SpeechRecognitionService();
