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
        let str = '';
        for (let i = 0; i < event.results.length; ++i) {
          str += event.results[i][0].transcript + ' ';
        }
        this.currentTranscript = str.trim();
        if (this.onUpdateCallback) {
          this.onUpdateCallback(this.currentTranscript);
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

      // Small delay to allow any pending audio buffers to finalize
      setTimeout(() => {
        resolve(this.currentTranscript.trim());
      }, 200);
    });
  }

  public getCurrentTranscript(): string {
    return this.currentTranscript.trim();
  }
}

export const speechRecognitionHelper = new SpeechRecognitionService();
