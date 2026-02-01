import * as blessed from 'blessed';
import type { DatabaseGroup } from '../../types';

export interface GroupBrowserOptions {
  parent: blessed.Widgets.Screen;
}

export class GroupBrowser {
  private box: blessed.Widgets.BoxElement;
  private list: blessed.Widgets.ListElement;
  private groups: DatabaseGroup[] = [];
  private flatGroups: { group: DatabaseGroup; depth: number }[] = [];
  private onSelectCallback?: (group: DatabaseGroup) => void;
  private onCloseCallback?: () => void;

  constructor(options: GroupBrowserOptions) {
    this.box = blessed.box({
      parent: options.parent,
      top: 'center',
      left: 'center',
      width: '60%',
      height: '70%',
      border: {
        type: 'line',
      },
      label: ' Database Groups ',
      tags: true,
      keys: true,
      style: {
        border: {
          fg: 'magenta',
        },
        label: {
          fg: 'magenta',
          bold: true,
        },
      },
      hidden: true,
    });

    this.list = blessed.list({
      parent: this.box,
      top: 1,
      left: 1,
      width: '100%-4',
      height: '100%-4',
      tags: true,
      keys: true,
      vi: true,
      mouse: true,
      scrollable: true,
      alwaysScroll: true,
      style: {
        selected: {
          bg: 'magenta',
          fg: 'white',
          bold: true,
        },
        item: {
          fg: 'white',
        },
      },
    });

    this.list.on('select', (_item, index) => {
      if (this.onSelectCallback && this.flatGroups[index]) {
        this.onSelectCallback(this.flatGroups[index].group);
      }
    });

    this.box.key(['escape', 'q'], () => {
      this.hide();
      if (this.onCloseCallback) {
        this.onCloseCallback();
      }
    });
  }

  setGroups(groups: DatabaseGroup[]): void {
    this.groups = groups;
    this.flatGroups = this.flattenGroups(groups, 0);

    const items = this.flatGroups.map(({ group, depth }) => {
      const indent = '  '.repeat(depth);
      const icon = group.children && group.children.length > 0 ? '📁' : '📄';
      return `${indent}${icon} ${group.name}`;
    });

    this.list.setItems(items);
  }

  private flattenGroups(
    groups: DatabaseGroup[],
    depth: number
  ): { group: DatabaseGroup; depth: number }[] {
    const result: { group: DatabaseGroup; depth: number }[] = [];

    for (const group of groups) {
      result.push({ group, depth });
      if (group.children) {
        result.push(...this.flattenGroups(group.children, depth + 1));
      }
    }

    return result;
  }

  show(): void {
    this.box.show();
    this.list.focus();
    (this.box.screen as blessed.Widgets.Screen).render();
  }

  hide(): void {
    this.box.hide();
    (this.box.screen as blessed.Widgets.Screen).render();
  }

  isVisible(): boolean {
    return !this.box.hidden;
  }

  onSelect(callback: (group: DatabaseGroup) => void): void {
    this.onSelectCallback = callback;
  }

  onClose(callback: () => void): void {
    this.onCloseCallback = callback;
  }

  getElement(): blessed.Widgets.BoxElement {
    return this.box;
  }
}
