// /ITALIA/js/chatItalia.js
import { db, auth } from "../firebase-mp.js";
import { MP, mpAuthReady } from "./firebase-mp.js";

import {
  ref,
  push,
  set,
  onChildAdded,
  query,
  orderByChild,
  limitToLast,
  off,
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-database.js";

/* =========================
   ROOM ID: priorità MP.roomId
========================= */
function getRoomIdFallback() {
  const u = new URL(location.href);
  const qRoom = (u.searchParams.get("room") || "").trim();
  if (qRoom) return qRoom;

  const h = (location.hash || "").replace("#", "").trim();
  return h || "";
}

function getEffectiveRoomId() {
  const mpRoom = (MP?.roomId && String(MP.roomId).trim()) ? String(MP.roomId).trim() : "";
  return mpRoom || getRoomIdFallback();
}

/* =========================
   DOM
========================= */
const els = {
  launcher: document.getElementById("chat-italia-launcher"),
  win: document.getElementById("chat-italia"),
  header: document.getElementById("chat-italia-header"),
  close: document.getElementById("chat-italia-close"),
  min: document.getElementById("chat-italia-min"),
  pin: document.getElementById("chat-italia-pin"),
  big: document.getElementById("chat-italia-big"),
  opacity: document.getElementById("chat-italia-opacity"),
  room: document.getElementById("chat-italia-room"),
  list: document.getElementById("chat-italia-messages"),
  form: document.getElementById("chat-italia-form"),
  input: document.getElementById("chat-italia-input"),
  resize: document.getElementById("chat-italia-resize-handle"),
};

let uid = null;
let pinned = false;
let didInit = false;

let currentRoomId = "";
let unsubscribeRef = null;
const seenIds = new Set(); // evita duplicati

/* =========================
   Nickname: usa MP.state
========================= */
function getMyNickname() {
  try {
    const meUid = auth.currentUser?.uid || uid;
    const p = MP?.state?.participants?.[meUid];
    if (p?.nickname) return p.nickname;
  } catch {}

  // fallback localStorage vecchio (se esiste)
  try {
    const raw = localStorage.getItem("participants");
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr) && arr.length) return arr[arr.length - 1]?.nickname || "Giocatore";
    }
  } catch {}

  return "Giocatore";
}

function formatTime(ts) {
  const d = new Date(ts || Date.now());
  return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
}

/* =========================
   UI open/close
========================= */
function openChat() {
  els.win?.classList.remove("closed");
  els.win?.setAttribute("aria-hidden", "false");
  setTimeout(() => els.input?.focus(), 0);
}
function closeChat() {
  if (document.activeElement && els.win?.contains(document.activeElement)) {
    document.activeElement.blur();
  }

  els.win?.classList.add("closed");
  els.win?.setAttribute("aria-hidden", "true");
}
function toggleChat() {
  if (!els.win) return;
  if (els.win.classList.contains("closed")) openChat();
  else closeChat();
}

function applyOpacity(v) {
  if (!els.win) return;
  els.win.style.background = `rgba(20, 28, 50, ${v})`;
  localStorage.setItem("chatItaliaOpacity", String(v));
}
function applyBig(isBig) {
  if (!els.win) return;
  els.win.classList.toggle("big", !!isBig);
  localStorage.setItem("chatItaliaBig", isBig ? "1" : "0");
}
function applyPinned(isPinned) {
  pinned = !!isPinned;
  els.pin?.classList.toggle("active", pinned);
  localStorage.setItem("chatItaliaPinned", pinned ? "1" : "0");
}

function loadPosition() {
  const raw = localStorage.getItem("chatItaliaPos");
  if (!raw || !els.win) return;
  try {
    const p = JSON.parse(raw);
    if (typeof p.left === "number" && typeof p.top === "number") {
      els.win.style.left = `${p.left}px`;
      els.win.style.top = `${p.top}px`;
      els.win.style.bottom = "auto";
    }
    if (typeof p.w === "number" && typeof p.h === "number") {
      els.win.style.width = `${p.w}px`;
      els.win.style.height = `${p.h}px`;
    }
  } catch {}
}
function savePosition() {
  if (!els.win) return;
  const r = els.win.getBoundingClientRect();
  localStorage.setItem("chatItaliaPos", JSON.stringify({
    left: Math.round(r.left), top: Math.round(r.top),
    w: Math.round(r.width), h: Math.round(r.height)
  }));
}

