import { execSync } from "node:child_process";

/**
 * Notifier is responsible for alerting the user when new data breaches are found.
 *
 * It always prints a highlighted message to the console (so it shows up in cron logs),
 * and also tries to send a native desktop notification if the system supports it:
 * - macOS: uses `osascript` (built in, no extra tools needed)
 * - Linux: uses `notify-send` (install with: sudo apt install libnotify-bin)
 * - Other platforms: console output only
 *
 * Desktop notification failures are silently ignored — the console output is
 * always the reliable fallback.
 *
 * Example usage:
 * ```ts
 * const notifier = new Notifier();
 * notifier.send("Data Breach Alert", "New breach found for you@example.com: Adobe");
 * ```
 */
export class Notifier {
  /**
   * The operating system platform string (e.g. "linux", "darwin", "win32").
   *
   * This is injected via the constructor so that tests can simulate different
   * platforms without actually running on them.
   */
  private readonly platform: string;

  /**
   * @param platform - Defaults to the actual OS platform (`process.platform`).
   *                   Pass a custom value in tests to simulate macOS or Linux.
   */
  constructor(platform: string = process.platform) {
    this.platform = platform;
  }

  /**
   * Sends an alert with a title and a message body.
   *
   * Always prints to the console, and attempts a desktop notification
   * if one is available on this platform.
   *
   * @param title   - Short heading for the alert (e.g. "Data Breach Alert")
   * @param message - The full alert text (e.g. "2 new breaches for you@example.com: Adobe, LinkedIn")
   */
  send(title: string, message: string): void {
    this.printToConsole(title, message);
    this.sendDesktopNotification(title, message);
  }

  /**
   * Prints a clearly visible alert box to the console.
   * This always runs so that cron job logs always capture the alert.
   */
  private printToConsole(title: string, message: string): void {
    const divider = "=".repeat(60);
    console.log(divider);
    console.log(`  ALERT: ${title}`);
    console.log(`  ${message}`);
    console.log(divider);
  }

  /**
   * Attempts to send a native desktop notification using the platform's built-in tool.
   *
   * Errors are caught and silently ignored — desktop notifications are a
   * "nice to have" and we never want them to crash the program.
   */
  private sendDesktopNotification(title: string, message: string): void {
    try {
      if (this.platform === "darwin") {
        // macOS: AppleScript is always available, no extra tools needed
        execSync(`osascript -e 'display notification "${message}" with title "${title}"'`, {
          stdio: "ignore",
        });
      } else if (this.platform === "linux") {
        // Linux: requires the libnotify package (notify-send command)
        execSync(`notify-send --urgency=critical "${title}" "${message}"`, { stdio: "ignore" });
      }
      // On Windows or other platforms, we fall through silently — console output is enough
    } catch {
      // Desktop notification failed (tool not installed, permission denied, etc.)
      // This is non-fatal — the console output is the reliable alert channel
    }
  }
}
