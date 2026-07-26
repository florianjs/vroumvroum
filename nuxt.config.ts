import tailwindcss from '@tailwindcss/vite'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    'nitro-cloudflare-dev',
    'nuxt-auth-utils',
    '@nuxt/eslint',
  ],

  css: [
    'maplibre-gl/dist/maplibre-gl.css',
    '~/assets/css/main.css',
  ],

  vite: {
    plugins: [tailwindcss()],
    optimizeDeps: {
      exclude: ['maplibre-gl'],
    },
  },

  nitro: {
    preset: 'cloudflare_module',
  },

  runtimeConfig: {
    // Demo credentials — override with NUXT_DEMO_EMAIL / NUXT_DEMO_PASSWORD
    demoEmail: 'demo@florianargaud.com',
    demoPassword: '12345678',
    // nuxt-auth-utils session sealing key — override with NUXT_SESSION_PASSWORD
    session: {
      password:
        process.env.NUXT_SESSION_PASSWORD ??
        'dev-only-session-password-change-me-0123456789',
    },
  },

  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
})
