use crate::audio::STEREO_CHANNELS;
use crate::audio::decode::DecodedAudio;

pub const PEAKS_PER_SECOND: u32 = 200;

pub fn compute_peaks(audio: &DecodedAudio) -> Vec<f32> {
    let frames_per_peak = (audio.sample_rate / PEAKS_PER_SECOND).max(1) as usize;
    audio
        .stereo_samples
        .chunks(frames_per_peak * STEREO_CHANNELS)
        .map(loudest_sample)
        .collect()
}

fn loudest_sample(samples: &[f32]) -> f32 {
    samples.iter().fold(0.0, |loudest, sample| loudest.max(sample.abs()))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn one_peak_per_bucket_holding_the_loudest_absolute_sample() {
        let sample_rate = PEAKS_PER_SECOND * 2;
        let audio = DecodedAudio {
            sample_rate,
            stereo_samples: vec![0.1, -0.5, 0.2, 0.3, 0.0, 0.0, -0.9, 0.4],
        };
        assert_eq!(compute_peaks(&audio), vec![0.5, 0.9]);
    }
}
