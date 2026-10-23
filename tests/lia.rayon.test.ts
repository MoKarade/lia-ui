import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mountLia } from "../src/lia.js";
import type { LiaHandle } from "../src/types.js";
import { installerEnvironnement } from "./setup.js";

let lia: LiaHandle | null = null;

beforeEach(() => {
  installerEnvironnement();
  document.body.innerHTML = "";
});
afterEach(() => {
  lia?.destroy();
  lia = null;
  vi.restoreAllMocks();
  vi.useRealTimers();
});

const coteToile = (): number => parseFloat(document.querySelector<HTMLElement>(".lia-ui__toile")?.style.width ?? "0");

const monter = (reduit: "complet" | "fixe"): void => {
  const base = Date.now();
  vi.spyOn(performance, "now").mockImplementation(() => Date.now() - base);
  vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => setTimeout(() => cb(performance.now()), 16) as unknown as number);
  vi.spyOn(window, "cancelAnimationFrame").mockImplementation((id) => clearTimeout(id));
  lia = mountLia({ rayon: 56, quandMouvementReduit: reduit, vieAutonome: false });
};

describe("setRayon", () => {
  it("elle grandit en douceur vers le rayon demandé, sans remonter", () => {
    vi.useFakeTimers();
    monter("complet");
    vi.advanceTimersByTime(300);
    expect(coteToile()).toBe(280);
    lia?.setRayon(120);
    vi.advanceTimersByTime(48);
    const milieu = coteToile();
    expect(milieu).toBeGreaterThan(280);
    expect(milieu).toBeLessThan(600);
    vi.advanceTimersByTime(3000);
    expect(coteToile()).toBe(600);
  });

  it("le rayon demandé reste borné (24 à 400 px) et un nombre invalide est ignoré", () => {
    vi.useFakeTimers();
    monter("complet");
    vi.advanceTimersByTime(300);
    lia?.setRayon(5000);
    vi.advanceTimersByTime(5000);
    expect(coteToile()).toBe(2000);
    lia?.setRayon(Number.NaN);
    vi.advanceTimersByTime(1000);
    expect(coteToile()).toBe(2000);
    lia?.setRayon(1);
    vi.advanceTimersByTime(5000);
    expect(coteToile()).toBe(120);
  });

  it("en mode « fixe » (sans mouvement), le changement est immédiat", () => {
    installerEnvironnement({ sansMouvement: true });
    vi.useFakeTimers();
    monter("fixe");
    vi.advanceTimersByTime(100);
    expect(coteToile()).toBe(280);
    lia?.setRayon(100);
    vi.advanceTimersByTime(40);
    expect(coteToile()).toBe(500);
  });
});
