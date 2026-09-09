# SaveSmith

开源**单机游戏存档修改器**（Tauri 2 + Vue 3）。不做内存修改或训练器，只改磁盘上的结构化存档。

当前版本 **0.1.0**（Windows x64 免安装）。第一期只内置 **Chaos Front / 混沌兵团**。游戏名称、商标与素材归 **ChaosGalaxyStudio** 及各权利人所有。

**下载：** [Releases](https://github.com/gundamff/SaveSmith/releases) · **English:** [README.en.md](README.en.md) · **变更：** [CHANGELOG.md](CHANGELOG.md)

## 重要声明

- **非官方。** 本工具与 ChaosGalaxyStudio、游戏发行方无关联、授权或合作，不暗示任何官方认可。
- **仅限单机。** 只供已购买正版的玩家在本地、离线环境学习研究。禁止用于联机、多人公平相关修改或任何商业用途。
- **先退出游戏再改档。** 应用内会提示；不会杀进程、不抢文件锁。游戏运行时改档可能导致损坏或写入失败。
- 修改前请自行备份。请用存档**副本**做试验，不要拿唯一真档当第一份测试对象。

权利人合理的下架或屏蔽请求，将配合处理对应游戏模块的发行与公开访问。

## 系统要求

- **Windows x64**（第一期只发 Windows，不承诺 macOS / Linux）
- **WebView2**：Win10 / Win11 通常已预装。若启动时报缺少 WebView2，请安装 [Microsoft Edge WebView2 Runtime](https://developer.microsoft.com/microsoft-edge/webview2/)（Evergreen），不要自行捆绑完整 Chromium。

## 下载与使用

1. 从 [Releases](https://github.com/gundamff/SaveSmith/releases) 下载 **免安装** `SaveSmith-0.1.0-windows-x64.exe`（或自行按下方命令打包），放到任意目录双击即可。不写注册表、不往 Program Files 拷文件。系统需已有 WebView2（见上）。
2. 若更习惯安装包，可用 `npm run dist:installer` 打 NSIS（`SaveSmith_*_x64-setup.exe`）。
3. **完全退出** Chaos Front，再打开 SaveSmith。
4. 游戏库应只看到 Chaos Front 一张卡片。可点「商店页」打开 Steam（AppID `2770330`）。
5. 自动探测失败时，点「选择存档目录」。选错目录会提示「此目录不是该游戏的存档」。
6. 载入槽位后，用「资源 / 星球 / 编队 / …」各页改档；一键拉满等按钮在对应页里，不跟 Tab 同级。点「保存」才会写盘；宿主会先备份再原子替换，每个被写入的文件保留最近 10 份备份（`backup/` 目录）。

默认存档位置（Windows）：

`%USERPROFILE%\AppData\LocalLow\ChaosGalaxyStudio\Chaos Front`

## 功能（0.1）

- 游戏库探测默认存档目录，支持手选；顶栏显示当前游戏、目录与槽位
- 混沌兵团：资源、星球、编队、机体、驾驶员、全解锁、图鉴
- 保存时备份到存档目录下 `backup/`（每文件最近 10 份），写盘失败不删活档
- 中英界面；封面使用 Steam 商店图，权利仍归发行方

## 架构

宿主（壳 + IO）与游戏模块同仓、编译期注册。模块不碰磁盘。说明见 [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)，贡献见 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 开发

需要 Node.js、Rust（cargo）以及 Windows 上的 MSVC 构建工具。

```powershell
npm install
npm test
npm run typecheck
npm run tauri dev
npm run dist
```

默认打 **免安装** 单文件：`src-tauri/target/release/savesmith.exe`（复制到别处也能跑）。需要安装包时用 `npm run dist:installer`，产物在 `src-tauri/target/release/bundle/nsis/`。

## 许可证

应用代码为 [MIT](LICENSE)，Copyright SaveSmith contributors。游戏本身的权利仍归各权利人。
