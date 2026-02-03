import React, { useState, useEffect } from 'react';
import Camera from './components/Camera';
import { AppState, HairstyleOption, HairColor, FaceAnalysis, TransformationResult } from './types';
import { HAIRSTYLES, HAIR_COLORS, SCANNING_MESSAGES } from './constants';
import { analyzeFace, transformHairstyle } from './services/geminiService';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<FaceAnalysis | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<HairstyleOption | null>(null);
  const [selectedColor, setSelectedColor] = useState<HairColor>(HAIR_COLORS[0]);
  const [result, setResult] = useState<TransformationResult | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (appState === AppState.ANALYZING || appState === AppState.TRANSFORMING) {
      setProgress(10);
      const interval = setInterval(() => {
        setProgress(p => Math.min(p + (p > 80 ? 0.5 : 5), 95));
      }, 150);
      return () => clearInterval(interval);
    } else {
      setProgress(0);
    }
  }, [appState]);

  const handleStartScan = () => {
    setErrorMessage(null);
    setAppState(AppState.SCANNING);
  };

  const handleCapture = async (base64: string) => {
    setCapturedImage(base64);
    setAppState(AppState.ANALYZING);
    setStatusMessage("AI Analyzing Geometry...");
    try {
      const res = await analyzeFace(base64);
      setAnalysis(res);
      setAppState(AppState.READY);
    } catch (err: any) {
      console.error("Analysis error:", err);
      setErrorMessage(err.message || "Failed to analyze face. Check API Key.");
      setAppState(AppState.IDLE);
    }
  };

  const handleApplyTransformation = async (style: HairstyleOption, color: HairColor) => {
    if (!capturedImage) return;
    setErrorMessage(null);
    setSelectedStyle(style);
    setSelectedColor(color);
    setAppState(AppState.TRANSFORMING);
    setStatusMessage(`Applying ${color.name} ${style.name}...`);
    try {
      const transformedImage = await transformHairstyle(capturedImage, style.prompt, color.prompt);
      setResult({ originalImage: `data:image/jpeg;base64,${capturedImage}`, transformedImage, style, color });
      setAppState(AppState.RESULT);
    } catch (err: any) {
      console.error("Transformation error:", err);
      setErrorMessage(err.message || "AI Transformation failed.");
      setAppState(AppState.READY);
    }
  };

  const handleReset = () => {
    setAppState(AppState.IDLE);
    setCapturedImage(null);
    setAnalysis(null);
    setSelectedStyle(null);
    setSelectedColor(HAIR_COLORS[0]);
    setResult(null);
    setErrorMessage(null);
  };

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-black font-sans select-none">
      <div className="absolute inset-0 z-0">
        {appState === AppState.RESULT && result ? (
          <img src={result.transformedImage} className="w-full h-full object-cover" alt="Result" />
        ) : (
          <Camera appState={appState} onCapture={handleCapture} />
        )}
      </div>

      <div className="absolute top-0 left-0 w-full safe-pt p-6 z-20 flex justify-between items-start pointer-events-none">
        <button onClick={handleReset} className="pointer-events-auto w-12 h-12 rounded-full bg-black/30 backdrop-blur-xl flex items-center justify-center text-white border border-white/10">
          <i className={`fas ${appState === AppState.IDLE ? 'fa-cog' : 'fa-chevron-left'}`}></i>
        </button>
        {appState !== AppState.IDLE && (
          <div className="bg-black/60 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/10 text-[9px] font-black uppercase tracking-widest">{appState}</div>
        )}
      </div>

      {errorMessage && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 z-50 bg-red-500/90 backdrop-blur-md text-white px-6 py-3 rounded-2xl text-xs font-bold shadow-2xl border border-white/20 text-center w-[80%]">
          <i className="fas fa-exclamation-circle mr-2"></i>
          {errorMessage}
        </div>
      )}

      {(appState === AppState.ANALYZING || appState === AppState.TRANSFORMING) && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm px-10">
          <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden mb-6">
            <div className="bg-blue-500 h-full transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
          <p className="text-white font-bold tracking-tight text-center uppercase text-sm tracking-[0.2em]">{statusMessage}</p>
        </div>
      )}

      <div className="absolute bottom-0 left-0 w-full z-40 snapchat-gradient safe-pb pb-8 pt-24 px-4 pointer-events-none">
        <div className="pointer-events-auto w-full">
          {appState === AppState.IDLE && (
            <div className="flex flex-col items-center gap-10">
              <div className="text-center">
                <h1 className="text-3xl font-black mb-1">Raza Saloon AI</h1>
                <p className="text-white/60 text-xs tracking-widest uppercase">Professional Real-time Preview</p>
              </div>
              <button onClick={handleStartScan} className="w-24 h-24 rounded-full bg-white shadow-2xl flex items-center justify-center active:scale-90 transition-transform">
                 <div className="w-[88%] h-[88%] rounded-full border-4 border-black/5" />
              </button>
              <div className="flex gap-10 text-white/40 text-[10px] font-black uppercase tracking-widest">
                <span className="text-white">Studio</span><span>Discover</span><span>Salon</span>
              </div>
            </div>
          )}

          {(appState === AppState.READY || appState === AppState.RESULT) && analysis && (
            <div className="space-y-6">
              <div className="flex gap-2 overflow-x-auto no-scrollbar px-2">
                <div className="flex-shrink-0 bg-blue-600 px-4 py-1.5 rounded-full text-[9px] font-black uppercase">{analysis.faceShape}</div>
                {analysis.recommendations.slice(0, 2).map((rec, i) => (
                  <div key={i} className="flex-shrink-0 bg-white/10 px-4 py-1.5 rounded-full text-[9px] font-black uppercase">{rec}</div>
                ))}
              </div>

              {/* Color Picker */}
              <div className="flex flex-col gap-2">
                <span className="text-[8px] font-black uppercase tracking-[0.2em] text-white/50 px-2">Select Hair Color</span>
                <div className="flex gap-3 overflow-x-auto no-scrollbar px-2 py-1">
                  {HAIR_COLORS.map((color) => (
                    <button
                      key={color.id}
                      onClick={() => {
                        setSelectedColor(color);
                        if (selectedStyle) handleApplyTransformation(selectedStyle, color);
                      }}
                      className={`flex-shrink-0 w-8 h-8 rounded-full border-2 transition-all ${selectedColor.id === color.id ? 'border-white scale-110' : 'border-white/20'}`}
                      style={{ backgroundColor: color.hex }}
                    >
                      {selectedColor.id === color.id && <div className="w-full h-full flex items-center justify-center"><i className="fas fa-check text-[10px] text-white mix-blend-difference"></i></div>}
                    </button>
                  ))}
                </div>
              </div>

              {/* Hairstyle Picker */}
              <div className="flex flex-col gap-2">
                <span className="text-[8px] font-black uppercase tracking-[0.2em] text-white/50 px-2">Select Hairstyle</span>
                <div className="flex gap-4 overflow-x-auto no-scrollbar py-2 px-2">
                  {HAIRSTYLES.map((style) => (
                    <button 
                      key={style.id} 
                      onClick={() => handleApplyTransformation(style, selectedColor)} 
                      className={`flex-shrink-0 flex flex-col items-center gap-2 transition-all ${selectedStyle?.id === style.id ? 'scale-105 opacity-100' : 'opacity-40 hover:opacity-70'}`}
                    >
                      <div className={`w-14 h-14 rounded-full flex items-center justify-center border-2 transition-all ${selectedStyle?.id === style.id ? 'bg-blue-600 border-white shadow-[0_0_15px_rgba(59,130,246,0.5)]' : 'bg-white/10 border-white/10'}`}>
                        <i className={`fas ${style.icon} text-lg`}></i>
                      </div>
                      <span className="text-[8px] font-black uppercase tracking-widest">{style.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-between items-center px-4">
                 <button className="flex flex-col items-center gap-1 opacity-60"><i className="fas fa-download"></i><span className="text-[8px] font-black uppercase">Save</span></button>
                 <button onClick={handleReset} className="bg-yellow-400 text-black px-8 py-3 rounded-full font-black text-[10px] uppercase tracking-widest shadow-xl">Reset</button>
                 <button className="flex flex-col items-center gap-1 text-blue-400"><i className="fab fa-snapchat-ghost"></i><span className="text-[8px] font-black uppercase">Send</span></button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;