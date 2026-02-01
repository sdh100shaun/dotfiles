import { KeePassXCSocket } from './socket';
import {
  generateKeyPair,
  generateNonce,
  generateClientId,
  generateRequestId,
  encrypt,
  decrypt,
  incrementNonce,
  publicKeyToBase64,
  base64ToUint8Array,
  encodeBase64,
} from '../utils/crypto';
import { getAssociation, saveAssociation } from '../utils/config';
import type {
  KeyPair,
  AssociationConfig,
  KeePassXCResponse,
  LoginEntry,
  GetLoginsResponse,
  GetDatabaseGroupsResponse,
  GeneratePasswordResponse,
  GetTotpResponse,
  DatabaseGroup,
} from '../types';

export class KeePassXCClient {
  private socket: KeePassXCSocket;
  private clientKeyPair: KeyPair | null = null;
  private serverPublicKey: Uint8Array | null = null;
  private clientId: string | null = null;
  private association: AssociationConfig | null = null;
  private identificationKeyPair: KeyPair | null = null;
  private databaseHash: string | null = null;

  constructor(socketPath?: string) {
    this.socket = new KeePassXCSocket(socketPath);
  }

  async connect(): Promise<void> {
    await this.socket.connect();
    await this.exchangeKeys();
  }

  disconnect(): void {
    this.socket.disconnect();
    this.clientKeyPair = null;
    this.serverPublicKey = null;
    this.clientId = null;
  }

  isConnected(): boolean {
    return this.socket.isConnected() && this.serverPublicKey !== null;
  }

  private async exchangeKeys(): Promise<void> {
    this.clientKeyPair = generateKeyPair();
    this.clientId = generateClientId();

    const message = {
      action: 'change-public-keys',
      publicKey: publicKeyToBase64(this.clientKeyPair),
      nonce: encodeBase64(generateNonce()),
      clientID: this.clientId,
    };

    const response = await this.socket.sendAndReceive<{
      action: string;
      publicKey: string;
      success: string;
      version: string;
    }>(message);

    if (response.success !== 'true') {
      throw new Error('Failed to exchange public keys');
    }

    this.serverPublicKey = base64ToUint8Array(response.publicKey);
  }

  private async sendEncrypted<T extends KeePassXCResponse>(
    action: string,
    data: Record<string, unknown> = {}
  ): Promise<T> {
    if (!this.clientKeyPair || !this.serverPublicKey || !this.clientId) {
      throw new Error('Client not connected');
    }

    const nonce = generateNonce();
    const requestId = generateRequestId();

    const messageData = {
      action,
      ...data,
    };

    const encryptedMessage = encrypt(
      JSON.stringify(messageData),
      nonce,
      this.serverPublicKey,
      this.clientKeyPair.secretKey
    );

    const request = {
      action,
      message: encryptedMessage,
      nonce: encodeBase64(nonce),
      clientID: this.clientId,
      requestID: requestId,
    };

    const response = await this.socket.sendAndReceive<{
      action: string;
      message?: string;
      nonce?: string;
      error?: string;
      errorCode?: number;
    }>(request);

    if (response.error) {
      throw new Error(`KeePassXC error: ${response.error} (code: ${response.errorCode})`);
    }

    if (!response.message || !response.nonce) {
      throw new Error('Invalid response from KeePassXC');
    }

    const responseNonce = base64ToUint8Array(response.nonce);
    const decryptedMessage = decrypt(
      response.message,
      responseNonce,
      this.serverPublicKey,
      this.clientKeyPair.secretKey
    );

    return JSON.parse(decryptedMessage) as T;
  }

  async getDatabaseHash(): Promise<string> {
    const response = await this.sendEncrypted<KeePassXCResponse & { hash: string }>(
      'get-databasehash'
    );
    this.databaseHash = response.hash;
    return response.hash;
  }

  async associate(displayName: string = 'KeePassXC-TUI'): Promise<void> {
    this.identificationKeyPair = generateKeyPair();

    const response = await this.sendEncrypted<KeePassXCResponse & { id: string }>(
      'associate',
      {
        key: publicKeyToBase64(this.clientKeyPair!),
        idKey: publicKeyToBase64(this.identificationKeyPair),
      }
    );

    if (!response.id) {
      throw new Error('Association failed: no ID returned');
    }

    const hash = await this.getDatabaseHash();

    this.association = {
      id: response.id,
      idKey: publicKeyToBase64(this.identificationKeyPair),
      serverPublicKey: encodeBase64(this.serverPublicKey!),
    };

    saveAssociation(hash, this.association);
  }

  async testAssociate(): Promise<boolean> {
    if (!this.databaseHash) {
      await this.getDatabaseHash();
    }

    const savedAssociation = getAssociation(this.databaseHash!);
    if (!savedAssociation) {
      return false;
    }

    try {
      const response = await this.sendEncrypted<KeePassXCResponse & { id: string }>(
        'test-associate',
        {
          id: savedAssociation.id,
          key: savedAssociation.idKey,
        }
      );

      if (response.success === 'true' || response.id === savedAssociation.id) {
        this.association = savedAssociation;
        return true;
      }
    } catch {
      return false;
    }

    return false;
  }

  async ensureAssociated(): Promise<void> {
    const isAssociated = await this.testAssociate();
    if (!isAssociated) {
      await this.associate();
    }
  }

  async getLogins(url: string, submitUrl?: string): Promise<LoginEntry[]> {
    await this.ensureAssociated();

    const response = await this.sendEncrypted<GetLoginsResponse>('get-logins', {
      url,
      submitUrl: submitUrl || url,
      keys: [
        {
          id: this.association!.id,
          key: this.association!.idKey,
        },
      ],
    });

    return response.entries || [];
  }

  async searchLogins(searchTerm: string): Promise<LoginEntry[]> {
    // KeePassXC doesn't have a direct search API, so we use URL-based lookup
    // Using the search term as a URL pattern
    return this.getLogins(searchTerm);
  }

  async getDatabaseGroups(): Promise<DatabaseGroup[]> {
    await this.ensureAssociated();

    const response = await this.sendEncrypted<GetDatabaseGroupsResponse>('get-database-groups');

    return response.groups?.groups || [];
  }

  async generatePassword(): Promise<string> {
    const response = await this.sendEncrypted<GeneratePasswordResponse>('generate-password');
    return response.password;
  }

  async getTotp(uuid: string): Promise<string> {
    await this.ensureAssociated();

    const response = await this.sendEncrypted<GetTotpResponse>('get-totp', {
      uuid,
    });

    return response.totp;
  }

  async lockDatabase(): Promise<void> {
    await this.sendEncrypted('lock-database');
  }

  async setLogin(
    url: string,
    login: string,
    password: string,
    group?: string,
    groupUuid?: string,
    uuid?: string
  ): Promise<void> {
    await this.ensureAssociated();

    await this.sendEncrypted('set-login', {
      url,
      submitUrl: url,
      login,
      password,
      group: group || '',
      groupUuid: groupUuid || '',
      uuid: uuid || '',
    });
  }

  async createGroup(groupName: string): Promise<{ name: string; uuid: string }> {
    await this.ensureAssociated();

    const response = await this.sendEncrypted<KeePassXCResponse & { name: string; uuid: string }>(
      'create-new-group',
      {
        groupName,
      }
    );

    return { name: response.name, uuid: response.uuid };
  }

  getAssociationInfo(): AssociationConfig | null {
    return this.association;
  }
}
