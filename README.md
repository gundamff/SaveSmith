# SaveSmith · 存档酱

[**中文**](README.md) | [English](README.en.md)

<p align="center">
  <a href="https://github.com/gundamff/SaveSmith/releases"><img alt="downloads" src="https://img.shields.io/github/downloads/gundamff/SaveSmith/total" /></a>
  <a href="https://github.com/gundamff/SaveSmith/releases"><img alt="version" src="https://img.shields.io/github/v/release/gundamff/SaveSmith" /></a>
  <a href="https://github.com/gundamff/SaveSmith/blob/main/LICENSE"><img alt="license" src="https://img.shields.io/github/license/gundamff/SaveSmith" /></a>
  <img alt="platform" src="https://img.shields.io/badge/platform-Windows-0078D4" />
</p>

<p align="center">
  <img src="docs/brand/banner.png" alt="存档酱" width="640" />
</p>

开源**单机游戏存档修改器**桌面应用（Tauri 2 + Vue 3）。只改磁盘上的结构化存档，**不做**内存修改或训练器。游戏以编译期模块接入，列表会随版本增加。

> **非官方工具。** 与各游戏官方无任何关联、授权或合作。仅供已购买正版的玩家在本地、单机环境下学习研究；请勿用于联机、商业用途或传播已修改的存档。

## 截图

| 游戏库 | 混沌兵团 · 编队 |
|:---:|:---:|
| ![游戏库](docs/screenshot/library.png) | ![编队](docs/screenshot/chaos-front-formation.png) |

| 混沌兵团 · 机体 | Wanderburg · 解锁 |
|:---:|:---:|
| ![机体](docs/screenshot/chaos-front-units.png) | ![解锁](docs/screenshot/wanderburg-unlock.png) |

## 宿主能力

- **游戏库**：列出已编译模块；自动探测存档目录，或手动选择；顶栏显示当前游戏、路径与槽位
- **中英界面**：默认跟随系统语言，可在标题栏切换；「关于」可查看版本与 GitHub
- **安全写盘**：备份 → 临时文件 → 原子替换；每文件保留最近 10 份备份，可还原；解析失败拒绝写入；Windows 上覆盖失败时不删除活档

各游戏能改什么、默认路径与注意事项，见下表链接的文档（勿在本 README 展开逐游戏细节）。

## 支持的游戏

| 游戏 | 权利人 | 状态 | 详情 |
|------|--------|------|------|
| [混沌兵团 / Chaos Front](docs/games/chaos-front.md) | ChaosGalaxyStudio | 已支持 | [中文](docs/games/chaos-front.md) · [English](docs/games/chaos-front.en.md) |
| [混沌银河 2 / Chaos Galaxy 2](docs/games/chaos-galaxy-2.md) | ChaosGalaxyStudio | 已支持 | [中文](docs/games/chaos-galaxy-2.md) · [English](docs/games/chaos-galaxy-2.en.md) |
| [Wanderburg](docs/games/wanderburg.md) | Randwerk | 已支持（EA，格式可能变） | [中文](docs/games/wanderburg.md) · [English](docs/games/wanderburg.en.md) |
| [泰拉瑞亚 / Terraria](docs/games/terraria.md) | Re-Logic | 已支持（原版 .plr） | [中文](docs/games/terraria.md) · [English](docs/games/terraria.en.md) |
| [龙之剑：觉醒 / DragonSword: Awakening](docs/games/dragon-sword.md) | HOUND13 | 已支持（单机；请关 Steam Cloud） | [中文](docs/games/dragon-sword.md) · [English](docs/games/dragon-sword.en.md) |
| [Eslabong](docs/games/eslabong.md) | shirowita | 已支持（EA，格式可能变） | [中文](docs/games/eslabong.md) · [English](docs/games/eslabong.en.md) |

新增游戏时：补模块 + 在本表加一行 + 在 `docs/games/` 写独立说明。

## 下载

前往 [Releases](../../releases) 下载最新的便携版 exe（无需安装，双击即用）：

- `SaveSmith-<版本号>-windows-x64.exe` — Windows x64 便携版

需要 **Windows x64** 与系统 **WebView2**（Win10 / 11 通常已有）。若启动提示缺少 WebView2，请安装 [Microsoft Edge WebView2 Runtime](https://developer.microsoft.com/microsoft-edge/webview2/)（Evergreen），不要自行捆绑完整 Chromium。

## 使用方法

1. **完全退出**要改的游戏（退出时可能覆写存档）
2. 启动 SaveSmith → 在游戏库打开对应游戏；找不到目录时点「选择存档目录」
3. 左侧选槽位并载入 → 在标签页修改 → 「保存」
4. 需要时在备份列表「还原」（会先备份当前文件）
5. 第一次请用存档**副本**试验

默认存档路径、可编辑字段与游戏特定风险见各游戏文档。更新说明：[CHANGELOG.md](CHANGELOG.md)（[English](CHANGELOG.en.md)）。

## 开发者构建

环境：Node.js 20+、npm、Rust（`cargo`）、Windows 上的 MSVC 构建工具。打包目标为 win x64。

```bash
npm install
npm test
npm run typecheck
npm run tauri dev
npm run dist
```

`npm run dist` 产出 `src-tauri/target/release/SaveSmith-<版本>-windows-x64.exe`。可选安装包：`npm run dist:installer`。

- 架构：[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- 贡献：[CONTRIBUTING.md](CONTRIBUTING.md)
- 发版：[docs/RELEASE.md](docs/RELEASE.md)
- 某游戏的数据提取等开发细节：见该游戏文档（如 [混沌兵团](docs/games/chaos-front.md#开发者素材提取)）

## 免责声明

1. **非官方、无授权**：第三方爱好者工具，**并非**各游戏开发商/发行商或其关联方开发、赞助、认可或附属产品。
2. **版权归属**：各游戏的名称、商标、角色、素材、数据与文本等知识产权归**对应权利人**所有。本仓库中的展示性素材仅供**已购买正版的用户**本地学习参考，**不附带游戏本体**，亦不得用于商业用途。
3. **使用范围**：仅限个人、本地、**单机**学习与技术研究。禁止用于联机对战、破坏多人公平、出租/出售、捆绑分发或其他商业/侵权场景。
4. **风险自担**：修改存档可能导致进度异常、损坏或无法加载。请先退出游戏并依赖自动备份或自行备份。**使用即表示自愿承担全部风险**；开发者与贡献者不承担法律责任。
5. **下架配合**：权利人提出合理要求时，维护者核实后将配合修改、屏蔽或下架相关模块/发行包。
6. **请支持正版**：通过官方渠道购买并游玩；本工具不能替代正版，也不鼓励盗版。

## 许可证

[MIT](LICENSE)
