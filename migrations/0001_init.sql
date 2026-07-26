-- Fleet vehicles registry. Positions are NOT stored: they are derived
-- deterministically at request time from each vehicle's route + speed.
CREATE TABLE IF NOT EXISTS vehicles (
  id TEXT PRIMARY KEY,
  plate TEXT NOT NULL UNIQUE,
  driver_name TEXT NOT NULL,
  model TEXT NOT NULL,
  route TEXT NOT NULL,           -- JSON array of [lng, lat] waypoints, looped
  speed_kmh REAL NOT NULL,       -- cruise speed used by the simulator
  route_offset REAL NOT NULL     -- starting distance along the route, in km
);
