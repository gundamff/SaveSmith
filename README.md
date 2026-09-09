# SaveSmith

[**中文**](README.md) | [English](README.en.md)

开源**单机游戏存档修改器**桌面应用（Tauri 2 + Vue 3）。不做内存修改或训练器，只改磁盘上的结构化存档。当前内置 **《Chaos Front》（混沌兵团）** 与 **Wanderburg** 两款游戏。

> **非官方工具。** 与各游戏官方无任何关联、授权或合作。仅供已购买正版的玩家在本地、单机环境下学习研究；请勿用于联机、商业用途或传播已修改的存档。

## 功能

- **游戏库**：列出已编译的游戏；自动探测存档目录，支持手动选择；顶栏显示当前游戏、存档路径与槽位
- **界面语言**：中文 / English，默认跟随系统语言，可在标题栏切换；「关于」可查看版本与 GitHub 地址
- **混沌兵团 · 存档**：列出 6 个槽位（军团名、保存时间），载入后编辑；保存前自动备份（每文件最近 10 份），备份面板可还原
- **资源**：信用点、威望、星级、勋章与势力关系
- **星球**：经济 / 工业 / 防御 / 稳定与所属势力
- **编队**：4×6 网格上阵 / 下阵 / 换位，并分配驾驶员
- **机体 / 飞船**：等级、经验、装备；支持添加 / 删除
- **驾驶员**：等级、经验等
- **全解锁**：解锁机型与装备
- **图鉴**：点亮结局与收藏（`collection.cf`）
- **Wanderburg · 存档**：按 `Generation_*/SaveData.json` 列出代际槽位；**资源**（如 `silver`、`silverBeforeLastRun`）；**解锁**（`unlockedIDs` 勾选）。存档为 `SaveLoad.StringCipher` 加密 JSON；改档能力以当前密钥与往返测试通过为前提（Early Access 格式可能变更）

所有修改均遵循「备份 → 临时文件 → 原子替换」。Windows 上覆盖失败时不删除活档。解析失败的存档拒绝写入。

## 下载

前往 [Releases](../../releases) 下载最新的便携版 exe（无需安装，双击即用）：

- `SaveSmith-<版本号>-windows-x64.exe` — Windows x64 便携版

需要 **Windows x64** 与系统 **WebView2**（Win10 / 11 通常已有）。若启动提示缺少 WebView2，请安装 [Microsoft Edge WebView2 Runtime](https://developer.microsoft.com/microsoft-edge/webview2/)（Evergreen），不要自行捆绑完整 Chromium。

## 使用方法

1. **退出游戏**：修改前请务必完全退出游戏（游戏退出时可能覆写存档）
2. 启动 SaveSmith。打开「混沌兵团」；若未找到存档目录，点「选择存档目录」
3. 默认存档位置：`%USERPROFILE%\AppData\LocalLow\ChaosGalaxyStudio\Chaos Front`
4. 在左侧选中槽位并载入，在对应标签页修改，点「保存」
5. 每次保存都会在存档目录的 `backup/` 下生成带时间戳的备份（如 `savedata0_20260907_120000.cf.bak`），自动保留最近 10 份
6. **还原备份**：编辑页备份列表中可「还原」（会先备份当前文件）
7. 请用存档**副本**做试验，不要拿唯一真档当第一次测试对象
8. **Wanderburg**：默认 `%USERPROFILE%\AppData\LocalLow\Randwerk\Wanderburg`；槽位为 `Saves/Playtest/Generation_*/SaveData.json`。修改前务必退出游戏；EA 阶段格式可能变更
9. 更新说明见 [CHANGELOG.md](CHANGELOG.md)（[English](CHANGELOG.en.md)）；发行包见 [Releases](../../releases)

## 开发者构建

环境：Node.js 20+、npm、Rust（`cargo`）、Windows 上的 MSVC 构建工具。打包目标为 win x64。

```bash
npm install
npm test
npm run typecheck
npm run tauri dev
npm run dist
```

`npm run dist` 产出 `src-tauri/target/release/savesmith.exe`（复制即可用）。可选安装包：`npm run dist:installer`。

架构见 [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)，贡献见 [CONTRIBUTING.md](CONTRIBUTING.md)，维护者发版见 [docs/RELEASE.md](docs/RELEASE.md)。

## 素材提取脚本

机体列表、等级表、名称与图标等由提取脚本从游戏文件生成（产物在 `src/games/chaos-front/data/game-data.json` 与 `src/games/chaos-front/assets/game/`）。

**需要自备**：游戏本体（含 `Chaos Front_Data`）与 [AssetRipper](https://github.com/AssetRipper/AssetRipper)（GUI 免费版即可）。

```bash
node scripts/extract-game-data.mjs --game "游戏目录\Chaos Front_Data" --ripper "C:\tools\AssetRipper.GUI.Free.exe" --out .
```

- `--game`（必填）：`Chaos Front_Data` 目录
- `--ripper`：AssetRipper 可执行文件；省略时仅提取数据表
- `--out`：仓库根，默认当前目录
- `--export <dir>`：复用已有 AssetRipper 导出目录

## 免责声明

1. **非官方、无授权**：本项目为第三方爱好者工具，**并非** ChaosGalaxyStudio 或其关联方开发、赞助、认可或附属产品；开发者与游戏官方**无任何隶属、代理或合作关系**。
2. **版权归属**：游戏《Chaos Front》（混沌兵团）及其名称、商标、角色、机体、图标、头像、数据表、音频、文本等一切素材与知识产权，均归 **ChaosGalaxyStudio** 及相关权利人所有。本仓库中的展示性素材仅供**已购买正版游戏的用户**在本地学习参考，**不附带游戏本体**，亦不得用于商业用途。
3. **使用范围**：仅限个人、本地、**单机**学习与技术研究。禁止将本工具或经其修改的存档用于联机对战、破坏多人公平、出租/出售、捆绑分发或其他任何商业或侵权场景。
4. **风险自担**：修改存档可能导致进度异常、存档损坏、游戏无法加载或需重装等后果。请务必在修改前完全退出游戏，并依赖本工具自动备份或自行另行备份。**使用本工具即表示你自愿承担全部风险**；由此产生的任何直接或间接损失，开发者与贡献者不承担法律责任。
5. **下架配合**：若权利人认为本项目存在侵权或其他不当内容并提出合理要求，维护者将在核实后配合修改、屏蔽相关内容或下架发行包/仓库公开访问。
6. **请支持正版**：请通过官方渠道购买并游玩《Chaos Front》。本工具不能替代正版游戏，也不鼓励任何盗版行为。

## 许可证

[MIT](LICENSE)
