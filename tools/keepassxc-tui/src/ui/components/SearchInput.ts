import * as blessed from 'blessed';

export interface SearchInputOptions {
  parent: blessed.Widgets.Screen;
}

export class SearchInput {
  private box: blessed.Widgets.BoxElement;
  private input: blessed.Widgets.TextboxElement;
  private visible: boolean = false;
  private onSearchCallback?: (query: string) => void;
  private onCancelCallback?: () => void;

  constructor(options: SearchInputOptions) {
    this.box = blessed.box({
      parent: options.parent,
      top: 'center',
      left: 'center',
      width: 60,
      height: 5,
      border: {
        type: 'line',
      },
      label: ' Search ',
      style: {
        border: {
          fg: 'green',
        },
        label: {
          fg: 'green',
          bold: true,
        },
      },
      hidden: true,
    });

    this.input = blessed.textbox({
      parent: this.box,
      top: 1,
      left: 1,
      width: '100%-4',
      height: 1,
      inputOnFocus: true,
      keys: true,
      style: {
        fg: 'white',
        bg: 'black',
      },
    });

    this.input.on('submit', (value: string) => {
      this.hide();
      if (this.onSearchCallback) {
        this.onSearchCallback(value);
      }
    });

    this.input.on('cancel', () => {
      this.hide();
      if (this.onCancelCallback) {
        this.onCancelCallback();
      }
    });

    this.input.key('escape', () => {
      this.hide();
      if (this.onCancelCallback) {
        this.onCancelCallback();
      }
    });
  }

  show(): void {
    this.visible = true;
    this.box.show();
    this.input.clearValue();
    this.input.focus();
    (this.box.screen as blessed.Widgets.Screen).render();
  }

  hide(): void {
    this.visible = false;
    this.box.hide();
    (this.box.screen as blessed.Widgets.Screen).render();
  }

  isVisible(): boolean {
    return this.visible;
  }

  onSearch(callback: (query: string) => void): void {
    this.onSearchCallback = callback;
  }

  onCancel(callback: () => void): void {
    this.onCancelCallback = callback;
  }

  getElement(): blessed.Widgets.BoxElement {
    return this.box;
  }

  getValue(): string {
    return this.input.getValue();
  }
}
