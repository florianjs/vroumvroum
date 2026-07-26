<script setup lang="ts">
import type { VehiclePosition, VehicleRoute } from '#shared/types/vehicle'
import type { Feature, FeatureCollection, LineString } from 'geojson'
import { Map as MaplibreMap, NavigationControl, Popup } from 'maplibre-gl'
import type { GeoJSONSource, LngLatBoundsLike } from 'maplibre-gl'

const props = defineProps<{
  vehicles: VehiclePosition[]
  routes: VehicleRoute[]
  selectedId: string | null
  /** Re-centres on this vehicle whenever it changes. */
  focusId: string | null
  follow: boolean
}>()

const emit = defineEmits<{
  select: [id: string]
  clear: []
}>()

const container = ref<HTMLDivElement | null>(null)
const ready = ref(false)

let map: MaplibreMap | null = null
let popup: Popup | null = null
let rafId = 0

const VEHICLES_SOURCE = 'vehicles'
const ROUTE_SOURCE = 'selected-route'
const TRAIL_SOURCE = 'selected-trail'
const PARIS: [number, number] = [2.3522, 48.8566]
const TRAIL_POINTS = 45

const COLORS = {
  transit: '#0e7c66',
  idle: '#6b7280',
  hivis: '#f04e23',
  ink: '#111417',
} as const

function reducedMotion(): boolean {
  return import.meta.client && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

// ---------------------------------------------------------------------------
// Render state — 2 s snapshots are interpolated so movement reads as continuous
// ---------------------------------------------------------------------------

interface RenderState {
  lng: number
  lat: number
  heading: number
  targetLng: number
  targetLat: number
  targetHeading: number
  trail: [number, number][]
}
const renderState = new Map<string, RenderState>()

function shortestHeadingDelta(from: number, to: number): number {
  return ((((to - from) % 360) + 540) % 360) - 180
}

function toFeatureCollection(): FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: props.vehicles.flatMap((v) => {
      const state = renderState.get(v.id)
      if (!state) return []
      return [{
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [state.lng, state.lat] },
        properties: {
          id: v.id,
          plate: v.plate,
          driver: v.driver,
          speed: v.speedKmh,
          status: v.status,
          selected: v.id === props.selectedId,
          heading: state.heading,
        },
      }]
    }),
  }
}

function lineFeature(coordinates: [number, number][]): Feature<LineString> {
  return { type: 'Feature', geometry: { type: 'LineString', coordinates }, properties: {} }
}

function pushVehicles() {
  map?.getSource<GeoJSONSource>(VEHICLES_SOURCE)?.setData(toFeatureCollection())
}

/** Planned loop + travelled breadcrumb, for the selected vehicle only. */
function pushSelection() {
  if (!map) return
  const id = props.selectedId
  const route = id ? props.routes.find((r) => r.id === id) : undefined
  const trail = id ? renderState.get(id)?.trail ?? [] : []

  map.getSource<GeoJSONSource>(ROUTE_SOURCE)?.setData(
    lineFeature(route ? route.waypoints.map(([lng, lat]) => [lng, lat]) : []),
  )
  map.getSource<GeoJSONSource>(TRAIL_SOURCE)?.setData(lineFeature(trail))
}

function animate() {
  const lerp = reducedMotion() ? 1 : 0.12
  for (const state of renderState.values()) {
    state.lng += (state.targetLng - state.lng) * lerp
    state.lat += (state.targetLat - state.lat) * lerp
    state.heading
      = (state.heading + shortestHeadingDelta(state.heading, state.targetHeading) * lerp + 360) % 360
  }
  pushVehicles()

  if (props.follow && props.selectedId) {
    const state = renderState.get(props.selectedId)
    if (state) map?.setCenter([state.lng, state.lat])
  }

  rafId = requestAnimationFrame(animate)
}

// ---------------------------------------------------------------------------
// Vehicle sprites: a dart pointing north, rotated on the map by its heading
// ---------------------------------------------------------------------------

const SPRITE_SIZE = 34
const SPRITE_RATIO = 2

function makeDart(fill: string): { width: number, height: number, data: Uint8ClampedArray } | null {
  const size = SPRITE_SIZE * SPRITE_RATIO
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  ctx.scale(SPRITE_RATIO, SPRITE_RATIO)
  ctx.translate(SPRITE_SIZE / 2, SPRITE_SIZE / 2)

  ctx.beginPath()
  ctx.moveTo(0, -12)
  ctx.lineTo(8.5, 11)
  ctx.lineTo(0, 6)
  ctx.lineTo(-8.5, 11)
  ctx.closePath()

  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 2.5
  ctx.lineJoin = 'round'
  ctx.shadowColor = 'rgba(17, 20, 23, 0.35)'
  ctx.shadowBlur = 4
  ctx.shadowOffsetY = 1
  ctx.stroke()
  ctx.shadowColor = 'transparent'
  ctx.fillStyle = fill
  ctx.fill()

  const { data, width, height } = ctx.getImageData(0, 0, size, size)
  return { width, height, data }
}

