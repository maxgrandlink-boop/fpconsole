import type { PersonaProxy } from './env';
import { ApiError } from './error';
import { delay } from './delay';
import type { CountryName, RegionName } from './places';
import { resolvePlace } from './places';
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

/** 按国家 + 州省分配一条线路。新加坡不使用州省。 */
export async function assignProxy(
  country: CountryName,
  region: RegionName | null,
): Promise<AssignedProxy> {
  await delay();
  return assignProxyNow(country, region);
}

export function assignProxyNow(country: CountryName, region: RegionName | null): AssignedProxy {
  const place = resolvePlace(country, region);
  return {
    uri: exampleUri(place.area, place.city ?? undefined),
    type: '静态',
    region: place.regionLabel,
    ip: place.ip,
    asn: place.asn,
    isp: place.isp,
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
