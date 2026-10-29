export class WakeLockService {
  private wakeLock: any = null;
  private isSupported: boolean = false;

  constructor() {
    this.isSupported = typeof navigator !== 'undefined' && 'wakeLock' in navigator;
  }

  public async requestLock(): Promise<boolean> {
    if (!this.isSupported) {
      return false;
    }

    try {
      this.wakeLock = await (navigator as any).wakeLock.request('screen');
      this.wakeLock.addEventListener('release', () => {
        this.wakeLock = null;
      });

      // Automatically re-acquire when user returns to the tab
      document.addEventListener('visibilitychange', this.handleVisibilityChange);
      return true;
    } catch (err) {
      console.warn('Wake Lock không khả dụng hoặc bị từ chối:', err);
      return false;
    }
  }

  private handleVisibilityChange = async () => {
    if (this.wakeLock === null && document.visibilityState === 'visible') {
      await this.requestLock();
    }
  };

  public releaseLock(): void {
    if (this.wakeLock) {
      this.wakeLock.release().catch(() => {});
      this.wakeLock = null;
    }
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
  }
}

export const wakeLockService = new WakeLockService();