function registerSprites(instance: MaplibreMap) {
  const sprites: [string, string][] = [
    ['veh-transit', COLORS.transit],
    ['veh-idle', COLORS.idle],
    ['veh-selected', COLORS.hivis],
  ]
  for (const [id, fill] of sprites) {
    const image = makeDart(fill)
    if (image && !instance.hasImage(id)) {
      instance.addImage(id, image, { pixelRatio: SPRITE_RATIO })
    }
  }
}

// ---------------------------------------------------------------------------
// Camera
// ---------------------------------------------------------------------------

function centerOn(id: string) {
  const state = renderState.get(id)
  if (!map || !state) return
  const target = { center: [state.targetLng, state.targetLat] as [number, number], zoom: 13 }
  if (reducedMotion()) map.jumpTo(target)
  else map.flyTo({ ...target, duration: 850, essential: true })
}

function fitFleet() {
  if (!map || renderState.size === 0) return
  let west = 180
  let south = 90
  let east = -180
  let north = -90
  for (const state of renderState.values()) {
    west = Math.min(west, state.lng)
    east = Math.max(east, state.lng)
    south = Math.min(south, state.lat)
    north = Math.max(north, state.lat)
  }
  const bounds: LngLatBoundsLike = [[west, south], [east, north]]
  map.fitBounds(bounds, {
    padding: { top: 64, right: 64, bottom: 96, left: 64 },
    duration: reducedMotion() ? 0 : 700,
  })
}

defineExpose({ fitFleet })

// ---------------------------------------------------------------------------
// Watchers
// ---------------------------------------------------------------------------

watch(
  () => props.vehicles,
  (vehicles) => {
    const seen = new Set<string>()
    for (const v of vehicles) {
      seen.add(v.id)
      const state = renderState.get(v.id)
      if (!state) {
        renderState.set(v.id, {
          lng: v.lng,
          lat: v.lat,
          heading: v.heading,
          targetLng: v.lng,
          targetLat: v.lat,
          targetHeading: v.heading,
          trail: [[v.lng, v.lat]],
        })
      }
      else {
        state.targetLng = v.lng
        state.targetLat = v.lat
        state.targetHeading = v.heading
        state.trail.push([v.lng, v.lat])
        if (state.trail.length > TRAIL_POINTS) state.trail.shift()
      }
    }
    for (const id of renderState.keys()) {
      if (!seen.has(id)) renderState.delete(id)
    }
    pushSelection()
  },
  { deep: true },
)

watch(() => props.focusId, (id) => {
  if (id) centerOn(id)
})

watch([() => props.selectedId, () => props.routes], () => {
  pushSelection()
})

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

