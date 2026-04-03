import * as blessed from 'blessed';

export interface LoadingIndicatorOptions {
  parent: blessed.Widgets.Screen;
}

export class LoadingIndicator {
  private box: blessed.Widgets.BoxElement;
  private spinnerChars = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  private currentFrame = 0;
  private intervalId: NodeJS.Timeout | null = null;
  private message: string = 'Loading...';

  constructor(options: LoadingIndicatorOptions) {
    this.box = blessed.box({
      parent: options.parent,
      top: 'center',
      left: 'center',
      width: 40,
      height: 5,
      border: {
        type: 'line',
      },
      tags: true,
      style: {
        border: {
          fg: 'cyan',
        },
      },
      hidden: true,
    });
  }

  show(message: string = 'Loading...'): void {
    this.message = message;
    this.currentFrame = 0;
    this.render();
    this.box.show();
    (this.box.screen as blessed.Widgets.Screen).render();

    this.intervalId = setInterval(() => {
      this.currentFrame = (this.currentFrame + 1) % this.spinnerChars.length;
      this.render();
      (this.box.screen as blessed.Widgets.Screen).render();
    }, 80);
  }

  hide(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.box.hide();
    (this.box.screen as blessed.Widgets.Screen).render();
  }

  private render(): void {
    const spinner = this.spinnerChars[this.currentFrame];
    this.box.setContent(`\n  {cyan-fg}${spinner}{/cyan-fg} ${this.message}`);
  }

  isVisible(): boolean {
    return !this.box.hidden;
  }

  getElement(): blessed.Widgets.BoxElement {
    return this.box;
  }
}
