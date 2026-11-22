# Audio engine in Rust, UI in the webview

The whole audio pipeline lives in the Rust backend, not in a Web Audio AudioWorklet: decoding (symphonia), time-stretch and pitch shift, looping, pre-roll, the speed trainer, output (cpal) and per-song settings. Rust owns all playback state. The webview only sends commands and redraws from the state and playhead position events that Rust emits.

We chose this so playback and decoding behave the same on every OS (on Linux the webview's audio decoding depends on GStreamer plugins), and so Rust is the heart of the app rather than a thin shell.

## Consequences

- The playhead crosses IPC about 30 times a second, and the UI smooths its movement between updates.
- The waveform is drawn from peaks computed in Rust. The webview never holds the song's audio.
- In Phase 2, stems are mixed in Rust before a single time-stretcher, so they stay in sync.
