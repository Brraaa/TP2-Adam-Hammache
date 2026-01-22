import { Router } from "express";
import { bookings, findRoom, nextBookingId, bookingsForRoom } from "../store.js";
import { overlaps } from "../lib/overlap.js";
import { priceFor } from "../lib/price.js";
import { requireString, requireDate, requirePositiveInt, ValidationError } from "../lib/validate.js";

export const bookingsRouter = Router();

bookingsRouter.get("/", (req, res) => {
  const roomId = req.query.roomId;
  if (typeof roomId === "string") {
    res.json({ bookings: bookingsForRoom(roomId) });
    return;
  }
  res.json({ bookings });
});

bookingsRouter.post("/", (req, res) => {
  try {
    const payload = req.body ?? {};
    const roomId = requireString(payload, "roomId");
    const who = requireString(payload, "who");
    const people = requirePositiveInt(payload, "people");
    const startsAt = requireDate(payload, "startsAt");
    const endsAt = requireDate(payload, "endsAt");

    if (Date.parse(endsAt) <= Date.parse(startsAt)) {
      throw new ValidationError("endsAt doit etre posterieur a startsAt");
    }

    const room = findRoom(roomId);
    if (!room) {
      throw new ValidationError(`salle inconnue : ${roomId}`);
    }
    if (people > room.capacity) {
      throw new ValidationError(`capacite depassee : ${people} > ${room.capacity}`);
    }

    const clash = bookingsForRoom(roomId).find((b) =>
      overlaps(startsAt, endsAt, b.startsAt, b.endsAt)
    );
    if (clash) {
      res.status(409).json({ error: "creneau deja reserve", conflictsWith: clash.id });
      return;
    }

    const booking = {
      id: nextBookingId(),
      roomId,
      who,
      people,
      startsAt,
      endsAt,
      price: priceFor(room, startsAt, endsAt)
    };
    bookings.push(booking);
    res.status(201).json({ booking });
  } catch (err) {
    if (err instanceof ValidationError) {
      res.status(err.status).json({ error: err.message });
      return;
    }
    throw err;
  }
});

bookingsRouter.delete("/:id", (req, res) => {
  const index = bookings.findIndex((b) => b.id === req.params.id);
  if (index === -1) {
    res.status(404).json({ error: "reservation inconnue" });
    return;
  }
  const [removed] = bookings.splice(index, 1);
  res.json({ cancelled: removed.id });
});
