import { CONFIG } from './config.js';
import { db, upsertFlightCache, getFlightCache, recordMiss, getMiss, insertSighting } from './db.js';
import { pickClosest, normalizeIdent, toFeet } from './closest.js';
import { sendDisplayPayload } from './sender.js';

const HOURS = h => h * 60 * 60 * 1000;

function now() { return Date.now(); }

function ttlValid(stamp, ttlMs) {
  return typeof stamp === 'number' && (now() - stamp) < ttlMs;
}

async function fetchAircraft() {
  const res = await fetch(CONFIG.aircraftUrl, { headers: { 'cache-control': 'no-cache' }});
  if (!res.ok) throw new Error(`aircraft fetch failed: ${res.status} ${res.statusText}`);
  return res.json();
}

function buildPayload({ ident, hex, origin, destination, seats, aircraft_type, distance_km, alt_ft }) {
  // Fallbacks per your placeholder policy
  const safeOrigin = origin?.code ?? '####';
  const safeDest   = destination?.code ?? '####';
  const safeSeats  = Number.isFinite(seats) ? seats : '###';

  return {
    ident: ident ?? hex ?? 'UNKNOWN',
    origin: safeOrigin,
    destination: safeDest,
    seats_total: safeSeats,
    aircraft_type: aircraft_type ?? null,
    distance_km: Number(distance_km?.toFixed?.(2) ?? distance_km ?? 0),
    alt_ft: alt_ft ?? null,
    ts: new Date().toISOString()
  };
}

async function tick() {
  try {
    const data = await fetchAircraft();
    const aircraft = Array.isArray(data.aircraft) ? data.aircraft : [];
    const receiver = { lat: CONFIG.receiverLat, lon: CONFIG.receiverLon };
    const closest = pickClosest(aircraft, receiver, { maxAge: 30 });

    if (!closest) {
      // Nothing to show; send a minimal "no aircraft" payload?
      const payload = {
        ident: 'NO_AIRCRAFT',
        origin: '####',
        destination: '####',
        seats_total: '###',
        aircraft_type: null,
        distance_km: 0,
        alt_ft: null,
        ts: new Date().toISOString()
      };
      await sendDisplayPayload(payload);
      return;
    }

    const ident = normalizeIdent(closest);
    const hex = closest.hex;
    const alt_ft = toFeet(closest.alt_baro);
    const distance_km = closest.distance_km;
    const rssi = closest.rssi ?? null;
    const seen_seconds = closest.seen ?? closest.seen_pos ?? null;

    // Record the sighting regardless of metadata cache status
    insertSighting({
      ident: ident ?? null,
      hex,
      lat: closest.lat,
      lon: closest.lon,
      alt_ft,
      distance_km,
      rssi,
      seen_seconds
    });

    // Caching/DB behavior (AeroAPI not integrated yet):
    // We prepare for future enrichment by keeping a metadata cache row.
    let meta = null;
    if (ident) {
      meta = getFlightCache(ident);
    }

    // Negative cache: if we previously missed this ident (e.g., no metadata), respect TTL
    const miss = ident ? getMiss(ident) : null;
    const missFresh = miss && ttlValid(miss.last_attempted, HOURS(CONFIG.negativeTtlHours));

    // Since we're not calling AeroAPI yet, we only build from cache (if present)
    // Otherwise we fall back to placeholders.
    const seats =
      (meta?.seats_first ?? 0) +
      (meta?.seats_business ?? 0) +
      (meta?.seats_coach ?? 0) || null;

    const payload = buildPayload({
      ident,
      hex,
      origin: meta ? { code: meta.origin_code, name: meta.origin_name } : null,
      destination: meta ? { code: meta.destination_code, name: meta.destination_name } : null,
      seats,
      aircraft_type: meta?.aircraft_type ?? null,
      distance_km,
      alt_ft
    });

    await sendDisplayPayload(payload);

    // Prepare/ensure a cache row exists for this ident (for when we add AeroAPI later)
    if (ident && !meta && !missFresh) {
      // We don't have metadata yet — create a stub row to mark last_updated now
      upsertFlightCache({
        ident,
        origin_code: null,
        origin_name: null,
        destination_code: null,
        destination_name: null,
        aircraft_type: null,
        seats_first: null,
        seats_business: null,
        seats_coach: null,
        last_updated: Date.now()
      });
      // Also record a "miss" so we don't keep trying in future (until we wire in AeroAPI)
      recordMiss(ident);
    }

  } catch (err) {
    console.error('[tick] error:', err.message);
  }
}

async function main() {
  console.log('Starting ADS-B display loop…');
  console.log('Aircraft source:', CONFIG.aircraftUrl);
  console.log('Display endpoint:', CONFIG.displayEndpoint);
  await tick(); // run once immediately
  setInterval(tick, CONFIG.pollIntervalMs);
}

main().catch(err => {
  console.error('fatal:', err);
  process.exit(1);
});
