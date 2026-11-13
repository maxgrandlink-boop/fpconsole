# mock-notes — 纯 UI 原型说明（MOCK 模式）

本前端为**纯 UI 原型**：不对接任何真实后端，`mock.js` 用一个内存状态 Store + 假异步函数（100~400ms 随机延迟）模拟原 API 契约的全部操作。**不发起任何网络请求**；内存数据**刷新页面即重置**（唯一例外：「路径设置」存 localStorage，持久保留）。右上角黄色「⚡ MOCK」徽标提示这是原型，点击徽标弹说明 toast。

## 如何打开

- 静态服务器（当前预览）：`http://127.0.0.1:8642/`（`python -m http.server 8642` 于 web 目录）。
- 直接双击 `index.html`（file://）也可完整工作，无任何跨域请求。
- hash 路由：`#/env`（默认，环境管理）、`#/proxy`（代理管理）、`#/ref`（参考）；`#/` 与未知 hash 回落环境管理。

## mock 行为摘要

| 操作 | 行为 |
| --- | --- |
| 预置环境 | `us-la-slot1`（Chrome/155、1920×1080、LA、used=2、📌置顶、★星标、静态代理/美国-洛杉矶/合格✓）、`us-la-slot2`（Chrome/153、2560×1440、LA、used=0、直连/美国-纽约/不合格✗） |
| ＋新建环境 | 弹窗含「基本信息（slot + 生成即锁定提示）」与「指纹配置」面板（语言/时区/地理位置/屏幕分辨率/字体/ClientRects/WebRTC/Canvas/WebGL/WebGL Info/WebGL厂商 分段按钮组，默认=带 * 状态；自定义联动显示输入/下拉/浅蓝单选条）；确定后全部 fp 设置存入 persona 记录；时区=基于IP生成 → America/Los_Angeles，语言=基于IP生成 → en-US；slot 重复 → 409 → 弹窗内联红字 + toast；成功新行立即出现（🔒已锁定、used=0、代理未检测、smartproxy 随机城市 URI） |
| ✏️ 查看 | 打开同一弹窗的只读版（全部控件 disabled、黄色「🔒 人设已锁定，仅查看」提示、底部仅 [关闭]），回显该人设指纹配置 |
| 人设摘要 | 表格「人设」列第三行浅灰小字：`Geo:允许 · CR:关 · Canvas:真实 · WebGL:噪声`（WebGL Info=自定义时追加 `· GPU:Intel` 等） |
| 行删除（⋮ 菜单） | used>0 → 409 → toast「该环境已被使用，不可删除」；used=0 → confirm 后删除 |
| 导出配置（⋮ 菜单） | 内存人设即时生成 JSON，Blob 下载 `<slot>.fpconsole.json` |
| 行内 🔄 重新检测 | 走三种轮换结果（Charter ✅ / Datacamp 新加坡 ⛔ / AT&T 商务线 ⛔），更新该行 IP/地区/判定/时间 |
| ▶ 启动 / ⏹ 停止 | 行级启动用该行 proxy.uri 真实拼装命令；运行行淡绿底+左侧绿边+状态灯+橙色停止按钮；假 pid 从 12040 递增；used+1、累计启动+1 |
| 全选/批量 | 勾选后底部浮动条「已选 N 项｜批量启动｜批量停止｜取消选择」；已在运行的启动时跳过并提示 |
| 星标 / ✏️编辑 | 星标 ☆↔★ 行内即时切换；编辑为原型演示 toast |
| 搜索 / 排序 | 关键词实时过滤（slot/名称/IP/地区/UA 等）；序号、创建时间表头点击排序 ↑↓；📌置顶行恒在最上 |
| 代理管理页 | 验证表单（🎲示例 填入 smartproxy URI）+ 三种判定轮换 + 历史 20 条（URI 打码只显 host）；行内 🔄 与页面验证共享同一轮换序列 |
| 工具条 | 分组管理/批量导入/标签管理/筛选/全部分组 → 「原型演示」toast；🔄 刷新重渲染；⚙️ 打开路径设置 |

## 启动命令拼装（真实产品模板，客户端唯一权威逻辑 `MOCK.assembleCommand`）

- 路径设置（⚙️，localStorage 键 `fpconsole-path-settings`）默认值：
  - `browser_exe` = `D:\fpconsole-kit\browser\chrome.exe`
  - `kit_dir` = `D:\fpconsole-kit`
  - `jump_tcp` = `10.0.0.1:443`，`jump_token` = `demo-token`，`attempts` = `450`，`wait_ms` = `900000`
- 拼装顺序：`"browser_exe" --fp-env=<slot> --fp-config="<kit_dir>\persona-<slot>.json" --user-data-dir="<kit_dir>\profile-<slot>" --no-first-run --no-default-browser-check --ignore-gpu-blocklist --fp-canvas-replay-file="<kit_dir>\table-emoji.json" --proxy-server=<proxy_uri> --proxy-bypass-list=10.0.0.2 --fp-jump-tcp=… --fp-jump-token=… --fp-jump-decision=Real --fp-jump-max-attempts=… --fp-jump-max-wait-ms=… --fp-jump-proxy=socks5://<同 proxy 的 user:pass@host:port> --flag-switches-begin --flag-switches-end --file-url-path-alias="/gen=<browser_exe 目录>\gen"`
- 命令弹窗内 proxy_uri 可编辑（预填该行代理），🎲 填入 `http://client-demo_area-us_city-{losangeles|newyork|chicago}_life-120_session-{10位随机}:demo-pass@proxy.example.com:9000`，修改实时重拼命令。
- 无 swiftshader 参数；无任何 `--remote-debugging-port`；值含空格一律加英文双引号。

## 联调注意（若未来接真后端）

- 页面代码只依赖 `window.MOCK` 的异步方法与 `assembleCommand/getSettings/saveSettings/exampleProxyUri`。换真实 fetch 时实现同名方法即可平滑切换；错误对象需带 `status` 字段（如 409）以触发对应文案。
