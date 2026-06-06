import {
  mpListenActiveRooms
} from "./firebase-mp.js";

console.log("🛡️ Admin Control caricato");




const isLocalAdmin =
  localStorage.getItem("italiaQuestLocalAdmin") === "true" ||
  localStorage.getItem("localAdmin") === "true";

function createAdminControlPanel() {
  const panel = document.createElement("div");
  panel.id = "admin-control-panel";

  panel.innerHTML = `
    <div style="font-weight:900;margin-bottom:6px;">🛡️ Centro Controllo</div>
    <div id="ac-room">🌍 Stanza: ...</div>
    <div id="ac-players">👥 Partecipanti: ...</div>
    <div id="ac-selected">✅ Selezionati: ...</div>
    <div id="ac-regions">🏆 Regioni conquistate: ...</div>
    <hr style="margin:8px 0;opacity:.3;">

<div style="font-weight:900;">👥 Utenti Online</div>
<div id="ac-users">Caricamento...</div>

<div style="font-weight:900;margin-top:8px;">🎮 Turno</div>
<div id="ac-turn">...</div>

<hr style="margin:8px 0;opacity:.3;">

<div style="font-weight:900;">🌍 Stanze Attive</div>
<div id="ac-active-rooms">Caricamento...</div>

    <hr style="margin:8px 0;opacity:.3;">

    <div style="font-weight:900;">📚 Archivio Quiz</div>
    <div id="ac-quiz-summary">Caricamento...</div>
  `;

  panel.style.cssText = `
    display:none;
    position:fixed;
    right:16px;
    bottom:16px;
    z-index:12000;
    background:rgba(5,18,40,.92);
    color:#e9f7ff;
    border:1px solid rgba(0,246,255,.35);
    border-radius:16px;
    padding:12px 14px;
    font-family:Arial,sans-serif;
    font-size:13px;
    box-shadow:0 0 25px rgba(0,246,255,.25);
    max-height:70vh;
    overflow:auto;
  `;

  document.body.appendChild(panel);
}

function updateAdminControlPanel() {
  const api = window.ItaliaQuestAdmin;
  if (!api) return;

  const panel = document.getElementById("admin-control-panel");
  if (!panel) return;

  const state = api.getState?.() || {};
  const room = api.getRoomId?.() || "-";
const quizData =
  state?.questionBank ||
  window.questionBank ||
  state?.quizData ||
  window.quizData ||
  {};

  const players = Object.keys(state.participants || {}).length;
  const selected = Object.keys(state.selectedPlayers || {}).filter(
    (id) => state.selectedPlayers[id]
  ).length;
  const regions = Object.keys(state.completedRegions || {}).length;
  const usersEl = document.getElementById("ac-users");
const turnEl = document.getElementById("ac-turn");

const participantsObj = state.participants || {};
const users = Object.values(participantsObj)
  .filter(p => p && p.isRegistered && String(p.nickname || "").trim())
  .map(p => p.nickname);

if (usersEl) {
  usersEl.innerHTML = users.length
    ? users.map(name => `🟢 ${name}`).join("<br>")
    : "<i>Nessun utente registrato</i>";
}

const turnOrder = Array.isArray(state.turnOrder) ? state.turnOrder : [];
const currentTurnIndex = Number(state.currentTurnIndex || 0);
const currentUid = turnOrder[currentTurnIndex];
const currentPlayer = participantsObj[currentUid]?.nickname || "-";

if (turnEl) {
  turnEl.textContent = "➡️ " + currentPlayer;
}

  document.getElementById("ac-room").textContent =
    "🌍 Stanza: " + room;

  document.getElementById("ac-players").textContent =
    "👥 Partecipanti: " + players;

  document.getElementById("ac-selected").textContent =
    "✅ Selezionati: " + selected;

  document.getElementById("ac-regions").textContent =
    "🏆 Regioni conquistate: " + regions;

  const summaryEl = document.getElementById("ac-quiz-summary");
  if (!summaryEl) return;

  
  const lines = Object.entries(quizData).map(([code, region]) => {
    
const count =
  Array.isArray(region?.questions) ? region.questions.length :
  Array.isArray(region?.data?.questions) ? region.data.questions.length :
  Array.isArray(region?.questionBank?.questions) ? region.questionBank.questions.length :
  Array.isArray(region?.domande) ? region.domande.length :
  Array.isArray(region?.quiz) ? region.quiz.length :
  Array.isArray(region) ? region.length :
  0;
    const name = region?.region || region?.name || code;
    const icon = count > 0 ? "✅" : "❌";

    return `${icon} ${name}: ${count}`;
  });

  summaryEl.innerHTML = lines.join("<br>");
}
function startActiveRoomsMonitor() {

  const box = document.getElementById("ac-active-rooms");
  if (!box) return;

  mpListenActiveRooms((rooms) => {


    const entries = Object.entries(rooms || {});

    if (!entries.length) {
      box.innerHTML = "<i>Nessuna stanza attiva</i>";
      return;
    }

    box.innerHTML = entries.map(([roomId, room]) => {
      const users = Object.values(room.users || {});

      const names = users.length
        ? users
            .map(u => `🟢 ${u.nickname || u.uid || "utente"}`)
            .join("<br>")
        : "<i>Nessun utente</i>";

      return `
        <div style="margin:6px 0;">
          <b>🏠 ${roomId}</b><br>
          ${names}
        </div>
      `;
    }).join("");
  });
}
if (isLocalAdmin) {
  setTimeout(() => {
    createAdminControlPanel();
updateAdminControlPanel();
startActiveRoomsMonitor();
setInterval(updateAdminControlPanel, 1500);
  }, 3000);
}