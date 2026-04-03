/**
 * Strip ANSI escape sequences from a string.
 * This prevents blessed from crashing when rendering strings containing terminal escape codes.
 */
export function stripAnsi(str: string): string {
  // Match all ANSI escape sequences:
  // - CSI sequences: ESC [ ... (parameters) ... (final byte)
  // - OSC sequences: ESC ] ... ST
  // - Other escape sequences: ESC followed by various characters
  // eslint-disable-next-line no-control-regex
  const ansiRegex = /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><~]/g;

  // Also strip any remaining ESC characters and control characters (except newline/tab)
  // eslint-disable-next-line no-control-regex
  const controlRegex = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/g;

  return str.replace(ansiRegex, '').replace(controlRegex, '');
}

/**
 * Escape blessed tag sequences in a string.
 * Blessed uses {tag} syntax for formatting - this escapes braces to prevent interpretation.
 */
export function escapeBlessedTags(str: string): string {
  return str.replace(/\{/g, '{{').replace(/\}/g, '}}');
}

/**
 * Sanitize a string for safe display in blessed.
 * Strips ANSI codes and escapes blessed tags.
 */
export function sanitizeForBlessed(str: string): string {
  return escapeBlessedTags(stripAnsi(str));
}
