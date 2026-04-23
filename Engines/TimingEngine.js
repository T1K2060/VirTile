const TimingEngine = {
  bpm: 100,
  startTime: 0,
  time: 0,

  setBPM(bpm) {
    this.bpm = bpm;
    this.startTime = performance.now();
  },

  beatToMs(beat) {
    return (60000 / this.bpm) * beat;
  },

  update() {
    this.time = performance.now() - this.startTime;
  }
};
