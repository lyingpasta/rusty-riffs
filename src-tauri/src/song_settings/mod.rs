mod markers_and_loops;

use serde::{Deserialize, Serialize};

pub use markers_and_loops::{DeletedMarkers, Marker, SavedLoop};

pub const MIN_SPEED_PERCENT: f64 = 10.0;
pub const MAX_SPEED_PERCENT: f64 = 150.0;
pub const MAX_PITCH_SEMITONES: i32 = 12;
pub const MAX_PITCH_CENTS: i32 = 50;
pub const MAX_PREROLL_SECONDS: f64 = 2.0;
const CENTS_PER_SEMITONE: f64 = 100.0;
const DEFAULT_SPEED_PERCENT: f64 = 100.0;
const DEFAULT_TRAINER_STEP_PERCENT: f64 = 5.0;

#[derive(Debug, Clone, Copy, PartialEq, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Pitch {
    pub semitones: i32,
    pub cents: i32,
}

impl Pitch {
    pub fn clamped(self) -> Self {
        Pitch {
            semitones: self.semitones.clamp(-MAX_PITCH_SEMITONES, MAX_PITCH_SEMITONES),
            cents: self.cents.clamp(-MAX_PITCH_CENTS, MAX_PITCH_CENTS),
        }
    }

    pub fn total_semitones(self) -> f64 {
        self.semitones as f64 + self.cents as f64 / CENTS_PER_SEMITONE
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Trainer {
    pub is_enabled: bool,
    pub step_percent: f64,
    pub target_percent: f64,
}

impl Default for Trainer {
    fn default() -> Self {
        Trainer { is_enabled: false, step_percent: DEFAULT_TRAINER_STEP_PERCENT, target_percent: DEFAULT_SPEED_PERCENT }
    }
}

impl Trainer {
    pub fn next_speed(&self, current_percent: f64) -> f64 {
        (current_percent + self.step_percent).min(self.target_percent).max(current_percent)
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct SongSettings {
    #[serde(alias = "speedPercent")]
    pub song_speed_percent: f64,
    pub pitch: Pitch,
    pub is_loop_enabled: bool,
    pub preroll_seconds: f64,
    pub trainer: Trainer,
    pub markers: Vec<Marker>,
    pub loops: Vec<SavedLoop>,
    pub active_loop_id: Option<u32>,
}

impl Default for SongSettings {
    fn default() -> Self {
        SongSettings {
            song_speed_percent: DEFAULT_SPEED_PERCENT,
            pitch: Pitch::default(),
            is_loop_enabled: false,
            preroll_seconds: 0.0,
            trainer: Trainer::default(),
            markers: Vec::new(),
            loops: Vec::new(),
            active_loop_id: None,
        }
    }
}

impl SongSettings {
    pub fn current_speed(&self) -> f64 {
        self.active_loop().map_or(self.song_speed_percent, |active| active.speed_percent)
    }

    pub fn set_current_speed(&mut self, percent: f64) {
        let clamped = percent.clamp(MIN_SPEED_PERCENT, MAX_SPEED_PERCENT);
        match self.active_loop_mut() {
            Some(active) => active.speed_percent = clamped,
            None => self.song_speed_percent = clamped,
        }
    }

    pub fn looping_seconds(&self) -> Option<(f64, f64)> {
        if !self.is_loop_enabled {
            return None;
        }
        self.loop_seconds(self.active_loop()?)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn trainer_adds_step_until_target() {
        let trainer = Trainer { is_enabled: true, step_percent: 5.0, target_percent: 70.0 };
        assert_eq!(trainer.next_speed(60.0), 65.0);
        assert_eq!(trainer.next_speed(68.0), 70.0);
        assert_eq!(trainer.next_speed(70.0), 70.0);
    }

    #[test]
    fn trainer_never_slows_down_when_already_past_target() {
        let trainer = Trainer { is_enabled: true, step_percent: 5.0, target_percent: 70.0 };
        assert_eq!(trainer.next_speed(90.0), 90.0);
    }

    #[test]
    fn pitch_combines_semitones_and_cents() {
        assert_eq!(Pitch { semitones: -2, cents: 25 }.total_semitones(), -1.75);
    }

    #[test]
    fn speed_belongs_to_the_song_without_an_active_loop() {
        let mut settings = SongSettings::default();
        settings.set_current_speed(70.0);
        assert_eq!(settings.song_speed_percent, 70.0);
        assert_eq!(settings.current_speed(), 70.0);
    }

    #[test]
    fn speed_belongs_to_the_active_loop() {
        let mut settings = SongSettings::default();
        let loop_id = settings.add_loop_from_range(1.0, 2.0);
        settings.set_current_speed(55.0);
        assert_eq!(settings.current_speed(), 55.0);
        assert_eq!(settings.song_speed_percent, 100.0);
        settings.activate_loop(None);
        assert_eq!(settings.current_speed(), 100.0);
        settings.activate_loop(Some(loop_id));
        assert_eq!(settings.current_speed(), 55.0);
    }

    #[test]
    fn looping_requires_an_enabled_active_loop() {
        let mut settings = SongSettings::default();
        settings.add_loop_from_range(1.0, 2.0);
        assert_eq!(settings.looping_seconds(), Some((1.0, 2.0)));
        settings.is_loop_enabled = false;
        assert_eq!(settings.looping_seconds(), None);
    }

    #[test]
    fn missing_fields_fall_back_to_defaults_when_loading() {
        let settings: SongSettings = serde_json::from_str(r#"{"songSpeedPercent": 70}"#).unwrap();
        assert_eq!(settings.song_speed_percent, 70.0);
        assert_eq!(settings.loops, vec![]);
    }
}
