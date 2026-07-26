<script setup lang="ts">
useHead({ title: 'Dispatch' })

const { vehicles, routes, error, link, lastSyncAt, start, stop } = useFleet()
const { total, moving, idle, avgSpeedKmh, kmToday } = useFleetStats(vehicles)

const selectedId = ref<string | null>(null)
const focusId = ref<string | null>(null)
const follow = ref(false)
const rosterOpen = ref(false)
const mapRef = ref<{ fitFleet: () => void } | null>(null)

const selected = computed(() => vehicles.value.find((v) => v.id === selectedId.value) ?? null)
const loading = computed(() => vehicles.value.length === 0)

function select(id: string) {
  selectedId.value = id
  rosterOpen.value = false
}

function centerOn(id: string) {
  selectedId.value = id
  focusId.value = null
  // Re-triggers the map watcher even when the same vehicle is centred twice.
  nextTick(() => {
    focusId.value = id
  })
}

function clearSelection() {
  selectedId.value = null
  follow.value = false
}

// Following only makes sense while something is selected.
watch(selectedId, (id) => {
  if (!id) follow.value = false
})

onMounted(start)
onBeforeUnmount(stop)
</script>

<template>
  <div class="flex h-dvh flex-col overflow-hidden bg-paper">
    <a
      href="#fleet-map"
      class="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-sm focus:bg-ink focus:px-3 focus:py-2 focus:text-[12px] focus:font-semibold focus:text-white"
    >Skip to map</a>

    <CommandBar
      :link="link"
      :last-sync-at="lastSyncAt"
      :total="total"
      :moving="moving"
      :idle="idle"
      :avg-speed="avgSpeedKmh"
      :km-today="kmToday"
      @toggle-roster="rosterOpen = !rosterOpen"
    />

    <p
      v-if="error"
      class="flex shrink-0 items-center gap-2 border-b border-danger/20 bg-danger-soft px-4 py-2 text-[12px] text-danger"
      role="alert"
    >
      <span class="font-semibold">Feed interrupted.</span>
      <span class="text-danger/80">{{ error }}</span>
    </p>

    <div class="relative flex min-h-0 flex-1">
      <!-- Roster rail (desktop) -->
      <aside class="hidden w-[318px] shrink-0 border-r border-rule md:block">
        <FleetRoster
          :vehicles="vehicles"
          :selected-id="selectedId"
          :loading="loading"
          @select="select"
          @focus-on-map="centerOn"
        />
      </aside>

      <!-- Roster drawer (mobile) -->
      <Transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="opacity-0"
        leave-active-class="transition duration-150 ease-in"
        leave-to-class="opacity-0"
      >
        <div
          v-if="rosterOpen"
          class="absolute inset-0 z-20 bg-ink/25 md:hidden"
          @click="rosterOpen = false"
        />
      </Transition>
      <Transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="-translate-x-full"
        leave-active-class="transition duration-150 ease-in"
        leave-to-class="-translate-x-full"
      >
        <aside
          v-if="rosterOpen"
          class="absolute inset-y-0 left-0 z-30 w-[300px] max-w-[85%] border-r border-rule shadow-float md:hidden"
        >
          <FleetRoster
            :vehicles="vehicles"
            :selected-id="selectedId"
            :loading="loading"
            @select="select"
            @focus-on-map="centerOn"
          />
        </aside>
      </Transition>

      <!-- Map ground -->
      <main id="fleet-map" class="relative min-w-0 flex-1">
        <ClientOnly>
          <FleetMap
            ref="mapRef"
            :vehicles="vehicles"
            :routes="routes"
            :selected-id="selectedId"
            :focus-id="focusId"
            :follow="follow"
            @select="select"
            @clear="clearSelection"
          />
          <template #fallback>
            <div class="asphalt flex h-full items-center justify-center bg-paper">
              <p class="eyebrow">
                Acquiring fleet positions
              </p>
            </div>
          </template>
        </ClientOnly>

        <!-- Dossier: bottom sheet on mobile, floating panel on desktop -->
        <!-- Bottom padding keeps the map attribution readable under the panel -->
        <div class="pointer-events-none absolute inset-x-0 bottom-0 flex justify-end p-3 pb-8 md:p-4 md:pb-9">
          <Transition
            enter-active-class="transition duration-200 ease-out"
            enter-from-class="translate-y-3 opacity-0"
            leave-active-class="transition duration-150 ease-in"
            leave-to-class="translate-y-3 opacity-0"
          >
            <VehicleDossier
              v-if="selected"
              :key="selected.id"
              :vehicle="selected"
              :following="follow"
              class="pointer-events-auto"
              @close="clearSelection"
              @center="centerOn"
              @toggle-follow="follow = !follow"
            />
          </Transition>
        </div>
      </main>
    </div>
  </div>
</template>
