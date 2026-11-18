import { useEffect, useRef, useState } from 'react';
import { CloudUpload, Upload, FileText, RotateCcw, ShieldCheck, Smartphone, AlertTriangle, HardDrive } from 'lucide-react';
import { useApp } from '../lib/store';
import { defaultState } from '../lib/defaults';
import { eur, parseAmount, toInput } from '../lib/format';
import { addMonths, monthLabel, monthRange } from '../lib/dates';
import { backupFilename, parseBackup, shareOrDownload, toCSV } from '../lib/backup';
import { isIOS, isStandalone, requestPersistence, storageInfo } from '../lib/storage';
import { DangerBtn, Field, GhostBtn, PageTitle, PrimaryBtn, Sheet } from '../components/ui';

const ago = (iso) => {
  if (!iso) return 'jamais';
  const d = Math.floor((Date.now() - new Date(iso)) / 86400000);
  return d === 0 ? "aujourd'hui" : d === 1 ? 'hier' : `il y a ${d} jours`;
};

function Row({ icon: I, label, sub, onClick, danger }) {
  return (
    <button onClick={onClick} className="w-full min-h-[64px] flex items-center gap-3 px-4 text-left active:bg-card2">
      <div className={`h-9 w-9 rounded-xl grid place-items-center shrink-0 ${danger ? 'bg-bad/15 text-bad' : 'bg-line text-fg'}`}><I size={18} /></div>
      <div className="flex-1 min-w-0"><div className={`text-[15px] font-medium ${danger ? 'text-bad' : ''}`}>{label}</div>{sub && <div className="text-[12px] text-faint">{sub}</div>}</div>
    </button>
  );
}