function enableDrag() {
  if (!els.header || !els.win) return;

  let dragging = false;
  let startX = 0, startY = 0, startLeft = 0, startTop = 0;

  els.header.addEventListener("mousedown", (e) => {
    if (pinned) return;
    if (e.target.closest("button")) return;

    dragging = true;
    els.win.classList.add("dragging");
    const rect = els.win.getBoundingClientRect();
    startX = e.clientX; startY = e.clientY;
    startLeft = rect.left; startTop = rect.top;

    els.win.style.bottom = "auto";
    els.win.style.left = `${startLeft}px`;
    els.win.style.top = `${startTop}px`;
  });

  window.addEventListener("mousemove", (e) => {
    if (!dragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    els.win.style.left = `${startLeft + dx}px`;
    els.win.style.top = `${startTop + dy}px`;
  });

  window.addEventListener("mouseup", () => {
    if (!dragging) return;
    dragging = false;
    els.win.classList.remove("dragging");
    savePosition();
  });
}

function enableResize() {
  if (!els.resize || !els.win) return;

  let resizing = false;
  let startX = 0, startY = 0, startW = 0, startH = 0;

  els.resize.addEventListener("mousedown", (e) => {
    resizing = true;
    const rect = els.win.getBoundingClientRect();
    startX = e.clientX; startY = e.clientY;
    startW = rect.width; startH = rect.height;
    e.preventDefault();
  });

  window.addEventListener("mousemove", (e) => {
    if (!resizing) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    els.win.style.width = `${Math.max(260, startW + dx)}px`;
    els.win.style.height = `${Math.max(280, startH + dy)}px`;
  });

  window.addEventListener("mouseup", () => {
    if (!resizing) return;
    resizing = false;
    savePosition();
  });
}
function isMeRegisteredForChat() {
  try {
    const meUid = auth.currentUser?.uid || uid;
    const p = MP?.state?.participants?.[meUid];

    return !!(
      p &&
      p.isRegistered &&
      String(p.nickname || "").trim()
    );
  } catch {
    return false;
  }
}

function showChatRegisterRequired() {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.style.zIndex = "12000";

    const box = document.createElement("div");
    box.className = "modal-box";

    box.innerHTML = `
      <h3>⚠️ Registrazione richiesta</h3>
      <p>
        Prima di scrivere in chat devi registrare il tuo nickname.<br><br>
        Inserisci il tuo nome esploratore nel pannello Community e premi:<br><br>
        🚀 <strong>Inizia l'Avventura</strong>
      </p>
    `;

    const btns = document.createElement("div");
    btns.className = "modal-buttons";

    const ok = document.createElement("button");
    ok.textContent = "OK";

    ok.addEventListener("click", () => {
      overlay.remove();
      resolve();
    });

    btns.appendChild(ok);
    box.appendChild(btns);
    overlay.appendChild(box);
    document.body.appendChild(overlay);

    setTimeout(() => ok.focus(), 0);
  });
}
/* =========================
   Messages
========================= */
function appendMessage({ nick, text, ts, fromUid }) {
  if (!els.list) return;

  const wrap = document.createElement("div");
  wrap.className = "chat-msg" + (fromUid === uid ? " me" : "");

  const meta = document.createElement("div");
  meta.className = "chat-meta";
  meta.innerHTML = `<span class="nick">${String(nick || "Anonimo")}</span><span>${formatTime(ts)}</span>`;

  const bubble = document.createElement("div");
  bubble.className = "chat-bubble";
  bubble.textContent = text || "";

  wrap.appendChild(meta);
  wrap.appendChild(bubble);
  els.list.appendChild(wrap);
  els.list.scrollTop = els.list.scrollHeight;
}

