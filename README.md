# ADS-B Flight Display

A small app that watches a local ADS‑B aircraft feed, picks the closest aircraft to a fixed receiver location, records lightweight sighting data, and sends a concise summary to a display endpoint.

## What it does
- Polls an aircraft feed and filters for fresh positions.
- Chooses the nearest aircraft using great‑circle distance.
- Captures a brief sighting record for context/history.
- Builds a minimal payload (flight ident, route hints, seats if known, distance, altitude) and sends it to a display.

## How it works (at a glance)
- Core loop and payload assembly: [src/index.js](src/index.js)
- Closest‑aircraft selection and helpers: [src/closest.js](src/closest.js), [src/haversine.js](src/haversine.js)
- Display delivery: [src/sender.js](src/sender.js)
- Lightweight caching and sighting storage (SQLite): [src/db.js](src/db.js)
- Central configuration mapping: [src/config.js](src/config.js)

## Status
- Uses placeholders for some fields until external enrichment is added.
- Designed to evolve with future metadata sources while remaining simple and readable.

## License
MIT — see
