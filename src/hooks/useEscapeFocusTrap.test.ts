import { renderHook, act } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { useEscapeFocusTrap } from './useEscapeFocusTrap';

function pressKey(key: string) {
  document.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
}

describe('useEscapeFocusTrap', () => {
  let onClose: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onClose = vi.fn();
  });

  it('calls onClose and restores focus when Escape is pressed', () => {
    const trigger = document.createElement('button');
    document.body.appendChild(trigger);
    trigger.focus();
    expect(document.activeElement).toBe(trigger);

    renderHook(() => useEscapeFocusTrap({ active: true, onClose }));

    act(() => pressKey('Escape'));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(trigger);

    document.body.removeChild(trigger);
  });

  it('does not attach a listener when inactive', () => {
    renderHook(() => useEscapeFocusTrap({ active: false, onClose }));

    act(() => pressKey('Escape'));

    expect(onClose).not.toHaveBeenCalled();
  });
});
