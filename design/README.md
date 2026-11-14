# fpconsole 设计产物

只包含设计规范与静态效果图，不改业务代码。右栏是上下两区：上面快速创建，下面环境列表。左栏是固定导航，不收起。

1. [spec.md](spec.md) — 功能清单、令牌、组件、配置项交互、待确认
2. [naive-theme.ts](naive-theme.ts) — Naive UI `GlobalThemeOverrides`（深色默认，另附浅色）
3. [tokens.css](tokens.css) — 效果图用的 CSS 变量
4. [mockups/](mockups/) — 纯静态 HTML，无外部网络资源
5. [screenshots/](screenshots/) — 1440×900 截图
6. [brand/v2/](brand/v2/README.md) — PANDA Browser 品牌候选（冰莓 / 海盐 / 青柠），待选定

| 截图 | 内容 |
| --- | --- |
| `screenshots/main.png` | 深色主界面。创建卡片含线路、国家和两个检测开关 |
| `screenshots/main-light.png` | 同一主界面的浅色皮肤 |
| `screenshots/modal-view-1440.png` | 查看环境，指纹是只读摘要 |
| `screenshots/loading-1440.png` | 「创建中…」和列表骨架 |
| `screenshots/error-list-1440.png` | 列表加载失败 |
| `screenshots/error-start-1440.png` | 启动失败：异常行可重试 |
| `screenshots/error-network-1440.png` | 左下「网络异常」 |
| `screenshots/error-proxy-1440.png` | 代理连接失败，历史里仍区分合格 / 不合格 |
| `screenshots/settings-theme-1440.png` | 系统设置里的深色 / 浅色开关 |

字体文件（SIL OFL）在 `fonts/`，只给效果图离线用。
