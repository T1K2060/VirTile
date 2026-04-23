const NoteEngine = {
  active: [],

  update() {
    const now = TimingEngine.time;

    ChartEngine.notes.forEach(note => {
      const spawnTime = TimingEngine.beatToMs(note.time);
      if (!note.spawned && now >= spawnTime - 2000) {
        note.spawned = true;
        this.active.push(note);
      }
    });
  },

  draw(ctx) {
    this.active.forEach(note => {
      const y = 500 - (TimingEngine.beatToMs(note.time) - TimingEngine.time) * 0.25;
      ctx.fillStyle = "white";
      ctx.fillRect(100 + note.lane * 100, y, 50, 50);

      if (note.endTime) {
        const endY = 500 - (TimingEngine.beatToMs(note.endTime) - TimingEngine.time) * 0.25;
        ctx.fillRect(125 + note.lane * 100, y, 10, endY - y);
      }
    });
  }
};
