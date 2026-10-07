import { describe, it, expect } from "vitest";
import { requireString, requireDate, requirePositiveInt, ValidationError } from "../src/lib/validate.js";

describe("requireString", () => {
  it("renvoie la chaine telle quelle", () => {
    expect(requireString({ who: "moi" }, "who")).toBe("moi");
  });

  it.each([[undefined], [""], ["   "], [42], [null]])("refuse %j", (value) => {
    expect(() => requireString({ who: value }, "who")).toThrow(ValidationError);
    expect(() => requireString({ who: value }, "who")).toThrow("champ manquant ou vide : who");
  });

  it("porte le statut 400", () => {
    expect(new ValidationError("x").status).toBe(400);
  });
});

describe("requireDate", () => {
  it.each([["2026-11-02T09:00:00Z"], ["2026-11-02T09:00:00.250Z"]])("accepte %s", (value) => {
    expect(requireDate({ startsAt: value }, "startsAt")).toBe(value);
  });

  it.each([
    ["la semaine prochaine"],
    ["Nov 2 2026"],
    ["2026-11-02"],
    ["2026-11-02T09:00:00"],
    ["2026-11-02T09:00:00+01:00"],
    ["2026-13-45T09:00:00Z"],
    [" 2026-11-02T09:00:00Z"],
    ["2026-11-02T09:00:00Z "]
  ])("refuse %j, qui n'est pas de l'ISO 8601 UTC", (value) => {
    expect(() => requireDate({ startsAt: value }, "startsAt")).toThrow("date invalide : startsAt");
  });

  it("refuse un champ absent avec le message du champ manquant", () => {
    expect(() => requireDate({}, "startsAt")).toThrow("champ manquant ou vide : startsAt");
  });
});

describe("requirePositiveInt", () => {
  it("accepte un entier strictement positif", () => {
    expect(requirePositiveInt({ people: 1 }, "people")).toBe(1);
  });

  it.each([[0], [-3], [2.5], ["4"], [undefined], [Number.NaN]])("refuse %j", (value) => {
    expect(() => requirePositiveInt({ people: value }, "people")).toThrow("entier positif attendu : people");
  });
});
