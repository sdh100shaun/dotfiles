import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HibpClient } from "../src/HibpClient.js";
import { AuthenticationError, RateLimitError } from "../src/errors.js";
import type { Breach } from "../src/types.js";

// Replace the global `fetch` with a mock so we never make real HTTP requests in tests
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

/** Creates a minimal Breach object for use in tests */
function makeBreach(name: string): Breach {
  return {
    Name: name,
    Title: `${name} Data Breach`,
    Domain: `${name.toLowerCase()}.com`,
    BreachDate: "2020-01-01",
    AddedDate: "2020-02-01",
    ModifiedDate: "2020-02-01",
    PwnCount: 1000000,
    Description: "Test breach",
    LogoPath: "",
    DataClasses: ["Email addresses", "Passwords"],
    IsVerified: true,
    IsFabricated: false,
    IsSensitive: false,
    IsRetired: false,
    IsSpamList: false,
    IsMalware: false,
  };
}

describe("HibpClient", () => {
  let client: HibpClient;

  beforeEach(() => {
    client = new HibpClient("test-api-key-abc");
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("getBreachesForEmail()", () => {
    it("returns an array of breaches when the email is found (HTTP 200)", async () => {
      const breaches = [makeBreach("Adobe"), makeBreach("LinkedIn")];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(breaches),
      });

      const result = await client.getBreachesForEmail("test@example.com");

      expect(result).toHaveLength(2);
      expect(result[0].Name).toBe("Adobe");
      expect(result[1].Name).toBe("LinkedIn");
    });

    it("returns an empty array when the email has no breaches (HTTP 404)", async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 404 });

      const result = await client.getBreachesForEmail("clean@example.com");

      expect(result).toEqual([]);
    });

    it("throws AuthenticationError when the API key is invalid (HTTP 401)", async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 401 });

      await expect(client.getBreachesForEmail("test@example.com")).rejects.toThrow(
        AuthenticationError,
      );
    });

    it("throws AuthenticationError with a helpful message pointing to the API key page", async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 401 });

      await expect(client.getBreachesForEmail("test@example.com")).rejects.toThrow(
        "haveibeenpwned.com/API/Key",
      );
    });

    it("throws RateLimitError when the API rate limit is exceeded (HTTP 429)", async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 429 });

      await expect(client.getBreachesForEmail("test@example.com")).rejects.toThrow(RateLimitError);
    });

    it("throws a generic Error for unexpected HTTP status codes", async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });

      await expect(client.getBreachesForEmail("test@example.com")).rejects.toThrow("HTTP 500");
    });

    it("passes the API key in the hibp-api-key request header", async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 404 });

      await client.getBreachesForEmail("test@example.com");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            "hibp-api-key": "test-api-key-abc",
          }),
        }),
      );
    });

    it("URL-encodes the email address in the request URL", async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 404 });

      // The + in plus-addressing must be percent-encoded as %2B
      await client.getBreachesForEmail("user+tag@example.com");

      const [calledUrl] = mockFetch.mock.calls[0] as [string];
      expect(calledUrl).toContain("user%2Btag%40example.com");
    });

    it("includes the User-Agent header in every request", async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 404 });

      await client.getBreachesForEmail("test@example.com");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            "User-Agent": expect.stringContaining("breach-monitor"),
          }),
        }),
      );
    });

    it("requests the full (non-truncated) breach data", async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 404 });

      await client.getBreachesForEmail("test@example.com");

      const [calledUrl] = mockFetch.mock.calls[0] as [string];
      expect(calledUrl).toContain("truncateResponse=false");
    });
  });
});
