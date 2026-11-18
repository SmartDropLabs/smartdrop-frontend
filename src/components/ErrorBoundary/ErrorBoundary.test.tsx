import { ChakraProvider } from "@chakra-ui/react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ErrorBoundary, useErrorBoundary } from "./ErrorBoundary";

const fallback = (error: Error) => <p>caught: {error.message}</p>;
const wrap = (ui: ReactNode) => render(<ChakraProvider>{ui}</ChakraProvider>);

function AsyncThrower() {
  const { showBoundary } = useErrorBoundary();
  const onClick = () => Promise.reject(new Error("async boom")).catch(showBoundary);
  return <button onClick={onClick}>go</button>;
}

describe("ErrorBoundary async errors (#536)", () => {
  afterEach(() => vi.restoreAllMocks());

  it("shows the fallback for an error passed to showBoundary from an event handler", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    wrap(
      <ErrorBoundary fallback={fallback}>
        <AsyncThrower />
      </ErrorBoundary>,
    );
    await act(async () => {
      fireEvent.click(screen.getByText("go"));
    });
    expect(screen.getByText("caught: async boom")).toBeTruthy();
  });

  it("shows the fallback for unhandled rejections when captureUnhandledRejections is set", () => {
    wrap(
      <ErrorBoundary fallback={fallback} captureUnhandledRejections>
        <p>ok</p>
      </ErrorBoundary>,
    );
    act(() => {
      const event = new Event("unhandledrejection") as PromiseRejectionEvent;
      Object.assign(event, { reason: new Error("stray rejection") });
      window.dispatchEvent(event);
    });
    expect(screen.getByText("caught: stray rejection")).toBeTruthy();
  });

  it("ignores unhandled rejections by default", () => {
    wrap(
      <ErrorBoundary fallback={fallback}>
        <p>ok</p>
      </ErrorBoundary>,
    );
    act(() => {
      const event = new Event("unhandledrejection") as PromiseRejectionEvent;
      Object.assign(event, { reason: new Error("stray rejection") });
      window.dispatchEvent(event);
    });
    expect(screen.getByText("ok")).toBeTruthy();
  });
});
