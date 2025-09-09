const status = document.getElementById("status");

async function startListening() {
  status.textContent = "Listening...";
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const audioCtx = new AudioContext();
  const source = audioCtx.createMediaStreamSource(stream);

  // Kick filter (low)
  const kickFilter = audioCtx.createBiquadFilter();
  kickFilter.type = "bandpass";
  kickFilter.frequency.value = 100;
  kickFilter.Q.value = 1;

  // Snare filter (mid)
  const snareFilter = audioCtx.createBiquadFilter();
  snareFilter.type = "bandpass";
  snareFilter.frequency.value = 300;
  snareFilter.Q.value = 1;

  // Hi-hat filter (high)
  const hatFilter = audioCtx.createBiquadFilter();
  hatFilter.type = "highpass";
  hatFilter.frequency.value = 5000;

  // Analysers
  const analyserKick = audioCtx.createAnalyser();
  const analyserSnare = audioCtx.createAnalyser();
  const analyserHat = audioCtx.createAnalyser();
  analyserKick.fftSize = analyserSnare.fftSize = analyserHat.fftSize = 1024;

  // Connect graph
  source.connect(kickFilter).connect(analyserKick);
  source.connect(snareFilter).connect(analyserSnare);
  source.connect(hatFilter).connect(analyserHat);

  // Buffers
  const dataKick = new Uint8Array(analyserKick.frequencyBinCount);
  const dataSnare = new Uint8Array(analyserSnare.frequencyBinCount);
  const dataHat = new Uint8Array(analyserHat.frequencyBinCount);

  const detectedNotes = [];

  function detect() {
    analyserKick.getByteTimeDomainData(dataKick);
    analyserSnare.getByteTimeDomainData(dataSnare);
    analyserHat.getByteTimeDomainData(dataHat);

    const energyKick = dataKick.reduce((a, b) => a + Math.abs(b - 128), 0);
    const energySnare = dataSnare.reduce((a, b) => a + Math.abs(b - 128), 0);
    const energyHat = dataHat.reduce((a, b) => a + Math.abs(b - 128), 0);

    const now = performance.now();

    if (energyKick > 5000) {
      if (detectedNotes.length === 0 || now - detectedNotes[detectedNotes.length - 1].time > 200) {
        detectedNotes.push({ type: "kick", time: now });
        drawNotation(detectedNotes);
      }
    }
    if (energySnare > 5000) {
      if (detectedNotes.length === 0 || now - detectedNotes[detectedNotes.length - 1].time > 200) {
        detectedNotes.push({ type: "snare", time: now });
        drawNotation(detectedNotes);
      }
    }
    if (energyHat > 5000) {
      if (detectedNotes.length === 0 || now - detectedNotes[detectedNotes.length - 1].time > 200) {
        detectedNotes.push({ type: "hihat", time: now });
        drawNotation(detectedNotes);
      }
    }

    requestAnimationFrame(detect);
  }

  detect();
}

function drawNotation(notes) {
  const VF = Vex.Flow;
  const canvas = document.getElementById("notation");
  const renderer = new VF.Renderer(canvas, VF.Renderer.Backends.CANVAS);
  const context = renderer.getContext();
  context.clearRect(0, 0, canvas.width, canvas.height);

  const stave = new VF.Stave(10, 40, 700);
  stave.addClef("percussion").setContext(context).draw();

  const vexNotes = notes.map(n => {
    if (n.type === "kick") {
      return new VF.StaveNote({ keys: ["f/3"], duration: "q" });
    }
    if (n.type === "snare") {
      return new VF.StaveNote({ keys: ["c/4"], duration: "q" });
    }
    if (n.type === "hihat") {
      return new VF.StaveNote({ keys: ["g/5"], duration: "q" })
        .setKeyStyle(0, { fillStyle: "black", strokeStyle: "black" })
        .addModifier(0, new VF.Articulation("a.").setPosition(3)) // optional accent
        .setAttribute("noteHead", "x"); // make it look like hi-hat
    }
  });

  const voice = new VF.Voice({ num_beats: vexNotes.length, beat_value: 4 });
  voice.addTickables(vexNotes);

  new VF.Formatter().joinVoices([voice]).format([voice], 600);
  voice.draw(context, stave);
}
