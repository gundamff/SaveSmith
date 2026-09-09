# SaveSmith v1 手测清单

在 **Windows x64** 上用 Chaos Front 存档的**副本**走完下列项。不要用唯一真档做第一次试验。测试前**完全退出游戏**。

默认真档目录（仅作复制来源，不要直接改）：

`%USERPROFILE%\AppData\LocalLow\ChaosGalaxyStudio\Chaos Front`

把整个目录复制到另一路径，在 SaveSmith 里手选该副本。开发构建：`npm run tauri dev`。免安装：`npm run dist` 后的 `src-tauri/target/release/savesmith.exe`。安装包（可选）：`npm run dist:installer` 后的 NSIS。

WebView2 说明写在 [README.md](../README.md) / [README.en.md](../README.en.md)（第 9 项）。Win10/11 通常已预装。

---

## 清单

### 1. 冷启动库页

- [ ] 只显示一张 Chaos Front 卡片
- [ ] 中文界面标题为「混沌兵团」，切到 English 后为「Chaos Front」
- [ ] 卡片有封面图
- [ ] 「商店页」/ Store page 打开 `https://store.steampowered.com/app/2770330`（或同 AppID 的 Steam 商店页）

### 2. 存档目录探测与手选

- [ ] 真档在默认路径时，卡片显示「已找到存档目录」
- [ ] 探测失败时显示「未找到，请手动选择」，可用「选择存档目录」指向副本
- [ ] 选一个没有 `savedata*.cf` / `collection.cf` 的目录，弹出「此目录不是该游戏的存档」，且不能进入编辑

### 3. 资源拉满 + 宿主保存 + 备份

- [ ] 打开副本目录后，顶栏显示游戏名「混沌兵团」和完整存档目录；载入槽位后显示当前槽位标题
- [ ] 在「资源」页点「一键拉满（信用/威望/星级）」
- [ ] 点宿主「保存」
- [ ] 副本目录下的 `backup/` 出现对应主槽备份文件（时间戳 + 原文件名，如 `savedata0_*.bak`）

### 4. 深页改机体 + 脏标记 + 切槽确认

- [ ] 在「机体 / 飞船」页改一台机体（经验、删除或新增均可）
- [ ] 工具栏出现「未保存」脏标记
- [ ] 再点另一个槽位，弹出「有未保存的修改，确定离开？」
- [ ] 取消则仍停在当前槽；确定则切换且草稿丢弃

### 5. 图鉴拉满 + `collection.cf` 备份

- [ ] 在「图鉴」页点「一键拉满（结局 + 收藏度）」（无 `collection.cf` 时该页没有内容，换一份带图鉴的副本）
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
- [ ] 当前 `DONATION_URL` 为空：没有「捐赠」按钮；`GITHUB_REPO_URL` 有值：有「GitHub 仓库」按钮

### 9. WebView2（文档）

- [ ] [README.md](../README.md) 与 [README.en.md](../README.en.md) 写明依赖 WebView2，Win10/11 通常已有，缺失时安装官方 Evergreen Runtime
- [ ] 本机已装 WebView2 时可启动应用；未装时按 README 引导，不捆绑完整 Chromium

---

## Wanderburg 手测

**警告：** 修改前**完全退出游戏**（退出时可能覆写存档）。Wanderburg 处于 Early Access，存档格式与密钥可能随更新变更；改档能力以当前密钥与往返测试通过为前提，不保证未来版本兼容。请用存档**副本**试验，不要用唯一真档。

默认真档目录（仅作复制来源）：

`%USERPROFILE%\AppData\LocalLow\Randwerk\Wanderburg`

槽位文件：`Saves/Playtest/Generation_*/SaveData.json`（嵌套 Generation 目录，每代一个 `SaveData.json`）。**不要**编辑 `SaveData.backup.json`（不在 `sessionFiles` 内）。

加密说明：游戏使用 `SaveLoad.StringCipher`（Rijndael-256-CBC + PBKDF2-SHA1），**不是** Feel MM JsonEncrypted；Task 3 的 Feel 默认假设已证伪，密钥已从 IL2CPP `SaveLoad.EncryptionKey` 实证破解（`scripts/wanderburg-try-key.mjs` 可复验）。

### W1. 库页与探测

- [ ] 游戏库显示 **Wanderburg** 卡片（中英名称一致为 Wanderburg）
- [ ] 真档在默认路径时显示「已找到存档目录」
- [ ] 选无 `Saves` 子目录的路径，弹出「此目录不是该游戏的存档」
- [ ] 「商店页」打开 Steam AppID **3624140**

### W2. 列槽与解密

- [ ] 打开副本目录后，左侧列出 `Generation 0001`、`Generation 0002` …（按编号排序）
- [ ] 载入槽位后顶栏显示当前槽位标题；不可读槽位显示「无法读取」
- [ ] 若密钥失效或文件损坏，载入失败并提示「无法解密 Wanderburg 存档…」（`DECRYPT_FAILED`）

### W3. 资源页

- [ ] 「资源」Tab 标签在中/英界面正确显示（非 raw `wb.tabs.resources`）
- [ ] 列表含 **`silver`**（当前银币）及 **`silverBeforeLastRun`**（若存档中存在）
- [ ] 修改数值后工具栏出现「未保存」；宿主「保存」后 `backup/` 出现对应 `SaveData.json` 时间戳备份

### W4. 解锁页

- [ ] 「解锁」Tab 列出 `unlockedIDs` 中的条目（勾选 = 已解锁）
- [ ] 勾选/取消勾选后保存；重新载入同一槽，勾选状态与修改一致
- [ ] 无友好名时显示数字 ID（`unlock-names.json` 可后续补全）

### W5. 宿主保存与备份

- [ ] 保存前自动备份；覆盖写盘失败时不删除活档（与 Chaos Front 相同原子写策略）
- [ ] 备份面板可还原刚生成的备份，还原后界面数值与文件一致

### W6. 游戏本体读档（Task 4 Step 5）

- [ ] **完全退出 Wanderburg** 后，用 SaveSmith 修改副本中的某 `Generation_*/SaveData.json` 并保存
- [ ] 启动游戏，加载**同一 Generation** 对应进度
- [ ] 游戏能正常读档，修改过的 **silver** / 解锁项与 SaveSmith 中一致，无崩溃或拒档
- [ ] 若游戏拒档或数值未生效，记录游戏版本与 `saveVersion`，勿当作已通过

### W7. 错误密钥（可选）

- [ ] 临时将 `src/games/wanderburg/crypto/keys.ts` 中 `MM_KEY` 改为错误值，重建后载入真档应失败并显示解密错误（测完还原密钥）
