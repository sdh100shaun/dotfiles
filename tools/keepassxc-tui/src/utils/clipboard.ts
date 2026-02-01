import { spawn } from 'child_process';
import * as os from 'os';

export async function copyToClipboard(text: string): Promise<void> {
  const platform = os.platform();

  let command: string;
  let args: string[];

  if (platform === 'darwin') {
    command = 'pbcopy';
    args = [];
  } else if (platform === 'win32') {
    command = 'clip';
    args = [];
  } else {
    // Linux - try xclip first, fall back to xsel
    command = 'xclip';
    args = ['-selection', 'clipboard'];
  }

  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    proc.on('error', (err) => {
      // If xclip fails on Linux, try xsel
      if (platform === 'linux' && command === 'xclip') {
        copyWithXsel(text).then(resolve).catch(reject);
      } else {
        reject(new Error(`Failed to copy to clipboard: ${err.message}`));
      }
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Clipboard command exited with code ${code}`));
      }
    });

    proc.stdin.write(text);
    proc.stdin.end();
  });
}

async function copyWithXsel(text: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn('xsel', ['--clipboard', '--input'], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    proc.on('error', (err) => {
      reject(new Error(`Failed to copy to clipboard: ${err.message}. Install xclip or xsel.`));
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`xsel exited with code ${code}`));
      }
    });

    proc.stdin.write(text);
    proc.stdin.end();
  });
}

export async function getFromClipboard(): Promise<string> {
  const platform = os.platform();

  let command: string;
  let args: string[];

  if (platform === 'darwin') {
    command = 'pbpaste';
    args = [];
  } else if (platform === 'win32') {
    command = 'powershell';
    args = ['-command', 'Get-Clipboard'];
  } else {
    command = 'xclip';
    args = ['-selection', 'clipboard', '-o'];
  }

  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let output = '';
    let error = '';

    proc.stdout.on('data', (data) => {
      output += data.toString();
    });

    proc.stderr.on('data', (data) => {
      error += data.toString();
    });

    proc.on('error', (err) => {
      reject(new Error(`Failed to read from clipboard: ${err.message}`));
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve(output);
      } else {
        reject(new Error(`Clipboard read failed: ${error}`));
      }
    });
  });
}

export async function clearClipboard(): Promise<void> {
  await copyToClipboard('');
}

// Auto-clear clipboard after a delay (for security)
export function copyToClipboardWithAutoClear(
  text: string,
  clearAfterMs: number = 30000
): Promise<NodeJS.Timeout> {
  return new Promise(async (resolve, reject) => {
    try {
      await copyToClipboard(text);
      const timer = setTimeout(async () => {
        try {
          await clearClipboard();
        } catch {
          // Ignore clear errors
        }
      }, clearAfterMs);
      resolve(timer);
    } catch (err) {
      reject(err);
    }
  });
}
