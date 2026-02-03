
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { AppState } from '../types';

interface CameraProps {
  appState: AppState;
  onCapture: (base64: string) => void;
  className?: string;
}

const Camera: React.FC<CameraProps> = ({ appState, onCapture, className }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);

  const enableCamera = useCallback(async () => {
    setError(null);

    // 1. Check for Secure Context
    if (!window.isSecureContext) {
      setError("Camera access requires a secure (HTTPS) connection. Please check your URL.");
      return;
    }

    // 2. Check for API support
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError("Your browser does not support camera access.");
      return;
    }

    // 3. Define fallback constraints in order of preference
    const constraintsToTry: MediaStreamConstraints[] = [
      { 
        video: { 
          facingMode: 'user', 
          width: { ideal: 720 }, 
          height: { ideal: 1280 } 
        }, 
        audio: false 
      },
      { 
        video: { facingMode: 'user' }, 
        audio: false 
      },
      { 
        video: true, // Most basic fallback: any video
        audio: false 
      }
    ];

    let lastError: any = null;
    let successfulStream: MediaStream | null = null;

    try {
      // Try to get a list of devices first to see if any video inputs exist
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      
      if (videoDevices.length === 0) {
        setError("No camera device found. Please connect a camera and try again.");
        return;
      }

      for (const constraints of constraintsToTry) {
        try {
          successfulStream = await navigator.mediaDevices.getUserMedia(constraints);
          if (successfulStream) break;
        } catch (err) {
          console.warn("Camera attempt failed with constraints:", constraints, err);
          lastError = err;
        }
      }

      if (successfulStream) {
        if (videoRef.current) {
          videoRef.current.srcObject = successfulStream;
          // Ensure the video plays
          try {
            await videoRef.current.play();
          } catch (playErr) {
            console.error("Video play failed:", playErr);
          }
        }
        setStream(successfulStream);
      } else {
        throw lastError || new Error("All attempts to access camera failed.");
      }
    } catch (err: any) {
      console.error("Final camera access error:", err);
      if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setError("Requested camera not found. Please ensure your camera is connected and not in use by another app.");
      } else if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError("Camera permission denied. Please enable camera access in your browser settings.");
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        setError("Camera is already in use by another application or tab.");
      } else {
        setError(`Camera error: ${err.message || 'Unknown error occurred'}`);
      }
    }
  }, []);

  useEffect(() => {
    enableCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [enableCamera]);

  const captureFrame = useCallback(() => {
    if (videoRef.current && canvasRef.current && stream) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      
      const width = video.videoWidth || 720;
      const height = video.videoHeight || 1280;
      
      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Mirror the image for user-facing camera feel
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        onCapture(dataUrl.split(',')[1]);
      }
    }
  }, [onCapture, stream]);

  useEffect(() => {
    if (appState === AppState.SCANNING && stream) {
      const timer = setTimeout(() => {
        captureFrame();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [appState, captureFrame, stream]);

  return (
    <div className={`relative w-full h-full overflow-hidden bg-black ${className}`}>
      {error ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center z-50 bg-black">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-6">
            <i className="fas fa-video-slash text-red-500 text-2xl"></i>
          </div>
          <h2 className="text-lg font-bold mb-2">Camera Access Error</h2>
          <p className="text-gray-400 text-xs mb-8 max-w-[250px] leading-relaxed">{error}</p>
          <button 
            onClick={() => enableCamera()} 
            className="px-10 py-3.5 bg-white text-black rounded-full font-black text-[10px] uppercase tracking-widest active:scale-95 transition-transform shadow-xl"
          >
            Try Again
          </button>
        </div>
      ) : (
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          muted 
          className="w-full h-full object-cover scale-x-[-1]" 
        />
      )}
      <canvas ref={canvasRef} className="hidden" />
      {appState === AppState.SCANNING && stream && !error && (
        <>
          <div className="scan-line" />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-[70%] aspect-[9/16] border-2 border-blue-500/50 rounded-[3rem] animate-pulse shadow-[0_0_30px_rgba(59,130,246,0.3)]">
               <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-blue-500/20 backdrop-blur-md px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest text-blue-400">Position Face</div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Camera;
