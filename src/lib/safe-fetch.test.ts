import { describe, expect, it } from "vitest";
import { readJsonWithLimit, ResponseTooLargeError } from "./safe-fetch";

describe("readJsonWithLimit", () => {
  it("parses a response within the limit", async () => {
    const response = new Response(JSON.stringify({ ok: true }));
    await expect(readJsonWithLimit(response, 1024)).resolves.toEqual({ ok: true });
  });

  it("rejects when the declared Content-Length exceeds the limit", async () => {
    const response = new Response("{}", { headers: { "content-length": "2048" } });
    await expect(readJsonWithLimit(response, 1024)).rejects.toBeInstanceOf(ResponseTooLargeError);
  });

  it("rejects when the streamed body exceeds the limit without a declared length", async () => {
    const response = new Response(JSON.stringify({ data: "x".repeat(2048) }));
    await expect(readJsonWithLimit(response, 1024)).rejects.toBeInstanceOf(ResponseTooLargeError);
  });

  it("falls back to json() when the response has no readable body", async () => {
    const response = { json: async () => ({ ok: true }) } as unknown as Response;
    await expect(readJsonWithLimit(response, 1024)).resolves.toEqual({ ok: true });
  });
});
