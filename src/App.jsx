import { useState } from 'react';
import { Home as HomeIcon, Wallet, PiggyBank, PieChart, Settings as SettingsIcon, PartyPopper, Check, Info, Trophy } from 'lucide-react';
import { Celebration } from './components/celebration';
import { StoreProvider, useApp } from './lib/store';
import { AllSheets } from './components/sheets';
import Home from './tabs/Home';
import Budget from './tabs/Budget';
import Savings from './tabs/Savings';
import Analytics from './tabs/Analytics';
import Settings from './tabs/Settings';

const TABS = [
  { id: 'home', label: 'Accueil', icon: HomeIcon },
  { id: 'budget', label: 'Budget', icon: Wallet },
  { id: 'savings', label: 'Épargne', icon: PiggyBank },
  { id: 'analytics', label: 'Analyses', icon: PieChart },
  { id: 'settings', label: 'Réglages', icon: SettingsIcon },
];

function Shell() {
  const { state, toast } = useApp();
  const [tab, setTab] = useState('home');
  if (!state) return <div className="min-h-screen grid place-items-center text-muted">Chargement…</div>;
  const go = (t) => { setTab(t); window.scrollTo({ top: 0 }); };
  return (
    <div className="min-h-full w-full overflow-x-hidden">
      <main key={tab} className="stagger-root gutter mx-auto max-w-[520px] pt-3 main-pad">
        {tab === 'home' && <Home />}
        {tab === 'budget' && <Budget goSettings={() => go('settings')} />}
        {tab === 'savings' && <Savings />}
        {tab === 'analytics' && <Analytics />}
        {tab === 'settings' && <Settings />}
      </main>

      <nav className="tabbar fixed bottom-0 inset-x-0 z-30 border-t border-line bg-bg/85 backdrop-blur-xl" aria-label="Navigation principale">
        <div className="relative mx-auto grid max-w-[520px] grid-cols-5">
          <div className="tab-pill pointer-events-none absolute top-1.5 left-0 h-[30px] w-[20%] flex justify-center" style={{ transform: `translateX(${TABS.findIndex((t) => t.id === tab) * 100}%)` }} aria-hidden="true">
            <span className="h-full w-[52px] rounded-full bg-accent/15" />
          </div>
          {TABS.map((t) => {
            const A = t.icon;
            const on = tab === t.id;
            return (
              <button key={t.id} onClick={() => go(t.id)} aria-current={on ? 'page' : undefined}
                className={`relative min-h-[56px] flex flex-col items-center justify-center gap-1 pt-1.5 transition-colors ${on ? 'text-accent' : 'text-faint'}`}>
                <span key={on ? 'on' : 'off'} className={on ? 'hop' : ''}><A size={24} strokeWidth={on ? 2.3 : 1.8} /></span>
                <span className="text-[10.5px] font-semibold">{t.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      <AllSheets />
      <div aria-hidden="true" className="ambient" />
      <Celebration />
      {toast && (
        <div role="status" key={toast.id} className="toast toast-in fixed left-1/2 z-[60] flex items-center gap-2 rounded-full bg-fg pl-3 pr-4 py-2.5 text-[14px] font-semibold text-bg shadow-xl max-w-[92vw]">
          <span className={`grid place-items-center h-6 w-6 rounded-full shrink-0 ${toast.kind === 'party' ? 'bg-[#ffc24b]' : toast.kind === 'good' ? 'bg-[#3ee0a1]' : toast.kind === 'bad' ? 'bg-[#f87171]' : 'bg-[#8fa8ff]'}`}>
            {toast.kind === 'party' ? <PartyPopper size={14} strokeWidth={2.5} /> : toast.kind === 'good' ? <Check size={14} strokeWidth={3} /> : toast.kind === 'trophy' ? <Trophy size={14} strokeWidth={2.5} /> : <Info size={14} strokeWidth={2.5} />}
          </span>
          <span className="truncate">{toast.msg}</span>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return <StoreProvider><Shell /></StoreProvider>;
}
