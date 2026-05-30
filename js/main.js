// /ITALIA/js/main.js
import {
  MP,
  mpInit,
  mpWrite,
  mpUpdate,
  mpAddOrUpdateMe,
  mpInc,
  mpAddScore,
  mpParticipantsArray,
  mpAuthReady,
} from "./firebase-mp.js";

/* =========================
   CONFIG
========================= */
const ADMIN_PASSWORD = "AlexQuest2026";
const EXTERNAL_PASSWORD = "ItaliaQuestEditor";

const QUESTIONS_PER_REGION = 12; // domande per partita
const QUESTION_POOL_SIZE = 40;   // domande generate da Wiki per regione

/* =========================
   DEFAULT DATA (20 regioni)
========================= */
const defaultQuizData = {
  "IT-25": { region: "Piemonte", questions: [] },
  "IT-23": { region: "Valle d'Aosta", questions: [] },
  "IT-42": { region: "Liguria", questions: [] },
  "IT-21": { region: "Lombardia", questions: [] },
  "IT-32": { region: "Trentino-Alto Adige", questions: [] },
  "IT-34": { region: "Veneto", questions: [] },
  "IT-45": { region: "Friuli-Venezia Giulia", questions: [] },
  "IT-36": { region: "Emilia-Romagna", questions: [] },
  "IT-52": { region: "Toscana", questions: [] },
  "IT-55": { region: "Umbria", questions: [] },
  "IT-57": { region: "Marche", questions: [] },
  "IT-62": { region: "Lazio", questions: [] },
  "IT-67": { region: "Abruzzo", questions: [] },
  "IT-65": { region: "Molise", questions: [] },
  "IT-72": { region: "Campania", questions: [] },
  "IT-75": { region: "Puglia", questions: [] },
  "IT-77": { region: "Basilicata", questions: [] },
  "IT-78": { region: "Calabria", questions: [] },
  "IT-88": { region: "Sicilia", questions: [] },
  "IT-82": { region: "Sardegna", questions: [] },
};

const defaultImagesData = Object.fromEntries(Object.keys(defaultQuizData).map((k) => [k, ""]));

const defaultRegionNumbers = {
  "IT-25": 2, "IT-23": 19, "IT-42": 8, "IT-21": 9, "IT-32": 17, "IT-34": 20,
  "IT-45": 6, "IT-36": 5, "IT-52": 16, "IT-55": 18, "IT-57": 10, "IT-62": 7,
  "IT-67": 11, "IT-65": 1, "IT-72": 4, "IT-75": 13, "IT-77": 12, "IT-78": 3,
  "IT-88": 15, "IT-82": 14,
};

const defaultPacchiData = Object.fromEntries(Object.keys(defaultQuizData).map((k) => [
  k,
  {
    region: defaultQuizData[k].region,
    pack: `Pacco per ${defaultQuizData[k].region}`,
    imageUrl: "",
    effect: { type: "score", delta: 1, currency: "punti" },
  },
]));

/* =========================
   Wiki helpers data (per domande base)
========================= */
const CAPOLUOGHI = {
  "IT-25": "Torino",
  "IT-23": "Aosta",
  "IT-42": "Genova",
  "IT-21": "Milano",
  "IT-32": "Trento",
  "IT-34": "Venezia",
  "IT-45": "Trieste",
  "IT-36": "Bologna",
  "IT-52": "Firenze",
  "IT-55": "Perugia",
  "IT-57": "Ancona",
  "IT-62": "Roma",
  "IT-67": "L'Aquila",
  "IT-65": "Campobasso",
  "IT-72": "Napoli",
  "IT-75": "Bari",
  "IT-77": "Potenza",
  "IT-78": "Catanzaro",
  "IT-88": "Palermo",
  "IT-82": "Cagliari",
};

const MACROAREA = {
  "IT-25": "Nord",
  "IT-23": "Nord",
  "IT-42": "Nord",
  "IT-21": "Nord",
  "IT-32": "Nord",
  "IT-34": "Nord",
  "IT-45": "Nord",
  "IT-36": "Nord",
  "IT-52": "Centro",
  "IT-55": "Centro",
  "IT-57": "Centro",
  "IT-62": "Centro",
  "IT-67": "Centro",
  "IT-65": "Sud",
  "IT-72": "Sud",
  "IT-75": "Sud",
  "IT-77": "Sud",
  "IT-78": "Sud",
  "IT-88": "Isole",
  "IT-82": "Isole",
};

/* =========================
   GLOBALS
========================= */
let adminOnline = false;
let gameMode = "quiz";
let quizTimeLimit = 15;

let quizData = structuredClone(defaultQuizData);
let imagesData = structuredClone(defaultImagesData);
let regionNumbers = structuredClone(defaultRegionNumbers);
let pacchiData = structuredClone(defaultPacchiData);

let participants = [];
let completedRegions = [];
let turnOrder = [];
let currentTurnIndex = 0;

let currentRegionCode = null;
let currentRegionName = null;
let currentQuestionIndex = 0;
let userAnswers = [];
let currentQuizQuestions = [];
let quizIntervalId = null;
let quizTimeRemaining = 0;

let registeringLock = false;

/* =========================
   DOM refs
========================= */
const svg = document.getElementById("map-svg");

const registerModal = document.getElementById("register-modal");
const registerForm = document.getElementById("register-form");
const registerMsg = document.getElementById("register-msg");
const closeRegisterBtn = document.getElementById("close-register-btn");
const openRegisterBtn = document.getElementById("open-register-btn");
const leaderboardBody = document.getElementById("leaderboard-body");

const adminStatus = document.getElementById("admin-status");
const adminLoginBtn = document.getElementById("admin-login-btn");

const playerList = document.getElementById("player-list");
const selectedPlayersDetails = document.getElementById("selected-players-details");
const resetSelectionBtn = document.getElementById("reset-selection-btn");

const togglePlayersBtn = document.getElementById("toggle-players-btn");
const playerSelectionDiv = document.getElementById("player-selection");

const quizModal = document.getElementById("quiz-modal");
const quizContent = document.getElementById("quiz-content");
const quizFeedback = document.getElementById("quiz-feedback");
const prevBtn = document.getElementById("prev-btn");
const nextBtn = document.getElementById("next-btn");
const closeQuizBtn = document.getElementById("close-quiz-btn");
const quizImage = document.getElementById("quiz-image");
const quizTimerElem = document.getElementById("quiz-timer");

const gameModeRadios = document.querySelectorAll('input[name="game-mode"]');
const quizTimeInput = document.getElementById("quiz-time-input");
const saveQuizTimeBtn = document.getElementById("save-quiz-time-btn");
const quizTimeMsg = document.getElementById("quiz-time-msg");

/* =========================
   MENU refs
========================= */
const menuToggleBtn = document.getElementById("menu-toggle-btn");
const menuContainer = document.getElementById("menu-container");

const manageQuestionsBtn = document.getElementById("manage-questions-btn");
const manageImagesBtn = document.getElementById("manage-images-btn");
const externalManageBtn = document.getElementById("external-manage-btn");
const manageNumbersBtn = document.getElementById("manage-numbers-btn");
const managePacchiBtn = document.getElementById("manage-pacchi-btn");
const archiveEventsBtn = document.getElementById("archive-events-btn");
const documentsBtn = document.getElementById("documents-btn");

/* =========================
   Turn indicator
========================= */
const turnIndicatorDiv = document.createElement("div");
turnIndicatorDiv.id = "turn-indicator";
turnIndicatorDiv.style.cssText = `
  position: fixed;
  top: 10px;
  right: 50%;
  transform: translateX(50%);
  background: rgba(0,0,0,0.7);
  color: #fff;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  font-weight: 700;
  z-index: 2500;
  display: none;
`;
turnIndicatorDiv.innerHTML = `Turno di: <span id="turn-player-name"></span>`;
document.body.appendChild(turnIndicatorDiv);
const turnNameSpan = document.getElementById("turn-player-name");

/* =========================
   UI helpers: modals
========================= */
function showAlert(message) {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.style.zIndex = 9000;
    const box = document.createElement("div");
    box.className = "modal-box";
    box.innerHTML = `<h3>Attenzione</h3><p>${String(message).replace(/\n/g, "<br>")}</p>`;
    const btns = document.createElement("div");
    btns.className = "modal-buttons";
    const ok = document.createElement("button");
    ok.textContent = "OK";
    ok.addEventListener("click", () => {
      document.body.removeChild(overlay);
      resolve();
    });
    btns.appendChild(ok);
    box.appendChild(btns);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
    setTimeout(() => ok.focus(), 0);
  });
}

function showConfirm(message) {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.style.zIndex = 9000;
    overlay.className = "modal-overlay";
    const box = document.createElement("div");
    box.className = "modal-box";
    box.innerHTML = `<h3>Conferma</h3><p>${String(message)}</p>`;
    const btns = document.createElement("div");
    btns.className = "modal-buttons";

    const cancel = document.createElement("button");
    cancel.className = "cancel";
    cancel.textContent = "Annulla";
    cancel.addEventListener("click", () => {
      document.body.removeChild(overlay);
      resolve(false);
    });

    const ok = document.createElement("button");
    ok.textContent = "OK";
    ok.addEventListener("click", () => {
      document.body.removeChild(overlay);
      resolve(true);
    });

    btns.appendChild(cancel);
    btns.appendChild(ok);
    box.appendChild(btns);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
    setTimeout(() => cancel.focus(), 0);
  });
}

function showPrompt(message, { password = true, placeholder = "" } = {}) {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    const box = document.createElement("div");
    box.className = "modal-box";
    box.innerHTML = `<h3>Inserisci Valore</h3><p>${String(message)}</p>`;

    const form = document.createElement("form");
    const input = document.createElement("input");
    input.className = "modal-input";
    input.type = password ? "password" : "text";
    input.placeholder = placeholder || "";
    input.autocomplete = password ? "current-password" : "off";
    form.appendChild(input);

    const btns = document.createElement("div");
    btns.className = "modal-buttons";

    const cancel = document.createElement("button");
    cancel.type = "button";
    cancel.className = "cancel";
    cancel.textContent = "Annulla";

    const ok = document.createElement("button");
    ok.type = "submit";
    ok.textContent = "OK";

    cancel.addEventListener("click", () => {
      document.body.removeChild(overlay);
      resolve(null);
    });

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const val = input.value;
      document.body.removeChild(overlay);
      resolve(val);
    });

    btns.appendChild(cancel);
    btns.appendChild(ok);
    form.appendChild(btns);
    box.appendChild(form);

    overlay.appendChild(box);
    document.body.appendChild(overlay);
    setTimeout(() => input.focus(), 0);
  });
}

