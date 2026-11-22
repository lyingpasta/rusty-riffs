use serde::{Deserialize, Serialize};

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
#[serde(rename_all = "camelCase")]
pub struct Marker {
    pub name: String,
    pub seconds: f64,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct SongSettings {
    pub speed_percent: f64,
    pub pitch: Pitch,
    pub loop_start_seconds: Option<f64>,
    pub loop_end_seconds: Option<f64>,
    pub is_loop_enabled: bool,
    pub preroll_seconds: f64,
    pub trainer: Trainer,
    pub markers: Vec<Marker>,
}

impl Default for SongSettings {
    fn default() -> Self {
        SongSettings {
            speed_percent: DEFAULT_SPEED_PERCENT,
            pitch: Pitch::default(),
            loop_start_seconds: None,
            loop_end_seconds: None,
            is_loop_enabled: false,
            preroll_seconds: 0.0,
            trainer: Trainer::default(),
            markers: Vec::new(),
        }
    }
}

impl SongSettings {
    pub fn active_loop_seconds(&self) -> Option<(f64, f64)> {
        let (start, end) = (self.loop_start_seconds?, self.loop_end_seconds?);
        (self.is_loop_enabled && start < end).then_some((start, end))
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
    fn loop_is_active_only_when_enabled_and_ordered() {
        let mut settings = SongSettings { loop_start_seconds: Some(1.0), loop_end_seconds: Some(2.0), ..Default::default() };
        assert_eq!(settings.active_loop_seconds(), None);
        settings.is_loop_enabled = true;
        assert_eq!(settings.active_loop_seconds(), Some((1.0, 2.0)));
        settings.loop_end_seconds = Some(0.5);
        assert_eq!(settings.active_loop_seconds(), None);
    }

    #[test]
    fn missing_fields_fall_back_to_defaults_when_loading() {
        let settings: SongSettings = serde_json::from_str(r#"{"speedPercent": 70}"#).unwrap();
        assert_eq!(settings.speed_percent, 70.0);
        assert_eq!(settings.markers, vec![]);
    }
}
