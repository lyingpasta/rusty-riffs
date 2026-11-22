use std::path::PathBuf;
use std::sync::Mutex;

use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager, State};

use crate::audio::peaks::{PEAKS_PER_SECOND, compute_peaks};
use crate::error::AppError;
use crate::player::Player;
use crate::settings_store::SettingsStore;
use crate::song_loader::load_song;
use crate::song_settings::{Pitch, SongSettings, Trainer};

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
        Ok(settings) => settings.unwrap_or_default().repaired(),
        Err(error) => {
            log::error!("{error}; starting with default settings");
            SongSettings::default()
        }
    }
}

fn update_player<R>(
    app: &AppHandle,
    player: &SharedPlayer,
    change: impl FnOnce(&mut Player) -> Result<R, AppError>,
) -> Result<R, AppError> {
    let mut player = player.lock().expect("player lock poisoned");
    let result = change(&mut player)?;
    publish_state(app, &player);
    Ok(result)
}

fn change_settings<R>(
    app: &AppHandle,
    player: &SharedPlayer,
    change: impl FnOnce(&mut SongSettings) -> R,
) -> Result<R, AppError> {
    update_player(app, player, |player| player.change_settings(change))
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
    update_player(&app, &player, |player| player.set_speed(percent))
}

#[tauri::command]
pub fn set_pitch(app: AppHandle, player: State<'_, SharedPlayer>, pitch: Pitch) -> Result<(), AppError> {
    update_player(&app, &player, |player| player.set_pitch(pitch))
}

#[tauri::command]
pub fn set_preroll(app: AppHandle, player: State<'_, SharedPlayer>, seconds: f64) -> Result<(), AppError> {
    update_player(&app, &player, |player| player.set_preroll(seconds))
}

#[tauri::command]
pub fn set_trainer(app: AppHandle, player: State<'_, SharedPlayer>, trainer: Trainer) -> Result<(), AppError> {
    update_player(&app, &player, |player| player.set_trainer(trainer))
}

#[tauri::command]
pub fn set_loop_enabled(app: AppHandle, player: State<'_, SharedPlayer>, is_enabled: bool) -> Result<(), AppError> {
    change_settings(&app, &player, |settings| settings.is_loop_enabled = is_enabled && settings.active_loop_id.is_some())
}

#[tauri::command]
pub fn add_marker(app: AppHandle, player: State<'_, SharedPlayer>, seconds: f64) -> Result<u32, AppError> {
    change_settings(&app, &player, |settings| settings.add_marker(seconds))
}

#[tauri::command]
pub fn rename_marker(app: AppHandle, player: State<'_, SharedPlayer>, marker_id: u32, name: String) -> Result<(), AppError> {
    change_settings(&app, &player, |settings| settings.rename_marker(marker_id, name))
}

#[tauri::command]
pub fn delete_marker(app: AppHandle, player: State<'_, SharedPlayer>, marker_id: u32) -> Result<Vec<String>, AppError> {
    change_settings(&app, &player, |settings| settings.delete_marker(marker_id))
}

#[tauri::command]
pub fn create_loop(
    app: AppHandle,
    player: State<'_, SharedPlayer>,
    start_marker_id: u32,
    end_marker_id: u32,
) -> Result<u32, AppError> {
    update_player(&app, &player, |player| {
        let loop_id = player
            .change_settings(|settings| settings.add_loop(start_marker_id, end_marker_id))?
            .ok_or(AppError::InvalidRequest("a loop's end marker must come after its start marker".into()))?;
        player.seek_to_active_loop_start()?;
        Ok(loop_id)
    })
}

#[tauri::command]
pub fn create_loop_from_range(
    app: AppHandle,
    player: State<'_, SharedPlayer>,
    start_seconds: f64,
    end_seconds: f64,
) -> Result<u32, AppError> {
    change_settings(&app, &player, |settings| settings.add_loop_from_range(start_seconds, end_seconds))
}

#[tauri::command]
pub fn rename_loop(app: AppHandle, player: State<'_, SharedPlayer>, loop_id: u32, name: String) -> Result<(), AppError> {
    change_settings(&app, &player, |settings| settings.rename_loop(loop_id, name))
}

#[tauri::command]
pub fn delete_loop(app: AppHandle, player: State<'_, SharedPlayer>, loop_id: u32) -> Result<(), AppError> {
    change_settings(&app, &player, |settings| settings.delete_loop(loop_id))
}

#[tauri::command]
pub fn activate_loop(app: AppHandle, player: State<'_, SharedPlayer>, loop_id: Option<u32>) -> Result<(), AppError> {
    update_player(&app, &player, |player| player.activate_loop(loop_id))
}