/* =========================
   Internal modal builder (admin panels)
========================= */
function openPanelModal({ title, width = 860, content }) {
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.style.zIndex = 5000;

  const box = document.createElement("div");
  box.className = "modal-box";
  box.style.width = `min(${width}px, 92vw)`;
  box.style.maxHeight = "90vh";
  box.style.overflow = "auto";

  const h = document.createElement("h3");
  h.textContent = title;
  box.appendChild(h);

  if (content) box.appendChild(content);

  const btns = document.createElement("div");
  btns.className = "modal-buttons";

  const close = document.createElement("button");
  close.textContent = "Chiudi";
  close.className = "cancel";
  close.addEventListener("click", () => cleanup());

  btns.appendChild(close);
  box.appendChild(btns);

  overlay.appendChild(box);
  document.body.appendChild(overlay);

  const onKey = (e) => {
    if (e.key === "Escape") cleanup();
  };
  document.addEventListener("keydown", onKey);

  function cleanup() {
    document.removeEventListener("keydown", onKey);
    if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
  }

  return { close: cleanup, box, overlay };
}

function el(tag, props = {}, children = []) {
  const n = document.createElement(tag);
  Object.entries(props || {}).forEach(([k, v]) => {
    if (k === "class") n.className = v;
    else if (k === "style") n.style.cssText = v;
    else if (k.startsWith("on") && typeof v === "function") n.addEventListener(k.slice(2), v);
    else n.setAttribute(k, v);
  });
  (Array.isArray(children) ? children : [children]).forEach((c) => {
    if (c == null) return;
    if (typeof c === "string") n.appendChild(document.createTextNode(c));
    else n.appendChild(c);
  });
  return n;
}

function regionList() {
  return Object.keys(defaultQuizData);
}

function regionLabel(code) {
  return `${regionNumbers?.[code] ?? ""}. ${quizData?.[code]?.region || defaultQuizData[code]?.region || code}`;
}

function pickRandomDifferent(arr, exclude, count) {
  const pool = arr.filter((x) => !exclude.includes(x));
  const out = [];
  while (pool.length && out.length < count) {
    const i = Math.floor(Math.random() * pool.length);
    out.push(pool.splice(i, 1)[0]);
  }
  return out;
}

async function ensureAdminOrAsk() {
  if (adminOnline) return true;

  const pwd = await showPrompt("Inserisci password admin per aprire la gestione:");
  if (pwd === null) return false;
  if (pwd !== ADMIN_PASSWORD) {
    await showAlert("Password errata.");
    return false;
  }
  await mpAuthReady();
  await mpWrite("adminOnline", true);
  return true;
}

async function ensureExternalPassword() {
  const pwd = await showPrompt("Password gestione esterna:");
  if (pwd === null) return false;
  if (pwd !== EXTERNAL_PASSWORD) {
    await showAlert("Password errata.");
    return false;
  }
  return true;
}

/* =========================
   ✅ MENU open/close
========================= */
function closeMenu() {
  if (!menuContainer) return;
  menuContainer.style.display = "none";
}
function toggleMenu() {
  if (!menuContainer) return;
  menuContainer.style.display = (menuContainer.style.display === "block") ? "none" : "block";
}

if (menuToggleBtn && menuContainer) {
  menuToggleBtn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleMenu();
  });
  menuContainer.addEventListener("click", (e) => e.stopPropagation());
  document.addEventListener("click", () => closeMenu());
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeMenu(); });
}

/* =========================
   Multiplayer: apply state
========================= */
function getRegionName(code) {
  return quizData?.[code]?.region || "";
}
function getRegionNumber(code) {
  const n = regionNumbers?.[code];
  return (typeof n !== "undefined") ? n : "";
}

function setAdminOnlineUI(isOnline) {
  adminOnline = !!isOnline;
  if (!adminStatus) return;
  if (adminOnline) {
    adminStatus.textContent = "Admin Online: ON";
    adminStatus.classList.add("online");
  } else {
    adminStatus.textContent = "Admin Online: OFF";
    adminStatus.classList.remove("online");
  }
  updateAdminLoginBtn();
}

function updateAdminLoginBtn() {
  if (!adminLoginBtn) return;
  if (adminOnline) {
    adminLoginBtn.textContent = "Logout Admin";
    adminLoginBtn.style.background = "#22aa22";
  } else {
    adminLoginBtn.textContent = "Login Admin";
    adminLoginBtn.style.background = "#aa2222";
  }
}

function updateTurnIndicator() {
  if (!turnOrder || turnOrder.length === 0) {
    turnIndicatorDiv.style.display = "none";
    turnNameSpan.textContent = "";
    return;
  }
  const uid = turnOrder[currentTurnIndex] || turnOrder[0];
  const p = (MP.state?.participants || {})[uid];
  turnNameSpan.textContent = p?.nickname || "";
  turnIndicatorDiv.style.display = "block";
}

