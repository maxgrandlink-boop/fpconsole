<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();
const title = computed(() => route.meta.title ?? '');
</script>

<template>
  <section class="page">
    <h1>{{ title }}</h1>
    <p>即将推出</p>
  </section>
</template>

<style scoped>
.page h1 {
  margin: 0 0 var(--space-lg);
  font-size: var(--fs-title);
  font-weight: 600;
}
.page p {
  margin: 0;
  color: var(--text-3);
}
</style>
