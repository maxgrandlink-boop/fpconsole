<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import { getNetworkStatus } from '../api/network';
import PandaMark from '../components/PandaMark.vue';
import { useAppStore } from '../stores/app';

interface ShellNav {
  name: string;
  to: string;
  label: string;
}

const nav: ShellNav[] = [
  { name: 'env', to: '/env', label: '浏览器环境' },
  { name: 'members', to: '/members', label: '成员管理' },
  { name: 'proxy', to: '/proxy', label: '代理管理' },
  { name: 'env-settings', to: '/env-settings', label: '环境设置' },
  { name: 'system', to: '/system', label: '系统设置' },
];

const route = useRoute();
const appStore = useAppStore();
const networkOk = ref(true);

function active(name: string): boolean {
  return route.name === name;
}

onMounted(async () => {
  try {
    const status = await getNetworkStatus();
    networkOk.value = status.ok;
  } catch {
    networkOk.value = false;
  }
});
</script>

<template>
  <div class="app">
    <aside class="sidebar">
      <div class="brand">
        <PandaMark :size="28" />
        <div>
          <div class="brand-name">PANDA</div>
          <div class="brand-sub">指纹浏览器</div>
        </div>
      </div>
      <nav class="nav" aria-label="功能">
        <RouterLink
          v-for="item in nav"
          :key="item.name"
          :to="item.to"
          :class="{ active: active(item.name) }"
        >
          <svg v-if="item.name === 'env'" class="ico" viewBox="0 0 24 24" aria-hidden="true">
            <rect x="4" y="4" width="6.5" height="6.5" rx="1.2" />
            <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.2" />
            <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.2" />
            <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.2" />
          </svg>
          <svg
            v-else-if="item.name === 'members'"
            class="ico"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="3" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a3 3 0 0 1 0 5.75" />
          </svg>
          <svg v-else-if="item.name === 'proxy'" class="ico" viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="8" />
            <path
              d="M4 12h16M12 4c2.2 2.4 3.3 5.1 3.3 8s-1.1 5.6-3.3 8c-2.2-2.4-3.3-5.1-3.3-8s1.1-5.6 3.3-8z"
            />
          </svg>
          <svg
            v-else-if="item.name === 'env-settings'"
            class="ico"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path d="M4 7h16M4 17h16" />
            <circle cx="8" cy="7" r="2" />
            <circle cx="16" cy="17" r="2" />
          </svg>
          <svg v-else class="ico" viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="3" />
            <path
              d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4"
            />
          </svg>
          <span>{{ item.label }}</span>
        </RouterLink>
      </nav>
      <div class="net" :class="{ bad: !networkOk }" role="status">
        <i></i>{{ networkOk ? '网络正常' : '网络异常' }}
      </div>
    </aside>
    <div class="content">
      <div class="topbar">
        <span class="ver">v{{ appStore.version }}</span>
      </div>
      <router-view />
    </div>
  </div>
</template>

<style scoped>
.app {
  height: 100%;
  display: grid;
  grid-template-columns: var(--sidebar) 1fr;
  background: var(--bg);
}
.sidebar {
  background: var(--bg-sunken);
  border-right: 1px solid var(--border-subtle);
  display: flex;
  flex-direction: column;
  padding: var(--space-lg) var(--space-md) var(--space-md);
  min-height: 0;
}
.brand {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-sm) var(--space-sm) var(--space-xl);
}
.mark {
  width: 28px;
  height: 28px;
  border-radius: var(--radius-md);
  background: var(--primary);
  color: var(--on-primary);
  display: grid;
  place-items: center;
  font-weight: 600;
  font-size: var(--fs-caption);
}
.brand-name {
  font-weight: 600;
  font-size: var(--fs-body-lg);
  line-height: var(--lh-tight);
}
.brand-sub {
  color: var(--text-3);
  font-size: var(--fs-caption);
}
.nav {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}
.nav a {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  height: 40px;
  padding: 0 var(--space-md);
  border-radius: var(--radius-md);
  color: var(--text-2);
  text-decoration: none;
}
.nav a:hover {
  background: var(--surface-muted);
  color: var(--text);
}
.nav a.active {
  background: var(--primary-soft);
  color: var(--focus);
  font-weight: 600;
}
.ico {
  width: 16px;
  height: 16px;
  flex: 0 0 16px;
  stroke: currentColor;
  fill: none;
  stroke-width: 1.75;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.net {
  margin-top: auto;
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-md) var(--space-sm) var(--space-sm);
  border-top: 1px solid var(--border-subtle);
  color: var(--text-2);
  font-size: var(--fs-caption);
}
.net i {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--accent);
  display: block;
}
.net.bad {
  color: var(--danger-text);
}
.net.bad i {
  background: var(--danger-text);
}
.content {
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: var(--space-lg) var(--space-xl) var(--space-lg);
  gap: var(--space-lg);
}
.topbar {
  display: flex;
  justify-content: flex-end;
}
.ver {
  color: var(--text-3);
  font-size: var(--fs-caption);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  padding: 2px 8px;
  background: var(--surface);
}
</style>
