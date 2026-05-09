const audio = new Audio();
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
const categoryButtons = document.getElementById("categoryButtons");

const library = Array.isArray(window.MUSIC_LIBRARY) ? window.MUSIC_LIBRARY : [];
const allCategories = ["전체", ...new Set(library.map((t) => t.category || "기타"))];

let activeCategory = "전체";
let filteredPlaylist = [];
let currentIndex = -1;

function formatTime(seconds) {
  if (!Number.isFinite(seconds)) return "00:00";
  const min = Math.floor(seconds / 60);
  const sec = Math.floor(seconds % 60);
  return `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

function updateButtons() {
  const hasTracks = filteredPlaylist.length > 0;
  playPauseBtn.disabled = !hasTracks;
  prevBtn.disabled = !hasTracks;
  nextBtn.disabled = !hasTracks;
}

function renderCategories() {
  categoryButtons.innerHTML = "";
  allCategories.forEach((category) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = category;
    if (category === activeCategory) btn.classList.add("active");
    btn.addEventListener("click", () => {
      activeCategory = category;
      applyCategory();
      renderCategories();
    });
    categoryButtons.appendChild(btn);
  });
}

function renderPlaylist() {
  playlistEl.innerHTML = "";
  filteredPlaylist.forEach((track, index) => {
    const li = document.createElement("li");
    li.className = index === currentIndex ? "active" : "";

    const title = document.createElement("span");
    title.textContent = track.title;

    const category = document.createElement("span");
    category.className = "track-time";
    category.textContent = track.category || "기타";

    li.append(title, category);
    li.addEventListener("click", () => loadTrack(index, true));
    playlistEl.appendChild(li);
  });
}

function setTrackInfo(track) {
  trackTitle.textContent = track.title;
  trackMeta.textContent = `${track.artist || "Unknown"} / ${track.category || "기타"}`;
}

function loadTrack(index, autoPlay = false) {
  const track = filteredPlaylist[index];
  if (!track) return;
  currentIndex = index;
  audio.src = track.src;
  audio.load();
  setTrackInfo(track);
  renderPlaylist();
  if (autoPlay) audio.play().catch(() => {});
}

function applyCategory() {
  filteredPlaylist =
    activeCategory === "전체" ? [...library] : library.filter((track) => (track.category || "기타") === activeCategory);
  currentIndex = -1;
  audio.pause();
  audio.removeAttribute("src");
  audio.load();
  currentTime.textContent = "00:00";
  duration.textContent = "00:00";
  progress.value = "0";
  trackTitle.textContent = "선택된 곡 없음";
  trackMeta.textContent = "카테고리에서 곡을 선택해주세요.";
  renderPlaylist();
  updateButtons();
}

function togglePlayPause() {
  if (!audio.src) return;
  if (audio.paused) audio.play().catch(() => {});
  else audio.pause();
}

function goToNext() {
  if (filteredPlaylist.length === 0) return;
  const nextIndex = (currentIndex + 1) % filteredPlaylist.length;
  loadTrack(nextIndex, true);
}

function goToPrev() {
  if (filteredPlaylist.length === 0) return;
  const prevIndex = (currentIndex - 1 + filteredPlaylist.length) % filteredPlaylist.length;
  loadTrack(prevIndex, true);
}

playPauseBtn.addEventListener("click", togglePlayPause);
nextBtn.addEventListener("click", goToNext);
prevBtn.addEventListener("click", goToPrev);

progress.addEventListener("input", () => {
  if (!audio.duration) return;
  audio.currentTime = (Number(progress.value) / 100) * audio.duration;
});

volume.addEventListener("input", () => {
  audio.volume = Number(volume.value);
});

audio.addEventListener("play", () => {
  playPauseBtn.textContent = "⏸";
});

audio.addEventListener("pause", () => {
  playPauseBtn.textContent = "▶";
});

audio.addEventListener("loadedmetadata", () => {
  duration.textContent = formatTime(audio.duration);
});

audio.addEventListener("timeupdate", () => {
  currentTime.textContent = formatTime(audio.currentTime);
  progress.value = audio.duration ? String((audio.currentTime / audio.duration) * 100) : "0";
});

audio.addEventListener("ended", goToNext);
audio.volume = Number(volume.value);

renderCategories();
applyCategory();
