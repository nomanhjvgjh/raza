
import React, { useState, useEffect } from 'react';
import Camera from './components/Camera';
import { AppState, HairstyleOption, HairColor, FaceAnalysis, TransformationResult } from './types';
import { HAIRSTYLES, HAIR_COLORS } from './constants';
import { analyzeFace, transformHairstyle } from './services/geminiService';

const App: React.FC = () => {
  const [hasKey, setHasKey] = useState<boolean>(true);
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<FaceAnalysis | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<HairstyleOption | null>(null);
  const [selectedColor, setSelectedColor] = useState<HairColor>(HAIR_COLORS[0]);
  const [result, setResult] = useState<TransformationResult | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  // Check for API key on mount - required for Gemini 3 models
  useEffect(() => {
    const checkApiKey = async () => {
      // Use type assertion to avoid conflicts with existing Window declarations
      const aistudio = (window as any).aistudio;
      if (aistudio && typeof aistudio.hasSelectedApiKey === 'function') {
        const selected = await aistudio.hasSelectedApiKey();
        setHasKey(selected);
      }
    };
    checkApiKey();
  }, []);

  const handleOpenKeySelector = async () => {
    const aistudio = (window as any).aistudio;
    if (aistudio && typeof aistudio.openSelectKey === 'function') {
      await aistudio.openSelectKey();
      // MUST assume the key selection was successful after triggering openSelectKey()
      // to mitigate potential race conditions.
      setHasKey(true);
    }
  };

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
    setStatusMessage("Scanning Face Geometry...");
    try {
      const res = await analyzeFace(base64);
      setAnalysis(res);
      setAppState(AppState.READY);
    } catch (err: any) {
      console.error("Analysis error:", err);
      // If the request fails with this message, reset the key selection state.
      if (err.message?.includes("Requested entity was not found")) {
        setHasKey(false);
      }
      setErrorMessage(err.message || "Face analysis failed.");
      setAppState(AppState.IDLE);
    }
  };

  const handleApplyTransformation = async (style: HairstyleOption, color: HairColor) => {
    if (!capturedImage) return;
    setErrorMessage(null);
    setSelectedStyle(style);
    setSelectedColor(color);
    setAppState(AppState.TRANSFORMING);
    setStatusMessage(`Rendering ${style.name}...`);
    try {
      const transformedImage = await transformHairstyle(capturedImage, style.prompt, color.prompt);
      setResult({ originalImage: `data:image/jpeg;base64,${capturedImage}`, transformedImage, style, color });
      setAppState(AppState.RESULT);
    } catch (err: any) {
      console.error("Transformation error:", err);
      // If the request fails with this message, reset the key selection state.
      if (err.message?.includes("Requested entity was not found")) {
        setHasKey(false);
      }
      setErrorMessage(err.message || "AI Rendering failed. Try another style.");
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

  if (!hasKey) {
    return (
      <div className="h-[100dvh] w-full flex flex-col items-center justify-center bg-black p-8 text-center">
        <div className="w-20 h-20 rounded-3xl bg-blue-600 flex items-center justify-center mb-8 shadow-[0_0_50px_rgba(37,99,235,0.4)]">
          <i className="fas fa-key text-3xl text-white"></i>
        </div>
        <h1 className="text-2xl font-black mb-4 uppercase tracking-tighter italic">Pro AI Engine</h1>
        <p className="text-gray-400 text-sm mb-10 max-w-xs leading-relaxed">
          High-quality real-time hairstyle generation requires a connected Gemini Pro account.
          <br /><br />
          <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" className="text-blue-500 font-bold underline underline-offset-4">Check Billing Setup</a>
        </p>
        <button 
          onClick={handleOpenKeySelector}
          className="w-full max-w-xs py-4 bg-white text-black rounded-2xl font-black text-xs uppercase tracking-[0.2em] active:scale-95 transition-transform"
        >
          Connect API Key
        </button>
      </div>
    );
  }

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-black font-sans select-none">
      <div className="absolute inset-0 z-0">
        {appState === AppState.RESULT && result ? (
          <img src={result.transformedImage} className="w-full h-full object-cover" alt="Transformed Result" />
        ) : (
          <Camera appState={appState} onCapture={handleCapture} />
        )}
      </div>

      {/* Top Navigation */}
      <div className="absolute top-0 left-0 w-full safe-pt p-6 z-20 flex justify-between items-start">
        <button onClick={handleReset} className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-xl flex items-center justify-center text-white border border-white/10 active:scale-90 transition-transform">
          <i className={`fas ${appState === AppState.IDLE ? 'fa-cog' : 'fa-chevron-left'}`}></i>
        </button>
        {appState !== AppState.IDLE && (
          <div className="bg-white/10 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/10 text-[9px] font-black uppercase tracking-[0.2em] pointer-events-none">
            {appState}
          </div>
        )}
      </div>

      {/* Error Notifications */}
      {errorMessage && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 z-50 bg-red-500/90 backdrop-blur-md text-white px-6 py-4 rounded-3xl text-xs font-bold shadow-2xl border border-white/20 text-center w-[85%] animate-bounce">
          <i className="fas fa-exclamation-triangle mr-3"></i>
          {errorMessage}
        </div>
      )}

      {/* Processing HUD */}
      {(appState === AppState.ANALYZING || appState === AppState.TRANSFORMING) && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm px-12">
          <div className="w-full bg-white/10 h-1 rounded-full overflow-hidden mb-6">
            <div className="bg-blue-500 h-full transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
          <p className="text-white font-black tracking-[0.3em] text-center uppercase text-[10px]">{statusMessage}</p>
        </div>
      )}

      {/* Bottom Interface */}
      <div className="absolute bottom-0 left-0 w-full z-40 snapchat-gradient safe-pb pb-8 pt-32 px-4 pointer-events-none">
        <div className="pointer-events-auto w-full">
          {appState === AppState.IDLE && (
            <div className="flex flex-col items-center gap-12">
              <div className="text-center">
                <h1 className="text-3xl font-black mb-1 italic tracking-tighter uppercase">Raza Saloon AI</h1>
                <p className="text-white/40 text-[9px] tracking-[0.4em] uppercase font-bold">The Future of Styling</p>
              </div>
              <button onClick={handleStartScan} className="w-22 h-22 rounded-full border-[6px] border-white/20 p-2 active:scale-90 transition-transform">
                 <div className="w-full h-full rounded-full bg-white shadow-[0_0_30px_rgba(255,255,255,0.4)]" />
              </button>
              <div className="flex gap-12 text-white/30 text-[9px] font-black uppercase tracking-[0.2em]">
                <span className="text-white border-b border-white pb-1">Filter</span><span>Presets</span><span>History</span>
              </div>
            </div>
          )}

          {(appState === AppState.READY || appState === AppState.RESULT) && analysis && (
            <div className="space-y-6">
              <div className="flex gap-2 overflow-x-auto no-scrollbar px-2">
                <div className="flex-shrink-0 bg-blue-600 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest">{analysis.faceShape} Face</div>
                <div className="flex-shrink-0 bg-white/10 backdrop-blur-md px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border border-white/5">{analysis.hairDensity} Hair</div>
              </div>

              {/* Color Tones */}
              <div className="flex flex-col gap-3">
                <span className="text-[8px] font-black uppercase tracking-[0.3em] text-white/40 px-2">Premium Color Tones</span>
                <div className="flex gap-4 overflow-x-auto no-scrollbar px-2 py-1">
                  {HAIR_COLORS.map((color) => (
                    <button
                      key={color.id}
                      onClick={() => {
                        setSelectedColor(color);
                        if (selectedStyle) handleApplyTransformation(selectedStyle, color);
                      }}
                      className={`flex-shrink-0 w-9 h-9 rounded-full border-2 transition-all relative ${selectedColor.id === color.id ? 'border-white scale-110' : 'border-white/10 opacity-60'}`}
                      style={{ backgroundColor: color.hex }}
                    >
                      {selectedColor.id === color.id && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-white rounded-full flex items-center justify-center">
                          <i className="fas fa-check text-[8px] text-black"></i>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Styles Carousel */}
              <div className="flex flex-col gap-3">
                <span className="text-[8px] font-black uppercase tracking-[0.3em] text-white/40 px-2">Professional Styles</span>
                <div className="flex gap-5 overflow-x-auto no-scrollbar py-2 px-2">
                  {HAIRSTYLES.map((style) => (
                    <button 
                      key={style.id} 
                      onClick={() => handleApplyTransformation(style, selectedColor)} 
                      className={`flex-shrink-0 flex flex-col items-center gap-3 transition-all ${selectedStyle?.id === style.id ? 'scale-110' : 'opacity-40'}`}
                    >
                      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center border-2 transition-all ${selectedStyle?.id === style.id ? 'bg-blue-600 border-white shadow-[0_0_20px_rgba(37,99,235,0.6)]' : 'bg-white/5 border-white/5'}`}>
                        <i className={`fas ${style.icon} text-xl`}></i>
                      </div>
                      <span className="text-[8px] font-black uppercase tracking-[0.1em]">{style.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Bar */}
              <div className="flex justify-between items-center px-6 pt-4">
                 <button className="flex flex-col items-center gap-2 opacity-50 active:scale-90 transition-transform">
                   <i className="fas fa-cloud-arrow-down text-lg"></i>
                   <span className="text-[7px] font-black uppercase tracking-widest">Store</span>
                 </button>
                 <button onClick={handleReset} className="bg-white text-black px-10 py-4 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] shadow-2xl active:scale-95 transition-transform">
                   Retake Photo
                 </button>
                 <button className="flex flex-col items-center gap-2 text-blue-500 active:scale-90 transition-transform">
                   <i className="fab fa-snapchat-ghost text-xl"></i>
                   <span className="text-[7px] font-black uppercase tracking-widest">Send</span>
                 </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;
