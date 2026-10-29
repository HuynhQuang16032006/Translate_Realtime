import mqtt from 'mqtt';
import type { MqttClient } from 'mqtt';
import type { ConnectionStatus, MqttMessage, RoomLockState, TranslationMessage } from '../types';

export interface MqttServiceOptions {
  roomId: string;
  peerId: string;
  userName: string;
  onStatusChange: (status: ConnectionStatus) => void;
  onMessage: (msg: TranslationMessage) => void;
  onLockStateChange: (state: RoomLockState) => void;
}

export class MqttSyncService {
  private client: MqttClient | null = null;
  private options: MqttServiceOptions;
  private roomTopic: string;
  private lockState: RoomLockState = {
    isLocked: false,
    lockedBy: null,
    speakerName: null,
    lockedAt: null,
  };
  private safetyUnlockTimer: any = null;

  constructor(options: MqttServiceOptions) {
    this.options = options;
    // Room topic isolation using unique hash prefix
    this.roomTopic = `expotrans/rooms/v1_${options.roomId}`;
  }

  public connect(): void {
    const brokerUrl = 'wss://broker.emqx.io:8084/mqtt';
    const clientId = `expotrans_${this.options.peerId.slice(0, 8)}_${Math.random().toString(16).slice(2, 8)}`;

    this.options.onStatusChange('connecting');

    try {
      this.client = mqtt.connect(brokerUrl, {
        clientId,
        clean: true,
        connectTimeout: 8000,
        reconnectPeriod: 2500,
        keepalive: 30,
        rejectUnauthorized: false,
      });

      this.client.on('connect', () => {
        this.options.onStatusChange('connected');

        // Subscribe to room topics
        if (this.client) {
          this.client.subscribe(this.roomTopic, { qos: 1 }, (err) => {
            if (err) {
              console.error('Lỗi đăng ký topic MQTT:', err);
            }
          });
        }
      });

      this.client.on('reconnect', () => {
        this.options.onStatusChange('reconnecting');
      });

      this.client.on('close', () => {
        this.options.onStatusChange('disconnected');
      });

      this.client.on('error', (err) => {
        console.error('MQTT Client Error:', err);
        this.options.onStatusChange('error');
      });

      this.client.on('message', (_topic, messageBuffer) => {
        try {
          const raw = messageBuffer.toString();
          const parsed: MqttMessage = JSON.parse(raw);
          this.handleIncomingMessage(parsed);
        } catch (e) {
          console.error('Lỗi giải mã gói tin MQTT:', e);
        }
      });
    } catch (err) {
      console.error('Không thể kết nối broker MQTT:', err);
      this.options.onStatusChange('error');
    }
  }

  private handleIncomingMessage(msg: MqttMessage): void {
    switch (msg.type) {
      case 'LOCK_ROOM': {
        // Another peer is requesting to speak
        const incomingSender = msg.senderId;
        const incomingTimestamp = msg.timestamp;

        // Mutex Resolution: If both locked at the same time
        if (this.lockState.isLocked && this.lockState.lockedBy === this.options.peerId) {
          if (incomingSender !== this.options.peerId) {
            // Compare timestamps
            if (incomingTimestamp < (this.lockState.lockedAt || 0)) {
              // The incoming lock arrived first in time -> we yield
              this.applyLock(incomingSender, msg.senderName || 'Đối tác', incomingTimestamp);
            }
          }
        } else {
          this.applyLock(incomingSender, msg.senderName || 'Đối tác', incomingTimestamp);
        }
        break;
      }

      case 'UNLOCK_ROOM': {
        this.releaseLock();
        break;
      }

      case 'EMERGENCY_UNLOCK': {
        this.releaseLock();
        break;
      }

      case 'TRANSLATION': {
        if (msg.payload) {
          this.options.onMessage(msg.payload as TranslationMessage);
        }
        break;
      }

      default:
        break;
    }
  }

  private applyLock(peerId: string, speakerName: string, timestamp: number): void {
    this.lockState = {
      isLocked: true,
      lockedBy: peerId,
      speakerName,
      lockedAt: timestamp,
    };
    this.options.onLockStateChange({ ...this.lockState });

    // Safety timeout: Auto unlock after 15 seconds if holder disconnected abruptly
    if (this.safetyUnlockTimer) clearTimeout(this.safetyUnlockTimer);
    this.safetyUnlockTimer = setTimeout(() => {
      this.releaseLock();
    }, 15000);
  }

  public releaseLock(): void {
    if (this.safetyUnlockTimer) {
      clearTimeout(this.safetyUnlockTimer);
      this.safetyUnlockTimer = null;
    }
    this.lockState = {
      isLocked: false,
      lockedBy: null,
      speakerName: null,
      lockedAt: null,
    };
    this.options.onLockStateChange({ ...this.lockState });
  }

  /**
   * Broadcast LOCK_ROOM signal across all room participants
   */
  public broadcastLock(): boolean {
    if (this.lockState.isLocked && this.lockState.lockedBy !== this.options.peerId) {
      // Room is already locked by someone else
      return false;
    }

    const timestamp = Date.now();
    this.applyLock(this.options.peerId, this.options.userName, timestamp);

    const message: MqttMessage = {
      type: 'LOCK_ROOM',
      senderId: this.options.peerId,
      senderName: this.options.userName,
      timestamp,
    };

    this.publish(message);
    return true;
  }

  /**
   * Broadcast UNLOCK_ROOM signal
   */
  public broadcastUnlock(): void {
    this.releaseLock();

    const message: MqttMessage = {
      type: 'UNLOCK_ROOM',
      senderId: this.options.peerId,
      timestamp: Date.now(),
    };

    this.publish(message);
  }

  /**
   * Broadcast emergency unlock
   */
  public broadcastEmergencyUnlock(): void {
    this.releaseLock();

    const message: MqttMessage = {
      type: 'EMERGENCY_UNLOCK',
      senderId: this.options.peerId,
      timestamp: Date.now(),
    };

    this.publish(message);
  }

  /**
   * Broadcast translation result to the room
   */
  public broadcastTranslation(translation: TranslationMessage): void {
    const message: MqttMessage = {
      type: 'TRANSLATION',
      senderId: this.options.peerId,
      senderName: this.options.userName,
      timestamp: Date.now(),
      payload: translation,
    };

    this.publish(message);
  }

  private publish(msg: MqttMessage): void {
    if (this.client && this.client.connected) {
      this.client.publish(this.roomTopic, JSON.stringify(msg), { qos: 1 });
    }
  }

  public disconnect(): void {
    if (this.safetyUnlockTimer) {
      clearTimeout(this.safetyUnlockTimer);
    }
    if (this.client) {
      this.client.end(true);
      this.client = null;
    }
  }
}
