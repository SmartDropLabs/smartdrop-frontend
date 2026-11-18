'use client';

import { useEffect, useRef } from 'react';

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

interface UseDynamicFocusTrapOptions {
  /** Whether the trap is currently active. */
  active: boolean;
  /** Called when Escape is pressed — the caller should close the overlay. */
  onClose: () => void;
}

/**
 * Traps keyboard focus inside `containerRef` while `active` is true.
 * Restores focus to the element that was focused before the trap activated
 * when Escape is pressed or the trap is deactivated (#697).
 */
export function useDynamicFocusTrap<T extends HTMLElement>(
  options: UseDynamicFocusTrapOptions,
) {
  const { active, onClose } = options;
  const containerRef  = useRef<T>(null);
  const triggerRef    = useRef<Element | null>(null);

  useEffect(() => {
    if (!active) return;

    // Remember the element that had focus before the trap opened.
    triggerRef.current = document.activeElement;

    // Move focus into the container.
    const container = containerRef.current;
    if (container) {
      const first = container.querySelector<HTMLElement>(FOCUSABLE);
      first?.focus();
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        (triggerRef.current as HTMLElement | null)?.focus();
        onClose();
        return;
      }

      if (e.key !== 'Tab' || !container) return;

      const focusable = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last  = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      // Restore focus when the trap deactivates for any reason.
      (triggerRef.current as HTMLElement | null)?.focus();
    };
  }, [active, onClose]);

  return containerRef;
}
