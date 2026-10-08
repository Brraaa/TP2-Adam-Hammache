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

async function call(path: string, init?: RequestInit) {
  const app = createApp();
  const server = app.listen(0);
  const { port } = server.address() as { port: number };
  try {
    const res = await fetch(`http://127.0.0.1:${port}${path}`, init);
    return { status: res.status, body: (await res.json()) as ApiBody };
  } finally {
    server.close();
  }
}

const post = (payload: unknown) =>
  call("/bookings", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });

describe("POST /bookings", () => {
  it("refuse une salle inconnue", async () => {
    const res = await post({
      roomId: "cave",
      who: "moi",
      people: 2,
      startsAt: "2026-11-02T09:00:00Z",
      endsAt: "2026-11-02T10:00:00Z"
    });
    expect(res.status).toBe(400);
  });

  it("refuse un depassement de capacite", async () => {
    const res = await post({
      roomId: "salle-b",
      who: "moi",
      people: 40,
      startsAt: "2026-11-02T09:00:00Z",
      endsAt: "2026-11-02T10:00:00Z"
    });
    expect(res.status).toBe(400);
  });

  it("refuse une date invalide", async () => {
    const res = await post({
      roomId: "salle-b",
      who: "moi",
      people: 2,
      startsAt: "la semaine prochaine",
      endsAt: "2026-11-02T10:00:00Z"
    });
    expect(res.status).toBe(400);
  });

  it("refuse un creneau qui finit avant de commencer", async () => {
    const res = await post({
      roomId: "salle-b",
      who: "moi",
      people: 2,
      startsAt: "2026-11-02T11:00:00Z",
      endsAt: "2026-11-02T10:00:00Z"
    });
    expect(res.status).toBe(400);
  });

  it("accepte une reservation qui commence quand la precedente finit", async () => {
    const first = await post({
      roomId: "labo",
      who: "equipe-1",
      people: 4,
      startsAt: "2026-11-03T09:00:00Z",
      endsAt: "2026-11-03T10:00:00Z"
    });
    expect(first.status).toBe(201);

    const second = await post({
      roomId: "labo",
      who: "equipe-2",
      people: 4,
      startsAt: "2026-11-03T10:00:00Z",
      endsAt: "2026-11-03T11:00:00Z"
    });
    expect(second.status).toBe(201);
  });

  it("refuse un creneau qui chevauche une reservation existante", async () => {
    const res = await post({
      roomId: "salle-a",
      who: "moi",
      people: 2,
      startsAt: "2026-10-05T10:00:00Z",
      endsAt: "2026-10-05T12:00:00Z"
    });
    expect(res.status).toBe(409);
    expect(res.body).toEqual({ error: "creneau deja reserve", conflictsWith: "bk-1001" });
  });

  it("refuse un creneau de duree nulle", async () => {
    const res = await post({
      roomId: "salle-b",
      who: "moi",
      people: 2,
      startsAt: "2026-11-02T10:00:00Z",
      endsAt: "2026-11-02T10:00:00Z"
    });
    expect(res).toEqual({ status: 400, body: { error: "endsAt doit etre posterieur a startsAt" } });
  });

  it("accepte une salle remplie exactement a sa capacite", async () => {
    const res = await post({
      roomId: "salle-b",
      who: "moi",
      people: 6,
      startsAt: "2026-11-04T09:00:00Z",
      endsAt: "2026-11-04T10:00:00Z"
    });
    expect(res.status).toBe(201);
  });

  it("nomme la cause dans le message d'erreur", async () => {
    const slot = { startsAt: "2026-11-02T09:00:00Z", endsAt: "2026-11-02T10:00:00Z" };
    const inconnue = await post({ roomId: "cave", who: "moi", people: 2, ...slot });
    expect(inconnue.body).toEqual({ error: "salle inconnue : cave" });
    const pleine = await post({ roomId: "salle-b", who: "moi", people: 7, ...slot });
    expect(pleine).toEqual({ status: 400, body: { error: "capacite depassee : 7 > 6" } });
    const vide = await post({});
    expect(vide).toEqual({ status: 400, body: { error: "champ manquant ou vide : roomId" } });
  });

  it("renvoie la reservation creee, avec son prix en nombre", async () => {
    // samedi 7 novembre 2026 : 2 h a 80 EUR + majoration de week-end
    const res = await post({
      roomId: "amphi",
      who: "gala",
      people: 100,
      startsAt: "2026-11-07T09:00:00Z",
      endsAt: "2026-11-07T11:00:00Z"
    });
    expect(res.status).toBe(201);
    expect(res.body.booking).toMatchObject({
      roomId: "amphi",
      who: "gala",
      people: 100,
      startsAt: "2026-11-07T09:00:00Z",
      endsAt: "2026-11-07T11:00:00Z",
      price: 180
    });
    expect(res.body.booking.id).toMatch(/^bk-\d+$/);
  });
});

describe("GET /bookings", () => {
  it("liste toutes les reservations", async () => {
    const res = await call("/bookings");
    expect(res.status).toBe(200);
    expect(res.body.bookings.map((b: { id: string }) => b.id)).toEqual(
      expect.arrayContaining(["bk-1001", "bk-1002"])
    );
  });

  it("filtre par salle", async () => {
    const res = await call("/bookings?roomId=amphi");
    expect(res.body.bookings.every((b: { roomId: string }) => b.roomId === "amphi")).toBe(true);
    expect(res.body.bookings.map((b: { id: string }) => b.id)).toContain("bk-1002");
  });
});

describe("DELETE /bookings/:id", () => {
  it("annule une reservation, qui disparait de la liste", async () => {
    const created = await post({
      roomId: "labo",
      who: "ephemere",
      people: 2,
      startsAt: "2026-12-01T09:00:00Z",
      endsAt: "2026-12-01T10:00:00Z"
    });
    const id = created.body.booking.id;
    expect(await call(`/bookings/${id}`, { method: "DELETE" })).toEqual({ status: 200, body: { cancelled: id } });
    const after = await call("/bookings?roomId=labo");
    expect(after.body.bookings.map((b: { id: string }) => b.id)).not.toContain(id);
  });

  it("repond 404 pour une reservation inconnue", async () => {
    expect(await call("/bookings/bk-0", { method: "DELETE" })).toEqual({
      status: 404,
      body: { error: "reservation inconnue" }
    });
  });
});
