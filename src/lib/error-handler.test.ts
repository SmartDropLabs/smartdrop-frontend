import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ErrorLogger,
  UnknownError,
  setupGlobalErrorHandlers,
} from "./error-handler";

describe("ErrorLogger.log (#129)", () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    vi.unstubAllEnvs();
  });

  it("logs to the console under production-like NODE_ENV on a non-localhost hostname", () => {
    vi.stubEnv("NODE_ENV", "production");
    const logger = new ErrorLogger();

    logger.log(new UnknownError("boom"), "test-context");

    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "[SmartDrop Error]",
      expect.objectContaining({ context: "test-context" }),
    );
  });

  it("also logs under development NODE_ENV (never fully silent either way)", () => {
    vi.stubEnv("NODE_ENV", "development");
    const logger = new ErrorLogger();

    logger.log(new UnknownError("boom"));

    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
  });
});

describe("setupGlobalErrorHandlers (#129)", () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let cleanup: () => void;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubEnv("NODE_ENV", "production");
    cleanup = setupGlobalErrorHandlers();
  });

  afterEach(() => {
    cleanup();
    consoleErrorSpy.mockRestore();
    vi.unstubAllEnvs();
  });

  it("reaches console.error for an unhandledrejection event under production-like conditions", () => {
    const event = new Event("unhandledrejection") as PromiseRejectionEvent & {
      reason?: unknown;
    };
    Object.defineProperty(event, "reason", { value: new Error("rejected") });
    window.dispatchEvent(event);

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "[SmartDrop Error]",
      expect.objectContaining({ context: "Unhandled Promise Rejection" }),
    );
  });

  it("reaches console.error for a global error event under production-like conditions", () => {
    const event = new ErrorEvent("error", { error: new Error("boom") });
    window.dispatchEvent(event);

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "[SmartDrop Error]",
      expect.objectContaining({ context: "Global Error Event" }),
    );
  });
});
