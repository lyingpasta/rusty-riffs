# Rusty Riffs

A desktop practice player for learning guitar parts by ear: slow a recording down, change its pitch, loop the hard bits, and isolate the guitar.

## Language

### Playback

**Song**:
A local audio file opened for practice, identified by the hash of its contents rather than its path.
_Avoid_: Track, file, recording

**Speed**:
The playback tempo as a percentage of the original (10%–150%), changed without affecting pitch.
_Avoid_: Rate, tempo, playback rate

**Pitch shift**:
A change in pitch, in semitones and cents, made independently of speed.
_Avoid_: Transpose, key change, detune

**Loop**:
A named, saved span of the song from one marker to a later marker, which plays repeatedly without a gap and remembers its own speed. A song can have many loops; at most one is active.
_Avoid_: Repeat, cycle, region, A–B

**Pre-roll**:
The stretch of audio just before the active loop's start marker, played as a lead-in each time the loop restarts.
_Avoid_: Count-in, lead-in

**Speed trainer**:
A mode in which each repetition of the active loop adds a fixed number of percentage points to the speed, until it reaches a target speed, where it stays.
_Avoid_: Ramp, tempo trainer

**Marker**:
A named point in time within a song, such as "intro" or "solo". Loops are built from markers; deleting a marker deletes the loops that use it.
_Avoid_: Section, cue, bookmark

### Isolation

**Stem**:
One instrument's part separated from the song's mix (guitar, bass, drums, vocals, piano or other).
_Avoid_: Track, channel, layer

**Isolation**:
Separating a song's loop into stems, so one instrument can be heard on its own.
_Avoid_: Separation, extraction, demixing
