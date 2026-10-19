# QOJ · CCPC 新榜单浏览器插件

实现用户提供的《CCPC 新榜单模式说明》（2026-09-14）。这是**题号隐藏与每队题目排序**的变化，题数、总罚时和队伍排名沿用 QOJ。

当前版本 **1.2.0**。2026-10-19 已在 Chrome 154、Edge 155、Firefox 153 中真实加载扩展，用模拟榜单验证实时更新、设置在刷新后的保留，以及封榜自动恢复原榜。真实 QOJ VP 在线验证仍未完成。

## 安装

| 浏览器（桌面版） | 安装包 | 安装入口 |
| --- | --- | --- |
| Chrome 111+ | [Chromium 版](https://github.com/zEeZ-1/ccpc-new-standings/raw/refs/heads/main/output/qoj-ccpc.zip) | `chrome://extensions` |
| Edge 111+ | 同上 | `edge://extensions` |
| Brave / Opera / Vivaldi | 同上，需支持 MV3 且 Chromium 内核为 111+ | 各自的扩展管理页（通常为 `chrome://extensions`，Opera 为 `opera://extensions`） |
| Firefox 140+ | [Firefox 版](https://github.com/zEeZ-1/ccpc-new-standings/raw/refs/heads/main/output/qoj-ccpc-firefox.zip) | `about:debugging#/runtime/this-firefox` |

Chromium 浏览器：下载并解压 Chromium 版，按以下步骤安装。

1. 打开上表中自己浏览器的扩展管理页。
2. 打开右上角“开发者模式”。
3. 点击“加载已解压的扩展程序”，选择本目录下的 **qoj-ccpc** 文件夹（其中有 manifest.json）。
4. 登录 QOJ，打开 `/contest/比赛编号/standings` 或 `/standings/external`，刷新页面。
5. 榜单上方出现“CCPC 新榜单”，勾选“启用新模式”即可。无需另填账号密码。

Firefox：解压 Firefox 版，在 `about:debugging#/runtime/this-firefox` 点击“临时载入附加组件”，选择解压后的 `qoj-ccpc/manifest.json`，然后打开或刷新 QOJ 榜单。这是未签名的开发包，重启 Firefox 后需重新临时载入；长期安装需 Mozilla 签名，当前没有提供已签名 XPI。若 Firefox 提示站点访问权限，请允许扩展在 QOJ 上运行。参见 [Mozilla 临时安装说明](https://extensionworkshop.com/documentation/develop/temporary-installation-in-firefox/)。

Brave、Opera、Vivaldi 共用 Chromium 包，尚未逐一实测。360、QQ 等浏览器需要兼容的新版 Chromium 内核与扩展加载功能，旧内核及兼容模式不保证可用。Safari 需要在 macOS 上转换和签名，当前没有 Safari 安装包；手机浏览器不在本次适配范围内。

更新已有安装时，替换对应浏览器的扩展目录，在扩展管理页重新加载，再刷新榜单。Firefox 版补充了 Gecko ID 和无数据传输声明，脚本与 Chromium 版共用。该配置依据 [Mozilla 清单文档](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/browser_specific_settings)；Edge 复用 Chromium 扩展的依据见 [Microsoft 文档](https://learn.microsoft.com/en-us/microsoft-edge/extensions/developer-guide/port-chrome-extension)。

支持 qoj.ac、其子域、contest.ucup.ac、jiang.ly、huang.lt、oj.qiuly.org 的相应榜单页面。只申请 `storage` 权限，用于在本机保存每场比赛的展示设置。

## 使用

- VP 时开启 **启用新模式**，直接使用 QOJ 页面当前比赛时刻的榜单数据计算、渲染。页面数据变化后自动重新计算，无需填写开始时间、比赛时长或队数。
- 取消勾选即可恢复原 QOJ 榜单；重新开启会使用最新页面数据。
- **自动恢复原榜**：读取页面 VP 卡片中的实时倒计时，剩余时间小于或等于一小时（包含已经到达封榜时才打开页面）时，自动显示原 QOJ 榜单，恢复原题号、列顺序和页面功能，开关保持启用。普通正在进行的比赛使用“Contest ends in”卡片倒计时。历史比赛的“Contest Ended”不会覆盖当前 VP 倒计时。无需填写时间。
- **公开题号阈值**：AC 队数达到 50 或 ⌊总队数 × 20%⌋，满足任一条件即公开题号，等价于 `min(50, ⌊总队数 × 20%⌋)`。例如 100 队时达到 20 队 AC 即公开，300 队时达到 50 队 AC 即公开。阈值自动计算，无需选择；初始无人 AC 时保持题号隐藏。
- 总队数与 AC 队数均按当前 QOJ 数据统计，包含其中的 VP / 打星队；插件搜索和翻页不会改变统计范围。

每队依次显示：已公开题目（原题号顺序）→ 匿名 AC 题（首次 AC 时间顺序）→ 匿名已提交未 AC 题（最后提交时间顺序）→ 从未提交题（原题号顺序）。相同时刻用原题号稳定排序，PDF 未规定同刻的进一步排序。

匿名单元格不保留提交链接、题号属性或题目专属的一血颜色；已公开题目可点击提交结果。它只是本机显示转换，原始数据仍在 QOJ 页面中，不能代替正式比赛的服务端保密措施。建议与其他改榜单的脚本分别使用。

## 已知范围

- 支持 QOJ ICPC 全分榜单；OI 和带部分分的 ICPC 榜单显示说明并保留原榜单。
- 使用 QOJ 的 `standings`、`score`、`problems`、`problems_id` 变量。`score` 单元格的时间单位是秒，包含 AC 时间或最后失败提交时间。若缺失必要时间，插件提示并保留原榜单，不猜测排序。
- 已 AC 后提交是否忽略、提交计数和罚时以 QOJ 的聚合数据为准。插件不额外抓取逐次提交日志，因此不能修正源平台不符合该规则的聚合结果。
- 插件只转换当前页面数据，每 1.5 秒检查一次数据和倒计时变化；不管理 VP 进度、回放或服务器刷新。自动恢复原榜是展示切换，提交数据是否封存仍由 QOJ 决定。
- 若榜单页面没有可识别的实时倒计时，插件会提示“未识别倒计时”，此时封榜需要手动关闭新模式。只读实时显示，不使用会过期的初始 `data-rest`，也不根据最近一次提交时间猜测比赛进度。实际登录后的 VP 倒计时结构尚待在线验证。
- 气球发放属于线下比赛流程，不在浏览器插件范围内。
- 登录后的真实 VP 页面**尚未完成在线验证**。已核对 QOJ 官方 `/js/uoj.js?v=2026.10` 的数据字段，并完成合成页面的浏览器集成测试。

## 开发验证

需要 Node.js 18 或更新版本。浏览器页面测试需要安装 Chrome 或 Edge；打包需要 Python 3，使用标准库，不需要额外的 Python 包。

```sh
npm install
npm test
npm run test:browser
npm run test:edge
npm run build
```

`npm test` 验证阈值、排序、提交时间和双浏览器清单，无需额外依赖。安装 Playwright 开发依赖后，`npm run test:browser` / `npm run test:edge` 使用已安装的 Chrome / Edge 验证页面行为；Edge 页面测试还覆盖仅提供 `browser.storage` 的环境。

`tests/browser.test.cjs` 使用 Playwright 和本机 Chrome / Edge 对合成 QOJ 页面测试，不接触个人浏览器资料、账号或网络；可以通过 `CCPC_PLAYWRIGHT_PATH` 和 `CCPC_CHROME_PATH` 指定安装位置。覆盖单开关、匿名链接、整榜阈值、分页、搜索、页面数据自动更新、最后一小时边界自动恢复原榜、打开时已封榜、VP 与历史比赛状态区分、倒计时缺失提示、旧设置迁移、QOJ DOM 重建以及不完整数据回退。

`npm run test:extension` 在临时 Chrome 配置中真实加载扩展，验证清单注入、跨上下文通信和真实设置保存；`node tests/extension.test.cjs msedge` 对 Edge 做相同验证。需要浏览器支持 CDP 的扩展调试接口，测试只操作自己的无界面配置。

Firefox 真实扩展测试：先运行 `python scripts/build.py`，设置 `CCPC_FIREFOX_BIN`（Firefox 可执行文件）和 `CCPC_GECKODRIVER`（Mozilla geckodriver 可执行文件），再运行 `npm run test:firefox`。它创建临时配置、临时安装 Firefox 包，并通过本地模拟榜单验证 Firefox 的页面 / 内容脚本隔离、`browser.storage` 持久化和封榜恢复。只有临时测试副本加入 localhost 匹配，发布包不包含此权限。

两种发布包由 `scripts/build.py` 从同一份脚本生成，输出目录为 `output/chromium/qoj-ccpc` 和 `output/firefox/qoj-ccpc`；压缩包为 `output/qoj-ccpc.zip`（Chromium，保留旧下载地址）及 `output/qoj-ccpc-firefox.zip`。安装解压后的扩展不需要 Node.js、Python 或第三方运行时。
