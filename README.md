# SaveSmith

开源**单机游戏存档修改器**（Tauri 2 + Vue 3）。不做内存修改或训练器，只改磁盘上的结构化存档。

第一期只内置 **Chaos Front / 混乱前线**。游戏名称、商标与素材归 **ChaosGalaxyStudio** 及各权利人所有。

**English:** [README.en.md](README.en.md)

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

1. 从本仓库 Releases 下载 Windows x64 安装包（NSIS），或自行按下方命令打包。
2. **完全退出** Chaos Front，再打开 SaveSmith。
3. 游戏库应只看到 Chaos Front 一张卡片。可点「商店页」打开 Steam（AppID `2770330`）。
4. 自动探测失败时，点「选择存档目录」。选错目录会提示「此目录不是该游戏的存档」。
5. 载入槽位后，可用动作条做一键修改，或打开深编辑页改机体 / 图鉴等。点「保存」才会写盘；宿主会先备份再原子替换，每个被写入的文件保留最近 10 份备份（`backup/` 目录）。

默认存档位置（Windows）：

`%USERPROFILE%\AppData\LocalLow\ChaosGalaxyStudio\Chaos Front`

## 开发

需要 Node.js、Rust（cargo）以及 Windows 上的 MSVC 构建工具。

```powershell
npm install
npm test
npm run typecheck
npm run tauri dev
npm run tauri build
```

`npm run tauri build` 产出 Windows x64 NSIS 安装包，位于 `src-tauri/target/release/bundle/`。

## 许可证

应用代码为 [MIT](LICENSE)，Copyright SaveSmith contributors。游戏本身的权利仍归各权利人。
