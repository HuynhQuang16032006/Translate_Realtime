export interface AudioRecordResult {
  audioBase64: string;
  mimeType: string;
  durationMs: number;
  blob?: Blob;
}

export class CrossBrowserAudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private selectedMimeType: string = '';
  private startTime: number = 0;

  constructor() {
    this.selectedMimeType = this.detectSupportedMimeType();
  }

  public getMimeType(): string {
    return this.selectedMimeType;
  }

  private detectSupportedMimeType(): string {
    if (typeof MediaRecorder === 'undefined') {
      return '';
    }

    const preferredTypes = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/aac',
      'audio/ogg;codecs=opus',
      'audio/wav',
    ];

    for (const type of preferredTypes) {
      try {
        if (MediaRecorder.isTypeSupported(type)) {
          return type;
        }
      } catch (e) {
        // Continue checking next type
      }
    }

    return '';
  }

  public start(stream: MediaStream): void {
    if (this.mediaRecorder) {
      try {
        this.mediaRecorder.ondataavailable = null;
        this.mediaRecorder.onstop = null;
        if (this.mediaRecorder.state !== 'inactive') {
          this.mediaRecorder.stop();
        }
      } catch (e) {}
      this.mediaRecorder = null;
    }

    this.recordedChunks = [];
    this.startTime = Date.now();

    const options: MediaRecorderOptions = {};
    if (this.selectedMimeType) {
      options.mimeType = this.selectedMimeType;
    }

    try {
      this.mediaRecorder = new MediaRecorder(stream, options);
    } catch (e) {
      // Fallback without options if browser failed on specified mimeType
      this.mediaRecorder = new MediaRecorder(stream);
    }

    this.mediaRecorder.ondataavailable = (event: BlobEvent) => {
      if (event.data && event.data.size > 0) {
        this.recordedChunks.push(event.data);
      }
    };

    const isIOS =
      typeof navigator !== 'undefined' &&
      (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

    // Use 500ms timeslice on iOS Safari and 250ms on desktop to force periodic chunk delivery
    this.mediaRecorder.start(isIOS ? 500 : 250);
  }

  public isRecording(): boolean {
    return this.mediaRecorder?.state === 'recording';
  }

  public reset(): void {
    if (this.mediaRecorder) {
      try {
        this.mediaRecorder.ondataavailable = null;
        this.mediaRecorder.onstop = null;
        if (this.mediaRecorder.state !== 'inactive') {
          this.mediaRecorder.stop();
        }
      } catch (e) {}
      this.mediaRecorder = null;
    }
    this.recordedChunks = [];
    this.startTime = 0;
  }

  public async stop(): Promise<AudioRecordResult | null> {
    if (!this.mediaRecorder || this.mediaRecorder.state !== 'recording') {
      return null;
    }

    const durationMs = Date.now() - this.startTime;
    const currentRecorder = this.mediaRecorder;

    return new Promise<AudioRecordResult | null>((resolve) => {
      currentRecorder.onstop = async () => {
        // Asynchronous WebKit flush: give Safari up to 200ms to deliver final ondataavailable event
        if (this.recordedChunks.length === 0) {
          await new Promise((r) => setTimeout(r, 200));
        }

        if (this.recordedChunks.length === 0) {
          console.warn('MediaRecorder stopped with 0 chunks collected.');
          this.mediaRecorder = null;
          resolve(null);
          return;
        }

        const mime = this.selectedMimeType || currentRecorder?.mimeType || 'audio/webm';
        const audioBlob = new Blob(this.recordedChunks, { type: mime });

        // Discard only if practically empty (under 100ms or under 50 bytes)
        if (durationMs < 100 || audioBlob.size < 50) {
          console.warn('Audio blob discarded: too short or empty.', { durationMs, size: audioBlob.size });
          this.mediaRecorder = null;
          resolve(null);
          return;
        }

        try {
          const base64 = await this.blobToBase64(audioBlob);
          this.mediaRecorder = null;
          resolve({
            audioBase64: base64,
            mimeType: mime,
            durationMs,
            blob: audioBlob,
          });
        } catch (err) {
          console.error('Lỗi chuyển đổi Blob sang Base64:', err);
          this.mediaRecorder = null;
          resolve(null);
        }
      };

      try {
        if (currentRecorder.state === 'recording') {
          currentRecorder.requestData();
        }
      } catch (e) {
        // Ignore if requestData not supported
      }

      try {
        currentRecorder.stop();
      } catch (e) {
        this.mediaRecorder = null;
        resolve(null);
      }
    });
  }

  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        // Strip out `data:audio/...;base64,` header for Gemini API
        const base64 = result.split(',')[1] || result;
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
}
