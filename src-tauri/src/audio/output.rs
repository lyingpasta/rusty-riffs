use std::sync::Arc;
use std::sync::mpsc::{self, Receiver, Sender};
use std::thread;

use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use cpal::{ErrorKind, OutputCallbackInfo, SampleFormat, StreamConfig};

use crate::audio::STEREO_CHANNELS;
use crate::audio::renderer::{EngineCommand, EngineFeedback, Renderer};
use crate::error::AppError;

pub enum DeviceEvent {
    Rerouted,
    Lost,
}

pub struct AudioOutput {
    commands: Sender<EngineCommand>,
    pub feedback: Arc<EngineFeedback>,
    _shutdown: Sender<()>,
}

impl AudioOutput {
    pub fn send(&self, command: EngineCommand) {
        if self.commands.send(command).is_err() {
            log::error!("audio output thread has stopped; command dropped");
        }
    }
}

pub fn start_audio_output(device_events: Sender<DeviceEvent>) -> Result<AudioOutput, AppError> {
    let (command_sender, command_receiver) = mpsc::channel();
    let (shutdown_sender, shutdown_receiver) = mpsc::channel::<()>();
    let (ready_sender, ready_receiver) = mpsc::channel();
    let feedback = Arc::new(EngineFeedback::default());
    let thread_feedback = feedback.clone();
    thread::Builder::new()
        .name("audio-output".into())
        .spawn(move || {
            let stream = build_stream(command_receiver, thread_feedback, device_events);
            let is_ready = stream.is_ok();
            let _ = ready_sender.send(stream.as_ref().map(|_| ()).map_err(|error| error.to_string()));
            if is_ready {
                let _ = shutdown_receiver.recv();
            }
        })?;
    ready_receiver
        .recv()
        .map_err(|_| AppError::AudioOutput("audio thread exited during startup".into()))?
        .map_err(AppError::AudioOutput)?;
    Ok(AudioOutput { commands: command_sender, feedback, _shutdown: shutdown_sender })
}

fn build_stream(
    commands: Receiver<EngineCommand>,
    feedback: Arc<EngineFeedback>,
    device_events: Sender<DeviceEvent>,
) -> Result<cpal::Stream, AppError> {
    let device = cpal::default_host()
        .default_output_device()
        .ok_or_else(|| AppError::AudioOutput("no output device found".into()))?;
    let supported_config = device.default_output_config().map_err(to_output_error)?;
    if supported_config.sample_format() != SampleFormat::F32 {
        return Err(AppError::AudioOutput(format!(
            "unsupported sample format {}",
            supported_config.sample_format()
        )));
    }
    let config: StreamConfig = supported_config.into();
    let device_channels = config.channels as usize;
    let device_sample_rate = config.sample_rate;
    let mut renderer = Renderer::new(device_sample_rate, feedback);
    let mut stereo_block = Vec::with_capacity(1 << 15);
    let stream = device
        .build_output_stream(
            config,
            move |output: &mut [f32], info: &OutputCallbackInfo| {
                while let Ok(command) = commands.try_recv() {
                    renderer.apply(command);
                }
                renderer.set_device_latency_frames(device_latency_frames(info, device_sample_rate));
                stereo_block.resize(output.len() / device_channels * STEREO_CHANNELS, 0.0);
                renderer.render(&mut stereo_block);
                spread_to_device_channels(&stereo_block, output, device_channels);
            },
            move |error| report_stream_error(error, &device_events),
            None,
        )
        .map_err(to_output_error)?;
    stream.play().map_err(to_output_error)?;
    Ok(stream)
}

fn device_latency_frames(info: &OutputCallbackInfo, sample_rate: u32) -> usize {
    let timestamp = info.timestamp();
    let latency = timestamp.playback.duration_since(timestamp.callback);
    (latency.as_secs_f64() * sample_rate as f64).round() as usize
}

fn spread_to_device_channels(stereo: &[f32], output: &mut [f32], device_channels: usize) {
    for (device_frame, stereo_frame) in output.chunks_exact_mut(device_channels).zip(stereo.chunks_exact(STEREO_CHANNELS)) {
        device_frame.fill(0.0);
        let shared_channels = device_channels.min(STEREO_CHANNELS);
        device_frame[..shared_channels].copy_from_slice(&stereo_frame[..shared_channels]);
    }
}

fn report_stream_error(error: cpal::Error, device_events: &Sender<DeviceEvent>) {
    let event = match error.kind() {
        ErrorKind::DeviceChanged => DeviceEvent::Rerouted,
        ErrorKind::DeviceNotAvailable | ErrorKind::StreamInvalidated => DeviceEvent::Lost,
        _ => {
            log::warn!("audio stream error: {error}");
            return;
        }
    };
    let _ = device_events.send(event);
}

fn to_output_error(error: impl std::fmt::Display) -> AppError {
    AppError::AudioOutput(error.to_string())
}
