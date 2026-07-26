<script setup lang="ts">
import type { VehiclePosition } from '#shared/types/vehicle'

const props = defineProps<{
  vehicle: VehiclePosition
  following: boolean
}>()

const emit = defineEmits<{
  close: []
  center: [id: string]
  toggleFollow: []
}>()

const transitionLabel = computed(() =>
  props.vehicle.status === 'moving' ? 'Next stop' : 'Resumes',
)

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') emit('close')
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <aside
    class="panel w-full shadow-float md:w-[368px]"
    aria-label="Vehicle details"
  >
    <!-- Header -->
    <div class="flex items-start gap-3 border-b border-rule px-4 py-3">
      <span
        class="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-sm"
        :class="vehicle.status === 'moving' ? 'bg-transit-soft text-transit' : 'bg-idle-soft text-idle'"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.4"
          class="h-3.5 w-3.5"
          :style="{ transform: `rotate(${vehicle.heading}deg)` }"
        >
          <path d="M12 4l6 16-6-4-6 4z" stroke-linejoin="round" />
        </svg>
      </span>

      <div class="min-w-0 flex-1">
        <p class="readout text-[15px] leading-none font-semibold">
          {{ vehicle.plate }}
        </p>
        <p class="mt-1.5 truncate text-[12px] text-ink-soft">
          {{ vehicle.driver }} <span class="text-ink-mute">· {{ vehicle.model }}</span>
        </p>
      </div>

      <button
        type="button"
        class="-mt-1 -mr-1 rounded-sm p-1.5 text-ink-mute transition hover:bg-paper hover:text-ink"
        aria-label="Close vehicle details"
        @click="emit('close')"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" class="h-4 w-4">
          <path d="M6 6l12 12M18 6L6 18" stroke-linecap="round" />
        </svg>
      </button>
    </div>

    <!-- Telemetry -->
    <dl class="grid grid-cols-3 divide-x divide-rule border-b border-rule">
      <div class="px-4 py-3">
        <dt class="eyebrow">
          Speed
        </dt>
        <dd
          class="readout mt-1.5 text-[17px] leading-none font-semibold"
          :class="vehicle.status === 'moving' ? 'text-ink' : 'text-idle'"
        >
          {{ vehicle.speedKmh }}<span class="text-[10px] font-normal text-ink-mute"> km/h</span>
        </dd>
      </div>
      <div class="px-4 py-3">
        <dt class="eyebrow">
          Heading
        </dt>
        <dd class="readout mt-1.5 text-[17px] leading-none font-semibold">
          {{ compassPoint(vehicle.heading) }}<span class="text-[10px] font-normal text-ink-mute"> {{ vehicle.heading }}°</span>
        </dd>
      </div>
      <div class="px-4 py-3">
        <dt class="eyebrow">
          Today
        </dt>
        <dd class="readout mt-1.5 text-[17px] leading-none font-semibold">
          {{ vehicle.traveledTodayKm }}<span class="text-[10px] font-normal text-ink-mute"> km</span>
        </dd>
      </div>
    </dl>

    <!-- Duty ribbon (signature) -->
    <div class="border-b border-rule px-4 py-3">
      <DutyRibbon :segments="vehicle.duty" />
    </div>

    <!-- Secondary facts -->
    <dl class="space-y-2 px-4 py-3 text-[12px]">
      <div class="flex items-center justify-between gap-3">
        <dt class="text-ink-mute">
          {{ transitionLabel }}
        </dt>
        <dd class="readout font-medium">
          {{ countdownLabel(vehicle.nextTransitionInSec) }}
        </dd>
      </div>
      <div class="flex items-center justify-between gap-3">
        <dt class="text-ink-mute">
          Position
        </dt>
        <dd class="readout font-medium">
          {{ formatCoord(vehicle.lat) }}, {{ formatCoord(vehicle.lng) }}
        </dd>
      </div>
      <div class="flex items-center justify-between gap-3">
        <dt class="text-ink-mute">
          Rated cruise
        </dt>
        <dd class="readout font-medium">
          {{ vehicle.cruiseKmh }} km/h
        </dd>
      </div>
    </dl>

    <!-- Actions -->
    <div class="flex gap-2 border-t border-rule px-4 py-3">
      <button
        type="button"
        class="flex-1 rounded-sm bg-ink px-3 py-2 text-[12px] font-semibold text-white transition hover:bg-ink/90"
        @click="emit('center', vehicle.id)"
      >
        Center on map
      </button>
      <button
        type="button"
        :aria-pressed="following"
        class="rounded-sm border px-3 py-2 text-[12px] font-semibold transition"
        :class="following
          ? 'border-hivis bg-hivis-soft text-hivis-deep'
          : 'border-rule text-ink-soft hover:bg-paper hover:text-ink'"
        @click="emit('toggleFollow')"
      >
        {{ following ? 'Following' : 'Follow' }}
      </button>
    </div>
  </aside>
</template>
