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

let activeCategory = "전체";
let library = [];
let allCategories = ["전체"];
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
audio.addEventListener("error", () => {
  const current = filteredPlaylist[currentIndex];
  trackMeta.textContent = current
    ? `재생 실패: ${current.title} 파일을 확인해주세요. (지원 포맷/경로 오류)`
    : "재생 실패: 파일 경로 또는 포맷을 확인해주세요.";
});
audio.volume = Number(volume.value);

function inferCategoryAndTitleFromName(fileName) {
  const baseName = fileName.replace(/\.[^/.]+$/, "");
  if (baseName.includes("__")) {
    const [rawCategory, ...titleParts] = baseName.split("__");
    return { category: rawCategory || "기타", title: titleParts.join("__") || baseName };
  }
  return { category: "기타", title: baseName };
}

function buildLibraryFromFileNames(fileNames) {
  return fileNames.map((name) => {
    const { category, title } = inferCategoryAndTitleFromName(name);
    return {
      title,
      artist: "Local Storage",
      category,
      src: `./music/${name}`,
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
  try {
    library = await loadLibraryFromManifest();
  } catch {
    try {
      library = await loadLibraryFromDirectoryListing();
    } catch {
      library = [];
    }
  }

  allCategories = ["전체", ...new Set(library.map((t) => t.category || "기타"))];
  renderCategories();
  applyCategory();

  if (library.length === 0) {
    trackTitle.textContent = "음악 파일 없음";
    trackMeta.textContent = "music 폴더에 음원을 넣으면 자동으로 목록에 표시됩니다.";
  }
}

initLibrary();
