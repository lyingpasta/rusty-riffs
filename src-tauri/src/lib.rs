mod audio;
mod commands;
mod engine_sync;
mod error;
mod player;
mod settings_store;
mod song_loader;
mod song_settings;

use std::sync::Mutex;
use std::sync::mpsc;

use tauri::Manager;

use crate::player::Player;
use crate::settings_store::SettingsStore;

const SONG_SETTINGS_DIRECTORY: &str = "songs";

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle()
                    .plugin(tauri_plugin_log::Builder::default().level(log::LevelFilter::Info).build())?;
            }
            let settings_directory = app.path().app_data_dir()?.join(SONG_SETTINGS_DIRECTORY);
            app.manage(SettingsStore::new(settings_directory));
            let (device_event_sender, device_event_receiver) = mpsc::channel();
            app.manage(Mutex::new(Player::new(device_event_sender)?));
            engine_sync::spawn_playhead_updates(app.handle().clone());
            engine_sync::spawn_device_event_handler(app.handle().clone(), device_event_receiver);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::open_song,
            commands::get_state,
            commands::set_playing,
            commands::seek,
            commands::seek_by,
            commands::set_speed,
            commands::set_pitch,
            commands::set_preroll,
            commands::set_trainer,
            commands::set_loop_enabled,
            commands::add_marker,
            commands::rename_marker,
            commands::delete_marker,
            commands::create_loop,
            commands::create_loop_from_range,
            commands::rename_loop,
            commands::delete_loop,
            commands::activate_loop,
        ])
        .run(tauri::generate_context!())
        .expect("error while building tauri application");
}
