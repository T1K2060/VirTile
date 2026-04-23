# VirTile Beatmap Format

This document describes the beatmap format for VirTile rhythm game.

## Folder Structure

Each song/level is stored in a separate folder with the following files:

```
SongFolder/
├── Song.mp3          # Audio file (required)
├── Icon.png          # Cover art/icon (required)
├── meta.json         # Song metadata (optional but recommended)
├── Easy.json         # Easy difficulty chart
├── Normal.json       # Normal difficulty chart
├── Hard.json         # Hard difficulty chart (most common)
├── Expert.json       # Expert difficulty chart
├── Maniac.json       # Maniac difficulty chart
└── Mania.json        # 7-key mania mode chart
```

## Metadata Format (meta.json)

```json
{
  "title": "Song Title",
  "artist": "Artist Name",
  "mapper": "Chart Creator",
  "bpm": 128,
  "duration": 180,
  "previewTime": 30,
  "tags": ["electronic", "dance"],
  "background": "Background.png"
}
```

## Chart Format (e.g., Hard.json)

```json
{
  "Star": 1.56,
  "Ranked": false,
  "Chart_type": "Acc",
  
  "laneCount": 4,
  
  "notes": [
    {
      "time": 1000,
      "lane": 0,
      "type": "tap"
    },
    {
      "time": 2000,
      "lane": 1,
      "type": "hold",
      "endTime": 2500
    },
    {
      "time": 3000,
      "lane": 2,
      "type": "tap",
      "hitSound": "clap"
    }
  ],
  
  "timingPoints": [
    {
      "time": 0,
      "bpm": 128,
      "signature": [4, 4]
    }
  ],
  
  "events": [
    {
      "time": 5000,
      "type": "lighting",
      "color": "#00d4ff"
    }
  ]
}
```

## Field Descriptions

### Chart Metadata Fields

| Field | Type | Description |
|-------|------|-------------|
| `Star` | number | Star rating (difficulty) like BeatLeader mod for BS |
| `Ranked` | boolean | Whether this chart is ranked/official |
| `Chart_type` | string | Chart type: "Acc" (Accuracy), "Tech", "Speed", etc. |
| `laneCount` | number | Number of lanes (4 for standard, 7 for mania) |

### Note Fields

| Field | Type | Description |
|-------|------|-------------|
| `time` | number | Note time in milliseconds from song start |
| `lane` | number | Lane index (0-based, left to right) |
| `type` | string | Note type: "tap", "hold", "slide" |
| `endTime` | number | (Hold notes only) End time in milliseconds |
| `velocity` | number | Note speed multiplier (default: 1) |
| `hitSound` | string | Custom hitsound for this note |

### Timing Points

Timing points define BPM changes and time signature changes throughout the song.

## Example GitHub Repository Structure

```
Levels/
├── Song1/
│   ├── Song.mp3
│   ├── Icon.png
│   ├── meta.json
│   ├── Hard.json
│   └── Mania.json
├── Song2/
│   ├── Song.mp3
│   ├── Icon.png
│   ├── meta.json
│   ├── Easy.json
│   ├── Hard.json
│   └── Expert.json
└── ...
```

## Star Rating Guidelines

| Stars | Difficulty | Description |
|-------|------------|-------------|
| 0.0-1.0 | Very Easy | For beginners |
| 1.0-2.0 | Easy | Simple patterns |
| 2.0-3.0 | Normal | Standard difficulty |
| 3.0-4.0 | Hard | Complex patterns |
| 4.0-5.0 | Expert | Very difficult |
| 5.0+ | Maniac | Extreme difficulty |

## Chart Types

- `Acc` - Accuracy-focused charts (like BeatLeader mod)
- `Tech` - Technical patterns, rhythm variations
- `Speed` - Fast scroll speed
- `Meme` - Fun/unusual patterns

## Hosting on GitHub

1. Create a GitHub repository
2. Create a `Levels` folder in the repository
3. Add song folders following the structure above
4. Use the raw GitHub URLs in the game settings

The game loads files from:
```
https://raw.githubusercontent.com/{username}/{repo}/{branch}/Levels/{songFolder}/{file}
```
