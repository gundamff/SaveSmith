use std::fs;
use std::io::ErrorKind;
use std::path::{Component, Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

pub const BACKUP_KEEP: usize = 10;

#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BackupInfo {
    pub name: String,
    pub mtime_ms: u64,
    pub size: u64,
}

pub fn safe_join(dir: &Path, relative: &str) -> Result<PathBuf, String> {
    if relative.contains("..") {
        return Err("path must not contain '..'".into());
    }
    let normalized = relative.replace('\\', "/");
    if normalized.starts_with('/') {
        return Err("absolute path rejected".into());
    }
    let rel = Path::new(&normalized);
    if rel.is_absolute() {
        return Err("absolute path rejected".into());
    }
    for component in rel.components() {
        match component {
            Component::Normal(_) | Component::CurDir => {}
            _ => return Err("unsafe path component".into()),
        }
    }
    let joined = dir.join(rel);
    if !is_under(dir, &joined) {
        return Err("path escapes directory".into());
    }
    Ok(joined)
}

pub fn backup_name(original_file_name: &str, stamp: &str) -> String {
    let path = Path::new(original_file_name);
    let stem = path
        .file_stem()
        .map(|s| s.to_string_lossy())
        .unwrap_or_default();
    match path.extension() {
        Some(ext) => format!("{stem}_{stamp}.{}.bak", ext.to_string_lossy()),
        None => format!("{stem}_{stamp}.bak"),
    }
}

pub fn prune_backups(backup_dir: &Path, stem: &str, keep: usize) -> Result<(), String> {
    let prefix = format!("{stem}_");
    let mut files: Vec<(SystemTime, PathBuf)> = Vec::new();
    let rd = match fs::read_dir(backup_dir) {
        Ok(rd) => rd,
        Err(e) if e.kind() == ErrorKind::NotFound => return Ok(()),
        Err(e) => return Err(e.to_string()),
    };
    for entry in rd {
        let entry = entry.map_err(|e| e.to_string())?;
        let name = entry.file_name().to_string_lossy().into_owned();
        if name.starts_with(&prefix) && name.ends_with(".bak") {
            let meta = entry.metadata().map_err(|e| e.to_string())?;
            let mtime = meta.modified().unwrap_or(UNIX_EPOCH);
            files.push((mtime, entry.path()));
        }
    }
    files.sort_by(|a, b| b.0.cmp(&a.0));
    for (_, path) in files.into_iter().skip(keep) {
        fs::remove_file(path).map_err(|e| e.to_string())?;
    }
    Ok(())
}

pub fn write_atomic(save_dir: &Path, relative: &str, bytes: &[u8]) -> Result<String, String> {
    let target = safe_join(save_dir, relative)?;
    if let Some(parent) = target.parent() {
        let _ = fs::create_dir_all(parent);
    }
    let backup_dir = save_dir.join("backup");
    fs::create_dir_all(&backup_dir).map_err(|e| e.to_string())?;

    let file_name = target
        .file_name()
        .ok_or_else(|| "target has no file name".to_string())?
        .to_string_lossy()
        .into_owned();

    let mut backup_written = String::new();
    if target.exists() {
        let stamp = utc_yyyymmddhhmmss();
        let name = backup_name(&file_name, &stamp);
        let dest = backup_dir.join(&name);
        fs::copy(&target, &dest).map_err(|e| e.to_string())?;
        backup_written = name;
        prune_backups(&backup_dir, &stem_of(&file_name), BACKUP_KEEP)?;
    }

    let tmp = target.with_file_name(format!(
        ".{}.tmp-{}",
        file_name,
        now_millis()
    ));
    fs::write(&tmp, bytes).map_err(|e| e.to_string())?;
    replace_file(&tmp, &target)?;
    Ok(backup_written)
}

