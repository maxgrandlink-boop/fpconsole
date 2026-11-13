<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import type { Country, Line, LineId, Region } from '../api/places';
import { getCountries, getLines } from '../api/places';
import {
  deletePersona,
  generatePersona,
  getEnvStatusCounts,
  getPersonas,
  retryStart,
  startByPersona,
  stopByPersona,
  toggleStar,
} from '../api/env';
import type { EnvStatus, EnvStatusCounts, Persona } from '../api/env';
import FlagIcon from '../components/FlagIcon.vue';
import PandaMark from '../components/PandaMark.vue';
import StatusDot from '../components/StatusDot.vue';

interface CreateForm {
  line: LineId;
  country: string;
  region: string | null;
  count: number;
  startUrl: string;
  ipEnabled: boolean;
  ipMode: 'strict' | 'loose';
  ipip: boolean;
}

type TabKey = 'all' | EnvStatus;

const lines = ref<Line[]>([]);
const countries = ref<Country[]>([]);
const personas = ref<Persona[]>([]);
const counts = ref<EnvStatusCounts>({ all: 0, running: 0, closed: 0, ip_fail: 0 });
const keyword = ref('');
const tab = ref<TabKey>('all');
const busy = ref(false);
const formError = ref('');
const menuId = ref<string | null>(null);
const form = ref<CreateForm>({
  line: 'america',
  country: 'us',
  region: 'la',
  count: 1,
  startUrl: '',
  ipEnabled: false,
  ipMode: 'strict',
  ipip: false,
});

const currentCountry = computed(() =>
  countries.value.find((item) => item.code === form.value.country),
);
const regions = computed<Region[]>(() => currentCountry.value?.regions ?? []);

const visible = computed(() => {
  const kw = keyword.value.trim().toLowerCase();
  return personas.value.filter((persona) => {
    if (tab.value !== 'all' && persona.status !== tab.value) return false;
    if (!kw) return true;
    const proxy = persona.proxy;
    const hay = [
      persona.slot,
      persona.name,
      persona.tz,
      persona.screen,
      persona.ua_short,
      proxy.ip,
      proxy.region,
      persona.group,
    ]
      .join(' ')
      .toLowerCase();
    return hay.includes(kw);
  });
});

const tabs: { key: TabKey; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'running', label: '运行中' },
  { key: 'closed', label: '已关闭' },
  { key: 'ip_fail', label: 'IP 不通' },
];

function countOf(key: TabKey): number {
  return key === 'all' ? counts.value.all : counts.value[key];
}

async function loadCountries(line: LineId): Promise<void> {
  countries.value = await getCountries(line);
  const first = countries.value[0];
  if (!first) return;
  if (!countries.value.some((item) => item.code === form.value.country)) {
    form.value.country = first.code;
  }
  syncRegion();
}

function syncRegion(): void {
  const list = currentCountry.value?.regions;
  if (!list || list.length === 0) {
    form.value.region = null;
    return;
  }
  if (!list.some((item) => item.code === form.value.region)) {
    form.value.region = list[0]?.code ?? null;
  }
}

async function reload(): Promise<void> {
  const [rows, nextCounts] = await Promise.all([getPersonas(), getEnvStatusCounts()]);
  personas.value = rows;
  counts.value = nextCounts;
}

async function submit(): Promise<void> {
  formError.value = '';
  busy.value = true;
  try {
    await generatePersona({
      line: form.value.line,
      country: form.value.country,
      region: form.value.region,
      count: Number(form.value.count),
      start_url: form.value.startUrl,
      ipCheck: { enabled: form.value.ipEnabled, mode: form.value.ipMode },
      ipipCheck: form.value.ipip,
    });
    await reload();
  } catch (error) {
    formError.value = error instanceof Error ? error.message : String(error);
  } finally {
    busy.value = false;
  }
}

async function openEnv(persona: Persona): Promise<void> {
  try {
    await startByPersona(persona.id);
    await reload();
  } catch (error) {
    formError.value = error instanceof Error ? error.message : String(error);
  }
}

