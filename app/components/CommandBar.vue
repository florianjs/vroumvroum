<script setup lang="ts">
import type { FleetLink } from '~/composables/useFleet'

const props = defineProps<{
  link: FleetLink
  lastSyncAt: number | null
  total: number
  moving: number
  idle: number
  avgSpeed: number
  kmToday: number
}>()

const emit = defineEmits<{ toggleRoster: [] }>()

const { user, clear } = useUserSession()
const now = useNow()
const signingOut = ref(false)

const initials = computed(() => {
  const name = user.value?.name?.trim()
  if (!name) return 'OP'
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
})

const linkLabel = computed(() => {
  if (props.link === 'reconnecting') return 'Reconnecting'
  if (props.link === 'connecting') return 'Connecting'
  return 'Live'
})

const syncLabel = computed(() => elapsedLabel(props.lastSyncAt, now.value))

async function signOut() {
  signingOut.value = true
  try {
    await $fetch('/api/auth/logout', { method: 'POST' })
    await clear()
    await navigateTo('/login')
  }
  finally {
    signingOut.value = false
  }
}
</script>

<template>
  <header class="z-30 flex h-14 shrink-0 items-center gap-3 border-b border-rule bg-surface px-3 sm:gap-5 sm:px-4">
    <!-- Identity -->
    <div class="flex shrink-0 items-center gap-2.5">
      <BrandMark :size="28" />
      <div class="leading-none">
        <p class="text-[15px] font-bold tracking-tight">
          FleetPro
        </p>
        <p class="eyebrow mt-1 hidden sm:block">
          Paris · Depot 01
        </p>
      </div>
    </div>

    <span class="hidden h-8 w-px shrink-0 bg-rule lg:block" />

    <!-- Fleet readouts -->
    <div class="no-scrollbar flex min-w-0 flex-1 items-center gap-5 overflow-x-auto lg:gap-7">
      <StatReadout label="Units" :value="total" />
      <StatReadout label="In transit" :value="moving" tone="transit" />
      <StatReadout label="Idle" :value="idle" tone="idle" />
      <StatReadout label="Avg speed" :value="avgSpeed" unit="km/h" />
      <StatReadout label="Distance today" :value="kmToday" unit="km" />
    </div>

    <!-- Link health -->
    <div
      class="flex shrink-0 items-center gap-2 rounded-sm border px-2 py-1.5"
      :class="link === 'live'
        ? 'border-transit/25 bg-transit-soft text-transit'
        : 'border-hivis/30 bg-hivis-soft text-hivis-deep'"
      role="status"
    >
      <span class="pulse-ring relative inline-flex h-1.5 w-1.5 shrink-0 rounded-full bg-current" />
      <span class="text-[11px] font-semibold tracking-wide uppercase">{{ linkLabel }}</span>
      <span class="readout hidden text-[11px] opacity-70 sm:inline">{{ syncLabel }}</span>
    </div>

    <!-- Operator -->
    <div class="flex shrink-0 items-center gap-2">
      <button
        type="button"
        class="inline-flex h-8 w-8 items-center justify-center rounded-sm border border-rule text-ink-soft transition hover:bg-paper md:hidden"
        aria-label="Toggle fleet roster"
        @click="emit('toggleRoster')"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" class="h-4 w-4">
          <path d="M4 6h16M4 12h16M4 18h16" stroke-linecap="round" />
        </svg>
      </button>

      <span
        class="readout hidden h-8 w-8 items-center justify-center rounded-full bg-paper-deep text-[11px] font-semibold text-ink-soft sm:inline-flex"
        :title="user?.name ?? 'Operator'"
      >{{ initials }}</span>

      <button
        type="button"
        :disabled="signingOut"
        class="rounded-sm border border-rule px-2.5 py-1.5 text-[12px] font-semibold text-ink-soft transition hover:border-rule-strong hover:bg-paper hover:text-ink disabled:opacity-50"
        @click="signOut"
      >
        {{ signingOut ? 'Signing out…' : 'Sign out' }}
      </button>
    </div>
  </header>
</template>
