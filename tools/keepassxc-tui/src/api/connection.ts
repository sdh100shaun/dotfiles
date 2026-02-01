import { KeePassXCClient } from './client';
import { EventEmitter } from 'events';

export interface ConnectionManagerOptions {
  maxRetries?: number;
  retryDelayMs?: number;
  autoReconnect?: boolean;
}

export class ConnectionManager extends EventEmitter {
  private client: KeePassXCClient;
  private maxRetries: number;
  private retryDelayMs: number;
  private autoReconnect: boolean;
  private connected: boolean = false;
  private reconnecting: boolean = false;

  constructor(options: ConnectionManagerOptions = {}) {
    super();
    this.client = new KeePassXCClient();
    this.maxRetries = options.maxRetries ?? 3;
    this.retryDelayMs = options.retryDelayMs ?? 2000;
    this.autoReconnect = options.autoReconnect ?? true;
  }

  async connect(): Promise<boolean> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        this.emit('connecting', { attempt, maxRetries: this.maxRetries });
        await this.client.connect();
        this.connected = true;
        this.emit('connected');
        return true;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        this.emit('connection-failed', { attempt, error: lastError });

        if (attempt < this.maxRetries) {
          this.emit('retrying', { attempt, delay: this.retryDelayMs });
          await this.delay(this.retryDelayMs);
        }
      }
    }

    this.connected = false;
    this.emit('failed', { error: lastError });
    return false;
  }

  async reconnect(): Promise<boolean> {
    if (this.reconnecting) return false;

    this.reconnecting = true;
    this.emit('reconnecting');

    try {
      this.client.disconnect();
      const result = await this.connect();
      return result;
    } finally {
      this.reconnecting = false;
    }
  }

  async ensureConnected(): Promise<boolean> {
    if (this.connected && this.client.isConnected()) {
      return true;
    }

    if (this.autoReconnect) {
      return await this.reconnect();
    }

    return false;
  }

  getClient(): KeePassXCClient {
    return this.client;
  }

  isConnected(): boolean {
    return this.connected && this.client.isConnected();
  }

  disconnect(): void {
    this.connected = false;
    this.client.disconnect();
    this.emit('disconnected');
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
