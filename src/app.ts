import express from "express";
import { roomsRouter } from "./routes/rooms.js";
import { bookingsRouter } from "./routes/bookings.js";

/** Construit l'application Express avec ses routes, sans l'ecouter. */
export function createApp() {
  const app = express();
  app.use(express.json());
  app.get("/health", (_req, res) => res.json({ ok: true }));
  app.use("/rooms", roomsRouter);
  app.use("/bookings", bookingsRouter);
  return app;
}
