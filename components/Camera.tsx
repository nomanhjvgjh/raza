
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
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError("Your browser does not support camera access.");
      return;
    }

    try {
      const constraintSets: MediaStreamConstraints[] = [
        { video: { facingMode: 'user', width: { ideal: 720 }, height: { ideal: 1280 } }, audio: false },
        { video: { facingMode: 'user' }, audio: false },
        { video: true, audio: false }
      ];

      for (const constraints of constraintSets) {
        try {
          const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
          if (videoRef.current) {
            videoRef.current.srcObject = mediaStream;
            await new Promise((resolve) => {
              if (videoRef.current) videoRef.current.onloadedmetadata = resolve;
              else resolve(null);
            });
          }
          setStream(mediaStream);
          return;
        } catch (err) {
          console.warn("Retrying camera...", err);
        }
      }
      setError("Could not access camera.");
    } catch (err: any) {
      setError(err.message || "Camera error.");
    }
  }, []);

  useEffect(() => {
    enableCamera();
    return () => {
      if (stream) stream.getTracks().forEach(track => track.stop());
    };
  }, [enableCamera]);

  const captureFrame = useCallback(() => {
    if (videoRef.current && canvasRef.current && stream) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      canvas.width = video.videoWidth || 720;
      canvas.height = video.videoHeight || 1280;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7); // Slightly lower quality for faster upload
        onCapture(dataUrl.split(',')[1]);
      }
    }
  }, [onCapture, stream]);

  useEffect(() => {
    if (appState === AppState.SCANNING && stream) {
      const timer = setTimeout(() => {
        captureFrame();
      }, 1500); // Reduced from 3000ms to 1500ms
      return () => clearTimeout(timer);
    }
  }, [appState, captureFrame, stream]);

  return (
    <div className={`relative w-full h-full overflow-hidden bg-black ${className}`}>
      {error ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center z-50 bg-black">
          <i className="fas fa-video-slash text-red-500 text-3xl mb-4"></i>
          <p className="text-gray-400 text-sm mb-6">{error}</p>
          <button onClick={() => enableCamera()} className="px-8 py-3 bg-white text-black rounded-full font-bold text-xs uppercase">Retry</button>
        </div>
      ) : (
        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
      )}
      <canvas ref={canvasRef} className="hidden" />
      {appState === AppState.SCANNING && stream && (
        <>
          <div className="scan-line" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-[75%] aspect-[3/4] border-2 border-white/30 rounded-[3rem] animate-pulse" />
          </div>
        </>
      )}
    </div>
  );
};

export default Camera;
