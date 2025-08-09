import 'dotenv/config';

function num(name, def) {
  const v = process.env[name];
  return v === undefined ? def : Number(v);
}

export const CONFIG = {
  aircraftUrl: process.env.AIRCRAFT_URL ?? 'http://192.168.1.243:8080/aircraft',
  receiverLat: num('RECEIVER_LAT', 47.60),
  receiverLon: num('RECEIVER_LON', -122.33),
  displayEndpoint: process.env.DISPLAY_ENDPOINT ?? 'http://127.0.0.1:9999/api/display',
  pollIntervalMs: num('POLL_INTERVAL_MS', 60000),
  cacheTtlHours: num('CACHE_TTL_HOURS', 24),
  negativeTtlHours: num('NEGATIVE_TTL_HOURS', 24),
  dbPath: process.env.DB_PATH ?? './data/flightcache.db'
};