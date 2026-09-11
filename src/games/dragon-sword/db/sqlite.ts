/**
 * Plaintext SQLite helpers via sql.js (bytes in / bytes out).
 *
 * Public format references (schema/layout only; no community editor source):
 * - https://github.com/gfriloux/dragonsword-save-editor/tree/main/docs
 *
 * Does not touch `fs` or Tauri invoke. WASM is resolved via Vite `?url` in the
 * app; Vitest uses Node package resolution because `?url` is root-relative.
 */
import initSqlJs from 'sql.js'
import wasmUrl from 'sql.js/dist/sql-wasm.wasm?url'

type SqlJsStatic = Awaited<ReturnType<typeof initSqlJs>>
export type SqlJsDb = InstanceType<SqlJsStatic['Database']>

const PAGE_SIZE = 4096

let sqlJs: Promise<SqlJsStatic> | undefined

async function resolveSqlJs(): Promise<SqlJsStatic> {
  let wasmPath = wasmUrl
  if (import.meta.env.MODE === 'test') {
    const { createRequire } = await import('node:module')
    wasmPath = createRequire(import.meta.url).resolve('sql.js/dist/sql-wasm.wasm')
  }
  return initSqlJs({
    locateFile: (file: string) => (file.endsWith('.wasm') ? wasmPath : file)
  })
}

function loadSqlJs(): Promise<SqlJsStatic> {
  if (!sqlJs) sqlJs = resolveSqlJs()
  return sqlJs
}

export async function openSqlite(bytes: Uint8Array): Promise<SqlJsDb> {
  const SQL = await loadSqlJs()
  if (bytes.length === 0) return new SQL.Database()
  return new SQL.Database(bytes)
}

export function exportSqlite(db: SqlJsDb): Uint8Array {
  const raw = db.export()
  const rem = raw.length % PAGE_SIZE
  if (rem === 0) return raw
  const padded = new Uint8Array(raw.length + (PAGE_SIZE - rem))
  padded.set(raw)
  return padded
}

export function integrityCheck(db: SqlJsDb): void {
  try {
    const result = db.exec('PRAGMA integrity_check')
    const status = result[0]?.values[0]?.[0]
    if (status !== 'ok') {
      throw new Error(`sqlite integrity_check failed: ${String(status ?? 'no result')}`)
    }
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('sqlite integrity_check failed:')) throw e
    const detail = e instanceof Error ? e.message : String(e)
    throw new Error(`sqlite integrity_check failed: ${detail}`)
  }
}
