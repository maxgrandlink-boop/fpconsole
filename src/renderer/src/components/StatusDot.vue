<script setup lang="ts">
interface StatusDotProps {
  tone: 'ok' | 'fail';
}

defineProps<StatusDotProps>();
</script>

<template>
  <i class="dot" :class="tone" />
</template>

<style scoped>
.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: block;
  flex: 0 0 auto;
}
.ok {
  background: var(--accent);
}
.fail {
  background: var(--danger);
}
</style>
