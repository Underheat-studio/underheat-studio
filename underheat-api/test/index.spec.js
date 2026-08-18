import { createExecutionContext, waitOnExecutionContext } from "cloudflare:test";
import { describe, it, expect } from "vitest";
import worker from "../src";

function makeEnv() {
  return {
    USERS: {
      get: async () => null,
      put: async () => {},
      delete: async () => {},
      list: async () => ({ keys: [] })
    },
    UNDERHEAT_KV: {
      get: async () => null,
      put: async () => {},
      delete: async () => {}
    },
    VERIFIED_DOMAIN: "",
    RESEND_API_KEY: "test-key"
  };
}

describe("UNDERHEAT worker smoke tests", () => {
  it("supports OPTIONS preflight requests", async () => {
    const request = new Request("http://example.com", { method: "OPTIONS" });
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, makeEnv(), ctx);
    await waitOnExecutionContext(ctx);

    expect(response.status).toBe(200);
    expect(response.headers.get("access-control-allow-origin")).toBe("*");
  });

  it("returns JSON for an unknown route", async () => {
    const request = new Request("http://example.com/unknown");
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, makeEnv(), ctx);
    await waitOnExecutionContext(ctx);

    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({
      success: false,
      message: "Not found."
    });
  });
});