onMounted(() => {
  if (!container.value) return

  const instance = new MaplibreMap({
    container: container.value,
    style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
    center: PARIS,
    zoom: 10.5,
    attributionControl: { compact: true },
    dragRotate: false,
  })
  map = instance
  instance.addControl(new NavigationControl({ showCompass: false }), 'top-right')

  popup = new Popup({ closeButton: false, closeOnClick: false, offset: 16, maxWidth: '220px' })

  // `load` waits for the first render, which never happens while the tab is
  // hidden. `style.load` only needs the style, so the dashboard is ready as
  // soon as the operator comes back to the tab.
  const setup = () => {
    if (instance.getSource(VEHICLES_SOURCE)) return
    registerSprites(instance)

    instance.addSource(ROUTE_SOURCE, { type: 'geojson', data: lineFeature([]) })
    instance.addSource(TRAIL_SOURCE, { type: 'geojson', data: lineFeature([]) })
    instance.addSource(VEHICLES_SOURCE, { type: 'geojson', data: toFeatureCollection() })

    // Planned loop of the selected vehicle.
    instance.addLayer({
      id: 'route-line',
      type: 'line',
      source: ROUTE_SOURCE,
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': COLORS.ink,
        'line-width': 1.25,
        'line-opacity': 0.22,
        'line-dasharray': [3, 3],
      },
    })

    // Where it has actually been over the last ~90 seconds.
    instance.addLayer({
      id: 'trail-line',
      type: 'line',
      source: TRAIL_SOURCE,
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': COLORS.hivis,
        'line-width': 3,
        'line-opacity': 0.45,
      },
    })

    // Selection ring, drawn under the darts.
    instance.addLayer({
      id: 'vehicles-ring',
      type: 'circle',
      source: VEHICLES_SOURCE,
      filter: ['==', ['get', 'selected'], true],
      paint: {
        'circle-radius': 18,
        'circle-color': COLORS.hivis,
        'circle-opacity': 0.14,
        'circle-stroke-width': 1,
        'circle-stroke-color': COLORS.hivis,
        'circle-stroke-opacity': 0.5,
      },
    })

    instance.addLayer({
      id: 'vehicles-dart',
      type: 'symbol',
      source: VEHICLES_SOURCE,
      layout: {
        'icon-image': [
          'case',
          ['==', ['get', 'selected'], true], 'veh-selected',
          ['==', ['get', 'status'], 'stopped'], 'veh-idle',
          'veh-transit',
        ],
        'icon-rotate': ['get', 'heading'],
        'icon-rotation-alignment': 'map',
        'icon-allow-overlap': true,
        'icon-size': ['interpolate', ['linear'], ['zoom'], 9, 0.5, 13, 0.8],
      },
    })

    instance.addLayer({
      id: 'vehicles-label',
      type: 'symbol',
      source: VEHICLES_SOURCE,
      minzoom: 11,
      layout: {
        'text-field': ['get', 'plate'],
        'text-size': 10.5,
        'text-offset': [0, 1.5],
        'text-anchor': 'top',
        'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
      },
      paint: {
        'text-color': ['case', ['==', ['get', 'selected'], true], COLORS.hivis, COLORS.ink],
        'text-opacity': 0.85,
        'text-halo-color': '#ffffff',
        'text-halo-width': 1.6,
      },
    })

    instance.on('click', 'vehicles-dart', (e) => {
      const id = e.features?.[0]?.properties?.id
      if (typeof id === 'string') emit('select', id)
    })

    instance.on('click', (e) => {
      const hits = instance.queryRenderedFeatures(e.point, { layers: ['vehicles-dart'] })
      if (hits.length === 0) emit('clear')
    })

    instance.on('mousemove', 'vehicles-dart', (e) => {
      const feature = e.features?.[0]
      if (!feature || !popup) return
      instance.getCanvas().style.cursor = 'pointer'
      const p = feature.properties as {
        plate: string
        driver: string
        speed: number
        status: string
      }
      popup
        .setLngLat(e.lngLat)
        .setHTML(
          `<div class="px-2.5 py-2">
            <p class="readout text-[12px] font-semibold text-ink">${p.plate}</p>
            <p class="mt-0.5 text-[11px] text-ink-soft">${p.driver}</p>
            <p class="readout mt-1 text-[11px] ${p.status === 'moving' ? 'text-transit' : 'text-idle'}">
              ${p.status === 'moving' ? `${p.speed} km/h` : 'Stopped'}
            </p>
          </div>`,
        )
        .addTo(instance)
    })

    instance.on('mouseleave', 'vehicles-dart', () => {
      instance.getCanvas().style.cursor = ''
      popup?.remove()
    })

    pushVehicles()
    pushSelection()
    ready.value = true
  }

  instance.on('style.load', setup)
  if (instance.isStyleLoaded()) setup()

  rafId = requestAnimationFrame(animate)
})

onBeforeUnmount(() => {
  cancelAnimationFrame(rafId)
  popup?.remove()
  map?.remove()
  map = null
})
</script>

<template>
  <div class="relative h-full w-full">
    <div ref="container" class="h-full w-full" />

    <!-- Loading state: the panel never flashes empty -->
    <div
      v-if="!ready"
      class="absolute inset-0 flex items-center justify-center bg-paper"
      aria-hidden="true"
    >
      <div class="asphalt absolute inset-0 opacity-60" />
      <p class="eyebrow relative">
        Acquiring fleet positions
      </p>
    </div>

    <!-- Fit-fleet sits under the zoom control, same visual language -->
    <button
      type="button"
      class="absolute top-[76px] right-[10px] flex h-[29px] w-[29px] items-center justify-center rounded-sm border border-rule bg-surface text-ink-soft shadow-panel transition hover:bg-paper hover:text-ink"
      title="Frame the whole fleet"
      aria-label="Frame the whole fleet"
      @click="fitFleet"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" class="h-4 w-4">
        <path
          d="M4 9V5h4M20 9V5h-4M4 15v4h4M20 15v4h-4"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </button>
  </div>
</template>
