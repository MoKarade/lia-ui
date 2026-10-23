import { StrictMode, act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Lia } from "../src/react.js";
import { installerEnvironnement } from "./setup.js";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

beforeEach(() => installerEnvironnement());

describe("<Lia />", () => {
  it("monte LIA dans le navigateur et la retire au démontage", async () => {
    const racine = document.createElement("div");
    document.body.appendChild(racine);
    const r = createRoot(racine);
    await act(async () => r.render(createElement(Lia)));
    expect(document.querySelectorAll(".lia-ui")).toHaveLength(1);
    await act(async () => r.unmount());
    expect(document.querySelector(".lia-ui")).toBeNull();
  });

  it("survit au double montage du mode strict", async () => {
    const racine = document.createElement("div");
    document.body.appendChild(racine);
    const r = createRoot(racine);
    await act(async () => r.render(createElement(StrictMode, null, createElement(Lia))));
    expect(document.querySelectorAll(".lia-ui")).toHaveLength(1);
    await act(async () => r.unmount());
    expect(document.querySelector(".lia-ui")).toBeNull();
  });

  it("donne la poignée à onPret puis null au démontage", async () => {
    const reçus: unknown[] = [];
    const racine = document.createElement("div");
    document.body.appendChild(racine);
    const r = createRoot(racine);
    await act(async () => r.render(createElement(Lia, { onPret: (l) => reçus.push(l) })));
    expect(typeof (reçus[0] as { dire?: unknown }).dire).toBe("function");
    await act(async () => r.unmount());
    expect(reçus.at(-1)).toBeNull();
  });

  it("transmet la parole spontanée, le clic droit sur un élément et ses réglages à LIA", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.3); // choix pondéré : causer, motif « rien »
    const onSpontane = vi.fn(() => "Il est calme ici.");
    const decrire = vi.fn((e: Element) => (e.id === "carte" ? { genre: "une carte", texte: "Bonjour" } : null));
    const racine = document.createElement("div");
    racine.innerHTML = `<section id="carte">x</section>`;
    document.body.appendChild(racine);
    const r = createRoot(document.body.appendChild(document.createElement("div")));
    await act(async () =>
      r.render(
        createElement(Lia, {
          onSpontane,
          silence: [3, 3],
          relancesParJour: 1,
          cibles: "[data-x]",
          elements: { selecteur: "section", decrire },
        }),
      ),
    );
    // Parole spontanée : l'hôte est interrogé (avant le menu, qui suspend sa vie).
    await vi.waitFor(() => expect(onSpontane).toHaveBeenCalled(), { timeout: 4000 });
    // Clic droit : la description de l'hôte est utilisée, null laisse le navigateur.
    const e = new MouseEvent("contextmenu", { bubbles: true, cancelable: true });
    racine.querySelector("section")?.dispatchEvent(e);
    expect(e.defaultPrevented).toBe(true);
    expect(document.querySelector(".lia-ui__menu-titre")?.textContent).toBe("Une carte : « Bonjour »");
    expect(decrire).toHaveBeenCalled();
    await act(async () => r.unmount());
    expect(document.querySelector(".lia-ui")).toBeNull();
  });

  it("elements: false est transmis : pas de clic droit sur la page", async () => {
    const racine = document.createElement("div");
    racine.innerHTML = `<section id="carte">x</section>`;
    document.body.appendChild(racine);
    const r = createRoot(document.body.appendChild(document.createElement("div")));
    await act(async () => r.render(createElement(Lia, { elements: false })));
    const e = new MouseEvent("contextmenu", { bubbles: true, cancelable: true });
    racine.querySelector("section")?.dispatchEvent(e);
    expect(e.defaultPrevented).toBe(false);
    await act(async () => r.unmount());
  });
});
