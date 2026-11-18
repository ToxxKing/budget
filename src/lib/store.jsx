import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { defaultState, migrate } from './defaults';
import { loadState, saveState, requestPersistence } from './storage';
import { backupFilename, shareOrDownload, toJSON } from './backup';

const Ctx = createContext(null);
export const useApp = () => useContext(Ctx);

export function StoreProvider({ children }) {
  const [state, setState] = useState(null);
  const [saveMode, setSaveMode] = useState(undefined); // 'idb' | 'local' | null (échec) | undefined (rien écrit encore)
  const [toast, setToast] = useState(null);
  const [sheet, setSheet] = useState(null);
  const pending = useRef(null);
  const timer = useRef(null);
  const toastTimer = useRef(null);

  // Chargement initial
  useEffect(() => {
    (async () => {
      const raw = await loadState();
      let s;
      try { s = raw ? migrate(raw) : defaultState(); } catch (e) { s = defaultState(); }
      setState(s);
      requestPersistence();
    })();
  }, []);

  // Sauvegarde différée de 300 ms : regroupe les saisies rapides en une seule écriture.
  const flush = useCallback(async () => {
    clearTimeout(timer.current);
    if (!pending.current) return;
    const s = pending.current;
    pending.current = null;
    setSaveMode(await saveState(s));
  }, []);

  useEffect(() => {
    if (!state) return;
    pending.current = state;
    clearTimeout(timer.current);
    timer.current = setTimeout(flush, 300);
  }, [state, flush]);

  // iOS peut tuer une PWA en arrière-plan sans prévenir : on écrit dès que l'app est masquée.
  useEffect(() => {
    const onHide = () => { if (document.visibilityState === 'hidden') flush(); };
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', flush);
    return () => { document.removeEventListener('visibilitychange', onHide); window.removeEventListener('pagehide', flush); };
  }, [flush]);

  const update = useCallback((fn) => {
    setState((s) => {
      const next = fn(s);
      return { ...next, meta: { ...next.meta, updatedAt: new Date().toISOString() } };
    });
  }, []);

  // Pour les réglages internes (bannières) : ne compte pas comme une modification à sauvegarder.
  const updateMeta = useCallback((patch) => setState((s) => ({ ...s, meta: { ...s.meta, ...patch } })), []);

  const notify = useCallback((msg) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2400);
  }, []);

  const backupNow = useCallback(async () => {
    try {
      const how = await shareOrDownload(backupFilename('json'), toJSON(state), 'application/json');
      updateMeta({ lastBackupAt: new Date().toISOString() });
      notify(how === 'shared' ? 'Sauvegarde prête' : 'Sauvegarde téléchargée');
      return true;
    } catch (e) {
      if (e?.name !== 'AbortError') notify('Sauvegarde impossible sur cet appareil');
      return false;
    }
  }, [state, notify, updateMeta]);

  const value = { state, update, updateMeta, notify, toast, sheet, openSheet: (type, data = {}) => setSheet({ type, data }), closeSheet: () => setSheet(null), saveMode, backupNow, replaceState: (s) => update(() => s) };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
