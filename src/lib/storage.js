/**
 * Stockage local sur l'appareil.
 * IndexedDB (via idb-keyval) plutôt que localStorage : pas de limite de 5 Mo, écriture asynchrone
 * qui ne bloque pas l'interface, et c'est le stockage que `navigator.storage.persist()` protège.
 * localStorage ne sert que de secours si IndexedDB est indisponible (navigation privée ancienne).
 */
import { get, set, createStore } from 'idb-keyval';

const store = typeof indexedDB !== 'undefined' ? createStore('budget-db', 'kv') : null;
const KEY = 'state';
const LS_KEY = 'budget-state';

export async function loadState() {
  try {
    if (store) {
      const v = await get(KEY, store);
      if (v) return v;
    }
  } catch (e) { /* on tente le secours */ }
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

export async function saveState(state) {
  try {
    if (!store) throw new Error('no idb');
    await set(KEY, state, store);
    return 'idb';
  } catch (e) {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(state));
      return 'local';
    } catch (e2) {
      return null;
    }
  }
}

/** Demande à iOS / au navigateur de ne pas effacer les données sous pression de stockage. */
export async function requestPersistence() {
  try {
    if (!navigator.storage?.persist) return false;
    if (await navigator.storage.persisted()) return true;
    return await navigator.storage.persist();
  } catch (e) {
    return false;
  }
}

export async function storageInfo() {
  try {
    const persisted = navigator.storage?.persisted ? await navigator.storage.persisted() : false;
    const est = navigator.storage?.estimate ? await navigator.storage.estimate() : null;
    return { persisted, usage: est?.usage ?? null, quota: est?.quota ?? null };
  } catch (e) {
    return { persisted: false, usage: null, quota: null };
  }
}

export const isStandalone = () =>
  (typeof window !== 'undefined' && window.matchMedia?.('(display-mode: standalone)').matches) || window.navigator?.standalone === true;

export const isIOS = () =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
