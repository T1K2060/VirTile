const AudioEngine = {
  audio: new Audio(),
  ended: false,

  async load(src) {
    this.audio.src = src;
    await this.audio.play().catch(()=>{});
    this.audio.pause();
    this.audio.currentTime = 0;
  },

  play() {
    this.audio.play();
    this.audio.onended = () => this.ended = true;
  }
};
