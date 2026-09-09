#!/usr/bin/env node
/**
 * 从 CHANGELOG.md 抽出指定版本段落，供 GitHub Release 正文使用。
 * 用法: node scripts/changelog-for-version.mjs 0.1.0
 */
import fs from 'node:fs'

const ver = process.argv[2]
if (!ver) {
  console.error('usage: node scripts/changelog-for-version.mjs <version>')
  process.exit(1)
}

const text = fs.readFileSync('CHANGELOG.md', 'utf8')
const re = new RegExp(`## \\[${ver.replace(/\./g, '\\.')}\\][^\\n]*\\n([\\s\\S]*?)(?=\\n## \\[|$)`)
const m = text.match(re)

let body = ''
if (m) {
  body = m[1].trim()
} else {
  body = `版本 ${ver}。详见仓库 [CHANGELOG.md](https://github.com/gundamff/SaveSmith/blob/main/CHANGELOG.md)。`
}

const out = [
  `## SaveSmith v${ver}`,
  '',
  '下载下方附件 `SaveSmith-' + ver + '-windows-x64.exe`（便携版，无需安装）。需系统 WebView2。',
  '',
  body,
  '',
  '---',
  '',
  '> **非官方工具。** 与 ChaosGalaxyStudio 无关联。仅限已购正版玩家本地单机学习使用。修改前请完全退出游戏并依赖自动备份。',
  '',
  `完整说明见 [CHANGELOG.md](https://github.com/gundamff/SaveSmith/blob/main/CHANGELOG.md)。`
].join('\n')

process.stdout.write(out)
