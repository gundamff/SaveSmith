# 架构（v0.1）

SaveSmith 是单仓桌面应用：宿主负责壳和磁盘，游戏模块负责解析与深编辑页。

```
SaveSmith/
  src-tauri/              Rust：选目录、读字节、备份、原子写、打开外链
  src/sdk/                GameModule / 槽位 / 校验类型。无游戏逻辑、无 fs
  src/host/               游戏库、顶栏会话信息、槽位、备份、关于、i18n
  src/host/registry.ts    编译期静态登记模块
  src/games/chaos-front/  混沌兵团：定位、解析、views、素材
```

三条硬规则：

1. 模块不碰 `fs`、不直接 `invoke` Tauri。输入输出是字节和内存态。
2. 宿主不理解机体、金币等字段。`GameState` 对宿主不透明。
3. 备份与原子写只在 Rust 里实现，所有游戏共用。

v0.1 界面：编辑页顶级导航是模块 Tab（资源 / 星球 / 编队 / …）。一键拉满等按钮在对应页内，宿主不再单独做一条与 Tab 同级的动作条。模块仍可实现 `actions` / `applyAction`（测试与以后的游戏用）。

Windows 覆盖写盘使用 `MoveFileExW(MOVEFILE_REPLACE_EXISTING)`，失败时不删除目标文件。

更完整的产品规格见 [superpowers/specs/2026-09-09-savesmith-host-module-design.md](superpowers/specs/2026-09-09-savesmith-host-module-design.md)。手测清单：[HANDTEST.md](HANDTEST.md)。
