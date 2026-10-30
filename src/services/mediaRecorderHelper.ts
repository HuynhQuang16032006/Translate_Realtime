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

    // On iOS Safari, passing a timeslice (e.g. 250) to start() causes audio corruption or silence in WebKit
    const isIOS =
      typeof navigator !== 'undefined' &&
      (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

    if (isIOS) {
      this.mediaRecorder.start();
    } else {
      this.mediaRecorder.start(250);
    }
  }

  public isRecording(): boolean {
    return this.mediaRecorder?.state === 'recording';
  }

  public async stop(): Promise<AudioRecordResult | null> {
    if (!this.mediaRecorder || this.mediaRecorder.state !== 'recording') {
      return null;
    }

    const durationMs = Date.now() - this.startTime;

    return new Promise<AudioRecordResult | null>((resolve) => {
      if (!this.mediaRecorder) {
        return resolve(null);
      }

      this.mediaRecorder.onstop = async () => {
        if (this.recordedChunks.length === 0) {
          resolve(null);
          return;
        }

        const mime = this.selectedMimeType || this.mediaRecorder?.mimeType || 'audio/webm';
        const audioBlob = new Blob(this.recordedChunks, { type: mime });

        // Discard only if audio is practically empty (under 150ms or under 80 bytes)
        if (durationMs < 150 || audioBlob.size < 80) {
          resolve(null);
          return;
        }

        try {
          const base64 = await this.blobToBase64(audioBlob);
          resolve({
            audioBase64: base64,
            mimeType: mime,
            durationMs,
            blob: audioBlob,
          });
        } catch (err) {
          console.error('Lỗi chuyển đổi Blob sang Base64:', err);
          resolve(null);
        }
      };

      try {
        if (this.mediaRecorder.state === 'recording') {
          this.mediaRecorder.requestData();
        }
      } catch (e) {
        // Ignore if requestData not supported
      }

      try {
        this.mediaRecorder.stop();
      } catch (e) {
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
