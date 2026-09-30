import { useState, useRef, type FormEvent, type ChangeEvent } from 'react';
import {
  X,
  Upload,
  Image as ImageIcon,
  AlertTriangle,
  Calendar,
  Layers,
  Tag,
  FileText,
  Link as LinkIcon,
  Check,
} from 'lucide-react';
import { photoCategories, type PhotoCategory, type Phase } from '@/data/projects';
import { todayIso } from '@/lib/date';

interface PhotoUploadDialogProps {
  projectId: string;
  projectName: string;
  stages: Phase[];
  existingPhotoUrl?: string;
  onClose: () => void;
  onUpload: (data: {
    fileData?: string;
    fileName?: string;
    url?: string;
    caption: string;
    stage?: string;
    category?: PhotoCategory;
    takenDate?: string;
  }) => Promise<void>;
}

export function PhotoUploadDialog({
  projectId,
  projectName,
  stages,
  existingPhotoUrl,
  onClose,
  onUpload,
}: PhotoUploadDialogProps) {
  const [mode, setMode] = useState<'file' | 'url'>('file');
  const [fileData, setFileData] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [fileSizeText, setFileSizeText] = useState<string>('');
  const [urlInput, setUrlInput] = useState<string>('');
  const [caption, setCaption] = useState<string>('');
  const [stage, setStage] = useState<string>(stages[0]?.name || '');
  const [category, setCategory] = useState<PhotoCategory>('Progress');
  const [takenDate, setTakenDate] = useState<string>(todayIso());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const openFilePicker = () => {
    setMode('file');
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileProcess = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file (JPEG, PNG, WebP).');
      return;
    }
    setError(null);
    setFileName(file.name);
    setFileSizeText(`${Math.round(file.size / 1024)} KB`);

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setFileData(result);
    };
    reader.onerror = () => {
      setError('Failed to read the selected file.');
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileProcess(file);
    }
    // Reset input value so selecting the same file again triggers onChange
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileProcess(file);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (mode === 'file' && !fileData) {
      setError('Please select an image file to upload.');
      return;
    }
    if (mode === 'url' && !urlInput.trim()) {
      setError('Please enter a valid image URL.');
      return;
    }
    if (!caption.trim()) {
      setError('Please enter a caption describing the site progress or area.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onUpload({
        fileData: mode === 'file' ? fileData! : undefined,
        fileName: mode === 'file' ? fileName : undefined,
        url: mode === 'url' ? urlInput.trim() : undefined,
        caption: caption.trim(),
        stage: stage || undefined,
        category,
        takenDate,
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to upload photograph. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-xl rounded-2xl border border-border bg-card shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4 bg-muted/40">
          <div>
            <span className="font-mono text-[10px] uppercase tracking-wider text-[#9a711f]">
              Site Visual Progress
            </span>
            <h2 className="text-[17px] font-bold text-foreground">
              {existingPhotoUrl ? 'Update Site Photograph' : 'Upload Site Photograph'}
            </h2>
            <p className="text-[11px] text-muted-foreground truncate max-w-md">
              {projectName}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-8 place-items-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-5">
          {/* Automatic Deletion Notice Banner */}
          <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-amber-900 text-[11px] leading-relaxed dark:bg-amber-950/30 dark:border-amber-800/60 dark:text-amber-200">
            <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong className="font-semibold">Automatic Cleanup:</strong> Uploading a new site photograph will automatically replace and permanently delete any old photograph on the server disk, ensuring zero storage bloat and displaying only the latest verified progress photo.
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-rose-800 text-[11px] dark:bg-rose-950/30 dark:border-rose-900 dark:text-rose-200">
              {error}
            </div>
          )}

          {/* Mode Switch (File Upload vs URL) */}
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <button
              type="button"
              onClick={openFilePicker}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition ${
                mode === 'file'
                  ? 'bg-[#173e49] text-white shadow-sm'
                  : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              <Upload size={13} />
              Upload from Device
            </button>
            <button
              type="button"
              onClick={() => { setMode('url'); setError(null); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition ${
                mode === 'url'
                  ? 'bg-[#173e49] text-white shadow-sm'
                  : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              <LinkIcon size={13} />
              Image URL / Link
            </button>
          </div>

          {/* Image Input Area */}
          {mode === 'file' ? (
            <div>
              <input
                id="site-photo-file-input"
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp,image/gif,image/*"
                onChange={handleFileChange}
                className="sr-only"
                tabIndex={-1}
              />

              {fileData ? (
                <div className="relative rounded-2xl border border-border bg-muted/20 p-3 flex flex-col items-center gap-3">
                  <div className="relative max-h-52 w-full overflow-hidden rounded-xl bg-black/5 flex items-center justify-center">
                    <img
                      src={fileData}
                      alt="Selected preview"
                      className="max-h-52 w-auto object-contain rounded-lg"
                    />
                  </div>
                  <div className="flex items-center justify-between w-full px-2 text-[11px]">
                    <span className="font-medium text-foreground truncate max-w-[280px]">
                      {fileName}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-muted-foreground">{fileSizeText}</span>
                      <button
                        type="button"
                        onClick={openFilePicker}
                        className="text-[11px] font-bold text-[#9a711f] hover:underline ml-2"
                      >
                        Change photo
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={(e) => {
                    // Only trigger if click wasn't already on the label
                    if ((e.target as HTMLElement).tagName !== 'LABEL' && !(e.target as HTMLElement).closest('label')) {
                      openFilePicker();
                    }
                  }}
                  className={`border-2 border-dashed rounded-2xl p-7 text-center cursor-pointer transition flex flex-col items-center justify-center gap-3 ${
                    dragOver
                      ? 'border-[#9a711f] bg-[#f8f5ec]'
                      : 'border-border/80 hover:border-muted-foreground/50 hover:bg-muted/20'
                  }`}
                >
                  <div className="grid size-12 place-items-center rounded-2xl bg-[#f8f5ec] text-[#9a711f]">
                    <ImageIcon size={22} />
                  </div>
                  <div>
                    <p className="text-[13px] font-bold text-foreground">
                      Choose or drag & drop a site photograph
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Supports JPEG, PNG, WebP from phone camera or computer (up to 50MB)
                    </p>
                  </div>
                  <label
                    htmlFor="site-photo-file-input"
                    className="mt-1 inline-flex items-center gap-2 rounded-xl bg-[#173e49] px-4 py-2.5 text-[11px] font-bold text-white shadow-sm hover:bg-[#205160] transition cursor-pointer active:scale-95"
                  >
                    <Upload size={14} />
                    Browse from Device / Camera
                  </label>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <label className="block">
                <span className="mb-1.5 block text-[11px] font-bold">Image URL</span>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/... or company CDN link"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  className="h-10 w-full rounded-xl border border-border bg-background px-3 text-[12px] outline-none focus:border-[#9a711f]"
                />
              </label>
              {urlInput.trim() && (
                <div className="max-h-44 overflow-hidden rounded-xl border border-border bg-black/5 flex items-center justify-center p-2">
                  <img
                    src={urlInput}
                    alt="Preview"
                    className="max-h-40 object-contain rounded"
                    onError={() => setError('Unable to load image from this URL.')}
                  />
                </div>
              )}
            </div>
          )}

          {/* Caption */}
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-bold flex items-center gap-1.5">
              <FileText size={12} className="text-muted-foreground" />
              Progress Caption / Description <span className="text-rose-500">*</span>
            </span>
            <textarea
              rows={2}
              required
              placeholder="e.g. Main lounge ceiling grid installation completed. Fit-out vendor on schedule."
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className="w-full rounded-xl border border-border bg-background p-3 text-[12px] leading-relaxed outline-none focus:border-[#9a711f]"
            />
          </label>

          {/* Metadata Row: Stage, Category, Date */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Stage */}
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-bold flex items-center gap-1">
                <Layers size={11} className="text-muted-foreground" />
                Project Stage
              </span>
              <select
                value={stage}
                onChange={(e) => setStage(e.target.value)}
                className="h-9 w-full rounded-xl border border-border bg-background px-2.5 text-[11px] outline-none focus:border-[#9a711f]"
              >
                {stages.map((s) => (
                  <option key={s.name} value={s.name}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>

            {/* Category */}
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-bold flex items-center gap-1">
                <Tag size={11} className="text-muted-foreground" />
                Category
              </span>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as PhotoCategory)}
                className="h-9 w-full rounded-xl border border-border bg-background px-2.5 text-[11px] outline-none focus:border-[#9a711f]"
              >
                {photoCategories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>

            {/* Date Taken */}
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-bold flex items-center gap-1">
                <Calendar size={11} className="text-muted-foreground" />
                Date Captured
              </span>
              <input
                type="date"
                value={takenDate}
                onChange={(e) => setTakenDate(e.target.value)}
                className="h-9 w-full rounded-xl border border-border bg-background px-2.5 text-[11px] outline-none focus:border-[#9a711f]"
              />
            </label>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="rounded-xl border border-border px-4 py-2 text-[11px] font-bold text-muted-foreground hover:bg-muted hover:text-foreground transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-xl bg-[#173e49] px-5 py-2 text-[11px] font-bold text-white hover:bg-[#205160] transition flex items-center gap-2 shadow-sm disabled:opacity-50"
            >
              <Upload size={13} />
              {isSubmitting ? 'Uploading & Replacing...' : 'Upload Site Photograph'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
