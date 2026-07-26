export type VehicleStatus = 'moving' | 'stopped'

/** Vehicle record as stored in D1 (route kept as JSON string in DB). */
export interface VehicleRow {
  id: string
  plate: string
  driver_name: string
  model: string
  route: string
  speed_kmh: number
  route_offset: number
}

/** One drive or stop block of a vehicle's duty cycle. */
export interface DutySegment {
  status: VehicleStatus
  startMs: number
  endMs: number
}

/** Live vehicle snapshot returned by /api/vehicles. */
export interface VehiclePosition {
  id: string
  plate: string
  driver: string
  model: string
  lat: number
  lng: number
  heading: number
  speedKmh: number
  /** Cruise speed, kept while stopped so the roster can show the rated figure. */
  cruiseKmh: number
  status: VehicleStatus
  /** Distance covered since midnight UTC, kilometres. */
  traveledTodayKm: number
  /** Seconds until this vehicle switches between driving and stopping. */
  nextTransitionInSec: number
  /** Drive/stop blocks over the trailing duty window, oldest first. */
  duty: DutySegment[]
  updatedAt: string
}

/** Waypoint loop a vehicle drives, fetched once by the client for map trails. */
export interface VehicleRoute {
  id: string
  waypoints: [lng: number, lat: number][]
}
