# fpconsole 设计产物

只包含设计规范与静态效果图，不改业务代码。阅读顺序：

1. [spec.md](spec.md) — 功能清单、设计令牌、组件状态、配置项交互、待确认问题
2. [naive-theme.ts](naive-theme.ts) — 可直接作为 Naive UI `GlobalThemeOverrides` 使用（深色默认，另附浅色）
3. [tokens.css](tokens.css) — 效果图使用的同一套 CSS 变量
4. [mockups/](mockups/) — 纯静态 HTML，无外部网络资源
5. [screenshots/](screenshots/) — 由上述 HTML 用无头浏览器截取

| 截图 | 内容 |
| --- | --- |
| `screenshots/main-1440.png` | 1440×900 主界面：左导航、中栏新建、右栏列表、筛选、批量条、运行中/已停止 |
| `screenshots/main-1280.png` | 同一主界面 1280×800，侧栏收成图标 |
| `screenshots/create-basic-1440.png` | 新建第 1 步：国家 / 州省级联展开、代理线路、启动网址、多开数量 |
| `screenshots/create-fingerprint-1440.png` | 新建第 2 步：指纹分段配置（旧版默认值） |
| `screenshots/modal-view-1440.png` | 查看环境弹窗：人设已锁定，控件只读 |
| `screenshots/loading-1440.png` | 列表骨架、代理检测中、生成中、行内「启动中」 |
| `screenshots/error-proxy-1440.png` | 代理页：连接失败，以及历史里的合格/不合格 |
| `screenshots/error-start-1440.png` | 启动被拒绝：toast「该环境已在运行」 |
| `screenshots/error-list-1440.png` | 环境列表加载失败与重试 |

字体文件（SIL OFL）在 `fonts/`，仅供效果图离线使用。
