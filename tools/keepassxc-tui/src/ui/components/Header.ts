import * as blessed from 'blessed';

export interface HeaderOptions {
  parent: blessed.Widgets.Screen;
}

export class Header {
  private box: blessed.Widgets.BoxElement;

  constructor(options: HeaderOptions) {
    this.box = blessed.box({
      parent: options.parent,
      top: 0,
      left: 0,
      width: '100%',
      height: 3,
      tags: true,
      style: {
        fg: 'white',
        bg: 'black',
      },
    });

    this.render();
  }

  private render(): void {
    const title = [
      '{bold}{green-fg}╔═══════════════════════════════════════════════════════════════════╗{/green-fg}{/bold}',
      '{bold}{green-fg}║{/green-fg}{/bold}           {bold}{cyan-fg}KeePassXC TUI{/cyan-fg}{/bold} - Terminal Password Manager            {bold}{green-fg}║{/green-fg}{/bold}',
      '{bold}{green-fg}╚═══════════════════════════════════════════════════════════════════╝{/green-fg}{/bold}',
    ].join('\n');

    this.box.setContent(title);
  }

  getElement(): blessed.Widgets.BoxElement {
    return this.box;
  }
}
