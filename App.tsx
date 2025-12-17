
import React, { useState } from 'react';
import { AppTab } from './types';
import CurrencyConverter from './components/CurrencyConverter';
import LiveTranslator from './components/LiveTranslator';
import Explorer from './components/Explorer';
import { Landmark, Languages, CircleDollarSign, Compass, Triangle } from 'lucide-react';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AppTab>(AppTab.EXPLORER);

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto relative overflow-hidden">
      {/* Decorative Pyramids */}
      <div className="fixed -top-10 -right-20 opacity-10 floating"><Triangle className="w-64 h-64 text-yellow-600 fill-current" /></div>
      
      {/* Header */}
      <header className="p-8 pb-4 flex flex-col items-center flex-shrink-0 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-16 h-16 gold-gradient rounded-[2rem] flex items-center justify-center shadow-xl border-4 border-white floating">
             <Landmark className="text-white w-8 h-8" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-4xl font-egypt font-black text-brown-800 tracking-tighter">CLEO</h1>
            <span className="text-[10px] font-black text-yellow-600 uppercase tracking-[0.4em] -mt-1">GUIDE</span>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-hidden relative">
        <div className="h-full overflow-y-auto scrollbar-hide">
          {activeTab === AppTab.EXPLORER && <Explorer />}
          {activeTab === AppTab.TRANSLATOR && <LiveTranslator />}
          {activeTab === AppTab.CURRENCY && <CurrencyConverter />}
        </div>
      </main>

      {/* Nav */}
      <nav className="bg-white/95 backdrop-blur-3xl border-t-8 border-yellow-400 px-10 py-6 flex justify-between items-center fixed bottom-0 max-w-md w-full z-50 rounded-t-[3.5rem] shadow-2xl">
        {[
          { id: AppTab.EXPLORER, label: 'SKY', Icon: Compass },
          { id: AppTab.TRANSLATOR, label: 'SPEAK', Icon: Languages },
          { id: AppTab.CURRENCY, label: 'GOLD', Icon: CircleDollarSign }
        ].map(({ id, label, Icon }) => (
          <button key={id} onClick={() => setActiveTab(id)} className={`flex flex-col items-center gap-1 transition-all flex-1 bubbly-button ${activeTab === id ? 'text-yellow-600 scale-125' : 'text-slate-300'}`}>
            <Icon className={`w-7 h-7 ${activeTab === id ? 'fill-yellow-100' : ''}`} />
            <span className="text-[10px] font-black uppercase tracking-widest mt-1">{label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
};

export default App;
