<script setup lang="ts">
interface FlagIconProps {
  code: string;
}

defineProps<FlagIconProps>();
</script>

<template>
  <svg class="flag" viewBox="0 0 20 14" aria-hidden="true">
    <template v-if="code === 'us'">
      <rect width="20" height="14" fill="#B22234" />
      <rect y="2" width="20" height="2" fill="#fff" />
      <rect y="6" width="20" height="2" fill="#fff" />
      <rect y="10" width="20" height="2" fill="#fff" />
      <rect width="8" height="8" fill="#3C3B6E" />
      <circle cx="2" cy="2" r="0.5" fill="#fff" />
      <circle cx="4" cy="2" r="0.5" fill="#fff" />
      <circle cx="6" cy="2" r="0.5" fill="#fff" />
      <circle cx="3" cy="4" r="0.5" fill="#fff" />
      <circle cx="5" cy="4" r="0.5" fill="#fff" />
      <circle cx="2" cy="6" r="0.5" fill="#fff" />
      <circle cx="4" cy="6" r="0.5" fill="#fff" />
      <circle cx="6" cy="6" r="0.5" fill="#fff" />
    </template>
    <template v-else-if="code === 'ca'">
      <rect width="5" height="14" fill="#D52B1E" />
      <rect x="15" width="5" height="14" fill="#D52B1E" />
      <rect x="5" width="10" height="14" fill="#fff" />
      <path d="M10 3l1 2h2l-1.5 1.2L12.2 9 10 7.6 7.8 9l.7-2.8L7 5h2z" fill="#D52B1E" />
    </template>
    <template v-else-if="code === 'sg'">
      <rect width="20" height="7" fill="#EF3340" />
      <rect y="7" width="20" height="7" fill="#fff" />
      <circle cx="6" cy="7" r="2.2" fill="#fff" />
      <circle cx="6.8" cy="7" r="1.7" fill="#EF3340" />
    </template>
    <template v-else-if="code === 'jp'">
      <rect width="20" height="14" fill="#fff" />
      <circle cx="10" cy="7" r="3.2" fill="#BC002D" />
    </template>
    <template v-else-if="code === 'de'">
      <rect width="20" height="4.67" fill="#000" />
      <rect y="4.67" width="20" height="4.66" fill="#DD0000" />
      <rect y="9.33" width="20" height="4.67" fill="#FFCE00" />
    </template>
    <template v-else-if="code === 'gb'">
      <rect width="20" height="14" fill="#012169" />
      <path d="M0 0l20 14M20 0L0 14" stroke="#fff" stroke-width="2.4" />
      <path d="M0 0l20 14M20 0L0 14" stroke="#C8102E" stroke-width="1.2" />
      <path d="M10 0v14M0 7h20" stroke="#fff" stroke-width="4" />
      <path d="M10 0v14M0 7h20" stroke="#C8102E" stroke-width="2" />
    </template>
    <template v-else>
      <rect width="20" height="14" fill="#E2E8F0" />
    </template>
  </svg>
</template>

<style scoped>
.flag {
  width: 16px;
  height: 12px;
  display: block;
  flex: 0 0 auto;
  border-radius: 1px;
}
</style>
