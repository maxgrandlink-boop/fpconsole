import { ApiError } from './error';
import { delay } from './delay';
import { assignProxyNow } from './proxy';
import { resolveCountry, slotPrefix } from './places';
import type { LineId } from './places';
import { readSettings, type Settings } from './settings';
import { clone, maskHost, nowIso, state } from './state';

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
  asn: string | null;
  isp: string | null;
}

/** 列表状态。异常不进运行中/已关闭/已过期计数，但仍算在全部里。 */
export type EnvStatus = 'running' | 'closed' | 'expired' | 'starting' | 'error';

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
  /** 国家 code，对应 Country.code。 */
  country: string;
  /** 州/省 code。没有州的国家为 null。 */
  region: string | null;
  start_url: string | null;
  os_browser: string;
  status: EnvStatus;
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

export interface IpCheckInput {
  enabled: boolean;
  mode: 'strict' | 'loose';
}

export interface GeneratePersonaInput {
  line: LineId;
  country: string;
  region: string | null;
  count: number;
  start_url?: string;
  ipCheck: IpCheckInput;
  ipipCheck: boolean;
}

export interface CreateEnvResult {
  id: string;
  slot: string;
  status: EnvStatus;
  message?: string;
  warning?: string;
}

export interface EnvStatusCounts {
  all: number;
  running: number;
  closed: number;
  expired: number;
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

function nextSlots(prefix: string, count: number): string[] {
  const pattern = new RegExp(`^${prefix}(\\d+)$`, 'i');
  let max = 0;
  for (const persona of state.personas) {
    const matched = persona.slot.match(pattern);
    if (matched?.[1]) max = Math.max(max, Number(matched[1]));
  }
  const slots = Array.from({ length: count }, (_, index) => `${prefix}${max + index + 1}`);
  const taken = slots.some((slot) =>
    state.personas.some((persona) => persona.slot.toLowerCase() === slot.toLowerCase()),
  );
  if (taken) throw new ApiError(409, '该 slot 已存在，请换一个名字');
  return slots;
}

function personaFromSlot(
  slot: string,
  countryCode: string,
  regionCode: string | null,
  line: ReturnType<typeof assignProxyNow>,
  startUrl: string | null,
): Persona {
  const fp = generateFingerprint();
  const tz = fp.tz.mode === 'custom' ? fp.tz.value || 'America/Los_Angeles' : 'America/Los_Angeles';
  const lang = fp.lang.mode === 'custom' ? fp.lang.value || 'en-US' : 'en-US';
  const screen = fp.screen.value || '1920×1080';
  const major = 150 + Math.floor(Math.random() * 7);
  const seq = state.personas.reduce((max, persona) => Math.max(max, persona.seq || 0), 0) + 1;
  return {
    id: 'p-' + Date.now().toString(36) + seq.toString(36),
    seq,
    slot,
    name: slot,
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
    country: countryCode,
    region: regionCode,
    start_url: startUrl,
    os_browser: `Win10 · ${major}`,
    status: 'closed',
    proxy: {
      uri: line.uri,
      ip: line.ip,
      type: line.type,
      region: line.region,
      qualified: null,
      last_check: null,
      asn: line.asn,
      isp: line.isp,
    },
  };
}

export async function generatePersona(input: GeneratePersonaInput): Promise<CreateEnvResult[]> {
  await delay();
  if (!Number.isInteger(input.count) || input.count < 1 || input.count > 10) {
    throw new ApiError(400, '多开数量须为 1 到 10 的整数');
  }
  const startUrl = (input.start_url ?? '').trim();
  if (startUrl && !/^https?:\/\//.test(startUrl)) {
    throw new ApiError(400, '请输入以 http:// 或 https:// 开头的网址');
  }
  const { country, region } = resolveCountry(input.line, input.country, input.region);
  const slots = nextSlots(slotPrefix(country, region), input.count);
  const line = assignProxyNow(country, region);
  const created = slots.map((slot) =>
    personaFromSlot(slot, country.code, region?.code ?? null, line, startUrl || null),
  );
  state.personas.push(...created);

  const results: CreateEnvResult[] = [];
  for (const persona of created) {
    const check = mockQuality(input);
    if (check.blocked) {
      persona.status = 'error';
      results.push({
        id: persona.id,
        slot: persona.slot,
        status: 'error',
        message: check.blocked,
        ...(check.warning ? { warning: check.warning } : {}),
      });
      continue;
    }
    try {
      await startByPersona(persona.id);
      results.push({
        id: persona.id,
        slot: persona.slot,
        status: 'running',
        ...(check.warning ? { warning: check.warning } : {}),
      });
    } catch (error) {
      if (!(error instanceof ApiError && error.status === 409)) {
        persona.status = 'error';
      }
      results.push({
        id: persona.id,
        slot: persona.slot,
        status: persona.status,
        message: error instanceof Error ? error.message : String(error),
        ...(check.warning ? { warning: check.warning } : {}),
      });
    }
  }
  return results;
}

// TODO: 严格/宽松的真实判定规则未定。这里只按固定概率做假检测。
const CHECK_FAIL_RATE = 0.3;
const CHECK_FAIL_REASONS = [
  '机房/Hosting 出口，且非美国（新加坡）',
  'AT&T Enterprises 商务线，非消费宽带',
] as const;

function mockFailReason(): string | null {
  if (Math.random() >= CHECK_FAIL_RATE) return null;
  return CHECK_FAIL_REASONS[Math.floor(Math.random() * CHECK_FAIL_REASONS.length)] ?? null;
}

function mockQuality(input: GeneratePersonaInput): { blocked?: string; warning?: string } {
  let blocked: string | undefined;
  let warning: string | undefined;
  if (input.ipCheck.enabled) {
    const reason = mockFailReason();
    if (reason) {
      if (input.ipCheck.mode === 'strict') blocked = reason;
      else warning = reason;
    }
  }
  if (input.ipipCheck) {
    const reason = mockFailReason();
    if (reason) warning = warning ? `${warning}；${reason}` : reason;
  }
  return { blocked, warning };
}

export async function retryStart(id: string): Promise<CreateEnvResult> {
  const persona = findPersona(id);
  if (!persona) throw new ApiError(404, '环境不存在');
  try {
    await startByPersona(persona.id);
    return { id: persona.id, slot: persona.slot, status: 'running' };
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 409)) throw error;
    persona.status = 'error';
    return {
      id: persona.id,
      slot: persona.slot,
      status: 'error',
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function getEnvStatusCounts(): Promise<EnvStatusCounts> {
  await delay();
  return {
    all: state.personas.length,
    running: state.personas.filter((persona) => persona.status === 'running').length,
    closed: state.personas.filter((persona) => persona.status === 'closed').length,
    expired: state.personas.filter((persona) => persona.status === 'expired').length,
  };
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
  const persona = findPersona(personaId);
  if (!persona) throw new ApiError(404, '环境不存在');
  if (runningInstancesOf(persona.id).length) throw new ApiError(409, '该环境已在运行');
  persona.status = 'starting';
  await delay();
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
  persona.status = 'running';
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
  if (stopped > 0 && persona.status !== 'expired') persona.status = 'closed';
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