async function closeEnv(persona: Persona): Promise<void> {
  try {
    await stopByPersona(persona.id);
    await reload();
  } catch (error) {
    formError.value = error instanceof Error ? error.message : String(error);
  }
}

async function retry(persona: Persona): Promise<void> {
  try {
    await retryStart(persona.id);
    await reload();
  } catch (error) {
    formError.value = error instanceof Error ? error.message : String(error);
  }
}

async function onStar(persona: Persona): Promise<void> {
  menuId.value = null;
  await toggleStar(persona.id);
  await reload();
}

async function onDelete(persona: Persona): Promise<void> {
  menuId.value = null;
  if (!window.confirm(`确定删除「${persona.slot}」？`)) return;
  try {
    await deletePersona(persona.id);
    await reload();
  } catch (error) {
    formError.value = error instanceof Error ? error.message : String(error);
  }
}

function hostOf(uri: string): string {
  const matched = uri.match(/^(?:[a-z0-9]+:\/\/)?(?:[^@/?#]+@)?([^/?#]+)/i);
  return matched?.[1] ?? uri;
}

function fmtTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(date.getMonth() + 1)}-${p(date.getDate())} ${p(date.getHours())}:${p(date.getMinutes())}`;
}

watch(
  () => form.value.line,
  (line) => {
    void loadCountries(line);
  },
);

watch(
  () => form.value.country,
  () => syncRegion(),
);

onMounted(async () => {
  lines.value = await getLines();
  await loadCountries(form.value.line);
  await reload();
  window.addEventListener('click', () => {
    menuId.value = null;
  });
});
</script>

<template>
  <div class="env">
    <section class="card">
      <h1>快速创建环境</h1>
      <form class="row" @submit.prevent="submit">
        <label>
          线路
          <select v-model="form.line">
            <option v-for="line in lines" :key="line.id" :value="line.id">{{ line.name }}</option>
          </select>
        </label>
        <label>
          国家
          <select v-model="form.country">
            <option v-for="country in countries" :key="country.code" :value="country.code">
              {{ country.name }}
            </option>
          </select>
        </label>
        <label>
          州/省
          <select v-model="form.region" :disabled="regions.length === 0">
            <option v-if="regions.length === 0" :value="null">无</option>
            <option v-for="region in regions" :key="region.code" :value="region.code">
              {{ region.name }}
            </option>
          </select>
        </label>
        <label>
          多开数量
          <input v-model.number="form.count" type="number" min="1" max="10" step="1" />
        </label>
        <label class="grow">
          启动网址
          <input v-model.trim="form.startUrl" type="text" placeholder="可选，http:// 或 https://" />
        </label>
        <button class="go" type="submit" :disabled="busy">
          {{ busy ? '创建中…' : '创建并启动' }}
        </button>
      </form>
      <div class="checks">
        <label class="check">
          <input v-model="form.ipEnabled" type="checkbox" />
          IP 检测
        </label>
        <select v-model="form.ipMode" :disabled="!form.ipEnabled">
          <option value="strict">严格</option>
          <option value="loose">宽松</option>
        </select>
        <label class="check">
          <input v-model="form.ipip" type="checkbox" />
          IPIP 检测
        </label>
      </div>
      <p v-if="formError" class="err" role="alert">{{ formError }}</p>
    </section>

    <section class="card list">
      <div class="tabs">
        <button
          v-for="item in tabs"
          :key="item.key"
          type="button"
          :class="{ on: tab === item.key }"
          @click="tab = item.key"
        >
          {{ item.label }} {{ countOf(item.key) }}
        </button>
        <input v-model="keyword" class="search" placeholder="请输入关键词" />
      </div>
      <div v-if="visible.length === 0" class="empty">没有符合条件的环境</div>
      <div v-else class="table">
        <div class="head">
          <span class="title-col">标题</span>
          <span class="sys-col">系统 / 内核</span>
          <span class="proxy-col">代理</span>
        </div>
        <article v-for="persona in visible" :key="persona.id" class="env-row">
          <div class="title-col">
            <input type="checkbox" :aria-label="`选择 ${persona.slot}`" />
            <PandaMark :size="28" />
            <div class="name">
              <strong :title="persona.slot">{{ persona.slot }}</strong>
              <span :title="fmtTime(persona.created_at)">{{ fmtTime(persona.created_at) }}</span>
            </div>
            <div class="ops" @click.stop>
              <button
                v-if="persona.status === 'running'"
                class="stop"
                type="button"
                aria-label="停止"
                @click="closeEnv(persona)"
              >
                <i></i>
              </button>
              <button
                v-else
                class="play"
                type="button"
                aria-label="打开"
                @click="persona.status === 'ip_fail' ? retry(persona) : openEnv(persona)"
              >
                <svg viewBox="0 0 12 12" aria-hidden="true">
                  <path d="M3 1.5v9l8-4.5z" />
                </svg>
              </button>
              <button class="more" type="button" aria-label="更多" @click="menuId = persona.id">
                ⋮
              </button>
              <div v-if="menuId === persona.id" class="menu">
                <button type="button" @click="onStar(persona)">
                  {{ persona.starred ? '取消星标' : '星标' }}
                </button>
                <button type="button" @click="onDelete(persona)">删除</button>
              </div>
            </div>
          </div>
          <div class="sys-col">
            <span class="os-line">
              <svg
                v-if="persona.os.name === 'Windows'"
                class="os-ico"
                viewBox="0 0 16 16"
                aria-hidden="true"
              >
                <rect x="1" y="1" width="6" height="6" />
                <rect x="9" y="1" width="6" height="6" />
                <rect x="1" y="9" width="6" height="6" />
                <rect x="9" y="9" width="6" height="6" />
              </svg>
              <svg v-else class="os-ico" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M16.4 12.6c0-2.3 1.9-3.4 2-3.5-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.2-2.8.8-3.5.8s-1.8-.8-3-.8c-1.5 0-3 .9-3.8 2.3-1.6 2.8-.4 7 1.2 9.3.8 1.1 1.7 2.3 2.9 2.3 1.2 0 1.6-.7 3-.7s1.8.7 3 .7 2-1.1 2.7-2.2c.9-1.3 1.2-2.5 1.3-2.6-.1 0-2.4-.9-2.4-3.8zM14.6 6.2c.6-.8 1.1-1.9.9-3-1 .1-2.1.6-2.8 1.4-.6.7-1.2 1.8-1 2.9 1.1.1 2.2-.5 2.9-1.3z"
                />
              </svg>
              {{ persona.os.name }} {{ persona.os.version }}
            </span>
            <span class="kernel-line">{{ persona.kernel.name }} {{ persona.kernel.version }}</span>
          </div>
          <div class="proxy-col">
            <span class="host">{{ hostOf(persona.proxy.uri) }}</span>
            <span class="ip">
              <FlagIcon :code="persona.country" />
              <StatusDot :tone="persona.status === 'ip_fail' ? 'fail' : 'ok'" />
              {{ persona.proxy.ip || '—' }}
              <em v-if="persona.status === 'ip_fail'">IP 不通</em>
            </span>
          </div>
        </article>
      </div>
    </section>
  </div>
</template>

<style scoped>
.env {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
  min-width: 0;
  min-height: 0;
}
.card {
  min-width: 0;
  background: var(--surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-xl);
  padding: var(--space-lg) var(--space-xl);
}
h1 {
  margin: 0 0 var(--space-lg);
  font-size: var(--fs-title);
  font-weight: 600;
}
.row {
  display: grid;
  grid-template-columns:
    minmax(0, 1.1fr) minmax(0, 1.1fr) minmax(0, 1.2fr) minmax(0, 0.8fr) minmax(0, 1.6fr)
    auto;
  gap: var(--space-md);
  align-items: end;
}
label {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  min-width: 0;
  color: var(--text-2);
  font-size: var(--fs-caption);
}
.row > label {
  overflow: hidden;
}
input,
select {
  height: var(--ctrl);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--bg-sunken);
  color: var(--text);
  padding: 0 var(--space-md);
}
.row input,
.row select {
  width: 100%;
  min-width: 0;
}
input[type='checkbox'] {
  width: 16px;
  height: 16px;
  padding: 0;
}
.go {
  height: var(--ctrl);
  padding: 0 var(--space-lg);
  border: 0;
  border-radius: var(--radius-md);
  background: var(--primary);
  color: var(--on-primary);
  font-weight: 600;
  white-space: nowrap;
}
.go:disabled {
  color: var(--text-disabled);
  background: var(--surface-muted);
}
.checks {
  display: flex;
  align-items: center;
  gap: var(--space-lg);
  margin-top: var(--space-lg);
}
.check {
  flex-direction: row;
  align-items: center;
  color: var(--text);
  font-size: var(--fs-body);
}
.err {
  margin: var(--space-md) 0 0;
  color: var(--danger-text);
  font-size: var(--fs-caption);
}
.tabs {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  margin-bottom: var(--space-md);
}
.tabs button {
  height: 28px;
  padding: 0 var(--space-md);
  border: 0;
  border-radius: var(--radius-pill);
  background: transparent;
  color: var(--text-2);
}
.tabs button.on {
  background: var(--primary-soft);
  color: var(--accent);
  font-weight: 600;
}
.search {
  margin-left: auto;
  width: 220px;
}
.rows {
  display: flex;
  flex-direction: column;
}
.head,
.env-row {
  display: grid;
  grid-template-columns: 300px minmax(0, 1fr) minmax(0, 1fr);
  align-items: center;
}
.head {
  color: var(--text-3);
  font-size: var(--fs-caption);
  min-height: 36px;
}
.title-col,
.sys-col,
.proxy-col {
  min-width: 0;
  padding: 0 var(--space-lg);
  display: flex;
  align-items: center;
}
.sys-col,
.proxy-col {
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  gap: 4px;
  border-left: 1px solid var(--border-subtle);
  align-self: stretch;
  overflow: hidden;
}
.title-col {
  justify-content: flex-start;
  gap: var(--space-md);
}
.title-col > input,
.title-col > svg {
  flex-shrink: 0;
}
.env-row {
  min-height: 72px;
  border-top: 1px solid var(--border-subtle);
}
.env-row:hover {
  background: color-mix(in srgb, var(--accent) 8%, transparent);
}
.name {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  flex: 1;
}
.name strong {
  font-size: var(--fs-body);
  font-weight: 600;
  color: var(--text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.name span,
.host,
.ip {
  color: var(--accent);
  font-size: var(--fs-caption);
  display: flex;
  align-items: center;
  gap: 6px;
  max-width: 100%;
}
.host {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.name span {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ip em {
  color: var(--danger-text);
  font-style: normal;
}
.ops {
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  flex: 0 0 auto;
}
.play,
.stop,
.more {
  width: 32px;
  height: 32px;
  border: 0;
  border-radius: var(--radius-md);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}
.play {
  background: var(--primary);
  color: var(--on-primary);
}
.play svg {
  width: 12px;
  height: 12px;
  fill: currentColor;
}
.stop {
  background: var(--danger-soft);
}
.stop i {
  width: 8px;
  height: 8px;
  background: #b91c1c;
  display: block;
}
.more {
  background: transparent;
  color: var(--text-2);
  font-size: 16px;
}
.menu {
  position: absolute;
  top: 36px;
  right: 0;
  z-index: 2;
  display: flex;
  flex-direction: column;
  min-width: 120px;
  background: var(--surface-raised);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
}
.menu button {
  height: 32px;
  border: 0;
  background: transparent;
  text-align: left;
  padding: 0 var(--space-md);
}
.os-line {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--text);
  font-size: var(--fs-body);
  min-width: 0;
}
.os-ico {
  width: 14px;
  height: 14px;
  flex: 0 0 auto;
  fill: currentColor;
}
.kernel-line {
  color: var(--accent);
  font-size: var(--fs-caption);
}
.proxy {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}
.ip {
  display: flex;
  align-items: center;
  gap: 6px;
}
.flag {
  width: 16px;
  height: 12px;
}
.empty {
  color: var(--text-3);
  padding: var(--space-xl) 0;
}
</style>
