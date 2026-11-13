import type { Fingerprint, Instance, Persona } from './env';
import type { ProxyHistoryItem } from './proxy';

export interface CheckSample {
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

const CITIES = ['losangeles', 'newyork', 'chicago'] as const;
type City = (typeof CITIES)[number];

const CITY_REGION: Record<City, string> = {
  losangeles: '美国-洛杉矶',
  newyork: '美国-纽约',
  chicago: '美国-芝加哥',
};

const SESSION_CHARS = 'abcdefghijkmnpqrstuvwxyz0123456789';

const CHECK_RESULTS: CheckSample[] = [
  {
    ip: '76.89.201.14',
    hostname: 'syn-076-089-201-014.res.spectrum.com',
    city: 'Los Angeles',
    region: 'California',
    country: 'US',
    org: 'AS20115 Charter Communications',
    timezone: 'America/Los_Angeles',
    latency_ms: 178,
    isp: 'Charter Communications',
    qualified: true,
    reason: '美国消费宽带（Charter 家宽段）',
  },
  {
    ip: '128.199.85.7',
    hostname: '128.199.85.7.16clouds.com',
    city: 'Singapore',
    region: 'Singapore',
    country: 'SG',
    org: 'AS16276 OVH SAS (Datacamp)',
    timezone: 'Asia/Singapore',
    latency_ms: 336,
    isp: 'Datacamp Limited',
    qualified: false,
    reason: '机房/Hosting 出口，且非美国（新加坡）',
  },
  {
    ip: '12.119.84.203',
    hostname: '12.119.84.203.ptr.us.xo.net',
    city: 'Dallas',
    region: 'Texas',
    country: 'US',
    org: 'AS7018 AT&T Enterprises',
    timezone: 'America/Chicago',
    latency_ms: 207,
    isp: 'AT&T Enterprises',
    qualified: false,
    reason: 'AT&T Enterprises 商务线，非消费宽带',
  },
];

const CHECK_REGION: Record<string, string> = {
  'Charter Communications': '美国-洛杉矶',
  'Datacamp Limited': '新加坡',
  'AT&T Enterprises': '美国-达拉斯',
};

export function fpStd(): Fingerprint {
  return {
    lang: { mode: 'auto', value: 'en-US' },
    tz: { mode: 'auto', value: 'America/Los_Angeles' },
    geo: { mode: 'allow', sub: 'ip' },
    screen: { mode: 'quick', value: '1920×1080' },
    fonts: 'default',
    clientrects: 'off',
    webrtc: 'disable',
    canvas: 'real',
    webgl: 'noise',
    webglinfo: 'custom',
    webglvendor: 'intel',
  };
}

function slot2Fingerprint(): Fingerprint {
  const fingerprint = fpStd();
  fingerprint.screen = { mode: 'quick', value: '2560×1440' };
  return fingerprint;
}

export const state: {
  personas: Persona[];
  instances: Instance[];
  launchesTotal: number;
  pidSeq: number;
  checkSeq: number;
  history: ProxyHistoryItem[];
} = {
  personas: [
    {
      id: 'p-1',
      seq: 1,
      slot: 'us-la-slot1',
      name: '日常主号',
      tz: 'America/Los_Angeles',
      ua_short:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36',
      screen: '1920×1080',
      locked: true,
      used_count: 2,
      created_at: '2026-11-12T10:24:00',
      group: '默认分组',
      pinned: true,
      starred: true,
      lang: 'en-US',
      fp: fpStd(),
      proxy: {
        uri: 'http://client-demo_area-us_city-losangeles_life-120_session-0913fnru6pzb:demo-pass@proxy.example.com:9000',
        ip: '71.219.34.18',
        type: '静态',
        region: '美国-洛杉矶',
        qualified: true,
        last_check: '2026-11-13T10:05:00',
      },
    },
    {
      id: 'p-2',
      seq: 2,
      slot: 'us-la-slot2',
      name: '备用号',
      tz: 'America/Los_Angeles',
      ua_short:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36',
      screen: '2560×1440',
      locked: true,
      used_count: 0,
      created_at: '2026-11-13T09:41:00',
      group: '默认分组',
      pinned: false,
      starred: false,
      lang: 'en-US',
      fp: slot2Fingerprint(),
      proxy: {
        uri: 'http://client-demo_area-us_city-newyork_life-120_session-k7d2f8h4j9:demo-pass@proxy.example.com:9000',
        ip: '98.42.67.11',
        type: '直连',
        region: '美国-纽约',
        qualified: false,
        last_check: '2026-11-13T09:30:00',
      },
    },
  ],
  instances: [],
  launchesTotal: 0,
  pidSeq: 12040,
  checkSeq: 0,
  history: [
    {
      proxy_uri: 'proxy.example.com:9000',
      ip: '76.89.201.14',
      country: 'US',
      isp: 'Charter Communications',
      qualified: true,
      reason: '美国消费宽带（Charter 家宽段）',
      checked_at: '2026-11-13T10:05:00',
    },
    {
      proxy_uri: 'proxy.example.com:9000',
      ip: '128.199.85.7',
      country: 'SG',
      isp: 'Datacamp Limited',
      qualified: false,
      reason: '机房/Hosting 出口，且非美国（新加坡）',
      checked_at: '2026-11-13T09:52:00',
    },
    {
      proxy_uri: 'proxy.example.com:9000',
      ip: '12.119.84.203',
      country: 'US',
      isp: 'AT&T Enterprises',
      qualified: false,
      reason: 'AT&T Enterprises 商务线，非消费宽带',
      checked_at: '2026-11-13T09:30:00',
    },
  ],
};

export function clone<T>(value: T): T {
  return structuredClone(value);
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function maskHost(uri: string): string {
  const matched = String(uri || '').match(/^(?:https?:\/\/|socks5:\/\/)?(?:[^@/?#]+@)?([^/?#]+)/);
  return matched?.[1] ?? String(uri || '');
}

export function pickCity(): City {
  return CITIES[Math.floor(Math.random() * CITIES.length)] ?? 'losangeles';
}

function randSession(): string {
  return Array.from(
    { length: 10 },
    () => SESSION_CHARS[Math.floor(Math.random() * SESSION_CHARS.length)] ?? 'a',
  ).join('');
}

export function smartproxyUri(city: City): string {
  return (
    `http://client-demo_area-us_city-${city}_life-120_session-${randSession()}` +
    ':demo-pass@proxy.example.com:9000'
  );
}

export function cityRegion(city: City): string {
  return CITY_REGION[city] || '美国-洛杉矶';
}

export function regionForIsp(isp: string): string | undefined {
  return CHECK_REGION[isp];
}

export function nextCheckResult(): CheckSample {
  const sample = CHECK_RESULTS[state.checkSeq % CHECK_RESULTS.length];
  state.checkSeq += 1;
  if (!sample) {
    throw new Error('check sample missing');
  }
  return { ...sample };
}
