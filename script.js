const status = document.getElementById("status");

async function startListening() {
  status.textContent = "Listening...";
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const audioCtx = new AudioContext();
  const source = audioCtx.createMediaStreamSource(stream);
  const analyser = audioCtx.createAnalyser();

  analyser.fftSize = 2048;
  source.connect(analyser);
  const data = new Uint8Array(analyser.frequencyBinCount);

  const hits = [];

  function detectBeats() {
    analyser.getByteTimeDomainData(data);
    let energy = 0;
    for (let i = 0; i < data.length; i++) {
      const val = (data[i] - 128) / 128;
      energy += val * val;
    }
    if (energy > 0.02) {
      const now = performance.now();
      if (hits.length === 0 || now - hits[hits.length - 1] > 200) {
        hits.push(now);
        if (hits.length <= 8) drawNotation(hits.length);
      }
    }
    requestAnimationFrame(detectBeats);
  }

  detectBeats();
}

function drawNotation(count) {
  const VF = Vex.Flow;
  const canvas = document.getElementById("notation");
  const renderer = new VF.Renderer(canvas, VF.Renderer.Backends.CANVAS);
  const context = renderer.getContext();
  context.clearRect(0, 0, canvas.width, canvas.height);

  const stave = new VF.Stave(10, 40, 700);
  stave.addClef("percussion").setContext(context).draw();

  const durations = ["q", "8", "8", "q", "h", "q", "q", "q"];
  const notes = [];

  for (let i = 0; i < count; i++) {
    notes.push(new VF.StaveNote({ keys: ["c/5"], duration: durations[i] || "q" })
      .addModifier(0, new VF.Articulation("a>").setPosition(3)));
  }

  const voice = new VF.Voice({ num_beats: 4, beat_value: 4 });
  voice.addTickables(notes);

  new VF.Formatter().joinVoices([voice]).format([voice], 600);
  voice.draw(context, stave);
}
