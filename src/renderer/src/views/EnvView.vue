<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch, watchEffect } from 'vue';
import type { Country, Line, LineId, Region } from '../api/places';
import { getCountries, getLines } from '../api/places';
import {
  bulkStart,
  bulkStop,
  deletePersona,
  generatePersona,
  getEnvStatusCounts,
  getPersonas,
  retryStart,
  startByPersona,
  stopByPersona,
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

interface ToastItem {
  id: number;
  message: string;
  tone: 'error' | 'ok';
}

interface ConfirmState {
  title: string;
  message: string;
  busy: boolean;
  run: () => Promise<void>;
}

type TabKey = 'all' | EnvStatus;
type BatchAction = 'start' | 'stop' | 'delete';

const lines = ref<Line[]>([]);
const countries = ref<Country[]>([]);
const personas = ref<Persona[]>([]);
const counts = ref<EnvStatusCounts>({ all: 0, running: 0, closed: 0, ip_fail: 0 });
const keyword = ref('');
const tab = ref<TabKey>('all');
const listLoading = ref(true);
const creating = ref(false);
const menuId = ref<string | null>(null);
const selectedIds = ref<string[]>([]);
const rowBusy = ref<Record<string, boolean>>({});
const batchBusy = ref<BatchAction | null>(null);
const toasts = ref<ToastItem[]>([]);
const confirmState = ref<ConfirmState | null>(null);
const selectAllRef = ref<HTMLInputElement | null>(null);
const orderIds = ref<string[]>([]);
const orderReady = ref(false);
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

const toastTimers = new Set<number>();
let toastSeq = 0;
let chain: Promise<void> = Promise.resolve();

const currentCountry = computed(() =>
  countries.value.find((item) => item.code === form.value.country),
);
const regions = computed<Region[]>(() => currentCountry.value?.regions ?? []);

const visible = computed(() => {
  const kw = keyword.value.trim().toLowerCase();
  return personas.value.filter((persona) => {
    if (tab.value !== 'all' && persona.status !== tab.value) return false;
    if (!kw) return true;
    const ip = persona.proxy.ip ?? '';
    return [persona.name, persona.slot, ip, persona.proxy.uri].some((field) =>
      field.toLowerCase().includes(kw),
    );
  });
});

const visibleIds = computed(() => visible.value.map((persona) => persona.id));
const allVisibleSelected = computed(
  () =>
    visibleIds.value.length > 0 && visibleIds.value.every((id) => selectedIds.value.includes(id)),
);
const someVisibleSelected = computed(() =>
  visibleIds.value.some((id) => selectedIds.value.includes(id)),
);
const emptyTitle = computed(() => {
  if (personas.value.length === 0) return '还没有环境';
  if (keyword.value.trim()) return '没有找到匹配的环境';
  return '该状态下没有环境';
});
const emptyHint = computed(() => {
  if (personas.value.length === 0) return '用上方快速创建添加并启动环境';
  if (keyword.value.trim()) return '试试其他关键词，或清空搜索';
  return '切换上方状态查看其他环境';
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

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function showToast(message: string, tone: ToastItem['tone'] = 'error'): void {
  const id = (toastSeq += 1);
  toasts.value = [...toasts.value, { id, message, tone }];
  const timer = window.setTimeout(() => {
    toastTimers.delete(timer);
    toasts.value = toasts.value.filter((item) => item.id !== id);
  }, 3200);
  toastTimers.add(timer);
}

function readFp(): Window['fp'] | null {
  const fp = window.fp;
  if (!fp || typeof fp.launchBrowser !== 'function') return null;
  return fp;
}

async function safeLaunch(slot: string): Promise<void> {
  const fp = readFp();
  if (!fp) return;
  try {
    await fp.launchBrowser(slot);
  } catch (error) {
    showToast(messageOf(error));
  }
}

async function safeStop(slot: string): Promise<void> {
  const fp = readFp();
  if (!fp) return;
  try {
    await fp.stopBrowser(slot);
  } catch (error) {
    showToast(messageOf(error));
  }
}

function enqueue(task: () => Promise<void>): Promise<void> {
  const run = chain.then(task, task);
  chain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

function markBusy(id: string, on: boolean): void {
  const next = { ...rowBusy.value };
  if (on) next[id] = true;
  else delete next[id];
  rowBusy.value = next;
}

function isRowLocked(id: string): boolean {
  return rowBusy.value[id] === true;
}

/** 首次加载保持接口顺序；之后沿用这个顺序，新建的环境插到最前。 */
async function reloadNow(prepend: string[] = []): Promise<void> {
  const [rows, nextCounts] = await Promise.all([getPersonas(), getEnvStatusCounts()]);
  counts.value = nextCounts;
  const byId = new Map(rows.map((row) => [row.id, row]));
  const base = orderReady.value ? orderIds.value : rows.map((row) => row.id);
  const seen = new Set<string>();
  const next: string[] = [];
  for (const id of [...prepend, ...base]) {
    if (seen.has(id) || !byId.has(id)) continue;
    seen.add(id);
    next.push(id);
  }
  for (const row of rows) {
    if (seen.has(row.id)) continue;
    next.push(row.id);
  }
  orderIds.value = next;
  orderReady.value = true;
  personas.value = next.flatMap((id) => {
    const row = byId.get(id);
    return row ? [row] : [];
  });
  const alive = new Set(next);
  selectedIds.value = selectedIds.value.filter((id) => alive.has(id));
  if (menuId.value && !alive.has(menuId.value)) menuId.value = null;
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

async function submit(): Promise<void> {
  if (creating.value || listLoading.value) return;
  creating.value = true;
  try {
    await enqueue(async () => {
      const created = await generatePersona({
        line: form.value.line,
        country: form.value.country,
        region: form.value.region ? form.value.region : null,
        count: Number(form.value.count),
        start_url: form.value.startUrl,
        ipCheck: { enabled: form.value.ipEnabled, mode: form.value.ipMode },
        ipipCheck: form.value.ipip,
      });
      await reloadNow(created.map((item) => item.id));
      for (const item of created) {
        if (item.status !== 'running') continue;
        await safeLaunch(item.slot);
      }
    });
  } catch (error) {
    showToast(messageOf(error));
  } finally {
    creating.value = false;
  }
}

async function startEnv(persona: Persona): Promise<void> {
  if (isRowLocked(persona.id)) return;
  markBusy(persona.id, true);
  try {
    await enqueue(async () => {
      await startByPersona(persona.id);
      await reloadNow();
      await safeLaunch(persona.slot);
    });
  } catch (error) {
    showToast(messageOf(error));
  } finally {
    markBusy(persona.id, false);
  }
}

async function stopEnv(persona: Persona): Promise<void> {
  if (isRowLocked(persona.id)) return;
  markBusy(persona.id, true);
  try {
    await enqueue(async () => {
      await stopByPersona(persona.id);
      await reloadNow();
      await safeStop(persona.slot);
    });
  } catch (error) {
    showToast(messageOf(error));
  } finally {
    markBusy(persona.id, false);
  }
}

async function retryEnv(persona: Persona): Promise<void> {
  if (isRowLocked(persona.id)) return;
  markBusy(persona.id, true);
  try {
    await enqueue(async () => {
      const result = await retryStart(persona.id);
      await reloadNow();
      if (result.status === 'running') await safeLaunch(persona.slot);
      else if (result.message) showToast(result.message);
    });
  } catch (error) {
    showToast(messageOf(error));
  } finally {
    markBusy(persona.id, false);
  }
}

async function focusEnv(persona: Persona): Promise<void> {
  if (persona.status !== 'running') return;
  const fp = readFp();
  if (!fp) return;
  try {
    await fp.focusBrowser(persona.slot);
  } catch (error) {
    showToast(messageOf(error));
  }
}

function toggleMenu(id: string): void {
  menuId.value = menuId.value === id ? null : id;
}

async function writeClipboard(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // 非安全上下文或权限被拒时走下面的选区复制。
    }
  }
  const area = document.createElement('textarea');
  area.value = text;
  area.setAttribute('readonly', '');
  area.style.position = 'fixed';
  area.style.left = '-9999px';
  document.body.appendChild(area);
  area.select();
  const ok = document.execCommand('copy');
  area.remove();
  if (!ok) throw new Error('复制失败');
}

async function copyEnvName(persona: Persona): Promise<void> {
  menuId.value = null;
  try {
    await writeClipboard(persona.slot);
    showToast(`已复制环境名「${persona.slot}」`, 'ok');
  } catch {
    showToast('复制失败');
  }
}

function askConfirm(title: string, message: string, run: () => Promise<void>): void {
  confirmState.value = { title, message, busy: false, run };
}

function cancelConfirm(): void {
  if (confirmState.value?.busy) return;
  confirmState.value = null;
}

async function runConfirm(): Promise<void> {
  const current = confirmState.value;
  if (!current || current.busy) return;
  current.busy = true;
  try {
    await current.run();
    confirmState.value = null;
  } catch (error) {
    current.busy = false;
    showToast(messageOf(error));
  }
}

async function deleteIds(ids: string[]): Promise<void> {
  const failed: string[] = [];
  let removed = 0;
  await enqueue(async () => {
    for (const id of ids) {
      const persona = personas.value.find((item) => item.id === id);
      try {
        await deletePersona(id);
        removed += 1;
      } catch (error) {
        failed.push(`${persona?.slot ?? id}：${messageOf(error)}`);
      }
    }
    await reloadNow();
  });
  if (failed.length > 0 && removed > 0) showToast(`已删除 ${removed} 个。${failed.join('；')}`);
  else if (failed.length > 0) showToast(failed.join('；'));
  else if (removed > 1) showToast(`已删除 ${removed} 个环境`, 'ok');
}

function askDeleteOne(persona: Persona): void {
  menuId.value = null;
  askConfirm('删除环境', `确定删除「${persona.slot}」？删除后不可恢复。`, () =>
    deleteIds([persona.id]),
  );
}

function askDeleteSelected(): void {
  const ids = [...selectedIds.value];
  if (ids.length === 0 || batchBusy.value) return;
  askConfirm('删除环境', `确定删除已选的 ${ids.length} 个环境？删除后不可恢复。`, async () => {
    batchBusy.value = 'delete';
    for (const id of ids) markBusy(id, true);
    try {
      await deleteIds(ids);
    } finally {
      for (const id of ids) markBusy(id, false);
      batchBusy.value = null;
    }
  });
}

function toggleOne(id: string, checked: boolean): void {
  if (checked) {
    if (!selectedIds.value.includes(id)) selectedIds.value = [...selectedIds.value, id];
    return;
  }
  selectedIds.value = selectedIds.value.filter((item) => item !== id);
}

function toggleAll(checked: boolean): void {
  if (checked) {
    selectedIds.value = [...new Set([...selectedIds.value, ...visibleIds.value])];
    return;
  }
  const hide = new Set(visibleIds.value);
  selectedIds.value = selectedIds.value.filter((id) => !hide.has(id));
}

function onToggleAll(event: Event): void {
  const target = event.target;
  if (!(target instanceof HTMLInputElement)) return;
  toggleAll(target.checked);
}

function onToggleOne(id: string, event: Event): void {
  const target = event.target;
  if (!(target instanceof HTMLInputElement)) return;
  toggleOne(id, target.checked);
}

async function runBatchStart(): Promise<void> {
  if (batchBusy.value || selectedIds.value.length === 0) return;
  const ids = [...selectedIds.value];
  batchBusy.value = 'start';
  for (const id of ids) markBusy(id, true);
  try {
    await enqueue(async () => {
      const before = new Set(
        personas.value.filter((item) => item.status === 'running').map((item) => item.id),
      );
      try {
        await bulkStart(ids);
      } catch (error) {
        showToast(messageOf(error));
      }
      await reloadNow();
      for (const id of ids) {
        const persona = personas.value.find((item) => item.id === id);
        if (!persona || before.has(id) || persona.status !== 'running') continue;
        await safeLaunch(persona.slot);
      }
    });
  } finally {
    for (const id of ids) markBusy(id, false);
    batchBusy.value = null;
  }
}

async function runBatchStop(): Promise<void> {
  if (batchBusy.value || selectedIds.value.length === 0) return;
  const ids = [...selectedIds.value];
  batchBusy.value = 'stop';
  for (const id of ids) markBusy(id, true);
  try {
    await enqueue(async () => {
      const running = new Set(
        personas.value
          .filter((item) => item.status === 'running' && ids.includes(item.id))
          .map((item) => item.id),
      );
      try {
        await bulkStop(ids);
      } catch (error) {
        showToast(messageOf(error));
      }
      await reloadNow();
      for (const id of ids) {
        if (!running.has(id)) continue;
        const persona = personas.value.find((item) => item.id === id);
        if (!persona) continue;
        await safeStop(persona.slot);
      }
    });
  } finally {
    for (const id of ids) markBusy(id, false);
    batchBusy.value = null;
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

function onWindowClick(): void {
  menuId.value = null;
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key !== 'Escape') return;
  if (confirmState.value?.busy) return;
  if (confirmState.value) {
    confirmState.value = null;
    return;
  }
  menuId.value = null;
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

watchEffect(() => {
  const el = selectAllRef.value;
  if (!el) return;
  el.indeterminate = someVisibleSelected.value && !allVisibleSelected.value;
});

onMounted(() => {
  window.addEventListener('click', onWindowClick);
  window.addEventListener('keydown', onKeydown);
  void enqueue(async () => {
    try {
      lines.value = await getLines();
      await loadCountries(form.value.line);
      await reloadNow();
    } catch (error) {
      showToast(messageOf(error));
    } finally {
      listLoading.value = false;
    }
  });
});

onUnmounted(() => {
  window.removeEventListener('click', onWindowClick);
  window.removeEventListener('keydown', onKeydown);
  for (const timer of toastTimers) window.clearTimeout(timer);
});
</script>

<template>
  <div class="env" :aria-busy="listLoading">
    <section v-if="listLoading" class="card sk-card" data-testid="env-skeleton">
      <i class="sk sk-title"></i>
      <div class="sk-fields">
        <i v-for="n in 6" :key="n" class="sk sk-field"></i>
      </div>
      <div class="sk-checks">
        <i class="sk sk-checkline"></i>
        <i class="sk sk-checkline short"></i>
      </div>
    </section>
    <section v-else class="card">
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
            <template v-else>
              <option value="">请选择</option>
              <option v-for="region in regions" :key="region.code" :value="region.code">
                {{ region.name }}
              </option>
            </template>
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
        <button
          class="go"
          type="submit"
          :disabled="creating"
          :aria-busy="creating"
          data-testid="env-create"
        >
          <span v-if="creating" class="spin"></span>
          {{ creating ? '创建中…' : '创建并启动' }}
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
    </section>

    <section v-if="listLoading" class="card list" aria-hidden="true">
      <div class="tabs">
        <i v-for="n in 4" :key="n" class="sk sk-pill"></i>
        <i class="sk sk-search"></i>
      </div>
      <div class="table">
        <div class="head">
          <span class="title-col"><i class="sk sk-h"></i></span>
          <span class="sys-col"><i class="sk sk-h"></i></span>
          <span class="proxy-col"><i class="sk sk-h"></i></span>
        </div>
        <div v-for="n in 6" :key="n" class="env-row">
          <div class="title-col">
            <i class="sk sk-box"></i>
            <i class="sk sk-panda"></i>
            <span class="sk-stack">
              <i class="sk sk-line"></i>
              <i class="sk sk-line short"></i>
            </span>
          </div>
          <div class="sys-col">
            <i class="sk sk-line"></i>
            <i class="sk sk-line short"></i>
          </div>
          <div class="proxy-col">
            <i class="sk sk-line"></i>
            <i class="sk sk-line short"></i>
          </div>
        </div>
      </div>
    </section>
    <section v-else class="card list">
      <div class="tabs" role="tablist">
        <button
          v-for="item in tabs"
          :key="item.key"
          type="button"
          role="tab"
          :aria-selected="tab === item.key"
          :class="{ on: tab === item.key }"
          :data-testid="`env-tab-${item.key}`"
          @click="tab = item.key"
        >
          {{ item.label }} {{ countOf(item.key) }}
        </button>
        <input
          v-model="keyword"
          class="search"
          placeholder="请输入关键词"
          autocomplete="off"
          data-testid="env-search"
        />
      </div>
      <div v-if="selectedIds.length > 0" class="batch" data-testid="env-batch">
        <span class="batch-count">已选 {{ selectedIds.length }} 个</span>
        <button
          type="button"
          class="batch-go"
          :disabled="batchBusy !== null"
          :aria-busy="batchBusy === 'start'"
          @click="runBatchStart"
        >
          <span v-if="batchBusy === 'start'" class="spin"></span>
          批量启动
        </button>
        <button
          type="button"
          class="batch-stop"
          :disabled="batchBusy !== null"
          :aria-busy="batchBusy === 'stop'"
          @click="runBatchStop"
        >
          <span v-if="batchBusy === 'stop'" class="spin"></span>
          批量停止
        </button>
        <button
          type="button"
          class="batch-delete"
          :disabled="batchBusy !== null"
          :aria-busy="batchBusy === 'delete'"
          @click="askDeleteSelected"
        >
          <span v-if="batchBusy === 'delete'" class="spin"></span>
          批量删除
        </button>
      </div>
      <div v-if="visible.length === 0" class="empty" data-testid="env-empty">
        <span class="empty-mark" aria-hidden="true"></span>
        <strong>{{ emptyTitle }}</strong>
        <p>{{ emptyHint }}</p>
      </div>
      <div v-else class="table">
        <div class="head">
          <span class="title-col">
            <input
              ref="selectAllRef"
              type="checkbox"
              :checked="allVisibleSelected"
              aria-label="全选当前筛选结果"
              @change="onToggleAll"
            />
            标题
          </span>
          <span class="sys-col">系统 / 内核</span>
          <span class="proxy-col">代理</span>
        </div>
        <article
          v-for="persona in visible"
          :key="persona.id"
          class="env-row"
          data-testid="env-row"
          :data-slot="persona.slot"
          :data-status="persona.status"
        >
          <div class="title-col">
            <input
              type="checkbox"
              :checked="selectedIds.includes(persona.id)"
              :aria-label="`选择 ${persona.slot}`"
              @change="onToggleOne(persona.id, $event)"
            />
            <PandaMark :size="28" />
            <div class="name">
              <button
                v-if="persona.status === 'running'"
                type="button"
                class="name-btn"
                :title="persona.slot"
                @click="focusEnv(persona)"
              >
                {{ persona.slot }}
              </button>
              <strong v-else :title="persona.slot">{{ persona.slot }}</strong>
              <span :title="fmtTime(persona.created_at)">{{ fmtTime(persona.created_at) }}</span>
            </div>
            <div class="ops" @click.stop>
              <button
                v-if="persona.status === 'running'"
                class="stop"
                type="button"
                aria-label="停止"
                :disabled="isRowLocked(persona.id)"
                :aria-busy="isRowLocked(persona.id)"
                @click="stopEnv(persona)"
              >
                <span v-if="isRowLocked(persona.id)" class="spin"></span>
                <i v-else></i>
              </button>
              <button
                v-else
                class="play"
                type="button"
                :aria-label="persona.status === 'ip_fail' ? '重试' : '启动'"
                :disabled="isRowLocked(persona.id)"
                :aria-busy="isRowLocked(persona.id)"
                @click="persona.status === 'ip_fail' ? retryEnv(persona) : startEnv(persona)"
              >
                <span v-if="isRowLocked(persona.id)" class="spin"></span>
                <svg v-else viewBox="0 0 12 12" aria-hidden="true">
                  <path d="M3 1.5v9l8-4.5z" />
                </svg>
              </button>
              <button
                class="more"
                type="button"
                aria-label="更多"
                :aria-expanded="menuId === persona.id"
                @click="toggleMenu(persona.id)"
              >
                ⋮
              </button>
              <div v-if="menuId === persona.id" class="menu" role="menu">
                <button type="button" role="menuitem" @click="copyEnvName(persona)">
                  复制环境名
                </button>
                <button type="button" class="danger" role="menuitem" @click="askDeleteOne(persona)">
                  删除
                </button>
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
            <span class="host" :title="hostOf(persona.proxy.uri)">{{
              hostOf(persona.proxy.uri)
            }}</span>
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

    <div class="toasts" aria-live="polite">
      <p v-for="item in toasts" :key="item.id" class="toast" :class="item.tone" role="alert">
        {{ item.message }}
      </p>
    </div>

    <div v-if="confirmState" class="mask" @click.self="cancelConfirm" @keydown.esc="cancelConfirm">
      <div
        class="dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="env-confirm-title"
        data-testid="env-confirm"
      >
        <h2 id="env-confirm-title">{{ confirmState.title }}</h2>
        <p>{{ confirmState.message }}</p>
        <div class="dialog-actions">
          <button type="button" class="ghost" :disabled="confirmState.busy" @click="cancelConfirm">
            取消
          </button>
          <button
            type="button"
            class="danger-btn"
            :disabled="confirmState.busy"
            :aria-busy="confirmState.busy"
            @click="runConfirm"
          >
            <span v-if="confirmState.busy" class="spin"></span>
            删除
          </button>
        </div>
      </div>
    </div>
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
  box-sizing: border-box;
  width: 100%;
  max-width: 100%;
  min-width: 0;
}
input[type='checkbox'] {
  width: 16px;
  height: 16px;
  padding: 0;
  accent-color: var(--primary);
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
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-sm);
}
.go:disabled {
  color: var(--text-disabled);
  background: var(--surface-muted);
}
.go:disabled[aria-busy='true'] {
  color: var(--on-primary);
  background: var(--primary-pressed);
  cursor: progress;
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
.batch {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  min-height: 40px;
  margin-bottom: var(--space-md);
  padding: 0 var(--space-md);
  background: var(--primary-soft);
  border-radius: var(--radius-md);
}
.batch-count {
  margin-right: auto;
  color: var(--accent);
  font-weight: 600;
}
.batch button {
  height: 28px;
  padding: 0 var(--space-md);
  border: 0;
  border-radius: var(--radius-md);
  background: var(--surface);
  color: var(--text);
  display: inline-flex;
  align-items: center;
  gap: var(--space-sm);
}
.batch button:disabled {
  color: var(--text-disabled);
  background: var(--surface-muted);
}
.batch .batch-go {
  background: var(--primary);
  color: var(--on-primary);
  font-weight: 600;
}
.batch .batch-stop,
.batch .batch-delete {
  background: var(--danger-soft);
  color: var(--danger-text);
}
.batch .batch-go[aria-busy='true'] {
  color: var(--on-primary);
  background: var(--primary-pressed);
}
.batch .batch-stop[aria-busy='true'],
.batch .batch-delete[aria-busy='true'] {
  color: var(--danger-text);
  background: var(--danger-soft);
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
.name strong,
.name-btn {
  font-size: var(--fs-body);
  font-weight: 600;
  color: var(--text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.name-btn {
  display: block;
  width: 100%;
  max-width: 100%;
  border: 0;
  background: transparent;
  padding: 0;
  text-align: left;
}
.name-btn:hover {
  color: var(--accent);
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
.play:disabled,
.stop:disabled {
  cursor: progress;
}
.stop {
  background: var(--danger-soft);
  color: var(--danger);
}
.stop i {
  width: 8px;
  height: 8px;
  background: currentColor;
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
  padding: var(--space-xs) 0;
}
.menu button {
  height: 32px;
  border: 0;
  background: transparent;
  text-align: left;
  padding: 0 var(--space-md);
  color: var(--text);
}
.menu button:hover {
  background: var(--surface-muted);
}
.menu button.danger {
  color: var(--danger-text);
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
.ip {
  display: flex;
  align-items: center;
  gap: 6px;
}
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-sm);
  min-height: 220px;
  color: var(--text-3);
  text-align: center;
}
.empty-mark {
  width: 40px;
  height: 40px;
  margin-bottom: var(--space-sm);
  border: 1.5px dashed var(--border);
  border-radius: var(--radius-lg);
}
.empty strong {
  color: var(--text-2);
  font-size: var(--fs-body-lg);
  font-weight: 600;
}
.empty p {
  margin: 0;
  font-size: var(--fs-caption);
}
.sk {
  display: block;
  flex: 0 0 auto;
  background: var(--surface-muted);
  border-radius: var(--radius-sm);
  animation: env-pulse 1.2s ease-in-out infinite;
}
.sk-title {
  width: 128px;
  height: 16px;
  margin-bottom: var(--space-lg);
}
.sk-fields {
  display: grid;
  grid-template-columns:
    minmax(0, 1.1fr) minmax(0, 1.1fr) minmax(0, 1.2fr) minmax(0, 0.8fr) minmax(0, 1.6fr)
    auto;
  gap: var(--space-md);
  align-items: end;
}
.sk-field {
  height: var(--ctrl);
}
.sk-fields .sk-field:last-child {
  width: 96px;
  justify-self: start;
}
.sk-checks {
  display: flex;
  gap: var(--space-lg);
  margin-top: var(--space-lg);
}
.sk-checkline {
  width: 88px;
  height: 16px;
}
.sk-checkline.short {
  width: 72px;
}
.sk-pill {
  width: 72px;
  height: 28px;
  border-radius: var(--radius-pill);
}
.sk-search {
  width: 220px;
  height: var(--ctrl);
  margin-left: auto;
  border-radius: var(--radius-md);
}
.sk-h {
  width: 64px;
  height: 12px;
}
.sk-box {
  width: 16px;
  height: 16px;
}
.sk-panda {
  width: 28px;
  height: 18px;
  border-radius: var(--radius-md);
}
.sk-line {
  width: 120px;
  height: 12px;
}
.sk-line.short {
  width: 72px;
}
.sk-stack {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
  min-width: 0;
}
.spin {
  box-sizing: border-box;
  width: 12px;
  height: 12px;
  border: 2px solid color-mix(in srgb, currentColor 35%, transparent);
  border-top-color: currentColor;
  border-radius: 50%;
  display: block;
  animation: env-spin 0.7s linear infinite;
}
.toasts {
  position: fixed;
  top: var(--space-xl);
  left: 50%;
  z-index: 40;
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  transform: translateX(-50%);
  pointer-events: none;
}
.toast {
  margin: 0;
  max-width: min(92vw, 480px);
  padding: var(--space-md) var(--space-lg);
  background: var(--surface-raised);
  color: var(--text);
  border: 1px solid var(--border-subtle);
  border-left: 3px solid var(--danger);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-md);
  font-size: var(--fs-body);
  line-height: var(--lh);
}
.toast.ok {
  border-left-color: var(--accent);
}
.mask {
  position: fixed;
  inset: 0;
  z-index: 30;
  display: grid;
  place-items: center;
}
.mask::before {
  content: '';
  position: absolute;
  inset: 0;
  background: var(--bg-sunken);
  opacity: 0.78;
}
.dialog {
  position: relative;
  width: min(420px, calc(100% - 32px));
  padding: var(--space-2xl);
  background: var(--surface-raised);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-lg);
}
.dialog h2 {
  margin: 0 0 var(--space-md);
  font-size: var(--fs-title);
  font-weight: 600;
  color: var(--text);
}
.dialog p {
  margin: 0;
  color: var(--text-2);
  font-size: var(--fs-body);
}
.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-md);
  margin-top: var(--space-xl);
}
.dialog-actions button {
  height: var(--ctrl);
  padding: 0 var(--space-lg);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  background: var(--surface);
  color: var(--text);
  display: inline-flex;
  align-items: center;
  gap: var(--space-sm);
}
.dialog-actions .danger-btn {
  border: 0;
  background: var(--danger-soft);
  color: var(--danger-text);
  font-weight: 600;
}
.dialog-actions .danger-btn[aria-busy='true'] {
  cursor: progress;
}
@keyframes env-spin {
  to {
    transform: rotate(360deg);
  }
}
@keyframes env-pulse {
  50% {
    opacity: 0.45;
  }
}
</style>
