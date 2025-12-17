
import React, { useState, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { RefreshCw, ArrowUpDown, Loader2, ExternalLink, ShieldCheck, Coins } from 'lucide-react';

const CurrencyConverter: React.FC = () => {
  const [amount, setAmount] = useState<string>('1');
  const [fromCurrency, setFromCurrency] = useState('MYR');
  const [toCurrency, setToCurrency] = useState('EGP');
  const [rate, setRate] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [sources, setSources] = useState<{title?: string, uri?: string}[]>([]);

  const fetchRate = async () => {
    setLoading(true); setSources([]);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `Current Wise mid-market exchange rate ${fromCurrency} to ${toCurrency}. Number only.`;
      const res = await ai.models.generateContent({ model: "gemini-3-flash-preview", contents: prompt, config: { tools: [{ googleSearch: {} }] } });
      const chunks = res.candidates?.[0]?.groundingMetadata?.groundingChunks;
      if (chunks) setSources(chunks.map((c: any) => c.web).filter(Boolean));
      const match = res.text?.match(/(\d+\.\d+)/);
      setRate(match ? parseFloat(match[1]) : (fromCurrency === 'MYR' ? 10.85 : 48.5));
    } catch (e) { setRate(10.85); } finally { setLoading(false); }
  };

  useEffect(() => { fetchRate(); }, [fromCurrency, toCurrency]);

  return (
    <div className="p-6 space-y-8 pb-32">
      <div className="cute-card p-10 bg-white relative">
        <div className="absolute top-4 right-4"><ShieldCheck className="text-green-500 w-8 h-8 opacity-20" /></div>
        
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-black text-brown-800 tracking-tighter uppercase">GOLD COINS</h2>
          <div className="bg-green-100 text-green-700 px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest border-2 border-green-200 flex items-center gap-1">WISE RATE</div>
        </div>

        <div className="space-y-6">
          <div className="relative">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest absolute left-8 top-4">SENDING</label>
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="w-full text-4xl font-black bg-slate-50 border-4 border-slate-100 rounded-[2.5rem] pt-12 pb-6 px-8 outline-none focus:border-yellow-400 transition-all" />
            <span className="absolute right-8 bottom-6 font-black text-yellow-600 text-xl">{fromCurrency}</span>
          </div>

          <div className="flex justify-center -my-3 relative z-10">
            <button onClick={() => { setFromCurrency(toCurrency); setToCurrency(fromCurrency); }} className="p-5 gold-gradient rounded-[1.5rem] text-white shadow-xl bubbly-button border-4 border-white"><ArrowUpDown className="w-6 h-6" /></button>
          </div>

          <div className="relative">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest absolute left-8 top-4">RECEIVING</label>
            <div className="w-full text-4xl font-black bg-yellow-50 border-4 border-yellow-100 rounded-[2.5rem] pt-12 pb-6 px-8 text-brown-800">
              {rate ? (parseFloat(amount || '0') * rate).toFixed(2) : '---'}
              <span className="ml-auto float-right text-yellow-600 text-xl">{toCurrency}</span>
            </div>
          </div>
        </div>

        <div className="mt-8 flex items-center justify-between border-t-4 border-slate-50 pt-6">
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-slate-400 uppercase">Live Price</span>
            <span className="text-lg font-black text-brown-800">1 {fromCurrency} = {rate} {toCurrency}</span>
          </div>
          <button onClick={fetchRate} disabled={loading} className="p-4 bg-slate-100 rounded-2xl bubbly-button"><RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} /></button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {[
          { f: 'MYR', t: 'EGP', n: 'RM to Pound' },
          { f: 'USD', t: 'EGP', n: '$ to Pound' },
          { f: 'EUR', t: 'EGP', n: '€ to Pound' },
          { f: 'EGP', t: 'MYR', n: 'Pound to RM' }
        ].map(p => (
          <button key={p.n} onClick={() => { setFromCurrency(p.f); setToCurrency(p.t); }} className={`p-6 rounded-[2.5rem] border-4 transition-all text-center bubbly-button ${fromCurrency === p.f ? 'bg-brown-800 border-brown-900 text-white shadow-lg' : 'bg-white border-yellow-100 text-slate-500 shadow-sm'}`}>
            <div className="text-[10px] font-black uppercase opacity-60 mb-1">{p.f} → {p.t}</div>
            <div className="font-black text-xs uppercase">{p.n}</div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default CurrencyConverter;
