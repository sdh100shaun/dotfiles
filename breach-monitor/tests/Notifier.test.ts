import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Notifier } from "../src/Notifier.js";

// Mock the child_process module so we never run real system commands in tests
vi.mock("node:child_process", () => ({
  execSync: vi.fn(),
}));

// Import the mock AFTER vi.mock() so we get the mocked version
import { execSync } from "node:child_process";
const mockedExecSync = vi.mocked(execSync);

describe("Notifier", () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Suppress console.log output during tests to keep test output clean
    consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    vi.clearAllMocks();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe("send()", () => {
    it("calls console.log to print the alert", () => {
      const notifier = new Notifier("linux");
      notifier.send("Test Title", "Test Message");

      expect(consoleSpy).toHaveBeenCalled();
    });

    it("includes the title in the console output", () => {
      const notifier = new Notifier("linux");
      notifier.send("My Alert Title", "Some message");

      const allOutput = consoleSpy.mock.calls.flat().join(" ");
      expect(allOutput).toContain("My Alert Title");
    });

    it("includes the message in the console output", () => {
      const notifier = new Notifier("linux");
      notifier.send("Title", "My detailed message here");

      const allOutput = consoleSpy.mock.calls.flat().join(" ");
      expect(allOutput).toContain("My detailed message here");
    });
  });

  describe("Linux desktop notifications", () => {
    it("calls notify-send on linux", () => {
      const notifier = new Notifier("linux");
      notifier.send("Alert", "Message");

      expect(mockedExecSync).toHaveBeenCalledWith(
        expect.stringContaining("notify-send"),
        expect.objectContaining({ stdio: "ignore" }),
      );
    });

    it("passes the title to notify-send", () => {
      const notifier = new Notifier("linux");
      notifier.send("Breach Found", "You were breached");

      const [command] = mockedExecSync.mock.calls[0] as [string];
      expect(command).toContain("Breach Found");
    });

    it("passes the message to notify-send", () => {
      const notifier = new Notifier("linux");
      notifier.send("Title", "The actual breach message");

      const [command] = mockedExecSync.mock.calls[0] as [string];
      expect(command).toContain("The actual breach message");
    });

    it("uses critical urgency for notify-send", () => {
      const notifier = new Notifier("linux");
      notifier.send("Title", "Message");

      const [command] = mockedExecSync.mock.calls[0] as [string];
      expect(command).toContain("--urgency=critical");
    });
  });

  describe("macOS desktop notifications", () => {
    it("calls osascript on darwin (macOS)", () => {
      const notifier = new Notifier("darwin");
      notifier.send("Alert", "Message");

      expect(mockedExecSync).toHaveBeenCalledWith(
        expect.stringContaining("osascript"),
        expect.objectContaining({ stdio: "ignore" }),
      );
    });

    it("passes the title to osascript", () => {
      const notifier = new Notifier("darwin");
      notifier.send("MacOS Breach Alert", "Details here");

      const [command] = mockedExecSync.mock.calls[0] as [string];
      expect(command).toContain("MacOS Breach Alert");
    });
  });

  describe("unsupported platforms", () => {
    it("does not call any system command on win32", () => {
      const notifier = new Notifier("win32");
      notifier.send("Alert", "Message");

      expect(mockedExecSync).not.toHaveBeenCalled();
    });

    it("does not call any system command on an unknown platform", () => {
      const notifier = new Notifier("freebsd");
      notifier.send("Alert", "Message");

      expect(mockedExecSync).not.toHaveBeenCalled();
    });
  });

  describe("error handling", () => {
    it("does not throw if the desktop notification command fails", () => {
      mockedExecSync.mockImplementationOnce(() => {
        throw new Error("notify-send: command not found");
      });

      const notifier = new Notifier("linux");

      // The send() call must NOT throw even if notify-send is missing
      expect(() => notifier.send("Title", "Message")).not.toThrow();
    });

    it("still logs to the console even when the desktop notification fails", () => {
      mockedExecSync.mockImplementationOnce(() => {
        throw new Error("osascript: permission denied");
      });

      const notifier = new Notifier("darwin");
      notifier.send("Title", "Message");

      // Console output must still happen as the reliable fallback
      expect(consoleSpy).toHaveBeenCalled();
    });
  });

  describe("default platform", () => {
    it("uses process.platform when no platform is specified", () => {
      // This should construct without throwing, using whatever the test runner's platform is
      expect(() => new Notifier()).not.toThrow();
    });
  });
});
