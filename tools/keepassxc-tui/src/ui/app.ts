import * as blessed from 'blessed';
import { KeePassXCClient } from '../api';
import {
  StatusBar,
  EntryList,
  SearchInput,
  EntryDetail,
  Header,
  MessageDialog,
} from './components';
import type { AppState, ViewType, LoginEntry } from '../types';
import { copyToClipboard } from '../utils/clipboard';

export class App {
  private state: AppState;
  private running: boolean = false;
  private screen: blessed.Widgets.Screen | null = null;
  private client: KeePassXCClient;

  // UI Components
  private header: Header | null = null;
  private statusBar: StatusBar | null = null;
  private entryList: EntryList | null = null;
  private searchInput: SearchInput | null = null;
  private entryDetail: EntryDetail | null = null;
  private messageDialog: MessageDialog | null = null;

  constructor() {
    this.state = {
      connected: false,
      associated: false,
      databaseUnlocked: false,
      currentView: 'main',
      entries: [],
      selectedIndex: 0,
      searchQuery: '',
      statusMessage: 'Initializing...',
      error: null,
    };

    this.client = new KeePassXCClient();
  }

  async run(): Promise<void> {
    this.running = true;
    this.initScreen();
    this.initComponents();
    this.bindGlobalKeys();
    await this.connect();
    this.screen?.render();
  }

  private initScreen(): void {
    this.screen = blessed.screen({
      smartCSR: true,
      title: 'KeePassXC TUI',
      cursor: {
        artificial: true,
        shape: 'line',
        blink: true,
        color: null,
      },
    });
  }

  private initComponents(): void {
    if (!this.screen) return;

    this.header = new Header({ parent: this.screen });
    this.statusBar = new StatusBar({ parent: this.screen });
    this.entryList = new EntryList({ parent: this.screen });
    this.searchInput = new SearchInput({ parent: this.screen });
    this.entryDetail = new EntryDetail({ parent: this.screen });
    this.messageDialog = new MessageDialog({ parent: this.screen });

    // Set up entry list callbacks
    this.entryList.onSelect((entry) => {
      this.showEntryDetail(entry);
    });

    // Set up search callbacks
    this.searchInput.onSearch(async (query) => {
      await this.search(query);
      this.entryList?.focus();
    });

    this.searchInput.onCancel(() => {
      this.entryList?.focus();
    });

    // Set up entry detail callbacks
    this.entryDetail.onClose(() => {
      this.entryList?.focus();
    });

    this.entryDetail.onCopyPassword(async (entry) => {
      await this.copyPassword(entry);
    });

    this.entryDetail.onCopyUsername(async (entry) => {
      await this.copyUsername(entry);
    });

    this.entryDetail.onCopyTotp(async (entry) => {
      await this.copyTotp(entry);
    });

    // Set up message dialog callback
    this.messageDialog.onClose(() => {
      this.entryList?.focus();
    });

    // Focus entry list by default
    this.entryList.focus();
  }

  private bindGlobalKeys(): void {
    if (!this.screen) return;

    // Quit
    this.screen.key(['q', 'C-c'], () => {
      if (this.entryDetail?.isVisible()) return;
      if (this.searchInput?.isVisible()) return;
      if (this.messageDialog?.isVisible()) return;
      this.shutdown();
      process.exit(0);
    });

    // Search
    this.screen.key('/', () => {
      if (this.entryDetail?.isVisible()) return;
      if (this.messageDialog?.isVisible()) return;
      this.searchInput?.show();
    });

    // Copy password (quick)
    this.screen.key('c', async () => {
      if (this.entryDetail?.isVisible()) return;
      if (this.searchInput?.isVisible()) return;
      if (this.messageDialog?.isVisible()) return;
      const entry = this.entryList?.getSelectedEntry();
      if (entry) {
        await this.copyPassword(entry);
      }
    });

    // Copy TOTP (quick)
    this.screen.key('t', async () => {
      if (this.entryDetail?.isVisible()) return;
      if (this.searchInput?.isVisible()) return;
      if (this.messageDialog?.isVisible()) return;
      const entry = this.entryList?.getSelectedEntry();
      if (entry) {
        await this.copyTotp(entry);
      }
    });

    // Refresh
    this.screen.key('r', async () => {
      if (this.entryDetail?.isVisible()) return;
      if (this.searchInput?.isVisible()) return;
      if (this.messageDialog?.isVisible()) return;
      await this.refresh();
    });

    // Lock database
    this.screen.key('l', async () => {
      if (this.entryDetail?.isVisible()) return;
      if (this.searchInput?.isVisible()) return;
      if (this.messageDialog?.isVisible()) return;
      await this.lockDatabase();
    });

    // Generate password
    this.screen.key('g', async () => {
      if (this.entryDetail?.isVisible()) return;
      if (this.searchInput?.isVisible()) return;
      if (this.messageDialog?.isVisible()) return;
      await this.generatePassword();
    });
  }

