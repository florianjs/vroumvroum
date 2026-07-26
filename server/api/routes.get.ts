import type { VehicleRow } from '#shared/types/vehicle'

/** Static route loops. Fetched once by the client — they never change. */
export default defineEventHandler(async (event) => {
  await requireUserSession(event)

  const db = getDB(event)
  await ensureFleetSeeded(db)

  const { results } = await db
    .prepare(
      'SELECT id, plate, driver_name, model, route, speed_kmh, route_offset FROM vehicles',
    )
    .all<VehicleRow>()

  return { routes: fleetRoutes(results ?? []) }
})
