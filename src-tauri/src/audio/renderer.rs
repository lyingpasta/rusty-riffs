use std::sync::Arc;
use std::sync::atomic::{AtomicU64, Ordering};

use signalsmith_stretch::Stretch;

use crate::audio::STEREO_CHANNELS;
use crate::audio::decode::DecodedAudio;
use crate::audio::transport::{LoopRegion, ReadOutcome, Transport};

const NORMAL_SPEED_PERCENT: f64 = 100.0;
const SEMITONES_PER_OCTAVE: f64 = 12.0;
const RESERVED_INPUT_SAMPLES: usize = 1 << 16;

pub enum EngineCommand {
    LoadSong(Arc<DecodedAudio>),
    Play,
    Pause,
    Seek(usize),
    SetSpeed(f64),
    SetPitch(f64),
    SetLoop(Option<LoopRegion>),
    SetPreroll(usize),
}

#[derive(Default)]
pub struct EngineFeedback {
    position_frame: AtomicU64,
    loops_completed: AtomicU64,
    song_endings: AtomicU64,
}

impl EngineFeedback {
    pub fn position_frame(&self) -> usize {
        self.position_frame.load(Ordering::Relaxed) as usize
    }

    pub fn loops_completed(&self) -> u64 {
        self.loops_completed.load(Ordering::Relaxed)
    }

    pub fn song_endings(&self) -> u64 {
        self.song_endings.load(Ordering::Relaxed)
    }

    fn publish_position(&self, renderer: &Renderer) {
        let heard_position = renderer.transport.position().saturating_sub(renderer.latency_in_song_frames());
        self.position_frame.store(heard_position as u64, Ordering::Relaxed);
    }

    fn publish_outcome(&self, outcome: &ReadOutcome) {
        self.loops_completed.fetch_add(outcome.loops_completed as u64, Ordering::Relaxed);
        if outcome.reached_end {
            self.song_endings.fetch_add(1, Ordering::Relaxed);
        }
    }
}

pub struct Renderer {
    song: Option<Arc<DecodedAudio>>,
    transport: Transport,
    stretch: Stretch,
    device_sample_rate: u32,
    device_latency_frames: usize,
    song_frames_since_seek: usize,
    is_playing: bool,
    speed_percent: f64,
    pitch_semitones: f64,
    input_buffer: Vec<f32>,
    fractional_input_frames: f64,
    feedback: Arc<EngineFeedback>,
}

impl Renderer {
    pub fn new(device_sample_rate: u32, feedback: Arc<EngineFeedback>) -> Self {
        let renderer = Renderer {
            song: None,
            transport: Transport::default(),
            stretch: Stretch::preset_default(STEREO_CHANNELS as u32, device_sample_rate),
            device_sample_rate,
            device_latency_frames: 0,
            song_frames_since_seek: 0,
            is_playing: false,
            speed_percent: NORMAL_SPEED_PERCENT,
            pitch_semitones: 0.0,
            input_buffer: Vec::with_capacity(RESERVED_INPUT_SAMPLES),
            fractional_input_frames: 0.0,
            feedback,
        };
        renderer.feedback.publish_position(&renderer);
        renderer
    }

    pub fn apply(&mut self, command: EngineCommand) {
        match command {
            EngineCommand::LoadSong(song) => self.load_song(song),
            EngineCommand::Play => self.is_playing = self.song.is_some(),
            EngineCommand::Pause => self.is_playing = false,
            EngineCommand::Seek(frame) => self.seek(frame),
            EngineCommand::SetSpeed(percent) => self.speed_percent = percent,
            EngineCommand::SetPitch(semitones) => self.set_pitch(semitones),
            EngineCommand::SetLoop(region) => self.transport.set_loop(region),
            EngineCommand::SetPreroll(frames) => self.transport.set_preroll_frames(frames),
        }
        self.feedback.publish_position(self);
    }

    pub fn set_device_latency_frames(&mut self, frames: usize) {
        self.device_latency_frames = frames;
    }

