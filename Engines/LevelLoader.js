/**
 * LEGACY LevelLoader - Deprecated
 * Use src/game/LevelLoader.js for new code
 */
const LevelLoader = {
  base: "https://raw.githubusercontent.com/T1K2060/Levels/main/Levels/",

  async load(name) {
    console.warn('Legacy LevelLoader is deprecated. Use src/game/LevelLoader.js');
    const meta = await fetch(this.base + name + "/meta.txt").then(r => r.json()).catch(() => ({ bpm: 100 }));
    const chart = await fetch(this.base + name + "/chart.json").then(r => r.json()).catch(() => ({ notes: [] }));
    const audio = this.base + name + "/song.mp3";

    return {
      meta,
      chart,
      audio,
      bpm: meta.bpm || 100
    };
  }
};

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { LevelLoader };
}
