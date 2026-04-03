import * as blessed from 'blessed';
import { sanitizeForBlessed } from '../../utils';

export type MessageType = 'info' | 'success' | 'error' | 'warning';

export interface MessageDialogOptions {
  parent: blessed.Widgets.Screen;
}

export class MessageDialog {
  private box: blessed.Widgets.BoxElement;
  private onCloseCallback?: () => void;

  constructor(options: MessageDialogOptions) {
    this.box = blessed.box({
      parent: options.parent,
      top: 'center',
      left: 'center',
      width: 50,
      height: 7,
      border: {
        type: 'line',
      },
      tags: true,
      keys: true,
      focusable: true,
      style: {
        border: {
          fg: 'blue',
        },
      },
      hidden: true,
    });

    this.box.key(['escape', 'enter', 'q'], () => {
      this.hide();
      if (this.onCloseCallback) {
        this.onCloseCallback();
      }
    });
  }

  show(message: string, type: MessageType = 'info', title?: string): void {
    const colors: Record<MessageType, string> = {
      info: 'blue',
      success: 'green',
      error: 'red',
      warning: 'yellow',
    };

    const icons: Record<MessageType, string> = {
      info: 'ℹ',
      success: '✓',
      error: '✗',
      warning: '⚠',
    };

    const color = colors[type];
    const icon = icons[type];
    const displayTitle = title || type.charAt(0).toUpperCase() + type.slice(1);
    const safeMessage = sanitizeForBlessed(message);

    this.box.style.border = { fg: color };
    this.box.setLabel(` ${displayTitle} `);

    const content = [
      '',
      `  {${color}-fg}${icon}{/${color}-fg} ${safeMessage}`,
      '',
      '  {gray-fg}Press Enter or Escape to close{/gray-fg}',
    ].join('\n');

    this.box.setContent(content);
    this.box.show();
    this.box.focus();
    (this.box.screen as blessed.Widgets.Screen).render();
  }

  hide(): void {
    this.box.hide();
    (this.box.screen as blessed.Widgets.Screen).render();
  }

  isVisible(): boolean {
    return !this.box.hidden;
  }

  onClose(callback: () => void): void {
    this.onCloseCallback = callback;
  }

  getElement(): blessed.Widgets.BoxElement {
    return this.box;
  }
}
