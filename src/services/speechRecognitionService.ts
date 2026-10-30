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

      // Always enable continuous and interimResults for smooth real-time text display
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      const langMap: Record<Language, string> = {
        vi: 'vi-VN',
        zh: 'zh-CN',
        en: 'en-US',
      };
      recognition.lang = langMap[this.currentLang] || 'vi-VN';

      recognition.onresult = (event: any) => {
        let finalStr = '';
        let interimStr = '';

        for (let i = 0; i < event.results.length; ++i) {
          const item = event.results[i];
          if (!item || !item[0]) continue;
          const transcript = (item[0].transcript || '').trim();
          if (!transcript) continue;

          if (item.isFinal) {
            finalStr += (finalStr ? ' ' : '') + transcript;
          } else {
            interimStr += (interimStr ? ' ' : '') + transcript;
          }
        }

        const segmentText = (finalStr + (interimStr ? ' ' + interimStr : '')).trim();
        const full = (this.accumulatedTranscript ? this.accumulatedTranscript + ' ' + segmentText : segmentText).trim();
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
        const fatalErrors = ['not-allowed', 'service-not-allowed', 'language-not-supported'];
        if (this.isListening && !fatalErrors.includes(error)) {
          setTimeout(() => {
            if (this.isListening) {
              try {
                this.destroyCurrentSession();
                this.initAndStart();
              } catch (e) {
                // Ignore
              }
            }
          }, 300);
        }
      };

      recognition.onend = () => {
        if (this.isListening) {
          if (this.currentTranscript) {
            this.accumulatedTranscript = this.currentTranscript;
          }
          // Restart recognition smoothly if user is still speaking
          setTimeout(() => {
            if (this.isListening && this.recognition) {
              try {
                this.recognition.start();
              } catch (e) {
                // If browser restricts start without gesture, keep existing accumulated text
              }
            }
          }, 150);
        }
      };

      recognition.start();
      this.recognition = recognition;
      return true;
    } catch (err) {
      console.warn('Lỗi khởi động SpeechRecognition:', err);
      // Auto-retry once after 150ms if browser was still releasing previous session
      if (this.isListening) {
        setTimeout(() => {
          if (this.isListening && !this.recognition) {
            this.initAndStart();
          }
        }, 150);
      }
      return false;
    }
  }

  public stop(): Promise<string> {
    this.isListening = false;
    const text = (this.currentTranscript || this.accumulatedTranscript).trim();

    if (this.recognition) {
      const rec = this.recognition;
      this.recognition = null;
      try {
        rec.onresult = null;
        rec.onerror = null;
        rec.onend = null;
        rec.stop();
      } catch (e) {
        try {
          rec.abort();
        } catch (e2) {}
      }
    }

    return Promise.resolve(text);
  }

  public getCurrentTranscript(): string {
    return (this.currentTranscript || this.accumulatedTranscript).trim();
  }

  public reset(): void {
    this.isListening = false;
    this.destroyCurrentSession();
    this.currentTranscript = '';
    this.accumulatedTranscript = '';
  }
}

export const speechRecognitionHelper = new SpeechRecognitionService();
