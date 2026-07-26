<script setup lang="ts">
import type { DutySegment } from '#shared/types/vehicle'

const props = defineProps<{
  /** Drive/stop blocks, oldest first. */
  segments: DutySegment[]
  /** Minutes between wall-clock ticks. */
  tickMinutes?: number
}>()

const startMs = computed(() => props.segments[0]?.startMs ?? 0)
const endMs = computed(() => props.segments.at(-1)?.endMs ?? 0)
const spanMs = computed(() => Math.max(endMs.value - startMs.value, 1))

const blocks = computed(() =>
  props.segments.map((segment) => ({
    ...segment,
    left: ((segment.startMs - startMs.value) / spanMs.value) * 100,
    width: ((segment.endMs - segment.startMs) / spanMs.value) * 100,
    minutes: Math.max(1, Math.round((segment.endMs - segment.startMs) / 60_000)),
  })),
)

/** Wall-clock ticks aligned to the quarter hour, not to the window start. */
const ticks = computed(() => {
  const step = (props.tickMinutes ?? 15) * 60_000
  const first = Math.ceil(startMs.value / step) * step
  const out: { ms: number, left: number }[] = []
  for (let ms = first; ms < endMs.value; ms += step) {
    const left = ((ms - startMs.value) / spanMs.value) * 100
    // Keep clear of both edges: the panel border on the left, "now" on the right.
    if (left < 6 || left > 88) continue
    out.push({ ms, left })
  }
  return out
})

const driveMinutes = computed(() =>
  Math.round(
    props.segments
      .filter((s) => s.status === 'moving')
      .reduce((sum, s) => sum + (s.endMs - s.startMs), 0) / 60_000,
  ),
)

const windowMinutes = computed(() => Math.round(spanMs.value / 60_000))
</script>

<template>
  <figure class="m-0">
    <figcaption class="flex items-baseline justify-between">
      <span class="eyebrow">Duty · last {{ windowMinutes }} min</span>
      <span class="readout text-[11px] text-ink-soft">
        {{ driveMinutes }}<span class="text-ink-mute">/{{ windowMinutes }} min driving</span>
      </span>
    </figcaption>

    <!-- Track -->
    <div class="relative mt-2 h-4 overflow-hidden rounded-xs bg-paper-deep">
      <div
        v-for="block in blocks"
        :key="block.startMs"
        class="absolute inset-y-0"
        :class="block.status === 'moving' ? 'bg-transit' : 'duty-idle'"
        :style="{ left: `${block.left}%`, width: `${block.width}%` }"
        :title="`${block.status === 'moving' ? 'Driving' : 'Stopped'} · ${clockLabel(block.startMs)}–${clockLabel(block.endMs)} · ${block.minutes} min`"
      />
      <!-- Now edge -->
      <div class="absolute inset-y-0 right-0 w-[2px] bg-hivis" />
    </div>

    <!-- Ticks -->
    <div class="relative mt-1 h-3.5">
      <span
        v-for="tick in ticks"
        :key="tick.ms"
        class="readout absolute top-0 -translate-x-1/2 text-[9.5px] text-ink-mute"
        :style="{ left: `${tick.left}%` }"
      >{{ clockLabel(tick.ms) }}</span>
      <span class="readout absolute top-0 right-0 text-[9.5px] font-semibold text-hivis">now</span>
    </div>
  </figure>
</template>

<style scoped>
/* Stopped blocks read as "off duty": hatched graphite, never a solid fill. */
.duty-idle {
  background-image: repeating-linear-gradient(
    -45deg,
    var(--color-idle) 0 2px,
    transparent 2px 5px
  );
  background-color: var(--color-idle-soft);
}
</style>
