# fpconsole

浏览器实例管理台。Electron 壳 + Vue 3 渲染进程。本阶段只把工程跑起来：数据是内存 mock，不落盘，不启动浏览器，不打包，不访问网络。

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
  api/                    页面取数的唯一入口（env / proxy / settings）
  layouts/AppShell.vue    布局壳：侧栏、顶栏、内容区
  router/                 hash 路由
  stores/app.ts           Pinia 示例（名称和版本）
  theme/index.ts          唯一主题文件
  views/                  页面
legacy/                   旧原型，只留作参考
```

路由：

| hash         | 页面                                                                                        |
| ------------ | ------------------------------------------------------------------------------------------- |
| `#/env`      | 环境管理，默认页，占位                                                                      |
| `#/proxy`    | 代理管理，占位                                                                              |
| `#/settings` | 设置。目前只放链路探测：`api.getPersonas()`、`api.getSettings()`、`window.fp.getSettings()` |

主题用 Naive 默认深色。换主题只改 `src/renderer/src/theme/index.ts` 里的 `themeOverrides`（`GlobalThemeOverrides`）。布局以后会按设计规范重做，现在不要在这个壳上加视觉。

## 新增一个页面

1. 在 `src/renderer/src/views/` 加一个 `.vue` 文件。
2. 在 `src/renderer/src/router/index.ts` 的 `children` 加一条路由，写上 `name` 和 `meta.title`（顶栏用这个标题）。
3. 在 `src/renderer/src/layouts/AppShell.vue` 的 `nav` 数组加一项，`key` 与路由 `name` 相同。
4. 页面要数据时，只从 `src/renderer/src/api` 引入对应函数，例如：

```ts
import { getPersonas } from '../api';

const personas = await getPersonas();
```

不要在页面里 `fetch`，也不要自己造一套字段。类型都在 `api/env.ts`、`api/proxy.ts`、`api/settings.ts`。失败时抛 `ApiError`，用 `error.status` 区分（空 slot 是 400，重复 slot 或已在运行是 409，找不到是 404）。创建环境不接收指纹：`generatePersona({ slot })` 内部调用 `generateFingerprint()`，按旧原型里出现过的取值随机生成，以后接内部规则只替换这一个函数。

`window.fp` 是主进程能力：`launchBrowser(slot)`、`stopBrowser(slot)`、`getSettings()`、`saveSettings()`。类型在 `src/preload/fp.d.ts`。这四个方法现在也只返回内存假数据，不会启动浏览器。页面上的业务数据走 api，不要绕过 api 直接读主进程。

## 旧原型

`legacy/` 是原来的 Electron + 原生 JS 原型（`legacy/main.js` 加载 `legacy/web/index.html`）。其中「直连检测」以前会请求 ipinfo.io，现已改为本地样例，不再访问网络。
