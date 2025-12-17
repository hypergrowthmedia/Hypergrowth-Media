
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, Modality, LiveServerMessage } from '@google/genai';
import { Mic, MicOff, Share2, Languages, Loader2, AlertCircle, Keyboard, Send, Volume2, Sparkles, Triangle } from 'lucide-react';
import { decode, decodeAudioData, createBlob } from '../utils/audio';

const LiveTranslator: React.FC = () => {
  const [mode, setMode] = useState<'voice' | 'text'>('voice');
  const [isActive, setIsActive] = useState(false);
  const [inputText, setInputText] = useState('');
  const [transcriptions, setTranscriptions] = useState<{ sender: 'user' | 'model'; text: string }[]>([]);
  const [status, setStatus] = useState<'Idle' | 'Wait...' | 'Listening...' | 'Thinking...'>('Idle');
  const [micLevel, setMicLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [readingText, setReadingText] = useState<string | null>(null);
  
  const audioContextRef = useRef<{ input: AudioContext; output: AudioContext } | null>(null);
  const sessionRef = useRef<any>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const currentInputTransRef = useRef('');
  const currentOutputTransRef = useRef('');

  // AUTO-SCROLL FIX: Always scroll to bottom when transcriptions change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcriptions, status]);

  const stopSession = useCallback(() => {
    if (sessionRef.current) {
      sessionRef.current.close();
      sessionRef.current = null;
    }
    setIsActive(false);
    setStatus('Idle');
    setMicLevel(0);
    if (processorRef.current) { processorRef.current.disconnect(); processorRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach(track => track.stop()); streamRef.current = null; }
    if (audioContextRef.current) {
      audioContextRef.current.input.close().catch(() => {});
      audioContextRef.current.output.close().catch(() => {});
      audioContextRef.current = null;
    }
  }, []);

  const startSession = async () => {
    setError(null);
    setStatus('Wait...');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      await inputCtx.resume();
      await outputCtx.resume();
      audioContextRef.current = { input: inputCtx, output: outputCtx };

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            setStatus('Listening...');
            const source = inputCtx.createMediaStreamSource(stream);
            const processor = inputCtx.createScriptProcessor(2048, 1, 1);
            processorRef.current = processor;
            processor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              let sum = 0;
              for (let i = 0; i < inputData.length; i++) sum += inputData[i] * inputData[i];
              setMicLevel(Math.sqrt(sum / inputData.length));
              const pcmBlob = createBlob(inputData);
              sessionPromise.then(s => s.sendRealtimeInput({ media: pcmBlob }));
            };
            source.connect(processor);
            processor.connect(inputCtx.destination);
          },
          onmessage: async (m: LiveServerMessage) => {
            const base64Audio = m.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio && audioContextRef.current) {
              const { output: ctx } = audioContextRef.current;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
              const audioBuffer = await decodeAudioData(decode(base64Audio), ctx, 24000, 1);
              const source = ctx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(ctx.destination);
              source.addEventListener('ended', () => sourcesRef.current.delete(source));
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              sourcesRef.current.add(source);
              setStatus('Thinking...');
            }
            if (m.serverContent?.inputTranscription) currentInputTransRef.current += m.serverContent.inputTranscription.text;
            if (m.serverContent?.outputTranscription) currentOutputTransRef.current += m.serverContent.outputTranscription.text;
            if (m.serverContent?.turnComplete) {
              const fi = currentInputTransRef.current;
              const fo = currentOutputTransRef.current;
              if (fi.trim() || fo.trim()) {
                setTranscriptions(p => [...p, ...(fi.trim() ? [{ sender: 'user' as const, text: fi }] : []), ...(fo.trim() ? [{ sender: 'model' as const, text: fo }] : [])]);
                currentInputTransRef.current = ''; currentOutputTransRef.current = '';
                setStatus('Listening...');
              }
            }
          },
          onerror: (e) => { setError("Oops! Connection lost."); stopSession(); },
          onclose: () => stopSession(),
        },
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          systemInstruction: "You are the Cute Cleopatra assistant. Translate simply between English and Egyptian Masri. Be very friendly!",
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } } }
        }
      });
      sessionRef.current = await sessionPromise;
      setIsActive(true);
    } catch (err) { setError("Allow Mic to use Cleopatra's voice!"); stopSession(); }
  };

  const handleTextTranslate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    const userMsg = inputText; setInputText('');
    setTranscriptions(p => [...p, { sender: 'user', text: userMsg }]);
    setStatus('Thinking...');
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Translate to ${userMsg.match(/[\u0600-\u06FF]/) ? 'English' : 'Egyptian Masri'}: "${userMsg}"`,
      });
      setTranscriptions(p => [...p, { sender: 'model', text: response.text || '...' }]);
    } catch (err) { setError("Translate failed!"); } finally { setStatus('Idle'); }
  };

  const handleReadAloud = async (text: string) => {
    if (readingText) return;
    setReadingText(text);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const res = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text }] }],
        config: { responseModalities: [Modality.AUDIO], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } } },
      });
      const b64 = res.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (b64) {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        const buf = await decodeAudioData(decode(b64), ctx, 24000, 1);
        const src = ctx.createBufferSource();
        src.buffer = buf; src.connect(ctx.destination);
        src.onended = () => setReadingText(null);
        src.start();
      } else { setReadingText(null); }
    } catch (e) { setReadingText(null); }
  };

  return (
    <div className="flex flex-col h-full bg-transparent overflow-hidden">
      {/* Scrollable Chat Area */}
      <div className="flex-1 p-6 overflow-y-auto space-y-4 pb-48 scrollbar-hide">
        {error && <div className="bg-red-100 border-4 border-red-400 p-4 rounded-3xl text-red-700 text-xs font-black flex items-center gap-2"><AlertCircle className="w-4 h-4" />{error}</div>}
        
        {transcriptions.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center py-20">
             <div className="w-32 h-32 bg-yellow-100 rounded-full flex items-center justify-center floating border-4 border-yellow-400 mb-6">
                <Languages className="w-16 h-16 text-yellow-600" />
             </div>
             <h3 className="font-egypt font-black text-2xl text-brown-800 tracking-widest">CLEO CHAT</h3>
             <p className="text-xs font-black text-yellow-600 uppercase tracking-widest mt-2">Speak to me, Traveler!</p>
             <div className="mt-8 flex gap-4">
               <div className="w-8 h-8 gold-gradient rounded-lg rotate-45 flex items-center justify-center shadow-lg"><Triangle className="text-white w-4 h-4 -rotate-45" /></div>
               <div className="w-10 h-10 gold-gradient rounded-lg -rotate-12 flex items-center justify-center shadow-lg"><Triangle className="text-white w-5 h-5 rotate-12" /></div>
               <div className="w-8 h-8 gold-gradient rounded-lg rotate-12 flex items-center justify-center shadow-lg"><Triangle className="text-white w-4 h-4 -rotate-12" /></div>
             </div>
          </div>
        ) : (
          transcriptions.map((m, idx) => (
            <div key={idx} className={`flex flex-col max-w-[85%] ${m.sender === 'user' ? 'ml-auto items-end' : 'mr-auto items-start animate-bounce-subtle'}`}>
              <div className={`p-5 rounded-[2.5rem] shadow-lg text-sm font-black tracking-tight leading-relaxed border-4 ${m.sender === 'user' ? 'bg-brown-800 text-white border-brown-900 rounded-tr-none' : 'bg-white text-brown-800 border-yellow-400 rounded-tl-none'}`}>
                {m.text}
              </div>
              <div className="flex items-center gap-2 mt-2 px-2">
                <button onClick={() => handleReadAloud(m.text)} className={`p-3 rounded-2xl bubbly-button ${readingText === m.text ? 'bg-yellow-400 text-white' : 'bg-white text-yellow-600 border-2 border-yellow-200 shadow-sm'}`}>
                  {readingText === m.text ? <Loader2 className="w-4 h-4 animate-spin" /> : <Volume2 className="w-4 h-4" />}
                </button>
                <button onClick={() => { navigator.share({text: m.text}); }} className="p-3 bg-white text-teal-600 border-2 border-teal-200 rounded-2xl shadow-sm bubbly-button"><Share2 className="w-4 h-4" /></button>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{m.sender === 'user' ? 'YOU' : 'CLEO'}</span>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Cute Floating Controls */}
      <div className="fixed bottom-[6rem] left-0 right-0 max-w-md mx-auto px-6 z-40 pointer-events-none">
        <div className="pointer-events-auto bg-white/95 backdrop-blur-xl border-8 border-yellow-400 rounded-[3.5rem] p-8 shadow-2xl overflow-hidden relative">
          <div className="absolute top-0 left-0 w-full h-2 gold-gradient opacity-50" />
          
          <div className="flex justify-center gap-8 mb-6">
            <button onClick={() => { stopSession(); setMode('voice'); }} className={`flex flex-col items-center gap-1 transition-all ${mode === 'voice' ? 'text-yellow-600 scale-110' : 'text-slate-300'}`}>
              <Mic className="w-6 h-6" /><span className="text-[10px] font-black uppercase tracking-tighter">VOICE</span>
            </button>
            <button onClick={() => { stopSession(); setMode('text'); }} className={`flex flex-col items-center gap-1 transition-all ${mode === 'text' ? 'text-yellow-600 scale-110' : 'text-slate-300'}`}>
              <Keyboard className="w-6 h-6" /><span className="text-[10px] font-black uppercase tracking-tighter">TYPE</span>
            </button>
          </div>

          {mode === 'voice' ? (
            <div className="flex flex-col items-center gap-4">
              <div className="text-[10px] font-black text-yellow-600 uppercase tracking-[0.2em] mb-1">{isActive ? status : 'Speak Now!'}</div>
              {isActive && (
                <div className="flex items-center gap-1 h-4 w-32 justify-center mb-2">
                  {[1, 2, 3, 4, 5, 6, 7].map(i => <div key={i} className="w-1.5 bg-yellow-400 rounded-full transition-all duration-75" style={{ height: `${Math.max(10, micLevel * 500 * (1 - Math.abs(i-4)/4))}%` }} />)}
                </div>
              )}
              <button onClick={isActive ? stopSession : startSession} className={`w-20 h-20 rounded-full flex items-center justify-center shadow-xl bubbly-button border-4 ${isActive ? 'bg-red-500 border-red-700' : 'gold-gradient border-yellow-600'}`}>
                {isActive ? <MicOff className="text-white w-8 h-8" /> : <Mic className="text-white w-8 h-8" />}
              </button>
            </div>
          ) : (
            <form onSubmit={handleTextTranslate} className="relative">
              <input value={inputText} onChange={e => setInputText(e.target.value)} placeholder="Type English or Masri..." className="w-full bg-slate-100 border-4 border-slate-200 rounded-[2.5rem] py-5 px-8 text-sm font-black outline-none focus:border-yellow-400 transition-all" />
              <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 w-12 h-12 gold-gradient text-white rounded-[1.5rem] flex items-center justify-center shadow-lg bubbly-button"><Send className="w-5 h-5" /></button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default LiveTranslator;
