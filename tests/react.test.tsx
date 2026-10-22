import { StrictMode, act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { beforeEach, describe, expect, it } from "vitest";
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
});
