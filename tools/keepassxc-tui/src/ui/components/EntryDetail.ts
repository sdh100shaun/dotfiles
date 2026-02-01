import * as blessed from 'blessed';
import type { LoginEntry } from '../../types';

export interface EntryDetailOptions {
  parent: blessed.Widgets.Screen;
}

export class EntryDetail {
  private box: blessed.Widgets.BoxElement;
  private entry: LoginEntry | null = null;
  private onCloseCallback?: () => void;
  private onCopyPasswordCallback?: (entry: LoginEntry) => void;
  private onCopyUsernameCallback?: (entry: LoginEntry) => void;
  private onCopyTotpCallback?: (entry: LoginEntry) => void;

  constructor(options: EntryDetailOptions) {
    this.box = blessed.box({
      parent: options.parent,
      top: 'center',
      left: 'center',
      width: '70%',
      height: '60%',
      border: {
        type: 'line',
      },
      label: ' Entry Details ',
      tags: true,
      keys: true,
      vi: true,
      scrollable: true,
      alwaysScroll: true,
      style: {
        border: {
          fg: 'cyan',
        },
        label: {
          fg: 'cyan',
          bold: true,
        },
      },
      hidden: true,
    });

    this.box.key(['escape', 'q'], () => {
      this.hide();
      if (this.onCloseCallback) {
        this.onCloseCallback();
      }
    });

    this.box.key(['p', 'c'], () => {
      if (this.entry && this.onCopyPasswordCallback) {
        this.onCopyPasswordCallback(this.entry);
      }
    });

    this.box.key('u', () => {
      if (this.entry && this.onCopyUsernameCallback) {
        this.onCopyUsernameCallback(this.entry);
      }
    });

    this.box.key('t', () => {
      if (this.entry && this.onCopyTotpCallback) {
        this.onCopyTotpCallback(this.entry);
      }
    });
  }

  show(entry: LoginEntry): void {
    this.entry = entry;
    this.render();
    this.box.show();
    this.box.focus();
    (this.box.screen as blessed.Widgets.Screen).render();
  }

  hide(): void {
    this.entry = null;
    this.box.hide();
    (this.box.screen as blessed.Widgets.Screen).render();
  }

  isVisible(): boolean {
    return !this.box.hidden;
  }

  private render(): void {
    if (!this.entry) return;

    const lines = [
      '',
      `  {bold}{cyan-fg}Name:{/cyan-fg}{/bold}     ${this.entry.name || 'N/A'}`,
      '',
      `  {bold}{cyan-fg}Username:{/cyan-fg}{/bold} ${this.entry.login || 'N/A'}`,
      '',
      `  {bold}{cyan-fg}Password:{/cyan-fg}{/bold} ${'●'.repeat(12)}`,
      '',
      `  {bold}{cyan-fg}Group:{/cyan-fg}{/bold}    ${this.entry.group || 'N/A'}`,
      '',
      `  {bold}{cyan-fg}UUID:{/cyan-fg}{/bold}     ${this.entry.uuid || 'N/A'}`,
      '',
    ];

    if (this.entry.stringFields && this.entry.stringFields.length > 0) {
      lines.push('  {bold}{cyan-fg}Custom Fields:{/cyan-fg}{/bold}');
      for (const field of this.entry.stringFields) {
        for (const [key, value] of Object.entries(field)) {
          lines.push(`    ${key}: ${value}`);
        }
      }
      lines.push('');
    }

    lines.push(
      '',
      '  ─────────────────────────────────────────',
      '',
      '  {bold}Shortcuts:{/bold}',
      '    {green-fg}p/c{/green-fg} - Copy password',
      '    {green-fg}u{/green-fg}   - Copy username',
      '    {green-fg}t{/green-fg}   - Copy TOTP',
      '    {green-fg}q{/green-fg}   - Close',
      ''
    );

    this.box.setContent(lines.join('\n'));
  }

  onClose(callback: () => void): void {
    this.onCloseCallback = callback;
  }

  onCopyPassword(callback: (entry: LoginEntry) => void): void {
    this.onCopyPasswordCallback = callback;
  }

  onCopyUsername(callback: (entry: LoginEntry) => void): void {
    this.onCopyUsernameCallback = callback;
  }

  onCopyTotp(callback: (entry: LoginEntry) => void): void {
    this.onCopyTotpCallback = callback;
  }

  getElement(): blessed.Widgets.BoxElement {
    return this.box;
  }
}
