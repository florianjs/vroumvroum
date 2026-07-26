import type { D1Database } from '@cloudflare/workers-types'
import type {
  DutySegment,
  VehiclePosition,
  VehicleRoute,
  VehicleRow,
  VehicleStatus,
} from '#shared/types/vehicle'

type LngLat = [lng: number, lat: number]

// ---------------------------------------------------------------------------
// Geography helpers
// ---------------------------------------------------------------------------

const EARTH_RADIUS_KM = 6371
const toRad = (deg: number) => (deg * Math.PI) / 180
const toDeg = (rad: number) => (rad * 180) / Math.PI

function haversineKm(a: LngLat, b: LngLat): number {
  const dLat = toRad(b[1] - a[1])
  const dLng = toRad(b[0] - a[0])
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a[1])) * Math.cos(toRad(b[1])) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h))
}

function bearingDeg(a: LngLat, b: LngLat): number {
  const dLng = toRad(b[0] - a[0])
  const y = Math.sin(dLng) * Math.cos(toRad(b[1]))
  const x =
    Math.cos(toRad(a[1])) * Math.sin(toRad(b[1])) -
    Math.sin(toRad(a[1])) * Math.cos(toRad(b[1])) * Math.cos(dLng)
  return (toDeg(Math.atan2(y, x)) + 360) % 360
}

/** Point + heading at `distanceKm` along a looped waypoint route. */
function pointAlongRoute(
  route: LngLat[],
  cumulativeKm: number[],
  totalKm: number,
  distanceKm: number,
): { position: LngLat, heading: number } {
  const d = ((distanceKm % totalKm) + totalKm) % totalKm
  let i = 0
  while (i < route.length - 1 && cumulativeKm[i + 1]! <= d) i++
  const segStart = cumulativeKm[i]!
  const segLen = cumulativeKm[i + 1]! - segStart
  const t = segLen === 0 ? 0 : (d - segStart) / segLen
  const a = route[i]!
  const b = route[i + 1]!
  return {
    position: [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t],
    heading: bearingDeg(a, b),
  }
}

// ---------------------------------------------------------------------------
// Duty-cycle simulator
//
// Positions are NOT persisted. Each vehicle loops its route at `speed_kmh`,
// with a deterministic duty cycle: 11 min driving followed by a 3 min stop.
// Given the same timestamp, every Worker instance computes the same position.
// ---------------------------------------------------------------------------

const CYCLE_SECONDS = 14 * 60
const MOVING_SECONDS = 11 * 60

/** Trailing window covered by the duty ribbon in the UI. */
export const DUTY_WINDOW_MINUTES = 60

function movingSecondsAt(
  nowMs: number,
  phaseShiftSeconds: number,
): { movingTime: number, moving: boolean, phase: number } {
  const t = Math.floor(nowMs / 1000) + phaseShiftSeconds
  const cycles = Math.floor(t / CYCLE_SECONDS)
  const phase = t % CYCLE_SECONDS
  return {
    movingTime: cycles * MOVING_SECONDS + Math.min(phase, MOVING_SECONDS),
    moving: phase < MOVING_SECONDS,
    phase,
  }
}

/** Duty cycles are staggered across the fleet so it never stops all at once. */
export function phaseShiftFor(index: number, fleetSize: number): number {
  return Math.floor(index * (CYCLE_SECONDS / Math.max(fleetSize, 1)))
}

/**
 * Drive/stop blocks over the `windowMinutes` ending at `nowMs`, oldest first.
 * Derived from the same duty cycle as the positions, so the ribbon and the map
 * can never disagree.
 */
export function dutySegments(
  nowMs: number,
  phaseShiftSeconds: number,
  windowMinutes = DUTY_WINDOW_MINUTES,
): DutySegment[] {
  const endSec = Math.floor(nowMs / 1000)
  const startSec = endSec - windowMinutes * 60
  const segments: DutySegment[] = []

  let cursor = startSec
  while (cursor < endSec) {
    const phase = (((cursor + phaseShiftSeconds) % CYCLE_SECONDS) + CYCLE_SECONDS) % CYCLE_SECONDS
    const moving = phase < MOVING_SECONDS
    const phaseEnd = moving ? MOVING_SECONDS : CYCLE_SECONDS
    const next = Math.min(cursor + (phaseEnd - phase), endSec)
    segments.push({
      status: moving ? 'moving' : 'stopped',
      startMs: cursor * 1000,
      endMs: next * 1000,
    })
    cursor = next
  }

  return segments
}

