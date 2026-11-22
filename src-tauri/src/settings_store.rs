use std::fs;
use std::io::ErrorKind;
use std::path::{Path, PathBuf};

use crate::error::AppError;
use crate::song_settings::SongSettings;

const SETTINGS_EXTENSION: &str = "json";
const UNREADABLE_EXTENSION: &str = "unreadable.json";
const TEMPORARY_EXTENSION: &str = "json.tmp";

pub struct SettingsStore {
    directory: PathBuf,
}

impl SettingsStore {
    pub fn new(directory: PathBuf) -> Self {
        SettingsStore { directory }
    }

    pub fn load(&self, song_id: &str) -> Result<Option<SongSettings>, AppError> {
        let path = self.path_for(song_id, SETTINGS_EXTENSION);
        let contents = match fs::read_to_string(&path) {
            Ok(contents) => contents,
            Err(error) if error.kind() == ErrorKind::NotFound => return Ok(None),
            Err(error) => return Err(error.into()),
        };
        serde_json::from_str(&contents).map(Some).map_err(|error| {
            self.set_aside_unreadable(&path, song_id);
            AppError::Settings(format!("{} is unreadable and was set aside: {error}", path.display()))
        })
    }

    pub fn save(&self, song_id: &str, settings: &SongSettings) -> Result<(), AppError> {
        fs::create_dir_all(&self.directory)?;
        let json = serde_json::to_string_pretty(settings).map_err(|error| AppError::Settings(error.to_string()))?;
        let temporary_path = self.path_for(song_id, TEMPORARY_EXTENSION);
        fs::write(&temporary_path, json)?;
        fs::rename(&temporary_path, self.path_for(song_id, SETTINGS_EXTENSION))?;
        Ok(())
    }

    fn set_aside_unreadable(&self, path: &Path, song_id: &str) {
        if let Err(error) = fs::rename(path, self.path_for(song_id, UNREADABLE_EXTENSION)) {
            log::error!("could not set aside unreadable settings {}: {error}", path.display());
        }
    }

    fn path_for(&self, song_id: &str, extension: &str) -> PathBuf {
        self.directory.join(format!("{song_id}.{extension}"))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn temporary_store(test_name: &str) -> SettingsStore {
        let directory = std::env::temp_dir().join(format!("rusty-riffs-test-{test_name}-{}", std::process::id()));
        let _ = fs::remove_dir_all(&directory);
        SettingsStore::new(directory)
    }

    #[test]
    fn unknown_song_has_no_settings() {
        let store = temporary_store("unknown");
        assert_eq!(store.load("abc").unwrap(), None);
    }

    #[test]
    fn saved_settings_load_back_unchanged() {
        let store = temporary_store("round-trip");
        let mut settings = SongSettings { song_speed_percent: 65.0, ..Default::default() };
        settings.add_marker(95.0);
        settings.add_loop_from_range(12.5, 20.0);
        store.save("abc", &settings).unwrap();
        assert_eq!(store.load("abc").unwrap(), Some(settings));
    }

    #[test]
    fn unreadable_settings_are_reported_and_set_aside() {
        let store = temporary_store("unreadable");
        fs::create_dir_all(&store.directory).unwrap();
        fs::write(store.path_for("abc", SETTINGS_EXTENSION), "not json").unwrap();
        assert!(matches!(store.load("abc"), Err(AppError::Settings(_))));
        assert!(store.path_for("abc", UNREADABLE_EXTENSION).exists());
        assert_eq!(store.load("abc").unwrap(), None);
    }
}