function updateLeaderboard() {
  if (!leaderboardBody) return;
  leaderboardBody.innerHTML = "";

  const arr = [...participants];
  arr.sort((a, b) => {
    if ((b.score || 0) !== (a.score || 0)) return (b.score || 0) - (a.score || 0);
    return (b.wins || 0) - (a.wins || 0);
  });

  arr.forEach((p, i) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${i + 1}</td>
      <td>${p.nickname || ""}</td>
      <td>${p.wins || 0}</td>
      <td>${p.losses || 0}</td>
      <td>${p.games || 0}</td>
      <td>${p.score || 0}</td>
    `;
    leaderboardBody.appendChild(tr);
  });
}

function updateRegionNumbersUI() {
  if (!svg) return;
  Object.entries(regionNumbers || {}).forEach(([regionCode, num]) => {
    const group = svg.querySelector(`g[data-region-code="${regionCode}"]`);
    if (!group) return;

    const numberText = group.querySelector("text.region-number");
    if (numberText) numberText.textContent = String(num);

    const nameText = group.querySelector("text.region-name");
    if (nameText) nameText.textContent = getRegionName(regionCode);
  });
}

function updateMapProgressVisual() {
  if (!svg) return;
  const completedSet = new Set(completedRegions);

  svg.querySelectorAll("g[data-region-code]").forEach((group) => {
    const code = group.dataset.regionCode;
    const existingMarker = group.querySelector("text.completed-marker");

    if (completedSet.has(code)) {
      if (!existingMarker) {
        const textX = document.createElementNS("http://www.w3.org/2000/svg", "text");
        textX.classList.add("completed-marker");
        textX.setAttribute("x", 0);
        textX.setAttribute("y", 4);
        textX.textContent = "✖";
        group.appendChild(textX);
      }
    } else {
      if (existingMarker) group.removeChild(existingMarker);
    }
  });
}

function applyPersistedGameModeUI() {
  gameModeRadios.forEach((r) => { r.checked = (r.value === gameMode); });
}

function applyRemoteStateToUI(state) {
  if (!state) return;

  quizData = state.quizData || quizData;
  imagesData = state.imagesData || imagesData;
  regionNumbers = state.regionNumbers || regionNumbers;
  pacchiData = state.pacchiData || pacchiData;

  gameMode = state.gameMode || "quiz";
  quizTimeLimit = Number(state.quizTimeLimit || 15);

  participants = mpParticipantsArray(state).map((p) => ({
    uid: p.uid,
    nickname: p.nickname,
    wins: Number(p.wins || 0),
    losses: Number(p.losses || 0),
    games: Number(p.games || 0),
    score: Number(p.score || 0),
  }));

  completedRegions = Object.keys(state.completedRegions || {});
  turnOrder = Array.isArray(state.turnOrder) ? state.turnOrder : [];
  currentTurnIndex = Number(state.currentTurnIndex || 0);

  setAdminOnlineUI(!!state.adminOnline);
  updateRegionNumbersUI();
  updateMapProgressVisual();
  updateLeaderboard();
  applyPersistedGameModeUI();
  updateTurnIndicator();

  renderPlayersMultiplayer(state);

  if (quizTimeInput) quizTimeInput.value = String(quizTimeLimit);
}

/* =========================
   Multiplayer players UI
========================= */
function renderPlayersMultiplayer(state) {
  if (!playerList) return;
  playerList.innerHTML = "";

  const pObj = state.participants || {};
  const selObj = state.selectedPlayers || {};

  Object.entries(pObj).forEach(([uid, p]) => {
    const li = document.createElement("li");
    li.style.cssText =
      "padding:4px 6px;border-bottom:1px solid #004466;display:flex;align-items:center;justify-content:space-between;";

    const left = document.createElement("div");
    left.style.display = "flex";
    left.style.alignItems = "center";

    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = !!selObj[uid];

    const label = document.createElement("label");
    label.textContent = p.nickname || uid.slice(0, 6);
    label.style.marginLeft = "6px";

    cb.addEventListener("change", async () => {
      await mpAuthReady();
      await mpWrite(`selectedPlayers/${uid}`, cb.checked);

      const live = MP.state || state;
      const nowSel = { ...(live.selectedPlayers || {}), [uid]: cb.checked };
      const uids = Object.keys(nowSel).filter((id) => nowSel[id]);

      await mpWrite("turnOrder", uids);
      await mpWrite("currentTurnIndex", 0);
    });

    left.appendChild(cb);
    left.appendChild(label);
    li.appendChild(left);
    playerList.appendChild(li);
  });

  const selectedNames = Object.keys(selObj)
    .filter((uid) => selObj[uid])
    .map((uid) => pObj[uid]?.nickname)
    .filter(Boolean);

  if (selectedPlayersDetails) {
    selectedPlayersDetails.innerHTML = selectedNames.length
      ? `<ul>${selectedNames.map((n) => `<li>${n}</li>`).join("")}</ul>`
      : "Nessun giocatore selezionato.";
  }

  if (closeRegisterBtn) closeRegisterBtn.disabled = participants.length === 0;
}

/* =========================
   Game logic
========================= */
function getCurrentTurnUid() {
  if (!turnOrder || turnOrder.length === 0) return null;
  return turnOrder[currentTurnIndex] || turnOrder[0] || null;
}

async function nextPlayerTurn() {
  if (!turnOrder || turnOrder.length === 0) return;
  const next = (currentTurnIndex + 1) % turnOrder.length;
  await mpWrite("currentTurnIndex", next);
}

async function markRegionCompleted(code) {
  await mpWrite(`completedRegions/${code}`, true);
}

async function toggleRegionCompleted(code) {
  const isDone = !!(MP.state?.completedRegions?.[code]);
  if (isDone) await mpWrite(`completedRegions/${code}`, null);
  else await mpWrite(`completedRegions/${code}`, true);
}
/* =========================
   QUIZ UI
========================= */
function openQuizModal() {
  if (!quizModal) return;
  quizModal.classList.add("active");
}

function closeQuizModal() {
  if (!quizModal) return;
  quizModal.classList.remove("active");

  if (quizIntervalId) clearInterval(quizIntervalId);
  quizIntervalId = null;

  if (quizFeedback) quizFeedback.textContent = "";
  if (quizTimerElem) quizTimerElem.textContent = "";

  if (prevBtn) prevBtn.style.display = "inline-block";
  if (nextBtn) nextBtn.style.display = "inline-block";
}

function showQuestion() {
  if (!quizData?.[currentRegionCode]?.questions) return;

  if (quizIntervalId) clearInterval(quizIntervalId);
  quizIntervalId = null;

  quizTimeRemaining = quizTimeLimit;

  if (quizTimerElem) {
    quizTimerElem.style.display = "block";
    quizTimerElem.style.color = "";
    quizTimerElem.textContent = `Tempo rimasto: ${quizTimeRemaining}s`;
  }

  const questions = currentQuizQuestions.length
  ? currentQuizQuestions
  : quizData[currentRegionCode].questions;
  const total = questions.length;
  const q = questions[currentQuestionIndex];

  quizContent.innerHTML = "";

  const header = document.createElement("div");
  header.className = "quiz-region-title";
  header.textContent = `${getRegionNumber(currentRegionCode)}. ${currentRegionName}`;
  quizContent.appendChild(header);

  const titleP = document.createElement("p");
  titleP.innerHTML = `<strong>Domanda ${currentQuestionIndex + 1} di ${total}</strong>`;
  quizContent.appendChild(titleP);

  const questionP = document.createElement("p");
  questionP.textContent = q.question;
  quizContent.appendChild(questionP);

  const shuffledAnswers = q.answers
    .map((answer, originalIndex) => ({ answer, originalIndex }))
    .sort(() => Math.random() - 0.5);

  shuffledAnswers.forEach(({ answer, originalIndex }) => {
    const btn = document.createElement("button");

    btn.textContent = answer;
    btn.className = "answer-btn";
    btn.dataset.originalIndex = String(originalIndex);

    if (userAnswers[currentQuestionIndex] !== null) {
      if (originalIndex === q.correct) {
        btn.classList.add("correct");
      }

      if (
        originalIndex === userAnswers[currentQuestionIndex] &&
        originalIndex !== q.correct
      ) {
        btn.classList.add("wrong");
      }

      btn.disabled = true;
    }

    btn.addEventListener("click", () => selectAnswer(originalIndex));
    quizContent.appendChild(btn);
  });

  prevBtn.disabled = currentQuestionIndex === 0;
  nextBtn.textContent =
    currentQuestionIndex === total - 1 ? "Termina" : "Successiva";

  quizIntervalId = setInterval(() => {
    quizTimeRemaining--;

    if (quizTimerElem) {
      quizTimerElem.textContent = `Tempo rimasto: ${quizTimeRemaining}s`;
      quizTimerElem.style.color = quizTimeRemaining <= 5 ? "#ff4444" : "";
    }

    if (quizTimeRemaining <= 0) {
      clearInterval(quizIntervalId);
      quizIntervalId = null;

      const buttons = quizContent.querySelectorAll(".answer-btn");

      buttons.forEach((btn) => {
        const originalIndex = Number(btn.dataset.originalIndex);
        btn.disabled = true;

        if (originalIndex === q.correct) {
          btn.classList.add("correct");
        }
      });

      if (quizFeedback) quizFeedback.textContent = "Tempo scaduto!";

      setTimeout(() => nextBtnHandler(), 800);
    }
  }, 1000);
}

function selectAnswer(selectedIndex) {
  if (quizIntervalId) clearInterval(quizIntervalId);
  quizIntervalId = null;

  userAnswers[currentQuestionIndex] = selectedIndex;

 const questions = currentQuizQuestions.length
  ? currentQuizQuestions
  : quizData[currentRegionCode].questions;

const q = questions[currentQuestionIndex];
  const buttons = quizContent.querySelectorAll(".answer-btn");

  buttons.forEach((btn) => {
    const originalIndex = Number(btn.dataset.originalIndex);

    btn.disabled = true;

    if (originalIndex === q.correct) {
      btn.classList.add("correct");
    } else if (originalIndex === selectedIndex) {
      btn.classList.add("wrong");
    }
  });
}

async function nextBtnHandler() {
  const questions = currentQuizQuestions.length
  ? currentQuizQuestions
  : quizData[currentRegionCode].questions;
  const totalQuestions = questions.length;

  if (currentQuestionIndex < totalQuestions - 1) {
    currentQuestionIndex++;
    showQuestion();
    return;
  }

  let correctCount = 0;

  userAnswers.forEach((ans, idx) => {
    if (ans === questions[idx].correct) correctCount++;
  });

  if (quizFeedback) {
    quizFeedback.textContent = `Hai risposto correttamente a ${correctCount} su ${totalQuestions} domande.`;
  }

  const uid = getCurrentTurnUid();

  if (!uid) {
    await showAlert("Errore: turno non valido.");
    closeQuizModal();
    return;
  }

  const win = correctCount >= 3;

  await mpInc(uid, "games");

  if (win) await mpInc(uid, "wins");
  else await mpInc(uid, "losses");

  if (win) {
    await showAlert(
      `Complimenti! Hai vinto il quiz su ${getRegionNumber(currentRegionCode)}. ${currentRegionName}!`
    );

    const open = await showConfirm(
      `Vuoi aprire il pacco per ${getRegionNumber(currentRegionCode)}. ${currentRegionName}?`
    );

    if (open) {
      closeQuizModal();
      await showPaccoModal(currentRegionCode, currentRegionName);
      return;
    }
  } else {
    await showAlert(
      "Mi dispiace, non hai superato il quiz e non puoi aprire il pacco."
    );
  }

  closeQuizModal();
  await nextPlayerTurn();
}

async function startQuizForRegion(regionCode, regionName) {
  if (!adminOnline) {
    await showAlert("Gioco non attivo: attendi che l'admin avvii la sessione.");
    return;
  }

  if (!turnOrder || turnOrder.length === 0) {
    await showAlert("Seleziona almeno un giocatore.");
    return;
  }

  currentRegionCode = regionCode;
  currentRegionName = regionName;

  await showAlert(`Hai scelto ${getRegionNumber(regionCode)}. ${regionName}`);

  const entry = quizData[regionCode];

  if (!entry || !Array.isArray(entry.questions) || entry.questions.length === 0) {
    quizContent.innerHTML = "<p>Nessun quiz disponibile per questa regione.</p>";

    prevBtn.style.display = "none";
    nextBtn.style.display = "none";
    quizImage.style.display = "none";

    if (quizTimerElem) quizTimerElem.style.display = "none";

    openQuizModal();
    return;
  }

currentQuestionIndex = 0;

currentQuizQuestions = shuffle(entry.questions)
  .slice(0, QUESTIONS_PER_REGION);
  

userAnswers = new Array(currentQuizQuestions.length).fill(null);

  const imgUrl = imagesData?.[regionCode];

  if (imgUrl && imgUrl.trim() !== "") {
    quizImage.src = imgUrl;
    quizImage.alt = regionName;
    quizImage.style.display = "block";
  } else {
    quizImage.style.display = "none";
  }

  if (quizFeedback) quizFeedback.textContent = "";

  prevBtn.style.display = "inline-block";
  nextBtn.style.display = "inline-block";

  showQuestion();
  openQuizModal();
}
/* =========================
   PACCHI
========================= */
async function showPaccoModal(regionCode, regionName) {
  if (!adminOnline) { await showAlert("Gioco non attivo: attendi che l'admin avvii la sessione."); return; }
  if (!turnOrder || turnOrder.length === 0) { await showAlert("Seleziona almeno un giocatore."); return; }

  const uid = getCurrentTurnUid();
  const regionObj = pacchiData[regionCode] || {};
  const textPack = regionObj.pack || "Pacco non disponibile.";
  const effectObj = regionObj.effect || { type: "none" };

  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.style.zIndex = 4000;

  const box = document.createElement("div");
  box.className = "modal-box";

  const titleEl = document.createElement("div");
  titleEl.style.cssText = "font-size:2rem;margin-bottom:1rem;text-align:center;font-weight:900;";
  titleEl.textContent = `${getRegionNumber(regionCode)}. ${regionName}`;
  box.appendChild(titleEl);

  if (regionObj.imageUrl) {
    const img = document.createElement("img");
    img.src = regionObj.imageUrl;
    img.alt = "Immagine pacco";
    img.style.cssText = "max-width:80%;max-height:200px;margin:0 auto 1rem auto;display:block;";
    img.onerror = () => (img.style.display = "none");
    box.appendChild(img);
  }

  const textEl = document.createElement("div");
  textEl.style.cssText = "font-size:1.1rem;margin-bottom:0.8rem;text-align:center;";
  textEl.textContent = textPack;
  box.appendChild(textEl);

  const feedbackEl = document.createElement("div");
  feedbackEl.style.cssText = "font-size:1.1rem;margin-bottom:0.8rem;text-align:center;font-weight:800;";

  let feedbackMsg = "";
  let extraTurn = false;
  let skipTurn = false;

  switch (effectObj.type) {
    case "score": {
      const delta = Number(effectObj.delta) || 0;
      await mpAddScore(uid, delta);
      const cur = effectObj.currency || "punti";
      feedbackMsg = delta >= 0 ? `Hai guadagnato ${delta} ${cur}!` : `Hai perso ${Math.abs(delta)} ${cur}!`;
      break;
    }
    case "skipTurn":
      skipTurn = true;
      feedbackMsg = "Salti il prossimo turno!";
      break;
    case "extraTurn":
      extraTurn = true;
      feedbackMsg = "Hai un turno extra!";
      break;
    default:
      feedbackMsg = effectObj.message || "Nessun effetto aggiuntivo.";
      break;
  }

  feedbackEl.textContent = feedbackMsg;
  box.appendChild(feedbackEl);

  await markRegionCompleted(regionCode);

  if (!extraTurn) {
    if (skipTurn) {
      const next = (currentTurnIndex + 2) % turnOrder.length;
      await mpWrite("currentTurnIndex", next);
    } else {
      await nextPlayerTurn();
    }
  }

  const btns = document.createElement("div");
  btns.className = "modal-buttons";
  const ok = document.createElement("button");
  ok.textContent = "OK";
  ok.addEventListener("click", () => document.body.removeChild(overlay));
  btns.appendChild(ok);
  box.appendChild(btns);

  overlay.appendChild(box);
  document.body.appendChild(overlay);
  setTimeout(() => ok.focus(), 0);
}

async function startPacchiForRegion(regionCode, regionName) {
  await showPaccoModal(regionCode, regionName);
}

/* =========================
   WIKI ENGINE V2
   - genera archivio ampio
   - evita ripetizioni banali
   - crea 40 domande candidate
========================= */

function normalizeWikiTitle(name) {
  return String(name || "")
    .trim()
    .replaceAll("’", "'")
    .replaceAll("–", "-")
    .replace(/\s+/g, " ");
}

function wikiTitleFallback(title) {
  const map = {
    "Trentino-Alto Adige": "Trentino-Alto Adige/Südtirol",
    "Valle d’Aosta": "Valle d'Aosta",
    "Friuli-Venezia Giulia": "Friuli-Venezia Giulia",
  };
  return map[title] || title;
}

async function wikiQuery({ title, thumbSize = 700 } = {}) {
  const t = wikiTitleFallback(normalizeWikiTitle(title));
  const url =
    "https://it.wikipedia.org/w/api.php" +
    `?action=query&format=json&prop=extracts|pageimages&exintro=1&explaintext=1&piprop=thumbnail&pithumbsize=${thumbSize}` +
    `&redirects=1&titles=${encodeURIComponent(t)}` +
    "&origin=*";

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Wiki error ${res.status}`);
  const j = await res.json();

  const pages = j?.query?.pages || {};
  const page = Object.values(pages)[0] || {};
  const extract = String(page.extract || "").trim();
  const thumb = page?.thumbnail?.source || "";

  return { title: page.title || t, extract, thumb };
}

