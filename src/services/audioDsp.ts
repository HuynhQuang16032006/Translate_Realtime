export interface DspConfig {
  thresholdDb: number;        // Threshold in dB to trigger voice (e.g., -38 dB)
  silenceTimeoutMs: number;   // How long silence lasts before ending sentence (e.g., 1200 ms)
  onVoiceStart?: () => void;
  onVoiceEnd?: () => void;
  onAudioLevel?: (db: number, normalized: number) => void;
}

export class AudioDspEngine {
  private audioCtx: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private highpassFilter: BiquadFilterNode | null = null;
  private bandpassFilter: BiquadFilterNode | null = null;
  private analyserNode: AnalyserNode | null = null;

  private isRunning: boolean = false;
  private isVoiceActive: boolean = false;
  private silenceTimer: any = null;
  private animFrameId: number | null = null;

  private config: DspConfig = {
    thresholdDb: -40,
    silenceTimeoutMs: 1200,
  };

  constructor(config?: Partial<DspConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }
  }

  public updateConfig(newConfig: Partial<DspConfig>) {
    this.config = { ...this.config, ...newConfig };
  }

  public getThreshold(): number {
    return this.config.thresholdDb;
  }

  public async init(stream: MediaStream): Promise<void> {
    this.mediaStream = stream;

    // Cross-browser AudioContext initialization
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) {
      throw new Error('Web Audio API không được trình duyệt này hỗ trợ.');
    }

    this.audioCtx = new AudioContextClass();

    if (this.audioCtx.state === 'suspended') {
      await this.audioCtx.resume();
    }

    // 1. Source Node from User Mic
    this.sourceNode = this.audioCtx.createMediaStreamSource(this.mediaStream);

    // 2. Highpass Filter (Cut industrial machine rumble < 120Hz)
    this.highpassFilter = this.audioCtx.createBiquadFilter();
    this.highpassFilter.type = 'highpass';
    this.highpassFilter.frequency.value = 120;

    // 3. Peaking / Bandpass Filter (Boost & isolate human speech frequencies 300Hz - 3400Hz)
    this.bandpassFilter = this.audioCtx.createBiquadFilter();
    this.bandpassFilter.type = 'peaking';
    this.bandpassFilter.frequency.value = 1500;
    this.bandpassFilter.Q.value = 0.8;
    this.bandpassFilter.gain.value = 3;

    // 4. Analyser Node for Realtime dB metering & VAD
    this.analyserNode = this.audioCtx.createAnalyser();
    this.analyserNode.fftSize = 512;
    this.analyserNode.smoothingTimeConstant = 0.3;

    // Connect DSP chain (Does NOT connect to audioCtx.destination to prevent speaker feedback loop)
    this.sourceNode
      .connect(this.highpassFilter)
      .connect(this.bandpassFilter)
      .connect(this.analyserNode);

    this.isRunning = true;
    this.startAnalysisLoop();
  }

  private startAnalysisLoop(): void {
    if (!this.analyserNode) return;

    const bufferLength = this.analyserNode.fftSize;
    const dataArray = new Float32Array(bufferLength);

    const checkLevel = () => {
      if (!this.isRunning || !this.analyserNode) return;

      this.analyserNode.getFloatTimeDomainData(dataArray);

      // Compute Root Mean Square (RMS)
      let sumSquares = 0;
      for (let i = 0; i < bufferLength; i++) {
        sumSquares += dataArray[i] * dataArray[i];
      }
      const rms = Math.sqrt(sumSquares / bufferLength);

      // Convert RMS to Decibels (dB), clamp -100dB to 0dB
      const db = rms > 0.00001 ? 20 * Math.log10(rms) : -100;

      // Normalized 0 to 100 for UI Meter
      const normalized = Math.min(100, Math.max(0, ((db + 80) / 80) * 100));

      if (this.config.onAudioLevel) {
        this.config.onAudioLevel(db, normalized);
      }

      // Check VAD state
      if (db >= this.config.thresholdDb) {
        // Voice is above proximity gate threshold
        if (this.silenceTimer) {
          clearTimeout(this.silenceTimer);
          this.silenceTimer = null;
        }

        if (!this.isVoiceActive) {
          this.isVoiceActive = true;
          if (this.config.onVoiceStart) {
            this.config.onVoiceStart();
          }
        }
      } else {
        // Voice is below threshold
        if (this.isVoiceActive && !this.silenceTimer) {
          this.silenceTimer = setTimeout(() => {
            if (this.isVoiceActive) {
              this.isVoiceActive = false;
              if (this.config.onVoiceEnd) {
                this.config.onVoiceEnd();
              }
            }
            this.silenceTimer = null;
          }, this.config.silenceTimeoutMs);
        }
      }

      this.animFrameId = requestAnimationFrame(checkLevel);
    };

    this.animFrameId = requestAnimationFrame(checkLevel);
  }

  /**
   * Measure ambient background noise over 2.5 seconds
   * Returns recommended threshold (average ambient dB + 8dB)
   */
  public async calibrateNoiseFloor(): Promise<number> {
    if (!this.analyserNode) return -40;

    const samples: number[] = [];
    const bufferLength = this.analyserNode.fftSize;
    const dataArray = new Float32Array(bufferLength);

    return new Promise<number>((resolve) => {
      const startTime = Date.now();
      const interval = setInterval(() => {
        if (!this.analyserNode) return;
        this.analyserNode.getFloatTimeDomainData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i] * dataArray[i];
        }
        const rms = Math.sqrt(sum / bufferLength);
        const db = rms > 0.00001 ? 20 * Math.log10(rms) : -100;
        samples.push(db);

        if (Date.now() - startTime >= 2500) {
          clearInterval(interval);
          // Average the highest 50% samples of the noise floor
          samples.sort((a, b) => b - a);
          const topSamples = samples.slice(0, Math.floor(samples.length / 2));
          const avgNoise = topSamples.reduce((a, b) => a + b, 0) / (topSamples.length || 1);
          // Gate threshold is noise floor + 7dB
          const recommended = Math.min(-20, Math.max(-65, Math.round(avgNoise + 7)));
          this.config.thresholdDb = recommended;
          resolve(recommended);
        }
      }, 50);
    });
  }

  public stop(): void {
    this.isRunning = false;
    this.isVoiceActive = false;

    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }

    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }
    if (this.highpassFilter) {
      this.highpassFilter.disconnect();
      this.highpassFilter = null;
    }
    if (this.bandpassFilter) {
      this.bandpassFilter.disconnect();
      this.bandpassFilter = null;
    }
    if (this.analyserNode) {
      this.analyserNode.disconnect();
      this.analyserNode = null;
    }
    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      this.audioCtx.close().catch(() => {});
      this.audioCtx = null;
    }
  }
}
