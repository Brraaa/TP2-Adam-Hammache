export interface Room {
  id: string;
  name: string;
  capacity: number;
  hourlyRate: number;
}

export interface Booking {
  id: string;
  roomId: string;
  who: string;
  people: number;
  startsAt: string;
  endsAt: string;
  price: number;
}

export const rooms: Room[] = [
  { id: "amphi", name: "Amphi Turing", capacity: 120, hourlyRate: 80 },
  { id: "salle-a", name: "Salle A", capacity: 12, hourlyRate: 25 },
  { id: "salle-b", name: "Salle B", capacity: 6, hourlyRate: 15 },
  { id: "labo", name: "Labo reseau", capacity: 20, hourlyRate: 40 }
];

export const bookings: Booking[] = [
  {
    id: "bk-1001",
    roomId: "salle-a",
    who: "equipe-infra",
    people: 8,
    startsAt: "2026-10-05T09:00:00Z",
    endsAt: "2026-10-05T11:00:00Z",
    price: 50
  },
  {
    id: "bk-1002",
    roomId: "amphi",
    who: "conference-interne",
    people: 90,
    startsAt: "2026-10-06T14:00:00Z",
    endsAt: "2026-10-06T17:00:00Z",
    price: 240
  }
];

let seq = 1002;

export function nextBookingId(): string {
  seq += 1;
  return `bk-${seq}`;
}

export function findRoom(id: string): Room | undefined {
  return rooms.find((r) => r.id === id);
}

export function bookingsForRoom(roomId: string): Booking[] {
  return bookings.filter((b) => b.roomId === roomId);
}
