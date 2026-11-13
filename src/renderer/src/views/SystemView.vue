<script setup lang="ts">
import { useThemeStore } from '../stores/theme';
import type { ThemeMode } from '../theme';

const themeStore = useThemeStore();

function choose(mode: ThemeMode): void {
  themeStore.setMode(mode);
}
</script>

<template>
  <section class="page">
    <h1>系统设置</h1>
    <p class="muted">外观立即切换。本阶段只留在内存里，刷新后回到深色。</p>
    <div class="lbl">外观</div>
    <div class="seg" role="radiogroup" aria-label="外观">
      <button
        type="button"
        :class="{ on: themeStore.mode === 'dark' }"
        :aria-pressed="themeStore.mode === 'dark'"
        @click="choose('dark')"
      >
        深色
      </button>
      <button
        type="button"
        :class="{ on: themeStore.mode === 'light' }"
        :aria-pressed="themeStore.mode === 'light'"
        @click="choose('light')"
      >
        浅色
      </button>
    </div>
    <p class="hint">点选后立即切换。默认深色。</p>
  </section>
</template>

<style scoped>
.page h1 {
  margin: 0 0 var(--space-lg);
  font-size: var(--fs-title);
  font-weight: 600;
}
.muted {
  margin: calc(var(--space-md) * -1) 0 var(--space-xl);
  color: var(--text-3);
  font-size: var(--fs-caption);
}
.lbl {
  color: var(--text-2);
  font-size: var(--fs-caption);
  margin-bottom: var(--space-sm);
}
.seg {
  display: inline-flex;
}
.seg button {
  height: 28px;
  padding: 0 10px;
  font-size: var(--fs-caption);
  background: var(--bg-sunken);
  color: var(--text-3);
  border: 1px solid var(--border-subtle);
}
.seg button + button {
  margin-left: -1px;
}
.seg button:first-child {
  border-radius: var(--radius-sm) 0 0 var(--radius-sm);
}
.seg button:last-child {
  border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
}
.seg button.on {
  background: var(--primary);
  border-color: var(--primary);
  color: var(--on-primary);
  position: relative;
  z-index: 1;
}
.hint {
  margin: var(--space-sm) 0 0;
  color: var(--text-3);
  font-size: var(--fs-caption);
}
</style>
