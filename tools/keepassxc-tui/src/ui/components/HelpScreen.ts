import * as blessed from 'blessed';

export interface HelpScreenOptions {
  parent: blessed.Widgets.Screen;
}

export class HelpScreen {
  private box: blessed.Widgets.BoxElement;
  private onCloseCallback?: () => void;

  constructor(options: HelpScreenOptions) {
    this.box = blessed.box({
      parent: options.parent,
      top: 'center',
      left: 'center',
      width: '70%',
      height: '80%',
      border: {
        type: 'line',
      },
      label: ' Help ',
      tags: true,
      keys: true,
      vi: true,
      scrollable: true,
      alwaysScroll: true,
      style: {
        border: {
          fg: 'yellow',
        },
        label: {
          fg: 'yellow',
          bold: true,
        },
      },
      hidden: true,
    });

    this.box.key(['escape', 'q', '?'], () => {
      this.hide();
      if (this.onCloseCallback) {
        this.onCloseCallback();
      }
    });

    this.render();
  }

  private render(): void {
    const helpText = `
  {bold}{cyan-fg}KeePassXC TUI - Keyboard Shortcuts{/cyan-fg}{/bold}

  {bold}Navigation{/bold}
  ─────────────────────────────────────────
  {green-fg}j / ↓{/green-fg}      Move down
  {green-fg}k / ↑{/green-fg}      Move up
  {green-fg}Enter{/green-fg}      Select / View entry details
  {green-fg}Escape{/green-fg}     Close dialog / Cancel
  {green-fg}q{/green-fg}          Quit application

  {bold}Search & Browse{/bold}
  ─────────────────────────────────────────
  {green-fg}/{/green-fg}          Open search dialog
  {green-fg}b{/green-fg}          Browse database groups
  {green-fg}r{/green-fg}          Refresh current search

  {bold}Clipboard Operations{/bold}
  ─────────────────────────────────────────
  {green-fg}c / p{/green-fg}      Copy password
  {green-fg}u{/green-fg}          Copy username
  {green-fg}t{/green-fg}          Copy TOTP code

  {bold}Database Operations{/bold}
  ─────────────────────────────────────────
  {green-fg}g{/green-fg}          Generate new password
  {green-fg}l{/green-fg}          Lock database

  {bold}Other{/bold}
  ─────────────────────────────────────────
  {green-fg}?{/green-fg}          Show this help screen

  {gray-fg}Press Escape or q to close this help{/gray-fg}
`;

    this.box.setContent(helpText);
  }

  show(): void {
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