    fn latency_in_song_frames(&self) -> usize {
        let Some(song) = &self.song else {
            return 0;
        };
        let pending_output_frames = (self.device_latency_frames + self.stretch.output_latency()) as f64;
        let song_frames_per_output_frame = self.speed_percent / NORMAL_SPEED_PERCENT * song.sample_rate as f64
            / self.device_sample_rate as f64;
        let pipeline_latency =
            self.stretch.input_latency() + (pending_output_frames * song_frames_per_output_frame).round() as usize;
        pipeline_latency.min(self.song_frames_since_seek)
    }

    pub fn render(&mut self, output: &mut [f32]) {
        let Some(song) = self.song.clone().filter(|_| self.is_playing) else {
            output.fill(0.0);
            return;
        };
        let input_frames = self.take_input_frame_count(output.len() / STEREO_CHANNELS, song.sample_rate);
        self.input_buffer.resize(input_frames * STEREO_CHANNELS, 0.0);
        let outcome = self.transport.read(&song.stereo_samples, &mut self.input_buffer);
        self.song_frames_since_seek += input_frames;
        self.stretch.process(&self.input_buffer, &mut *output);
        if outcome.reached_end {
            self.is_playing = false;
        }
        self.feedback.publish_outcome(&outcome);
        self.feedback.publish_position(self);
    }

    fn load_song(&mut self, song: Arc<DecodedAudio>) {
        self.song = Some(song);
        self.is_playing = false;
        self.transport = Transport::default();
        self.stretch.reset();
        self.song_frames_since_seek = 0;
        self.apply_transpose();
    }

    fn seek(&mut self, frame: usize) {
        self.transport.seek(frame);
        self.stretch.reset();
        self.song_frames_since_seek = 0;
    }

    fn set_pitch(&mut self, semitones: f64) {
        self.pitch_semitones = semitones;
        self.apply_transpose();
    }

    fn apply_transpose(&mut self) {
        let Some(song) = &self.song else {
            return;
        };
        let sample_rate_correction = song.sample_rate as f64 / self.device_sample_rate as f64;
        let pitch_factor = 2f64.powf(self.pitch_semitones / SEMITONES_PER_OCTAVE);
        self.stretch.set_transpose_factor((pitch_factor * sample_rate_correction) as f32, None);
    }

    fn take_input_frame_count(&mut self, output_frames: usize, song_sample_rate: u32) -> usize {
        let rate_ratio = song_sample_rate as f64 / self.device_sample_rate as f64;
        let speed_ratio = self.speed_percent / NORMAL_SPEED_PERCENT;
        let exact_frames = output_frames as f64 * speed_ratio * rate_ratio + self.fractional_input_frames;
        let whole_frames = exact_frames.floor();
        self.fractional_input_frames = exact_frames - whole_frames;
        whole_frames as usize
    }

}

#[cfg(test)]
mod tests {
    use super::*;

    const SAMPLE_RATE: u32 = 44_100;
    const BLOCK_FRAMES: usize = 512;

    fn sine_song(frequency: f64, seconds: f64) -> Arc<DecodedAudio> {
        let frame_count = (SAMPLE_RATE as f64 * seconds) as usize;
        let stereo_samples = (0..frame_count)
            .flat_map(|frame| {
                let value = (2.0 * std::f64::consts::PI * frequency * frame as f64 / SAMPLE_RATE as f64).sin() as f32;
                [value, value]
            })
            .collect();
        Arc::new(DecodedAudio { sample_rate: SAMPLE_RATE, stereo_samples })
    }

    fn render_seconds(renderer: &mut Renderer, device_sample_rate: u32, seconds: f64) -> Vec<f32> {
        let block_count = (device_sample_rate as f64 * seconds) as usize / BLOCK_FRAMES;
        let mut rendered = Vec::new();
        let mut block = vec![0.0; BLOCK_FRAMES * STEREO_CHANNELS];
        for _ in 0..block_count {
            renderer.render(&mut block);
            rendered.extend_from_slice(&block);
        }
        rendered
    }

    fn estimate_frequency(stereo: &[f32], sample_rate: u32) -> f64 {
        let left: Vec<f32> = stereo.iter().step_by(STEREO_CHANNELS).copied().collect();
        let settled = &left[left.len() / 2..];
        let rising_crossings = settled.windows(2).filter(|pair| pair[0] < 0.0 && pair[1] >= 0.0).count();
        rising_crossings as f64 * sample_rate as f64 / settled.len() as f64
    }

