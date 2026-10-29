import type { Language } from '../types';

export class SpeechRecognitionService {
  private recognition: any = null;
  private currentTranscript: string = '';
  private accumulatedTranscript: string = '';
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

    this.currentTranscript = '';
    this.accumulatedTranscript = '';
    this.isListening = true;

    try {
      if (this.recognition) {
        try {
          this.recognition.abort();
        } catch (e) {
          // Ignore
        }
      }

      const isMobile = typeof navigator !== 'undefined' && /iPhone|iPad|iPod|Android|Mobile/i.test(navigator.userAgent);
      const recognition = new SpeechRecognition();

      // Mobile Safari and Android Chromium stream interim results much faster when continuous is false
      recognition.continuous = !isMobile;
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

        const startIndex = isMobile ? 0 : (event.resultIndex || 0);
        for (let i = startIndex; i < event.results.length; ++i) {
          const item = event.results[i];
          if (!item || !item[0]) continue;
          const transcript = item[0].transcript || '';
          if (item.isFinal) {
            finalStr += transcript + ' ';
          } else {
            interimStr += transcript;
          }
        }

        if (finalStr.trim()) {
          this.accumulatedTranscript = (this.accumulatedTranscript + ' ' + finalStr).trim();
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
        if (this.isListening && error !== 'not-allowed') {
          setTimeout(() => {
            if (this.isListening) {
              try {
                recognition.start();
              } catch (e) {}
            }
          }, 100);
        }
      };

      recognition.onend = () => {
        // Seamless auto-restart on mobile phrase boundaries while user is still holding PTT
        if (this.isListening) {
          try {
            recognition.start();
          } catch (e) {
            // Ignore
          }
        }
      };

      recognition.start();
      this.recognition = recognition;
      return true;
    } catch (err) {
      console.warn('Lỗi khởi động SpeechRecognition:', err);
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

    // Return current captured transcript immediately
    const text = this.currentTranscript.trim() || this.accumulatedTranscript.trim();
    return Promise.resolve(text);
  }

  public getCurrentTranscript(): string {
    return (this.currentTranscript.trim() || this.accumulatedTranscript.trim());
  }
}

export const speechRecognitionHelper = new SpeechRecognitionService();
