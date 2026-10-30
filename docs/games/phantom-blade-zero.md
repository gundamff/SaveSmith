# 影之刃零（Phantom Blade Zero）

非官方、仅限单机的存档修改支持。权利人及开发：S-GAME Studio；发行：S-GAME Publishing。Steam AppID `4115450`。

当前已验证 Steam build `26266538`。游戏更新后格式或密钥可能变化；认证失败时 SaveSmith 会拒绝保存，而不是冒险写入。

## 存档位置与槽位

默认目录：

`...\PBZ\ProjectPBZ\Saved\SaveGames\Steam\<SteamID64>\`

物理主档只有 `PBZSaveGame.sav`。SaveSmith 将其中的 `AutoSaveN` / `ManualSaveN` 显示为可编辑内部槽位。

- `1RealTime`、`2Hourly`、`3Daily` 是游戏自身的备份目录，不会显示为 SaveSmith 槽位。
- `__Advanced__`、`__Achievements__` 是特殊槽，仅只读透传。
- 设置档不受支持。

格式为 PBZS v3：AES-256-GCM 认证加密；读取 Oodle 压缩槽，修改后用 zlib 写回。认证或解析失败会停止写入。

## 可编辑范围

- 每个已有 `AutoSaveN` / `ManualSaveN` 的 `Player.Dust`
- 已存在的 `Weapon_Material_*` 材料数量
- 材料范围为 `0..9999`；提高 `CurrentAmount` 超过原 `MaxAmount` 时会同步提高 `MaxAmount`

不支持新增或解锁材料，不支持装备等级、剧情、任务、成就、DLC 或设置档修改。

## 安全须知

1. 修改前**完全退出游戏**。
2. 先复制整个 SteamID64 存档目录，并用副本验证。
3. 建议关闭 Steam Cloud；若保持开启，请接受云端覆盖或回滚本地修改的风险。
4. 本工具非官方，仅供正版游戏的本地单机使用。

## Oodle 与素材

Oodle 读取使用 Clean-room 构建的 MIT [`oozextract 0.5.7`](../../src/games/phantom-blade-zero/codec/oodle/UPSTREAM.md) portable WASM；不使用 GPL `ooz-wasm`，也不捆绑官方 Oodle DLL。许可证见模块内 [`LICENSE`](../../src/games/phantom-blade-zero/codec/oodle/LICENSE)。

封面来自 Steam App `4115450` 商店 header，版权属权利人，仅用于 SaveSmith 库页识别。

实现边界与格式细节见[设计文档](../design/2026-10-30-phantom-blade-zero-design.md)。
