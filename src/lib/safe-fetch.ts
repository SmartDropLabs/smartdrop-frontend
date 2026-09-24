/**
 * Bounded response reading (#488).
 *
 * Responses from Horizon, the leaderboard API and the backend are parsed as
 * JSON in memory. A misbehaving or malicious proxy could return an enormous
 * body, so the declared `Content-Length` is checked before reading, and the
 * body is also counted as it streams in (a proxy can omit or understate the
 * header) so reading stops once the limit is passed.
 */

/** 5 MiB — far above any legitimate JSON payload this app requests. */
export const MAX_RESPONSE_BYTES = 5 * 1024 * 1024;

export class ResponseTooLargeError extends Error {
  constructor(maxBytes: number, declaredBytes?: number) {
    super(
      declaredBytes !== undefined
        ? `Response is too large (${declaredBytes} bytes declared, limit ${maxBytes}).`
        : `Response is too large (exceeded the ${maxBytes}-byte limit).`,
    );
    this.name = "ResponseTooLargeError";
  }
}

export async function readJsonWithLimit<T = unknown>(
  response: Response,
  maxBytes: number = MAX_RESPONSE_BYTES,
): Promise<T> {
  const declared = Number(response.headers?.get?.("content-length"));
  if (Number.isFinite(declared) && declared > maxBytes) {
    void response.body?.cancel?.().catch(() => undefined);
    throw new ResponseTooLargeError(maxBytes, declared);
  }

  const reader = response.body?.getReader?.();
  if (!reader) {
    // No readable stream (for example a minimal fetch stand-in): the declared
    // length check above is all that can be applied.
    return (await response.json()) as T;
  }

  const chunks: Uint8Array[] = [];
  let received = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    if (received > maxBytes) {
      await reader.cancel().catch(() => undefined);
      throw new ResponseTooLargeError(maxBytes);
    }
    chunks.push(value);
  }

  const merged = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return JSON.parse(new TextDecoder().decode(merged)) as T;
}
