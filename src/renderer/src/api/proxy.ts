import type { PersonaProxy } from './env';
import { ApiError } from './error';
import { delay } from './delay';
import type { Country, Region } from './places';
import {
  clone,
  exampleUri,
  maskHost,
  nextCheckResult,
  nowIso,
  pickCity,
  regionForIsp,
  smartproxyUri,
  state,
} from './state';

export interface ProxyHistoryItem {
  proxy_uri: string;
  ip: string;
  country: string;
  isp: string;
  qualified: boolean;
  reason: string;
  checked_at: string;
  org?: string;
}

export interface ProxyCheckResult {
  ok: true;
  ip: string;
  hostname: string;
  city: string;
  region: string;
  country: string;
  org: string;
  timezone: string;
  latency_ms: number;
  isp: string;
  qualified: boolean;
  reason: string;
}

export interface CheckProxyInput {
  proxy_uri: string;
}

export function exampleProxyUri(): string {
  return smartproxyUri(pickCity());
}

export interface AssignedProxy {
  uri: string;
  type: '静态';
  region: string;
  ip: string | null;
  asn: string | null;
  isp: string | null;
}

interface KnownLine {
  city?: string;
  regionLabel: string;
  ip: string | null;
  asn: string | null;
  isp: string | null;
}

/** 只收录旧 mock 里出现过的出口。新国家没有城市 token，也不编 IP。 */
const KNOWN_LINES: Record<string, KnownLine> = {
  'us:la': {
    city: 'losangeles',
    regionLabel: '美国-洛杉矶',
    ip: '76.89.201.14',
    asn: 'AS20115',
    isp: 'Charter Communications',
  },
  'us:ny': {
    city: 'newyork',
    regionLabel: '美国-纽约',
    ip: null,
    asn: null,
    isp: null,
  },
  'us:il': {
    city: 'chicago',
    regionLabel: '美国-芝加哥',
    ip: null,
    asn: null,
    isp: null,
  },
  'us:tx': {
    regionLabel: '美国-达拉斯',
    ip: '12.119.84.203',
    asn: 'AS7018',
    isp: 'AT&T Enterprises',
  },
  sg: {
    regionLabel: '新加坡',
    ip: '128.199.85.7',
    asn: 'AS16276',
    isp: 'Datacamp Limited',
  },
};

/** 按国家 + 州省分配一条线路。美国必须带 Region。 */
export async function assignProxy(country: Country, region: Region | null): Promise<AssignedProxy> {
  await delay();
  return assignProxyNow(country, region);
}

export function assignProxyNow(country: Country, region: Region | null): AssignedProxy {
  if (country.regions && country.regions.length > 0) {
    if (!region || !country.regions.some((item) => item.code === region.code)) {
      throw new ApiError(400, '请选择州/省');
    }
  } else if (region) {
    throw new ApiError(400, '该国家无州/省');
  }
  const key = region ? `${country.code}:${region.code}` : country.code;
  const known = KNOWN_LINES[key];
  return {
    uri: exampleUri(country.code, known?.city),
    type: '静态',
    region: known?.regionLabel ?? country.name,
    ip: known?.ip ?? null,
    asn: known?.asn ?? null,
    isp: known?.isp ?? null,
  };
}

export async function checkProxy(input: CheckProxyInput): Promise<ProxyCheckResult> {
  await delay(2400 + Math.random() * 1100);
  const sample = nextCheckResult();
  state.history.unshift({
    proxy_uri: maskHost(input.proxy_uri),
    ip: sample.ip,
    country: sample.country,
    isp: sample.isp,
    org: sample.org,
    qualified: sample.qualified,
    reason: sample.reason,
    checked_at: nowIso(),
  });
  if (state.history.length > 20) state.history.length = 20;
  return { ok: true, ...sample };
}

export async function getProxyHistory(): Promise<ProxyHistoryItem[]> {
  await delay();
  return clone(state.history);
}

export async function recheckProxy(id: string): Promise<PersonaProxy> {
  await delay(1800 + Math.random() * 900);
  const persona = state.personas.find((item) => String(item.id) === String(id));
  if (!persona) throw new ApiError(404, '环境不存在');
  const sample = nextCheckResult();
  persona.proxy = {
    ...persona.proxy,
    ip: sample.ip,
    region: regionForIsp(sample.isp) || persona.proxy.region,
    qualified: sample.qualified,
    last_check: nowIso(),
  };
  return clone(persona.proxy);
}
