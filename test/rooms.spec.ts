import { describe, it, expect } from "vitest";
import { createApp } from "../src/app.js";
import type { Room, Booking } from "../src/store.js";

// Forme des reponses JSON de l API, toutes routes confondues.
interface ApiBody {
  rooms: Room[];
  room: Room;
  bookings: Booking[];
  booking: Booking;
}

async function get(path: string) {
  const server = createApp().listen(0);
  const { port } = server.address() as { port: number };
  try {
    const res = await fetch(`http://127.0.0.1:${port}${path}`);
    return { status: res.status, body: (await res.json()) as ApiBody };
  } finally {
    server.close();
  }
}

describe("GET /health", () => {
  it("repond ok", async () => {
    expect(await get("/health")).toEqual({ status: 200, body: { ok: true } });
  });
});

describe("GET /rooms", () => {
  it("renvoie le catalogue", async () => {
    const res = await get("/rooms");
    expect(res.status).toBe(200);
    expect(res.body.rooms.map((r: { id: string }) => r.id)).toEqual(["amphi", "salle-a", "salle-b", "labo"]);
  });

  it("renvoie une salle avec ses reservations", async () => {
    const res = await get("/rooms/salle-a");
    expect(res.status).toBe(200);
    expect(res.body.room).toEqual({ id: "salle-a", name: "Salle A", capacity: 12, hourlyRate: 25 });
    expect(res.body.bookings.map((b: { id: string }) => b.id)).toEqual(["bk-1001"]);
  });

  it("repond 404 pour une salle inconnue", async () => {
    expect(await get("/rooms/cave")).toEqual({ status: 404, body: { error: "salle inconnue" } });
  });
});
