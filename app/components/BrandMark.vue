<script setup lang="ts">
// Double chevron: the same glyph the map uses for a vehicle heading.
withDefaults(defineProps<{ size?: number }>(), { size: 28 })
</script>

<template>
  <span
    class="inline-flex shrink-0 items-center justify-center rounded-sm bg-hivis text-white"
    :style="{ width: `${size}px`, height: `${size}px` }"
    aria-hidden="true"
  >
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2.75"
      stroke-linecap="square"
      :style="{ width: `${Math.round(size * 0.58)}px`, height: `${Math.round(size * 0.58)}px` }"
    >
      <path d="M4 6l7 6-7 6" />
      <path d="M13 6l7 6-7 6" opacity="0.55" />
    </svg>
  </span>
</template>
