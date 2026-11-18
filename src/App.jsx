import { useState } from 'react';
import { Home as HomeIcon, Wallet, PiggyBank, PieChart, Settings as SettingsIcon } from 'lucide-react';
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
      <main className="gutter mx-auto max-w-[520px] pt-3 main-pad">
        {tab === 'home' && <Home />}
        {tab === 'budget' && <Budget goSettings={() => go('settings')} />}
        {tab === 'savings' && <Savings />}
        {tab === 'analytics' && <Analytics />}
        {tab === 'settings' && <Settings />}
      </main>

      <nav className="tabbar fixed bottom-0 inset-x-0 z-30 border-t border-line bg-bg/85 backdrop-blur-xl" aria-label="Navigation principale">
        <div className="mx-auto grid max-w-[520px] grid-cols-5">
          {TABS.map((t) => {
            const A = t.icon;
            const on = tab === t.id;
            return (
              <button key={t.id} onClick={() => go(t.id)} aria-current={on ? 'page' : undefined}
                className={`min-h-[56px] flex flex-col items-center justify-center gap-1 pt-1.5 ${on ? 'text-accent' : 'text-faint'}`}>
                <A size={24} strokeWidth={on ? 2.3 : 1.8} /><span className="text-[10.5px] font-semibold">{t.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      <AllSheets />
      {toast && <div role="status" className="toast fixed left-1/2 z-[60] -translate-x-1/2 rounded-full bg-fg px-4 py-2.5 text-[14px] font-semibold text-bg shadow-xl anim-fade whitespace-nowrap">{toast}</div>}
    </div>
  );
}

export default function App() {
  return <StoreProvider><Shell /></StoreProvider>;
}
