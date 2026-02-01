#!/usr/bin/env node

// Suppress blessed terminal capability warnings and debug output
// These occur when blessed tries to use terminfo capabilities not supported by the terminal
const originalStderrWrite = process.stderr.write.bind(process.stderr);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(process.stderr.write as any) = (chunk: string | Uint8Array, ...args: any[]): boolean => {
  const str = typeof chunk === 'string' ? chunk : chunk.toString();
  // Filter out blessed/terminfo debug output and capability warnings
  if (
    str.includes('Setulc') ||
    str.includes('Error on xterm') ||
    str.includes('stack.push') ||
    str.includes('stack.pop') ||
    str.includes('\\x1b[') ||
    str.includes('var v,') ||
    str.includes('out.push')
  ) {
    return true;
  }
  return originalStderrWrite(chunk, ...args);
};

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
