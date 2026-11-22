use std::sync::mpsc::Receiver;
use std::thread;
use std::time::Duration;

use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager};

use crate::audio::output::DeviceEvent;
use crate::commands::{SharedPlayer, publish_state};

const PLAYHEAD_EVENT: &str = "playhead";
const PLAYHEAD_INTERVAL: Duration = Duration::from_millis(33);

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct Playhead {
    seconds: f64,
}

pub fn spawn_playhead_updates(app: AppHandle) {
    thread::spawn(move || {
        loop {
            thread::sleep(PLAYHEAD_INTERVAL);
            send_playhead(&app);
        }
    });
}

fn send_playhead(app: &AppHandle) {
    let player_state = app.state::<SharedPlayer>();
    let mut player = player_state.lock().expect("player lock poisoned");
    let sync = player.sync_with_engine();
    if sync.has_state_changed {
        publish_state(app, &player);
    }
    let Some(seconds) = sync.position_seconds else {
        return;
    };
    if let Err(error) = app.emit(PLAYHEAD_EVENT, Playhead { seconds }) {
        log::error!("could not send playhead to the UI: {error}");
    }
}

pub fn spawn_device_event_handler(app: AppHandle, device_events: Receiver<DeviceEvent>) {
    thread::spawn(move || {
        for event in device_events {
            handle_device_event(&app, event);
        }
    });
}

fn handle_device_event(app: &AppHandle, event: DeviceEvent) {
    let player_state = app.state::<SharedPlayer>();
    let mut player = player_state.lock().expect("player lock poisoned");
    let result = match event {
        DeviceEvent::Rerouted => player.set_playing(false),
        DeviceEvent::Lost => player.restart_output(),
    };
    if let Err(error) = result {
        log::error!("could not recover from audio device change: {error}");
    }
    publish_state(app, &player);
}