async function sendMessage(text) {
  const clean = String(text || "").trim();
  if (!clean) return;


if (!isMeRegisteredForChat()) {
  await showChatRegisterRequired();
  return;
}
  await mpAuthReady();
  uid = auth.currentUser?.uid || uid;

  const roomId = getEffectiveRoomId();
  if (!roomId) {
    console.warn("ChatItalia: roomId mancante");
    return;
  }

  const msgRef = push(ref(db, `rooms/${roomId}/chat/messages`));
  await set(msgRef, {
    text: clean,
    nick: getMyNickname(),
    fromUid: uid,
    ts: Date.now()
  });
}

/* =========================
   Listener (re-attach quando cambia room)
========================= */
function detachListener() {
  if (typeof unsubscribeRef === "function") {
    try { unsubscribeRef(); } catch {}
  }
  unsubscribeRef = null;
}

function listenMessagesForRoom(roomId) {
  if (!roomId) return;

  // reset lista solo se cambi stanza
  els.list && (els.list.innerHTML = "");
  seenIds.clear();

  const q = query(
    ref(db, `rooms/${roomId}/chat/messages`),
    orderByChild("ts"),
    limitToLast(200)
  );

  const handler = onChildAdded(q, (snap) => {
    if (!snap.exists()) return;
    const id = snap.key;
    if (id && seenIds.has(id)) return;
    if (id) seenIds.add(id);

    const v = snap.val();
    if (v) appendMessage(v);
  });

  // firebase modular ritorna una funzione "unsubscribe"
  unsubscribeRef = () => off(q, "child_added", handler);
}

/* =========================
   UI init
========================= */
function initUI() {
  if (!els.launcher || !els.win) return;

  // label stanza
  const roomId = getEffectiveRoomId();
  if (els.room) els.room.textContent = roomId ? `#${roomId}` : "";

  els.launcher.addEventListener("click", toggleChat);
  els.close?.addEventListener("click", closeChat);
  els.min?.addEventListener("click", closeChat);

  els.pin?.addEventListener("click", () => applyPinned(!pinned));
  els.big?.addEventListener("change", () => applyBig(els.big.checked));
  els.opacity?.addEventListener("input", () => applyOpacity(els.opacity.value));

  els.form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const t = els.input?.value || "";
    if (els.input) els.input.value = "";
    try {
      await sendMessage(t);
    } catch (err) {
      console.warn("ChatItalia: invio fallito", err);
    }
  });

  const savedOp = localStorage.getItem("chatItaliaOpacity");
  if (savedOp && els.opacity) els.opacity.value = savedOp;
  if (els.opacity) applyOpacity(els.opacity.value || 0.92);

  const savedBig = localStorage.getItem("chatItaliaBig") === "1";
  if (els.big) els.big.checked = savedBig;
  applyBig(savedBig);

  const savedPinned = localStorage.getItem("chatItaliaPinned") === "1";
  applyPinned(savedPinned);

  loadPosition();
  enableDrag();
  enableResize();
}

/* =========================
   Bootstrap
========================= */
async function bootstrapChatItalia() {
  if (didInit) return;
  didInit = true;

  await mpAuthReady();
  uid = auth.currentUser?.uid || null;

  initUI();

  // 1) attacca subito sul roomId disponibile ora
  currentRoomId = getEffectiveRoomId();
  if (els.room) els.room.textContent = currentRoomId ? `#${currentRoomId}` : "";
  listenMessagesForRoom(currentRoomId);

  // 2) se MP.roomId arriva dopo (perché mpInit setta URL/room),
  //    controlla periodicamente e ri-attacca se cambia stanza.
  const poll = setInterval(() => {
    const rid = getEffectiveRoomId();
    if (!rid) return;

    if (rid !== currentRoomId) {
      currentRoomId = rid;
      if (els.room) els.room.textContent = `#${currentRoomId}`;
      detachListener();
      listenMessagesForRoom(currentRoomId);
    }
  }, 600);

  // stop poll se pagina chiude
  window.addEventListener("beforeunload", () => {
    clearInterval(poll);
    detachListener();
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootstrapChatItalia);
} else {
  bootstrapChatItalia();
}
