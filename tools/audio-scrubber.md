# Audio Scrubber Tool

A simple browser-based tool for radio producers to transcribe and navigate audio files.

## Purpose

Quickly find speech errors (stumbles, false starts, repetitions) in long audio files without listening to everything.

## Workflow

1. Load WAV file
2. Run Whisper locally to get word-level timestamps
3. Display transcript with clickable words
4. Click any word → audio jumps to that position

## Features

- **Load WAV**: Drag & drop or file picker
- **Waveform display**: Visual representation using WaveSurfer.js
- **Transcript**: Clickable text, each word is a link
- **Playback controls**: Play/pause, variable speed (1x, 1.5x, 2x, 3x)
- **Keyboard shortcuts**: Space to play/pause, arrow keys to seek ±5s

## Technical

- Pure client-side (no server)
- WaveSurfer.js for audio/waveform
- Whisper for local transcription (runs in browser or CLI)
- JSON format for timestamps

## Output

Clickable transcript that syncs with audio playback. Find errors faster by scanning text and clicking to jump.
