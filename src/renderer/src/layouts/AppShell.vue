<script setup lang="ts">
import { computed, h } from 'vue';
import type { VNodeChild } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import { NLayout, NLayoutContent, NLayoutHeader, NLayoutSider, NMenu } from 'naive-ui';
import type { MenuOption } from 'naive-ui';
import { useAppStore } from '../stores/app';

interface ShellNav {
  key: string;
  to: string;
  text: string;
}

const nav: ShellNav[] = [
  { key: 'env', to: '/env', text: '环境管理' },
  { key: 'proxy', to: '/proxy', text: '代理管理' },
  { key: 'settings', to: '/settings', text: '设置' },
];

function toMenuOption(entry: ShellNav): MenuOption {
  const label = (): VNodeChild => h(RouterLink, { to: entry.to }, { default: () => entry.text });
  return { key: entry.key, label };
}

const menuOptions: MenuOption[] = nav.map(toMenuOption);

const route = useRoute();
const appStore = useAppStore();

const selected = computed(() => (typeof route.name === 'string' ? route.name : 'env'));
const title = computed(() => route.meta.title ?? '');
</script>

<template>
  <n-layout has-sider class="shell">
    <n-layout-sider bordered>
      <n-menu :value="selected" :options="menuOptions" />
    </n-layout-sider>
    <n-layout>
      <n-layout-header bordered>
        {{ title }}
        <span class="product">{{ appStore.name }} {{ appStore.version }}</span>
      </n-layout-header>
      <n-layout-content content-style="padding: 16px">
        <router-view />
      </n-layout-content>
    </n-layout>
  </n-layout>
</template>

<style scoped>
.shell {
  height: 100%;
}
.product {
  float: right;
}
</style>
