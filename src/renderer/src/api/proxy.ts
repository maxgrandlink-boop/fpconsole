import type { PersonaProxy } from './env';
import { ApiError } from './error';
import { delay } from './delay';
import {
  clone,
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
