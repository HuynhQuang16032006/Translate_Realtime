import type { Language } from '../types';

export class SpeechRecognitionService {
  private recognition: any = null;
  private currentTranscript: string = '';
  private accumulatedTranscript: string = '';
  private isListening: boolean = false;
  private currentLang: Language = 'vi';
  private onUpdateCallback: ((text: string) => void) | null = null;
  private onErrorCallback: ((error: string) => void) | null = null;

  public isSupported(): boolean {
    if (typeof window === 'undefined') return false;
    return !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
  }

  public setUpdateCallback(cb: ((text: string) => void) | null) {
    this.onUpdateCallback = cb;
  }

  public setErrorCallback(cb: ((error: string) => void) | null) {
    this.onErrorCallback = cb;
  }

  public start(lang: Language): boolean {
    if (typeof window === 'undefined') return false;
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn('Web Speech API không được hỗ trợ trên trình duyệt này.');
      return false;
    }

    this.currentLang = lang;
    this.currentTranscript = '';
    this.accumulatedTranscript = '';
    this.isListening = true;

    // Clean up previous instance cleanly
    this.destroyCurrentSession();

    return this.initAndStart();
  }

  private destroyCurrentSession(): void {
    if (this.recognition) {
      try {
        this.recognition.onresult = null;
        this.recognition.onerror = null;
        this.recognition.onend = null;
        this.recognition.abort();
      } catch (e) {
        // Ignore
      }
      this.recognition = null;
    }
  }

  private initAndStart(): boolean {
    if (!this.isListening || typeof window === 'undefined') return false;
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return false;

    try {
      const recognition = new SpeechRecognition();

      const isMobile =
        typeof navigator !== 'undefined' &&
        /iPhone|iPad|iPod|Android|Mobile/i.test(navigator.userAgent);

      // On iOS Safari & Mobile browsers, continuous must be false to stream real-time interim results as words are spoken
      recognition.continuous = !isMobile;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      const langMap: Record<Language, string> = {
        vi: 'vi-VN',
        zh: 'zh-CN',
        en: 'en-US',
      };
      recognition.lang = langMap[this.currentLang] || 'vi-VN';

      recognition.onresult = (event: any) => {
        let interimStr = '';
        for (let i = event.resultIndex || 0; i < event.results.length; ++i) {
          const item = event.results[i];
          if (!item || !item[0]) continue;
          const transcript = item[0].transcript || '';
          if (item.isFinal) {
            this.accumulatedTranscript = (this.accumulatedTranscript + ' ' + transcript).trim();
          } else {
            interimStr += transcript;
          }
        }

        const full = (this.accumulatedTranscript + ' ' + interimStr).trim();
        if (full) {
          this.currentTranscript = full;
          if (this.onUpdateCallback) {
            this.onUpdateCallback(this.currentTranscript);
          }
        }
      };

      recognition.onerror = (event: any) => {
        const error = event?.error;
        console.warn('SpeechRecognition event error:', error);
        if (error === 'no-speech') {
          return;
        }

        if (this.onErrorCallback) {
          this.onErrorCallback(error);
        }

        // On non-fatal network hiccups, attempt fresh reconnection if user is still holding recording
        const fatalErrors = ['not-allowed', 'service-not-allowed', 'audio-capture'];
        if (this.isListening && !fatalErrors.includes(error)) {
          setTimeout(() => {
            if (this.isListening) {
              this.destroyCurrentSession();
              this.initAndStart();
            }
          }, 300);
        }
      };

      recognition.onend = () => {
        // Seamless auto-restart with a fresh instance on mobile phrase boundary if still listening
        if (this.isListening) {
          setTimeout(() => {
            if (this.isListening) {
              this.destroyCurrentSession();
              this.initAndStart();
            }
          }, 150);
        }
      };

      recognition.start();
      this.recognition = recognition;
      return true;
    } catch (err) {
      console.warn('Lỗi khởi động SpeechRecognition:', err);
      if (this.onErrorCallback) {
        this.onErrorCallback(String(err));
      }
      return false;
    }
  }

  public stop(): Promise<string> {
    this.isListening = false;
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (e) {
        // Ignore
      }
    }

    const text = this.currentTranscript.trim() || this.accumulatedTranscript.trim();
    return Promise.resolve(text);
  }

  public getCurrentTranscript(): string {
    return (this.currentTranscript.trim() || this.accumulatedTranscript.trim());
  }

  public reset(): void {
    this.isListening = false;
    this.destroyCurrentSession();
    this.currentTranscript = '';
    this.accumulatedTranscript = '';
  }
}

export const speechRecognitionHelper = new SpeechRecognitionService();
