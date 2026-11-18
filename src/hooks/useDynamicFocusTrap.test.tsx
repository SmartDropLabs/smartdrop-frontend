import { render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { getFirstTabbable, useDynamicFocusTrap } from "./useDynamicFocusTrap";

function Dialog({ view, disableAction }: { view: "form" | "success"; disableAction?: boolean }) {
  const [el, setEl] = useState<HTMLElement | null>(null);
  useDynamicFocusTrap(el);
  return (
    <>
      <button type="button">Outside</button>
      <div ref={setEl} role="dialog" tabIndex={-1}>
        {view === "form" ? (
          <>
            <input aria-label="Amount" disabled />
            <button type="button" disabled={disableAction}>
              Submit
            </button>
          </>
        ) : (
          <button type="button">Done</button>
        )}
      </div>
    </>
  );
}

describe("useDynamicFocusTrap", () => {
  it("moves focus into the dialog when the focused element is unmounted", async () => {
    const { rerender } = render(<Dialog view="form" />);
    screen.getByText("Submit").focus();
    expect(document.activeElement).toBe(screen.getByText("Submit"));

    rerender(<Dialog view="success" />);

    await waitFor(() => expect(document.activeElement).toBe(screen.getByText("Done")));
  });

  it("moves focus off a control that becomes disabled", async () => {
    const { rerender } = render(<Dialog view="form" />);
    const submit = screen.getByText("Submit");
    submit.focus();

    rerender(<Dialog view="form" disableAction />);

    // Nothing else is tabbable, so the dialog itself takes focus.
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("dialog")));
  });

  it("leaves focus alone when it is deliberately outside the dialog (e.g. a nested modal)", async () => {
    const { rerender } = render(<Dialog view="form" />);
    const outside = screen.getByText("Outside");
    outside.focus();

    rerender(<Dialog view="success" />);
    await new Promise((r) => requestAnimationFrame(() => r(null)));

    expect(document.activeElement).toBe(outside);
  });

  it("getFirstTabbable skips disabled and hidden elements", () => {
    const container = document.createElement("div");
    container.innerHTML = `
      <button disabled>A</button>
      <div hidden><button>B</button></div>
      <button aria-disabled="true">C</button>
      <button>D</button>
    `;
    document.body.appendChild(container);
    expect(getFirstTabbable(container)?.textContent).toBe("D");
    container.remove();
  });

  // #764 — with nested trapped dialogs, only the topmost one owns focus.
  function Nested({ innerOpen, outerKey = "a" }: { innerOpen: boolean; outerKey?: string }) {
    const [outer, setOuter] = useState<HTMLElement | null>(null);
    const [inner, setInner] = useState<HTMLElement | null>(null);
    useDynamicFocusTrap(outer);
    useDynamicFocusTrap(inner, innerOpen);
    return (
      <>
        <div ref={setOuter} role="dialog" aria-label="Outer" tabIndex={-1}>
          <button key={outerKey} type="button">
            Outer action
          </button>
        </div>
        {innerOpen && (
          <div ref={setInner} role="dialog" aria-label="Inner" tabIndex={-1}>
            <button type="button">Confirm</button>
          </div>
        )}
      </>
    );
  }

  it("restores lost focus into the topmost nested dialog, not the outer one", async () => {
    const { rerender } = render(<Nested innerOpen />);
    screen.getByText("Outer action").focus();

    // Remount the focused outer button so focus is lost to <body>.
    rerender(<Nested innerOpen outerKey="b" />);

    await waitFor(() => expect(document.activeElement).toBe(screen.getByText("Confirm")));
  });

  it("hands focus back to the outer dialog when the nested one closes", async () => {
    const { rerender } = render(<Nested innerOpen />);
    screen.getByText("Confirm").focus();

    rerender(<Nested innerOpen={false} />);

    await waitFor(() => expect(document.activeElement).toBe(screen.getByText("Outer action")));
  });
});
