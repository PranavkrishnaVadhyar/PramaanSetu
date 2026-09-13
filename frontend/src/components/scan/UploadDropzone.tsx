import React, { useState, useRef, DragEvent, ChangeEvent } from 'react';
import { Upload, FileImage, X, CheckCircle2 } from 'lucide-react';

interface UploadDropzoneProps {
  file: File | null;
  onFileSelect: (file: File | null) => void;
  documentType: string;
}

export const UploadDropzone: React.FC<UploadDropzoneProps> = ({
  file,
  onFileSelect,
  documentType,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
    // Verify file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(selectedFile.type)) {
      alert('Please upload a valid image file (JPG, PNG, or WEBP).');
      return;
    }

    onFileSelect(selectedFile);
    const objectUrl = URL.createObjectURL(selectedFile);
    setPreviewUrl(objectUrl);
  };

  const handleClear = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    onFileSelect(null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="w-full">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileInput}
        className="hidden"
      />

      {!file ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-card p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
            isDragging
              ? 'border-stone-900 dark:border-white bg-stone-100/75 dark:bg-stone-800/60'
              : 'border-border bg-surface hover:border-stone-400 dark:hover:border-stone-600 hover:bg-stone-50/40 dark:hover:bg-stone-800/30'
          }`}
        >
          <div className="w-12 h-12 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 flex items-center justify-center mb-3">
            <Upload size={22} />
          </div>

          <h3 className="text-sm font-medium text-text-primary mb-1">
            Drop high-resolution scan of <span className="uppercase font-semibold">{documentType}</span>
          </h3>
          <p className="text-xs text-text-secondary max-w-sm mb-3">
            Supports JPG, PNG, and WEBP. High DPI scanner or phone captures with legible text &amp; barcodes.
          </p>

          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-primary bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 rounded-control border border-border transition-colors">
            <FileImage size={14} />
            <span>Select Image File</span>
          </span>
        </div>
      ) : (
        <div className="bg-surface rounded-card border border-border p-4 shadow-xs">
          <div className="flex flex-col sm:flex-row items-start gap-4">
            {/* Thumbnail Preview */}
            <div className="w-full sm:w-48 h-32 bg-stone-100 dark:bg-stone-800 rounded-control border border-border overflow-hidden shrink-0 flex items-center justify-center relative group">
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Document preview"
                  className="w-full h-full object-contain"
                />
              ) : (
                <FileImage size={32} className="text-stone-400" />
              )}
            </div>

            {/* Metadata and Controls */}
            <div className="flex-1 w-full flex flex-col justify-between self-stretch">
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 size={16} className="text-emerald-700 dark:text-emerald-400 shrink-0" />
                      <h4 className="text-sm font-semibold text-text-primary truncate max-w-xs md:max-w-md">
                        {file.name}
                      </h4>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-text-secondary font-mono mt-1">
                      <span>{formatFileSize(file.size)}</span>
                      <span>•</span>
                      <span className="uppercase">{file.type.split('/')[1]}</span>
                      <span>•</span>
                      <span className="capitalize">{documentType} Selected</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleClear}
                    className="p-1.5 rounded-control text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                    title="Remove file"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="mt-3 p-2.5 rounded-control bg-stone-50 dark:bg-stone-900/50 border border-border text-xs text-text-secondary">
                  Ready for OCR text extraction, ELA compression analysis, and checksum parsing.
                </div>
              </div>

              <div className="mt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="px-2.5 py-1 text-xs font-medium text-text-secondary hover:text-text-primary transition-colors"
                >
                  Replace with different image
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
