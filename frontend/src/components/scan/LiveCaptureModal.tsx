import React, { useState, useRef, useEffect } from 'react';
import { Camera, RefreshCw, Check, X, AlertCircle } from 'lucide-react';

interface LiveCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (file: File) => void;
}

export const LiveCaptureModal: React.FC<LiveCaptureModalProps> = ({
  isOpen,
  onClose,
  onCapture,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && !stream) {
      startCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const startCamera = async () => {
    setCameraError(null);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        audio: false,
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: any) {
      setCameraError('Camera access denied or no camera device available.');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  const handleTakeSnapshot = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      setCapturedImage(dataUrl);
      stopCamera();
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
    startCamera();
  };

  const handleConfirm = () => {
    if (!canvasRef.current || !capturedImage) return;

    canvasRef.current.toBlob(
      (blob) => {
        if (blob) {
          const file = new File([blob], `live-face-capture-${Date.now()}.jpg`, {
            type: 'image/jpeg',
          });
          onCapture(file);
          handleClose();
        }
      },
      'image/jpeg',
      0.9
    );
  };

  const handleClose = () => {
    stopCamera();
    setCapturedImage(null);
    setCameraError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-surface rounded-card border border-border w-full max-w-lg shadow-lg overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Camera size={18} className="text-text-primary" />
            <h3 className="text-sm font-semibold text-text-primary">
              Live Subject Face Verification
            </h3>
          </div>
          <button
            onClick={handleClose}
            className="p-1 rounded-control text-text-secondary hover:text-text-primary hover:bg-stone-100 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Viewport Area */}
        <div className="p-4 bg-stone-950 flex flex-col items-center justify-center min-h-[320px] relative">
          <canvas ref={canvasRef} className="hidden" />

          {cameraError ? (
            <div className="text-center p-6 text-stone-300 flex flex-col items-center max-w-xs">
              <AlertCircle size={32} className="text-amber-400 mb-2" />
              <p className="text-xs">{cameraError}</p>
              <button
                onClick={startCamera}
                className="mt-3 px-3 py-1.5 text-xs bg-stone-800 hover:bg-stone-700 text-white rounded-control"
              >
                Retry Camera Connection
              </button>
            </div>
          ) : capturedImage ? (
            <div className="relative w-full h-[280px] flex items-center justify-center">
              <img
                src={capturedImage}
                alt="Captured Subject"
                className="max-h-full max-w-full rounded-control object-contain border border-stone-800"
              />
              <div className="absolute top-3 left-3 bg-stone-900/80 text-white text-[10px] font-mono px-2 py-0.5 rounded border border-stone-700">
                FRAME SNAPSHOT READY
              </div>
            </div>
          ) : (
            <div className="relative w-full h-[280px] flex items-center justify-center">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover rounded-control"
              />
              {/* Face Guide Reticle */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-44 h-56 border-2 border-stone-300/40 border-dashed rounded-full flex items-center justify-center">
                  <span className="text-[10px] text-stone-300/60 font-mono tracking-wider">
                    ALIGN FACE
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="p-4 border-t border-border bg-stone-50 flex items-center justify-between">
          <div className="text-[11px] text-text-secondary">
            Optional: used for 1:1 facial biometric matching against document portrait.
          </div>

          <div className="flex items-center gap-2">
            {capturedImage ? (
              <>
                <button
                  type="button"
                  onClick={handleRetake}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-secondary hover:text-text-primary bg-surface border border-border rounded-control transition-colors"
                >
                  <RefreshCw size={13} />
                  <span>Retake</span>
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-stone-900 hover:bg-stone-800 rounded-control transition-colors shadow-xs"
                >
                  <Check size={14} />
                  <span>Attach to Scan</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                disabled={!!cameraError}
                onClick={handleTakeSnapshot}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-stone-900 hover:bg-stone-800 disabled:opacity-50 rounded-control transition-colors shadow-xs"
              >
                <Camera size={14} />
                <span>Capture Snapshot</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
