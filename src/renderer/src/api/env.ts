import { ApiError } from './error';
import { delay } from './delay';
import { readSettings, type Settings } from './settings';
import { cityRegion, clone, maskHost, nowIso, pickCity, smartproxyUri, state } from './state';

export interface ModeValue {
  mode: string;
  value: string;
}

export interface GeoSetting {
  mode: string;
  sub: string;
}

export interface Fingerprint {
  lang: ModeValue;
  tz: ModeValue;
  geo: GeoSetting;
  screen: ModeValue;
  fonts: string;
  clientrects: string;
  webrtc: string;
  canvas: string;
  webgl: string;
  webglinfo: string;
  webglvendor: string;
}

export interface PersonaProxy {
  uri: string;
  ip: string | null;
  type: string;
  region: string;
  qualified: boolean | null;
  last_check: string | null;
}

export interface Persona {
  id: string;
  seq: number;
  slot: string;
  name: string;
  tz: string;
  ua_short: string;
  screen: string;
  locked: boolean;
  used_count: number;
  created_at: string;
  group: string;
  pinned: boolean;
  starred: boolean;
  lang: string;
  fp: Fingerprint;
  proxy: PersonaProxy;
}

export interface Instance {
  id: string;
  persona_id: string;
  persona: string;
  status: 'running' | 'stopped';
  pid: number;
  command: string;
  started_at: string;
  stopped_at: string | null;
}

export interface EnvStats {
  personas: number;
  locked: number;
  running: number;
  launches_total: number;
  proxy_qualified: number;
  proxy_total: number;
}

export interface GeneratePersonaInput {
  slot: string;
}

export interface AssembleVars {
  proxy_uri?: string;
}

export interface PersonaConfigDocument {
  _format: string;
  slot: string;
  name: string;
  tz: string;
  lang: string;
  user_agent: string;
  screen: string;
  fingerprint: Fingerprint;
  proxy: string;
  locked: boolean;
  used_count: number;
  created_at: string;
  note: string;
}

export interface PersonaConfigFile {
  filename: string;
  content: string;
}

export interface BulkStartResult {
  started: number;
  skipped: number;
}

export interface StopResult {
  stopped: number;
}

function findPersona(id: string): Persona | undefined {
  return state.personas.find((persona) => String(persona.id) === String(id));
}

function runningInstancesOf(personaId: string): Instance[] {
  return state.instances.filter(
    (instance) =>
      String(instance.persona_id) === String(personaId) && instance.status === 'running',
  );
}

function quoteIfSpaced(value: string): string {
  return /\s/.test(String(value)) ? `"${value}"` : String(value);
}

