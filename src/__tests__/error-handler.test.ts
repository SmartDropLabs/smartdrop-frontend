import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  ErrorLogger,
  errorLogger,
  FreighterError,
  UnknownError,
  setupGlobalErrorHandlers,
} from "../lib/error-handler";

describe("ErrorLogger and Error Handling Subsystem", () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    vi.unstubAllEnvs();
  });

  it("should log errors unconditionally in production environment", () => {
    vi.stubEnv("NODE_ENV", "production");
    const logger = new ErrorLogger();
    const error = new UnknownError("Database connection timed out");

    logger.log(error, "Production Context");

    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    const [prefix, logData] = consoleErrorSpy.mock.calls[0];
    expect(prefix).toBe("[SmartDrop Error]");
    expect(logData).toMatchObject({
      environment: "production",
      context: "Production Context",
      code: "UNKNOWN_ERROR",
      message: "Database connection timed out",
    });
    expect(logData.timestamp).toBeDefined();
  });

  it("should log errors unconditionally in development environment", () => {
    vi.stubEnv("NODE_ENV", "development");
    const logger = new ErrorLogger();
    const error = new FreighterError("FREIGHTER_TIMEOUT", "Wallet signature request timed out");

    logger.log(error, "Wallet Connect");

    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    const [prefix, logData] = consoleErrorSpy.mock.calls[0];
    expect(prefix).toBe("[SmartDrop Error]");
    expect(logData).toMatchObject({
      environment: "development",
      context: "Wallet Connect",
      code: "FREIGHTER_TIMEOUT",
    });
  });

  it("should format and log unhandled promise rejections properly", () => {
    const errorEvent = {
      reason: new Error("Unhandled async rejection in Soroban simulation"),
    } as PromiseRejectionEvent;

    errorLogger.logUnhandledRejection(errorEvent);

    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    const [prefix, logData] = consoleErrorSpy.mock.calls[0];
    expect(prefix).toBe("[SmartDrop Error]");
    expect(logData.context).toBe("Unhandled Promise Rejection");
    expect(logData.message).toContain("Unhandled async rejection in Soroban simulation");
  });

  it("should format and log global error events properly", () => {
    const globalError = {
      error: new Error("Uncaught DOM Exception"),
      message: "Uncaught DOM Exception",
    } as ErrorEvent;

    errorLogger.logErrorEvent(globalError);

    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    const [prefix, logData] = consoleErrorSpy.mock.calls[0];
    expect(prefix).toBe("[SmartDrop Error]");
    expect(logData.context).toBe("Global Error Event");
    expect(logData.message).toContain("Uncaught DOM Exception");
  });

  it("should attach and clean up global event listeners via setupGlobalErrorHandlers", () => {
    const addEventListenerSpy = vi.spyOn(window, "addEventListener");
    const removeEventListenerSpy = vi.spyOn(window, "removeEventListener");

    const cleanup = setupGlobalErrorHandlers();

    expect(addEventListenerSpy).toHaveBeenCalledWith("unhandledrejection", expect.any(Function));
    expect(addEventListenerSpy).toHaveBeenCalledWith("error", expect.any(Function));

    cleanup();

    expect(removeEventListenerSpy).toHaveBeenCalledWith("unhandledrejection", expect.any(Function));
    expect(removeEventListenerSpy).toHaveBeenCalledWith("error", expect.any(Function));
  });
});
