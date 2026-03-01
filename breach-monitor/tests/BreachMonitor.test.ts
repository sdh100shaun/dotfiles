import { beforeEach, describe, expect, it, vi } from "vitest";
import { BreachMonitor } from "../src/BreachMonitor.js";
import type { HibpClient } from "../src/HibpClient.js";
import type { Notifier } from "../src/Notifier.js";
import type { StateManager } from "../src/StateManager.js";
import type { Breach } from "../src/types.js";

/** Creates a minimal Breach object for use in tests */
function makeBreach(name: string): Breach {
  return {
    Name: name,
    Title: `${name} Data Breach`,
    Domain: `${name.toLowerCase()}.com`,
    BreachDate: "2022-01-01",
    AddedDate: "2022-02-01",
    ModifiedDate: "2022-02-01",
    PwnCount: 100000,
    Description: "Test breach",
    LogoPath: "",
    DataClasses: ["Passwords"],
    IsVerified: true,
    IsFabricated: false,
    IsSensitive: false,
    IsRetired: false,
    IsSpamList: false,
    IsMalware: false,
  };
}

describe("BreachMonitor", () => {
  // Mock each dependency individually so tests remain isolated and fast
  const mockGetBreaches = vi.fn<HibpClient["getBreachesForEmail"]>();
  const mockFindNew = vi.fn<StateManager["findNewBreaches"]>();
  const mockSaveBreaches = vi.fn<StateManager["saveBreaches"]>();
  const mockClearBreaches = vi.fn<StateManager["clearBreaches"]>();
  const mockNotify = vi.fn<Notifier["send"]>();

  const mockClient = { getBreachesForEmail: mockGetBreaches } as unknown as HibpClient;
  const mockState = {
    findNewBreaches: mockFindNew,
    saveBreaches: mockSaveBreaches,
    clearBreaches: mockClearBreaches,
  } as unknown as StateManager;
  const mockNotifier = { send: mockNotify } as unknown as Notifier;

  let monitor: BreachMonitor;

  beforeEach(() => {
    // Use requestDelayMs: 0 so tests don't wait 1.5 seconds between requests
    monitor = new BreachMonitor(mockClient, mockState, mockNotifier, { requestDelayMs: 0 });
    vi.clearAllMocks();
  });

  describe("checkEmail()", () => {
    it("returns a clean result and clears state when the API reports no breaches", async () => {
      mockGetBreaches.mockResolvedValue([]);

      const result = await monitor.checkEmail("clean@example.com");

      expect(result.newBreaches).toHaveLength(0);
      expect(result.totalBreaches).toBe(0);
      expect(mockClearBreaches).toHaveBeenCalledWith("clean@example.com");
    });

    it("does not send a notification when the email is clean", async () => {
      mockGetBreaches.mockResolvedValue([]);

      await monitor.checkEmail("clean@example.com");

      expect(mockNotify).not.toHaveBeenCalled();
    });

    it("sends a notification when new breaches are found", async () => {
      const breach = makeBreach("Adobe");
      mockGetBreaches.mockResolvedValue([breach]);
      mockFindNew.mockReturnValue([breach]); // The breach is new

      await monitor.checkEmail("test@example.com");

      expect(mockNotify).toHaveBeenCalledOnce();
    });

    it("includes the breach title in the notification message", async () => {
      const breach = makeBreach("LinkedIn");
      mockGetBreaches.mockResolvedValue([breach]);
      mockFindNew.mockReturnValue([breach]);

      await monitor.checkEmail("test@example.com");

      const [, message] = mockNotify.mock.calls[0] as [string, string];
      expect(message).toContain("LinkedIn Data Breach");
    });

    it("saves updated state after finding new breaches", async () => {
      const breach = makeBreach("Dropbox");
      mockGetBreaches.mockResolvedValue([breach]);
      mockFindNew.mockReturnValue([breach]);

      await monitor.checkEmail("test@example.com");

      expect(mockSaveBreaches).toHaveBeenCalledWith("test@example.com", [breach]);
    });

    it("returns the correct count of new breaches", async () => {
      const breaches = [makeBreach("Adobe"), makeBreach("LinkedIn")];
      mockGetBreaches.mockResolvedValue(breaches);
      mockFindNew.mockReturnValue(breaches);

      const result = await monitor.checkEmail("test@example.com");

      expect(result.newBreaches).toHaveLength(2);
    });

    it("does not notify when all current breaches were already known", async () => {
      const breach = makeBreach("Adobe");
      mockGetBreaches.mockResolvedValue([breach]);
      mockFindNew.mockReturnValue([]); // No new ones — already seen

      await monitor.checkEmail("test@example.com");

      expect(mockNotify).not.toHaveBeenCalled();
      expect(mockSaveBreaches).not.toHaveBeenCalled();
    });

    it("returns total breach count even when there are no new ones", async () => {
      const breaches = [makeBreach("Adobe"), makeBreach("LinkedIn")];
      mockGetBreaches.mockResolvedValue(breaches);
      mockFindNew.mockReturnValue([]); // Both already known

      const result = await monitor.checkEmail("test@example.com");

      expect(result.totalBreaches).toBe(2);
      expect(result.newBreaches).toHaveLength(0);
    });

    it("returns the correct email in the result", async () => {
      mockGetBreaches.mockResolvedValue([]);

      const result = await monitor.checkEmail("myemail@example.com");

      expect(result.email).toBe("myemail@example.com");
    });

    it("propagates errors thrown by the HIBP client", async () => {
      mockGetBreaches.mockRejectedValue(new Error("Network error"));

      await expect(monitor.checkEmail("test@example.com")).rejects.toThrow("Network error");
    });
  });

  describe("checkAll()", () => {
    it("returns one result per email", async () => {
      mockGetBreaches.mockResolvedValue([]);

      const results = await monitor.checkAll(["a@test.com", "b@test.com", "c@test.com"]);

      expect(results).toHaveLength(3);
    });

    it("checks each email exactly once", async () => {
      mockGetBreaches.mockResolvedValue([]);

      await monitor.checkAll(["x@test.com", "y@test.com"]);

      expect(mockGetBreaches).toHaveBeenCalledTimes(2);
    });

    it("preserves the order of results matching the order of emails", async () => {
      mockGetBreaches.mockResolvedValue([]);

      const emails = ["first@test.com", "second@test.com"];
      const results = await monitor.checkAll(emails);

      expect(results[0].email).toBe("first@test.com");
      expect(results[1].email).toBe("second@test.com");
    });

    it("returns an empty array when given an empty email list", async () => {
      const results = await monitor.checkAll([]);

      expect(results).toEqual([]);
      expect(mockGetBreaches).not.toHaveBeenCalled();
    });

    it("handles a single email without errors", async () => {
      mockGetBreaches.mockResolvedValue([]);

      const results = await monitor.checkAll(["solo@test.com"]);

      expect(results).toHaveLength(1);
    });
  });
});
