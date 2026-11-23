# Rusty Riffs

A desktop practice player for learning guitar parts by ear. Slow a recording down without changing its pitch, shift its pitch for songs in other tunings, loop the hard bits seamlessly, and drop markers on the sections you're working on.

Built with [Tauri 2](https://tauri.app): the audio engine is Rust, the UI is Svelte 5 + TypeScript.

**[Download it from the website](https://lyingpasta.github.io/rusty-riffs/)** for Linux, Windows or macOS.

## Features

- Opens mp3, wav, flac, m4a (AAC) and ogg (Vorbis), via the file dialog or drag-and-drop
- Speed 10%–150% without changing pitch
- Pitch shift ±12 semitones, with ±50 cents of fine tuning, independent of speed
- Zoomable waveform that scrolls smoothly and follows the playhead
- Named markers, and saved loops built from them. Each loop remembers its own speed, and switching loops is one key
- Selections: pick a range by keys or by dragging, then turn it into a loop or clear the markers inside it
- Markers dropped while playing land where you heard the note: the app compensates for audio latency and your own timing (measured with a tap-along calibration), and can snap to the nearest note attack
- Seamless looping, with an optional 0.5–2 s pre-roll before each restart
- Speed trainer: each repeat of the loop adds a set number of percentage points until a target speed
- Vim-style shortcuts, nearly all under the right hand, so the left can stay on the guitar neck
- Three dark colour themes: Ink & bronze, Petrol & moonlight, Aubergine & ember
- Every setting is saved per song, keyed by the file's contents, so reopening a song (even renamed or moved) restores everything
- The app reopens the last song you played when it starts
- Built-in updates: the app checks for a new version at launch and offers it in a popup. The About dialog (`a`) shows the version and can check again

## Keyboard shortcuts

Nearly every key is under the right hand (thumb on Space), so you can drive the app between phrases. The exceptions are `d` and `D` for deleting, following vim. Press `?` in the app to see this list.

| Key | Action |
|---|---|
| `O` | Open a song |
| `Space` | Play / pause |
| `h` / `l` | Nudge back / forward: about 1/50 of the visible width (0.05–1 s) |
| `H` / `L` | Nudge 5× further |
| `0` | Jump to loop start (or song start) |
| `j` / `k` | Speed −5% / +5% |
| `m` | Add marker at playhead |
| `,` / `.` | Previous / next marker |
| `i` | Rename marker at playhead |
| `d` | Delete marker at playhead (and the loops that use it) |
| `v` | Start a selection at the playhead |
| `h` / `l`, `H` / `L` (selection) | Move the selection end by the same steps |
| `,` / `.` (selection) | Snap the selection end to the previous / next marker |
| `Enter` (selection) | Make a loop from the selection |
| `d` (selection) | Delete every marker in the selection |
| `n` | New loop from the marker at the playhead |
| `,` / `.` (new-loop mode) | Move the new loop's end marker |
| `Enter` (new-loop mode) | Save and activate the new loop |
| `[` / `]` | Previous / next saved loop |
| `o` | Loop on / off |
| `I` | Rename active loop |
| `D` | Delete active loop |
| `u` | Speed trainer on / off |
| `p` | Pre-roll: off → 1 s → 2 s |
| `+` / `-` | Zoom in / out around the playhead |
| `;` | Next colour theme |
| `?` | Show / hide shortcuts |
| `a` | About, version and updates |
| `Esc` | Cancel selection or new loop / close help, About or the update popup |

With the mouse:
- Drag on the waveform to make a selection.
- Click to seek, scroll to move, and `Ctrl + scroll` to zoom around the pointer.
- Click a loop's bar to activate it, and double-click a marker or loop name to rename it.

Pitch, fine tuning and timing are set from the top bar. Hover any control to see its name and shortcut.

## Timing compensation

When you press `m` or `v` while the song plays, you're reacting to something you already heard. The app moves the point back to the moment you heard it:

1. The audio system's own delay is measured automatically, so the playhead shows what you're hearing.
2. Your personal timing offset is subtracted. Its default is 150 ms. Click the target icon in the top bar to calibrate it: press Space as soon as you hear each of 12 clicks, which come at random moments so you react rather than anticipate. It's in real time, so at 50% speed it covers half as much of the song.
3. With snapping on (the magnet icon), the point then moves to the nearest note attack within ±80 ms.

## Setup

You need these on every OS:

- [Rust](https://rustup.rs) 1.90 or newer
- [Node.js](https://nodejs.org) 20 or newer, and [pnpm](https://pnpm.io/installation)
- Clang/libclang, because the time-stretch library generates its Rust bindings with `bindgen`

Then install the extra packages for your OS.

### Linux

Arch:

```sh
sudo pacman -S --needed base-devel webkit2gtk-4.1 curl wget file openssl appmenu-gtk-module \
  libappindicator-gtk3 librsvg xdotool alsa-lib clang
```

Debian / Ubuntu:

```sh
sudo apt install build-essential libwebkit2gtk-4.1-dev curl wget file libxdo-dev libssl-dev \
  libayatana-appindicator3-dev librsvg2-dev libasound2-dev clang
```

Fedora:

```sh
sudo dnf group install "c-development"
sudo dnf install webkit2gtk4.1-devel openssl-devel curl wget file libappindicator-gtk3-devel \
  librsvg2-devel libxdo-devel alsa-lib-devel clang
```

Audio goes through ALSA, which reaches PipeWire or PulseAudio through their ALSA plugins on modern distros.

### Windows

- [Microsoft C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) with the "Desktop development with C++" workload
- WebView2. It's already installed on Windows 10 (1803+) and 11
- LLVM, for libclang: `winget install LLVM.LLVM`. If the build can't find it, set `LIBCLANG_PATH` to `C:\Program Files\LLVM\bin`

### macOS

- Xcode Command Line Tools: `xcode-select --install` (this includes clang)

## Running in development

```sh
pnpm install
pnpm tauri dev
```

The first build compiles all the dependencies and takes several minutes. Dev builds compile the dependencies with optimisations (see `src-tauri/Cargo.toml`), because the unoptimised time-stretcher is too slow for real-time audio.

## Building an installer

Tauri cannot cross-compile, so build on each OS you want to ship for:

```sh
pnpm install
pnpm tauri build
```

The output goes to `src-tauri/target/release/bundle/`:

| OS | Formats |
|---|---|
| Linux | `.deb`, `.rpm`, `.AppImage` |
| Windows | `.msi`, `.exe` (NSIS) |
| macOS | `.app`, `.dmg` |

So far this has only been built and tested on Linux. The Windows and macOS steps follow Tauri's documented prerequisites but haven't been run yet.

## Releasing

Releases are built by GitHub Actions (`.github/workflows/release.yml`) with [release-please](https://github.com/googleapis/release-please):

1. Every push to `main` updates a single open **release PR**, with the next version number and a changelog drawn from the commit messages.
2. Merging that PR tags the version and creates a **draft** GitHub release.
3. The workflow then builds the app on Linux, Windows and macOS (Apple Silicon) and attaches the installers to the draft. Check it on GitHub and click Publish.

### In-app updates

The app uses the [Tauri updater](https://v2.tauri.app/plugin/updater/). At launch, and from the About dialog, it fetches `latest.json` from the latest **published** release, so a draft reaches users only once you click Publish. Update bundles are signed, and the app checks them against the public key in `src-tauri/tauri.conf.json`.

The release workflow signs with two repository secrets:

| Secret | Value |
|---|---|
| `TAURI_SIGNING_PRIVATE_KEY` | contents of the private key file |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | the key's password (empty if it has none) |

Keep a backup of the private key: if it's lost, installed copies can't verify any new update, and users have to reinstall by hand. To replace the key, run `pnpm tauri signer generate -w ~/.tauri/rusty-riffs.key`, put the new public key in `tauri.conf.json` and update both secrets.

release-please reads [Conventional Commits](https://www.conventionalcommits.org) to pick the version, so commit messages need a type prefix:

| Prefix | Example | Effect |
|---|---|---|
| `feat:` | `feat: add selection mode` | minor version bump, listed under Features |
| `fix:` | `fix: stop held keys piling up seeks` | patch bump, listed under Bug Fixes |
| `feat!:` / `fix!:` | `feat!: change the settings format` | breaking change (minor bump while below 1.0) |
| `docs:`, `chore:`, `refactor:`… | `docs: explain the release flow` | no release on their own |

The version lives in `package.json`, `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml` and `src-tauri/Cargo.lock`. release-please bumps the first three in the release PR. It can't edit `Cargo.lock`, so a follow-up job in the same workflow runs `cargo update --workspace` on the PR branch and pushes the result.

### Verifying a download

Every installer carries a build provenance attestation, which proves it was built by this repository's release workflow. With the [GitHub CLI](https://cli.github.com):

```sh
gh attestation verify Rusty.Riffs_0.1.1_amd64.AppImage --repo lyingpasta/rusty-riffs
```

### Opening the unsigned builds

The installers are not code-signed, so the operating systems warn before the first launch:

- **macOS:** the app is signed ad hoc but not notarized, so macOS blocks the first launch. Open **System Settings → Privacy & Security** and click **Open Anyway**. Builds before 0.1.1 aren't signed at all and are reported as damaged: after moving one to Applications, run `xattr -cr "/Applications/Rusty Riffs.app"` once, then open it normally.
- **Windows:** SmartScreen shows "Windows protected your PC". Click **More info**, then **Run anyway**.
- **Linux:** no warning. Make the AppImage executable with `chmod +x` before running it.

## Website

The download page lives in `site/`: plain HTML, CSS and JavaScript with no build step. It asks the GitHub API for the latest published release and offers the installer that matches the visitor's OS. `.github/workflows/pages.yml` copies the app's fonts into it and deploys it to GitHub Pages whenever `site/` changes on `main`.

## Checks

```sh
pnpm check                                   # Svelte + TypeScript type check
pnpm test                                    # UI unit tests
cd src-tauri && cargo clippy --all-targets   # Rust lint
cd src-tauri && cargo test                   # Rust tests
```

## How it works

All the audio runs in Rust (see [ADR 0001](docs/adr/0001-audio-engine-in-rust.md)):

```
file ─► symphonia (decode to stereo f32)
          │
          ▼
       Transport (position, active loop with crossfade, pre-roll)
          │
          ▼
       signalsmith-stretch (speed + pitch)
          │
          ▼
       cpal (default output device)
```

- **`src-tauri/src/player.rs`** owns all playback state. The UI sends commands (`src-tauri/src/commands.rs`). Rust replies with `player-state` events, and sends `playhead` events about 30 times a second while playing.
- **`src-tauri/src/audio/`** holds the real-time side: decoding, the transport, the stretching renderer and the output thread. The audio thread never takes a lock. It receives commands over a channel and reports back through atomics.
- **`src/`** is the Svelte UI. `src/lib/shortcuts.ts` defines every shortcut, and the `?` cheat sheet is generated from the same table. Colour themes are sets of CSS variables in `src/app.css`.
- Settings are stored as one JSON file per song, in the app data directory under `songs/` (on Linux, `~/.local/share/dev.lyingpasta.rustyriffs/songs/`).

The app icon is drawn in `src-tauri/icons/app-icon.svg`. After changing it, regenerate every icon size with:

```sh
rsvg-convert -w 1024 -h 1024 src-tauri/icons/app-icon.svg -o /tmp/app-icon.png
pnpm tauri icon /tmp/app-icon.png
rm -rf src-tauri/icons/android src-tauri/icons/ios
```

Domain terms (song, marker, loop, pre-roll, speed trainer…) are defined in [GLOSSARY.md](GLOSSARY.md).

## License

Rusty Riffs is released under the [MIT License](LICENSE). The bundled Barlow Semi Condensed font is under the [SIL Open Font License 1.1](src/assets/fonts/OFL.txt).
