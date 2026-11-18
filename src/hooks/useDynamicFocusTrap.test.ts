import { renderHook, act } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { useDynamicFocusTrap } from './useDynamicFocusTrap';

function pressKey(key: string) {
  document.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
}

describe('useDynamicFocusTrap', () => {
  let onClose: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onClose = vi.fn();
  });

  it('calls onClose and restores focus when Escape is pressed', () => {
    const trigger = document.createElement('button');
    document.body.appendChild(trigger);
    trigger.focus();
    expect(document.activeElement).toBe(trigger);

    renderHook(() => useDynamicFocusTrap({ active: true, onClose }));

    act(() => pressKey('Escape'));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(trigger);

    document.body.removeChild(trigger);
  });

  it('does not attach a listener when inactive', () => {
    renderHook(() => useDynamicFocusTrap({ active: false, onClose }));

    act(() => pressKey('Escape'));

    expect(onClose).not.toHaveBeenCalled();
  });
});
