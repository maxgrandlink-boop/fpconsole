# fpconsole

浏览器实例管理台。Electron 壳 + Vue 3 渲染进程。数据是内存 mock：不落盘，不启动浏览器，不打包，不访问网络。快速创建卡片和环境列表由业务页实现，这个仓库目前只放框架。

## 跑起来

```bash
npm install
npm run dev
```

其他检查：

```bash
npm run typecheck
npm run build
npm run lint
```

`npm run build` 只编译到 `out/`。预览构建结果用 `npm run preview`。

## 目录

```
src/main/                 主进程。window.fp 的 IPC，返回内存假数据
src/preload/              contextBridge。类型在 fp.d.ts
src/renderer/src/
  api/                    页面取数的唯一入口
  layouts/AppShell.vue    两栏壳：216px 侧栏 + 内容区
  router/                 hash 路由
  stores/app.ts           产品名和版本
  stores/theme.ts         深色 / 浅色，localStorage 键 fpconsole-theme
  theme/                  tokens.css、naive-theme.ts、index.ts
  views/                  页面。环境列表和代理页仍是空占位
legacy/                   旧原型，只留作参考
```

## 主题

默认深色。令牌在 `src/renderer/src/theme/tokens.css`（`:root` 深色，`[data-theme="light"]` 浅色）。Naive 的两套 `GlobalThemeOverrides` 在 `theme/naive-theme.ts`。页面不要另写颜色，用这些 CSS 变量。

切换走 Pinia `useThemeStore().setMode('dark' | 'light')`，并写入 `localStorage` 键 `fpconsole-theme`。启动时读取，读不到或值不是 `dark` / `light` 就用深色。`App.vue` 会同时改 `NConfigProvider`（深色带 `darkTheme`，浅色只覆盖 light overrides）和 `<html data-theme>`。系统设置页有这个开关。

## 布局和路由

侧栏不收起，宽度 `--sidebar`（216px）。顺序固定：

| hash             | 页面                         |
| ---------------- | ---------------------------- |
| `#/env`          | 浏览器环境，默认页，业务占位 |
| `#/members`      | 成员管理，即将推出           |
| `#/proxy`        | 代理管理，业务占位           |
| `#/env-settings` | 环境设置，即将推出           |
| `#/system`       | 系统设置，外观开关           |

`#/settings` 会转到 `#/system`。左下角网络状态来自 `getNetworkStatus()`。

新增导航项：在 `views/` 加页面，在 `router/index.ts` 注册，再往 `AppShell.vue` 的 `nav` 加一项，`name` 与路由 `name` 相同。

## 取数

页面只从 `src/renderer/src/api` 取数据，不要 `fetch`。失败抛 `ApiError`，用 `error.status` 区分。

创建环境不接收 slot，也不接收指纹：

```ts
const results = await generatePersona({
  country: '美国',
  region: '加利福尼亚州',
  count: 3,
  start_url: 'https://www.example.com',
});
```

`count` 是 1 到 10 的整数。slot 按地区前缀自动续号（已有 `us-la-slot2` 时得到 `slot3` 起）。每个环境各自 `generateFingerprint()`。代理由 `assignProxy(country, region)` 按国家 + 州省分配。某一条启动失败时该环境留下，`status` 为 `error`，其余照常；用 `retryStart(id)` 再启动这一条。

`window.fp`：`launchBrowser(slot)`、`stopBrowser(slot)`、`focusBrowser(slot)`、`getSettings()`、`saveSettings()`。已在运行时「打开」走 `focusBrowser`，它只返回假数据，不把窗口真的拉到前面。

## 旧原型

`legacy/` 是原来的 Electron + 原生 JS 原型。其中「直连检测」不再请求 ipinfo.io。
