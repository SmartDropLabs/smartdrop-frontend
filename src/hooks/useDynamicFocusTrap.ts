"use client";

import { useEffect } from "react";

const TABBABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
  "[contenteditable='true']",
].join(",");

function isFocusable(el: Element): el is HTMLElement {
  if (!(el instanceof HTMLElement) || !el.isConnected) return false;
  if (el.hasAttribute("disabled") || el.getAttribute("aria-disabled") === "true") return false;
  if (el.closest("[hidden], [aria-hidden='true'], [inert]")) return false;
  return true;
}

/** First keyboard-reachable element inside `container`, in DOM order. */
export function getFirstTabbable(container: HTMLElement): HTMLElement | null {
  const candidates = container.querySelectorAll(TABBABLE_SELECTOR);
  for (const el of candidates) {
    if (isFocusable(el)) return el;
  }
  return null;
}

/**
 * Keeps keyboard focus inside a dialog while its content changes underneath
 * the user.
 *
 * Chakra's `trapFocus` (react-focus-lock) catches focus that *moves* out of
 * the dialog, but not focus that is *lost*: when the focused element is
 * unmounted (e.g. the form is swapped for the success view) or becomes
 * disabled (e.g. buttons locking while a transaction is processing), the
 * browser drops focus to `<body>` without a focus event, and the next Tab
 * starts from the top of the page — outside the modal.
 *
 * This watches the dialog for DOM changes and, when focus has been lost
 * that way, moves it to the first tabbable element inside the dialog (or the
 * dialog itself). Focus that legitimately lives elsewhere — like a nested
 * confirmation modal portalled outside `container` — is left alone.
 */
export function useDynamicFocusTrap(container: HTMLElement | null, enabled = true) {
  useEffect(() => {
    if (!enabled || !container || typeof MutationObserver === "undefined") return;

    let frame: number | null = null;

    const restoreFocus = () => {
      frame = null;
      const active = document.activeElement;
      const lost =
        !active ||
        active === document.body ||
        (container.contains(active) && !isFocusable(active));
      if (!lost) return;

      const target = getFirstTabbable(container) ?? container;
      if (target === container && !container.hasAttribute("tabindex")) {
        container.setAttribute("tabindex", "-1");
      }
      target.focus({ preventScroll: true });
    };

    const observer = new MutationObserver(() => {
      // Batch a burst of mutations from one React commit into one check, and
      // run it after the browser has settled where focus went.
      if (frame === null) frame = requestAnimationFrame(restoreFocus);
    });

    observer.observe(container, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["disabled", "aria-disabled", "hidden", "aria-hidden", "inert"],
    });

    return () => {
      observer.disconnect();
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, [container, enabled]);
}
