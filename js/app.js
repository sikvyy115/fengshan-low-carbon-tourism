// 鳳山智慧低碳旅遊導覽系統
let attractionData = [];
let routesData = [];
let audioMap = {};
let currentSpot = null;
let currentCategory = "探索";
let currentRoute = null;
const guideAudio = new Audio();
guideAudio.preload = "none";
let audioSequenceToken = 0;

function stopGuideAudio() {
  audioSequenceToken++;
  guideAudio.pause();
  guideAudio.removeAttribute("src");
  guideAudio.load();
  const status = document.getElementById("audio-status");
  if (status) status.textContent = "點選小導遊，聆聽景點介紹";
}

function showPage(pageID) {
  stopGuideAudio();
  document.querySelectorAll(".page").forEach(page => page.classList.remove("active"));
  const target = document.getElementById(pageID);
  if (target) target.classList.add("active");
}

async function loadJSON(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`讀取失敗：${path}`);
  return response.json();
}

async function loadAttractions() {
  try {
    attractionData = await loadJSON("data/attractions.json");
    audioMap = await loadJSON("data/audio-map.json");
    filterSpot("探索");
    console.log("景點資料載入完成：", attractionData.length);
  } catch (error) {
    console.error(error);
    const list = document.getElementById("spot-list");
    if (list) list.innerHTML = `<p class="load-error">景點資料載入失敗，請確認使用 Live Server 開啟網頁。</p>`;
  }
}

async function loadRoutes() {
  try {
    routesData = await loadJSON("data/routes.json");
    renderRoutes();
  } catch (error) {
    console.error(error);
  }
}

function openSpots() {
  showPage("spots");
  filterSpot("探索");
}

function openRoutes() {
  showPage("routes");
  if (routesData.length) renderRoutes();
}

function filterSpot(type) {
  currentCategory = type;
  const spotList = document.getElementById("spot-list");
  if (!spotList) return;
  spotList.innerHTML = "";
  const result = attractionData.filter(spot => spot.type === type);
  result.forEach(spot => {
    const card = document.createElement("article");
    card.className = "card";
    card.tabIndex = 0;
    card.setAttribute("role", "button");
    card.setAttribute("aria-label", `查看${spot.name}介紹`);
    card.innerHTML = `
      <img src="${spot.image}" alt="${spot.name}" onerror="this.style.visibility='hidden'">
      <h2>${spot.name}</h2>
    `;
    card.addEventListener("click", () => showDetail(spot.id));
    card.addEventListener("keydown", e => {
      if (e.key === "Enter" || e.key === " ") showDetail(spot.id);
    });
    spotList.appendChild(card);
  });
}


