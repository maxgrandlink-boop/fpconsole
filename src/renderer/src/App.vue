<script setup lang="ts">
import { computed, watch } from 'vue';
import { NConfigProvider } from 'naive-ui';
import { useThemeStore } from './stores/theme';
import { naiveThemeFor, themeOverridesFor } from './theme';

const themeStore = useThemeStore();
const naiveTheme = computed(() => naiveThemeFor(themeStore.mode));
const themeOverrides = computed(() => themeOverridesFor(themeStore.mode));

watch(
  () => themeStore.mode,
  (mode) => {
    if (mode === 'light') document.documentElement.dataset.theme = 'light';
    else delete document.documentElement.dataset.theme;
  },
  { immediate: true },
);
</script>

<template>
  <div class="theme-root">
    <n-config-provider :theme="naiveTheme" :theme-overrides="themeOverrides" style="height: 100%">
      <router-view />
    </n-config-provider>
  </div>
</template>
