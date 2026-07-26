<script setup lang="ts">
const props = defineProps<{
  label: string
  value: string | number
  unit?: string
  tone?: 'ink' | 'transit' | 'idle'
}>()

const toneClass = computed(() => {
  switch (props.tone) {
    case 'transit': return 'text-transit'
    case 'idle': return 'text-idle'
    default: return 'text-ink'
  }
})
</script>

<template>
  <div class="flex shrink-0 flex-col gap-1.5">
    <span class="eyebrow">{{ label }}</span>
    <span class="readout flex items-baseline gap-1 text-[15px] leading-none font-semibold" :class="toneClass">
      {{ value }}
      <span v-if="unit" class="text-[10px] font-normal text-ink-mute">{{ unit }}</span>
    </span>
  </div>
</template>
