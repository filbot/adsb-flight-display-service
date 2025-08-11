import { haversineKm } from './haversine.js';

export function pickClosest(aircraftArray, receiver, opts = {}) {
  const {
    maxAge = 10,          // seconds (position freshness)
    minNacP = 0,          // set to 8–10 if you want only good-accuracy positions
  } = opts;

  const rxLat = Number(receiver.lat);
  const rxLon = Number(receiver.lon);
  if (!Number.isFinite(rxLat) || !Number.isFinite(rxLon)) {
    throw new Error('Receiver lat/lon must be finite numbers');
  }

  // Only accept aircraft with *fresh* position reports.
  const candidates = aircraftArray.filter(a => {
    const hasFreshPos = Number.isFinite(a.seen_pos) && a.seen_pos <= maxAge;
    const hasCoords = Number.isFinite(a.lat) && Number.isFinite(a.lon);
    const goodAcc = a.nac_p == null ? true : a.nac_p >= minNacP; // optional accuracy gate
    return hasFreshPos && hasCoords && goodAcc;
  });

  let best = null;
  for (const a of candidates) {
    const d = haversineKm(rxLat, rxLon, a.lat, a.lon);
    if (!Number.isFinite(d)) continue;

    if (
      !best ||
      d < best.distance_km ||
      // tie-breaker: if distances are ~equal, prefer the *newer* position
      (Math.abs(d - best.distance_km) < 0.1 && a.seen_pos < best.seen_pos)
    ) {
      best = { ...a, distance_km: d };
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