use std::fs::{self, OpenOptions};
use std::io::{ErrorKind, Write};
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

/// `%AppData%\SaveSmith\logs` on Windows, with portable fallbacks.
pub fn default_logs_dir() -> PathBuf {
    if let Some(appdata) = std::env::var_os("APPDATA") {
        return logs_dir_under(Path::new(&appdata));
    }
    if let Some(home) = std::env::var_os("USERPROFILE").or_else(|| std::env::var_os("HOME")) {
        return logs_dir_under(Path::new(&home));
    }
    logs_dir_under(&std::env::temp_dir())
}

pub fn logs_dir_under(base: &Path) -> PathBuf {
    base.join("SaveSmith").join("logs")
}

pub fn log_file_for_stamp(dir: &Path, date_stamp: &str) -> PathBuf {
    dir.join(format!("savesmith-{date_stamp}.log"))
}

/// UTC date and timestamp parts used for the daily log file and each line.
pub fn date_stamp(secs: u64) -> (String, String) {
    let days = (secs / 86400) as i64;
    let rem = secs % 86400;
    let hour = rem / 3600;
    let min = (rem % 3600) / 60;
    let sec = rem % 60;
    let (year, month, day) = civil_from_days(days);
    (
        format!("{year:04}{month:02}{day:02}"),
        format!("{year:04}-{month:02}-{day:02} {hour:02}:{min:02}:{sec:02}"),
    )
}

fn now_stamp() -> (String, String) {
    let secs = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);
    date_stamp(secs)
}

pub fn append_entry(level: &str, message: &str) -> Result<(), String> {
    let (date, stamp) = now_stamp();
    let path = log_file_for_stamp(&default_logs_dir(), &date);
    append_line_at(&path, &stamp, level, message)
}

pub fn append_line_at(path: &Path, stamp: &str, level: &str, message: &str) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let mut file = OpenOptions::new()
        .create(true)
        .append(true)
        .open(path)
        .map_err(|e| e.to_string())?;
    let body = message.trim_end().replace("\r\n", "\n").replace('\r', "\n");
    writeln!(file, "[{stamp}] [{level}] {body}").map_err(|e| e.to_string())
}

pub fn latest_log_file(dir: &Path) -> Option<PathBuf> {
    let mut best: Option<(String, PathBuf)> = None;
    for entry in fs::read_dir(dir).ok()?.flatten() {
        let name = entry.file_name().to_string_lossy().into_owned();
        if !name.starts_with("savesmith-") || !name.ends_with(".log") {
            continue;
        }
        if best.as_ref().map_or(true, |(current, _)| name > *current) {
            best = Some((name, entry.path()));
        }
    }
    best.map(|(_, path)| path)
}

pub fn tail(lines: usize) -> Result<Vec<String>, String> {
    let dir = default_logs_dir();
    let path = match latest_log_file(&dir) {
        Some(path) => path,
        None => {
            let (date, _) = now_stamp();
            log_file_for_stamp(&dir, &date)
        }
    };
    tail_at(&path, lines)
}

pub fn tail_at(path: &Path, lines: usize) -> Result<Vec<String>, String> {
    if lines == 0 {
        return Ok(Vec::new());
    }
    let text = match fs::read_to_string(path) {
        Ok(text) => text,
        Err(e) if e.kind() == ErrorKind::NotFound => return Ok(Vec::new()),
        Err(e) => return Err(e.to_string()),
    };
    let mut entries: Vec<String> = text.lines().map(str::to_string).collect();
    if entries.len() > lines {
        entries = entries.split_off(entries.len() - lines);
    }
    Ok(entries)
}

/// Civil date from Unix days. Howard Hinnant, public domain.
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

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn logs_dir_is_under_appdata_savesmith_logs() {
        let base = Path::new("C:\\Users\\tester\\AppData\\Roaming");
        assert_eq!(logs_dir_under(base), base.join("SaveSmith").join("logs"));
    }

    #[test]
    fn date_stamp_formats_utc_dates() {
        assert_eq!(
            date_stamp(0),
            ("19700101".to_string(), "1970-01-01 00:00:00".to_string())
        );
        assert_eq!(
            date_stamp(1_704_067_200),
            ("20240101".to_string(), "2024-01-01 00:00:00".to_string())
        );
    }

    #[test]
    fn append_line_creates_parent_and_file() {
        let dir = tempdir().unwrap();
        let path = dir.path().join("nested").join("savesmith-20260101.log");

        append_line_at(&path, "2026-01-01 10:11:12", "info", "open game").unwrap();

        let text = fs::read_to_string(&path).unwrap();
        assert_eq!(text, "[2026-01-01 10:11:12] [info] open game\n");
    }

    #[test]
    fn tail_returns_last_n_lines() {
        let dir = tempdir().unwrap();
        let path = dir.path().join("savesmith-20260101.log");
        for i in 0..60 {
            append_line_at(&path, "2026-01-01 10:11:12", "info", &format!("line {i}")).unwrap();
        }

        let lines = tail_at(&path, 50).unwrap();

        assert_eq!(lines.len(), 50);
        assert!(lines[0].ends_with("line 10"));
        assert!(lines[49].ends_with("line 59"));
    }

    #[test]
    fn tail_missing_file_is_empty() {
        let dir = tempdir().unwrap();
        let lines = tail_at(&dir.path().join("missing.log"), 50).unwrap();
        assert!(lines.is_empty());
    }

    #[test]
    fn latest_log_file_picks_the_newest_daily_log() {
        let dir = tempdir().unwrap();
        let older = dir.path().join("savesmith-20260101.log");
        let newer = dir.path().join("savesmith-20260102.log");
        fs::write(&older, b"old\n").unwrap();
        fs::write(&newer, b"new\n").unwrap();

        assert_eq!(latest_log_file(dir.path()).unwrap(), newer);
    }
}