// 各景點交通資訊：依先前確認的捷運出口與交通方式整理。
const trafficGuide = {
  F01:{zh:"捷運大東站（O13）1號出口，沿光遠路往西騎乘 YouBike 約2分鐘即可抵達。",en:"Take Exit 1 of Dadong Station (O13). Ride a YouBike west along Guangyuan Road for about 2 minutes.",mode:"bike",time:"約2分鐘",timeEn:"About 2 min"},
  F02:{zh:"捷運鳳山站（O12）2號出口，往中華街觀光夜市商圈步行約1～2分鐘即可抵達。",en:"Take Exit 2 of Fengshan Station (O12). Walk toward the Zhonghua Street Tourist Night Market area for about 1–2 minutes.",mode:"walk",time:"約1～2分鐘",timeEn:"About 1–2 min"},
  F03:{zh:"捷運大東站（O13）1號出口，沿光遠路步行約3分鐘即可抵達。",en:"Take Exit 1 of Dadong Station (O13). Walk along Guangyuan Road for about 3 minutes.",mode:"walk",time:"約3分鐘",timeEn:"About 3 min"},
  F04:{zh:"捷運鳳山站（O12）2號出口，往中華街觀光夜市入口方向步行約1分鐘即可抵達。",en:"Take Exit 2 of Fengshan Station (O12), then walk toward the Zhonghua Street Tourist Night Market entrance for about 1 minute.",mode:"walk",time:"約1分鐘",timeEn:"About 1 min"},
  F05:{zh:"捷運衛武營站（O10）4號出口，沿建軍路往北騎乘 YouBike 約3～5分鐘即可抵達。",en:"Take Exit 4 of Weiwuying Station (O10). Ride a YouBike north along Jianjun Road for about 3–5 minutes.",mode:"bike",time:"約3～5分鐘",timeEn:"About 3–5 min"},
  F06:{zh:"捷運鳳山站（O12）2號出口，沿中華街轉入信義街步行約2分鐘即可抵達。",en:"Take Exit 2 of Fengshan Station (O12). Walk along Zhonghua Street and turn onto Xinyi Street; it takes about 2 minutes.",mode:"walk",time:"約2分鐘",timeEn:"About 2 min"},
  S01:{zh:"捷運大東站（O13）2號出口，出站後即可抵達藝術中心園區。",en:"Take Exit 2 of Dadong Station (O13). The arts center plaza is just outside the station.",mode:"walk",time:"出站即達",timeEn:"Right outside"},
  S02:{zh:"捷運衛武營站（O10）6號出口，出站後經地下連通道即可抵達。",en:"Take Exit 6 of Weiwuying Station (O10). Follow the underground passage directly to the venue.",mode:"walk",time:"出站即達",timeEn:"Direct access"},
  S03:{zh:"捷運衛武營站（O10）5號出口，出站後沿建軍路步行約1分鐘即可抵達。",en:"Take Exit 5 of Weiwuying Station (O10), then walk along Jianjun Road for about 1 minute.",mode:"walk",time:"約1分鐘",timeEn:"About 1 min"},
  S04:{zh:"捷運鳳山站（O12）2號出口，沿中華街、曹公路方向騎乘 YouBike 約3分鐘即可抵達。",en:"Take Exit 2 of Fengshan Station (O12). Ride a YouBike toward Zhonghua Street and Caogong Road for about 3 minutes.",mode:"bike",time:"約3分鐘",timeEn:"About 3 min"},
  S05:{zh:"捷運大東站（O13）2號出口，沿大東一路接中山東路騎乘 YouBike 約3～5分鐘即可抵達。",en:"Take Exit 2 of Dadong Station (O13). Ride a YouBike along Dadong 1st Road and Zhongshan East Road for about 3–5 minutes.",mode:"bike",time:"約3～5分鐘",timeEn:"About 3–5 min"},
  S06:{zh:"捷運大東站（O13）1號出口，沿大東一路往鳳山溪方向騎乘 YouBike 約2分鐘即可抵達。",en:"Take Exit 1 of Dadong Station (O13). Ride a YouBike along Dadong 1st Road toward the Fengshan River for about 2 minutes.",mode:"bike",time:"約2分鐘",timeEn:"About 2 min"},
  S07:{zh:"捷運鳳山站（O12）1號出口，沿復興街往南騎乘 YouBike 約2分鐘即可抵達。",en:"Take Exit 1 of Fengshan Station (O12). Ride a YouBike south along Fuxing Street for about 2 minutes.",mode:"bike",time:"約2分鐘",timeEn:"About 2 min"},
  S08:{zh:"捷運大東站（O13）1號出口，往三民路44巷方向騎乘 YouBike 約2分鐘即可抵達。",en:"Take Exit 1 of Dadong Station (O13). Ride a YouBike toward Lane 44, Sanmin Road, for about 2 minutes.",mode:"bike",time:"約2分鐘",timeEn:"About 2 min"},
  T01:{zh:"捷運大東站（O13）2號出口，沿大東一路往南接光明路騎乘 YouBike 約3分鐘即可抵達。",en:"Take Exit 2 of Dadong Station (O13). Ride a YouBike south along Dadong 1st Road toward Guangming Road for about 3 minutes.",mode:"bike",time:"約3分鐘",timeEn:"About 3 min"},
  T02:{zh:"捷運鳳山站（O12）1號出口，沿曹公路往北騎乘 YouBike 約2分鐘即可抵達。",en:"Take Exit 1 of Fengshan Station (O12). Ride a YouBike north along Caogong Road for about 2 minutes.",mode:"bike",time:"約2分鐘",timeEn:"About 2 min"},
  T03:{zh:"捷運大東站（O13）2號出口，沿大東一路接中山路騎乘 YouBike 約3分鐘即可抵達。",en:"Take Exit 2 of Dadong Station (O13). Ride a YouBike along Dadong 1st Road toward Zhongshan Road for about 3 minutes.",mode:"bike",time:"約3分鐘",timeEn:"About 3 min"},
  T04:{zh:"捷運鳳山站（O12）1號出口，沿光遠路往東騎乘 YouBike 約3分鐘即可抵達。",en:"Take Exit 1 of Fengshan Station (O12). Ride a YouBike east along Guangyuan Road for about 3 minutes.",mode:"bike",time:"約3分鐘",timeEn:"About 3 min"}
};

