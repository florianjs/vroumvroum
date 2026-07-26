import type { VehiclePosition, VehicleRoute } from '#shared/types/vehicle'

interface FleetResponse {
  vehicles: VehiclePosition[]
  serverTime: string
}

interface RoutesResponse {
  routes: VehicleRoute[]
}

const POLL_INTERVAL_MS = 2000
const MAX_BACKOFF_MS = 20_000

export type FleetLink = 'connecting' | 'live' | 'reconnecting'

/** HTTP status of a failed $fetch, when there is one. */
function statusOf(error: unknown): number | undefined {
  if (typeof error === 'object' && error !== null && 'statusCode' in error) {
    const code = (error as { statusCode?: unknown }).statusCode
    if (typeof code === 'number') return code
  }
  return undefined
}

/**
 * Polls /api/vehicles and exposes the live snapshot plus link health.
 * Polling pauses while the tab is hidden and backs off on failure.
 */
export function useFleet() {
  const vehicles = useState<VehiclePosition[]>('fleet:vehicles', () => [])
  const routes = useState<VehicleRoute[]>('fleet:routes', () => [])
  const error = useState<string | null>('fleet:error', () => null)
  const link = useState<FleetLink>('fleet:link', () => 'connecting')
  /** Timestamp of the last successful sync, epoch ms. */
  const lastSyncAt = useState<number | null>('fleet:lastSync', () => null)

  let timer: ReturnType<typeof setTimeout> | null = null
  let backoffMs = POLL_INTERVAL_MS
  let inFlight = false
  let running = false

  async function loadRoutes() {
    if (routes.value.length > 0) return
    try {
      const data = await $fetch<RoutesResponse>('/api/routes')
      routes.value = data.routes
    }
    catch {
      // Trails are decoration: a failure here must not break the dashboard.
    }
  }

  async function refresh() {
    if (inFlight) return
    inFlight = true
    try {
      const data = await $fetch<FleetResponse>('/api/vehicles')
      vehicles.value = data.vehicles
      lastSyncAt.value = Date.now()
      error.value = null
      link.value = 'live'
      backoffMs = POLL_INTERVAL_MS
    }
    catch (e) {
      // An expired session can't be recovered by retrying: send the operator back to sign-in.
      if (statusOf(e) === 401) {
        stop()
        error.value = 'Your session expired. Sign in again.'
        await navigateTo('/login')
        return
      }
      link.value = 'reconnecting'
      error.value = 'Fleet feed unavailable. Retrying.'
      backoffMs = Math.min(backoffMs * 2, MAX_BACKOFF_MS)
    }
    finally {
      inFlight = false
    }
  }

  function schedule() {
    if (!running) return
    if (timer) clearTimeout(timer)
    timer = setTimeout(tick, backoffMs)
  }

  /** Polling pauses on a hidden tab, but the first snapshot always loads. */
  async function tick() {
    if (document.visibilityState === 'visible' || vehicles.value.length === 0) await refresh()
    schedule()
  }

  function onVisibility() {
    if (document.visibilityState === 'visible') {
      backoffMs = POLL_INTERVAL_MS
      void tick()
    }
  }

  function start() {
    if (running) return
    running = true
    void loadRoutes()
    void tick()
    document.addEventListener('visibilitychange', onVisibility)
  }

  function stop() {
    running = false
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
    document.removeEventListener('visibilitychange', onVisibility)
  }

  return { vehicles, routes, error, link, lastSyncAt, start, stop, refresh }
}
