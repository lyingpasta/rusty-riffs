mod audio;
mod commands;
mod engine_sync;
mod error;
mod player;
mod song_loader;
mod song_settings;

use std::sync::Mutex;
use std::sync::mpsc;

use tauri::Manager;

use crate::player::Player;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle()
                    .plugin(tauri_plugin_log::Builder::default().level(log::LevelFilter::Info).build())?;
            }
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
            commands::set_loop,
            commands::set_loop_enabled,
            commands::set_preroll,
            commands::set_trainer,
            commands::set_markers,
        ])
        .run(tauri::generate_context!())
        .expect("error while building tauri application");
}
