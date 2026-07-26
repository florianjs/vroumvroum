<script setup lang="ts">
import type { VehiclePosition } from '#shared/types/vehicle'

type StatusFilter = 'all' | 'moving' | 'stopped'
type SortKey = 'plate' | 'speed' | 'driver' | 'distance'

const props = defineProps<{
  vehicles: VehiclePosition[]
  selectedId: string | null
  loading: boolean
}>()

const emit = defineEmits<{
  select: [id: string]
  focusOnMap: [id: string]
}>()

const query = ref('')
const statusFilter = ref<StatusFilter>('all')
const sortKey = ref<SortKey>('plate')
const searchInput = ref<HTMLInputElement | null>(null)
const listbox = ref<HTMLElement | null>(null)

const SORT_LABELS: Record<SortKey, string> = {
  plate: 'Plate',
  driver: 'Driver',
  speed: 'Speed',
  distance: 'Distance today',
}

const movingCount = computed(() => props.vehicles.filter((v) => v.status === 'moving').length)
const idleCount = computed(() => props.vehicles.length - movingCount.value)

const visible = computed(() => {
  const q = query.value.trim().toLowerCase()
  const rows = props.vehicles.filter((v) => {
    if (statusFilter.value !== 'all' && v.status !== statusFilter.value) return false
    if (!q) return true
    return (
      v.plate.toLowerCase().includes(q)
      || v.driver.toLowerCase().includes(q)
      || v.model.toLowerCase().includes(q)
    )
  })

  return [...rows].sort((a, b) => {
    switch (sortKey.value) {
      case 'speed': return b.speedKmh - a.speedKmh
      case 'driver': return a.driver.localeCompare(b.driver)
      case 'distance': return b.traveledTodayKm - a.traveledTodayKm
      default: return a.plate.localeCompare(b.plate)
    }
  })
})

const activeIndex = computed(() =>
  visible.value.findIndex((v) => v.id === props.selectedId),
)

function move(delta: number) {
  if (visible.value.length === 0) return
  const next = activeIndex.value === -1
    ? (delta > 0 ? 0 : visible.value.length - 1)
    : (activeIndex.value + delta + visible.value.length) % visible.value.length
  const vehicle = visible.value[next]
  if (vehicle) {
    emit('select', vehicle.id)
    nextTick(() => {
      listbox.value
        ?.querySelector(`[data-vehicle="${vehicle.id}"]`)
        ?.scrollIntoView({ block: 'nearest' })
    })
  }
}

function onListKeydown(event: KeyboardEvent) {
  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault()
      move(1)
      break
    case 'ArrowUp':
      event.preventDefault()
      move(-1)
      break
    case 'Home':
      event.preventDefault()
      if (visible.value[0]) emit('select', visible.value[0].id)
      break
    case 'End':
      event.preventDefault()
      if (visible.value.at(-1)) emit('select', visible.value.at(-1)!.id)
      break
    case 'Enter':
    case ' ':
      if (props.selectedId) {
        event.preventDefault()
        emit('focusOnMap', props.selectedId)
      }
      break
  }
}

function reset() {
  query.value = ''
  statusFilter.value = 'all'
}

// "/" jumps to search from anywhere on the dashboard.
function onGlobalKeydown(event: KeyboardEvent) {
  const target = event.target as HTMLElement | null
  const typing = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA'
  if (event.key === '/' && !typing) {
    event.preventDefault()
    searchInput.value?.focus()
  }
}

onMounted(() => window.addEventListener('keydown', onGlobalKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onGlobalKeydown))
</script>

