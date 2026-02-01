import type { AppState, ViewType } from '../types';

export class App {
  private state: AppState;
  private running: boolean = false;

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
  }

  async run(): Promise<void> {
    this.running = true;
    this.state.statusMessage = 'KeePassXC TUI - Starting...';

    // Will be implemented in subsequent milestones
    console.log('KeePassXC TUI');
    console.log('=============');
    console.log('');
    console.log('Project structure initialized successfully!');
    console.log('');
    console.log('Next steps:');
    console.log('  - Milestone 2: Implement KeePassXC API client');
    console.log('  - Milestone 3: Build TUI interface');
    console.log('  - Milestone 4: Add core features');
    console.log('  - Milestone 5: Polish and advanced features');
  }

  shutdown(): void {
    this.running = false;
    this.state.statusMessage = 'Shutting down...';
  }

  getState(): AppState {
    return { ...this.state };
  }

  setView(view: ViewType): void {
    this.state.currentView = view;
  }
}
