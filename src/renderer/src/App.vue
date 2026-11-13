<script setup lang="ts">
import { NConfigProvider } from 'naive-ui';
import { theme, themeOverrides } from './theme';
</script>

<template>
  <div class="theme-root">
    <n-config-provider :theme="theme" :theme-overrides="themeOverrides" style="height: 100%">
      <router-view />
    </n-config-provider>
  </div>
</template>
