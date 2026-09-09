#!/usr/bin/env node
/** 把 package.json / tauri.conf.json / Cargo.toml 的 version 写成同一值。 */
import fs from 'node:fs'

const ver = process.argv[2]
if (!ver || !/^\d+\.\d+\.\d+(-.+)?$/.test(ver)) {
  console.error('usage: node scripts/sync-version.mjs 0.2.0')
  process.exit(1)
}

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
pkg.version = ver
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n')

const confPath = 'src-tauri/tauri.conf.json'
const conf = JSON.parse(fs.readFileSync(confPath, 'utf8'))
conf.version = ver
fs.writeFileSync(confPath, JSON.stringify(conf, null, 2) + '\n')

const cargoPath = 'src-tauri/Cargo.toml'
const cargo = fs.readFileSync(cargoPath, 'utf8')
if (!/^version\s*=\s*"[^"]+"/m.test(cargo)) {
  console.error('Cargo.toml version field not found')
  process.exit(1)
}
const next = cargo.replace(/^version\s*=\s*"[^"]+"/m, `version = "${ver}"`)
fs.writeFileSync(cargoPath, next)
console.log(`synced version ${ver}`)
