use std::path::PathBuf;
use std::sync::Mutex;

use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager, State};

use crate::audio::peaks::{PEAKS_PER_SECOND, compute_peaks};
use crate::error::AppError;
use crate::player::Player;
use crate::settings_store::SettingsStore;
use crate::song_loader::load_song;
use crate::song_settings::{Marker, Pitch, SongSettings, Trainer};

pub const PLAYER_STATE_EVENT: &str = "player-state";

pub type SharedPlayer = Mutex<Player>;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Waveform {
    peaks: Vec<f32>,
    peaks_per_second: u32,
}

pub fn publish_state(app: &AppHandle, player: &Player) {
    save_song_settings(app, player);
    if let Err(error) = app.emit(PLAYER_STATE_EVENT, player.state()) {
        log::error!("could not send player state to the UI: {error}");
    }
}

fn save_song_settings(app: &AppHandle, player: &Player) {
    let Some(song) = player.loaded_song() else {
        return;
    };
    if let Err(error) = app.state::<SettingsStore>().save(&song.id, player.settings()) {
        log::error!("{error}");
    }
}

fn load_song_settings(store: &SettingsStore, song_id: &str) -> SongSettings {
    match store.load(song_id) {
        Ok(settings) => settings.unwrap_or_default(),
        Err(error) => {
            log::error!("{error}; starting with default settings");
            SongSettings::default()
        }
    }
}

fn update_player(
    app: &AppHandle,
    player: &SharedPlayer,
    change: impl FnOnce(&mut Player) -> Result<(), AppError>,
) -> Result<(), AppError> {
    let mut player = player.lock().expect("player lock poisoned");
    change(&mut player)?;
    publish_state(app, &player);
    Ok(())
}

#[tauri::command]
pub async fn open_song(
    app: AppHandle,
    player: State<'_, SharedPlayer>,
    store: State<'_, SettingsStore>,
    path: PathBuf,
) -> Result<Waveform, AppError> {
    let song = tauri::async_runtime::spawn_blocking(move || load_song(&path))
        .await
        .map_err(|error| AppError::Decode(error.to_string()))??;
    let waveform = Waveform { peaks: compute_peaks(&song.audio), peaks_per_second: PEAKS_PER_SECOND };
    let settings = load_song_settings(&store, &song.id);
    update_player(&app, &player, |player| {
        player.load_song(song, settings);
        Ok(())
    })?;
    Ok(waveform)
}

#[tauri::command]
pub fn get_state(player: State<'_, SharedPlayer>) -> crate::player::PlayerState {
    player.lock().expect("player lock poisoned").state()
}

#[tauri::command]
pub fn set_playing(app: AppHandle, player: State<'_, SharedPlayer>, is_playing: bool) -> Result<(), AppError> {
    update_player(&app, &player, |player| player.set_playing(is_playing))
}

#[tauri::command]
pub fn seek(app: AppHandle, player: State<'_, SharedPlayer>, seconds: f64) -> Result<(), AppError> {
    update_player(&app, &player, |player| player.seek(seconds))
}

#[tauri::command]
pub fn seek_by(app: AppHandle, player: State<'_, SharedPlayer>, delta_seconds: f64) -> Result<(), AppError> {
    update_player(&app, &player, |player| player.seek(player.position_seconds()? + delta_seconds))
}

#[tauri::command]
pub fn set_speed(app: AppHandle, player: State<'_, SharedPlayer>, percent: f64) -> Result<(), AppError> {
    update_player(&app, &player, |player| {
        player.set_speed(percent);
        Ok(())
    })
}

#[tauri::command]
pub fn set_pitch(app: AppHandle, player: State<'_, SharedPlayer>, pitch: Pitch) -> Result<(), AppError> {
    update_player(&app, &player, |player| {
        player.set_pitch(pitch);
        Ok(())
    })
}

#[tauri::command]
pub fn set_loop(
    app: AppHandle,
    player: State<'_, SharedPlayer>,
    start_seconds: Option<f64>,
    end_seconds: Option<f64>,
) -> Result<(), AppError> {
    update_player(&app, &player, |player| player.set_loop(start_seconds, end_seconds))
}

#[tauri::command]
pub fn set_loop_enabled(app: AppHandle, player: State<'_, SharedPlayer>, is_enabled: bool) -> Result<(), AppError> {
    update_player(&app, &player, |player| player.set_loop_enabled(is_enabled))
}

#[tauri::command]
pub fn set_preroll(app: AppHandle, player: State<'_, SharedPlayer>, seconds: f64) -> Result<(), AppError> {
    update_player(&app, &player, |player| player.set_preroll(seconds))
}

#[tauri::command]
pub fn set_trainer(app: AppHandle, player: State<'_, SharedPlayer>, trainer: Trainer) -> Result<(), AppError> {
    update_player(&app, &player, |player| {
        player.set_trainer(trainer);
        Ok(())
    })
}

#[tauri::command]
pub fn set_markers(app: AppHandle, player: State<'_, SharedPlayer>, markers: Vec<Marker>) -> Result<(), AppError> {
    update_player(&app, &player, |player| {
        player.set_markers(markers);
        Ok(())
    })
}