pub fn list_backups(save_dir: &Path, relative: &str) -> Result<Vec<BackupInfo>, String> {
    let target = safe_join(save_dir, relative)?;
    let file_name = target
        .file_name()
        .ok_or_else(|| "target has no file name".to_string())?
        .to_string_lossy()
        .into_owned();
    let stem = stem_of(&file_name);
    let prefix = format!("{stem}_");
    let backup_dir = save_dir.join("backup");
    let mut out = Vec::new();
    let rd = match fs::read_dir(&backup_dir) {
        Ok(rd) => rd,
        Err(e) if e.kind() == ErrorKind::NotFound => return Ok(out),
        Err(e) => return Err(e.to_string()),
    };
    for entry in rd {
        let entry = entry.map_err(|e| e.to_string())?;
        let name = entry.file_name().to_string_lossy().into_owned();
        if name.starts_with(&prefix) && name.ends_with(".bak") {
            let meta = entry.metadata().map_err(|e| e.to_string())?;
            out.push(BackupInfo {
                name,
                mtime_ms: mtime_ms(&meta),
                size: meta.len(),
            });
        }
    }
    out.sort_by(|a, b| b.mtime_ms.cmp(&a.mtime_ms));
    Ok(out)
}

pub fn restore_backup(
    save_dir: &Path,
    relative: &str,
    backup_file_name: &str,
) -> Result<(), String> {
    validate_backup_file_name(backup_file_name)?;
    let backup_path = save_dir.join("backup").join(backup_file_name);
    if !is_under(&save_dir.join("backup"), &backup_path) {
        return Err("backup path escapes backup directory".into());
    }
    let bytes = fs::read(&backup_path).map_err(|e| e.to_string())?;
    write_atomic(save_dir, relative, &bytes)?;
    Ok(())
}

pub fn delete_backup(save_dir: &Path, backup_file_name: &str) -> Result<(), String> {
    validate_backup_file_name(backup_file_name)?;
    let backup_dir = save_dir.join("backup");
    let path = backup_dir.join(backup_file_name);
    if !is_under(&backup_dir, &path) {
        return Err("backup path escapes backup directory".into());
    }
    fs::remove_file(&path).map_err(|e| e.to_string())
}

fn validate_backup_file_name(name: &str) -> Result<(), String> {
    if !name.ends_with(".bak") || name.len() <= 4 {
        return Err("invalid backup file name".into());
    }
    let stem = &name[..name.len() - 4];
    if stem.is_empty()
        || !stem
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || matches!(c, '.' | '_' | '-'))
    {
        return Err("invalid backup file name".into());
    }
    Ok(())
}

fn stem_of(file_name: &str) -> String {
    Path::new(file_name)
        .file_stem()
        .map(|s| s.to_string_lossy().into_owned())
        .unwrap_or_default()
}

fn is_under(dir: &Path, child: &Path) -> bool {
    let dir_comps: Vec<_> = dir.components().collect();
    let child_comps: Vec<_> = child.components().collect();
    child_comps.starts_with(&dir_comps)
}

fn replace_file(tmp: &Path, target: &Path) -> Result<(), String> {
    #[cfg(windows)]
    {
        replace_file_windows(tmp, target)
    }
    #[cfg(not(windows))]
    {
        fs::rename(tmp, target).map_err(|e| e.to_string())
    }
}

/// Replace `target` with `tmp` without deleting `target` first.
/// On failure the live file stays untouched; only `tmp` may be removed.
#[cfg(windows)]
fn replace_file_windows(tmp: &Path, target: &Path) -> Result<(), String> {
    use std::os::windows::ffi::OsStrExt;

    const MOVEFILE_REPLACE_EXISTING: u32 = 0x0000_0001;

    #[link(name = "kernel32")]
    extern "system" {
        fn MoveFileExW(
            lp_existing_file_name: *const u16,
            lp_new_file_name: *const u16,
            dw_flags: u32,
        ) -> i32;
    }

    fn wide(path: &Path) -> Vec<u16> {
        path.as_os_str()
            .encode_wide()
            .chain(std::iter::once(0))
            .collect()
    }

    let from = wide(tmp);
    let to = wide(target);
    let ok = unsafe { MoveFileExW(from.as_ptr(), to.as_ptr(), MOVEFILE_REPLACE_EXISTING) };
    if ok == 0 {
        let err = std::io::Error::last_os_error().to_string();
        let _ = fs::remove_file(tmp);
        return Err(err);
    }
    Ok(())
}

