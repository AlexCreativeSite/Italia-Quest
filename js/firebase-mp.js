// /ITALIA/js/firebase-mp.js
import { db, auth } from "../firebase-mp.js";

import {
  ref,
  onValue,
  get,
  set,
  update,
  runTransaction,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-database.js";

import {
  signInAnonymously,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";

/**
 * MP = stato multiplayer condiviso
 * roomId = stanza
 * uid = utente corrente
 * state = snapshot corrente
 */
export const MP = {
  roomId: null,
  uid: null,
  state: null,
};

let _signInPromise = null;
let _authReadyPromise = null;

/* =========================
   Utils
========================= */
function qs(name) {
  const u = new URL(location.href);
  return (u.searchParams.get(name) || "").trim();
}

function getRoomIdFromUrl() {
  const qRoom = qs("room");
  if (qRoom) return qRoom;

  const h = (location.hash || "").replace("#", "").trim();
  if (h) return h;

  return "public";
}

function setRoomIdInUrl(roomId) {
  const u = new URL(location.href);
  u.searchParams.set("room", roomId);
  history.replaceState({}, "", u.toString());
}

function makeRoomId() {
  return (crypto?.randomUUID?.() || String(Math.random()).slice(2))
    .replace(/-/g, "")
    .slice(0, 10);
}

function roomRef(path = "") {
  if (!MP.roomId) throw new Error("MP.roomId non impostato");
  const base = `rooms/${MP.roomId}`;
  return ref(db, path ? `${base}/${path}` : base);
}

/* =========================
   ✅ AUTH READY (evita "uid non pronto")
========================= */
export function mpAuthReady() {
  // già pronto
  if (auth.currentUser?.uid) {
    MP.uid = auth.currentUser.uid;
    return Promise.resolve(MP.uid);
  }

  // se già in attesa, riusa
  if (_authReadyPromise) return _authReadyPromise;

  _authReadyPromise = new Promise((resolve) => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) return;
      MP.uid = user.uid;
      try { unsub(); } catch {}
      resolve(MP.uid);
      _authReadyPromise = null;
    });
  });

  return _authReadyPromise;
}

/* =========================
   Auth anonima "safe"
========================= */
async function ensureAnonymousSignIn() {
  // se già loggato
  if (auth.currentUser?.uid) {
    MP.uid = auth.currentUser.uid;
    return MP.uid;
  }

  // se un login è già in corso
  if (_signInPromise) {
    await _signInPromise;
    return mpAuthReady();
  }

  // avvia login
  _signInPromise = signInAnonymously(auth);

  try {
    await _signInPromise;
  } finally {
    _signInPromise = null;
  }

  return mpAuthReady();
}

/* =========================
   Public API richieste da main.js
========================= */

/**
 * mpInit({ defaults, onState })
 * - determina roomId (da URL ?room=... oppure #... oppure ne crea uno)
 * - login anonimo (safe)
 * - crea defaults se room vuota
 * - listener realtime sullo stato stanza
 */
export async function mpInit({ defaults = {}, onState } = {}) {
  // 1) room id coerente
  let roomId = getRoomIdFromUrl();

MP.roomId = roomId;

if (!qs("room")) {
  setRoomIdInUrl(roomId);
}

  // 2) auth anonima (safe)
  await ensureAnonymousSignIn();

  // 3) se stanza vuota -> set defaults
  const snap = await get(roomRef());
  if (!snap.exists()) {
    await set(roomRef(), {
      ...defaults,
      adminOnline: false,
      selectedPlayers: {},
      turnOrder: [],
      currentTurnIndex: 0,
      completedRegions: {},
      participants: {},
      createdAt: serverTimestamp(),
    });
  } else {
    // assicura campi minimi (non distruttivo)
    const cur = snap.val() || {};
    const patch = {};
    if (typeof cur.adminOnline === "undefined") patch.adminOnline = false;
    if (!cur.selectedPlayers) patch.selectedPlayers = {};
    if (!Array.isArray(cur.turnOrder)) patch.turnOrder = [];
    if (typeof cur.currentTurnIndex !== "number") patch.currentTurnIndex = 0;
    if (!cur.completedRegions) patch.completedRegions = {};
    if (!cur.participants) patch.participants = {};
    if (Object.keys(patch).length) await update(roomRef(), patch);
  }

  // 4) assicurati che il partecipante esista
  await ensureMeExists();

  // 5) listener realtime
  onValue(roomRef(), (s) => {
    MP.state = s.val() || null;
    if (typeof onState === "function") onState(MP.state);
  });
}

async function ensureMeExists() {
  await mpAuthReady();
  if (!MP.uid) return;

  const pRef = roomRef(`participants/${MP.uid}`);
  const snap = await get(pRef);

  if (!snap.exists()) {
    await set(pRef, {
      uid: MP.uid,
      nickname: "Guest",
      wins: 0,
      losses: 0,
      games: 0,
      score: 0,
      lastSeen: serverTimestamp(),
    });
  } else {
    await update(pRef, { lastSeen: serverTimestamp() });
  }
}

/**
 * mpWrite(path, value)
 * - scrive un valore (se value è null -> rimuove chiave)
 */
export async function mpWrite(path, value) {
  if (!path) throw new Error("mpWrite: path mancante");

  if (value === null) {
    const parts = path.split("/").filter(Boolean);
    const key = parts.pop();
    const parent = parts.join("/");

    // se stai cancellando una chiave di primo livello
    if (!parent) {
      await update(roomRef(), { [key]: null });
      return;
    }

    await update(roomRef(parent), { [key]: null });
    return;
  }

  await set(roomRef(path), value);
}

/**
 * mpUpdate(path, obj)
 */
export async function mpUpdate(path, obj) {
  await update(roomRef(path), obj);
}

/**
 * mpAddOrUpdateMe(nickname)
 */
export async function mpAddOrUpdateMe(nickname) {
  await mpAuthReady();
  if (!MP.uid) throw new Error("uid non pronto");

  await update(roomRef(`participants/${MP.uid}`), {
    uid: MP.uid,
    nickname: String(nickname).slice(0, 20),
    lastSeen: serverTimestamp(),
  });
}

/**
 * mpInc(uid, field, delta=1)
 */
export async function mpInc(uid, field, delta = 1) {
  const r = roomRef(`participants/${uid}/${field}`);
  await runTransaction(r, (cur) => (Number(cur || 0) + Number(delta || 0)));
}

/**
 * mpAddScore(uid, delta)
 */
export async function mpAddScore(uid, delta) {
  return mpInc(uid, "score", delta);
}

/**
 * mpParticipantsArray(state)
 * - converte state.participants (oggetto) -> array con {uid,...}
 */
export function mpParticipantsArray(state) {
  const obj = state?.participants || {};
  return Object.entries(obj).map(([uid, p]) => ({ uid, ...(p || {}) }));
}

/* =========================
   Compat exports (non rompere import)
========================= */
export async function mpWriteRoot(obj) {
  await update(roomRef(), obj);
}
export const mpWriteParticipants = mpParticipantsArray;

export async function mpInitRoom() {
  // placeholder
}

export async function mpWriteState(path, value) {
  return mpWrite(path, value);
}

export async function mpWriteIfMissing(path, value) {
  const s = await get(roomRef(path));
  if (!s.exists()) await set(roomRef(path), value);
}
