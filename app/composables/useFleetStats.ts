import type { VehiclePosition } from '#shared/types/vehicle'
import type { Ref } from 'vue'

/** Fleet-level figures shown in the command bar. */
export function useFleetStats(vehicles: Ref<VehiclePosition[]>) {
  const total = computed(() => vehicles.value.length)
  const moving = computed(() => vehicles.value.filter((v) => v.status === 'moving').length)
  const idle = computed(() => total.value - moving.value)

  const avgSpeedKmh = computed(() => {
    const driving = vehicles.value.filter((v) => v.status === 'moving')
    if (driving.length === 0) return 0
    return Math.round(driving.reduce((sum, v) => sum + v.speedKmh, 0) / driving.length)
  })

  const kmToday = computed(() =>
    Math.round(vehicles.value.reduce((sum, v) => sum + v.traveledTodayKm, 0)),
  )

  return { total, moving, idle, avgSpeedKmh, kmToday }
}