function firstSentence(extract) {
  const s = String(extract || "").trim();
  if (!s) return "";
  const idx = s.indexOf(".");
  return idx > 20 ? s.slice(0, idx + 1).trim() : s;
}

function splitWikiSentences(extract) {
  return String(extract || "")
    .replace(/\n+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(s =>
      s.length >= 60 &&
      s.length <= 260 &&
      !s.includes("coordinate") &&
      !s.includes("ISBN")
    )
    .slice(0, 16);
}

function shortText(text, max = 160) {
  const s = String(text || "").trim();
  return s.length > max ? s.slice(0, max).trim() + "…" : s;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function uniq(arr) {
  return [...new Set(arr.filter(Boolean))];
}

function makeMCQ({ question, correct, distractors }) {
  const answers = shuffle(uniq([correct, ...distractors]).slice(0, 4));
  while (answers.length < 4) answers.push("N/D");
  return {
    question,
    answers,
    correct: Math.max(0, answers.indexOf(correct)),
  };
}

function addUniqueQuestion(list, q) {
  if (!q || !q.question || !Array.isArray(q.answers)) return;
  if (list.some(item => item.question === q.question)) return;
  if (q.answers.length < 4) return;
  list.push(q);
}

function buildQuestionsForRegion(code, snippetsByCode, targetCount = QUESTION_POOL_SIZE) {
  const region = quizData[code]?.region || defaultQuizData[code]?.region || code;

  const cap = CAPOLUOGHI[code] || "N/D";
  const area = MACROAREA[code] || "Centro";

  const allCaps = Object.values(CAPOLUOGHI).filter(Boolean);
  const allAreas = ["Nord", "Centro", "Sud", "Isole"];

  const mySentences = snippetsByCode[code]?.sentences || [];
  const mySnippet = snippetsByCode[code]?.first || "";

  const otherCodes = Object.keys(snippetsByCode).filter(c => c !== code);
  const otherSentences = otherCodes
    .flatMap(c => snippetsByCode[c]?.sentences || [])
    .filter(Boolean);

  const otherRegions = regionList()
    .filter(c => c !== code)
    .map(c => quizData[c]?.region || defaultQuizData[c]?.region || c);

  const qs = [];

  // 1 sola domanda facile sul capoluogo
  if (cap !== "N/D") {
    addUniqueQuestion(qs, makeMCQ({
      question: `Qual è il capoluogo di ${region}?`,
      correct: cap,
      distractors: pickRandomDifferent(allCaps, [cap], 3),
    }));
  }

  // 1 sola domanda geografica generale
  addUniqueQuestion(qs, makeMCQ({
    question: `In quale macro-area si trova ${region}?`,
    correct: area,
    distractors: pickRandomDifferent(allAreas, [area], 3),
  }));

  // domanda inversa sul capoluogo, ma una sola
  if (cap !== "N/D") {
    addUniqueQuestion(qs, makeMCQ({
      question: `Quale regione ha come capoluogo ${cap}?`,
      correct: region,
      distractors: pickRandomDifferent(otherRegions, [region], 3),
    }));
  }

  // domande da frasi Wikipedia diverse
  const prompts = [
    `Quale descrizione si riferisce a ${region}?`,
    `Quale informazione riguarda ${region}?`,
    `Quale frase descrive meglio ${region}?`,
    `Quale caratteristica è associata a ${region}?`,
    `Quale dettaglio appartiene alla scheda di ${region}?`,
    `Quale tra queste affermazioni parla di ${region}?`,
  ];

  mySentences.forEach((sentence, index) => {
    const correct = shortText(sentence);
    const distractors = shuffle(otherSentences)
      .slice(0, 3)
      .map(s => shortText(s));

    if (distractors.length >= 3) {
      addUniqueQuestion(qs, {
        question: prompts[index % prompts.length],
        answers: shuffle([correct, ...distractors]),
        correct: 0,
      });

      const last = qs[qs.length - 1];
      if (last) last.correct = last.answers.indexOf(correct);
    }
  });

  // domande descrittive controllate
  if (mySnippet) {
    const correct = shortText(mySnippet);
    const distractors = shuffle(otherCodes)
      .slice(0, 3)
      .map(c => shortText(snippetsByCode[c]?.first || "Regione italiana ricca di storia e cultura."));

    addUniqueQuestion(qs, {
      question: `Quale breve descrizione appartiene a ${region}?`,
      answers: shuffle([correct, ...distractors]),
      correct: 0,
    });

    const last = qs[qs.length - 1];
    if (last) last.correct = last.answers.indexOf(correct);
  }

  // filler non ripetitivo, solo se Wiki dà poche frasi
let safety = 0;

while (qs.length < targetCount && safety < 200) {
  safety++;

  const mode = qs.length % 5;
  
    if (mode === 0 && cap !== "N/D") {
      addUniqueQuestion(qs, makeMCQ({
        question: `Tra queste città, quale è collegata a ${region} come capoluogo?`,
        correct: cap,
        distractors: pickRandomDifferent(allCaps, [cap], 3),
      }));
    } else if (mode === 1) {
      addUniqueQuestion(qs, makeMCQ({
        question: `${region} appartiene principalmente a quale area italiana?`,
        correct: area,
        distractors: pickRandomDifferent(allAreas, [area], 3),
      }));
    } else {
      const genericCorrect = `${region} è una regione italiana con una propria identità storica, geografica e culturale.`;
      addUniqueQuestion(qs, {
        question: `Quale frase generica è corretta per ${region}?`,
        answers: shuffle([
          genericCorrect,
          "È uno Stato indipendente dell'Europa centrale.",
          "È una regione situata fuori dal territorio italiano.",
          "È una città metropolitana senza territorio regionale.",
        ]),
        correct: 0,
      });

      const last = qs[qs.length - 1];
      if (last) last.correct = last.answers.indexOf(genericCorrect);
    }

    if (qs.length >= targetCount) break;
  }

  return shuffle(qs).slice(0, targetCount);
}

async function autoUpdateFromWiki({
  updateQuestions = true,
  updatePacchiText = true,
  updateRegionImages = true,
  updatePacchiImages = true,
  overwriteImages = false,
} = {}) {
  const codes = regionList();
  const snippets = {};

  for (const code of codes) {
    const regionName = quizData[code]?.region || defaultQuizData[code]?.region || code;

    try {
      const { extract, thumb } = await wikiQuery({ title: regionName, thumbSize: 900 });

      snippets[code] = {
        first: firstSentence(extract),
        sentences: splitWikiSentences(extract),
      };

      if (updateRegionImages) {
        const exists = String(imagesData?.[code] || "").trim();
        if (overwriteImages || !exists) {
          if (thumb) imagesData[code] = thumb;
        }
      }

      if (updatePacchiText) {
        pacchiData[code] = pacchiData[code] || {
          region: regionName,
          pack: "",
          imageUrl: "",
          effect: { type: "none" },
        };

        const base = extract || `Pacco ispirato a ${regionName}.`;
        pacchiData[code].pack =
          `✨ Dal Wiki: ${base.length > 320 ? base.slice(0, 320).trim() + "…" : base}`;
      }

      if (updatePacchiImages) {
        pacchiData[code] = pacchiData[code] || {
          region: regionName,
          pack: "",
          imageUrl: "",
          effect: { type: "none" },
        };

        const exists = String(pacchiData[code].imageUrl || "").trim();
        if (overwriteImages || !exists) {
          if (thumb) pacchiData[code].imageUrl = thumb;
        }
      }
    } catch (e) {
      console.warn("Wiki fail:", code, regionName, e);
      snippets[code] = { first: "", sentences: [] };
    }
  }

  if (updateQuestions) {
    for (const code of codes) {
      quizData[code] = quizData[code] || {
        region: defaultQuizData[code]?.region || code,
        questions: [],
      };

      quizData[code].questions = buildQuestionsForRegion(
        code,
        snippets,
        QUESTION_POOL_SIZE
      );
    }
  }

  await mpAuthReady();
  await mpUpdate("", { quizData, imagesData, pacchiData });
}

/* =========================
   ✅ MODALI MENU (COMPLETI)
========================= */

// Gestione Domande
function openManageQuestionsModal() {
  const wrap = el("div", { style: "display:flex;gap:12px;flex-wrap:wrap;" });

  const left = el("div", { style: "flex:1;min-width:260px;border:1px solid #004466;border-radius:8px;padding:10px;background:#112244;" });
  const right = el("div", { style: "flex:2;min-width:320px;border:1px solid #004466;border-radius:8px;padding:10px;background:#0d1c3a;" });

  const sel = el("select", { style: "width:100%;padding:8px;border-radius:8px;border:1px solid #004466;background:#112244;color:#aad4ff;font-weight:700;" });
  regionList().forEach((code) => sel.appendChild(el("option", { value: code }, regionLabel(code))));

  const btnRow = el("div", { style: "display:flex;gap:8px;margin-top:10px;flex-wrap:wrap;" });
  const btnAdd = el("button", { style: "background:#00aaff;color:#fff;border:none;border-radius:8px;padding:8px 10px;cursor:pointer;font-weight:800;" }, "➕ Aggiungi Domanda");
  const btnSave = el("button", { style: "background:#22cc88;color:#fff;border:none;border-radius:8px;padding:8px 10px;cursor:pointer;font-weight:800;" }, "💾 Salva su Firebase");
  const btnAuto = el("button", { style: "background:#ffb000;color:#222;border:none;border-radius:8px;padding:8px 10px;cursor:pointer;font-weight:900;" }, "⚡ Auto (Wiki) Domande+Pacchi");
  btnRow.append(btnAdd, btnSave, btnAuto);

  left.appendChild(el("div", { style: "font-weight:900;margin-bottom:6px;" }, "Regione"));
  left.appendChild(sel);
  left.appendChild(btnRow);

  const list = el("div", { style: "margin-top:10px;display:flex;flex-direction:column;gap:8px;" });

  const editor = el("div", { style: "border:1px solid #004466;border-radius:8px;padding:10px;background:#112244;margin-top:10px;" });
  const edTitle = el("div", { style: "font-weight:900;margin-bottom:6px;" }, "Editor domanda");
  const qInput = el("textarea", { style: "width:100%;min-height:70px;resize:vertical;border-radius:8px;border:1px solid #004466;background:#0d1c3a;color:#aad4ff;padding:8px;box-sizing:border-box;" });
  const aInputs = [0, 1, 2, 3].map(() => el("input", { type: "text", style: "width:100%;margin-top:6px;border-radius:8px;border:1px solid #004466;background:#0d1c3a;color:#aad4ff;padding:8px;box-sizing:border-box;" }));
  const correctSel = el("select", { style: "width:100%;margin-top:8px;border-radius:8px;border:1px solid #004466;background:#0d1c3a;color:#aad4ff;padding:8px;font-weight:800;" });
  ["Risposta 1", "Risposta 2", "Risposta 3", "Risposta 4"].forEach((t, i) => correctSel.appendChild(el("option", { value: String(i) }, t)));

  const edBtns = el("div", { style: "display:flex;gap:8px;margin-top:10px;flex-wrap:wrap;justify-content:flex-end;" });
  const edApply = el("button", { style: "background:#22cc88;color:#fff;border:none;border-radius:8px;padding:8px 10px;cursor:pointer;font-weight:900;" }, "Applica");
  const edCancel = el("button", { style: "background:#aa2222;color:#fff;border:none;border-radius:8px;padding:8px 10px;cursor:pointer;font-weight:900;" }, "Annulla");
  edBtns.append(edCancel, edApply);

  editor.appendChild(edTitle);
  editor.appendChild(el("div", { style: "font-weight:800;margin-top:6px;" }, "Testo domanda"));
  editor.appendChild(qInput);
  editor.appendChild(el("div", { style: "font-weight:800;margin-top:10px;" }, "Risposte (4)"));
  aInputs.forEach((i) => editor.appendChild(i));
  editor.appendChild(el("div", { style: "font-weight:800;margin-top:10px;" }, "Corretta"));
  editor.appendChild(correctSel);
  editor.appendChild(edBtns);

  right.appendChild(el("div", { style: "font-weight:900;margin-bottom:6px;" }, "Domande della regione"));
  right.appendChild(list);
  right.appendChild(editor);

  wrap.append(left, right);

  const modal = openPanelModal({ title: "Gestione Domande (interna)", width: 980, content: wrap });

  let currentCode = sel.value;
  let editIndex = null;

  function getQuestions(code) {
    const entry = quizData[code] || defaultQuizData[code];
    if (!entry) return [];
    if (!Array.isArray(entry.questions)) entry.questions = [];
    return entry.questions;
  }

  function clearEditor() {
    editIndex = null;
    qInput.value = "";
    aInputs.forEach((i) => (i.value = ""));
    correctSel.value = "0";
  }

  function fillEditorFromQuestion(q) {
    qInput.value = q?.question || "";
    const arr = Array.isArray(q?.answers) ? q.answers : [];
    for (let i = 0; i < 4; i++) aInputs[i].value = arr[i] || "";
    correctSel.value = String(Number(q?.correct || 0));
  }

  function renderQuestions() {
    list.innerHTML = "";
    const qsArr = getQuestions(currentCode);

    if (!qsArr.length) {
      list.appendChild(el("div", { style: "opacity:0.8;" }, "Nessuna domanda. Premi “Aggiungi Domanda”."));
      clearEditor();
      return;
    }

    qsArr.forEach((q, idx) => {
      const card = el("div", { style: "border:1px solid #004466;border-radius:8px;padding:10px;background:#0d1c3a;" });

      const top = el("div", { style: "display:flex;justify-content:space-between;gap:10px;align-items:center;" });
      const t = el("div", { style: "font-weight:900;" }, `#${idx + 1} ${String(q.question || "").slice(0, 80)}${(q.question || "").length > 80 ? "…" : ""}`);
      const tools = el("div", { style: "display:flex;gap:6px;flex-wrap:wrap;" });

      const bEdit = el("button", { style: "background:#00aaff;color:#fff;border:none;border-radius:8px;padding:6px 8px;cursor:pointer;font-weight:900;" }, "Modifica");
      const bDel = el("button", { style: "background:#aa2222;color:#fff;border:none;border-radius:8px;padding:6px 8px;cursor:pointer;font-weight:900;" }, "Elimina");
      const bUp = el("button", { style: "background:#004466;color:#fff;border:none;border-radius:8px;padding:6px 8px;cursor:pointer;font-weight:900;" }, "↑");
      const bDn = el("button", { style: "background:#004466;color:#fff;border:none;border-radius:8px;padding:6px 8px;cursor:pointer;font-weight:900;" }, "↓");
      bEdit.addEventListener("click", () => {
  editIndex = idx;
  fillEditorFromQuestion(q);
  editor.scrollIntoView({ behavior: "smooth", block: "center" });
  qInput.focus();
});
      bDel.addEventListener("click", async () => {
        const ok = await showConfirm("Eliminare questa domanda?");
        if (!ok) return;
        qsArr.splice(idx, 1);
        quizData[currentCode].questions = qsArr;
        renderQuestions();
      });

      bUp.addEventListener("click", () => {
        if (idx <= 0) return;
        [qsArr[idx - 1], qsArr[idx]] = [qsArr[idx], qsArr[idx - 1]];
        quizData[currentCode].questions = qsArr;
        renderQuestions();
      });

      bDn.addEventListener("click", () => {
        if (idx >= qsArr.length - 1) return;
        [qsArr[idx + 1], qsArr[idx]] = [qsArr[idx], qsArr[idx + 1]];
        quizData[currentCode].questions = qsArr;
        renderQuestions();
      });

      tools.append(bUp, bDn, bEdit, bDel);
      top.append(t, tools);

      const answers = el("div", { style: "margin-top:8px;font-size:0.92rem;opacity:0.95;" });
      const a = Array.isArray(q.answers) ? q.answers : [];
      for (let i = 0; i < 4; i++) {
        const isC = i === Number(q.correct || 0);
        answers.appendChild(el("div", {}, `${isC ? "✅" : "▫️"} ${a[i] || ""}`));
      }

      card.append(top, answers);
      list.appendChild(card);
    });

    if (editIndex == null) clearEditor();
  }

  sel.addEventListener("change", () => {
    currentCode = sel.value;
    clearEditor();
    renderQuestions();
  });

  btnAdd.addEventListener("click", () => {
    editIndex = null;
    clearEditor();
    qInput.focus();
  });

  edCancel.addEventListener("click", () => clearEditor());

  edApply.addEventListener("click", async () => {
    const qText = qInput.value.trim();
    const answers = aInputs.map((i) => i.value.trim());
    const correct = Number(correctSel.value || 0);

    if (!qText) { await showAlert("Inserisci il testo domanda."); return; }
    if (answers.some((a) => !a)) { await showAlert("Inserisci tutte e 4 le risposte."); return; }
    if (!(correct >= 0 && correct <= 3)) { await showAlert("Seleziona la risposta corretta."); return; }

    const qsArr = getQuestions(currentCode);
    const obj = { question: qText, answers, correct };

    if (editIndex == null) qsArr.push(obj);
    else qsArr[editIndex] = obj;

    quizData[currentCode] = quizData[currentCode] || { region: defaultQuizData[currentCode]?.region || currentCode, questions: [] };
    quizData[currentCode].questions = qsArr;

    clearEditor();
    renderQuestions();
  });

  btnSave.addEventListener("click", async () => {
    await mpAuthReady();
    await mpWrite("quizData", quizData);
    await showAlert("Domande salvate su Firebase ✅");
  });

  btnAuto.addEventListener("click", async () => {
    const ok = await showConfirm(`Auto aggiornare DOMANDE (${QUESTIONS_PER_REGION} per regione) + TESTI PACCHI + IMMAGINI (solo vuote) da Wikipedia?`);
    if (!ok) return;

    await autoUpdateFromWiki({
      updateQuestions: true,
      updatePacchiText: true,
      updateRegionImages: true,
      updatePacchiImages: true,
      overwriteImages: false,
    });

    await showAlert("Auto aggiornamento completato ✅");
    renderQuestions();
  });

  renderQuestions();
  return modal;
}

// Gestione Immagini
function openManageImagesModal() {
  const wrap = el("div", { style: "display:flex;gap:12px;flex-wrap:wrap;" });
  const left = el("div", { style: "flex:1;min-width:260px;border:1px solid #004466;border-radius:8px;padding:10px;background:#112244;" });
  const right = el("div", { style: "flex:2;min-width:320px;border:1px solid #004466;border-radius:8px;padding:10px;background:#0d1c3a;" });

  const sel = el("select", { style: "width:100%;padding:8px;border-radius:8px;border:1px solid #004466;background:#112244;color:#aad4ff;font-weight:700;" });
  regionList().forEach((code) => sel.appendChild(el("option", { value: code }, regionLabel(code))));

  const urlInput = el("input", { type: "text", placeholder: "URL immagine (https://...)", style: "width:100%;margin-top:10px;border-radius:8px;border:1px solid #004466;background:#0d1c3a;color:#aad4ff;padding:8px;box-sizing:border-box;" });
  const preview = el("img", { style: "width:100%;max-height:260px;object-fit:contain;border-radius:10px;margin-top:10px;display:none;box-shadow:0 0 10px rgba(0,0,0,0.6);" });

  const btns = el("div", { style: "display:flex;gap:8px;margin-top:10px;flex-wrap:wrap;justify-content:flex-end;" });
  const bWikiEmpty = el("button", { style: "background:#ffb000;color:#222;border:none;border-radius:8px;padding:8px 10px;cursor:pointer;font-weight:900;" }, "⚡ Wiki (solo vuoti)");
  const bWikiOver = el("button", { style: "background:#ff2d55;color:#fff;border:none;border-radius:8px;padding:8px 10px;cursor:pointer;font-weight:900;" }, "🔥 Wiki (sovrascrivi)");
  const bSave = el("button", { style: "background:#22cc88;color:#fff;border:none;border-radius:8px;padding:8px 10px;cursor:pointer;font-weight:900;" }, "💾 Salva");
  const bClear = el("button", { style: "background:#aa2222;color:#fff;border:none;border-radius:8px;padding:8px 10px;cursor:pointer;font-weight:900;" }, "Svuota");
  btns.append(bWikiEmpty, bWikiOver, bClear, bSave);

  left.appendChild(el("div", { style: "font-weight:900;margin-bottom:6px;" }, "Regione"));
  left.appendChild(sel);
  left.appendChild(el("div", { style: "opacity:0.85;margin-top:10px;font-size:0.9rem;" }, "Imposta un URL immagine per la regione (apparirà nel quiz)."));

  right.appendChild(el("div", { style: "font-weight:900;" }, "URL immagine"));
  right.appendChild(urlInput);
  right.appendChild(preview);
  right.appendChild(btns);

  wrap.append(left, right);

  const modal = openPanelModal({ title: "Gestione Immagini (interna)", width: 900, content: wrap });
  let currentCode = sel.value;

  function render() {
    const v = imagesData?.[currentCode] || "";
    urlInput.value = v;
    if (v.trim()) {
      preview.src = v.trim();
      preview.style.display = "block";
      preview.onerror = () => { preview.style.display = "none"; };
    } else {
      preview.style.display = "none";
    }
  }

  sel.addEventListener("change", () => { currentCode = sel.value; render(); });
  urlInput.addEventListener("input", () => {
    const v = urlInput.value.trim();
    if (v) {
      preview.src = v;
      preview.style.display = "block";
      preview.onerror = () => { preview.style.display = "none"; };
    } else preview.style.display = "none";
  });

  bClear.addEventListener("click", () => { urlInput.value = ""; preview.style.display = "none"; });

  bSave.addEventListener("click", async () => {
    const v = urlInput.value.trim();
    imagesData[currentCode] = v;
    await mpAuthReady();
    await mpWrite("imagesData", imagesData);
    await showAlert("Immagini salvate ✅");
  });

  bWikiEmpty.addEventListener("click", async () => {
    const ok = await showConfirm("Caricare immagini da Wikipedia SOLO dove sono vuote?");
    if (!ok) return;

    await autoUpdateFromWiki({
      updateQuestions: false,
      updatePacchiText: false,
      updateRegionImages: true,
      updatePacchiImages: false,
      overwriteImages: false,
    });

    await showAlert("Immagini regioni aggiornate da Wikipedia ✅");
    render();
  });

  bWikiOver.addEventListener("click", async () => {
    const ok = await showConfirm("Sovrascrivere TUTTE le immagini regioni con Wikipedia?");
    if (!ok) return;

    await autoUpdateFromWiki({
      updateQuestions: false,
      updatePacchiText: false,
      updateRegionImages: true,
      updatePacchiImages: false,
      overwriteImages: true,
    });

    await showAlert("Immagini regioni sovrascritte da Wikipedia ✅");
    render();
  });

  render();
  return modal;
}

// Gestione Numeri
function openManageNumbersModal() {
  const wrap = el("div", { style: "display:flex;gap:12px;flex-wrap:wrap;" });
  const left = el("div", { style: "flex:1;min-width:260px;border:1px solid #004466;border-radius:8px;padding:10px;background:#112244;" });
  const right = el("div", { style: "flex:2;min-width:320px;border:1px solid #004466;border-radius:8px;padding:10px;background:#0d1c3a;" });

  const table = el("div", { style: "display:flex;flex-direction:column;gap:8px;" });

  const bSaveAll = el("button", { style: "background:#22cc88;color:#fff;border:none;border-radius:8px;padding:8px 10px;cursor:pointer;font-weight:900;margin-top:10px;float:right;" }, "💾 Salva tutti i numeri");
  right.appendChild(el("div", { style: "font-weight:900;margin-bottom:8px;" }, "Numeri regioni"));
  right.appendChild(table);
  right.appendChild(bSaveAll);

  left.appendChild(el("div", { style: "font-weight:900;" }, "Info"));
  left.appendChild(el("div", { style: "opacity:0.9;margin-top:8px;line-height:1.3;" }, "Modifica i numeri delle regioni (quelli mostrati sulla mappa). Poi salva."));

  wrap.append(left, right);

  const modal = openPanelModal({ title: "Gestione Numeri (interna)", width: 900, content: wrap });

  function render() {
    table.innerHTML = "";
    regionList().forEach((code) => {
      const row = el("div", { style: "display:flex;gap:10px;align-items:center;border:1px solid #004466;border-radius:8px;padding:8px;background:#112244;" });
      const lab = el("div", { style: "flex:1;font-weight:900;" }, regionLabel(code));
      const inp = el("input", { type: "number", value: String(regionNumbers?.[code] ?? ""), style: "width:90px;border-radius:8px;border:1px solid #004466;background:#0d1c3a;color:#aad4ff;padding:6px;font-weight:900;" });
      inp.addEventListener("input", () => {
        const n = parseInt(inp.value, 10);
        regionNumbers[code] = Number.isFinite(n) ? n : regionNumbers[code];
        updateRegionNumbersUI();
      });
      row.append(lab, inp);
      table.appendChild(row);
    });
  }

  bSaveAll.addEventListener("click", async () => {
    await mpAuthReady();
    await mpWrite("regionNumbers", regionNumbers);
    await showAlert("Numeri salvati ✅");
  });

  render();
  return modal;
}

// Gestione Pacchi
function openManagePacchiModal() {
  const wrap = el("div", { style: "display:flex;gap:12px;flex-wrap:wrap;" });
  const left = el("div", { style: "flex:1;min-width:260px;border:1px solid #004466;border-radius:8px;padding:10px;background:#112244;" });
  const right = el("div", { style: "flex:2;min-width:320px;border:1px solid #004466;border-radius:8px;padding:10px;background:#0d1c3a;" });

  const sel = el("select", { style: "width:100%;padding:8px;border-radius:8px;border:1px solid #004466;background:#112244;color:#aad4ff;font-weight:700;" });
  regionList().forEach((code) => sel.appendChild(el("option", { value: code }, regionLabel(code))));

  const packTxt = el("textarea", { style: "width:100%;min-height:110px;resize:vertical;border-radius:8px;border:1px solid #004466;background:#112244;color:#aad4ff;padding:8px;box-sizing:border-box;" });
  const imgUrl = el("input", { type: "text", placeholder: "URL immagine pacco (opzionale)", style: "width:100%;margin-top:8px;border-radius:8px;border:1px solid #004466;background:#112244;color:#aad4ff;padding:8px;box-sizing:border-box;" });

  const typeSel = el("select", { style: "width:100%;margin-top:10px;border-radius:8px;border:1px solid #004466;background:#112244;color:#aad4ff;padding:8px;font-weight:800;" });
  ["score", "skipTurn", "extraTurn", "none"].forEach((t) => typeSel.appendChild(el("option", { value: t }, t)));

  const deltaInp = el("input", { type: "number", placeholder: "delta (solo score)", style: "width:100%;margin-top:8px;border-radius:8px;border:1px solid #004466;background:#112244;color:#aad4ff;padding:8px;box-sizing:border-box;" });
  const currInp = el("input", { type: "text", placeholder: "currency (es. punti, rays)", style: "width:100%;margin-top:8px;border-radius:8px;border:1px solid #004466;background:#112244;color:#aad4ff;padding:8px;box-sizing:border-box;" });
  const msgInp = el("input", { type: "text", placeholder: "messaggio (solo none)", style: "width:100%;margin-top:8px;border-radius:8px;border:1px solid #004466;background:#112244;color:#aad4ff;padding:8px;box-sizing:border-box;" });

  const btns = el("div", { style: "display:flex;gap:8px;margin-top:10px;flex-wrap:wrap;justify-content:flex-end;" });
  const bWikiText = el("button", { style: "background:#ffb000;color:#222;border:none;border-radius:8px;padding:8px 10px;cursor:pointer;font-weight:900;" }, "⚡ Wiki Testi");
  const bWikiImg = el("button", { style: "background:#ff6a00;color:#222;border:none;border-radius:8px;padding:8px 10px;cursor:pointer;font-weight:900;" }, "🖼️ Wiki Img (vuoti)");
  const bWikiOver = el("button", { style: "background:#ff2d55;color:#fff;border:none;border-radius:8px;padding:8px 10px;cursor:pointer;font-weight:900;" }, "🔥 Wiki Img (over)");
  const bSave = el("button", { style: "background:#22cc88;color:#fff;border:none;border-radius:8px;padding:8px 10px;cursor:pointer;font-weight:900;" }, "💾 Salva");
  btns.append(bWikiText, bWikiImg, bWikiOver, bSave);

  left.appendChild(el("div", { style: "font-weight:900;margin-bottom:6px;" }, "Regione"));
  left.appendChild(sel);
  left.appendChild(el("div", { style: "opacity:0.9;margin-top:10px;font-size:0.9rem;line-height:1.3;" }, "Modifica testo pacco, immagine e effetto. Poi salva su Firebase."));

  right.appendChild(el("div", { style: "font-weight:900;margin-bottom:6px;" }, "Testo pacco"));
  right.appendChild(packTxt);
  right.appendChild(imgUrl);
  right.appendChild(el("div", { style: "font-weight:900;margin-top:10px;" }, "Effetto"));
  right.appendChild(typeSel);
  right.appendChild(deltaInp);
  right.appendChild(currInp);
  right.appendChild(msgInp);
  right.appendChild(btns);

  wrap.append(left, right);

  const modal = openPanelModal({ title: "Gestione Pacchi (interna)", width: 980, content: wrap });
  let currentCode = sel.value;

  function render() {
    const regionName = quizData[currentCode]?.region || defaultQuizData[currentCode]?.region || currentCode;
    pacchiData[currentCode] = pacchiData[currentCode] || { region: regionName, pack: "", imageUrl: "", effect: { type: "none" } };

    const obj = pacchiData[currentCode];
    packTxt.value = obj.pack || "";
    imgUrl.value = obj.imageUrl || "";

    const eff = obj.effect || { type: "none" };
    typeSel.value = eff.type || "none";
    deltaInp.value = String(eff.delta ?? 0);
    currInp.value = String(eff.currency ?? "punti");
    msgInp.value = String(eff.message ?? "");

    const t = typeSel.value;
    const isScore = t === "score";
    deltaInp.style.display = isScore ? "block" : "none";
    currInp.style.display = isScore ? "block" : "none";
    msgInp.style.display = (t === "none") ? "block" : "none";
  }

  sel.addEventListener("change", () => { currentCode = sel.value; render(); });
  typeSel.addEventListener("change", render);

  bSave.addEventListener("click", async () => {
    const regionName = quizData[currentCode]?.region || defaultQuizData[currentCode]?.region || currentCode;

    pacchiData[currentCode] = pacchiData[currentCode] || { region: regionName, pack: "", imageUrl: "", effect: { type: "none" } };
    pacchiData[currentCode].region = regionName;
    pacchiData[currentCode].pack = packTxt.value.trim();
    pacchiData[currentCode].imageUrl = imgUrl.value.trim();

    const t = typeSel.value;
    const eff = { type: t };
    if (t === "score") {
      eff.delta = Number(deltaInp.value || 0);
      eff.currency = (currInp.value || "punti").trim() || "punti";
    } else if (t === "none") {
      eff.message = (msgInp.value || "").trim();
    }
    pacchiData[currentCode].effect = eff;

    await mpAuthReady();
    await mpWrite("pacchiData", pacchiData);
    await showAlert("Pacchi salvati ✅");
  });

  bWikiText.addEventListener("click", async () => {
    const ok = await showConfirm("Aggiornare SOLO i testi pacchi da Wikipedia per tutte le regioni?");
    if (!ok) return;

    await autoUpdateFromWiki({
      updateQuestions: false,
      updatePacchiText: true,
      updateRegionImages: false,
      updatePacchiImages: false,
      overwriteImages: false,
    });

    await showAlert("Testi pacchi aggiornati da Wikipedia ✅");
    render();
  });

  bWikiImg.addEventListener("click", async () => {
    const ok = await showConfirm("Aggiornare immagini pacchi SOLO dove sono vuote?");
    if (!ok) return;

    await autoUpdateFromWiki({
      updateQuestions: false,
      updatePacchiText: false,
      updateRegionImages: false,
      updatePacchiImages: true,
      overwriteImages: false,
    });

    await showAlert("Immagini pacchi aggiornate da Wikipedia ✅");
    render();
  });

  bWikiOver.addEventListener("click", async () => {
    const ok = await showConfirm("Sovrascrivere TUTTE le immagini pacchi con Wikipedia?");
    if (!ok) return;

    await autoUpdateFromWiki({
      updateQuestions: false,
      updatePacchiText: false,
      updateRegionImages: false,
      updatePacchiImages: true,
      overwriteImages: true,
    });

    await showAlert("Immagini pacchi sovrascritte da Wikipedia ✅");
    render();
  });

  render();
  return modal;
}

// Domande Esterna (import/export JSON)
function openExternalManageModal() {
  const wrap = el("div", { style: "display:flex;gap:12px;flex-wrap:wrap;" });
  const left = el("div", { style: "flex:1;min-width:260px;border:1px solid #004466;border-radius:8px;padding:10px;background:#112244;" });
  const right = el("div", { style: "flex:2;min-width:320px;border:1px solid #004466;border-radius:8px;padding:10px;background:#0d1c3a;" });

  const info = el("div", { style: "opacity:0.95;line-height:1.35;" }, [
    "Qui puoi esportare/importare JSON di Domande e Pacchi (utile per gestione “esterna”).",
    el("div", { style: "margin-top:10px;opacity:0.85;font-size:0.9rem;" }, "Suggerimento: copia JSON, modifica altrove, poi incolla e premi Importa."),
  ]);

  const jsonArea = el("textarea", { style: "width:100%;min-height:320px;resize:vertical;border-radius:8px;border:1px solid #004466;background:#112244;color:#aad4ff;padding:8px;box-sizing:border-box;font-family:monospace;font-size:12px;" });

  const btns = el("div", { style: "display:flex;gap:8px;margin-top:10px;flex-wrap:wrap;justify-content:flex-end;" });
  const bExport = el("button", { style: "background:#00aaff;color:#fff;border:none;border-radius:8px;padding:8px 10px;cursor:pointer;font-weight:900;" }, "📤 Esporta");
  const bImport = el("button", { style: "background:#22cc88;color:#fff;border:none;border-radius:8px;padding:8px 10px;cursor:pointer;font-weight:900;" }, "📥 Importa (sovrascrive)");
  btns.append(bExport, bImport);

  left.appendChild(el("div", { style: "font-weight:900;margin-bottom:6px;" }, "Gestione Esterna"));
  left.appendChild(info);

  right.appendChild(el("div", { style: "font-weight:900;margin-bottom:6px;" }, "JSON"));
  right.appendChild(jsonArea);
  right.appendChild(btns);

  wrap.append(left, right);

  const modal = openPanelModal({ title: "Domande Esterna (Import/Export)", width: 980, content: wrap });

  bExport.addEventListener("click", () => {
    const payload = {
      quizData,
      pacchiData,
      imagesData,
      regionNumbers,
      exportedAt: new Date().toISOString(),
      roomId: MP.roomId,
    };
    jsonArea.value = JSON.stringify(payload, null, 2);
    jsonArea.focus();
    jsonArea.select();
  });

  bImport.addEventListener("click", async () => {
    let obj;
    try {
      obj = JSON.parse(jsonArea.value || "{}");
    } catch {
      await showAlert("JSON non valido.");
      return;
    }
    const ok = await showConfirm("Importare e sovrascrivere i dati della stanza? (quizData/pacchiData/imagesData/regionNumbers)");
    if (!ok) return;

    if (obj.quizData) quizData = obj.quizData;
    if (obj.pacchiData) pacchiData = obj.pacchiData;
    if (obj.imagesData) imagesData = obj.imagesData;
    if (obj.regionNumbers) regionNumbers = obj.regionNumbers;

    await mpAuthReady();
    await mpUpdate("", { quizData, pacchiData, imagesData, regionNumbers });

    await showAlert("Import completato ✅");
  });

  return modal;
}

// Archivio Eventi (semplice log in firebase)
function openArchiveEventsModal() {
  const wrap = el("div", { style: "display:flex;gap:12px;flex-wrap:wrap;" });
  const left = el("div", { style: "flex:1;min-width:260px;border:1px solid #004466;border-radius:8px;padding:10px;background:#112244;" });
  const right = el("div", { style: "flex:2;min-width:320px;border:1px solid #004466;border-radius:8px;padding:10px;background:#0d1c3a;" });

  const note = el("div", { style: "opacity:0.95;line-height:1.35;" }, "Archivio eventi stanza (manuale). Puoi aggiungere note tipo: 'Partita iniziata', 'Finale', ecc.");

  const text = el("input", { type: "text", placeholder: "Scrivi evento...", style: "width:100%;margin-top:10px;border-radius:8px;border:1px solid #004466;background:#0d1c3a;color:#aad4ff;padding:8px;box-sizing:border-box;" });
  const list = el("div", { style: "margin-top:10px;display:flex;flex-direction:column;gap:8px;max-height:420px;overflow:auto;" });

  const btns = el("div", { style: "display:flex;gap:8px;margin-top:10px;flex-wrap:wrap;justify-content:flex-end;" });
  const bAdd = el("button", { style: "background:#00aaff;color:#fff;border:none;border-radius:8px;padding:8px 10px;cursor:pointer;font-weight:900;" }, "➕ Aggiungi");
  const bClear = el("button", { style: "background:#aa2222;color:#fff;border:none;border-radius:8px;padding:8px 10px;cursor:pointer;font-weight:900;" }, "🗑️ Svuota");
  btns.append(bAdd, bClear);

  left.appendChild(el("div", { style: "font-weight:900;margin-bottom:6px;" }, "Archivio Eventi"));
  left.appendChild(note);
  left.appendChild(text);
  left.appendChild(btns);

  right.appendChild(el("div", { style: "font-weight:900;margin-bottom:6px;" }, "Eventi"));
  right.appendChild(list);

  wrap.append(left, right);

  const modal = openPanelModal({ title: "Archivio Eventi (interno)", width: 980, content: wrap });

  function getEventsArr() {
    const obj = MP.state?.events || {};
    return Object.entries(obj)
      .map(([id, v]) => ({ id, ...(v || {}) }))
      .sort((a, b) => Number(a.ts || 0) - Number(b.ts || 0));
  }

  function render() {
    list.innerHTML = "";
    const arr = getEventsArr();
    if (!arr.length) {
      list.appendChild(el("div", { style: "opacity:0.85;" }, "Nessun evento."));
      return;
    }
    arr.forEach((ev) => {
      const card = el("div", { style: "border:1px solid #004466;border-radius:8px;padding:10px;background:#112244;" });
      const time = new Date(ev.ts || Date.now());
      const hh = String(time.getHours()).padStart(2, "0");
      const mm = String(time.getMinutes()).padStart(2, "0");
      const top = el("div", { style: "display:flex;justify-content:space-between;gap:10px;align-items:center;" });
      top.appendChild(el("div", { style: "font-weight:900;" }, `${hh}:${mm}`));
      const del = el("button", { style: "background:#aa2222;color:#fff;border:none;border-radius:8px;padding:6px 8px;cursor:pointer;font-weight:900;" }, "Elimina");
      del.addEventListener("click", async () => {
        await mpAuthReady();
        await mpWrite(`events/${ev.id}`, null);
      });
      top.appendChild(del);

      card.appendChild(top);
      card.appendChild(el("div", { style: "margin-top:6px;" }, ev.text || ""));
      list.appendChild(card);
    });
  }

  bAdd.addEventListener("click", async () => {
    const v = text.value.trim();
    if (!v) return;
    await mpAuthReady();
    const id = (crypto?.randomUUID?.() || String(Math.random()).slice(2)).replace(/-/g, "").slice(0, 12);
    await mpWrite(`events/${id}`, { text: v, ts: Date.now() });
    text.value = "";
  });

  bClear.addEventListener("click", async () => {
    const ok = await showConfirm("Svuotare tutti gli eventi?");
    if (!ok) return;
    await mpAuthReady();
    await mpWrite("events", {});
  });

  const int = setInterval(render, 600);
  const oldClose = modal.close;
  modal.close = () => { clearInterval(int); oldClose(); };

  render();
  return modal;
}

// Documenti (lista link in firebase)
function openDocumentsModal() {
  const wrap = el("div", { style: "display:flex;gap:12px;flex-wrap:wrap;" });
  const left = el("div", { style: "flex:1;min-width:260px;border:1px solid #004466;border-radius:8px;padding:10px;background:#112244;" });
  const right = el("div", { style: "flex:2;min-width:320px;border:1px solid #004466;border-radius:8px;padding:10px;background:#0d1c3a;" });

  const titleInp = el("input", { type: "text", placeholder: "Titolo documento", style: "width:100%;margin-top:8px;border-radius:8px;border:1px solid #004466;background:#0d1c3a;color:#aad4ff;padding:8px;box-sizing:border-box;" });
  const urlInp = el("input", { type: "text", placeholder: "URL documento (https://...)", style: "width:100%;margin-top:8px;border-radius:8px;border:1px solid #004466;background:#0d1c3a;color:#aad4ff;padding:8px;box-sizing:border-box;" });

  const btns = el("div", { style: "display:flex;gap:8px;margin-top:10px;flex-wrap:wrap;justify-content:flex-end;" });
  const bAdd = el("button", { style: "background:#00aaff;color:#fff;border:none;border-radius:8px;padding:8px 10px;cursor:pointer;font-weight:900;" }, "➕ Aggiungi");
  const bClear = el("button", { style: "background:#aa2222;color:#fff;border:none;border-radius:8px;padding:8px 10px;cursor:pointer;font-weight:900;" }, "🗑️ Svuota");
  btns.append(bAdd, bClear);

  left.appendChild(el("div", { style: "font-weight:900;margin-bottom:6px;" }, "Documenti"));
  left.appendChild(el("div", { style: "opacity:0.95;line-height:1.35;" }, "Aggiungi link utili (regolamento, materiale, ecc.) visibili nella stanza."));
  left.appendChild(titleInp);
  left.appendChild(urlInp);
  left.appendChild(btns);

  const list = el("div", { style: "display:flex;flex-direction:column;gap:8px;max-height:460px;overflow:auto;" });
  right.appendChild(el("div", { style: "font-weight:900;margin-bottom:6px;" }, "Elenco"));
  right.appendChild(list);

  wrap.append(left, right);

  const modal = openPanelModal({ title: "Documenti (interno)", width: 980, content: wrap });

  function getDocsArr() {
    const obj = MP.state?.documents || {};
    return Object.entries(obj)
      .map(([id, v]) => ({ id, ...(v || {}) }))
      .sort((a, b) => String(a.title || "").localeCompare(String(b.title || "")));
  }

  function render() {
    list.innerHTML = "";
    const arr = getDocsArr();
    if (!arr.length) {
      list.appendChild(el("div", { style: "opacity:0.85;" }, "Nessun documento."));
      return;
    }
    arr.forEach((d) => {
      const card = el("div", { style: "border:1px solid #004466;border-radius:8px;padding:10px;background:#112244;display:flex;justify-content:space-between;gap:10px;align-items:center;" });
      const left = el("div", {});
      const a = el("a", { href: d.url || "#", target: "_blank", style: "color:#aad4ff;font-weight:900;text-decoration:none;" }, d.title || "(senza titolo)");
      left.appendChild(a);
      left.appendChild(el("div", { style: "opacity:0.85;font-size:0.85rem;margin-top:4px;" }, d.url || ""));
      const del = el("button", { style: "background:#aa2222;color:#fff;border:none;border-radius:8px;padding:6px 8px;cursor:pointer;font-weight:900;" }, "Elimina");
      del.addEventListener("click", async () => {
        await mpAuthReady();
        await mpWrite(`documents/${d.id}`, null);
      });
      card.append(left, del);
      list.appendChild(card);
    });
  }

  bAdd.addEventListener("click", async () => {
    const title = titleInp.value.trim();
    const url = urlInp.value.trim();
    if (!title || !url) { await showAlert("Inserisci titolo e URL."); return; }
    await mpAuthReady();
    const id = (crypto?.randomUUID?.() || String(Math.random()).slice(2)).replace(/-/g, "").slice(0, 12);
    await mpWrite(`documents/${id}`, { title, url, ts: Date.now() });
    titleInp.value = "";
    urlInp.value = "";
  });

  bClear.addEventListener("click", async () => {
    const ok = await showConfirm("Svuotare tutti i documenti?");
    if (!ok) return;
    await mpAuthReady();
    await mpWrite("documents", {});
  });

  const int = setInterval(render, 600);
  const oldClose = modal.close;
  modal.close = () => { clearInterval(int); oldClose(); };

  render();
  return modal;
}

/* =========================
   Menu -> click handlers
========================= */
manageQuestionsBtn?.addEventListener("click", async () => {
  closeMenu();
  if (!(await ensureAdminOrAsk())) return;
  openManageQuestionsModal();
});
manageImagesBtn?.addEventListener("click", async () => {
  closeMenu();
  if (!(await ensureAdminOrAsk())) return;
  openManageImagesModal();
});
manageNumbersBtn?.addEventListener("click", async () => {
  closeMenu();
  if (!(await ensureAdminOrAsk())) return;
  openManageNumbersModal();
});
managePacchiBtn?.addEventListener("click", async () => {
  closeMenu();
  if (!(await ensureAdminOrAsk())) return;
  openManagePacchiModal();
});
externalManageBtn?.addEventListener("click", async () => {
  closeMenu();
  if (!(await ensureExternalPassword())) return;
  openExternalManageModal();
});
archiveEventsBtn?.addEventListener("click", async () => {
  closeMenu();
  if (!(await ensureAdminOrAsk())) return;
  openArchiveEventsModal();
});
documentsBtn?.addEventListener("click", async () => {
  closeMenu();
  if (!(await ensureAdminOrAsk())) return;
  openDocumentsModal();
});

/* =========================
   Events wiring base
========================= */
if (adminLoginBtn) {
  adminLoginBtn.addEventListener("click", async () => {
    await mpAuthReady();
    if (!adminOnline) {
      const pwd = await showPrompt("Inserisci password admin:");
      if (pwd === ADMIN_PASSWORD) {
        await mpWrite("adminOnline", true);
        await showAlert(`Admin ON (stanza ${MP.roomId})`);
      } else if (pwd !== null) {
        await showAlert("Password errata. Accesso negato.");
      }
    } else {
      await mpWrite("adminOnline", false);
      await showAlert("Logout admin: gioco disattivato.");
    }
  });
}

if (togglePlayersBtn && playerSelectionDiv) {
  togglePlayersBtn.addEventListener("click", () => {
    if (playerSelectionDiv.classList.contains("hidden")) {
      playerSelectionDiv.classList.remove("hidden");
      togglePlayersBtn.textContent = "Nascondi Giocatori";
    } else {
      playerSelectionDiv.classList.add("hidden");
      togglePlayersBtn.textContent = "Mostra Giocatori";
    }
  });
}

if (resetSelectionBtn) {
  resetSelectionBtn.addEventListener("click", async () => {
    await mpAuthReady();
    await mpWrite("selectedPlayers", {});
    await mpWrite("turnOrder", []);
    await mpWrite("currentTurnIndex", 0);
  });
}

if (registerForm) {
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (registeringLock) return;
    registeringLock = true;

    try {
      const nickname = registerForm.nickname.value.trim();
      if (!nickname) {
        if (registerMsg) {
          registerMsg.style.color = "#ff4444";
          registerMsg.textContent = "Inserisci un nickname valido.";
        }
        return;
      }

      await mpAuthReady();
      await mpAddOrUpdateMe(nickname);

      if (registerMsg) {
        registerMsg.style.color = "#22cc88";
        registerMsg.textContent = `Nickname "${nickname}" registrato nella stanza ${MP.roomId}.`;
        setTimeout(() => (registerMsg.textContent = ""), 2000);
      }
    } catch (err) {
      console.error(err);
      await showAlert(`Errore registrazione: ${err?.message || err}`);
    } finally {
      registeringLock = false;
    }
  });
}

