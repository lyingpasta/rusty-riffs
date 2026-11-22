use crate::audio::STEREO_CHANNELS;

const LOOP_CROSSFADE_FRAMES: usize = 256;

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct LoopRegion {
    pub start_frame: usize,
    pub end_frame: usize,
}

#[derive(Debug, Default, PartialEq)]
pub struct ReadOutcome {
    pub loops_completed: u32,
    pub reached_end: bool,
}

struct Crossfade {
    fading_out_from: usize,
    frames_done: usize,
}

#[derive(Default)]
pub struct Transport {
    position: usize,
    loop_region: Option<LoopRegion>,
    preroll_frames: usize,
    crossfade: Option<Crossfade>,
}

impl Transport {
    pub fn position(&self) -> usize {
        self.position
    }

    pub fn seek(&mut self, frame: usize) {
        self.position = frame;
        self.crossfade = None;
    }

    pub fn set_loop(&mut self, loop_region: Option<LoopRegion>) {
        self.loop_region = loop_region;
    }

    pub fn set_preroll_frames(&mut self, preroll_frames: usize) {
        self.preroll_frames = preroll_frames;
    }

    pub fn read(&mut self, source: &[f32], output: &mut [f32]) -> ReadOutcome {
        let mut outcome = ReadOutcome::default();
        let source_frames = source.len() / STEREO_CHANNELS;
        for output_frame in output.chunks_exact_mut(STEREO_CHANNELS) {
            if self.position >= source_frames {
                output_frame.fill(0.0);
                outcome.reached_end = true;
                continue;
            }
            self.write_frame(source, output_frame);
            self.position += 1;
            if self.has_reached_loop_end() {
                self.restart_loop();
                outcome.loops_completed += 1;
            }
        }
        outcome
    }

    fn write_frame(&mut self, source: &[f32], output_frame: &mut [f32]) {
        let incoming = frame_at(source, self.position);
        let Some(crossfade) = &mut self.crossfade else {
            output_frame.copy_from_slice(&incoming);
            return;
        };
        let fade_in = crossfade.frames_done as f32 / LOOP_CROSSFADE_FRAMES as f32;
        let outgoing = frame_at(source, crossfade.fading_out_from + crossfade.frames_done);
        for channel in 0..STEREO_CHANNELS {
            output_frame[channel] = incoming[channel] * fade_in + outgoing[channel] * (1.0 - fade_in);
        }
        crossfade.frames_done += 1;
        if crossfade.frames_done == LOOP_CROSSFADE_FRAMES {
            self.crossfade = None;
        }
    }

    fn has_reached_loop_end(&self) -> bool {
        self.loop_region.is_some_and(|region| self.position == region.end_frame)
    }

    fn restart_loop(&mut self) {
        let Some(region) = self.loop_region else {
            return;
        };
        self.crossfade = Some(Crossfade { fading_out_from: self.position, frames_done: 0 });
        self.position = region.start_frame.saturating_sub(self.preroll_frames);
    }
}

fn frame_at(source: &[f32], frame: usize) -> [f32; STEREO_CHANNELS] {
    let index = frame * STEREO_CHANNELS;
    match source.get(index..index + STEREO_CHANNELS) {
        Some(samples) => [samples[0], samples[1]],
        None => [0.0; STEREO_CHANNELS],
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn ramp_source(frame_count: usize) -> Vec<f32> {
        (0..frame_count).flat_map(|frame| [frame as f32, frame as f32]).collect()
    }

    fn read_frames(transport: &mut Transport, source: &[f32], frame_count: usize) -> (Vec<f32>, ReadOutcome) {
        let mut output = vec![0.0; frame_count * STEREO_CHANNELS];
        let outcome = transport.read(source, &mut output);
        (output, outcome)
    }

    #[test]
    fn plays_source_in_order() {
        let source = ramp_source(10);
        let mut transport = Transport::default();
        let (output, outcome) = read_frames(&mut transport, &source, 3);
        assert_eq!(output, vec![0.0, 0.0, 1.0, 1.0, 2.0, 2.0]);
        assert_eq!(outcome, ReadOutcome::default());
        assert_eq!(transport.position(), 3);
    }

    #[test]
    fn reports_end_and_writes_silence_past_the_last_frame() {
        let source = ramp_source(2);
        let mut transport = Transport::default();
        let (output, outcome) = read_frames(&mut transport, &source, 3);
        assert_eq!(output, vec![0.0, 0.0, 1.0, 1.0, 0.0, 0.0]);
        assert!(outcome.reached_end);
    }

    #[test]
    fn wraps_to_loop_start_when_crossing_loop_end() {
        let source = ramp_source(2000);
        let mut transport = Transport::default();
        transport.set_loop(Some(LoopRegion { start_frame: 100, end_frame: 1000 }));
        transport.seek(990);
        let (_, outcome) = read_frames(&mut transport, &source, 20);
        assert_eq!(outcome.loops_completed, 1);
        assert_eq!(transport.position(), 110);
    }

    #[test]
    fn restarts_before_loop_start_by_the_preroll() {
        let source = ramp_source(2000);
        let mut transport = Transport::default();
        transport.set_loop(Some(LoopRegion { start_frame: 500, end_frame: 1000 }));
        transport.set_preroll_frames(200);
        transport.seek(999);
        read_frames(&mut transport, &source, 1);
        assert_eq!(transport.position(), 300);
    }

    #[test]
    fn seeking_past_loop_end_plays_on_without_looping() {
        let source = ramp_source(2000);
        let mut transport = Transport::default();
        transport.set_loop(Some(LoopRegion { start_frame: 100, end_frame: 1000 }));
        transport.seek(1500);
        let (_, outcome) = read_frames(&mut transport, &source, 100);
        assert_eq!(outcome.loops_completed, 0);
        assert_eq!(transport.position(), 1600);
    }

    #[test]
    fn crossfades_from_audio_after_loop_end_into_loop_start() {
        let loud_from_frame = 480;
        let source: Vec<f32> = (0..1000)
            .flat_map(|frame| if frame < loud_from_frame { [0.0, 0.0] } else { [1.0, 1.0] })
            .collect();
        let mut transport = Transport::default();
        transport.set_loop(Some(LoopRegion { start_frame: 200, end_frame: 500 }));
        transport.seek(499);
        let (output, _) = read_frames(&mut transport, &source, 1 + LOOP_CROSSFADE_FRAMES);
        let faded_left_channel: Vec<f32> = output.iter().step_by(STEREO_CHANNELS).skip(1).copied().collect();
        assert_eq!(faded_left_channel[0], 1.0);
        assert!(faded_left_channel.windows(2).all(|pair| pair[1] < pair[0]));
        assert!(faded_left_channel[LOOP_CROSSFADE_FRAMES - 1] < 0.01);
    }
}
