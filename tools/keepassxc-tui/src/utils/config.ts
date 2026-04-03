import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import type { AssociationConfig } from '../types';

const CONFIG_DIR = path.join(os.homedir(), '.config', 'keepassxc-tui');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

interface Config {
  associations: { [databaseHash: string]: AssociationConfig };
  lastDatabase?: string;
}

function ensureConfigDir(): void {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
  }
}

export function loadConfig(): Config {
  ensureConfigDir();

  if (!fs.existsSync(CONFIG_FILE)) {
    return { associations: {} };
  }

  try {
    const data = fs.readFileSync(CONFIG_FILE, 'utf-8');
    return JSON.parse(data) as Config;
  } catch {
    return { associations: {} };
  }
}

export function saveConfig(config: Config): void {
  ensureConfigDir();
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), {
    mode: 0o600,
  });
}

export function getAssociation(databaseHash: string): AssociationConfig | null {
  const config = loadConfig();
  return config.associations[databaseHash] || null;
}

export function saveAssociation(
  databaseHash: string,
  association: AssociationConfig
): void {
  const config = loadConfig();
  config.associations[databaseHash] = association;
  config.lastDatabase = databaseHash;
  saveConfig(config);
}

export function getSocketPath(): string {
  const platform = os.platform();

  if (platform === 'win32') {
    // Windows named pipe
    return '\\\\.\\pipe\\keepassxc_browser';
  } else if (platform === 'darwin') {
    // macOS
    const tmpDir = process.env.TMPDIR || '/tmp';
    return path.join(tmpDir, 'org.keepassxc.KeePassXC.BrowserServer');
  } else {
    // Linux and others
    const xdgRuntime = process.env.XDG_RUNTIME_DIR || `/run/user/${process.getuid?.() || 1000}`;
    return path.join(xdgRuntime, 'org.keepassxc.KeePassXC.BrowserServer');
  }
}
