import { afterEach, beforeEach, vi } from "vitest";

export function installerEnvironnement(options: { sansMouvement?: boolean } = {}): void {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: (q: string) => ({
      matches: q.includes("prefers-reduced-motion") ? Boolean(options.sansMouvement) : false,
      media: q,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      onchange: null,
      dispatchEvent: () => false,
    }),
  });
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  document.body.innerHTML = "";
});

afterEach(() => {
  vi.restoreAllMocks();
});