export function simulateFleet(rows: VehicleRow[], nowMs: number): VehiclePosition[] {
  const updatedAt = new Date(nowMs).toISOString()
  const startOfDayMs = Date.UTC(
    new Date(nowMs).getUTCFullYear(),
    new Date(nowMs).getUTCMonth(),
    new Date(nowMs).getUTCDate(),
  )

  return rows.map((row, index) => {
    const phaseShift = phaseShiftFor(index, rows.length)
    const { movingTime, moving, phase } = movingSecondsAt(nowMs, phaseShift)
    const route = JSON.parse(row.route) as LngLat[]
    // Close the loop: append first waypoint at the end.
    const loop = [...route, route[0]!]
    const cumulativeKm: number[] = [0]
    for (let i = 1; i < loop.length; i++) {
      cumulativeKm.push(cumulativeKm[i - 1]! + haversineKm(loop[i - 1]!, loop[i]!))
    }
    const totalKm = cumulativeKm[cumulativeKm.length - 1]!

    const traveled = row.route_offset + (row.speed_kmh / 3600) * movingTime
    const { position, heading } = pointAlongRoute(loop, cumulativeKm, totalKm, traveled)

    const status: VehicleStatus = moving ? 'moving' : 'stopped'
    const movingSecondsToday
      = movingTime - movingSecondsAt(startOfDayMs, phaseShift).movingTime

    return {
      id: row.id,
      plate: row.plate,
      driver: row.driver_name,
      model: row.model,
      lat: position[1],
      lng: position[0],
      heading: Math.round(heading),
      speedKmh: moving ? row.speed_kmh : 0,
      cruiseKmh: row.speed_kmh,
      status,
      traveledTodayKm: Math.round((row.speed_kmh / 3600) * movingSecondsToday * 10) / 10,
      nextTransitionInSec: (moving ? MOVING_SECONDS : CYCLE_SECONDS) - phase,
      duty: dutySegments(nowMs, phaseShift),
      updatedAt,
    }
  })
}

/** Route loops, for drawing the planned path of the selected vehicle. */
export function fleetRoutes(rows: VehicleRow[]): VehicleRoute[] {
  return rows.map((row) => {
    const waypoints = JSON.parse(row.route) as LngLat[]
    return { id: row.id, waypoints: [...waypoints, waypoints[0]!] }
  })
}

// ---------------------------------------------------------------------------
// Seed: 12 vehicles on generated loops around Paris (deterministic LCG).
// ---------------------------------------------------------------------------

const DRIVERS = [
  'Marc Dubois', 'Léa Martin', 'Sofia Benali', 'Thomas Leroy',
  'Inès Moreau', 'Karim Haddad', 'Julie Fontaine', 'Antoine Roche',
  'Nadia Petit', 'Hugo Lambert', 'Claire Girard', 'Mehdi Laurent',
]

const MODELS = [
  'Renault Master', 'Peugeot Boxer', 'Citroën Jumper', 'Ford Transit',
  'Mercedes Sprinter', 'Volkswagen Crafter',
]

/** Deterministic pseudo-random generator (LCG) so seeds are reproducible. */
function lcg(seed: number) {
  let state = seed
  return () => {
    state = (state * 1103515245 + 12345) % 2 ** 31
    return state / 2 ** 31
  }
}

function generateRoute(rand: () => number, center: LngLat): LngLat[] {
  const points = 6 + Math.floor(rand() * 4) // 6–9 waypoints
  const baseRadiusKm = 4 + rand() * 9 // 4–13 km
  const route: LngLat[] = []
  for (let i = 0; i < points; i++) {
    const angle = (i / points) * 2 * Math.PI + rand() * 0.5
    const radius = baseRadiusKm * (0.6 + rand() * 0.7)
    const dLat = (radius / EARTH_RADIUS_KM) * Math.sin(angle)
    const dLng =
      ((radius / EARTH_RADIUS_KM) * Math.cos(angle)) / Math.cos(toRad(center[1]))
    route.push([center[0] + toDeg(dLng), center[1] + toDeg(dLat)])
  }
  return route
}

export async function ensureFleetSeeded(db: D1Database): Promise<void> {
  const count = await db
    .prepare('SELECT COUNT(*) AS n FROM vehicles')
    .first<{ n: number }>()
  if (count && count.n > 0) return

  const rand = lcg(42)
  const center: LngLat = [2.3522, 48.8566] // Paris
  const statements = DRIVERS.map((driver, i) => {
    const route = generateRoute(rand, [
      center[0] + (rand() - 0.5) * 0.2,
      center[1] + (rand() - 0.5) * 0.15,
    ])
    return db
      .prepare(
        `INSERT INTO vehicles (id, plate, driver_name, model, route, speed_kmh, route_offset)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`,
      )
      .bind(
        `veh-${String(i + 1).padStart(2, '0')}`,
        `FP-${String(100 + i)}-${String.fromCharCode(65 + (i % 26))}${String.fromCharCode(65 + ((i * 7) % 26))}`,
        driver,
        MODELS[i % MODELS.length]!,
        JSON.stringify(route),
        35 + Math.floor(rand() * 40), // 35–74 km/h
        Math.floor(rand() * 200) / 10, // 0–20 km offset along route
      )
  })
  await db.batch(statements)
}
