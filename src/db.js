import Database from 'better-sqlite3';
import { CONFIG } from './config.js';
import fs from 'node:fs';
import path from 'node:path';

const dir = path.dirname(CONFIG.dbPath);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

export const db = new Database(CONFIG.dbPath);
db.pragma('journal_mode = WAL');

db.exec(`
CREATE TABLE IF NOT EXISTS flight_cache(
  ident TEXT PRIMARY KEY,
  origin_code TEXT,
  origin_name TEXT,
  destination_code TEXT,
  destination_name TEXT,
  aircraft_type TEXT,
  seats_first INTEGER,
  seats_business INTEGER,
  seats_coach INTEGER,
  last_updated INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS missed_idents(
  ident TEXT PRIMARY KEY,
  last_attempted INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS sightings(
  ident TEXT,
  hex TEXT,
  lat REAL,
  lon REAL,
  alt_ft INTEGER,
  distance_km REAL,
  rssi REAL,
  seen_seconds REAL,
  ts INTEGER NOT NULL
);
`);

const now = () => Date.now();

export function upsertFlightCache(row) {
  const stmt = db.prepare(`
    INSERT INTO flight_cache(ident, origin_code, origin_name, destination_code, destination_name, aircraft_type,
                             seats_first, seats_business, seats_coach, last_updated)
    VALUES(@ident, @origin_code, @origin_name, @destination_code, @destination_name, @aircraft_type,
           @seats_first, @seats_business, @seats_coach, @last_updated)
    ON CONFLICT(ident) DO UPDATE SET
      origin_code=excluded.origin_code,
      origin_name=excluded.origin_name,
      destination_code=excluded.destination_code,
      destination_name=excluded.destination_name,
      aircraft_type=excluded.aircraft_type,
      seats_first=excluded.seats_first,
      seats_business=excluded.seats_business,
      seats_coach=excluded.seats_coach,
      last_updated=excluded.last_updated
  `);
  stmt.run({ ...row, last_updated: row.last_updated ?? now() });
}

export function getFlightCache(ident) {
  return db.prepare(`SELECT * FROM flight_cache WHERE ident = ?`).get(ident);
}

export function recordMiss(ident) {
  db.prepare(`
    INSERT INTO missed_idents(ident, last_attempted)
    VALUES(?, ?)
    ON CONFLICT(ident) DO UPDATE SET last_attempted=excluded.last_attempted
  `).run(ident, now());
}

export function getMiss(ident) {
  return db.prepare(`SELECT * FROM missed_idents WHERE ident = ?`).get(ident);
}

export function insertSighting(s) {
  db.prepare(`
    INSERT INTO sightings(ident, hex, lat, lon, alt_ft, distance_km, rssi, seen_seconds, ts)
    VALUES(@ident, @hex, @lat, @lon, @alt_ft, @distance_km, @rssi, @seen_seconds, @ts)
  `).run({ ...s, ts: now() });
}