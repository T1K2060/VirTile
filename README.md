# 🎵 VirTile - 3D Rhythm Game

A **cross-platform 3D rhythm game** built with **Three.js** and **WebXR**, supporting PC, Mobile, Tablet, PCVR, and Standalone VR (Quest, Pico, etc.).

Inspired by Beat Saber, osu!mania, and the BeatLeader mod for custom ranked charts.

---

## ✨ Features

### Platform Support
- **PC** - 2D gameplay with keyboard (DFJK keys)
- **Mobile/Tablet** - Touch controls with optimized UI
- **PC VR** - Full VR immersion or flat screen in 3D space
- **Standalone VR** - Native Quest, Pico support via WebXR

### Beatmap Format
- GitHub-hosted levels
- Star rating system (like BeatLeader)
- Ranked/Unranked distinction
- Chart types: Acc, Tech, Speed
- Support for Easy, Normal, Hard, Expert, Maniac, Mania difficulties

### Graphics & Performance
- **Energy Save Mode** - Auto-reduces quality when battery < 15%
- **Quality presets**: Ultra, High, Medium, Low, Minimal
- **Customizable VR settings**: Screen size, distance, curvature
- **3D effects**: Particle systems, bloom, dynamic lighting

### VR Features
- **2D Flat Screen Mode** - Curved screen in 3D space (adjustable)
- **3D Immersive Mode** - Beat Saber-style environment
- **Controller pointer** with laser visualization
- **Virtual QWERTY keyboard** for text input
- **Haptic feedback** (when supported)

---

## 🚀 Quick Start

1. Open `index.html` in a modern browser
2. Click "Play" to see the song select screen
3. Select a song to start playing
4. Hit notes as they reach the hit line!

### Controls

**Keyboard (PC):**
- Lane 1: D
- Lane 2: F  
- Lane 3: J
- Lane 4: K
- Pause: Escape

**Touch (Mobile/Tablet):**
- Tap the corresponding lane at the bottom of the screen

**VR Controllers:**
- Use controller buttons or physically touch notes in 3D space

---

## 📁 Project Structure

```
VirTile/
├── index.html              # Main entry point
├── style.css               # Global styles
├── BEATMAP_FORMAT.md       # Beatmap format documentation
│
├── src/                    # Modular ES6 source code
│   ├── main.js            # Game initialization & main loop
│   ├── core/              # Core systems
│   │   ├── PlatformDetector.js
│   │   ├── SettingsManager.js
│   │   ├── BatteryManager.js
│   │   ├── AudioManager.js
│   │   └── InputManager.js
│   ├── 3d/                # 3D & VR
│   │   ├── SceneManager.js
│   │   └── VRManager.js
│   ├── game/              # Game logic
│   │   ├── LevelLoader.js
│   │   ├── GameplayEngine.js
│   │   └── JudgmentEngine.js
│   └── ui/                # User interface
│       ├── MenuManager.js
│       └── VirtualKeyboard.js
│
├── Engines/               # Legacy engine files (deprecated)
├── Assets/                # Game assets
└── Levels/               # Local level storage
```

---

## 🎵 Beatmap Format

See [BEATMAP_FORMAT.md](BEATMAP_FORMAT.md) for detailed documentation.

### Quick Example

**Folder structure:**
```
MySong/
├── Song.mp3
├── Icon.png
├── meta.json
└── Hard.json
```

**Hard.json:**
```json
{
  "Star": 2.56,
  "Ranked": false,
  "Chart_type": "Acc",
  "laneCount": 4,
  "notes": [
    { "time": 1000, "lane": 0, "type": "tap" },
    { "time": 1500, "lane": 1, "type": "hold", "endTime": 2000 },
    { "time": 2000, "lane": 2, "type": "tap" },
    { "time": 2500, "lane": 3, "type": "tap" }
  ]
}
```

---

## ⚙️ Settings

Access settings from the main menu to customize:

### Platform Mode
- Auto-detect (default)
- PC (2D)
- PC VR
- Mobile
- Tablet
- Standalone VR

### Graphics
- Quality preset (Ultra to Minimal)
- Energy save on low battery
- Battery threshold percentage

### VR Settings
- Mode: 2D Flat Screen or 3D Immersive
- Screen size, distance, curvature (for flat mode)

### Audio
- Master volume
- Hitsound volume
- Audio offset (ms)

### Gameplay
- Scroll speed
- Note size
- Key bindings (PC)

---

## 🔋 Energy Saving

When enabled, the game automatically:
- Reduces graphics quality to "Minimal"
- Disables particle effects
- Lowers render resolution
- Reduces animation complexity

**Triggers when:**
- Battery drops below threshold (default 15%)
- Device is unplugged

---

## 🥽 VR Support

### Entering VR
1. Click "Enter VR" button (appears when VR is available)
2. Or use browser VR button

### VR Modes

**2D Flat Screen:**
- Large curved screen floating in 3D space
- Adjustable size, distance, and curvature
- Best for: Casual play, watching charts

**3D Immersive:**
- Full 3D environment with lanes
- Notes fly toward you
- Can touch notes with controllers
- Best for: Full immersion

### VR Input
- **Pointer**: Laser pointer from controllers for UI
- **Buttons**: Use controller buttons to hit notes
- **Touch**: Physically reach out and touch notes (3D mode)
- **Virtual Keyboard**: QWERTY keyboard for text input

---

## 🛠️ Development

### Requirements
- Modern browser with WebGL support
- For VR: WebXR-compatible browser (Chrome, Edge, Firefox Reality)

### Local Development
```bash
# Serve with any static file server
npx serve .
# or
python -m http.server 8000
```

### Building for Production
The game uses ES6 modules and requires no build step. Simply deploy the files to any static host.

---

## 📱 Mobile/Tablet Notes

- Add to home screen for fullscreen experience
- Touch targets are optimized for finger size
- Automatic orientation handling
- Battery saving works on supported devices

---

## 🎮 Multiplayer (Future)

Planned features:
- Online multiplayer lobbies
- Score sharing
- Ghost replays
- Leaderboards

---

## 📝 Credits

- Built with [Three.js](https://threejs.org/)
- WebXR support via [WebXR Device API](https://immersiveweb.dev/)
- Inspired by Beat Saber, osu!, and BeatLeader

---

## 🔗 Links

- [Beatmap Format Documentation](BEATMAP_FORMAT.md)
- [GitHub Levels Repository](https://github.com/T1K2060/Levels)

---

*VirTile - Rhythm across all dimensions* 🎵
