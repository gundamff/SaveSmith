# 维护者：如何发版

[**中文**](RELEASE.md) | [English](RELEASE.en.md)

面向仓库维护者。推送 `v*` 标签后，GitHub Actions 会自动测试、打包便携 exe 并创建 Release。

## 第一次

1. 打开仓库 → **Actions**
2. 若工作流被禁用，点启用
3. 推 `main` 会跑 **CI**；推 `v0.2.0` 这类标签会跑 **Release**

## 发新版本（例：0.2.0）

1. 在 `CHANGELOG.md` 与 `CHANGELOG.en.md` 顶部加 `## [0.2.0] - 日期` 与变更说明
2. 把 `package.json` / `package-lock.json` / `src-tauri/tauri.conf.json` / `src-tauri/Cargo.toml` 的 `version` 改成 `0.2.0`（也可只打标签，CI 会再同步一次）
3. 提交并推送 `main`
4. 打标签并推送（触发发版）：

```bash
git tag v0.2.0
git push origin v0.2.0
```

5. 打开 **Actions → Release** 等绿勾，再到 **Releases** 下载 `SaveSmith-0.2.0-windows-x64.exe`

## 注意

- 标签格式：`v` + 语义化版本，如 `v0.2.0`
- Release 正文从 `CHANGELOG.md` 对应版本段生成（`scripts/changelog-for-version.mjs`）
- 失败时看 Actions 日志红色步骤
- 本机 Windows 需要 Node、Rust、MSVC；CI 的 `windows-latest` 已自带这些