export default function Settings() {
  const { state, update, notify, backupNow, replaceState, saveMode } = useApp();
  const [info, setInfo] = useState(null);
  const [panel, setPanel] = useState(null);
  const [preview, setPreview] = useState(null);
  const [err, setErr] = useState('');
  const fileRef = useRef(null);
  const standalone = isStandalone();

  useEffect(() => { storageInfo().then(setInfo); }, []);

  const setSetting = (k, v) => update((s) => ({ ...s, settings: { ...s.settings, [k]: v } }));
  const askPersist = async () => { const ok = await requestPersistence(); setInfo(await storageInfo()); notify(ok ? 'Stockage protégé' : 'iOS décide seul : installe l’appli pour le protéger'); };

  const exportCSV = async () => {
    try { await shareOrDownload(backupFilename('csv'), toCSV(state), 'text/csv'); notify('Export CSV prêt'); }
    catch (e) { if (e?.name !== 'AbortError') notify('Export impossible'); }
  };
  const onFile = (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      try { setPreview(parseBackup(String(r.result))); setErr(''); setPanel('import'); }
      catch (x) { setErr("Ce fichier n'est pas une sauvegarde de cette appli."); setPanel('import'); setPreview(null); }
    };
    r.readAsText(f);
  };

  const startMonths = monthRange(addMonths(state.settings.startMonth, -6), 13);

  return (
    <div>
      <PageTitle eyebrow="Sauvegarde & sécurité" title="Réglages" />

      {/* État du stockage */}
      <section className="card p-4 mb-5 space-y-3">
        <div className="flex items-start gap-3">
          <HardDrive size={20} className={saveMode === null ? 'text-bad' : 'text-good'} />
          <div className="text-[14px]">
            <div className="font-semibold">{saveMode === 'idb' ? 'Enregistré sur cet appareil' : saveMode === 'local' ? 'Enregistré (mode secours)' : saveMode === null ? "Échec de l'enregistrement : sauvegarde dans Fichiers" : 'Enregistrement automatique'}</div>
            <div className="text-muted">Chaque modification est écrite tout de suite dans le stockage de l'appli, sans connexion.</div>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <ShieldCheck size={20} className={info?.persisted ? 'text-good' : 'text-warn'} />
          <div className="text-[14px] flex-1">
            <div className="font-semibold">{info?.persisted ? 'Stockage protégé' : 'Stockage non protégé'}</div>
            <div className="text-muted">{info?.persisted ? "iOS ne supprimera pas ces données pour faire de la place." : "iOS peut effacer les données d'un site peu utilisé. Installer l'appli réduit ce risque."}</div>
            {!info?.persisted && <button onClick={askPersist} className="mt-2 tap px-3 rounded-xl bg-card2 border border-line text-[14px]">Demander la protection</button>}
          </div>
        </div>
        <div className="flex items-start gap-3">
          <Smartphone size={20} className={standalone ? 'text-good' : 'text-warn'} />
          <div className="text-[14px]">
            <div className="font-semibold">{standalone ? "Installée sur l'écran d'accueil" : 'Ouverte dans le navigateur'}</div>
            <div className="text-muted">{standalone ? 'Les données vivent dans l’appli. Supprimer l’icône les efface : sauvegarde avant.' : isIOS() ? "Safari → Partager → « Sur l'écran d'accueil ». Les données saisies ici dans Safari ne suivent pas : exporte-les puis importe-les dans l'appli installée." : "Utilise le menu du navigateur pour installer l'appli."}</div>
          </div>
        </div>
        {info?.usage != null && <div className="text-[12px] text-faint num">Espace utilisé : {(info.usage / 1024).toFixed(0)} Ko</div>}
      </section>

      {/* Sauvegarde */}
      <div className="label mb-2 px-1">Sauvegarde</div>
      <section className="card divide-y divide-line overflow-hidden mb-2">
        <Row icon={CloudUpload} label="Sauvegarder dans Fichiers" sub={`Dernière sauvegarde : ${ago(state.meta.lastBackupAt)}`} onClick={backupNow} />
        <Row icon={Upload} label="Restaurer une sauvegarde" sub="Fichier .json (aussi celles de l'ancienne version)" onClick={() => fileRef.current?.click()} />
        <Row icon={FileText} label="Exporter en CSV" sub="Pour Numbers ou Excel" onClick={exportCSV} />
      </section>
      <input ref={fileRef} id="import-file" type="file" accept="application/json,.json,text/plain" className="hidden" onChange={onFile} />
      <p className="mb-5 px-1 text-[12px] text-faint">Dans la feuille de partage, choisis « Enregistrer dans Fichiers » puis iCloud Drive. Un rappel apparaît sur l'accueil après {state.settings.remindDays} jours sans sauvegarde.</p>

      {/* Paramètres */}
      <div className="label mb-2 px-1">Paramètres</div>
      <section className="card p-4 mb-5">
        <Field label="Salaire net mensuel (€)">
          <input id="set-salary" key={`sal-${state.settings.salary}`} inputMode="decimal" defaultValue={toInput(state.settings.salary)} onBlur={(e) => { const v = parseAmount(e.target.value); if (v !== state.settings.salary) { setSetting('salary', v); notify('Salaire mis à jour'); } }} className="input num w-full" />
        </Field>
        <Field label="Premier mois suivi" hint="Les soldes des comptes sont ceux du début de ce mois.">
          <select id="set-month" value={state.settings.startMonth} disabled={Object.keys(state.months).length > 0} onChange={(e) => setSetting('startMonth', e.target.value)} className="input w-full disabled:opacity-50">
            {startMonths.map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}
          </select>
        </Field>
        <Field label="Rappel de sauvegarde">
          <select id="set-remind" value={state.settings.remindDays} onChange={(e) => setSetting('remindDays', Number(e.target.value))} className="input w-full">
            {[3, 7, 14, 30].map((d) => <option key={d} value={d}>Tous les {d} jours</option>)}
          </select>
        </Field>
      </section>

      <section className="card overflow-hidden mb-5">
        <Row icon={RotateCcw} label="Réinitialiser" sub="Revenir aux données de départ" danger onClick={() => setPanel('reset')} />
      </section>
      <p className="px-1 text-[12px] text-faint">Budget · version 2.0 · fonctionne hors connexion, aucune donnée ne quitte ton iPhone.</p>

      <Sheet open={panel === 'import'} onClose={() => setPanel(null)} title="Restaurer">
        {err ? (
          <div className="rounded-2xl border border-bad/40 bg-bad/10 p-4 text-[14px] text-bad flex gap-2"><AlertTriangle size={18} className="shrink-0" />{err}</div>
        ) : preview && (
          <>
            <div className="card divide-y divide-line mb-4 text-[15px]">
              <div className="flex justify-between px-4 py-3"><span className="text-muted">Lignes de budget</span><span className="num font-semibold">{preview.items.length}</span></div>
              <div className="flex justify-between px-4 py-3"><span className="text-muted">Dépenses saisies</span><span className="num font-semibold">{preview.expenses.length}</span></div>
              <div className="flex justify-between px-4 py-3"><span className="text-muted">Mois clôturés</span><span className="num font-semibold">{Object.keys(preview.months).length}</span></div>
              <div className="flex justify-between px-4 py-3"><span className="text-muted">Comptes</span><span className="num font-semibold">{eur(preview.accounts.reduce((a, x) => a + x.balance, 0))}</span></div>
            </div>
            <p className="text-[14px] text-muted mb-4">Ces données remplaceront tout ce qui est dans l'appli.</p>
            <PrimaryBtn onClick={() => { replaceState(preview); setPanel(null); notify('Sauvegarde restaurée'); }}>Restaurer</PrimaryBtn>
          </>
        )}
      </Sheet>

      <Sheet open={panel === 'reset'} onClose={() => setPanel(null)} title="Réinitialiser ?">
        <p className="text-[15px] text-muted mb-4">Tes modifications, dépenses, échéances cochées et mois clôturés seront remplacés par les données de départ. Sauvegarde avant si tu veux les garder.</p>
        <GhostBtn className="w-full mb-2" onClick={backupNow}><CloudUpload size={18} /> Sauvegarder d'abord</GhostBtn>
        <div className="grid grid-cols-2 gap-2">
          <GhostBtn onClick={() => setPanel(null)}>Annuler</GhostBtn>
          <DangerBtn onClick={() => { replaceState({ ...defaultState(), meta: { ...defaultState().meta, lastBackupAt: state.meta.lastBackupAt, installHintDismissed: state.meta.installHintDismissed } }); setPanel(null); notify('Données réinitialisées'); }}>Réinitialiser</DangerBtn>
        </div>
      </Sheet>
    </div>
  );
}
