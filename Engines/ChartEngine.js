const ChartEngine = {
  notes: [],

  load(chart) {
    this.notes = chart.notes.map(n => ({
      ...n,
      hit: false
    }));
  }
};