function setTrafficModeIcons(mode) {
  const safeMode = mode === "bike" ? "bike" : "walk";
  for (const id of ["traffic-mode-icon-zh", "traffic-mode-icon-en"]) {
    const holder = document.getElementById(id);
    if (!holder) continue;
    let img = holder.querySelector("img");
    if (!img) {
      holder.replaceChildren();
      img = document.createElement("img");
      img.alt = "";
      holder.appendChild(img);
    }
    img.src = `images/transport-icons/${safeMode}.png`;
  }
}

function renderTraffic(spot) {
  const data = trafficGuide[spot.id];
  const zh = document.getElementById("detail-traffic");
  const en = document.getElementById("detail-traffic-en");
  const iconZh = document.getElementById("traffic-mode-icon-zh");
  const iconEn = document.getElementById("traffic-mode-icon-en");
  const modeZh = document.getElementById("traffic-mode-zh");
  const modeEn = document.getElementById("traffic-mode-en");
  const timeZh = document.getElementById("traffic-time-zh");
  const timeEn = document.getElementById("traffic-time-en");
  if (!data) {
    zh.textContent = spot.traffic || "交通資訊準備中。"; en.textContent = "Transportation information coming soon.";
    setTrafficModeIcons("walk"); modeZh.textContent = "交通"; modeEn.textContent = "Transit"; timeZh.textContent = ""; timeEn.textContent = ""; return;
  }
  zh.textContent = data.zh; en.textContent = data.en;
  const bike = data.mode === "bike";
  setTrafficModeIcons(bike ? "bike" : "walk");
  modeZh.textContent = bike ? "騎乘" : "步行"; modeEn.textContent = bike ? "Ride" : "Walk";
  timeZh.textContent = data.time; timeEn.textContent = data.timeEn;
}

function showDetail(id) {
  stopGuideAudio();
  const spot = attractionData.find(item => item.id === id);
  if (!spot) return;
  currentSpot = spot;
  document.getElementById("detail-photo").src = spot.image || "";
  document.getElementById("detail-photo").alt = spot.name;
  document.getElementById("detail-name").textContent = spot.name;
  document.getElementById("detail-english").textContent = spot.englishName || spot.name;
  document.getElementById("detail-intro").textContent = spot.intro || "景點介紹準備中。";
  renderTraffic(spot);
  const status = document.getElementById("audio-status");
  status.textContent = (audioMap[id] && audioMap[id].zh)
    ? "點選小導遊，先聽英文名稱，再聽中文介紹"
    : "此景點的語音尚未完成";
  showPage("detail");
}

function backToSpots() {
  showPage("spots");
  filterSpot(currentCategory);
}

function fileExists(path) {
  return fetch(path, { method: "HEAD" })
    .then(response => response.ok)
    .catch(() => false);
}

async function playGuideAudio() {
  if (!currentSpot) return;
  stopGuideAudio();
  const token = audioSequenceToken;
  const paths = audioMap[currentSpot.id] || {};
  const sequence = [];
  if (paths.en && await fileExists(paths.en)) sequence.push({ path: paths.en, label: "英文名稱" });
  if (paths.zh && await fileExists(paths.zh)) sequence.push({ path: paths.zh, label: "中文介紹" });

  if (token !== audioSequenceToken) return;
  const status = document.getElementById("audio-status");
  if (!sequence.length) {
    status.textContent = "這個景點目前還沒有可播放的錄音。";
    return;
  }

  for (const item of sequence) {
    if (token !== audioSequenceToken) return;
    status.textContent = `正在播放：${item.label}`;
    const played = await playOne(item.path, token);
    if (!played && token === audioSequenceToken) {
      status.textContent = `音檔無法播放：${item.path}`;
      return;
    }
  }
  if (token === audioSequenceToken) status.textContent = "介紹播放完畢。";
}

function playOne(path, token) {
  return new Promise(resolve => {
    if (token !== audioSequenceToken) return resolve(false);
    guideAudio.pause();
    guideAudio.src = path;
    guideAudio.currentTime = 0;
    const cleanup = () => {
      guideAudio.onended = null;
      guideAudio.onerror = null;
    };
    guideAudio.onended = () => { cleanup(); resolve(true); };
    guideAudio.onerror = () => { cleanup(); resolve(false); };
    const result = guideAudio.play();
    if (result && typeof result.catch === "function") {
      result.catch(() => { cleanup(); resolve(false); });
    }
  });
}

function renderRoutes() {
  const list = document.getElementById("route-list");
  if (!list) return;
  list.innerHTML = "";
  routesData.forEach((route, index) => {
    const card = document.createElement("button");
    card.className = "route-card" + (index === 0 ? " active-route" : "");
    card.innerHTML = `<h2>${route.name}</h2><p>${route.stationName || ""}</p>`;
    card.addEventListener("click", () => selectRoute(route.id, card));
    list.appendChild(card);
  });
  if (routesData.length) selectRoute(routesData[0].id, list.firstElementChild);
}

