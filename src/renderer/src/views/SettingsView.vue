<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { getPersonas } from '../api/env';
import type { Persona } from '../api/env';
import { getSettings } from '../api/settings';
import type { Settings } from '../api/settings';

interface ProbeResult {
  personas: Persona[] | null;
  apiSettings: Settings | null;
  ipcSettings: Settings | null;
  error: string;
}

const probe = ref<ProbeResult>({
  personas: null,
  apiSettings: null,
  ipcSettings: null,
  error: '',
});

const personasText = computed(() => show(probe.value.personas));
const apiSettingsText = computed(() => show(probe.value.apiSettings));
const ipcSettingsText = computed(() => show(probe.value.ipcSettings));

function show(value: unknown): string {
  if (probe.value.error) return '';
  if (value === null) return '加载中';
  return JSON.stringify(value, null, 2);
}

onMounted(async () => {
  try {
    const personas = await getPersonas();
    const apiSettings = await getSettings();
    const ipcSettings = await window.fp.getSettings();
    probe.value = { personas, apiSettings, ipcSettings, error: '' };
  } catch (error) {
    probe.value = {
      ...probe.value,
      error: error instanceof Error ? error.message : String(error),
    };
  }
});
</script>

<template>
  <section>
    <h2>链路探测</h2>
    <p v-if="probe.error">{{ probe.error }}</p>
    <h3>api.getSettings()</h3>
    <pre>{{ apiSettingsText }}</pre>
    <h3>window.fp.getSettings()</h3>
    <pre>{{ ipcSettingsText }}</pre>
    <h3>api.getPersonas()</h3>
    <pre>{{ personasText }}</pre>
  </section>
</template>

<style scoped>
pre {
  overflow: auto;
  margin: 0 0 16px;
}
</style>