  private async connect(): Promise<void> {
    this.statusBar?.setMessage('Connecting to KeePassXC...');
    this.screen?.render();

    try {
      await this.client.connect();
      this.state.connected = true;
      this.statusBar?.setConnected(true);
      this.statusBar?.setMessage('Connected. Checking association...');
      this.screen?.render();

      await this.client.ensureAssociated();
      this.state.associated = true;
      this.statusBar?.setMessage('Ready');
      this.screen?.render();
    } catch (error) {
      this.state.connected = false;
      this.statusBar?.setConnected(false);
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.statusBar?.setMessage(`Connection failed: ${message}`);
      this.messageDialog?.show(
        `Failed to connect to KeePassXC: ${message}. Make sure KeePassXC is running with browser integration enabled.`,
        'error',
        'Connection Error'
      );
      this.screen?.render();
    }
  }

  private async search(query: string): Promise<void> {
    if (!this.state.connected) {
      this.messageDialog?.show('Not connected to KeePassXC', 'error');
      return;
    }

    this.state.searchQuery = query;
    this.statusBar?.setMessage(`Searching for "${query}"...`);
    this.screen?.render();

    try {
      const entries = await this.client.getLogins(query);
      this.state.entries = entries;
      this.entryList?.setEntries(entries);
      this.statusBar?.setMessage(`Found ${entries.length} entries`);
      this.screen?.render();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.statusBar?.setMessage(`Search failed: ${message}`);
      this.messageDialog?.show(`Search failed: ${message}`, 'error');
      this.screen?.render();
    }
  }

  private showEntryDetail(entry: LoginEntry): void {
    this.entryDetail?.show(entry);
  }

  private async copyPassword(entry: LoginEntry): Promise<void> {
    try {
      await copyToClipboard(entry.password);
      this.statusBar?.setMessage('Password copied to clipboard');
      this.messageDialog?.show('Password copied to clipboard!', 'success');
      this.screen?.render();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.messageDialog?.show(`Failed to copy: ${message}`, 'error');
      this.screen?.render();
    }
  }

  private async copyUsername(entry: LoginEntry): Promise<void> {
    try {
      await copyToClipboard(entry.login);
      this.statusBar?.setMessage('Username copied to clipboard');
      this.messageDialog?.show('Username copied to clipboard!', 'success');
      this.screen?.render();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.messageDialog?.show(`Failed to copy: ${message}`, 'error');
      this.screen?.render();
    }
  }

  private async copyTotp(entry: LoginEntry): Promise<void> {
    try {
      const totp = await this.client.getTotp(entry.uuid);
      await copyToClipboard(totp);
      this.statusBar?.setMessage('TOTP copied to clipboard');
      this.messageDialog?.show(`TOTP copied: ${totp}`, 'success');
      this.screen?.render();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.messageDialog?.show(`Failed to get TOTP: ${message}`, 'error');
      this.screen?.render();
    }
  }

  private async refresh(): Promise<void> {
    if (this.state.searchQuery) {
      await this.search(this.state.searchQuery);
    }
  }

  private async lockDatabase(): Promise<void> {
    try {
      await this.client.lockDatabase();
      this.state.entries = [];
      this.entryList?.setEntries([]);
      this.statusBar?.setMessage('Database locked');
      this.messageDialog?.show('Database has been locked', 'info');
      this.screen?.render();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.messageDialog?.show(`Failed to lock: ${message}`, 'error');
      this.screen?.render();
    }
  }

  private async generatePassword(): Promise<void> {
    try {
      const password = await this.client.generatePassword();
      await copyToClipboard(password);
      this.statusBar?.setMessage('Generated password copied to clipboard');
      this.messageDialog?.show(
        `Generated password copied to clipboard!\n\n  ${password}`,
        'success',
        'Password Generated'
      );
      this.screen?.render();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.messageDialog?.show(`Failed to generate: ${message}`, 'error');
      this.screen?.render();
    }
  }

  shutdown(): void {
    this.running = false;
    this.client.disconnect();
    this.screen?.destroy();
  }

  getState(): AppState {
    return { ...this.state };
  }

  setView(view: ViewType): void {
    this.state.currentView = view;
  }
}
