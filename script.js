const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

async function start() {
  const level = await LevelLoader.load("Metronome");
  ChartEngine.load(level.chart);
  TimingEngine.setBPM(level.bpm);

  await AudioEngine.load(level.audio);
  document.getElementById("loading").style.display = "none";

  AudioEngine.play();
  requestAnimationFrame(loop);
}

function loop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  TimingEngine.update();
  NoteEngine.update();
  NoteEngine.draw(ctx);

  if (!AudioEngine.ended) {
    requestAnimationFrame(loop);
  }
}

start();