if (closeRegisterBtn && registerModal) {
  closeRegisterBtn.addEventListener("click", () => registerModal.classList.remove("active"));
}
if (openRegisterBtn && registerModal) {
  openRegisterBtn.addEventListener("click", () => registerModal.classList.add("active"));
}

gameModeRadios.forEach((r) => {
  r.addEventListener("change", async () => {
    if (!r.checked) return;
    await mpAuthReady();
    await mpWrite("gameMode", r.value);
  });
});

if (saveQuizTimeBtn && quizTimeInput) {
  saveQuizTimeBtn.addEventListener("click", async () => {
    const v = parseInt(quizTimeInput.value, 10);
    if (isNaN(v) || v < 5) {
      if (quizTimeMsg) {
        quizTimeMsg.style.color = "#ff4444";
        quizTimeMsg.textContent = "Inserisci un numero ≥ 5";
        setTimeout(() => (quizTimeMsg.textContent = ""), 2000);
      }
      return;
    }
    await mpAuthReady();
    await mpWrite("quizTimeLimit", v);
    if (quizTimeMsg) {
      quizTimeMsg.style.color = "#22cc88";
      quizTimeMsg.textContent = `Timer impostato a ${v}s`;
      setTimeout(() => (quizTimeMsg.textContent = ""), 2000);
    }
  });
}

