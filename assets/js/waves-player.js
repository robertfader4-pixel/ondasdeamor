
(function () {
  const modal = document.getElementById("soundModal");
  const card = document.getElementById("soundModalCard");
  const dragHandle = document.getElementById("soundModalDrag");
  const openBtn = document.getElementById("openSoundBtn");
  const closeBtn = document.getElementById("closeSoundBtn");
  const audio = document.getElementById("soundtrack");
  const canvas = document.getElementById("spectrumCanvas");
  const playlistItems = Array.from(document.querySelectorAll(".playlist-item"));
  const STORAGE_KEY = "waves_of_love_player_state_v3";

  if (!modal || !card || !dragHandle || !openBtn || !closeBtn || !audio || !canvas || !playlistItems.length) return;

  let audioCtx = null;
  let analyser = null;
  let source = null;
  let animationId = null;
  let isDragging = false;
  let dragOffsetX = 0;
  let dragOffsetY = 0;

  function loadState() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "null"); }
    catch (err) { return null; }
  }

  function normalizeTrack(src) {
    return (src || "").split("/").pop().toLowerCase();
  }

  function currentActiveButton() {
    return playlistItems.find((item) => item.classList.contains("active")) || playlistItems[0];
  }

  function saveState(extra) {
    const activeButton = currentActiveButton();
    const state = Object.assign({
      trackKey: normalizeTrack(activeButton ? activeButton.getAttribute("data-src") : ""),
      currentTime: Number.isFinite(audio.currentTime) ? audio.currentTime : 0,
      isPlaying: !audio.paused,
      isOpen: modal.classList.contains("active"),
      left: card.style.left || "",
      top: card.style.top || "",
      right: card.style.right || "",
      bottom: card.style.bottom || ""
    }, extra || {});
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (err) {}
  }

  function setActiveButton(button) {
    playlistItems.forEach((item) => item.classList.toggle("active", item === button));
  }

  function setTrack(button, resumeTime, shouldPlay) {
    if (!button) return;
    setActiveButton(button);
    audio.innerHTML = "";
    const primary = document.createElement("source");
    primary.src = button.getAttribute("data-src");
    primary.type = "audio/mpeg";
    audio.appendChild(primary);
    const fallback = button.getAttribute("data-fallback");
    if (fallback) {
      const fb = document.createElement("source");
      fb.src = fallback;
      fb.type = "audio/wav";
      audio.appendChild(fb);
    }
    audio.load();
    if (resumeTime && resumeTime > 0) {
      audio.addEventListener("loadedmetadata", function restoreTime() {
        try { audio.currentTime = Math.max(0, Math.min(resumeTime, audio.duration || resumeTime)); } catch (err) {}
        audio.removeEventListener("loadedmetadata", restoreTime);
      });
    }
    if (shouldPlay) {
      audio.addEventListener("canplay", function playWhenReady() {
        audio.play().catch(() => {});
        audio.removeEventListener("canplay", playWhenReady);
      });
    }
    saveState({ trackKey: normalizeTrack(button.getAttribute("data-src")), currentTime: resumeTime || 0, isPlaying: !!shouldPlay });
  }

  function openModal() {
    modal.classList.add("active");
    modal.setAttribute("aria-hidden", "false");
    saveState({ isOpen: true });
    startSpectrum();
  }

  function closeModal() {
    modal.classList.remove("active");
    modal.setAttribute("aria-hidden", "true");
    saveState({ isOpen: false });
  }

  function stopAudio() {
    audio.pause();
    saveState({ isPlaying: false, currentTime: audio.currentTime || 0 });
  }

  function ensureAudioGraph() {
    if (analyser) return;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    audioCtx = new AudioContextClass();
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.85;
    source = audioCtx.createMediaElementSource(audio);
    source.connect(analyser);
    analyser.connect(audioCtx.destination);
  }

  function resizeCanvas() {
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.max(10, Math.floor(rect.width * ratio));
    canvas.height = Math.max(10, Math.floor(rect.height * ratio));
  }

  function drawSpectrum() {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    resizeCanvas();
    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);
    const bg = ctx.createLinearGradient(0, 0, 0, height);
    bg.addColorStop(0, "rgba(255,255,255,0.22)");
    bg.addColorStop(1, "rgba(120,207,208,0.06)");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    if (!analyser || audio.paused) {
      ctx.fillStyle = "rgba(94,192,192,0.38)";
      for (let i = 0; i < 28; i++) {
        const x = (width / 28) * i;
        const barHeight = (Math.sin(Date.now() / 450 + i) * 0.5 + 0.55) * height * 0.35;
        ctx.fillRect(x + 3, height - barHeight - 5, Math.max(3, width / 42), barHeight);
      }
      animationId = requestAnimationFrame(drawSpectrum);
      return;
    }

    const data = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(data);
    const barWidth = width / data.length;
    for (let i = 0; i < data.length; i++) {
      const value = data[i] / 255;
      const barHeight = Math.max(4, value * height * 0.9);
      const gradient = ctx.createLinearGradient(0, height - barHeight, 0, height);
      gradient.addColorStop(0, "rgba(255,255,255,0.95)");
      gradient.addColorStop(0.45, "rgba(127,214,214,0.88)");
      gradient.addColorStop(1, "rgba(255,154,198,0.72)");
      ctx.fillStyle = gradient;
      ctx.fillRect(i * barWidth, height - barHeight, Math.max(2, barWidth - 1), barHeight);
    }
    animationId = requestAnimationFrame(drawSpectrum);
  }

  function startSpectrum() {
    if (animationId) cancelAnimationFrame(animationId);
    animationId = requestAnimationFrame(drawSpectrum);
  }

  async function tryPlay() {
    try {
      ensureAudioGraph();
      if (audioCtx && audioCtx.state === "suspended") await audioCtx.resume();
      await audio.play();
      saveState({ isPlaying: true });
      startSpectrum();
    } catch (err) {
      saveState({ isPlaying: false });
    }
  }

  openBtn.addEventListener("click", function () {
    openModal();
    if (audio.paused) tryPlay();
  });

  closeBtn.addEventListener("click", function () {
    closeModal();
    stopAudio();
  });

  playlistItems.forEach((button) => {
    button.addEventListener("click", function () {
      setTrack(button, 0, true);
      tryPlay();
    });
  });

  dragHandle.addEventListener("pointerdown", function (event) {
    isDragging = true;
    card.setPointerCapture(event.pointerId);
    const rect = card.getBoundingClientRect();
    dragOffsetX = event.clientX - rect.left;
    dragOffsetY = event.clientY - rect.top;
    card.style.right = "auto";
    card.style.bottom = "auto";
  });

  dragHandle.addEventListener("pointermove", function (event) {
    if (!isDragging) return;
    const maxLeft = Math.max(0, window.innerWidth - card.offsetWidth);
    const maxTop = Math.max(0, window.innerHeight - card.offsetHeight);
    const left = Math.min(maxLeft, Math.max(0, event.clientX - dragOffsetX));
    const top = Math.min(maxTop, Math.max(0, event.clientY - dragOffsetY));
    card.style.left = left + "px";
    card.style.top = top + "px";
    saveState({ left: card.style.left, top: card.style.top, right: "auto", bottom: "auto" });
  });

  dragHandle.addEventListener("pointerup", function (event) {
    isDragging = false;
    try { card.releasePointerCapture(event.pointerId); } catch (err) {}
  });

  audio.addEventListener("timeupdate", function () { saveState(); });
  audio.addEventListener("pause", function () { saveState({ isPlaying: false }); });
  audio.addEventListener("play", function () { saveState({ isPlaying: true }); startSpectrum(); });
  window.addEventListener("beforeunload", function () { saveState(); });

  const state = loadState();
  let startButton = playlistItems[0];
  if (state && state.trackKey) {
    startButton = playlistItems.find((item) => normalizeTrack(item.getAttribute("data-src")) === state.trackKey) || startButton;
  }
  setTrack(startButton, state && state.currentTime ? state.currentTime : 0, false);

  if (state) {
    if (state.left) card.style.left = state.left;
    if (state.top) card.style.top = state.top;
    if (state.right) card.style.right = state.right;
    if (state.bottom) card.style.bottom = state.bottom;
    if (state.isOpen) openModal();
    if (state.isPlaying) tryPlay();
  }
})();
