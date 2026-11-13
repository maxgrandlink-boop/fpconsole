<script setup lang="ts">
interface PandaMarkProps {
  size?: number;
}

withDefaults(defineProps<PandaMarkProps>(), { size: 28 });
</script>

<template>
  <svg
    class="panda"
    :width="size"
    :height="size"
    viewBox="0 0 64 56"
    aria-hidden="true"
    fill="none"
  >
    <circle cx="14" cy="12" r="8" fill="currentColor" />
    <circle cx="50" cy="12" r="8" fill="currentColor" />
    <path
      d="M10 32c0-12 10-22 22-22s22 10 22 22"
      stroke="currentColor"
      :stroke-width="size <= 28 ? 4.5 : 3.5"
      stroke-linecap="round"
    />
    <ellipse cx="22" cy="30" rx="7" ry="9" transform="rotate(-22 22 30)" fill="currentColor" />
    <circle cx="24.5" cy="27" r="2.4" fill="#fff" />
    <ellipse cx="42" cy="30" rx="7" ry="9" transform="rotate(22 42 30)" fill="currentColor" />
    <circle cx="39.5" cy="27" r="2.4" fill="#fff" />
    <ellipse cx="32" cy="38" rx="2.2" ry="1.6" fill="currentColor" />
    <path d="M32 40v3.2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
    <ellipse cx="16" cy="48" rx="8" ry="5" fill="currentColor" />
    <ellipse cx="48" cy="48" rx="8" ry="5" fill="currentColor" />
    <path
      d="M6 48h52"
      stroke="currentColor"
      :stroke-width="size <= 28 ? 3.4 : 2.6"
      stroke-linecap="round"
    />
  </svg>
</template>

<style scoped>
.panda {
  display: block;
  color: var(--accent);
  flex: 0 0 auto;
}
</style>
