import type { Language } from '../types';

export class SpeechSynthesisService {
  private isSpeakingNow: boolean = false;
  private audioPlayer: HTMLAudioElement | null = null;
  private isAudioUnlocked: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.initAudioPlayer();
    }
  }

  private initAudioPlayer(): void {
    if (this.audioPlayer) return;
    this.audioPlayer = new Audio();
    this.audioPlayer.preload = 'auto';
  }

  /**
   * Permanently unlocks Audio & SpeechSynthesis on mobile iOS Safari & Android Chrome
   * MUST be called during a direct user touch/click (e.g. entering room or pressing PTT)
   */
  public unlockMobileAudio(): void {
    if (typeof window === 'undefined') return;

    this.initAudioPlayer();

    // 1. Unlock HTML5 Audio on mobile with silent audio buffer
    if (this.audioPlayer && !this.isAudioUnlocked) {
      this.audioPlayer.src =
        'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
      this.audioPlayer
        .play()
        .then(() => {
          if (this.audioPlayer) {
            this.audioPlayer.pause();
            this.audioPlayer.removeAttribute('src');
            this.audioPlayer.load();
          }
          this.isAudioUnlocked = true;
        })
        .catch(() => {});
    }

    // 2. Unlock Web SpeechSynthesis on iOS Safari
    if ('speechSynthesis' in window) {
      try {
        window.speechSynthesis.resume();
        const silent = new SpeechSynthesisUtterance(' ');
        silent.volume = 0;
        window.speechSynthesis.speak(silent);
      } catch (e) {}
    }
  }

  public isAvailable(): boolean {
    return typeof window !== 'undefined';
  }

  public isSpeaking(): boolean {
    return this.isSpeakingNow;
  }

  public stop(): void {
    if (this.audioPlayer) {
      try {
        this.audioPlayer.pause();
        this.audioPlayer.removeAttribute('src');
        this.audioPlayer.load();
      } catch (e) {}
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch (e) {}
    }
    this.isSpeakingNow = false;
  }

  /**
   * Speak translation out loud.
   * Uses high-quality Neural TTS audio stream with automatic fallback to Web Speech API.
   * Works on 100% of mobile phones (including Chinese Android ROMs without Google TTS voices).
   */
  public speak(
    text: string,
    lang: Language,
    onStart?: () => void,
    onEnd?: () => void
  ): Promise<void> {
    return new Promise((resolve) => {
      const cleanText = text.trim();
      if (!cleanText) {
        resolve();
        return;
      }

      this.stop();
      this.isSpeakingNow = true;

      const finish = () => {
        this.isSpeakingNow = false;
        if (this.audioPlayer) {
          try {
            this.audioPlayer.pause();
            this.audioPlayer.removeAttribute('src');
            this.audioPlayer.load();
          } catch (e) {}
        }
        if (onEnd) onEnd();
        resolve();
      };

      // METHOD 1: High-Speed Neural Audio Stream (Google TTS via Cloudflare/Vercel Relay)
      // This plays natural human speech and works on 100% of phones regardless of installed voices
      const ttsUrl = `/api/translate?tts=${encodeURIComponent(cleanText)}&lang=${lang}`;

      this.initAudioPlayer();
      if (this.audioPlayer) {
        let isHandled = false;

        this.audioPlayer.onplay = () => {
          if (!isHandled) {
            if (onStart) onStart();
          }
        };

        this.audioPlayer.onended = () => {
          if (!isHandled) {
            isHandled = true;
            finish();
          }
        };

        this.audioPlayer.onerror = () => {
          if (!isHandled) {
            isHandled = true;
            // Fallback to browser Web Speech API
            this.speakWithBrowserApi(cleanText, lang, onStart, finish);
          }
        };

        this.audioPlayer.src = ttsUrl;
        const playPromise = this.audioPlayer.play();
        if (playPromise !== undefined) {
          playPromise.catch((err) => {
            console.warn('Audio element play blocked or failed:', err);
            if (!isHandled) {
              isHandled = true;
              this.speakWithBrowserApi(cleanText, lang, onStart, finish);
            }
          });
        }
        return;
      }

      // Fallback: Browser Web Speech API
      this.speakWithBrowserApi(cleanText, lang, onStart, finish);
    });
  }

  /**
   * Fallback Web Speech API
   */
  private speakWithBrowserApi(
    text: string,
    lang: Language,
    onStart?: () => void,
    onEnd?: () => void
  ): void {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      if (onEnd) onEnd();
      return;
    }

    try {
      window.speechSynthesis.cancel();
      window.speechSynthesis.resume();

      const utterance = new SpeechSynthesisUtterance(text);
      const langMap: Record<Language, string> = {
        vi: 'vi-VN',
        zh: 'zh-CN',
        en: 'en-US',
      };
      utterance.lang = langMap[lang] || 'vi-VN';
      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      const voices = window.speechSynthesis.getVoices();
      const matched = voices.find((v) =>
        v.lang.toLowerCase().startsWith(lang.toLowerCase())
      );
      if (matched) {
        utterance.voice = matched;
      }

      utterance.onstart = () => {
        if (onStart) onStart();
      };

      utterance.onend = () => {
        if (onEnd) onEnd();
      };

      utterance.onerror = () => {
        if (onEnd) onEnd();
      };

      window.speechSynthesis.speak(utterance);
    } catch (e) {
      if (onEnd) onEnd();
    }
  }
}

export const speechService = new SpeechSynthesisService();