<template>
  <section class="flex h-full min-h-0 flex-col bg-surface" aria-label="Fleet roster">
    <!-- Controls -->
    <div class="shrink-0 border-b border-rule p-3">
      <div class="flex items-baseline justify-between">
        <h2 class="text-[13px] font-bold tracking-tight">
          Roster
        </h2>
        <span class="readout text-[11px] text-ink-mute">
          {{ visible.length }}/{{ vehicles.length }}
        </span>
      </div>

      <div class="relative mt-2.5">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.9"
          class="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-ink-mute"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-3.5-3.5" stroke-linecap="round" />
        </svg>
        <input
          ref="searchInput"
          v-model="query"
          type="search"
          placeholder="Plate, driver, model"
          aria-label="Search the roster"
          class="w-full rounded-sm border border-rule bg-paper py-1.5 pr-9 pl-8 text-[13px] outline-none transition placeholder:text-ink-mute focus:border-hivis focus:bg-surface"
          @keydown.esc="query = ''"
          @keydown.down.prevent="listbox?.focus(); move(1)"
        >
        <kbd
          v-if="!query"
          class="readout pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 rounded-xs border border-rule bg-surface px-1 py-px text-[10px] text-ink-mute"
        >/</kbd>
      </div>

      <div class="mt-2.5 flex items-center gap-2">
        <div class="flex flex-1 rounded-sm border border-rule p-0.5" role="group" aria-label="Filter by duty status">
          <button
            v-for="option in ([
              { key: 'all', label: 'All', count: vehicles.length },
              { key: 'moving', label: 'Transit', count: movingCount },
              { key: 'stopped', label: 'Idle', count: idleCount },
            ] as const)"
            :key="option.key"
            type="button"
            :aria-pressed="statusFilter === option.key"
            class="flex-1 rounded-xs px-1.5 py-1 text-[11px] font-semibold whitespace-nowrap transition"
            :class="statusFilter === option.key
              ? 'bg-ink text-white'
              : 'text-ink-soft hover:bg-paper'"
            @click="statusFilter = option.key"
          >
            {{ option.label }}
            <span class="readout font-normal opacity-60">{{ option.count }}</span>
          </button>
        </div>

        <label class="sr-only" for="roster-sort">Sort roster</label>
        <select
          id="roster-sort"
          v-model="sortKey"
          class="rounded-sm border border-rule bg-surface py-1.5 pr-1 pl-2 text-[11px] font-semibold text-ink-soft outline-none transition hover:bg-paper focus:border-hivis"
        >
          <option v-for="(label, key) in SORT_LABELS" :key="key" :value="key">
            {{ label }}
          </option>
        </select>
      </div>
    </div>

    <!-- Skeleton -->
    <div v-if="loading" class="flex-1 space-y-px p-3">
      <div
        v-for="i in 8"
        :key="i"
        class="skeleton-sweep relative h-12 overflow-hidden rounded-sm bg-paper"
      />
    </div>

    <!-- Rows -->
    <div
      v-else
      ref="listbox"
      class="min-h-0 flex-1 overflow-y-auto focus:outline-none"
      role="listbox"
      tabindex="0"
      aria-label="Vehicles"
      :aria-activedescendant="selectedId ? `vehicle-${selectedId}` : undefined"
      @keydown="onListKeydown"
    >
      <div
        v-for="vehicle in visible"
        :id="`vehicle-${vehicle.id}`"
        :key="vehicle.id"
        :data-vehicle="vehicle.id"
        role="option"
        :aria-selected="vehicle.id === selectedId"
        class="relative flex cursor-pointer items-center gap-3 border-b border-rule/70 py-2.5 pr-3 pl-3.5 transition-colors"
        :class="vehicle.id === selectedId ? 'bg-hivis-soft/70' : 'hover:bg-paper'"
        @click="emit('select', vehicle.id)"
        @dblclick="emit('focusOnMap', vehicle.id)"
      >
        <!-- Duty stripe, doubling as the selection marker -->
        <span
          class="absolute inset-y-0 left-0 w-[3px]"
          :class="vehicle.id === selectedId
            ? 'bg-hivis'
            : vehicle.status === 'moving' ? 'bg-transit' : 'bg-rule-strong'"
        />

        <div class="min-w-0 flex-1">
          <p class="readout truncate text-[13px] font-semibold">
            {{ vehicle.plate }}
          </p>
          <p class="mt-0.5 truncate text-[11.5px] text-ink-soft">
            {{ vehicle.driver }}
            <span class="text-ink-mute">· {{ vehicle.model }}</span>
          </p>
        </div>

        <div class="shrink-0 text-right">
          <p class="readout text-[13px] font-semibold leading-none">
            {{ vehicle.speedKmh }}<span class="text-[10px] font-normal text-ink-mute"> km/h</span>
          </p>
          <p
            class="mt-1 flex items-center justify-end gap-1.5 text-[10px]"
            :class="vehicle.status === 'moving' ? 'text-transit' : 'text-idle'"
          >
            <span class="font-semibold tracking-wide uppercase">
              {{ vehicle.status === 'moving' ? compassPoint(vehicle.heading) : 'Idle' }}
            </span>
            <span class="readout text-ink-mute">
              {{ vehicle.status === 'moving'
                ? `${vehicle.traveledTodayKm} km`
                : countdownLabel(vehicle.nextTransitionInSec) }}
            </span>
          </p>
        </div>
      </div>

      <!-- Empty -->
      <div v-if="visible.length === 0" class="px-5 py-10 text-center">
        <p class="text-[13px] font-semibold">
          No vehicle matches
        </p>
        <p class="mt-1 text-[12px] text-ink-soft">
          {{ query ? `Nothing found for “${query}”.` : 'This filter is empty right now.' }}
        </p>
        <button
          type="button"
          class="mt-3 rounded-sm border border-rule px-2.5 py-1.5 text-[12px] font-semibold text-ink-soft transition hover:bg-paper hover:text-ink"
          @click="reset"
        >
          Show all vehicles
        </button>
      </div>
    </div>

    <!-- Legend -->
    <div class="flex shrink-0 items-center gap-4 border-t border-rule px-3 py-2">
      <span class="flex items-center gap-1.5">
        <span class="h-1.5 w-3 rounded-xs bg-transit" />
        <span class="eyebrow">Transit</span>
      </span>
      <span class="flex items-center gap-1.5">
        <span class="h-1.5 w-3 rounded-xs bg-rule-strong" />
        <span class="eyebrow">Idle</span>
      </span>
      <span class="eyebrow ml-auto hidden lg:inline">↑↓ select · ⏎ center</span>
    </div>
  </section>
</template>
