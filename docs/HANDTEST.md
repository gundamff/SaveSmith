# SaveSmith v1 手测清单

在 **Windows x64** 上用 Chaos Front 存档的**副本**走完下列项。不要用唯一真档做第一次试验。测试前**完全退出游戏**。

默认真档目录（仅作复制来源，不要直接改）：

`%USERPROFILE%\AppData\LocalLow\ChaosGalaxyStudio\Chaos Front`

把整个目录复制到另一路径，在 SaveSmith 里手选该副本。开发构建：`npm run tauri dev`。安装包：`npm run tauri build` 后的 NSIS。

WebView2 说明写在 [README.md](../README.md) / [README.en.md](../README.en.md)（第 9 项）。Win10/11 通常已预装。

---

## 清单

### 1. 冷启动库页

- [ ] 只显示一张 Chaos Front 卡片
- [ ] 中文界面标题为「混乱前线」，切到 English 后为「Chaos Front」
- [ ] 卡片有封面图
- [ ] 「商店页」/ Store page 打开 `https://store.steampowered.com/app/2770330`（或同 AppID 的 Steam 商店页）

### 2. 存档目录探测与手选

- [ ] 真档在默认路径时，卡片显示「已找到存档目录」
- [ ] 探测失败时显示「未找到，请手动选择」，可用「选择存档目录」指向副本
- [ ] 选一个没有 `savedata*.cf` / `collection.cf` 的目录，弹出「此目录不是该游戏的存档」，且不能进入编辑

### 3. 资源拉满 + 宿主保存 + 备份

- [ ] 打开副本目录，载入一个非空槽位
- [ ] 动作条点「一键拉满（信用/威望/星级）」
- [ ] 点宿主「保存」
- [ ] 副本目录下的 `backup/` 出现对应主槽备份文件（时间戳 + 原文件名，如 `savedata0_*.bak`）

### 4. 深页改机体 + 脏标记 + 切槽确认

- [ ] 在「机体 / 飞船」页改一台机体（经验、删除或新增均可）
- [ ] 工具栏出现「未保存」脏标记
- [ ] 再点另一个槽位，弹出「有未保存的修改，确定离开？」
- [ ] 取消则仍停在当前槽；确定则切换且草稿丢弃

### 5. 图鉴拉满 + `collection.cf` 备份

- [ ] 动作条点「一键拉满（结局 + 收藏度）」（无 `collection.cf` 时该按钮禁用，换一份带图鉴的副本）
- [ ] 宿主保存
- [ ] `backup/` 中出现 `collection_*.bak`（或列表里 `relativePath` 为 `collection.cf` 的备份）

### 6. 还原备份

- [ ] 在备份面板选刚生成的一份备份，点「还原」，确认对话框后执行
- [ ] 界面数值与还原后的文件内容一致（再载入同一槽核对）
- [ ] 磁盘上目标文件与该备份字节一致（可用文件大小/时间或对比工具抽查）

### 7. 游戏本体读副本

- [ ] **不要**指向唯一真档。用游戏加载刚改过的**副本**（或把副本拷回一个可被游戏识别的测试目录）
- [ ] 游戏能读档，改过的资源/机体/图鉴与 SaveSmith 中一致，无崩溃

### 8. 关于页

- [ ] 「关于」免责声明含 **ChaosGalaxyStudio**
- [ ] 声明为非官方、仅限正版单机
- [ ] 当前 `DONATION_URL` 为空：没有「捐赠」按钮（`GITHUB_REPO_URL` 为空则同样无仓库按钮）

### 9. WebView2（文档）

- [ ] [README.md](../README.md) 与 [README.en.md](../README.en.md) 写明依赖 WebView2，Win10/11 通常已有，缺失时安装官方 Evergreen Runtime
- [ ] 本机已装 WebView2 时可启动应用；未装时按 README 引导，不捆绑完整 Chromium
