const audio = new Audio();
const trackTitle = document.getElementById("trackTitle");
const trackMeta = document.getElementById("trackMeta");
const playPauseBtn = document.getElementById("playPauseBtn");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const repeatBtn = document.getElementById("repeatBtn");
const progress = document.getElementById("progress");
const currentTime = document.getElementById("currentTime");
const duration = document.getElementById("duration");
const volume = document.getElementById("volume");
const playlistEl = document.getElementById("playlist");
const categoryButtons = document.getElementById("categoryButtons");

let activeCategory = "All";
let library = [];
let allCategories = ["All"];
let filteredPlaylist = [];
let currentIndex = -1;
let repeatMode = "off";

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
  repeatBtn.disabled = !hasTracks;
}

function getPlaybackQueueIndexes() {
  const checkedIndexes = filteredPlaylist
    .map((track, index) => (track.checked ? index : -1))
    .filter((index) => index >= 0);
  return checkedIndexes.length > 0 ? checkedIndexes : filteredPlaylist.map((_, index) => index);
}

function getNextIndex(step) {
  const queue = getPlaybackQueueIndexes();
  if (queue.length === 0) return -1;
  const queuePos = queue.indexOf(currentIndex);
  const currentQueuePos = queuePos >= 0 ? queuePos : 0;
  const targetPos = currentQueuePos + step;

  if (repeatMode === "all") {
    const wrappedPos = (targetPos + queue.length) % queue.length;
    return queue[wrappedPos];
  }

  if (targetPos < 0 || targetPos >= queue.length) return -1;
  return queue[targetPos];
}

function updateRepeatButton() {
  const labelMap = { off: "REP: OFF", all: "REP: ALL", one: "REP: ONE" };
  repeatBtn.textContent = labelMap[repeatMode];
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

    const left = document.createElement("span");
    left.className = "track-left";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = Boolean(track.checked);
    checkbox.addEventListener("click", (event) => {
      event.stopPropagation();
      track.checked = checkbox.checked;
    });

    const title = document.createElement("span");
    title.textContent = track.title;
    left.append(checkbox, title);

    const category = document.createElement("span");
    category.className = "track-time";
    category.textContent = track.category || "Uncategorized";

    li.append(left, category);
    li.addEventListener("click", () => loadTrack(index, true));
    playlistEl.appendChild(li);
  });
}

function setTrackInfo(track) {
  trackTitle.textContent = track.title;
  trackMeta.textContent = `${track.artist || "Unknown"} / ${track.category || "Uncategorized"}`;
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
    activeCategory === "All"
      ? [...library]
      : library.filter((track) => (track.category || "Uncategorized") === activeCategory);
  currentIndex = -1;
  audio.pause();
  audio.removeAttribute("src");
  audio.load();
  currentTime.textContent = "00:00";
  duration.textContent = "00:00";
  progress.value = "0";
  trackTitle.textContent = "No track selected";
  trackMeta.textContent = "Choose a track from the list.";
  renderPlaylist();
  updateButtons();
}

function togglePlayPause() {
  if (!audio.src) {
    const queue = getPlaybackQueueIndexes();
    if (queue.length === 0) return;
    loadTrack(queue[0], true);
    return;
  }
  if (audio.paused) audio.play().catch(() => {});
  else audio.pause();
}

function goToNext() {
  if (filteredPlaylist.length === 0) return;
  if (repeatMode === "one" && currentIndex >= 0) {
    loadTrack(currentIndex, true);
    return;
  }
  const nextIndex = getNextIndex(1);
  if (nextIndex >= 0) {
    loadTrack(nextIndex, true);
    return;
  }
  audio.pause();
  audio.currentTime = 0;
  playPauseBtn.textContent = "▶";
}

function goToPrev() {
  if (filteredPlaylist.length === 0) return;
  const prevIndex = getNextIndex(-1);
  if (prevIndex >= 0) loadTrack(prevIndex, true);
}

playPauseBtn.addEventListener("click", togglePlayPause);
nextBtn.addEventListener("click", goToNext);
prevBtn.addEventListener("click", goToPrev);
repeatBtn.addEventListener("click", () => {
  if (repeatMode === "off") repeatMode = "all";
  else if (repeatMode === "all") repeatMode = "one";
  else repeatMode = "off";
  updateRepeatButton();
});

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
audio.addEventListener("error", () => {
  const current = filteredPlaylist[currentIndex];
  trackMeta.textContent = current
    ? `Playback failed: ${current.title}. Check file format or path.`
    : "Playback failed: check file path or format.";
});
audio.volume = Number(volume.value);

function inferCategoryAndTitleFromName(fileName) {
  const baseName = fileName.replace(/\.[^/.]+$/, "");
  if (baseName.includes("__")) {
    const [rawCategory, ...titleParts] = baseName.split("__");
    return { category: rawCategory || "Uncategorized", title: titleParts.join("__") || baseName };
  }
  return { category: "Uncategorized", title: baseName };
}

function buildLibraryFromFileNames(fileNames) {
  return fileNames.map((name) => {
    const { category, title } = inferCategoryAndTitleFromName(name);
    return {
      title,
      artist: "Local Storage",
      category,
      src: `./music/${encodeURIComponent(name)}`,
      checked: false,
    };
  });
}

async function loadLibraryFromManifest() {
  const response = await fetch("./music/manifest.json", { cache: "no-store" });
  if (!response.ok) throw new Error("manifest not found");
  const manifest = await response.json();
  const files = Array.isArray(manifest.files) ? manifest.files : [];
  return buildLibraryFromFileNames(files);
}

async function loadLibraryFromDirectoryListing() {
  const response = await fetch("./music/", { cache: "no-store" });
  if (!response.ok) throw new Error("directory listing not available");
  const html = await response.text();
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const anchors = Array.from(doc.querySelectorAll("a"));
  const musicFiles = anchors
    .map((a) => decodeURIComponent((a.getAttribute("href") || "").trim()))
    .filter((href) => /\.(mp3|wav|m4a|ogg|flac|aac)$/i.test(href))
    .map((href) => href.replace(/^\.?\//, ""));
  return buildLibraryFromFileNames(musicFiles);
}

async function initLibrary() {
  let manifestLibrary = [];
  let directoryLibrary = [];
  try {
    manifestLibrary = await loadLibraryFromManifest();
  } catch {}
  try {
    directoryLibrary = await loadLibraryFromDirectoryListing();
  } catch {}

  const merged = [...manifestLibrary, ...directoryLibrary];
  const seen = new Set();
  library = merged.filter((track) => {
    if (seen.has(track.src)) return false;
    seen.add(track.src);
    return true;
  });

  allCategories = ["All", ...new Set(library.map((t) => t.category || "Uncategorized"))];
  renderCategories();
  applyCategory();

  if (library.length === 0) {
    trackTitle.textContent = "No music files found";
    trackMeta.textContent = "Add audio files into the music folder and refresh.";
  }
}

initLibrary();
updateRepeatButton();