if (prevBtn) prevBtn.addEventListener("click", () => { if (currentQuestionIndex > 0) { currentQuestionIndex--; showQuestion(); } });
if (nextBtn) nextBtn.addEventListener("click", () => nextBtnHandler());
if (closeQuizBtn) closeQuizBtn.addEventListener("click", () => closeQuizModal());

if (svg) {
  svg.querySelectorAll("g[data-region-code]").forEach((group) => {
    group.addEventListener("click", async () => {
      const regionCode = group.dataset.regionCode;
      const regionName = group.dataset.regionName;
      if (!regionCode) return;

      if (!adminOnline) {
        await showAlert("Gioco non attivo: attendi che l'admin avvii la sessione.");
        return;
      }

      const alreadyDone = !!MP.state?.completedRegions?.[regionCode];
      if (alreadyDone) {
        await toggleRegionCompleted(regionCode);
        return;
      }

      if (gameMode === "quiz") await startQuizForRegion(regionCode, regionName);
      else await startPacchiForRegion(regionCode, regionName);
    });
  });
}

/* =========================
   START: init multiplayer room
========================= */
async function bootstrap() {
  await mpInit({
    defaults: {
      quizData: defaultQuizData,
      imagesData: defaultImagesData,
      regionNumbers: defaultRegionNumbers,
      pacchiData: defaultPacchiData,
      gameMode: "quiz",
      quizTimeLimit: 15,
      adminOnline: false,
      selectedPlayers: {},
      completedRegions: {},
      turnOrder: [],
      currentTurnIndex: 0,
      events: {},
      documents: {},
    },
    onState: (state) => applyRemoteStateToUI(state),
  });

  console.log("ROOM ID:", MP.roomId);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootstrap);
} else {
  bootstrap();
}
