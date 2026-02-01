import * as blessed from 'blessed';
import { styles } from '../theme';
import type { LoginEntry } from '../../types';

export interface EntryListOptions {
  parent: blessed.Widgets.Screen;
}

export class EntryList {
  private list: blessed.Widgets.ListElement;
  private entries: LoginEntry[] = [];
  private onSelectCallback?: (entry: LoginEntry) => void;

  constructor(options: EntryListOptions) {
    this.list = blessed.list({
      parent: options.parent,
      top: 3,
      left: 0,
      width: '100%',
      height: '100%-5',
      tags: true,
      keys: true,
      vi: true,
      mouse: true,
      scrollable: true,
      alwaysScroll: true,
      border: {
        type: 'line',
      },
      label: ' Entries ',
      ...styles.list,
      style: {
        ...styles.list.style,
        border: {
          fg: 'blue',
        },
        label: {
          fg: 'green',
          bold: true,
        },
      },
    });

    this.list.on('select', (_item, index) => {
      if (this.onSelectCallback && this.entries[index]) {
        this.onSelectCallback(this.entries[index]);
      }
    });
  }

  setEntries(entries: LoginEntry[]): void {
    this.entries = entries;
    const items = entries.map((entry, index) => {
      const name = entry.name || 'Unnamed';
      const login = entry.login || '';
      const group = entry.group ? `[${entry.group}]` : '';
      return `${(index + 1).toString().padStart(3)}. ${name.padEnd(30)} ${login.padEnd(25)} ${group}`;
    });

    this.list.setItems(items);
  }

  onSelect(callback: (entry: LoginEntry) => void): void {
    this.onSelectCallback = callback;
  }

  focus(): void {
    this.list.focus();
  }

  getElement(): blessed.Widgets.ListElement {
    return this.list;
  }

  getSelectedIndex(): number {
    return this.list.selected || 0;
  }

  getSelectedEntry(): LoginEntry | null {
    const index = this.getSelectedIndex();
    return this.entries[index] || null;
  }

  selectNext(): void {
    this.list.down(1);
  }

  selectPrevious(): void {
    this.list.up(1);
  }

  getEntries(): LoginEntry[] {
    return this.entries;
  }
}
