
import React, { useState, useEffect } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { Sun, Cloud, CloudRain, Clock, Landmark, ExternalLink, Moon, Sunrise, Sunset, MapPin, Loader2, Sparkles, Triangle } from 'lucide-react';

interface WeatherPeriod {
  period: 'Morning' | 'Afternoon' | 'Evening' | 'Night';
  temp: number;
  condition: string;
}

const EGYPT_CITIES = [
  { id: 'cairo', name: 'Cairo', icon: '🏰' },
  { id: 'luxor', name: 'Luxor', icon: '🏺' },
  { id: 'alex', name: 'Alex', icon: '⛵' },
  { id: 'aswan', name: 'Aswan', icon: '🛶' },
  { id: 'sharm', name: 'Sharm', icon: '🏖️' }
];

const Explorer: React.FC = () => {
  const [selectedCity, setSelectedCity] = useState(EGYPT_CITIES[0]);
  const [forecast, setForecast] = useState<WeatherPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [egyptTime, setEgyptTime] = useState<string>('');
  const [sources, setSources] = useState<{title?: string, uri?: string}[]>([]);

  useEffect(() => {
    const timer = setInterval(() => {
      const options: any = { timeZone: 'Africa/Cairo', hour: '2-digit', minute: '2-digit', hour12: true };
      setEgyptTime(new Intl.DateTimeFormat('en-US', options).format(new Date()));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchCityWeather = async (cityName: string) => {
    setLoading(true); setSources([]);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `Weather forecast for ${cityName}, Egypt today (Morning, Afternoon, Evening, Night). Numerical data. JSON array format.`;
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: { period: { type: Type.STRING }, temp: { type: Type.NUMBER }, condition: { type: Type.STRING } },
              required: ["period", "temp", "condition"]
            }
          }
        },
      });
      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      if (chunks) setSources(chunks.map((c: any) => c.web).filter(Boolean));
      setForecast(JSON.parse(response.text || '[]'));
    } catch (error) {
      setForecast([{ period: 'Morning', temp: 24, condition: 'Sunny' }, { period: 'Afternoon', temp: 32, condition: 'Sunny' }, { period: 'Evening', temp: 28, condition: 'Clear' }, { period: 'Night', temp: 22, condition: 'Clear' }]);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchCityWeather(selectedCity.name); }, [selectedCity]);

  return (
    <div className="p-6 space-y-8 pb-32 overflow-hidden">
      {/* Cute Clock Header */}
      <div className="cute-card p-10 relative overflow-hidden text-center bg-yellow-50">
        <div className="absolute -top-10 -left-10 opacity-10 floating"><Triangle className="w-40 h-40 text-yellow-600 fill-current" /></div>
        <div className="relative z-10">
          <div className="bg-yellow-400 inline-block px-4 py-1 rounded-full text-white text-[10px] font-black uppercase tracking-widest mb-4">EGYPT LOCAL</div>
          <h2 className="text-6xl font-black tracking-tighter text-brown-800">{egyptTime}</h2>
          <p className="mt-2 text-xs font-black text-yellow-600 uppercase tracking-widest flex items-center justify-center gap-2"><MapPin className="w-3 h-3" /> AFRICA / CAIRO</p>
        </div>
      </div>

      {/* City Bubbles */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 px-2 text-xs font-black text-brown-800 uppercase tracking-widest"><Sparkles className="w-4 h-4 text-yellow-500" /> CHOOSE DESTINATION</div>
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide px-2">
          {EGYPT_CITIES.map(city => (
            <button key={city.id} onClick={() => setSelectedCity(city)} className={`flex-shrink-0 w-24 h-24 rounded-[2.5rem] border-4 flex flex-col items-center justify-center transition-all bubbly-button ${selectedCity.id === city.id ? 'bg-yellow-400 border-yellow-600 text-white shadow-lg' : 'bg-white border-yellow-100 text-slate-400'}`}>
              <span className="text-3xl mb-1">{city.icon}</span>
              <span className="text-[10px] font-black uppercase">{city.name}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Forecast Cards */}
      <section className="space-y-4">
        <div className="flex justify-between items-center px-2">
          <h3 className="text-xl font-black text-brown-800 tracking-tighter uppercase">{selectedCity.name} SKY</h3>
          <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-600 border-2 border-yellow-200"><Triangle className="w-4 h-4" /></div>
        </div>

        {loading ? (
          <div className="cute-card p-20 flex flex-col items-center gap-4 opacity-50">
            <Loader2 className="w-12 h-12 animate-spin text-yellow-600" />
            <p className="text-[10px] font-black text-yellow-600 uppercase tracking-widest">Reading Hieroglyphs...</p>
          </div>
        ) : (
          <div className="space-y-3">
            {forecast.map((item, idx) => (
              <div key={idx} className="cute-card p-6 flex items-center justify-between group hover:scale-[1.02] transition-transform">
                <div className="flex items-center gap-6">
                  <div className="w-14 h-14 rounded-[2rem] bg-yellow-100 flex items-center justify-center">
                    {item.period === 'Morning' && <Sunrise className="w-7 h-7 text-orange-400" />}
                    {item.period === 'Afternoon' && <Sun className="w-7 h-7 text-yellow-500" />}
                    {item.period === 'Evening' && <Sunset className="w-7 h-7 text-yellow-600" />}
                    {item.period === 'Night' && <Moon className="w-7 h-7 text-indigo-400" />}
                  </div>
                  <div>
                    <h4 className="font-black text-brown-800 text-sm tracking-widest uppercase">{item.period}</h4>
                    <p className="text-[10px] font-black uppercase text-slate-400">{item.condition}</p>
                  </div>
                </div>
                <div className="text-4xl font-black text-brown-800">{item.temp}°</div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default Explorer;
