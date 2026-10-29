import type { Language } from '../types';

export class SpeechSynthesisService {
  private isSpeakingNow: boolean = false;

  public isAvailable(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  }

  public isSpeaking(): boolean {
    return this.isSpeakingNow;
  }

  public stop(): void {
    if (this.isAvailable()) {
      window.speechSynthesis.cancel();
      this.isSpeakingNow = false;
    }
  }

  public speak(
    text: string,
    lang: Language,
    onStart?: () => void,
    onEnd?: () => void
  ): Promise<void> {
    return new Promise((resolve) => {
      if (!this.isAvailable() || !text.trim()) {
        resolve();
        return;
      }

      // iOS Safari bugfix: cancel any pending or stuck synthesis
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);

      // Select language tag
      const langMap: Record<Language, string> = {
        vi: 'vi-VN',
        zh: 'zh-CN',
        en: 'en-US',
      };
      utterance.lang = langMap[lang] || 'vi-VN';
      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      // Find matching voice
      const voices = window.speechSynthesis.getVoices();
      const matchedVoice = voices.find((v) =>
        v.lang.toLowerCase().startsWith(lang.toLowerCase())
      );
      if (matchedVoice) {
        utterance.voice = matchedVoice;
      }

      utterance.onstart = () => {
        this.isSpeakingNow = true;
        if (onStart) onStart();
      };

      const finish = () => {
        this.isSpeakingNow = false;
        if (onEnd) onEnd();
        resolve();
      };

      utterance.onend = finish;
      utterance.onerror = finish;

      window.speechSynthesis.speak(utterance);

      // Chrome/Safari timer fix: keep synthesis alive if utterance is long
      const interval = setInterval(() => {
        if (!this.isSpeakingNow) {
          clearInterval(interval);
        } else {
          window.speechSynthesis.pause();
          window.speechSynthesis.resume();
        }
      }, 10000);
    });
  }
}

export const speechService = new SpeechSynthesisService();
