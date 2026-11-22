use std::path::Path;
use std::sync::Arc;

use crate::audio::decode::decode_file;
use crate::error::AppError;
use crate::player::LoadedSong;

pub fn load_song(path: &Path) -> Result<LoadedSong, AppError> {
    let id = hash_file(path)?;
    let audio = decode_file(path)?;
    let name = path
        .file_stem()
        .map(|stem| stem.to_string_lossy().into_owned())
        .unwrap_or_else(|| path.display().to_string());
    Ok(LoadedSong { id, name, audio: Arc::new(audio) })
}

fn hash_file(path: &Path) -> Result<String, AppError> {
    let mut hasher = blake3::Hasher::new();
    hasher.update_mmap(path)?;
    Ok(hasher.finalize().to_hex().to_string())
}
