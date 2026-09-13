import React, { useState, useRef, useEffect, DragEvent, ChangeEvent } from 'react';
import { Camera, Upload, CheckCircle2, X, RefreshCw, UserCheck } from 'lucide-react';
import { LiveCaptureModal } from './LiveCaptureModal';

interface UserImageIntakeProps {
  file: File | null;
  onFileSelect: (file: File | null) => void;
  title?: string;
  subtitle?: string;
}

export const UserImageIntake: React.FC<UserImageIntakeProps> = ({
  file,
  onFileSelect,
  title = 'Step 3: Biometric Live Capture',
  subtitle = 'Powers Module 4 (1:1 Face Verification)',
}) => {
  const [isLiveModalOpen, setIsLiveModalOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      return () => {
        URL.revokeObjectURL(url);
      };
    } else {
      setPreviewUrl(null);
    }
  }, [file]);

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = (selectedFile: File) => {
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(selectedFile.type)) {
      alert('Please select a valid image file (JPG, PNG, or WEBP).');
      return;
    }
    onFileSelect(selectedFile);
  };

  const handleClear = () => {
    onFileSelect(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="space-y-2.5">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileInput}
        className="hidden"
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-text-primary uppercase tracking-wider font-mono">
            {title}
          </label>
          <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-stone-100 dark:bg-stone-800 text-text-secondary border border-border">
            Optional
          </span>
        </div>
        <span className="text-[11px] text-text-secondary">
          {subtitle}
        </span>
      </div>

      {/* Card container */}
      <div
        onDragOver={!file ? handleDragOver : undefined}
        onDragLeave={!file ? handleDragLeave : undefined}
        onDrop={!file ? handleDrop : undefined}
        className={`bg-surface rounded-card border transition-all p-4 shadow-xs ${
          isDragging
            ? 'border-stone-900 dark:border-white bg-stone-100/75 dark:bg-stone-800/60'
            : 'border-border'
        }`}
      >
        {!file ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-control bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-stone-600 dark:text-stone-300 shrink-0">
                <UserCheck size={20} />
              </div>
              <div>
                <div className="text-xs font-semibold text-text-primary">
                  Subject Live Photo / Biometric Verification
                </div>
                <p className="text-xs text-text-secondary mt-0.5 max-w-md leading-relaxed">
                  Provide an applicant face photo to run 1:1 cosine facial matching against the document portrait. Upload an image file or capture live with your camera.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
              {/* Option A: Upload user image */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-primary bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 rounded-control border border-border transition-colors justify-center"
              >
                <Upload size={14} />
                <span>Upload Photo</span>
              </button>

              {/* Option B: Capture live photo */}
              <button
                type="button"
                onClick={() => setIsLiveModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-primary bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 rounded-control border border-border transition-colors justify-center"
              >
                <Camera size={14} />
                <span>Take Photo</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              {/* Preview Thumbnail */}
              <div className="w-14 h-14 rounded-control bg-stone-100 dark:bg-stone-800 border border-border overflow-hidden shrink-0 flex items-center justify-center">
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="Subject Reference Face"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Camera size={20} className="text-stone-400" />
                )}
              </div>

              {/* Details */}
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-text-primary truncate">
                    {file.name}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800 shrink-0">
                    <CheckCircle2 size={11} />
                    <span>Ready</span>
                  </span>
                </div>
                <p className="text-[11px] text-text-secondary font-mono mt-0.5">
                  {formatFileSize(file.size)} • Biometric Reference Attached
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 sm:shrink-0">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-text-secondary hover:text-text-primary bg-stone-50 dark:bg-stone-800/80 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-control border border-border transition-colors"
                title="Choose different image file"
              >
                <Upload size={12} />
                <span>Upload New</span>
              </button>

              <button
                type="button"
                onClick={() => setIsLiveModalOpen(true)}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-text-secondary hover:text-text-primary bg-stone-50 dark:bg-stone-800/80 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-control border border-border transition-colors"
                title="Retake photo using webcam"
              >
                <RefreshCw size={12} />
                <span>Retake</span>
              </button>

              <button
                type="button"
                onClick={handleClear}
                className="p-1.5 text-stone-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-control transition-colors"
                title="Remove photo"
              >
                <X size={15} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Live Webcam Modal */}
      <LiveCaptureModal
        isOpen={isLiveModalOpen}
        onClose={() => setIsLiveModalOpen(false)}
        onCapture={(capturedFile) => onFileSelect(capturedFile)}
      />
    </div>
  );
};
