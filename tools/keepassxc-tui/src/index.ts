#!/usr/bin/env node

import { App } from './ui/app';

async function main(): Promise<void> {
  const app = new App();

  process.on('SIGINT', () => {
    app.shutdown();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    app.shutdown();
    process.exit(0);
  });

  try {
    await app.run();
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

main();
