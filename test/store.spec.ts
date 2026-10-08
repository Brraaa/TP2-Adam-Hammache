import { describe, it, expect } from "vitest";
import { rooms, bookings, findRoom, bookingsForRoom, nextBookingId } from "../src/store.js";

describe("store", () => {
  it("expose le catalogue de salles", () => {
    expect(rooms.map((r) => r.id)).toEqual(["amphi", "salle-a", "salle-b", "labo"]);
  });

  it("retrouve une salle par son identifiant", () => {
    expect(findRoom("salle-a")).toEqual({ id: "salle-a", name: "Salle A", capacity: 12, hourlyRate: 25 });
  });

  it("ne trouve pas une salle inconnue", () => {
    expect(findRoom("cave")).toBeUndefined();
  });

  it("retourne les reservations d'une salle, et seulement les siennes", () => {
    expect(bookingsForRoom("salle-a").map((b) => b.id)).toEqual(["bk-1001"]);
    expect(bookingsForRoom("amphi").map((b) => b.id)).toEqual(["bk-1002"]);
  });

  it("ne retourne aucune reservation pour une salle libre", () => {
    expect(bookingsForRoom("labo")).toHaveLength(0);
  });

  it("numerote les reservations a la suite des existantes", () => {
    expect(bookings.map((b) => b.id)).toEqual(["bk-1001", "bk-1002"]);
    expect(nextBookingId()).toBe("bk-1003");
    expect(nextBookingId()).toBe("bk-1004");
  });
});
