const audio = new Audio();
const fileInput = document.getElementById("fileInput");
const trackTitle = document.getElementById("trackTitle");
const trackMeta = document.getElementById("trackMeta");
const playPauseBtn = document.getElementById("playPauseBtn");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const progress = document.getElementById("progress");
const currentTime = document.getElementById("currentTime");
const duration = document.getElementById("duration");
const volume = document.getElementById("volume");
const playlistEl = document.getElementById("playlist");

let playlist = [];
let currentIndex = -1;

function formatTime(seconds) {
  if (!Number.isFinite(seconds)) return "00:00";
  const min = Math.floor(seconds / 60);
  const sec = Math.floor(seconds % 60);
  return `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

function sanitizeTrackName(fileName) {
  return fileName.replace(/\.[^/.]+$/, "");
}

function updateButtons() {
  const hasTracks = playlist.length > 0;
  playPauseBtn.disabled = !hasTracks;
  prevBtn.disabled = !hasTracks;
  nextBtn.disabled = !hasTracks;
}

function renderPlaylist() {
  playlistEl.innerHTML = "";
  playlist.forEach((track, index) => {
    const li = document.createElement("li");
    li.className = index === currentIndex ? "active" : "";

    const title = document.createElement("span");
    title.textContent = sanitizeTrackName(track.file.name);

    const time = document.createElement("span");
    time.className = "track-time";
    time.textContent = track.duration ? formatTime(track.duration) : "--:--";

    li.append(title, time);
    li.addEventListener("click", () => {
      loadTrack(index, true);
    });
    playlistEl.appendChild(li);
  });
}

function setTrackInfo(track) {
  trackTitle.textContent = sanitizeTrackName(track.file.name);
  trackMeta.textContent = `${track.file.type || "audio"} / ${(track.file.size / 1024 / 1024).toFixed(2)}MB`;
}

function loadTrack(index, autoPlay = false) {
  if (!playlist[index]) return;
  currentIndex = index;
  const track = playlist[index];
  audio.src = track.url;
  audio.load();
  setTrackInfo(track);
  renderPlaylist();
  if (autoPlay) {
    audio.play();
  }
}

function togglePlayPause() {
  if (!audio.src) return;
  if (audio.paused) {
    audio.play();
  } else {
    audio.pause();
  }
}

function goToNext() {
  if (playlist.length === 0) return;
  const nextIndex = (currentIndex + 1) % playlist.length;
  loadTrack(nextIndex, true);
}

function goToPrev() {
  if (playlist.length === 0) return;
  const prevIndex = (currentIndex - 1 + playlist.length) % playlist.length;
  loadTrack(prevIndex, true);
}

fileInput.addEventListener("change", () => {
  const files = Array.from(fileInput.files || []);
  playlist.forEach((track) => URL.revokeObjectURL(track.url));

  playlist = files.map((file) => ({
    file,
    url: URL.createObjectURL(file),
    duration: null,
  }));

  updateButtons();
  renderPlaylist();

  if (playlist.length > 0) {
    loadTrack(0, false);
  } else {
    currentIndex = -1;
    audio.removeAttribute("src");
    audio.load();
    trackTitle.textContent = "선택된 곡 없음";
    trackMeta.textContent = "재생할 파일을 먼저 선택해주세요.";
  }
});

playPauseBtn.addEventListener("click", togglePlayPause);
nextBtn.addEventListener("click", goToNext);
prevBtn.addEventListener("click", goToPrev);

progress.addEventListener("input", () => {
  if (!audio.duration) return;
  const ratio = Number(progress.value) / 100;
  audio.currentTime = ratio * audio.duration;
});

volume.addEventListener("input", () => {
  audio.volume = Number(volume.value);
});

audio.addEventListener("play", () => {
  playPauseBtn.textContent = "⏸ 일시정지";
});

audio.addEventListener("pause", () => {
  playPauseBtn.textContent = "▶ 재생";
});

audio.addEventListener("loadedmetadata", () => {
  duration.textContent = formatTime(audio.duration);
  if (playlist[currentIndex]) {
    playlist[currentIndex].duration = audio.duration;
    renderPlaylist();
  }
});

audio.addEventListener("timeupdate", () => {
  currentTime.textContent = formatTime(audio.currentTime);
  if (audio.duration) {
    progress.value = String((audio.currentTime / audio.duration) * 100);
  } else {
    progress.value = "0";
  }
});

audio.addEventListener("ended", () => {
  goToNext();
});

updateButtons();
