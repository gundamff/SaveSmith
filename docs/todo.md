博德之门
空之轨迹
守墓人2

影之刃零
- 参考 PBZ-Editor（MIT）扩编辑面：跟字段布局，不整包追平 ~799 项；不复制对方源码/UI/读包图标
- 已做：主武器 / 影武 / 饰品（`equipment.json`；坏档警示 + 备份提示）
- 已做：图鉴 Tab 三类——敌人（`__Advanced__.Codex`）/ 书籍·书页 / 记忆之花·残片（周目 `InventoryInfos`）
- 候选（按需分批，每批真档回读）：
  - 普通道具 `goods` 目录扩到接近全量 `InventoryInfos`
  - 药品（`MedicineInfos`；次数会被游戏规则改写）
  - 外观/衣柜（写 `__Advanced__` 全局 `Outfits`，风险最高）
  - 特典画册/音乐（`BonusCollection`；需展开 UnlockTag）
- 已有优势继续保留：战绩、进度时间；周目保持只读
