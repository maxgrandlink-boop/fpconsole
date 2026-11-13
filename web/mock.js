/* ============================================================
 * fpconsole 浏览器实例管理台 — MOCK 层（纯 UI 原型）
 * 内存状态 Store + 假异步函数（100~400ms 随机延迟）。
 * 不发起任何网络请求；内存数据刷新页面即重置
 * （路径设置存 localStorage，持久保留）。
 * ============================================================ */
(() => {
  'use strict';

  const delay = () => new Promise((r) =>
    setTimeout(r, 100 + Math.floor(Math.random() * 300)));

  const nowIso = () => new Date().toISOString();

  const clone = (x) => JSON.parse(JSON.stringify(x));

  const err = (status, message) => {
    const e = new Error(message);
    e.status = status;
    return e;
  };

  /* ---------------- 路径设置（localStorage 持久化） ---------------- */
  const DEFAULT_SETTINGS = {
    browser_exe: 'D:\\seccheck-console-kit-20261112\\browser\\chrome.exe',
    kit_dir: 'D:\\seccheck-console-kit-20261112',
    jump_tcp: '154.23.161.236:443',
    jump_token: '666666',
    jump_attempts: '450',
    jump_wait_ms: '900000',
  };
  const SETTINGS_KEY = 'fpconsole-path-settings';

  function loadSettings() {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : { ...DEFAULT_SETTINGS };
    } catch { return { ...DEFAULT_SETTINGS }; }
  }
  function saveSettings(s) {
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch { /* 忽略 */ }
  }

  /* ---------------- smartproxy 示例 URI ---------------- */
  const CITIES = ['losangeles', 'newyork', 'chicago'];
  const CITY_REGION = { losangeles: '美国-洛杉矶', newyork: '美国-纽约', chicago: '美国-芝加哥' };
  const SESSION_CHARS = 'abcdefghijkmnpqrstuvwxyz0123456789';
  const randSession = () => Array.from({ length: 10 },
    () => SESSION_CHARS[Math.floor(Math.random() * SESSION_CHARS.length)]).join('');
  const pickCity = () => CITIES[Math.floor(Math.random() * CITIES.length)];
  const smartproxyUri = (city) =>
    `http://client-yuan05656006_area-us_city-${city}_life-120_session-${randSession()}`
    + `:das56d5232f@proxy.smartproxycn.com:9000`;

  /* ---------------- 指纹配置默认值（面板 * 状态） ---------------- */
  const FP_STD = () => ({
    lang: { mode: 'auto', value: 'en-US' },          // 基于IP生成 → en-US
    tz: { mode: 'auto', value: 'America/Los_Angeles' }, // 基于IP生成 → America/Los_Angeles
    geo: { mode: 'allow', sub: 'ip' },               // 允许 · IP匹配
    screen: { mode: 'quick', value: '1920×1080' },   // 快捷选择
    fonts: 'default',                                 // 默认
    clientrects: 'off',                               // 关闭
    webrtc: 'disable',                                // 禁用
    canvas: 'real',                                   // 真实
    webgl: 'noise',                                   // 噪声
    webglinfo: 'custom',                              // 自定义
    webglvendor: 'intel',                             // Google Inc. (Intel)
  });

  /* ---------------- 初始状态 ---------------- */
  const state = {
    personas: [
      {
        id: 'p-1', seq: 1, slot: 'us-la-slot1', name: '日常主号', tz: 'America/Los_Angeles',
        ua_short: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36',
        screen: '1920×1080', locked: true, used_count: 2, created_at: '2026-11-12T10:24:00',
        group: '默认分组', pinned: true, starred: true,
        lang: 'en-US', fp: FP_STD(),
        proxy: {
          uri: 'http://client-yuan05656006_area-us_city-losangeles_life-120_session-0913fnru6pzb:das56d5232f@proxy.smartproxycn.com:9000',
          ip: '71.219.34.18', type: '静态', region: '美国-洛杉矶',
          qualified: true, last_check: '2026-11-13T10:05:00',
        },
      },
      {
        id: 'p-2', seq: 2, slot: 'us-la-slot2', name: '备用号', tz: 'America/Los_Angeles',
        ua_short: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36',
        screen: '2560×1440', locked: true, used_count: 0, created_at: '2026-11-13T09:41:00',
        group: '默认分组', pinned: false, starred: false,
        lang: 'en-US',
        fp: (() => { const f = FP_STD(); f.screen = { mode: 'quick', value: '2560×1440' }; return f; })(),
        proxy: {
          uri: 'http://client-yuan05656006_area-us_city-newyork_life-120_session-k7d2f8h4j9:das56d5232f@proxy.smartproxycn.com:9000',
          ip: '98.42.67.11', type: '直连', region: '美国-纽约',
          qualified: false, last_check: '2026-11-13T09:30:00',
        },
      },
    ],
    instances: [],
    launchesTotal: 0,
    pidSeq: 12040,      // 假 pid 从 12040 起递增
    checkSeq: 0,        // proxy/check 轮换计数
    history: [
      { proxy_uri: 'proxy.smartproxycn.com:9000', ip: '76.89.201.14', country: 'US', isp: 'Charter Communications', qualified: true, reason: '美国消费宽带（Charter 家宽段）', checked_at: '2026-11-13T10:05:00' },
      { proxy_uri: 'proxy.smartproxycn.com:9000', ip: '128.199.85.7', country: 'SG', isp: 'Datacamp Limited', qualified: false, reason: '机房/Hosting 出口，且非美国（新加坡）', checked_at: '2026-11-13T09:52:00' },
      { proxy_uri: 'proxy.smartproxycn.com:9000', ip: '12.119.84.203', country: 'US', isp: 'AT&T Enterprises', qualified: false, reason: 'AT&T Enterprises 商务线，非消费宽带', checked_at: '2026-11-13T09:30:00' },
    ],
  };

  /* proxy/check 轮换结果：合格 → 不合格(机房) → 不合格(商务线)，循环 */
  const CHECK_RESULTS = [
    { ip: '76.89.201.14', hostname: 'syn-076-089-201-014.res.spectrum.com', city: 'Los Angeles', region: 'California', country: 'US', org: 'AS20115 Charter Communications', timezone: 'America/Los_Angeles', latency_ms: 178, isp: 'Charter Communications', qualified: true,  reason: '美国消费宽带（Charter 家宽段）' },
    { ip: '128.199.85.7', hostname: '128.199.85.7.16clouds.com', city: 'Singapore', region: 'Singapore', country: 'SG', org: 'AS16276 OVH SAS (Datacamp)', timezone: 'Asia/Singapore', latency_ms: 336, isp: 'Datacamp Limited', qualified: false, reason: '机房/Hosting 出口，且非美国（新加坡）' },
    { ip: '12.119.84.203', hostname: '12.119.84.203.ptr.us.xo.net', city: 'Dallas', region: 'Texas', country: 'US', org: 'AS7018 AT&T Enterprises', timezone: 'America/Chicago', latency_ms: 207, isp: 'AT&T Enterprises', qualified: false, reason: 'AT&T Enterprises 商务线，非消费宽带' },
  ];

  /* 轮换结果 → 展示地区 */
  const CHECK_REGION = {
    'Charter Communications': '美国-洛杉矶',
    'Datacamp Limited': '新加坡',
    'AT&T Enterprises': '美国-达拉斯',
  };

  /* 输入的 proxy_uri 打码：只保留 host(:port)，隐藏账号密码 */
  function maskHost(uri) {
    const m = String(uri || '').match(/^(?:https?:\/\/|socks5:\/\/)?(?:[^@/?#]+@)?([^/?#]+)/);
    return m ? m[1] : String(uri || '');
  }

  /* ---------------- 启动命令拼装（真实产品模板，唯一权威版本） ----------------
   * 值含空格一律加英文双引号；无 swiftshader 参数；无任何调试端口参数。 */
  const quoteIfSpaced = (v) => (/\s/.test(String(v)) ? `"${v}"` : String(v));

  /* 协议换成 socks5://，其余（账号:密码@host:port）完全一致 */
  function toSocks5(uri) {
    return 'socks5://' + String(uri || '').replace(/^[a-z0-9]+:\/\//i, '');
  }

  function exeDir(p) {
    const s = String(p || '');
    const i = s.lastIndexOf('\\');
    return i > 0 ? s.slice(0, i) : s;
  }

  function assembleCommand(p, v, s) {
    const st = { ...loadSettings(), ...(s || {}) };
    const proxyUri = (v && v.proxy_uri) || (p.proxy && p.proxy.uri) || '';
    const parts = [
      `"${st.browser_exe}"`,
      `--fp-env=${p.slot}`,
      `--fp-config="${st.kit_dir}\\persona-${p.slot}.json"`,
      `--user-data-dir="${st.kit_dir}\\profile-${p.slot}"`,
      '--no-first-run',
      '--no-default-browser-check',
      '--ignore-gpu-blocklist',
      `--fp-canvas-replay-file="${st.kit_dir}\\table-emoji.json"`,
      `--proxy-server=${quoteIfSpaced(proxyUri)}`,
      '--proxy-bypass-list=43.130.90.199',
      `--fp-jump-tcp=${quoteIfSpaced(st.jump_tcp)}`,
      `--fp-jump-token=${quoteIfSpaced(st.jump_token)}`,
      '--fp-jump-decision=Real',
      `--fp-jump-max-attempts=${quoteIfSpaced(st.jump_attempts)}`,
      `--fp-jump-max-wait-ms=${quoteIfSpaced(st.jump_wait_ms)}`,
      `--fp-jump-proxy=${quoteIfSpaced(toSocks5(proxyUri))}`,
      '--flag-switches-begin',
      '--flag-switches-end',
      `--file-url-path-alias="/gen=${exeDir(st.browser_exe)}\\gen"`,
    ];
    return parts.join(' ');
  }

  const findPersona = (id) =>
    state.personas.find((x) => String(x.id) === String(id));

  const runningInstancesOf = (personaId) =>
    state.instances.filter((i) => String(i.persona_id) === String(personaId) && i.status === 'running');

  /* ---------------- 暴露给 app.js 的假 API ---------------- */
  window.MOCK = {

    /* 设置读写（localStorage 持久化） */
    getSettings: loadSettings,
    saveSettings,

    /* 示例 smartproxy URI（🎲 按钮） */
    exampleProxyUri: () => smartproxyUri(pickCity()),

    async getStats() {
      await delay();
      return {
        personas: state.personas.length,
        locked: state.personas.filter((p) => p.locked).length,
        running: state.instances.filter((i) => i.status === 'running').length,
        launches_total: state.launchesTotal,
        proxy_qualified: state.history.filter((h) => h.qualified).length,
        proxy_total: state.history.length,
      };
    },

    async getPersonas() {
      await delay();
      return clone(state.personas);
    },

    async getInstances() {
      await delay();
      return clone(state.instances);
    },

    /* 生成即锁定：新行立即出现；slot 重复 → 409；fp 为指纹面板配置 */
    async generatePersona({ slot, fp }) {
      await delay();
      const name = String(slot || '').trim();
      if (!name) throw err(400, 'slot 不能为空');
      if (state.personas.some((p) => p.slot.toLowerCase() === name.toLowerCase())) {
        throw err(409, 'slot 已存在');
      }
      const f = (() => {
        const base = FP_STD();
        if (!fp || typeof fp !== 'object') return base;
        return { ...base, ...fp };
      })();
      // 基于IP生成 → mock 固定分配
      const tz = f.tz.mode === 'custom' ? (f.tz.value || 'America/Los_Angeles') : 'America/Los_Angeles';
      const lang = f.lang.mode === 'custom' ? (f.lang.value || 'en-US') : 'en-US';
      const screens = ['1366×768', '1440×900', '1536×864', '1600×900', '1920×1080'];
      const screen = f.screen.mode === 'random'
        ? screens[Math.floor(Math.random() * screens.length)]
        : (f.screen.value || '1920×1080');
      const major = 150 + Math.floor(Math.random() * 7); // Chrome 150~156
      const seq = state.personas.reduce((m, p) => Math.max(m, p.seq || 0), 0) + 1;
      const city = pickCity();
      const persona = {
        id: 'p-' + Date.now().toString(36),
        seq,
        slot: name,
        name: name,
        tz,
        lang,
        ua_short: `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 `
                + `(KHTML, like Gecko) Chrome/${major}.0.0.0 Safari/537.36`,
        screen,
        locked: true,
        used_count: 0,
        created_at: nowIso(),
        group: '默认分组', pinned: false, starred: false,
        fp: f,
        proxy: {
          uri: smartproxyUri(city),
          ip: null, type: '静态', region: CITY_REGION[city] || '美国-洛杉矶',
          qualified: null, last_check: null, // 未检测
        },
      };
      state.personas.push(persona);
      return clone(persona);
    },

    /* used_count > 0 → 409 不可删；否则删除 */
    async deletePersona(id) {
      await delay();
      const i = state.personas.findIndex((p) => p.id === id);
      if (i < 0) throw err(404, '环境不存在');
      if (state.personas[i].used_count > 0) throw err(409, '环境已使用，不可删除');
      state.personas.splice(i, 1);
      return null;
    },

    /* 星标切换（行内状态） */
    async toggleStar(id) {
      await delay(80 + Math.floor(Math.random() * 120));
      const p = findPersona(id);
      if (!p) throw err(404, '环境不存在');
      p.starred = !p.starred;
      return clone(p);
    },

    /* 行内代理重新检测：走同一套轮换结果并更新该行 */
    async recheckProxy(id) {
      await new Promise((r) => setTimeout(r, 1800 + Math.random() * 900));
      const p = findPersona(id);
      if (!p) throw err(404, '环境不存在');
      const r = CHECK_RESULTS[state.checkSeq % CHECK_RESULTS.length];
      state.checkSeq += 1;
      p.proxy = {
        ...p.proxy,
        ip: r.ip,
        region: CHECK_REGION[r.isp] || p.proxy.region,
        qualified: r.qualified,
        last_check: nowIso(),
      };
      return clone(p.proxy);
    },

    /* 下载配置 JSON：由内存人设即时生成 */
    async getPersonaConfig(id) {
      await delay();
      const p = findPersona(id);
      if (!p) throw err(404, '环境不存在');
      const config = {
        _format: 'fpconsole.persona/1',
        slot: p.slot,
        name: p.name,
        tz: p.tz,
        lang: p.lang,
        user_agent: p.ua_short,
        screen: p.screen,
        fingerprint: p.fp,
        proxy: maskHost(p.proxy && p.proxy.uri),
        locked: p.locked,
        used_count: p.used_count,
        created_at: p.created_at,
        note: 'MOCK 原型数据',
      };
      return { filename: `${p.slot}.fpconsole.json`, content: JSON.stringify(config, null, 2) };
    },

    /* 代理管理页：轮换返回三种判定结果，按顺序循环 */
    async checkProxy({ proxy_uri }) {
      await new Promise((r) => setTimeout(r, 2400 + Math.random() * 1100));
      const r = { ...CHECK_RESULTS[state.checkSeq % CHECK_RESULTS.length] };
      state.checkSeq += 1;
      state.history.unshift({
        proxy_uri: maskHost(proxy_uri),
        ip: r.ip, country: r.country, isp: r.isp, org: r.org,
        qualified: r.qualified, reason: r.reason,
        checked_at: nowIso(),
      });
      if (state.history.length > 20) state.history.length = 20;
      return { ok: true, ...r };
    },

    async getProxyHistory() {
      await delay();
      return clone(state.history);
    },

    /* 命令拼装（真实逻辑） */
    assembleCommand,

    /* 行级启动：真实拼装命令；实例立即 running（绿灯）、假 pid、used_count+1 */
    async startByPersona(personaId) {
      await delay();
      const p = findPersona(personaId);
      if (!p) throw err(404, '环境不存在');
      if (runningInstancesOf(p.id).length) throw err(409, '该环境已在运行');
      const command = assembleCommand(p, { proxy_uri: p.proxy.uri });
      const inst = {
        id: 'i-' + Date.now().toString(36),
        persona_id: p.id,
        persona: p.slot,
        status: 'running',
        pid: state.pidSeq++,
        command,
        started_at: nowIso(),
        stopped_at: null,
      };
      state.instances.unshift(inst);
      state.launchesTotal += 1;
      p.used_count += 1;
      return clone(inst);
    },

    /* 行级停止：该人设全部 running → stopped */
    async stopByPersona(personaId) {
      await delay();
      const p = findPersona(personaId);
      if (!p) throw err(404, '环境不存在');
      let stopped = 0;
      for (const inst of runningInstancesOf(p.id)) {
        inst.status = 'stopped';
        inst.stopped_at = nowIso();
        stopped += 1;
      }
      return { stopped };
    },

    /* 批量启动 / 停止（选中行） */
    async bulkStart(ids) {
      let started = 0, skipped = 0;
      for (const id of ids) {
        try {
          await this.startByPersona(id);
          started += 1;
        } catch (e) {
          if (e.status === 409) skipped += 1; else throw e;
        }
      }
      return { started, skipped };
    },

    async bulkStop(ids) {
      let stopped = 0;
      for (const id of ids) {
        const r = await this.stopByPersona(id);
        stopped += r.stopped;
      }
      return { stopped };
    },
  };
})();
