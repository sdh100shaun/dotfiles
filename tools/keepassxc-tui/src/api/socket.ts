import * as net from 'net';
import { EventEmitter } from 'events';
import { getSocketPath } from '../utils/config';

export class KeePassXCSocket extends EventEmitter {
  private socket: net.Socket | null = null;
  private socketPath: string;
  private buffer: string = '';
  private connected: boolean = false;

  constructor(socketPath?: string) {
    super();
    this.socketPath = socketPath || getSocketPath();
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket = new net.Socket();

      const timeout = setTimeout(() => {
        this.socket?.destroy();
        reject(new Error('Connection timeout'));
      }, 5000);

      this.socket.on('connect', () => {
        clearTimeout(timeout);
        this.connected = true;
        this.emit('connect');
        resolve();
      });

      this.socket.on('data', (data: Buffer) => {
        this.handleData(data);
      });

      this.socket.on('error', (err: Error) => {
        clearTimeout(timeout);
        this.connected = false;
        this.emit('error', err);
        reject(err);
      });

      this.socket.on('close', () => {
        this.connected = false;
        this.emit('close');
      });

      this.socket.connect(this.socketPath);
    });
  }

  private handleData(data: Buffer): void {
    this.buffer += data.toString('utf-8');

    // Try to parse complete JSON messages
    let startIndex = 0;
    let braceCount = 0;
    let inString = false;
    let escaped = false;

    for (let i = 0; i < this.buffer.length; i++) {
      const char = this.buffer[i];

      if (escaped) {
        escaped = false;
        continue;
      }

      if (char === '\\') {
        escaped = true;
        continue;
      }

      if (char === '"') {
        inString = !inString;
        continue;
      }

      if (inString) continue;

      if (char === '{') {
        if (braceCount === 0) startIndex = i;
        braceCount++;
      } else if (char === '}') {
        braceCount--;
        if (braceCount === 0) {
          const jsonStr = this.buffer.substring(startIndex, i + 1);
          try {
            const message = JSON.parse(jsonStr);
            this.emit('message', message);
          } catch {
            this.emit('error', new Error('Failed to parse JSON message'));
          }
          this.buffer = this.buffer.substring(i + 1);
          i = -1; // Reset loop
          startIndex = 0;
        }
      }
    }
  }

  async send(message: object): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.socket || !this.connected) {
        reject(new Error('Socket not connected'));
        return;
      }

      const data = JSON.stringify(message);
      this.socket.write(data, 'utf-8', (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  async sendAndReceive<T>(message: object, timeoutMs: number = 10000): Promise<T> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.removeListener('message', messageHandler);
        reject(new Error('Response timeout'));
      }, timeoutMs);

      const messageHandler = (response: T) => {
        clearTimeout(timeout);
        this.removeListener('message', messageHandler);
        resolve(response);
      };

      this.once('message', messageHandler);

      this.send(message).catch((err) => {
        clearTimeout(timeout);
        this.removeListener('message', messageHandler);
        reject(err);
      });
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.destroy();
      this.socket = null;
      this.connected = false;
      this.buffer = '';
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  getSocketPath(): string {
    return this.socketPath;
  }
}
