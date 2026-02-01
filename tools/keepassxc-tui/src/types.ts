// KeePassXC Protocol Types

export interface KeyPair {
  publicKey: Uint8Array;
  secretKey: Uint8Array;
}

export interface AssociationConfig {
  id: string;
  idKey: string; // base64 encoded public key
  serverPublicKey: string; // base64 encoded
}

export interface KeePassXCMessage {
  action: string;
  message?: string;
  nonce?: string;
  clientID?: string;
  requestID?: string;
}

export interface KeePassXCResponse {
  action: string;
  nonce: string;
  version?: string;
  success?: string;
  error?: string;
  errorCode?: number;
}

export interface LoginEntry {
  login: string;
  name: string;
  password: string;
  uuid: string;
  group?: string;
  totp?: string;
  stringFields?: StringField[];
  expired?: string;
}

export interface StringField {
  [key: string]: string;
}

export interface GetLoginsResponse extends KeePassXCResponse {
  count: number;
  entries: LoginEntry[];
}

export interface DatabaseGroup {
  name: string;
  uuid: string;
  children?: DatabaseGroup[];
}

export interface GetDatabaseGroupsResponse extends KeePassXCResponse {
  groups: {
    groups: DatabaseGroup[];
  };
}

export interface GeneratePasswordResponse extends KeePassXCResponse {
  password: string;
}

export interface GetTotpResponse extends KeePassXCResponse {
  totp: string;
}

// TUI Types
export interface AppState {
  connected: boolean;
  associated: boolean;
  databaseUnlocked: boolean;
  currentView: ViewType;
  entries: LoginEntry[];
  selectedIndex: number;
  searchQuery: string;
  statusMessage: string;
  error: string | null;
}

export type ViewType = 'main' | 'search' | 'entry' | 'groups' | 'generate';

export interface UIConfig {
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    error: string;
    success: string;
    background: string;
    foreground: string;
  };
}

// Socket Communication Types
export type SocketType = 'unix' | 'windows';

export interface SocketConfig {
  type: SocketType;
  path: string;
}
