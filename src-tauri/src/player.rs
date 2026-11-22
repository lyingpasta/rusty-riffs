use std::sync::Arc;
use std::sync::mpsc::Sender;

use serde::Serialize;

use crate::audio::decode::DecodedAudio;
use crate::audio::output::{AudioOutput, DeviceEvent, start_audio_output};
use crate::audio::renderer::EngineCommand;
use crate::audio::transport::LoopRegion;
use crate::error::AppError;
use crate::song_settings::{
    MAX_PREROLL_SECONDS, MAX_SPEED_PERCENT, MIN_SPEED_PERCENT, Marker, Pitch, SongSettings, Trainer,
};

pub struct LoadedSong {
    pub id: String,
    pub name: String,
    pub audio: Arc<DecodedAudio>,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SongInfo {
    pub id: String,
    pub name: String,
    pub duration_seconds: f64,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct PlayerState {
    pub song: Option<SongInfo>,
    pub is_playing: bool,
    pub settings: SongSettings,
}

#[derive(Default)]
pub struct EngineSync {
    pub position_seconds: Option<f64>,
    pub has_state_changed: bool,
}

pub struct Player {
    output: AudioOutput,
    device_events: Sender<DeviceEvent>,
    song: Option<LoadedSong>,
    settings: SongSettings,
    is_playing: bool,
    seen_loops_completed: u64,
    seen_song_endings: u64,
}

impl Player {
    pub fn new(device_events: Sender<DeviceEvent>) -> Result<Self, AppError> {
        let output = start_audio_output(device_events.clone())?;
        Ok(Player {
            output,
            device_events,
            song: None,
            settings: SongSettings::default(),
            is_playing: false,
            seen_loops_completed: 0,
            seen_song_endings: 0,
        })
    }

    pub fn state(&self) -> PlayerState {
        PlayerState {
            song: self.song.as_ref().map(|song| SongInfo {
                id: song.id.clone(),
                name: song.name.clone(),
                duration_seconds: song.audio.duration_seconds(),
            }),
            is_playing: self.is_playing,
            settings: self.settings.clone(),
        }
    }

    pub fn loaded_song(&self) -> Option<&LoadedSong> {
        self.song.as_ref()
    }

    pub fn settings(&self) -> &SongSettings {
        &self.settings
    }

    pub fn load_song(&mut self, song: LoadedSong, settings: SongSettings) {
        self.output.send(EngineCommand::LoadSong(song.audio.clone()));
        self.song = Some(song);
        self.settings = settings;
        self.is_playing = false;
        self.send_all_settings();
    }

    pub fn restart_output(&mut self) -> Result<(), AppError> {
        self.output = start_audio_output(self.device_events.clone())?;
        self.is_playing = false;
        self.seen_loops_completed = 0;
        self.seen_song_endings = 0;
        if let Some(song) = &self.song {
            self.output.send(EngineCommand::LoadSong(song.audio.clone()));
            self.send_all_settings();
        }
        Ok(())
    }

    pub fn set_playing(&mut self, is_playing: bool) -> Result<(), AppError> {
        self.require_song()?;
        self.is_playing = is_playing;
        self.output.send(if is_playing { EngineCommand::Play } else { EngineCommand::Pause });
        Ok(())
    }

    pub fn seek(&mut self, seconds: f64) -> Result<(), AppError> {
        let duration = self.require_song()?.audio.duration_seconds();
        let frame = self.seconds_to_frame(seconds.clamp(0.0, duration))?;
        self.output.send(EngineCommand::Seek(frame));
        Ok(())
    }

    pub fn position_seconds(&self) -> Result<f64, AppError> {
        let sample_rate = self.require_song()?.audio.sample_rate;
        Ok(self.output.feedback.position_frame() as f64 / sample_rate as f64)
    }

    pub fn set_speed(&mut self, percent: f64) {
        self.settings.trainer.is_enabled = false;
        self.apply_speed(percent);
    }

    pub fn set_pitch(&mut self, pitch: Pitch) {
        self.settings.pitch = pitch.clamped();
        self.output.send(EngineCommand::SetPitch(self.settings.pitch.total_semitones()));
    }

    pub fn set_loop(&mut self, start_seconds: Option<f64>, end_seconds: Option<f64>) -> Result<(), AppError> {
        self.require_song()?;
        self.settings.loop_start_seconds = start_seconds;
        self.settings.loop_end_seconds = end_seconds;
        self.settings.trainer.is_enabled = false;
        if start_seconds.is_some() && end_seconds.is_some() {
            self.settings.is_loop_enabled = true;
        }
        self.send_loop()
    }

    pub fn set_loop_enabled(&mut self, is_enabled: bool) -> Result<(), AppError> {
        self.settings.is_loop_enabled = is_enabled;
        self.send_loop()
    }

    pub fn set_preroll(&mut self, seconds: f64) -> Result<(), AppError> {
        self.settings.preroll_seconds = seconds.clamp(0.0, MAX_PREROLL_SECONDS);
        self.send_preroll()
    }

    pub fn set_trainer(&mut self, trainer: Trainer) {
        self.settings.trainer = Trainer {
            step_percent: trainer.step_percent.max(0.0),
            target_percent: trainer.target_percent.clamp(MIN_SPEED_PERCENT, MAX_SPEED_PERCENT),
            ..trainer
        };
    }

    pub fn set_markers(&mut self, mut markers: Vec<Marker>) {
        markers.sort_by(|left, right| left.seconds.total_cmp(&right.seconds));
        self.settings.markers = markers;
    }

    pub fn sync_with_engine(&mut self) -> EngineSync {
        if self.song.is_none() {
            return EngineSync::default();
        }
        let has_state_changed = self.handle_song_endings() | self.handle_completed_loops();
        EngineSync { position_seconds: self.position_seconds().ok(), has_state_changed }
    }

    fn handle_song_endings(&mut self) -> bool {
        let song_endings = self.output.feedback.song_endings();
        let has_ended = song_endings != self.seen_song_endings;
        self.seen_song_endings = song_endings;
        if has_ended {
            self.is_playing = false;
        }
        has_ended
    }

    fn handle_completed_loops(&mut self) -> bool {
        let loops_completed = self.output.feedback.loops_completed();
        let new_loops = loops_completed - self.seen_loops_completed;
        self.seen_loops_completed = loops_completed;
        if new_loops == 0 || !self.settings.trainer.is_enabled {
            return false;
        }
        let trainer = self.settings.trainer;
        let next_speed = (0..new_loops).fold(self.settings.speed_percent, |speed, _| trainer.next_speed(speed));
        self.apply_speed(next_speed);
        true
    }

    fn apply_speed(&mut self, percent: f64) {
        self.settings.speed_percent = percent.clamp(MIN_SPEED_PERCENT, MAX_SPEED_PERCENT);
        self.output.send(EngineCommand::SetSpeed(self.settings.speed_percent));
    }

    fn send_all_settings(&mut self) {
        self.output.send(EngineCommand::SetSpeed(self.settings.speed_percent));
        self.output.send(EngineCommand::SetPitch(self.settings.pitch.total_semitones()));
        if let Err(error) = self.send_loop().and_then(|_| self.send_preroll()) {
            log::error!("could not apply song settings: {error}");
        }
    }

    fn send_loop(&self) -> Result<(), AppError> {
        let region = match self.settings.active_loop_seconds() {
            Some((start, end)) => Some(LoopRegion {
                start_frame: self.seconds_to_frame(start)?,
                end_frame: self.seconds_to_frame(end)?,
            }),
            None => None,
        };
        self.output.send(EngineCommand::SetLoop(region));
        Ok(())
    }

    fn send_preroll(&self) -> Result<(), AppError> {
        let frames = self.seconds_to_frame(self.settings.preroll_seconds)?;
        self.output.send(EngineCommand::SetPreroll(frames));
        Ok(())
    }

    fn seconds_to_frame(&self, seconds: f64) -> Result<usize, AppError> {
        let sample_rate = self.require_song()?.audio.sample_rate;
        Ok((seconds.max(0.0) * sample_rate as f64).round() as usize)
    }

    fn require_song(&self) -> Result<&LoadedSong, AppError> {
        self.song.as_ref().ok_or(AppError::NoSongLoaded)
    }
}