function selectRoute(routeID, element) {
  document.querySelectorAll(".route-card").forEach(card => card.classList.remove("active-route"));
  if (element) element.classList.add("active-route");
  const route = routesData.find(item => item.id === routeID);
  if (!route) return;
  currentRoute = route;
  const photo = document.getElementById("route-photo");
  photo.src = route.image || "";
  photo.onerror = () => { photo.removeAttribute("src"); photo.alt = "路線圖片尚未提供"; };
  const spots = document.getElementById("route-spots");
  spots.innerHTML = "";
  (route.spots || []).forEach((spot, index) => {
    const row = document.createElement("div");
    row.textContent = `${index + 1}. ${spot}`;
    spots.appendChild(row);
  });
  localStorage.setItem("currentRoute", routeID);
}

function confirmRoute() {
  if (!currentRoute) return;
  showPage("carbon");
  loadCarbon();
}

function loadCarbon() {
  const id = localStorage.getItem("currentRoute");
  const route = routesData.find(item => item.id === id);
  if (!route) return;

  const qr = document.getElementById("route-qrcode");
  const mapLink = document.getElementById("route-map-link");
  const mapOpen = document.getElementById("route-map-open");
  const title = document.getElementById("carbon-route-title");
  const mapUrl = route.navigationUrl || "";

  title.textContent = `${route.id}｜${route.name} Google Maps 導航`;
  qr.src = route.qrcode || `images/qrcode/${route.id}.png`;
  qr.alt = `${route.id} ${route.name} Google Maps 路線 QR Code`;
  qr.onerror = () => { qr.removeAttribute("src"); qr.alt = "路線 QR Code 尚未產生"; };
  mapLink.href = mapUrl || "#";
  mapOpen.href = mapUrl || "#";
  mapOpen.style.display = mapUrl ? "inline-flex" : "none";

  const box = document.querySelector(".carbon-result");
  if (!box) return;

  const car = Number(route.carbon?.car);
  const low = Number(route.carbon?.public);
  const valid = Number.isFinite(car) && Number.isFinite(low) && car > 0 && low >= 0;
  if (!valid) {
    box.innerHTML = `<h2>🌱 低碳旅遊成果</h2><p>此路線尚未設定可用的碳排估算資料。</p>`;
    return;
  }

  const reduction = Math.max(0, car - low);
  const reductionRate = car > 0 ? (reduction / car * 100) : 0;
  const fmt = value => value.toFixed(2);
  const isProvisional = route.carbon?.status === "provisional_project_estimate";
  const spots = (route.spots || []).map((spot, i) => `<li>${i + 1}. ${spot}</li>`).join("");

  box.innerHTML = `
    <h2>🌱 ${route.id}｜${route.name} 低碳旅遊成果</h2>
    <p class="carbon-unit-note">原專題暫估（kg CO₂e／趟；計算基準待核）</p>
    <div class="carbon-comparison">
      <article class="carbon-option car-option">
        <div class="carbon-option-icon">🚗</div>
        <h3>汽油小客車</h3>
        <strong>${fmt(car)}</strong>
        <span>kg CO₂e／趟</span>
      </article>
      <article class="carbon-option low-carbon-option">
        <div class="carbon-option-icon">🚇 🚲 🚶</div>
        <h3>捷運＋自行車＋步行</h3>
        <strong>${fmt(low)}</strong>
        <span>kg CO₂e／趟</span>
      </article>
    </div>
    <div class="carbon-saving">
      <span>🌿 預估減少碳排</span>
      <strong>${fmt(reduction)} kg CO₂e／趟</strong>
      <b>約減少 ${reductionRate.toFixed(0)}%</b>
    </div>
    <div class="route-stop-summary">
      <h3>本路線景點順序</h3>
      <ol>${spots}</ol>
    </div>
    ${isProvisional ? `<p class="carbon-provisional">⚠️ 目前顯示的是原專題資料中的暫估值，並非已核實的實際測量結果；每人或每車的計算基準也尚待確認。完成各交通路段距離、運具排放係數及乘車人數校正後，才能作為正式減碳成果。</p>` : ""}
  `;
}

function updateSensorData() {
  console.log("等待 ESP32 溫溼度資料串接；目前先顯示預設值。");
}

window.addEventListener("pagehide", stopGuideAudio);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) stopGuideAudio();
});
window.addEventListener("DOMContentLoaded", () => {
  loadAttractions();
  loadRoutes();
  updateSensorData();
});
