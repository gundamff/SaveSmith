# Bug 线索

| 登记日 | 来源 | 用户 | 帖子/视频 | 报的版本 | 现象 | 复现信息 | 状态 | 关联 |
|---|---|---|---|---|---|---|---|---|
| 2026-11-07 | B站 | 我真的是曹乐啊 | BV1HGxQ67E8T | 0.17.9 | 保存日志连续 16 次 `PBZ_INVALID_EQUIPMENT` | 未给存档 | fixed（0.17.10） | 回复 rpid 319501836625 |
| 2026-11-07 | B站 | 丫am1 | BV1HGxQ67E8T | 0.17.9 | 同上，`PBZ_INVALID_EQUIPMENT`，无堆栈 | 未给存档 | fixed（0.17.10） | 回复 rpid 319501955681 |
| 2026-11-07 | B站 | 一生只吃饭 | BV1ehxk6GE2L | 0.17.5 | 改材料后 `dirty=true`，点保存无反应、无报错 | 待补：未保存标记是否消失 / 存档 | waiting-user | root rpid 319070507105 |
| 2026-11-06 | B站 | CaptainAfrica1 | BV1fkaU6SEJb | 0.17.5 | 跳关后科技树消失、不能选 parts | 用户已提供存档（存本机 local-archive，路径不入库） | waiting-user | root rpid 320763218048 |
| 2026-11-06 | B站 | VeilchenA | BV1fkaU6SEJb | 0.17.5 前 | 待补原始描述 | 待升级后复测 | waiting-user | root rpid 318415827089 |
| 2026-11-07 | B站 | 超级网恋骑丶 | BV19W4c6fEdD | 待补 | 未保存标记是否消失 | 待回复 | waiting-user | root rpid 319085573089 |
| 2026-11-08 | N网 | Azuma12321 | posts/365 comment-179304933 | 0.17.9 | 改过游戏时长后保存，再次保存时时间被还原成原值 | 待补：改的是总时长还是当前周目时长、保存是否提示成功、日志尾部 | new | 已在帖子回复索要信息 |
| 2026-11-07 | N网 | zooeyczar | posts/365 comment-179273640 | 0.17.9 | 最新文件被隔离、无法下载 | — | fixed（0.17.11 已重新上传；机制与周期见 `quarantine-log.md`） | 属预期行为，非代码缺陷 |

## 已定位的根因（供后续复用）

**`PBZ_INVALID_EQUIPMENT`（0.17.10 修复）**
校验逐条读装备记录的等级字段（`WeaponLevel` / `ShaChiWeaponLevel` / `CurrentLevel`），
只要有一条缺失、非整数，或主武器/影之武装存成 `0`，就判整次保存非法。
0.17.10 改为跳过该条并给出警告，不再阻断整次写入。

**0.17.5 保存无反应（待复核）**
两个怀疑方向：`changedFiles` 为空（serialize 未反映材料字段）、`writeAtomic` 静默失败。
复核顺序：先看 serialize 输出是否包含材料字段，再补 writeAtomic 的错误上报。
