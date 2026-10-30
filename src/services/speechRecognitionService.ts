import type { Language } from '../types';

/**
 * Smart transcript merger that resolves:
 * 1. Android Chrome cumulative chunks (replacing previous partial snapshots)
 * 2. Desktop & iOS incremental non-overlapping chunks
 * 3. Repetitive word boundaries across onend restarts
 */
function mergeTranscriptList(chunks: string[]): string {
  const merged: string[] = [];

  for (const rawChunk of chunks) {
    const chunk = rawChunk.trim();
    if (!chunk) continue;

    if (merged.length === 0) {
      merged.push(chunk);
      continue;
    }

    const lastIdx = merged.length - 1;
    const last = merged[lastIdx];

    // Case 1: Exact duplicate
    if (chunk === last) {
      continue;
    }

    // Case 2: New chunk is an extension of the last chunk (Android cumulative snapshot bug)
    // e.g. last = "Tôi", chunk = "Tôi muốn một"
    if (chunk.toLowerCase().startsWith(last.toLowerCase())) {
      merged[lastIdx] = chunk;
      continue;
    }

    // Case 3: Last chunk is an extension of the new chunk (interim rollback)
    if (last.toLowerCase().startsWith(chunk.toLowerCase())) {
      continue;
    }

    // Case 4: Overlapping boundary between last and chunk (word overlap)
    const lastWords = last.split(/\s+/);
    const chunkWords = chunk.split(/\s+/);

    let overlapFound = false;
    const maxOverlap = Math.min(lastWords.length, chunkWords.length, 5);
    for (let len = maxOverlap; len >= 1; len--) {
      const lastTail = lastWords.slice(-len).join(' ').toLowerCase();
      const chunkHead = chunkWords.slice(0, len).join(' ').toLowerCase();
      if (lastTail === chunkHead) {
        merged[lastIdx] = last + ' ' + chunkWords.slice(len).join(' ');
        overlapFound = true;
        break;
      }
    }

    if (!overlapFound) {
      merged.push(chunk);
    }
  }

  return merged.join(' ').trim();
}

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

      // On iOS Safari, continuous = false prevents WebKit audio session crashes and ghost state freezes
      const isIOS =
        typeof navigator !== 'undefined' &&
        (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
          (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

      recognition.continuous = !isIOS;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      const langMap: Record<Language, string> = {
        vi: 'vi-VN',
        zh: 'zh-CN',
        en: 'en-US',
      };
      recognition.lang = langMap[this.currentLang] || 'vi-VN';

      recognition.onresult = (event: any) => {
        const rawChunks: string[] = [];

        for (let i = 0; i < event.results.length; ++i) {
          const item = event.results[i];
          if (!item || !item[0]) continue;
          const transcript = (item[0].transcript || '').trim();
          if (transcript) {
            rawChunks.push(transcript);
          }
        }

        const segmentText = mergeTranscriptList(rawChunks);
        const full = this.accumulatedTranscript
          ? mergeTranscriptList([this.accumulatedTranscript, segmentText])
          : segmentText;

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
          // Restart with a fresh session instance if user is still speaking
          setTimeout(() => {
            if (this.isListening) {
              try {
                this.destroyCurrentSession();
                this.initAndStart();
              } catch (e) {}
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

    return new Promise((resolve) => {
      const existingText = (this.currentTranscript || this.accumulatedTranscript).trim();

      if (!this.recognition) {
        return resolve(existingText);
      }

      const rec = this.recognition;
      let resolved = false;

      const finish = () => {
        if (resolved) return;
        resolved = true;
        const finalText = (this.currentTranscript || this.accumulatedTranscript).trim();
        this.destroyCurrentSession();
        resolve(finalText);
      };

      // Allow up to 400ms for browser engine to deliver the final spoken chunk
      const timer = setTimeout(finish, 400);

      const prevOnResult = rec.onresult;
      rec.onresult = (event: any) => {
        if (prevOnResult) {
          prevOnResult(event);
        }
      };

      rec.onend = () => {
        clearTimeout(timer);
        finish();
      };

      rec.onerror = () => {
        clearTimeout(timer);
        finish();
      };

      try {
        rec.stop();
      } catch (e) {
        clearTimeout(timer);
        finish();
      }
    });
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
