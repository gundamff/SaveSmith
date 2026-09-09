# SaveSmith 品牌与游戏库首页（存档酱）

日期：2026-09-09  
状态：设计已确认，待用户审阅本规格后写实现计划  
路径：标准通道 / 范围 B（中等）

## 1. 背景与目标

当前宿主顶栏仅显示英文 `SaveSmith`，无 logo；游戏库页大面积死黑、卡片偏平；Wanderburg 封面为 `WB` 占位 SVG。用户要求：

1. 标题增加中文名 **存档酱**
2. 二次元 logo + 人设
3. 首页中等改版；补齐 Wanderburg 游戏封面

**不做**：编辑页内部 Tab/表单体系重做；全身立绘主导首页；更改安装包目录/`productName` 文件系统名（仍为 SaveSmith，避免破坏路径与既有发布约定）。

## 2. 已锁定的决策

| 项 | 选择 |
|----|------|
| 改版强度 | **B 中等**：顶栏品牌 + 库页氛围/卡片，编辑页布局不动 |
| 中文名 | **存档酱** |
| Logo / 人设方案 | **头像标 + 人设文案**（非纯抽象图标、非全身立绘首页） |
| Wanderburg 封面 | Steam 胶囊图写入模块 `cover.jpg`，替换占位 SVG |
| 示意工具 | 用户拒绝 Visual Companion；实现时直接生成/落地资产 |

## 3. 品牌与人设

### 3.1 命名

| 键 | 值 |
|----|-----|
| 英文产品名 | `SaveSmith`（`config` / Tauri `productName` / 窗口英文主体） |
| 中文品牌名 | `存档酱` |
| 顶栏展示（zh） | logo + `SaveSmith` + 副标 `存档酱` |
| 顶栏展示（en） | logo + `SaveSmith`；可选极小副标 `Cundang-chan` **或省略中文**（实现取：**en 不显示中文副标**，避免英文界面夹汉字） |
| 关于页 | 主名按 locale；zh 显示「SaveSmith · 存档酱」 |
| `document.title` | 库页：`SaveSmith · 存档酱`（zh）/ `SaveSmith`（en）；进游戏后仍为 `{游戏名} — SaveSmith`（可附带中文品牌于关于，不强制塞进标题） |

配置面：在 `src/host/config.ts` 增加 `APP_NAME_ZH = '存档酱'`（或 i18n key `app.brandZh`），避免散落魔法字符串。

### 3.2 人设（资产与文案约束）

- **称呼**：存档酱  
- **外观**：短发二次元少女；轻工装/小外套；胸前小扳手或 U 盘挂件；表情轻松，偏「工具娘」非战斗娘  
- **性格一句话**：帮你把存档敲成想要的样子；改前先提醒退出游戏  
- **视觉资产**：
  - UI 用 **圆形头像 logo**（建议透明底 PNG 或 SVG；顶栏约 28–36px）
  - 可选：同人设用于关于页略大头像（同一文件缩放）
  - **不**做首页全幅立绘英雄区
- **生成方式**：实现阶段用图像生成得到一张头像，落入 `src/host/assets/brand/`（或 `public/`），并视需要导出/替换 Tauri `icons/*`（若时间紧：**先做应用内 logo**，系统托盘/exe 图标可同任务内尽量同步，失败则记 follow-up，不阻断库页交付）

## 4. 首页与壳层 UX

### 4.1 顶栏（`App.vue`）

- 左侧：圆形 logo + 品牌文字行（见 3.1）
- 进入游戏后：品牌行仍保留；游戏名/路径/槽位信息布局可微调节奏，**不**改为第二套视觉体系
- 导航按钮样式可轻微统一（圆角、边框对比），不引入新组件库

### 4.2 游戏库（`LibraryPage.vue` + `GameCard.vue`）

- 背景：深色底 + 轻径向光或细网格纹理，去掉「一片死黑」感；避免紫粉霓虹默认 AI 风
- 「游戏库」为分区标题，字重/字号提升，可附一行短副文案（i18n）：如「选择一款游戏，开始改档」
- 卡片：
  - 封面 `object-fit: cover` 铺满封面区（与现有混沌兵团横幅比例兼容）
  - 标题/发行方/状态层级更清晰；状态用色点或短标签
  - 主按钮「打开」视觉权重高于「选择存档目录」「商店页」
- 字体：宿主 `:root` 从默认 Inter 栈换为更有辨识度的组合（例如展示用有衬线或圆体 + 正文无衬线）；须保证中文可读（系统中文字体回退链写清楚）

### 4.3 明确不动

- Chaos Front / Wanderburg 各 Tab 内部结构与 Element Plus 用法
- 备份面板、槽位列表交互逻辑（样式可被全局色板轻微影响，但不改功能）

## 5. Wanderburg 封面

- 来源：Steam 公开胶囊/库头图（`steamAppId: 3624140`），下载为静态资源  
- 路径：`src/games/wanderburg/cover.jpg`（或 `.png`，与混沌兵团一致优先 jpg）  
- `index.ts`：`new URL('./cover.jpg', import.meta.url)`  
- 删除或停用 `cover.svg` 占位  
- 版权：与混沌兵团封面同策略——库内展示用、非官方；`rightsHolder` 已标明 Randwerk

## 6. i18n 与测试

- 新增/更新 key：`app.brand`、`app.brandZh`（或合并为按 locale 的 display name）、`library.subtitle` 等  
- 关于页 disclaimer 仍用 `rightsHolder`；品牌展示走新字段  
- 更新：`tests/session-context.spec.ts`、`tests/i18n.spec.ts` 中与标题/品牌相关的断言  
- 手测：库页中英切换、顶栏 logo、两张游戏卡封面、关于页文案

## 7. 成功标准

1. 中文界面一眼能读到 **存档酱**，且有二次元圆形 logo  
2. 游戏库不再是「黑底 + 两张灰卡」；氛围与卡片层次可感知改善  
3. Wanderburg 卡片为真实游戏封面，非 WB 字  
4. 编辑页功能无回归；`npm test` / 既有构建路径可通过  

## 8. 风险

| 风险 | 缓解 |
|------|------|
| 生成图风格不稳定 | 定死提示词（短发工具娘、圆头像、透明/纯色底）；不合格则手工裁切 |
| Steam 图比例与混沌卡不一致 | 统一 `object-fit: cover` + 固定 aspect-ratio |
| exe 图标替换需多尺寸 | 应用内 logo 优先；icons 批处理可选 |
| 字体在 Windows 缺字 | 中文回退 `Microsoft YaHei` / `PingFang SC` / `Noto Sans SC` |
