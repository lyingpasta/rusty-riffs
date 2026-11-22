use std::fs::File;
use std::path::Path;

use symphonia::core::codecs::audio::AudioDecoderOptions;
use symphonia::core::errors::Error as SymphoniaError;
use symphonia::core::formats::probe::Hint;
use symphonia::core::formats::{FormatOptions, TrackType};
use symphonia::core::io::MediaSourceStream;
use symphonia::core::meta::MetadataOptions;

use crate::audio::STEREO_CHANNELS;
use crate::error::AppError;

pub struct DecodedAudio {
    pub sample_rate: u32,
    pub stereo_samples: Vec<f32>,
}

impl DecodedAudio {
    pub fn frame_count(&self) -> usize {
        self.stereo_samples.len() / STEREO_CHANNELS
    }

    pub fn duration_seconds(&self) -> f64 {
        self.frame_count() as f64 / self.sample_rate as f64
    }
}

pub fn decode_file(path: &Path) -> Result<DecodedAudio, AppError> {
    let file = File::open(path)?;
    let stream = MediaSourceStream::new(Box::new(file), Default::default());
    let hint = hint_from_extension(path);
    let mut format = symphonia::default::get_probe()
        .probe(&hint, stream, FormatOptions::default(), MetadataOptions::default())
        .map_err(to_decode_error)?;
    let track = format
        .default_track(TrackType::Audio)
        .ok_or_else(|| AppError::Decode("the file has no audio track".into()))?;
    let track_id = track.id;
    let codec_parameters = track
        .codec_params
        .as_ref()
        .and_then(|parameters| parameters.audio())
        .ok_or_else(|| AppError::Decode("the audio track has no codec parameters".into()))?;
    let mut decoder = symphonia::default::get_codecs()
        .make_audio_decoder(codec_parameters, &AudioDecoderOptions::default())
        .map_err(to_decode_error)?;

    let mut decoded = DecodedAudio { sample_rate: 0, stereo_samples: Vec::new() };
    let mut packet_samples: Vec<f32> = Vec::new();
    while let Some(packet) = format.next_packet().map_err(to_decode_error)? {
        if packet.track_id != track_id {
            continue;
        }
        let buffer = match decoder.decode(&packet) {
            Ok(buffer) => buffer,
            Err(SymphoniaError::DecodeError(message)) => {
                log::warn!("skipping corrupt packet: {message}");
                continue;
            }
            Err(error) => return Err(to_decode_error(error)),
        };
        decoded.sample_rate = buffer.spec().rate();
        let channel_count = buffer.spec().channels().count();
        packet_samples.resize(buffer.samples_interleaved(), 0.0);
        buffer.copy_to_slice_interleaved(&mut packet_samples);
        append_as_stereo(&packet_samples, channel_count, &mut decoded.stereo_samples);
    }

    if decoded.stereo_samples.is_empty() {
        return Err(AppError::Decode("the file contains no audio".into()));
    }
    Ok(decoded)
}

fn hint_from_extension(path: &Path) -> Hint {
    let mut hint = Hint::new();
    if let Some(extension) = path.extension().and_then(|extension| extension.to_str()) {
        hint.with_extension(extension);
    }
    hint
}

fn append_as_stereo(interleaved: &[f32], channel_count: usize, stereo: &mut Vec<f32>) {
    if channel_count == 1 {
        for &sample in interleaved {
            stereo.extend_from_slice(&[sample, sample]);
        }
        return;
    }
    for frame in interleaved.chunks_exact(channel_count) {
        stereo.extend_from_slice(&frame[..STEREO_CHANNELS]);
    }
}

fn to_decode_error(error: SymphoniaError) -> AppError {
    AppError::Decode(error.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn mono_is_duplicated_to_both_channels() {
        let mut stereo = Vec::new();
        append_as_stereo(&[0.1, 0.2], 1, &mut stereo);
        assert_eq!(stereo, vec![0.1, 0.1, 0.2, 0.2]);
    }

    #[test]
    fn extra_channels_are_dropped() {
        let mut stereo = Vec::new();
        append_as_stereo(&[0.1, 0.2, 0.9, 0.3, 0.4, 0.9], 3, &mut stereo);
        assert_eq!(stereo, vec![0.1, 0.2, 0.3, 0.4]);
    }
}
