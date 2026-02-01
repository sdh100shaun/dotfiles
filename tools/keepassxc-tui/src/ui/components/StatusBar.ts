import * as blessed from 'blessed';
import { styles } from '../theme';

export interface StatusBarOptions {
  parent: blessed.Widgets.Screen;
}

export class StatusBar {
  private box: blessed.Widgets.BoxElement;
  private connected: boolean = false;
  private message: string = '';

  constructor(options: StatusBarOptions) {
    this.box = blessed.box({
      parent: options.parent,
      bottom: 0,
      left: 0,
      width: '100%',
      height: 1,
      tags: true,
      ...styles.statusBar,
    });
  }

  setConnected(connected: boolean): void {
    this.connected = connected;
    this.render();
  }

  setMessage(message: string): void {
    this.message = message;
    this.render();
  }

  private render(): void {
    const statusIcon = this.connected ? '{green-fg}●{/green-fg}' : '{red-fg}●{/red-fg}';
    const connectionStatus = this.connected ? 'Connected' : 'Disconnected';
    const helpText = '{bold}q{/bold}:Quit {bold}/{/bold}:Search {bold}Enter{/bold}:Select {bold}c{/bold}:Copy {bold}t{/bold}:TOTP';

    this.box.setContent(
      ` ${statusIcon} ${connectionStatus} │ ${this.message} │ ${helpText}`
    );
  }

  getElement(): blessed.Widgets.BoxElement {
    return this.box;
  }
}
