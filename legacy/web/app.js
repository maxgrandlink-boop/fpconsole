/* ============================================================
 * fpconsole 浏览器实例管理台 — 前端逻辑（纯静态，无构建工具）
 * 纯 UI 原型：所有数据来自 mock.js 的内存 Store，无任何网络请求。
 * 布局：左侧边栏 + 主区（环境管理表格 / 代理管理 / 参考）
 * ============================================================ */
(() => {
  'use strict';

  /* ---------------- 基础工具 ---------------- */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));

  const num = (v) => (v == null ? '–' : String(v));

  function parseDate(iso) {
    if (!iso) return null;
    const d = new Date(iso);
    return isNaN(d.getTime()) ? null : d;
  }
  const p2 = (n) => String(n).padStart(2, '0');

  function fmtFull(iso) {
    const d = parseDate(iso);
    if (!d) return esc(iso || '–');
    return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())} ${p2(d.getHours())}:${p2(d.getMinutes())}:${p2(d.getSeconds())}`;
  }
  function fmtParts(iso) {
    const d = parseDate(iso);
    if (!d) return { d: esc(iso || '–'), t: '' };
    return {
      d: `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`,
      t: `${p2(d.getHours())}:${p2(d.getMinutes())}:${p2(d.getSeconds())}`,
    };
  }
  function fmtShort(iso) {
    const d = parseDate(iso);
    if (!d) return '';
    return `${p2(d.getMonth() + 1)}-${p2(d.getDate())} ${p2(d.getHours())}:${p2(d.getMinutes())}`;
  }

  /* UA 摘要：只显示 Chrome/xxx 后半截 */
  function uaTail(ua) {
    if (!ua) return '–';
    const s = String(ua);
    const i = s.indexOf('Chrome/');
    if (i >= 0) return s.slice(i);
    return s.length > 44 ? s.slice(-44) : s;
  }

  const emptyBox = (text) => `<div class="empty">${esc(text)}</div>`;

  /* 检测动画：spinner + 阶段文字循环，返回清理函数 */
  function showChecking(title, steps) {
    $('#px-result').innerHTML = `
      <div class="checking">
        <div class="spinner"></div>
        <div>
          <div class="chk-title">${esc(title)}</div>
          <div class="chk-step" id="chk-step"></div>
        </div>
      </div>`;
    const el = $('#chk-step');
    let i = 0;
    el.textContent = steps[0];
    const timer = setInterval(() => {
      i = (i + 1) % steps.length;
      el.textContent = steps[i];
    }, 700);
    return () => clearInterval(timer);
  }

  /* Windows 风格小图标（蓝色四格） */
  const WIN_ICO = '<svg class="os-ico" width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">'
    + '<rect x="0" y="0" width="5.2" height="5.2" fill="#3B5BFF"/>'
    + '<rect x="6.8" y="0" width="5.2" height="5.2" fill="#3B5BFF"/>'
    + '<rect x="0" y="6.8" width="5.2" height="5.2" fill="#3B5BFF"/>'
    + '<rect x="6.8" y="6.8" width="5.2" height="5.2" fill="#3B5BFF"/></svg>';

  /* ---------------- Toast（红=失败 / 绿=成功 / 黄=提示；同文案 8s 去重） ---------------- */
  let lastToast = { msg: '', at: 0 };
  function toast(msg, type = 'error') {
    const now = Date.now();
    if (msg === lastToast.msg && now - lastToast.at < 8000) { lastToast.at = now; return; }
    lastToast = { msg, at: now };
    const box = $('#toast-box');
    const el = document.createElement('div');
    el.className = 'toast' + (type === 'ok' ? ' ok' : type === 'info' ? ' info' : '');
    el.textContent = (type === 'ok' ? '✓ ' : type === 'info' ? 'ℹ ' : '✕ ') + msg;
    box.appendChild(el);
    setTimeout(() => {
      el.classList.add('out');
      setTimeout(() => el.remove(), 320);
    }, 3800);
  }

  /* ---------------- 复制到剪贴板（clipboard API + execCommand 兜底） ---------------- */
  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        const ok = document.execCommand('copy');
        ta.remove();
        return ok;
      } catch { return false; }
    }
  }

  /* ============================================================
   * 环境管理页
   * ============================================================ */
  let envSearchKw = '';
  let envSortKey = 'seq';       // 'seq' | 'created'
  let envSortDir = 1;           // 1 升序 / -1 降序
  const envSelected = new Set(); // 选中的 persona id
  let lastVisibleIds = [];       // 最近一次渲染的可见行 id（全选用）
  let personasCache = [];        // 最近一次拿到的全量人设

  async function renderEnv() {
    await Promise.all([renderStatsPills(), renderEnvTable()]);
  }

  async function renderStatsPills() {
    try {
      const s = await MOCK.getStats();
      $('#env-stats').innerHTML = [
        `<div class="spill"><span class="n">${esc(num(s.personas))}</span><span class="l">环境数</span></div>`,
        `<div class="spill hl"><span class="n">${esc(num(s.running))}</span><span class="l">运行中</span></div>`,
        `<div class="spill"><span class="n">${esc(num(s.launches_total))}</span><span class="l">累计启动</span></div>`,
      ].join('');
    } catch (e) {
      $('#env-stats').innerHTML = emptyBox('统计加载失败：' + e.message);
    }
  }

  function matchSearch(p, kw) {
    if (!kw) return true;
    const px = p.proxy || {};
    const hay = [p.slot, p.name, p.tz, p.screen, p.ua_short, px.ip, px.region, p.group]
      .join(' ').toLowerCase();
    return hay.includes(kw);
  }

  function sortArrow(key) {
    if (envSortKey !== key) return '';
    return `<span class="arr">${envSortDir === 1 ? '↑' : '↓'}</span>`;
  }

  async function renderEnvTable() {
    const wrap = $('#env-table-wrap');
    wrap.innerHTML = emptyBox('加载中…');
    try {
      const [personas, insts] = await Promise.all([MOCK.getPersonas(), MOCK.getInstances()]);
      personasCache = personas;
      const running = new Set(
        insts.filter((i) => i.status === 'running').map((i) => String(i.persona_id)));

      // 清理已不存在的选中项
      const ids = new Set(personas.map((p) => String(p.id)));
      for (const id of Array.from(envSelected)) {
        if (!ids.has(id)) envSelected.delete(id);
      }

      const list = personas
        .filter((p) => matchSearch(p, envSearchKw))
        .sort((a, b) => {
          if ((a.pinned ? 1 : 0) !== (b.pinned ? 1 : 0)) return a.pinned ? -1 : 1; // 置顶恒在最上
          const r = envSortKey === 'created'
            ? (parseDate(a.created_at) || 0) - (parseDate(b.created_at) || 0)
            : (a.seq || 0) - (b.seq || 0);
          return r * envSortDir;
        });
      lastVisibleIds = list.map((p) => String(p.id));

      wrap.innerHTML = list.length
        ? envTableHtml(list, running)
        : emptyBox(envSearchKw ? '没有符合关键词的环境' : '还没有环境，点击左侧「＋ 新建环境」生成第一个');
      updateBulkBar();
    } catch (e) {
      wrap.innerHTML = emptyBox('环境列表加载失败：' + e.message);
      toast('环境列表加载失败：' + e.message);
    }
  }

  function envTableHtml(list, running) {
    const allSel = list.length > 0 && list.every((p) => envSelected.has(String(p.id)));
    const head = `
      <thead><tr>
        <th class="c-chk"><input type="checkbox" id="chk-all" data-act="chk-all" ${allSel ? 'checked' : ''} title="全选"></th>
        <th class="sortable" data-sort="seq">序号${sortArrow('seq')}</th>
        <th>分组</th>
        <th>名称</th>
        <th>人设</th>
        <th>代理信息</th>
        <th>使用次数</th>
        <th class="sortable" data-sort="created">创建时间${sortArrow('created')}</th>
        <th class="c-star">星标</th>
        <th>操作</th>
      </tr></thead>`;
    const rows = list.map((p) => envRowHtml(p, running.has(String(p.id)))).join('');
    return `<table class="tbl">${head}<tbody>${rows}</tbody></table>`;
  }

  function envRowHtml(p, run) {
    const sel = envSelected.has(String(p.id));
    const px = p.proxy || {};
    const checkLine = px.qualified === true
      ? `<div class="check-line ok">✓ 最后检测 ${esc(fmtShort(px.last_check))}</div>`
      : px.qualified === false
        ? `<div class="check-line bad">✗ 最后检测 ${esc(fmtShort(px.last_check))}</div>`
        : '<div class="check-line none">未检测</div>';
    const t = fmtParts(p.created_at);
    return `
      <tr class="${run ? 'running' : ''}" data-id="${esc(p.id)}">
        <td class="c-chk"><input type="checkbox" class="row-chk" data-act="chk-row" data-id="${esc(p.id)}" ${sel ? 'checked' : ''}></td>
        <td class="c-seq mono">${p.pinned ? '<span class="pin" title="置顶">📌</span>' : ''}${esc(num(p.seq))}</td>
        <td class="muted">${esc(p.group || '默认分组')}</td>
        <td>${WIN_ICO}<span class="slot-name">${esc(p.slot)}</span>
          <button class="link-btn" data-act="edit-persona" data-id="${esc(p.id)}" title="查看指纹配置">✏️</button></td>
        <td class="c-persona">
          <div class="ua">${esc(uaTail(p.ua_short))}</div>
          <div class="sub">🕐${esc(p.tz || '–')} · ${esc(p.screen || '–')} · 🔒已锁定</div>
          ${p.fp ? `<div class="fp-sum">${esc(fpSummary(p.fp))}</div>` : ''}
        </td>
        <td class="c-proxy">
          <div class="ip-row">
            <span class="mono ip">${esc(px.ip || '—')}</span>
            <button class="mini-round" data-act="recheck-proxy" data-id="${esc(p.id)}" title="重新检测">🔄</button>
          </div>
          <div class="tags">
            ${px.type ? `<span class="ptag ${px.type === '直连' ? 'orange' : 'blue'}">${esc(px.type)}</span>` : ''}
            <span class="region">${esc(px.region || '')}</span>
          </div>
          ${checkLine}
        </td>
        <td class="mono">${esc(num(p.used_count))} 次</td>
        <td class="c-time mono"><span class="d">${esc(t.d)}</span><span class="t">${esc(t.t)}</span></td>
        <td class="c-star"><button class="star ${p.starred ? 'on' : ''}" data-act="toggle-star" data-id="${esc(p.id)}" title="星标">${p.starred ? '★' : '☆'}</button></td>
        <td class="c-ops">
          ${run
            ? '<span class="dot run"></span><button class="row-stop" data-act="stop-row" data-id="' + esc(p.id) + '">⏹ 停止</button>'
            : '<button class="row-start" data-act="start-row" data-id="' + esc(p.id) + '">▶ 启动</button>'}
          <button class="btn-ghost" data-act="show-cmd" data-id="${esc(p.id)}" title="查看启动命令">⌨</button>
          <button class="btn-ghost" data-act="row-menu" data-id="${esc(p.id)}" title="更多操作">⋮</button>
        </td>
      </tr>`;
  }

  /* ---------- 选中浮动条 ---------- */
  function updateBulkBar() {
    const n = envSelected.size;
    const bar = $('#bulk-bar');
    if (!n) { bar.classList.add('hidden'); return; }
    bar.classList.remove('hidden');
    $('#bulk-count').textContent = `已选 ${n} 项`;
  }

  /* ---------- 行级操作 ---------- */
  async function startRow(id) {
    try {
      const inst = await MOCK.startByPersona(id);
      toast(`已启动（PID ${inst.pid}）`, 'ok');
      renderEnv();
    } catch (e) {
      toast(e.status === 409 ? '该环境已在运行' : '启动失败：' + e.message);
    }
  }

  async function stopRow(id) {
    try {
      await MOCK.stopByPersona(id);
      toast('已停止', 'ok');
      renderEnv();
    } catch (e) {
      toast('停止失败：' + e.message);
    }
  }

  async function recheckProxyRow(id, btn) {
    btn.disabled = true;
    btn.classList.add('spin');
    const cell = btn.closest('.c-proxy');
    if (cell) {
      const tags = cell.querySelector('.tags');
      const check = cell.querySelector('.check-line');
      if (tags) tags.innerHTML = '<span class="skel-line">--------</span>&nbsp;<span class="skel-line">--------</span>';
      if (check) { check.className = 'check-line none'; check.innerHTML = '<span class="skel-line">✓ ---- --:--</span>'; }
    }
    try {
      await MOCK.recheckProxy(id);
      renderEnvTable();
    } catch (e) {
      btn.disabled = false;
      btn.classList.remove('spin');
      toast('重新检测失败：' + e.message);
    }
  }

  async function toggleStarRow(id) {
    try {
      await MOCK.toggleStar(id);
      renderEnvTable();
    } catch (e) {
      toast('操作失败：' + e.message);
    }
  }

  /* ---------- 命令弹窗（proxy_uri 可改，实时重新拼装） ---------- */
  let cmdPersona = null;

  function updateCmdPre() {
    if (!cmdPersona) return;
    const uri = $('#cmd-proxy').value.trim() || 'http://user:pass@host:port';
    $('#cmd-modal-pre').textContent = MOCK.assembleCommand(cmdPersona, { proxy_uri: uri });
  }

  async function showCmdModal(id) {
    try {
      const p = personasCache.find((x) => String(x.id) === String(id))
        || (await MOCK.getPersonas()).find((x) => String(x.id) === String(id));
      if (!p) { toast('环境不存在'); return; }
      cmdPersona = p;
      $('#cmd-proxy').value = (p.proxy || {}).uri || '';
      updateCmdPre();
      $('#modal-cmd').classList.remove('hidden');
    } catch (e) {
      toast('生成命令失败：' + e.message);
    }
  }

  /* ---------- ⋮ 行菜单 ---------- */
  let menuTargetId = null;
  function openRowMenu(btn, id) {
    menuTargetId = id;
    const menu = $('#row-menu');
    const r = btn.getBoundingClientRect();
    menu.classList.remove('hidden');
    const mw = 140, mh = 90;
    menu.style.left = Math.min(r.left, window.innerWidth - mw - 8) + 'px';
    menu.style.top = Math.min(r.bottom + 4, window.innerHeight - mh - 8) + 'px';
  }
  function hideRowMenu() {
    $('#row-menu').classList.add('hidden');
    menuTargetId = null;
  }

  async function runMenuAction(kind) {
    const id = menuTargetId;
    hideRowMenu();
    if (!id) return;
    if (kind === 'dl') { downloadConfig(id); return; }
    if (kind === 'del') { deletePersona(id); }
  }

  async function deletePersona(id) {
    const p = personasCache.find((x) => String(x.id) === String(id));
    const slot = p ? p.slot : '该环境';
    if (!confirm(`确定删除「${slot}」？该操作不可恢复（仅 used_count = 0 可删除）。`)) return;
    try {
      await MOCK.deletePersona(id);
      toast(`已删除「${slot}」`, 'ok');
      renderEnv();
    } catch (e) {
      toast(e.status === 409 ? '该环境已被使用，不可删除' : '删除失败：' + e.message);
    }
  }

  async function downloadConfig(id) {
    try {
      const { filename, content } = await MOCK.getPersonaConfig(id);
      const blob = new Blob([content], { type: 'application/json' });
      const a = document.createElement('a');
      const url = URL.createObjectURL(blob);
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      toast('配置已开始下载', 'ok');
    } catch (e) {
      toast('下载配置失败：' + e.message);
    }
  }

  /* ---------- 新建环境 / 查看弹窗（指纹配置面板） ---------- */
  const TZ_LIST = ['America/Los_Angeles', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Phoenix'];
  const SCREEN_LIST = ['1920×1080', '2560×1440', '1680×1050', '1366×768', '3840×2160'];
  const VENDOR_LIST = [
    ['intel', 'Google Inc. (Intel)'],
    ['amd', 'Google Inc. (AMD)'],
    ['apple', 'Apple'],
    ['mozilla', 'Mozilla'],
  ];

  /* 面板默认状态（= 截图带 * 项） */
  const FP_DEFAULT_STATE = {
    lang: 'auto', tz: 'auto', geo: 'allow', geoSub: 'ip',
    screen: 'quick', fonts: 'default', clientrects: 'off',
    webrtc: 'disable', canvas: 'real', webgl: 'noise',
    webglinfo: 'custom', webglvendor: 'intel',
  };

  const FP_FIELDS = [
    { key: 'lang', label: '语言', opts: [['auto', '基于IP生成'], ['custom', '自定义']] },
    { key: 'tz', label: '时区', opts: [['auto', '基于IP生成'], ['custom', '自定义']] },
    { key: 'geo', label: '地理位置', opts: [['ask', '询问'], ['allow', '允许'], ['block', '禁止']] },
    { key: 'screen', label: '屏幕分辨率', opts: [['random', '随机'], ['quick', '快捷选择'], ['custom', '自定义']] },
    { key: 'fonts', label: '字体列表', opts: [['default', '默认'], ['custom', '自定义']] },
    { key: 'clientrects', label: 'ClientRects', opts: [['on', '开启'], ['off', '关闭']] },
    { key: 'webrtc', label: 'WebRTC', opts: [['replace', '替换'], ['real', '真实'], ['disable', '禁用']] },
    { key: 'canvas', label: 'Canvas', opts: [['noise', '噪声'], ['real', '真实']] },
    { key: 'webgl', label: 'WebGL', opts: [['noise', '噪声'], ['real', '真实']] },
    { key: 'webglinfo', label: 'WebGL Info', opts: [['custom', '自定义'], ['real', '真实']] },
  ];

  let fpState = { ...FP_DEFAULT_STATE };
  let genReadonly = false;

  function buildFpRows() {
    const rows = FP_FIELDS.map((f) => `
      <div class="fp-row">
        <div class="fp-label">${esc(f.label)}</div>
        <div class="fp-ctrl">
          <div class="seg">
            ${f.opts.map(([v, t]) =>
              `<button type="button" class="seg-btn" data-key="${f.key}" data-val="${v}">${esc(t)}</button>`).join('')}
          </div>
          ${f.key === 'lang' ? `<input class="fp-extra hidden mono" data-extra="lang" id="fp-lang" value="en-US" spellcheck="false">` : ''}
          ${f.key === 'tz' ? `<select class="fp-extra hidden" data-extra="tz" id="fp-tz">${TZ_LIST.map((t) => `<option value="${t}">${esc(t)}</option>`).join('')}</select>` : ''}
          ${f.key === 'screen' ? `<select class="fp-extra hidden" data-extra="screen" id="fp-screen">${SCREEN_LIST.map((t) => `<option value="${t}">${esc(t)}</option>`).join('')}</select>` : ''}
          ${f.key === 'geo' ? `<div class="fp-extra geo-line hidden" data-extra="geo">
              <label class="geo-opt"><input type="radio" name="fp-geo-sub" value="ip" checked> IP匹配</label>
              <label class="geo-opt"><input type="radio" name="fp-geo-sub" value="custom"> 自定义</label>
            </div>` : ''}
        </div>
      </div>`).join('');
    const vendor = `
      <div class="fp-row" id="fp-vendor-row">
        <div class="fp-label">WebGL厂商</div>
        <div class="fp-ctrl">
          <select class="fp-vendor" id="fp-vendor">
            ${VENDOR_LIST.map(([v, t]) => `<option value="${v}">${esc(t)}</option>`).join('')}
          </select>
        </div>
      </div>`;
    $('#fp-rows').innerHTML = rows + vendor;
  }

  function syncFpUI() {
    $$('#fp-rows .seg-btn').forEach((b) => {
      b.classList.toggle('on', fpState[b.dataset.key] === b.dataset.val);
    });
    const show = (key, on) => {
      const el = $(`#fp-rows [data-extra="${key}"]`);
      if (el) el.classList.toggle('hidden', !on);
    };
    show('lang', fpState.lang === 'custom');
    show('tz', fpState.tz === 'custom');
    show('screen', fpState.screen === 'quick' || fpState.screen === 'custom');
    show('geo', fpState.geo === 'allow');
    $('#fp-vendor-row').classList.toggle('hidden', fpState.webglinfo !== 'custom');
  }

  function resetFpForm() {
    fpState = { ...FP_DEFAULT_STATE };
    $('#fp-lang').value = 'en-US';
    $('#fp-tz').value = 'America/Los_Angeles';
    $('#fp-screen').value = '1920×1080';
    const r = $('input[name="fp-geo-sub"][value="ip"]');
    if (r) r.checked = true;
    $('#fp-vendor').value = 'intel';
    syncFpUI();
  }

  function applyFpToForm(fp) {
    const f = fp || {};
    fpState = {
      lang: (f.lang && f.lang.mode) || 'auto',
      tz: (f.tz && f.tz.mode) || 'auto',
      geo: (f.geo && f.geo.mode) || 'allow',
      geoSub: (f.geo && f.geo.sub) || 'ip',
      screen: (f.screen && f.screen.mode) || 'quick',
      fonts: f.fonts || 'default',
      clientrects: f.clientrects || 'off',
      webrtc: f.webrtc || 'disable',
      canvas: f.canvas || 'real',
      webgl: f.webgl || 'noise',
      webglinfo: f.webglinfo || 'custom',
      webglvendor: f.webglvendor || 'intel',
    };
    if (f.lang && f.lang.value) $('#fp-lang').value = f.lang.value;
    if (f.tz && f.tz.value) $('#fp-tz').value = f.tz.value;
    if (f.screen && f.screen.value) $('#fp-screen').value = f.screen.value;
    const r = $(`input[name="fp-geo-sub"][value="${fpState.geoSub}"]`);
    if (r) r.checked = true;
    $('#fp-vendor').value = fpState.webglvendor;
    syncFpUI();
  }

  function collectFp() {
    const sub = $('input[name="fp-geo-sub"]:checked');
    return {
      lang: { mode: fpState.lang, value: fpState.lang === 'custom' ? ($('#fp-lang').value.trim() || 'en-US') : 'en-US' },
      tz: { mode: fpState.tz, value: fpState.tz === 'custom' ? $('#fp-tz').value : 'America/Los_Angeles' },
      geo: { mode: fpState.geo, sub: (sub && sub.value) || 'ip' },
      screen: { mode: fpState.screen, value: fpState.screen === 'random' ? null : $('#fp-screen').value },
      fonts: fpState.fonts,
      clientrects: fpState.clientrects,
      webrtc: fpState.webrtc,
      canvas: fpState.canvas,
      webgl: fpState.webgl,
      webglinfo: fpState.webglinfo,
      webglvendor: $('#fp-vendor').value,
    };
  }

  /* 人设单元格第三行摘要 */
  const GEO_TXT = { ask: '询问', allow: '允许', block: '禁止' };
  const VENDOR_SHORT = { intel: 'Intel', amd: 'AMD', apple: 'Apple', mozilla: 'Mozilla' };
  function fpSummary(fp) {
    if (!fp) return '';
    const parts = [
      'Geo:' + (GEO_TXT[(fp.geo || {}).mode] || '允许'),
      'CR:' + (fp.clientrects === 'on' ? '开' : '关'),
      'Canvas:' + (fp.canvas === 'noise' ? '噪声' : '真实'),
      'WebGL:' + (fp.webgl === 'noise' ? '噪声' : '真实'),
    ];
    if (fp.webglinfo !== 'real') parts.push('GPU:' + (VENDOR_SHORT[fp.webglvendor] || 'Intel'));
    return parts.join(' · ');
  }

  function setFpDisabled(dis) {
    $$('#gen-scroll button, #gen-scroll input, #gen-scroll select').forEach((el) => {
      el.disabled = dis;
    });
  }

  function openGenModal() {
    genReadonly = false;
    $('#gen-title').textContent = '新建环境';
    $('#gen-subtitle').textContent = '指纹配置将随人设永久锁定';
    $('#gen-ro-note').classList.add('hidden');
    $('#gen-actions-ro').classList.add('hidden');
    $('#gen-actions-edit').classList.remove('hidden');
    $('#gen-slot').value = '';
    $('#gen-err').textContent = '';
    setFpDisabled(false);
    resetFpForm();
    $('#modal-gen').classList.remove('hidden');
    $('#gen-slot').focus();
  }

  async function openEditModal(id) {
    try {
      const p = personasCache.find((x) => String(x.id) === String(id))
        || (await MOCK.getPersonas()).find((x) => String(x.id) === String(id));
      if (!p) { toast('环境不存在'); return; }
      genReadonly = true;
      $('#gen-title').textContent = '查看环境';
      $('#gen-subtitle').textContent = `${p.slot} · 指纹配置已随人设永久锁定`;
      $('#gen-ro-note').classList.remove('hidden');
      $('#gen-actions-edit').classList.add('hidden');
      $('#gen-actions-ro').classList.remove('hidden');
      $('#gen-slot').value = p.slot;
      $('#gen-err').textContent = '';
      applyFpToForm(p.fp);
      setFpDisabled(true);
      $('#modal-gen').classList.remove('hidden');
    } catch (e) {
      toast('加载环境失败：' + e.message);
    }
  }

  function closeGenModal() { $('#modal-gen').classList.add('hidden'); }

  async function submitGen(e) {
    e.preventDefault();
    if (genReadonly) return;
    const slot = $('#gen-slot').value.trim();
    if (!slot) { $('#gen-err').textContent = '请填写 slot 名'; return; }
    const btn = $('#gen-submit');
    btn.disabled = true; btn.textContent = '生成中…';
    try {
      await MOCK.generatePersona({ slot, fp: collectFp() });
      closeGenModal();
      toast(`环境「${slot}」已生成并锁定 🔒`, 'ok');
      renderEnv();
    } catch (err) {
      const msg = err.status === 409 ? '该 slot 已存在，请换一个名字' : '生成失败：' + err.message;
      $('#gen-err').textContent = msg;
      toast(msg);
    } finally {
      btn.disabled = false; btn.textContent = '确定';
    }
  }

  /* ---------- 批量操作 ---------- */
  async function bulkStart() {
    const ids = Array.from(envSelected);
    if (!ids.length) return;
    try {
      const r = await MOCK.bulkStart(ids);
      toast(`批量启动完成：启动 ${r.started} 个${r.skipped ? `，跳过 ${r.skipped} 个（已在运行）` : ''}`, 'ok');
      renderEnv();
    } catch (e) {
      toast('批量启动失败：' + e.message);
    }
  }

  async function bulkStop() {
    const ids = Array.from(envSelected);
    if (!ids.length) return;
    try {
      const r = await MOCK.bulkStop(ids);
      toast(`批量停止完成：停止 ${r.stopped} 个`, 'ok');
      renderEnv();
    } catch (e) {
      toast('批量停止失败：' + e.message);
    }
  }

  /* ============================================================
   * 代理管理页
   * ============================================================ */
  function proxyResultCard(r) {
    const q = !!r.qualified;
    const badge = r.direct
      ? '<span class="badge big">🌐 直连出口（本机）</span>'
      : `<span class="badge ${q ? 'ok' : 'bad'} big">${q ? '✅ 合格' : '⛔ 不合格'}</span>`;
    const place = [r.city, r.region].filter(Boolean).join(', ');
    return `
      <div class="proxy-result">
        <div>${badge}</div>
        <div class="pr-fields mono">
          <div><span>IP</span><b>${esc(r.ip || '–')}</b></div>
          <div><span>hostname</span><b>${esc(r.hostname || '–')}</b></div>
          <div><span>城市/地区</span><b>${esc(place || '–')}</b></div>
          <div><span>国家</span><b>${esc(r.country || '–')}</b></div>
          <div><span>org / ASN</span><b>${esc(r.org || r.isp || '–')}</b></div>
          <div><span>时区</span><b>${esc(r.timezone || '–')}</b></div>
          <div><span>连通延迟</span><b>${r.latency_ms != null ? esc(r.latency_ms) + ' ms' : '–'}</b></div>
        </div>
        <div class="pr-reason">${esc(r.reason || (r.direct ? '本地样例，未发起网络请求' : '符合美国消费宽带特征'))}</div>
      </div>`;
  }

  /* 直连检测：只展示内置样例，不发起任何网络请求 */
  async function checkDirect() {
    const btn = $('#px-direct-btn');
    btn.disabled = true; btn.textContent = '检测中…';
    const stopAnim = showChecking('直连检测（本地样例，无网络请求）', [
      '① 读取内置样例',
      '② 不访问外部网络',
      '③ 填入样例 IP / org / 地理位置',
    ]);
    try {
      await new Promise((r) => setTimeout(r, 300));
      $('#px-result').innerHTML = proxyResultCard({
        direct: true, latency_ms: null,
        ip: '203.0.113.10', hostname: 'example.local', city: 'Los Angeles', region: 'California',
        country: 'US', org: 'Example Org', timezone: 'America/Los_Angeles',
        reason: '本地样例，未发起网络请求',
      });
    } catch (err) {
      $('#px-result').innerHTML = emptyBox('直连样例展示失败：' + err.message);
      toast('直连样例展示失败：' + err.message);
    } finally {
      stopAnim();
      btn.disabled = false; btn.textContent = '🌐 直连检测（本地样例）';
    }
  }

  async function checkProxy(e) {
    e.preventDefault();
    const uri = $('#px-uri').value.trim();
    if (!uri) { toast('请先填写 proxy_uri'); return; }
    const btn = $('#px-btn');
    btn.disabled = true; btn.textContent = '验证中…';
    const stopAnim = showChecking('正在检测代理出口质量', [
      '① 读取内置轮换结果',
      '② 不访问外部网络',
      '③ 解析 org / ASN / 地理位置',
      '④ 匹配合格规则（美国消费宽带）',
    ]);
    try {
      const r = await MOCK.checkProxy({ proxy_uri: uri });
      $('#px-result').innerHTML = proxyResultCard(r);
      refreshProxyHistory();
    } catch (err) {
      $('#px-result').innerHTML = emptyBox('验证失败：' + err.message);
      toast('验证失败：' + err.message);
    } finally {
      stopAnim();
      btn.disabled = false; btn.textContent = '验证';
    }
  }

  async function refreshProxyHistory() {
    const box = $('#px-history');
    try {
      const list = await MOCK.getProxyHistory();
      if (!Array.isArray(list) || !list.length) {
        box.innerHTML = emptyBox('暂无检测记录');
        return;
      }
      const rows = list.slice(0, 20).map((h) => `
        <tr>
          <td class="mono">${fmtFull(h.checked_at)}</td>
          <td class="mono">${esc(h.proxy_uri || '–')}</td>
          <td class="mono">${esc(h.ip || '–')}</td>
          <td>${esc(h.country || '–')}</td>
          <td>${esc(h.org || h.isp || '–')}</td>
          <td><span class="badge ${h.qualified ? 'ok' : 'bad'}">${h.qualified ? '合格' : '不合格'}</span></td>
          <td class="muted">${esc(h.reason || '')}</td>
        </tr>`).join('');
      box.innerHTML = `<div class="tbl-scroll"><table class="tbl">
        <thead><tr><th>时间</th><th>代理</th><th>IP</th><th>国家</th><th>org / ASN</th><th>判定</th><th>原因</th></tr></thead>
        <tbody>${rows}</tbody></table></div>`;
    } catch (e) {
      box.innerHTML = emptyBox('历史记录加载失败：' + e.message);
      toast('历史记录加载失败：' + e.message);
    }
  }

  async function renderProxy() {
    refreshProxyHistory();
  }

  /* ============================================================
   * 路由（默认 #/env；#/ 与未知 hash 回落环境管理）
   * ============================================================ */
  const PAGES = {
    env:   { el: '#page-env',   title: '环境管理', nav: 'env',   init: renderEnv },
    proxy: { el: '#page-proxy', title: '代理管理', nav: 'proxy', init: renderProxy },
  };

  function route() {
    const key = location.hash.replace(/^#\/?/, '').split('?')[0].replace(/\/+$/, '');
    const page = PAGES[key] || PAGES.env;
    $$('.page').forEach((s) => s.classList.add('hidden'));
    $(page.el).classList.remove('hidden');
    $('#page-title').textContent = page.title;
    $$('#sb-nav a').forEach((a) => a.classList.toggle('active', a.getAttribute('data-route') === page.nav));
    page.init();
  }

  /* ============================================================
   * 事件绑定
   * ============================================================ */
  const demoToast = () => toast('原型演示：该功能未接入', 'info');

  document.addEventListener('click', (e) => {
    /* ⋮ 菜单开合 */
    const menuBtn = e.target.closest('[data-act="row-menu"]');
    const inMenu = e.target.closest('#row-menu');
    if (!menuBtn && !inMenu) hideRowMenu();

    /* 菜单项 */
    const menuItem = e.target.closest('[data-menu]');
    if (menuItem) { runMenuAction(menuItem.getAttribute('data-menu')); return; }

    /* 纯演示按钮（横幅/教程/铃铛/工具条描边按钮/齿轮等） */
    if (e.target.closest('[data-demo]')) { demoToast(); return; }

    /* 行/表头动作 */
    const btn = e.target.closest('[data-act]');
    if (btn) {
      const { act, id } = btn.dataset;
      if (act === 'chk-row') {
        if (btn.checked) envSelected.add(String(id));
        else envSelected.delete(String(id));
        syncChkAll();
        updateBulkBar();
      } else if (act === 'chk-all') {
        const on = btn.checked;
        lastVisibleIds.forEach((vid) => {
          if (on) envSelected.add(vid); else envSelected.delete(vid);
        });
        $$('.row-chk').forEach((c) => { c.checked = on; });
        updateBulkBar();
      } else if (act === 'toggle-star') {
        toggleStarRow(id);
      } else if (act === 'start-row') {
        startRow(id);
      } else if (act === 'stop-row') {
        stopRow(id);
      } else if (act === 'show-cmd') {
        showCmdModal(id);
      } else if (act === 'row-menu') {
        openRowMenu(btn, id);
      } else if (act === 'recheck-proxy') {
        recheckProxyRow(id, btn);
      } else if (act === 'edit-persona') {
        openEditModal(id);
      }
      return;
    }

    /* 表头排序 */
    const th = e.target.closest('th.sortable');
    if (th) {
      const key = th.getAttribute('data-sort');
      if (envSortKey === key) envSortDir = -envSortDir;
      else { envSortKey = key; envSortDir = 1; }
      renderEnvTable();
    }
  });

  function syncChkAll() {
    const all = $('#chk-all');
    if (!all) return;
    all.checked = lastVisibleIds.length > 0
      && lastVisibleIds.every((vid) => envSelected.has(vid));
  }

  /* 侧边栏折叠 */
  $('#sb-toggle').addEventListener('click', () => {
    const sb = $('#sidebar');
    sb.classList.toggle('sb-collapsed');
    $('#sb-toggle').textContent = sb.classList.contains('sb-collapsed') ? '>' : '<';
  });

  /* 页头 */
  $('#mock-badge').addEventListener('click', () => {
    toast('当前为纯 UI 原型（MOCK 模式）：所有数据为内存 mock，刷新页面即重置', 'info');
  });

  /* 工具条 */
  $('#env-search').addEventListener('input', (e) => {
    envSearchKw = e.target.value.trim().toLowerCase();
    renderEnvTable();
  });
  $('#tb-refresh').addEventListener('click', () => {
    renderEnv();
    toast('已刷新', 'ok');
  });

  /* 批量条 */
  $('#bulk-start').addEventListener('click', bulkStart);
  $('#bulk-stop').addEventListener('click', bulkStop);
  $('#bulk-clear').addEventListener('click', () => {
    envSelected.clear();
    renderEnvTable();
  });

  /* 新建环境 / 查看（指纹面板） */
  $('#btn-new-env').addEventListener('click', openGenModal);
  $('#gen-cancel').addEventListener('click', closeGenModal);
  $('#gen-ro-close').addEventListener('click', closeGenModal);
  $('#gen-form').addEventListener('submit', submitGen);
  $('#fp-rows').addEventListener('click', (e) => {
    const b = e.target.closest('.seg-btn');
    if (!b || b.disabled) return;
    fpState[b.dataset.key] = b.dataset.val;
    syncFpUI();
  });
  buildFpRows();

  /* 命令弹窗 */
  $('#cmd-close').addEventListener('click', () => $('#modal-cmd').classList.add('hidden'));
  $('#cmd-copy').addEventListener('click', async () => {
    const ok = await copyText($('#cmd-modal-pre').textContent);
    toast(ok ? '已复制到剪贴板' : '复制失败，请手动选择复制', ok ? 'ok' : 'error');
  });
  $('#cmd-proxy').addEventListener('input', updateCmdPre);
  $('#cmd-dice').addEventListener('click', () => {
    $('#cmd-proxy').value = MOCK.exampleProxyUri();
    updateCmdPre();
  });

  /* 代理管理页 🎲 示例 */
  $('#px-dice').addEventListener('click', () => {
    $('#px-uri').value = MOCK.exampleProxyUri();
  });

  /* 路径设置弹窗（localStorage 持久化） */
  function openSettingsModal() {
    const s = MOCK.getSettings();
    $('#set-exe').value = s.browser_exe;
    $('#set-dir').value = s.kit_dir;
    $('#set-tcp').value = s.jump_tcp;
    $('#set-token').value = s.jump_token;
    $('#set-attempts').value = s.jump_attempts;
    $('#set-wait').value = s.jump_wait_ms;
    $('#modal-settings').classList.remove('hidden');
  }
  $('#tb-settings').addEventListener('click', openSettingsModal);
  $('#set-close').addEventListener('click', () => $('#modal-settings').classList.add('hidden'));
  $('#set-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const cur = MOCK.getSettings(); // 当前有效值（默认 + 已存）
    MOCK.saveSettings({
      browser_exe: $('#set-exe').value.trim() || cur.browser_exe,
      kit_dir: $('#set-dir').value.trim() || cur.kit_dir,
      jump_tcp: $('#set-tcp').value.trim() || cur.jump_tcp,
      jump_token: $('#set-token').value.trim() || cur.jump_token,
      jump_attempts: $('#set-attempts').value.trim() || cur.jump_attempts,
      jump_wait_ms: $('#set-wait').value.trim() || cur.jump_wait_ms,
    });
    $('#modal-settings').classList.add('hidden');
    toast('路径设置已保存', 'ok');
    updateCmdPre(); // 若命令弹窗开着则实时刷新
  });

  /* 点遮罩 / Esc 关闭弹窗与菜单 */
  $$('.modal').forEach((m) => m.addEventListener('click', (e) => {
    if (e.target === m) m.classList.add('hidden');
  }));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeGenModal();
      $('#modal-cmd').classList.add('hidden');
      $('#modal-settings').classList.add('hidden');
      hideRowMenu();
    }
  });

  /* 代理管理页 */
  $('#px-form').addEventListener('submit', checkProxy);
  $('#px-direct-btn').addEventListener('click', checkDirect);

  window.addEventListener('hashchange', route);
  route();
})();