fn now_millis() -> u128 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis())
        .unwrap_or(0)
}

fn utc_yyyymmddhhmmss() -> String {
    let secs = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);
    format_utc_stamp(secs)
}

/// Civil date from Unix days. Howard Hinnant, public domain.
fn format_utc_stamp(secs: u64) -> String {
    let days = (secs / 86400) as i64;
    let rem = secs % 86400;
    let hour = rem / 3600;
    let min = (rem % 3600) / 60;
    let sec = rem % 60;
    let (year, month, day) = civil_from_days(days);
    format!("{year:04}{month:02}{day:02}{hour:02}{min:02}{sec:02}")
}

fn civil_from_days(z: i64) -> (i32, u32, u32) {
    let z = z + 719468;
    let era = if z >= 0 { z } else { z - 146096 } / 146097;
    let doe = (z - era * 146097) as u64;
    let yoe = (doe - doe / 1460 + doe / 36524 - doe / 146096) / 365;
    let y = yoe as i64 + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = doy - (153 * mp + 2) / 5 + 1;
    let m = if mp < 10 { mp + 3 } else { mp - 9 };
    let y = if m <= 2 { y + 1 } else { y };
    (y as i32, m as u32, d as u32)
}

pub fn list_relative_file_paths(root: &Path, max_depth: u32) -> Result<Vec<String>, String> {
    let mut out = Vec::new();
    fn walk(
        dir: &Path,
        root: &Path,
        depth: u32,
        max_depth: u32,
        out: &mut Vec<String>,
    ) -> Result<(), String> {
        if depth > max_depth {
            return Ok(());
        }
        let rd = fs::read_dir(dir).map_err(|e| e.to_string())?;
        for ent in rd {
            let ent = ent.map_err(|e| e.to_string())?;
            let path = ent.path();
            let name = ent.file_name().to_string_lossy().to_string();
            if name.eq_ignore_ascii_case("backup") {
                continue;
            }
            if path.is_dir() {
                walk(&path, root, depth + 1, max_depth, out)?;
            } else if path.is_file() {
                let rel = path.strip_prefix(root).map_err(|e| e.to_string())?;
                out.push(rel.to_string_lossy().replace('\\', "/"));
            }
        }
        Ok(())
    }
    walk(root, root, 0, max_depth, &mut out)?;
    out.sort();
    Ok(out)
}

