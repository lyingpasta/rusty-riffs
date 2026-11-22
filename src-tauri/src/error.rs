use std::fmt;

#[derive(Debug)]
pub enum AppError {
    Io(std::io::Error),
    Decode(String),
    AudioOutput(String),
    NoSongLoaded,
    Settings(String),
}

impl fmt::Display for AppError {
    fn fmt(&self, formatter: &mut fmt::Formatter) -> fmt::Result {
        match self {
            AppError::Io(error) => write!(formatter, "file error: {error}"),
            AppError::Decode(message) => write!(formatter, "could not decode audio: {message}"),
            AppError::AudioOutput(message) => write!(formatter, "audio output error: {message}"),
            AppError::NoSongLoaded => write!(formatter, "no song is loaded"),
            AppError::Settings(message) => write!(formatter, "could not save song settings: {message}"),
        }
    }
}

impl std::error::Error for AppError {}

impl From<std::io::Error> for AppError {
    fn from(error: std::io::Error) -> Self {
        AppError::Io(error)
    }
}

impl serde::Serialize for AppError {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        serializer.serialize_str(&self.to_string())
    }
}
