mod fs_ops;

use std::fs;
use std::path::Path;

use fs_ops::BackupInfo;
use tauri_plugin_dialog::DialogExt;
use tauri_plugin_opener::OpenerExt;

const ALLOWED_URL_PREFIXES: &[&str] = &[
    "https://store.steampowered.com/",
    "https://github.com/",
    "https://afdian.com/",
    "https://ko-fi.com/",
    "https://buymeacoffee.com/",
];

fn assert_url_allowed(url: &str) -> Result<(), String> {
    if ALLOWED_URL_PREFIXES.iter().any(|prefix| url.starts_with(prefix)) {
        Ok(())
    } else {
        Err("URL_NOT_ALLOWED".into())
    }
}

fn list_names_in_dir(dir: &Path) -> Result<Vec<String>, String> {
    let mut names = Vec::new();
    for entry in fs::read_dir(dir).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        names.push(entry.file_name().to_string_lossy().into_owned());
    }
    names.sort();
    Ok(names)
}

#[tauri::command]
fn pick_folder(app: tauri::AppHandle) -> Result<Option<String>, String> {
    let picked = app.dialog().file().blocking_pick_folder();
    Ok(picked.map(|path| path.to_string()))
}

#[tauri::command]
fn list_dir_names(dir: String) -> Result<Vec<String>, String> {
    list_names_in_dir(Path::new(&dir))
}

#[tauri::command]
fn read_file_bytes(dir: String, relative_path: String) -> Result<Vec<u8>, String> {
    let path = fs_ops::safe_join(Path::new(&dir), &relative_path)?;
    fs::read(path).map_err(|e| e.to_string())
}

#[tauri::command]
fn write_atomic(dir: String, relative_path: String, bytes: Vec<u8>) -> Result<String, String> {
    fs_ops::write_atomic(Path::new(&dir), &relative_path, &bytes)
}

#[tauri::command]
fn list_backups(dir: String, relative_path: String) -> Result<Vec<BackupInfo>, String> {
    fs_ops::list_backups(Path::new(&dir), &relative_path)
}

#[tauri::command]
fn restore_backup(dir: String, relative_path: String, name: String) -> Result<(), String> {
    fs_ops::restore_backup(Path::new(&dir), &relative_path, &name)
}

#[tauri::command]
fn delete_backup(dir: String, name: String) -> Result<(), String> {
    fs_ops::delete_backup(Path::new(&dir), &name)
}

#[tauri::command]
fn app_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

#[tauri::command]
fn open_external(app: tauri::AppHandle, url: String) -> Result<(), String> {
    assert_url_allowed(&url)?;
    app.opener()
        .open_url(&url, None::<&str>)
        .map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            pick_folder,
            list_dir_names,
            read_file_bytes,
            write_atomic,
            list_backups,
            restore_backup,
            delete_backup,
            app_version,
            open_external
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::tempdir;

    #[test]
    fn open_external_allows_documented_prefixes() {
        for url in [
            "https://store.steampowered.com/app/2770330",
            "https://github.com/org/repo",
            "https://afdian.com/a/x",
            "https://ko-fi.com/x",
            "https://buymeacoffee.com/x",
        ] {
            assert_eq!(assert_url_allowed(url), Ok(()), "{url}");
        }
    }

    #[test]
    fn open_external_rejects_other_urls() {
        for url in [
            "https://evil.example/",
            "http://github.com/",
            "https://github.com.evil/",
            "https://github.com",
            "javascript:alert(1)",
        ] {
            assert_eq!(
                assert_url_allowed(url),
                Err("URL_NOT_ALLOWED".into()),
                "{url}"
            );
        }
    }

    #[test]
    fn list_dir_names_returns_sorted_entry_names() {
        let dir = tempdir().unwrap();
        fs::write(dir.path().join("savedata0.cf"), b"x").unwrap();
        fs::write(dir.path().join("collection.cf"), b"y").unwrap();
        fs::create_dir(dir.path().join("backup")).unwrap();

        let names = list_names_in_dir(dir.path()).unwrap();
        assert_eq!(
            names,
            vec![
                "backup".to_string(),
                "collection.cf".to_string(),
                "savedata0.cf".to_string()
            ]
        );
    }

    #[test]
    fn read_file_bytes_uses_safe_join() {
        let dir = tempdir().unwrap();
        fs::write(dir.path().join("savedata0.cf"), b"SLOT").unwrap();
        let bytes = read_file_bytes(
            dir.path().to_string_lossy().into_owned(),
            "savedata0.cf".into(),
        )
        .unwrap();
        assert_eq!(bytes, b"SLOT");
        assert!(read_file_bytes(
            dir.path().to_string_lossy().into_owned(),
            "..\\Windows\\x".into()
        )
        .is_err());
    }
}
