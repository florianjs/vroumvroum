import type { VehicleRow } from '#shared/types/vehicle'

export default defineEventHandler(async (event) => {
  await requireUserSession(event)

  const db = getDB(event)
  await ensureFleetSeeded(db)

  const { results } = await db
    .prepare(
      'SELECT id, plate, driver_name, model, route, speed_kmh, route_offset FROM vehicles',
    )
    .all<VehicleRow>()

  return {
    vehicles: simulateFleet(results ?? [], Date.now()),
    serverTime: new Date().toISOString(),
  }
})
