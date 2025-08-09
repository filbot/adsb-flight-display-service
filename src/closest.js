import { haversineKm } from './haversine.js';

export function pickClosest(aircraftArray, receiver, opts = {}) {
  const maxAge = opts.maxAge ?? 10; // seconds: ignore stale positions
  const withPos = aircraftArray.filter(a =>
    typeof a.lat === 'number' &&
    typeof a.lon === 'number' &&
    (a.seen_pos ?? a.seen ?? 0) <= maxAge
  );

  let best = null;
  for (const a of withPos) {
    const distance_km = haversineKm(receiver.lat, receiver.lon, a.lat, a.lon);
    if (!best || distance_km < best.distance_km) {
      best = { ...a, distance_km };
    }
  }
  return best;
}

export function normalizeIdent(ac) {
  // Prefer flight ident; fall back to hex
  const raw = (ac.flight || '').trim();
  return raw.length ? raw : null;
}

export function toFeet(alt_baro) {
  // alt_baro is already feet in dump1090-fa; keep function for clarity/future-proof
  if (typeof alt_baro === 'number') return alt_baro;
  return null;
}