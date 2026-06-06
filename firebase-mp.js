// /ITALIA/firebase-mp.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import {
  getDatabase,
  ref,
  set,
  update,
  get,
  onValue,
  runTransaction,
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-database.js";
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";

/* =========================
   Firebase init
========================= */
const firebaseConfig = {
  apiKey: "AIzaSyC4wjxtURhqn1cfiaEDWXSLrj9-BgwoINs",
  authDomain: "quiz-regioni.firebaseapp.com",
  databaseURL: "https://quiz-regioni-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "quiz-regioni",
  storageBucket: "quiz-regioni.firebasestorage.app",
  messagingSenderId: "80504945646",
  appId: "1:80504945646:web:865dac2c7890c3a62b2cff",
};

export const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
export const auth = getAuth(app);

/* =========================
   Room + state container
========================= */
export const MP = {
  roomId: null,
  uid: null,
  state: null,
  basePath: null,
};

/* =========================
   Helpers
========================= */
function randomRoomId(len = 10) {
  const chars = "abcdef0123456789";
  let out = "";
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

function getRoomIdFromHashOrMakeOne() {
  const h = (location.hash || "").replace("#", "").trim();
  if (h) return h;

  // se non c'è hash, creo stanza e la scrivo nell'URL
  const rid = randomRoomId(10);
  try {
    location.hash = rid;
  } catch {}
  return rid;
}

/* =========================
   Auth readiness (fix "uid non pronto")
========================= */
let _authReadyPromise = null;

export function mpAuthReady() {
  if (_authReadyPromise) return _authReadyPromise;

  _authReadyPromise = new Promise((resolve, reject) => {
    // se già loggato
    if (auth.currentUser?.uid) {
      MP.uid = auth.currentUser.uid;
      resolve(MP.uid);
      return;
    }

    // ascolta auth
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user?.uid) {
        MP.uid = user.uid;
        try { unsub(); } catch {}
        resolve(MP.uid);
      }
    });

    // avvia login anonimo (una sola volta)
    signInAnonymously(auth).catch((e) => {
      try { unsub(); } catch {}
      reject(e);
    });
  });

  return _authReadyPromise;
}

/* =========================
   Core DB ops
========================= */
function roomRef(path = "") {
  if (!MP.basePath) throw new Error("MP non inizializzato: chiama mpInit() prima.");
  const full = path ? `${MP.basePath}/${path}` : MP.basePath;
  return ref(db, full);
}

export async function mpWrite(path, value) {
  await mpAuthReady();
  // null => delete node
  await set(roomRef(path), value === undefined ? null : value);
}

export async function mpUpdate(path, patchObj) {
  await mpAuthReady();
  if (!patchObj || typeof patchObj !== "object") {
    throw new Error("mpUpdate: patchObj deve essere un oggetto");
  }
  // update() fa merge, path può essere "" per root stanza
  const r = roomRef(path);
  await update(r, patchObj);
}

export function mpParticipantsArray(state) {
  const obj = state?.participants || {};
  return Object.entries(obj).map(([uid, p]) => ({ uid, ...(p || {}) }));
}

/* increment numerico dentro participants/{uid}/{field} */
export async function mpInc(uid, field, delta = 1) {
  await mpAuthReady();
  if (!uid) throw new Error("mpInc: uid mancante");
  if (!field) throw new Error("mpInc: field mancante");

  const r = roomRef(`participants/${uid}/${field}`);
  await runTransaction(r, (cur) => {
    const n = Number(cur || 0);
    return n + Number(delta || 1);
  });
}

/* score += delta */
export async function mpAddScore(uid, delta) {
  await mpInc(uid, "score", Number(delta || 0));
}

/* registra/aggiorna me stesso */
export async function mpAddOrUpdateMe(nickname) {
  const uid = await mpAuthReady();
  if (!uid) throw new Error("uid non pronto");

  const cleanNick = String(nickname || "").trim();
  if (!cleanNick) throw new Error("Nickname vuoto");

  const pRef = roomRef(`participants/${uid}`);
  await runTransaction(pRef, (cur) => {
    const base = cur && typeof cur === "object" ? cur : {};
    return {
      nickname: cleanNick,
      wins: Number(base.wins || 0),
      losses: Number(base.losses || 0),
      games: Number(base.games || 0),
      score: Number(base.score || 0),
      updatedAt: Date.now(),
    };
  });

  return uid;
}

/* =========================
   Init room + subscribe state
========================= */
export async function mpInit({ defaults = {}, onState } = {}) {
  // roomId + basePath
  MP.roomId = getRoomIdFromHashOrMakeOne();
  MP.basePath = `rooms/${MP.roomId}`;

  // ensure auth
  await mpAuthReady();

  // se stanza vuota -> set defaults (solo la prima volta)
  const snap = await get(roomRef(""));
  if (!snap.exists()) {
    await set(roomRef(""), {
      ...defaults,
      createdAt: Date.now(),
    });
  } else if (defaults && typeof defaults === "object") {
    // merge soft: aggiunge solo chiavi mancanti
    const cur = snap.val() || {};
    const patch = {};
    for (const [k, v] of Object.entries(defaults)) {
      if (cur[k] === undefined) patch[k] = v;
    }
    if (Object.keys(patch).length) {
      await update(roomRef(""), patch);
    }
  }

  // subscribe live
  onValue(roomRef(""), (s) => {
    MP.state = s.val() || null;
    if (typeof onState === "function") {
      try { onState(MP.state); } catch (e) { console.error(e); }
    }
  });

  return MP;
}
