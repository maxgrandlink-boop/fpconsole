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
        asn: 'AS20115',
        isp: 'Charter Communications',
      },
      country: 'us',
      region: 'la',
      start_url: null,
      os_browser: 'Win10 · 155',
      status: 'running',
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
        asn: null,
        isp: null,
      },
      country: 'us',
      region: 'ny',
      start_url: null,
      os_browser: 'Win10 · 153',
      status: 'closed',
    },
    {
      id: 'p-3',
      seq: 3,
      slot: 'us-la-slot3',
      name: 'us-la-slot3',
      tz: 'America/Los_Angeles',
      ua_short:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36',
      screen: '1920×1080',
      locked: true,
      used_count: 0,
      created_at: '2026-11-13T11:02:00',
      group: '默认分组',
      pinned: false,
      starred: false,
      lang: 'en-US',
      fp: fpStd(),
      proxy: {
        uri: 'http://client-demo_area-us_city-losangeles_life-120_session-aa11bb22cc:demo-pass@proxy.example.com:9000',
        ip: '128.199.85.7',
        type: '静态',
        region: '美国-洛杉矶',
        qualified: false,
        last_check: '2026-11-13T11:02:00',
        asn: 'AS16276',
        isp: 'Datacamp Limited',
      },
      country: 'us',
      region: 'la',
      start_url: null,
      os_browser: 'Win10 · 151',
      status: 'ip_fail',
    },
    {
      id: 'p-4',
      seq: 4,
      slot: 'us-ny-slot1',
      name: 'us-ny-slot1',
      tz: 'America/New_York',
      ua_short:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36',
      screen: '1440×900',
      locked: true,
      used_count: 1,
      created_at: '2026-11-13T08:16:00',
      group: '默认分组',
      pinned: false,
      starred: false,
      lang: 'en-US',
      fp: fpStd(),
      proxy: {
        uri: 'http://client-demo_area-us_city-newyork_life-120_session-ny01aa22bb:demo-pass@proxy.example.com:9000',
        ip: '12.119.84.203',
        type: '静态',
        region: '美国-纽约',
        qualified: false,
        last_check: '2026-11-13T08:20:00',
        asn: 'AS7018',
        isp: 'AT&T Enterprises',
      },
      country: 'us',
      region: 'ny',
      start_url: null,
      os_browser: 'Win10 · 152',
      status: 'closed',
    },
    {
      id: 'p-5',
      seq: 5,
      slot: 'sg-slot1',
      name: 'sg-slot1',
      tz: 'Asia/Singapore',
      ua_short:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36',
      screen: '1920×1080',
      locked: true,
      used_count: 1,
      created_at: '2026-11-13T07:40:00',
      group: '默认分组',
      pinned: false,
      starred: false,
      lang: 'en-US',
      fp: fpStd(),
      proxy: {
        uri: 'http://client-demo_area-sg_life-120_session-sg01cc33dd:demo-pass@proxy.example.com:9000',
        ip: '128.199.85.7',
        type: '静态',
        region: '新加坡',
        qualified: false,
        last_check: '2026-11-13T07:41:00',
        asn: 'AS16276',
        isp: 'Datacamp Limited',
      },
      country: 'sg',
      region: null,
      start_url: 'https://www.example.com',
      os_browser: 'Win10 · 154',
      status: 'running',
    },
    {
      id: 'p-6',
      seq: 6,
      slot: 'jp-slot1',
      name: 'jp-slot1',
      tz: 'Asia/Tokyo',
      ua_short:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36',
      screen: '1366×768',
      locked: true,
      used_count: 0,
      created_at: '2026-11-12T18:05:00',
      group: '默认分组',
      pinned: false,
      starred: false,
      lang: 'en-US',
      fp: fpStd(),
      proxy: {
        uri: 'http://client-demo_area-jp_life-120_session-jp01ee44ff:demo-pass@proxy.example.com:9000',
        ip: null,
        type: '静态',
        region: '日本',
        qualified: null,
        last_check: null,
        asn: null,
        isp: null,
      },
      country: 'jp',
      region: null,
      start_url: null,
      os_browser: 'Win10 · 150',
      status: 'closed',
    },
    {
      id: 'p-7',
      seq: 7,
      slot: 'de-slot1',
      name: 'de-slot1',
      tz: 'Europe/Berlin',
      ua_short:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36',
      screen: '1920×1080',
      locked: true,
      used_count: 0,
      created_at: '2026-11-12T16:22:00',
      group: '默认分组',
      pinned: false,
      starred: false,
      lang: 'en-US',
      fp: fpStd(),
      proxy: {
        uri: 'http://client-demo_area-de_life-120_session-de01aa99bb:demo-pass@proxy.example.com:9000',
        ip: '76.89.201.14',
        type: '静态',
        region: '德国',
        qualified: true,
        last_check: '2026-11-12T16:30:00',
        asn: 'AS20115',
        isp: 'Charter Communications',
      },
      country: 'de',
      region: null,
      start_url: null,
      os_browser: 'Win10 · 156',
      status: 'closed',
    },
    {
      id: 'p-8',
      seq: 8,
      slot: 'ca-slot1',
      name: 'ca-slot1',
      tz: 'America/Toronto',
      ua_short:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36',
      screen: '2560×1440',
      locked: true,
      used_count: 0,
      created_at: '2026-11-11T21:08:00',
      group: '默认分组',
      pinned: false,
      starred: false,
      lang: 'en-US',
      fp: slot2Fingerprint(),
      proxy: {
        uri: 'http://client-demo_area-ca_life-120_session-ca01cc77dd:demo-pass@proxy.example.com:9000',
        ip: '98.42.67.11',
        type: '静态',
        region: '加拿大',
        qualified: null,
        last_check: null,
        asn: null,
        isp: null,
      },
      country: 'ca',
      region: null,
      start_url: null,
      os_browser: 'Win10 · 153',
      status: 'closed',
    },
  ],
  instances: [
    {
      id: 'i-1',
      persona_id: 'p-1',
      persona: 'us-la-slot1',
      status: 'running',
      pid: 12040,
      command: '',
      started_at: '2026-11-13T10:05:00',
      stopped_at: null,
    },
    {
      id: 'i-5',
      persona_id: 'p-5',
      persona: 'sg-slot1',
      status: 'running',
      pid: 12041,
      command: '',
      started_at: '2026-11-13T07:41:00',
      stopped_at: null,
    },
  ],
  launchesTotal: 2,
  pidSeq: 12042,
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
  return exampleUri('us', city);
}

/** 有城市 token 时带 `_city-`。没有城市 token 的国家只带 area。 */
export function exampleUri(area: string, city?: string): string {
  const cityPart = city ? `_city-${city}` : '';
  return (
    `http://client-demo_area-${area}${cityPart}_life-120_session-${randSession()}` +
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
