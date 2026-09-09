# 贡献指南

感谢你愿意给 SaveSmith 提改动。加盟方式只有一种：**给本仓库提 PR**。没有插件商店，也没有运行时加载外部模块。

## 开发环境

- Windows x64
- Node.js 20+
- Rust（`cargo`）与 MSVC 构建工具（VS 2022 Build Tools 即可）

```powershell
npm install
npm test
npm run typecheck
npm run tauri dev
```

免安装包：`npm run dist` → `src-tauri/target/release/savesmith.exe`  
安装包（可选）：`npm run dist:installer`

## 架构约束（不要破）

1. 游戏模块**不碰文件系统**、不直接调 Tauri。只处理字节和内存里的 `GameState`。
2. 宿主**不知道**游戏内部字段。槽位、备份、写盘全在宿主。
3. 写盘纪律（备份、临时文件、原子替换、每文件最近 10 份）只属于 Rust 宿主。

细节见 [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)。设计原稿：`docs/superpowers/specs/`。

## 加一款游戏

1. 新建 `src/games/<id>/`：探测路径、解析/序列化、Vue 深页、封面。
2. 在 `src/host/registry.ts` **静态 import** 一行。不要做动态加载。
3. 补 Vitest；不要把玩家真档提交进仓库。
4. README / 关于页写明非官方、权利人、仅限单机。

第一期只发 Windows。不要在 PR 里夹带服务端、账号、内存修改或训练器。

## 提交与 PR

- 面向 `main`。说明**为什么**改，而不是复述 diff。
- 跑过 `npm test` 和 `npm run typecheck`。
- 不要提交 `.env`、密钥、玩家存档。
- UI 改动请说明在 Windows 上怎么手测。

## 权利人

游戏名称、商标、素材归各权利人。本仓库应用代码为 MIT。合理的下架或屏蔽请求会配合处理对应模块。
