import { invoke } from '@tauri-apps/api/core'

export interface BackupInfoDto {
  name: string
  mtimeMs: number
  size: number
}

function toUint8Array(data: unknown): Uint8Array {
  if (data instanceof Uint8Array) {
    return data
  }
  if (data instanceof ArrayBuffer) {
    return new Uint8Array(data)
  }
  if (Array.isArray(data)) {
    return new Uint8Array(data)
  }
  throw new Error('unexpected bytes payload')
}

export function pickFolder(): Promise<string | null> {
  return invoke<string | null>('pick_folder')
}

export function listDirNames(dir: string): Promise<string[]> {
  return invoke<string[]>('list_dir_names', { dir })
}

export async function readFileBytes(dir: string, relativePath: string): Promise<Uint8Array> {
  const data = await invoke<number[] | ArrayBuffer>('read_file_bytes', {
    dir,
    relativePath
  })
  return toUint8Array(data)
}

export function writeAtomic(
  dir: string,
  relativePath: string,
  bytes: Uint8Array
): Promise<string> {
  return invoke<string>('write_atomic', {
    dir,
    relativePath,
    bytes: Array.from(bytes)
  })
}

export function listBackups(dir: string, relativePath: string): Promise<BackupInfoDto[]> {
  return invoke<BackupInfoDto[]>('list_backups', { dir, relativePath })
}

export function restoreBackup(
  dir: string,
  relativePath: string,
  name: string
): Promise<void> {
  return invoke('restore_backup', { dir, relativePath, name })
}

export function deleteBackup(dir: string, name: string): Promise<void> {
  return invoke('delete_backup', { dir, name })
}

export function appVersion(): Promise<string> {
  return invoke<string>('app_version')
}

export function openExternal(url: string): Promise<void> {
  return invoke('open_external', { url })
}
