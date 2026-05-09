const audio = new Audio();
const fileInput = document.getElementById("fileInput");
const saveToStorageBtn = document.getElementById("saveToStorageBtn");
const clearStorageBtn = document.getElementById("clearStorageBtn");
const storageInfo = document.getElementById("storageInfo");
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

const DB_NAME = "browser-music-player";
const STORE_NAME = "tracks";

let playlist = [];
let currentIndex = -1;

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getStoredTracks() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

async function saveTrackToDb(file) {
  const db = await openDb();
  const record = {
    id: crypto.randomUUID(),
    name: file.name,
    type: file.type || "audio/mpeg",
    size: file.size,
    blob: file,
    createdAt: Date.now(),
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(record);
    tx.oncomplete = () => {
      db.close();
      resolve(record);
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

async function clearStorage() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).clear();
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

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

function updateStorageInfo() {
  const storedTracks = playlist.filter((track) => track.stored);
  const totalSize = storedTracks.reduce((sum, track) => sum + track.file.size, 0);
  storageInfo.textContent = `저장된 파일: ${storedTracks.length}개 / ${(totalSize / 1024 / 1024).toFixed(2)}MB`;
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

    if (track.stored) {
      title.textContent = `${title.textContent} (저장됨)`;
    }

    li.append(title, time);
    li.addEventListener("click", () => {
      loadTrack(index, true);
    });
    playlistEl.appendChild(li);
  });
}

function setTrackInfo(track) {
  trackTitle.textContent = sanitizeTrackName(track.file.name);
  const saveText = track.stored ? "저장됨" : "임시";
  trackMeta.textContent = `${track.file.type || "audio"} / ${(track.file.size / 1024 / 1024).toFixed(2)}MB / ${saveText}`;
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

function appendFilesToPlaylist(files, stored = false) {
  const newTracks = files.map((file) => ({
    id: crypto.randomUUID(),
    file,
    url: URL.createObjectURL(file),
    duration: null,
    stored,
  }));

  playlist = [...playlist, ...newTracks];
  updateButtons();
  updateStorageInfo();
  renderPlaylist();

  if (currentIndex === -1 && playlist.length > 0) {
    loadTrack(0, false);
  }
}

fileInput.addEventListener("change", () => {
  const files = Array.from(fileInput.files || []);
  appendFilesToPlaylist(files, false);
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

saveToStorageBtn.addEventListener("click", async () => {
  const files = Array.from(fileInput.files || []);
  if (files.length === 0) {
    alert("먼저 저장할 음악 파일을 선택해주세요.");
    return;
  }

  try {
    for (const file of files) {
      await saveTrackToDb(file);
    }
    alert(`${files.length}개 파일을 저장소에 업로드했습니다.`);
    await hydrateFromStorage();
  } catch (error) {
    alert(`저장 실패: ${String(error)}`);
  }
});

clearStorageBtn.addEventListener("click", async () => {
  const ok = window.confirm("저장소의 모든 곡을 삭제할까요?");
  if (!ok) return;

  try {
    await clearStorage();
    playlist.forEach((track) => URL.revokeObjectURL(track.url));
    playlist = [];
    currentIndex = -1;
    audio.pause();
    audio.removeAttribute("src");
    audio.load();
    trackTitle.textContent = "선택된 곡 없음";
    trackMeta.textContent = "재생할 파일을 먼저 선택해주세요.";
    currentTime.textContent = "00:00";
    duration.textContent = "00:00";
    progress.value = "0";
    renderPlaylist();
    updateButtons();
    updateStorageInfo();
  } catch (error) {
    alert(`삭제 실패: ${String(error)}`);
  }
});

async function hydrateFromStorage() {
  const stored = await getStoredTracks();
  playlist.forEach((track) => URL.revokeObjectURL(track.url));
  playlist = [];
  currentIndex = -1;

  const storedFiles = stored
    .sort((a, b) => a.createdAt - b.createdAt)
    .map((record) => new File([record.blob], record.name, { type: record.type }));

  appendFilesToPlaylist(storedFiles, true);

  if (storedFiles.length === 0) {
    trackTitle.textContent = "선택된 곡 없음";
    trackMeta.textContent = "재생할 파일을 먼저 선택해주세요.";
  }
}

updateButtons();
updateStorageInfo();
hydrateFromStorage().catch(() => {
  // IndexedDB 미지원/권한 오류 시 로컬 임시 재생만 가능하도록 유지
  storageInfo.textContent = "저장소를 사용할 수 없어요. 임시 재생만 가능합니다.";
});
