use std::fs;
use std::io::ErrorKind;
use std::path::PathBuf;

use crate::error::AppError;

pub struct LastSongStore {
    file: PathBuf,
}

impl LastSongStore {
    pub fn new(file: PathBuf) -> Self {
        LastSongStore { file }
    }

    pub fn remember(&self, song_path: &std::path::Path) -> Result<(), AppError> {
        if let Some(directory) = self.file.parent() {
            fs::create_dir_all(directory)?;
        }
        fs::write(&self.file, song_path.to_string_lossy().as_bytes())?;
        Ok(())
    }

    pub fn recall(&self) -> Result<Option<PathBuf>, AppError> {
        match fs::read_to_string(&self.file) {
            Ok(contents) if contents.trim().is_empty() => Ok(None),
            Ok(contents) => Ok(Some(PathBuf::from(contents.trim()))),
            Err(error) if error.kind() == ErrorKind::NotFound => Ok(None),
            Err(error) => Err(error.into()),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn temporary_store(test_name: &str) -> LastSongStore {
        let directory = std::env::temp_dir().join(format!("rusty-riffs-last-song-{test_name}-{}", std::process::id()));
        let _ = fs::remove_dir_all(&directory);
        LastSongStore::new(directory.join("last-song.txt"))
    }

    #[test]
    fn nothing_is_recalled_before_a_song_was_opened() {
        assert_eq!(temporary_store("empty").recall().unwrap(), None);
    }

    #[test]
    fn recalls_the_last_remembered_song() {
        let store = temporary_store("round-trip");
        store.remember(std::path::Path::new("/music/first.mp3")).unwrap();
        store.remember(std::path::Path::new("/music/second song.flac")).unwrap();
        assert_eq!(store.recall().unwrap(), Some(PathBuf::from("/music/second song.flac")));
    }
}
