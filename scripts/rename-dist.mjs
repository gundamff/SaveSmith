/** 把 cargo 产出的 exe 复制成带版本号的发版文件名。 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export function portableAssetName(version) {
  if (!version) throw new Error('version required')
  return `SaveSmith-${version}-windows-x64.exe`
}

export function copyPortableExe({ version, src }) {
  if (!fs.existsSync(src)) {
    throw new Error(`missing build output: ${src}`)
  }
  const dst = path.join(path.dirname(src), portableAssetName(version))
  fs.copyFileSync(src, dst)
  return dst
}

function main() {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'))
  const src = path.join(root, 'src-tauri', 'target', 'release', 'savesmith.exe')
  const dst = copyPortableExe({ version: pkg.version, src })
  console.log(`copied ${src} -> ${dst}`)
}

const self = fileURLToPath(import.meta.url)
const invoked = process.argv[1] ? path.resolve(process.argv[1]) : ''
if (path.normalize(self) === path.normalize(invoked)) {
  try {
    main()
  } catch (err) {
    console.error(err instanceof Error ? err.message : err)
    process.exit(1)
  }
}