fn mtime_ms(meta: &fs::Metadata) -> u64 {
    meta.modified()
        .ok()
        .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use std::thread;
    use std::time::Duration;
    use tempfile::tempdir;

    #[test]
    fn backup_name_matches_legacy_format() {
        assert_eq!(
            backup_name("savedata0.cf", "20260101000000"),
            "savedata0_20260101000000.cf.bak"
        );
    }

    #[test]
    fn prune_backups_keeps_10_newest_of_13() {
        let dir = tempdir().unwrap();
        let backup_dir = dir.path();
        for i in 0..13 {
            let path = backup_dir.join(format!("savedata0_{i:02}.bak"));
            fs::write(&path, format!("v{i}")).unwrap();
            thread::sleep(Duration::from_millis(30));
        }

        prune_backups(backup_dir, "savedata0", 10).unwrap();

        let remaining: Vec<String> = fs::read_dir(backup_dir)
            .unwrap()
            .map(|e| e.unwrap().file_name().to_string_lossy().into_owned())
            .collect();
        assert_eq!(remaining.len(), 10);
        for i in 0..3 {
            assert!(
                !remaining.contains(&format!("savedata0_{i:02}.bak")),
                "oldest file savedata0_{i:02}.bak should be pruned"
            );
        }
        for i in 3..13 {
            assert!(
                remaining.contains(&format!("savedata0_{i:02}.bak")),
                "newest file savedata0_{i:02}.bak should be kept"
            );
        }
    }

    #[test]
    fn write_atomic_accepts_non_json_and_backs_up_original() {
        let dir = tempdir().unwrap();
        let save_dir = dir.path();
        fs::write(save_dir.join("savedata0.cf"), b"OLD-BYTES").unwrap();

        let bak = write_atomic(save_dir, "savedata0.cf", b"not-json-{").unwrap();
        assert!(!bak.is_empty(), "existing file should produce a backup name");
        assert_eq!(
            fs::read(save_dir.join("savedata0.cf")).unwrap(),
            b"not-json-{"
        );
        let bak_path = save_dir.join("backup").join(&bak);
        assert_eq!(fs::read(bak_path).unwrap(), b"OLD-BYTES");
    }

    #[test]
    fn write_atomic_replaces_existing_and_adds_old_bytes_to_backup() {
        let dir = tempdir().unwrap();
        let save_dir = dir.path();
        fs::write(save_dir.join("savedata0.cf"), b"ORIGINAL").unwrap();
        let before = fs::read_dir(save_dir.join("backup"))
            .map(|rd| rd.count())
            .unwrap_or(0);

        let bak = write_atomic(save_dir, "savedata0.cf", b"REPLACED").unwrap();

        assert_eq!(fs::read(save_dir.join("savedata0.cf")).unwrap(), b"REPLACED");
        let after = fs::read_dir(save_dir.join("backup")).unwrap().count();
        assert_eq!(after, before + 1);
        assert_eq!(
            fs::read(save_dir.join("backup").join(&bak)).unwrap(),
            b"ORIGINAL"
        );
    }

    #[test]
    fn write_atomic_overwrite_keeps_readable_target_and_backup_of_old() {
        let dir = tempdir().unwrap();
        let save_dir = dir.path();
        let target = save_dir.join("savedata0.cf");
        fs::write(&target, b"PRE-WRITE-BYTES").unwrap();

        let bak = write_atomic(save_dir, "savedata0.cf", b"POST-WRITE-BYTES").unwrap();

        assert!(target.is_file(), "target must remain a readable file");
        assert_eq!(fs::read(&target).unwrap(), b"POST-WRITE-BYTES");
        assert!(!bak.is_empty());
        assert_eq!(
            fs::read(save_dir.join("backup").join(&bak)).unwrap(),
            b"PRE-WRITE-BYTES"
        );
        let leftovers: Vec<_> = fs::read_dir(save_dir)
            .unwrap()
            .map(|e| e.unwrap().file_name().to_string_lossy().into_owned())
            .filter(|n| n.contains(".tmp-"))
            .collect();
        assert!(leftovers.is_empty(), "tmp must not remain after success: {leftovers:?}");
    }

    #[test]
    fn delete_backup_rejects_parent_escape() {
        let dir = tempdir().unwrap();
        let err = delete_backup(dir.path(), "..\\x.bak").unwrap_err();
        assert!(!err.is_empty());
    }

    #[test]
    fn safe_join_rejects_windows_escape() {
        let dir = tempdir().unwrap();
        assert!(safe_join(dir.path(), "..\\Windows\\x").is_err());
    }

    #[test]
    fn format_utc_stamp_epoch() {
        assert_eq!(format_utc_stamp(0), "19700101000000");
        assert_eq!(format_utc_stamp(1_704_067_200), "20240101000000");
    }

    #[test]
    fn backup_info_serializes_camel_case() {
        let json = serde_json::to_value(&BackupInfo {
            name: "savedata0_20260101000000.cf.bak".into(),
            mtime_ms: 1_700_000_000_000,
            size: 42,
        })
        .unwrap();
        assert_eq!(json["name"], "savedata0_20260101000000.cf.bak");
        assert_eq!(json["mtimeMs"], 1_700_000_000_000_u64);
        assert_eq!(json["size"], 42);
        assert!(json.get("mtime_ms").is_none());
    }
}