    fn playing_renderer(device_sample_rate: u32, song: Arc<DecodedAudio>) -> Renderer {
        let mut renderer = Renderer::new(device_sample_rate, Arc::new(EngineFeedback::default()));
        renderer.apply(EngineCommand::LoadSong(song));
        renderer.apply(EngineCommand::Play);
        renderer
    }

    #[test]
    fn slowing_down_keeps_the_pitch() {
        let mut renderer = playing_renderer(SAMPLE_RATE, sine_song(440.0, 4.0));
        renderer.apply(EngineCommand::SetSpeed(25.0));
        let output = render_seconds(&mut renderer, SAMPLE_RATE, 2.0);
        let frequency = estimate_frequency(&output, SAMPLE_RATE);
        assert!((frequency - 440.0).abs() < 5.0, "got {frequency} Hz");
    }

    #[test]
    fn slowing_down_advances_the_song_proportionally() {
        let mut renderer = playing_renderer(SAMPLE_RATE, sine_song(440.0, 4.0));
        renderer.apply(EngineCommand::SetSpeed(50.0));
        render_seconds(&mut renderer, SAMPLE_RATE, 2.0);
        let advanced_seconds = renderer.transport.position() as f64 / SAMPLE_RATE as f64;
        assert!((advanced_seconds - 1.0).abs() < 0.02, "advanced {advanced_seconds} s");
    }

    #[test]
    fn device_sample_rate_does_not_change_the_pitch() {
        let device_sample_rate = 48_000;
        let mut renderer = playing_renderer(device_sample_rate, sine_song(440.0, 4.0));
        let output = render_seconds(&mut renderer, device_sample_rate, 2.0);
        let frequency = estimate_frequency(&output, device_sample_rate);
        assert!((frequency - 440.0).abs() < 5.0, "got {frequency} Hz");
    }

    #[test]
    fn shifting_up_an_octave_doubles_the_frequency() {
        let mut renderer = playing_renderer(SAMPLE_RATE, sine_song(220.0, 4.0));
        renderer.apply(EngineCommand::SetPitch(12.0));
        let output = render_seconds(&mut renderer, SAMPLE_RATE, 2.0);
        let frequency = estimate_frequency(&output, SAMPLE_RATE);
        assert!((frequency - 440.0).abs() < 5.0, "got {frequency} Hz");
    }

    #[test]
    fn reported_position_is_what_is_heard_after_output_delays() {
        let mut renderer = playing_renderer(SAMPLE_RATE, sine_song(440.0, 4.0));
        renderer.apply(EngineCommand::SetSpeed(50.0));
        let device_latency_frames = 2205;
        renderer.set_device_latency_frames(device_latency_frames);
        render_seconds(&mut renderer, SAMPLE_RATE, 1.0);
        let pending_output_frames = device_latency_frames + renderer.stretch.output_latency();
        let expected_lag = renderer.stretch.input_latency() + pending_output_frames / 2;
        let lag = renderer.transport.position() - renderer.feedback.position_frame();
        assert!(lag.abs_diff(expected_lag) <= 1, "lag {lag}, expected {expected_lag}");
    }

    #[test]
    fn position_is_the_seek_target_until_audio_has_flowed() {
        let mut renderer = playing_renderer(SAMPLE_RATE, sine_song(440.0, 4.0));
        renderer.set_device_latency_frames(2205);
        render_seconds(&mut renderer, SAMPLE_RATE, 1.0);
        renderer.apply(EngineCommand::Seek(44_100));
        assert_eq!(renderer.feedback.position_frame(), 44_100);
        renderer.apply(EngineCommand::Pause);
        render_seconds(&mut renderer, SAMPLE_RATE, 0.5);
        assert_eq!(renderer.feedback.position_frame(), 44_100);
    }

    #[test]
    fn stops_playing_at_the_end_of_the_song() {
        let mut renderer = playing_renderer(SAMPLE_RATE, sine_song(440.0, 0.5));
        render_seconds(&mut renderer, SAMPLE_RATE, 1.0);
        assert!(!renderer.is_playing);
        assert_eq!(renderer.feedback.song_endings(), 1);
    }
}
