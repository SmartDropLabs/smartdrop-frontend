import {
  Fragment,
  act,
  createElement,
  type ComponentType,
  type ReactNode,
} from "react";
import { createRoot } from "react-dom/client";

type HookWrapper = ComponentType<{ children: ReactNode }>;

export function renderHook<T>(
  callback: () => T,
  options?: { wrapper?: HookWrapper }
) {
  const result = { current: undefined as T };
  const container = document.createElement("div");
  document.body.appendChild(container);

  const Wrapper = options?.wrapper ?? Fragment;

  function HookHarness() {
    result.current = callback();
    return null;
  }

  const root = createRoot(container);
  act(() => {
    root.render(createElement(Wrapper, null, createElement(HookHarness)));
  });

  return {
    result,
    unmount: () => {
      act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
}

export { act };