function toSocks5(uri: string): string {
  return 'socks5://' + String(uri || '').replace(/^[a-z0-9]+:\/\//i, '');
}

function exeDir(path: string): string {
  const text = String(path || '');
  const index = text.lastIndexOf('\\');
  return index > 0 ? text.slice(0, index) : text;
}

const LANG_MODES = ['auto', 'custom'] as const;
const TZ_MODES = ['auto', 'custom'] as const;
const TZ_VALUES = [
  'America/Los_Angeles',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Phoenix',
] as const;
const GEO_MODES = ['ask', 'allow', 'block'] as const;
const GEO_SUBS = ['ip', 'custom'] as const;
const SCREEN_MODES = ['random', 'quick', 'custom'] as const;
const SCREEN_QUICK = ['1920×1080', '2560×1440', '1680×1050', '1366×768', '3840×2160'] as const;
const SCREEN_RANDOM = ['1366×768', '1440×900', '1536×864', '1600×900', '1920×1080'] as const;
const FONTS = ['default', 'custom'] as const;
const CLIENT_RECTS = ['on', 'off'] as const;
const WEBRTC = ['replace', 'real', 'disable'] as const;
const NOISE_OR_REAL = ['noise', 'real'] as const;
const WEBGL_INFO = ['custom', 'real'] as const;
const WEBGL_VENDORS = ['intel', 'amd', 'apple', 'mozilla'] as const;

function pick<T>(items: readonly T[]): T {
  const item = items[Math.floor(Math.random() * items.length)];
  if (item === undefined) throw new Error('empty pick');
  return item;
}

/** 指纹由内部规则生成，调用方不能指定。将来接真实规则时只替换这个函数。 */
export function generateFingerprint(): Fingerprint {
  const langMode = pick(LANG_MODES);
  const tzMode = pick(TZ_MODES);
  const geoMode = pick(GEO_MODES);
  const screenMode = pick(SCREEN_MODES);
  return {
    lang: { mode: langMode, value: 'en-US' },
    tz: {
      mode: tzMode,
      value: tzMode === 'custom' ? pick(TZ_VALUES) : 'America/Los_Angeles',
    },
    geo: { mode: geoMode, sub: geoMode === 'allow' ? pick(GEO_SUBS) : 'ip' },
    screen: {
      mode: screenMode,
      value: screenMode === 'random' ? pick(SCREEN_RANDOM) : pick(SCREEN_QUICK),
    },
    fonts: pick(FONTS),
    clientrects: pick(CLIENT_RECTS),
    webrtc: pick(WEBRTC),
    canvas: pick(NOISE_OR_REAL),
    webgl: pick(NOISE_OR_REAL),
    webglinfo: pick(WEBGL_INFO),
    webglvendor: pick(WEBGL_VENDORS),
  };
}

/** 只拼命令字符串，不启动进程。 */
export function assembleCommand(
  persona: Persona,
  vars?: AssembleVars,
  settings?: Settings,
): string {
  const current = { ...readSettings(), ...(settings ?? {}) };
  const proxyUri = (vars && vars.proxy_uri) || (persona.proxy && persona.proxy.uri) || '';
  const parts = [
    `"${current.browser_exe}"`,
    `--fp-env=${persona.slot}`,
    `--fp-config="${current.kit_dir}\\persona-${persona.slot}.json"`,
    `--user-data-dir="${current.kit_dir}\\profile-${persona.slot}"`,
    '--no-first-run',
    '--no-default-browser-check',
    '--ignore-gpu-blocklist',
    `--fp-canvas-replay-file="${current.kit_dir}\\table-emoji.json"`,
    `--proxy-server=${quoteIfSpaced(proxyUri)}`,
    '--proxy-bypass-list=10.0.0.2',
    `--fp-jump-tcp=${quoteIfSpaced(current.jump_tcp)}`,
    `--fp-jump-token=${quoteIfSpaced(current.jump_token)}`,
    '--fp-jump-decision=Real',
    `--fp-jump-max-attempts=${quoteIfSpaced(current.jump_attempts)}`,
    `--fp-jump-max-wait-ms=${quoteIfSpaced(current.jump_wait_ms)}`,
    `--fp-jump-proxy=${quoteIfSpaced(toSocks5(proxyUri))}`,
    '--flag-switches-begin',
    '--flag-switches-end',
    `--file-url-path-alias="/gen=${exeDir(current.browser_exe)}\\gen"`,
  ];
  return parts.join(' ');
}

export async function getStats(): Promise<EnvStats> {
  await delay();
  return {
    personas: state.personas.length,
    locked: state.personas.filter((persona) => persona.locked).length,
    running: state.instances.filter((instance) => instance.status === 'running').length,
    launches_total: state.launchesTotal,
    proxy_qualified: state.history.filter((item) => item.qualified).length,
    proxy_total: state.history.length,
  };
}

export async function getPersonas(): Promise<Persona[]> {
  await delay();
  return clone(state.personas);
}

export async function getInstances(): Promise<Instance[]> {
  await delay();
  return clone(state.instances);
}

export async function generatePersona(input: GeneratePersonaInput): Promise<Persona> {
  await delay();
  const name = String(input.slot || '').trim();
  if (!name) throw new ApiError(400, 'slot 不能为空');
  if (state.personas.some((persona) => persona.slot.toLowerCase() === name.toLowerCase())) {
    throw new ApiError(409, 'slot 已存在');
  }
  const fp = generateFingerprint();
  const tz = fp.tz.mode === 'custom' ? fp.tz.value || 'America/Los_Angeles' : 'America/Los_Angeles';
  const lang = fp.lang.mode === 'custom' ? fp.lang.value || 'en-US' : 'en-US';
  const screen = fp.screen.value || '1920×1080';
  const major = 150 + Math.floor(Math.random() * 7);
  const seq = state.personas.reduce((max, persona) => Math.max(max, persona.seq || 0), 0) + 1;
  const city = pickCity();
  const persona: Persona = {
    id: 'p-' + Date.now().toString(36),
    seq,
    slot: name,
    name,
    tz,
    lang,
    ua_short:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
      `(KHTML, like Gecko) Chrome/${major}.0.0.0 Safari/537.36`,
    screen,
    locked: true,
    used_count: 0,
    created_at: nowIso(),
    group: '默认分组',
    pinned: false,
    starred: false,
    fp,
    proxy: {
      uri: smartproxyUri(city),
      ip: null,
      type: '静态',
      region: cityRegion(city),
      qualified: null,
      last_check: null,
    },
  };
  state.personas.push(persona);
  return clone(persona);
}

export async function deletePersona(id: string): Promise<null> {
  await delay();
  const index = state.personas.findIndex((persona) => persona.id === id);
  if (index < 0) throw new ApiError(404, '环境不存在');
  const persona = state.personas[index];
  if (!persona) throw new ApiError(404, '环境不存在');
  if (persona.used_count > 0) throw new ApiError(409, '环境已使用，不可删除');
  state.personas.splice(index, 1);
  return null;
}

export async function toggleStar(id: string): Promise<Persona> {
  await delay();
  const persona = findPersona(id);
  if (!persona) throw new ApiError(404, '环境不存在');
  persona.starred = !persona.starred;
  return clone(persona);
}

export async function getPersonaConfig(id: string): Promise<PersonaConfigFile> {
  await delay();
  const persona = findPersona(id);
  if (!persona) throw new ApiError(404, '环境不存在');
  const config: PersonaConfigDocument = {
    _format: 'fpconsole.persona/1',
    slot: persona.slot,
    name: persona.name,
    tz: persona.tz,
    lang: persona.lang,
    user_agent: persona.ua_short,
    screen: persona.screen,
    fingerprint: persona.fp,
    proxy: maskHost(persona.proxy && persona.proxy.uri),
    locked: persona.locked,
    used_count: persona.used_count,
    created_at: persona.created_at,
    note: 'MOCK 原型数据',
  };
  return { filename: `${persona.slot}.fpconsole.json`, content: JSON.stringify(config, null, 2) };
}

export async function startByPersona(personaId: string): Promise<Instance> {
  await delay();
  const persona = findPersona(personaId);
  if (!persona) throw new ApiError(404, '环境不存在');
  if (runningInstancesOf(persona.id).length) throw new ApiError(409, '该环境已在运行');
  const command = assembleCommand(persona, { proxy_uri: persona.proxy.uri });
  const instance: Instance = {
    id: 'i-' + Date.now().toString(36),
    persona_id: persona.id,
    persona: persona.slot,
    status: 'running',
    pid: state.pidSeq,
    command,
    started_at: nowIso(),
    stopped_at: null,
  };
  state.pidSeq += 1;
  state.instances.unshift(instance);
  state.launchesTotal += 1;
  persona.used_count += 1;
  return clone(instance);
}

export async function stopByPersona(personaId: string): Promise<StopResult> {
  await delay();
  const persona = findPersona(personaId);
  if (!persona) throw new ApiError(404, '环境不存在');
  let stopped = 0;
  for (const instance of runningInstancesOf(persona.id)) {
    instance.status = 'stopped';
    instance.stopped_at = nowIso();
    stopped += 1;
  }
  return { stopped };
}

export async function bulkStart(ids: string[]): Promise<BulkStartResult> {
  let started = 0;
  let skipped = 0;
  for (const id of ids) {
    try {
      await startByPersona(id);
      started += 1;
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) skipped += 1;
      else throw error;
    }
  }
  return { started, skipped };
}

export async function bulkStop(ids: string[]): Promise<StopResult> {
  let stopped = 0;
  for (const id of ids) {
    const result = await stopByPersona(id);
    stopped += result.stopped;
  }
  return { stopped };
}
