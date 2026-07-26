<script setup lang="ts">
useHead({ title: 'Sign in' })

const DEMO = { email: 'demo@florianargaud.com', password: '12345678' } as const

const { fetch: refreshSession } = useUserSession()

const email = ref(DEMO.email)
const password = ref(DEMO.password)
const showPassword = ref(false)
const loading = ref(false)
const error = ref<string | null>(null)

function useDemoAccount() {
  email.value = DEMO.email
  password.value = DEMO.password
  error.value = null
}

async function signIn() {
  loading.value = true
  error.value = null
  try {
    await $fetch('/api/auth/login', {
      method: 'POST',
      body: { email: email.value, password: password.value },
    })
    await refreshSession()
    await navigateTo('/')
  }
  catch {
    error.value = 'That email and password don\'t match an operator account.'
  }
  finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
    <!-- Brand panel: the same instrument language as the dashboard -->
    <section class="asphalt relative hidden flex-col justify-between bg-paper p-10 lg:flex">
      <div class="flex items-center gap-2.5">
        <BrandMark :size="28" />
        <span class="text-[15px] font-bold tracking-tight">FleetPro</span>
      </div>

      <!-- A route loop, drawn the way the map draws it -->
      <svg
        class="pointer-events-none absolute inset-0 h-full w-full"
        viewBox="0 0 600 700"
        fill="none"
        aria-hidden="true"
        preserveAspectRatio="xMidYMid slice"
      >
        <!-- A route loop, the shape every vehicle actually drives -->
        <path
          d="M470 205 C 575 215, 640 300, 630 385 S 545 535, 455 540 S 305 470, 310 375 S 375 215, 470 205 Z"
          stroke="#111417"
          stroke-opacity="0.13"
          stroke-width="1.5"
          stroke-dasharray="6 6"
        />
        <path
          d="M470 205 C 575 215, 640 300, 630 385 S 545 535, 455 540"
          stroke="#f04e23"
          stroke-opacity="0.35"
          stroke-width="3"
          stroke-linecap="round"
        />
        <g transform="translate(455 540) rotate(255)">
          <path d="M0 -13 L9 12 L0 6 L-9 12 Z" fill="#f04e23" stroke="#ffffff" stroke-width="2.5" stroke-linejoin="round" />
        </g>
      </svg>

      <div class="relative max-w-md">
        <p class="eyebrow">
          Paris · Depot 01
        </p>
        <h2 class="mt-4 text-[40px] leading-[1.05] font-bold tracking-tight text-balance">
          Every van on one screen, second by second.
        </h2>
        <p class="mt-4 text-[14px] leading-relaxed text-ink-soft">
          Positions, duty cycles and distance covered for the whole fleet — no spreadsheets,
          no phone calls to drivers.
        </p>
      </div>

      <dl class="relative flex gap-8 border-t border-rule pt-5">
        <div>
          <dt class="eyebrow">
            Units tracked
          </dt>
          <dd class="readout mt-1.5 text-[18px] font-semibold">
            12
          </dd>
        </div>
        <div>
          <dt class="eyebrow">
            Refresh
          </dt>
          <dd class="readout mt-1.5 text-[18px] font-semibold">
            2<span class="text-[11px] font-normal text-ink-mute"> s</span>
          </dd>
        </div>
        <div>
          <dt class="eyebrow">
            Coverage
          </dt>
          <dd class="readout mt-1.5 text-[18px] font-semibold">
            24/7
          </dd>
        </div>
      </dl>
    </section>

    <!-- Form -->
    <section class="flex items-center justify-center bg-surface px-5 py-12">
      <div class="w-full max-w-[340px]">
        <div class="flex items-center gap-2.5 lg:hidden">
          <BrandMark :size="26" />
          <span class="text-[15px] font-bold tracking-tight">FleetPro</span>
        </div>

        <h1 class="mt-6 text-[22px] font-bold tracking-tight lg:mt-0">
          Sign in
        </h1>
        <p class="mt-1.5 text-[13px] text-ink-soft">
          Operator access to the Paris dispatch board.
        </p>

        <form class="mt-7" novalidate @submit.prevent="signIn">
          <label class="block">
            <span class="eyebrow">Email</span>
            <input
              v-model="email"
              type="email"
              required
              autocomplete="username"
              class="mt-2 w-full rounded-sm border border-rule bg-paper px-3 py-2.5 text-[13px] outline-none transition placeholder:text-ink-mute focus:border-hivis focus:bg-surface"
              placeholder="operator@fleetpro.io"
            >
          </label>

          <label class="mt-4 block">
            <span class="eyebrow">Password</span>
            <span class="relative mt-2 block">
              <input
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                required
                autocomplete="current-password"
                class="w-full rounded-sm border border-rule bg-paper py-2.5 pr-16 pl-3 text-[13px] outline-none transition placeholder:text-ink-mute focus:border-hivis focus:bg-surface"
                placeholder="••••••••"
              >
              <button
                type="button"
                class="absolute inset-y-0 right-2 my-auto h-6 rounded-xs px-1.5 text-[11px] font-semibold text-ink-mute transition hover:text-ink"
                :aria-pressed="showPassword"
                @click="showPassword = !showPassword"
              >
                {{ showPassword ? 'Hide' : 'Show' }}
              </button>
            </span>
          </label>

          <p aria-live="polite" class="min-h-[38px]">
            <span
              v-if="error"
              class="mt-3 block rounded-sm border border-danger/20 bg-danger-soft px-3 py-2 text-[12px] text-danger"
            >{{ error }}</span>
          </p>

          <button
            type="submit"
            :disabled="loading"
            class="flex w-full items-center justify-center gap-2 rounded-sm bg-ink px-4 py-2.5 text-[13px] font-semibold text-white transition hover:bg-ink/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span
              v-if="loading"
              class="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white"
              aria-hidden="true"
            />
            {{ loading ? 'Signing in' : 'Sign in' }}
          </button>
        </form>

        <div class="mt-5 flex items-center justify-between gap-3 border-t border-rule pt-4">
          <p class="text-[12px] text-ink-mute">
            Evaluating FleetPro?
          </p>
          <button
            type="button"
            class="rounded-sm border border-rule px-2.5 py-1.5 text-[12px] font-semibold text-ink-soft transition hover:bg-paper hover:text-ink"
            @click="useDemoAccount"
          >
            Use demo account
          </button>
        </div>
      </div>
    </section>
  </div>
</template>
