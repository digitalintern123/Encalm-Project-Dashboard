import { useState, useRef, type FormEvent, type ChangeEvent } from 'react';
import {
  X,
  Upload,
  Image as ImageIcon,
  Calendar,
  Layers,
  Tag,
  FileText,
  Link as LinkIcon,
  Trash2,
  Plus,
  CheckCircle2,
  Camera,
} from 'lucide-react';
import { photoCategories, type PhotoCategory, type Phase } from '@/data/projects';
import { todayIso } from '@/lib/date';

export type PhotoUploadItem = {
  fileData?: string;
  fileName?: string;
  url?: string;
  caption: string;
  stage?: string;
  category?: PhotoCategory;
  takenDate?: string;
};

interface QueuePhoto {
  id: string;
  fileData?: string;
  fileName: string;
  fileSizeText: string;
  url?: string;
  caption: string;
  stage: string;
  category: PhotoCategory;
  takenDate: string;
}

interface PhotoUploadDialogProps {
  projectId: string;
  projectName: string;
  stages: Phase[];
  existingPhotoUrl?: string;
  onClose: () => void;
  onUpload?: (data: PhotoUploadItem) => Promise<void>;
  onUploadBatch?: (photos: PhotoUploadItem[]) => Promise<void>;
}

export function PhotoUploadDialog({
  projectId,
  projectName,
  stages,
  existingPhotoUrl,
  onClose,
  onUpload,
  onUploadBatch,
}: PhotoUploadDialogProps) {
  const [mode, setMode] = useState<'file' | 'url'>('file');
  const [queue, setQueue] = useState<QueuePhoto[]>([]);
  const [urlInput, setUrlInput] = useState<string>('');
  const [defaultCaption, setDefaultCaption] = useState<string>('');
  const [batchStage, setBatchStage] = useState<string>(stages[0]?.name || '');
  const [batchCategory, setBatchCategory] = useState<PhotoCategory>('Progress');
  const [batchDate, setBatchDate] = useState<string>(todayIso());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgressText, setUploadProgressText] = useState<string>('');
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

  const processFiles = (files: FileList | File[]) => {
    setError(null);
    const validImageFiles: File[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type.startsWith('image/')) {
        validImageFiles.push(file);
      }
    }

    if (validImageFiles.length === 0) {
      setError('Please select valid image files (JPEG, PNG, WebP).');
      return;
    }

    validImageFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        const newQueueItem: QueuePhoto = {
          id: `queue-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          fileData: result,
          fileName: file.name,
          fileSizeText: `${Math.round(file.size / 1024)} KB`,
          caption: defaultCaption || file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '),
          stage: batchStage,
          category: batchCategory,
          takenDate: batchDate,
        };
        setQueue((prev) => [...prev, newQueueItem]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleAddUrl = () => {
    const trimmed = urlInput.trim();
    if (!trimmed) {
      setError('Please enter a valid image URL.');
      return;
    }
    const newQueueItem: QueuePhoto = {
      id: `queue-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      url: trimmed,
      fileName: trimmed.split('/').pop() || 'Remote Image',
      fileSizeText: 'URL Link',
      caption: defaultCaption || 'Site progress photograph',
      stage: batchStage,
      category: batchCategory,
      takenDate: batchDate,
    };
    setQueue((prev) => [...prev, newQueueItem]);
    setUrlInput('');
    setError(null);
  };

  const handleRemoveItem = (id: string) => {
    setQueue((prev) => prev.filter((item) => item.id !== id));
  };

  const handleUpdateItemCaption = (id: string, caption: string) => {
    setQueue((prev) =>
      prev.map((item) => (item.id === id ? { ...item, caption } : item))
    );
  };

  const handleApplyBatchMetadata = () => {
    setQueue((prev) =>
      prev.map((item) => ({
        ...item,
        stage: batchStage,
        category: batchCategory,
        takenDate: batchDate,
        ...(defaultCaption.trim() ? { caption: defaultCaption.trim() } : {}),
      }))
    );
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (queue.length === 0) {
      setError('Please select at least one photograph to upload.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const payload: PhotoUploadItem[] = queue.map((item) => ({
      fileData: item.fileData,
      fileName: item.fileName,
      url: item.url,
      caption: item.caption.trim() || 'Site progress photograph',
      stage: item.stage || undefined,
      category: item.category,
      takenDate: item.takenDate,
    }));

    try {
      if (onUploadBatch) {
        setUploadProgressText(`Uploading ${payload.length} photographs...`);
        await onUploadBatch(payload);
      } else if (onUpload) {
        for (let i = 0; i < payload.length; i++) {
          setUploadProgressText(`Uploading photo ${i + 1} of ${payload.length}...`);
          await onUpload(payload[i]);
        }
      }
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to upload photographs. Please try again.');
      setIsSubmitting(false);
      setUploadProgressText('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl rounded-2xl border border-border bg-card shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4 bg-muted/40 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] uppercase tracking-wider text-[#9a711f] font-bold">
                Site Visual Gallery
              </span>
              <span className="rounded-full bg-[#edf5f0] px-2 py-0.5 font-mono text-[9px] font-bold text-[#2e7c67]">
                Multiple Upload Supported
              </span>
            </div>
            <h2 className="text-[17px] font-bold text-foreground mt-0.5">
              Upload Site Photographs
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
        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-5 flex-1">
          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-rose-800 text-[11px] dark:bg-rose-950/30 dark:border-rose-900 dark:text-rose-200">
              {error}
            </div>
          )}

          {/* Mode Switch (Device vs URL) */}
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
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
                Upload from Device / Camera
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
                Image URL / CDN
              </button>
            </div>

            {queue.length > 0 && (
              <span className="font-mono text-[10px] font-bold text-[#2e7c67]">
                {queue.length} photo{queue.length > 1 ? 's' : ''} queued
              </span>
            )}
          </div>

          {/* Hidden multi-file input */}
          <input
            id="site-photo-multi-input"
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/png,image/jpeg,image/jpg,image/webp,image/gif,image/*"
            onChange={handleFileChange}
            className="sr-only"
            tabIndex={-1}
          />

          {/* Device Upload Drop Zone */}
          {mode === 'file' ? (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={(e) => {
                if ((e.target as HTMLElement).tagName !== 'LABEL' && !(e.target as HTMLElement).closest('label')) {
                  openFilePicker();
                }
              }}
              className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2.5 ${
                dragOver
                  ? 'border-[#9a711f] bg-[#f8f5ec]'
                  : 'border-border/80 hover:border-muted-foreground/50 hover:bg-muted/10'
              }`}
            >
              <div className="grid size-11 place-items-center rounded-2xl bg-[#f8f5ec] text-[#9a711f]">
                <Camera size={20} />
              </div>
              <div>
                <p className="text-[13px] font-bold text-foreground">
                  Select or drop multiple site photographs
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Select 1 or more images (JPEG, PNG, WebP) from your phone camera or computer
                </p>
              </div>
              <label
                htmlFor="site-photo-multi-input"
                className="mt-1 inline-flex items-center gap-2 rounded-xl bg-[#173e49] px-4 py-2 text-[11px] font-bold text-white shadow-sm hover:bg-[#205160] transition cursor-pointer active:scale-95"
              >
                <Upload size={13} />
                Browse Device / Choose Photos
              </label>
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                type="url"
                placeholder="https://images.unsplash.com/... or company CDN link"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddUrl();
                  }
                }}
                className="h-10 flex-1 rounded-xl border border-border bg-background px-3 text-[12px] outline-none focus:border-[#9a711f]"
              />
              <button
                type="button"
                onClick={handleAddUrl}
                className="h-10 rounded-xl bg-[#173e49] px-4 text-[11px] font-bold text-white hover:bg-[#205160] transition flex items-center gap-1.5 shrink-0"
              >
                <Plus size={14} /> Add to Queue
              </button>
            </div>
          )}

          {/* Selected Photos Queue List */}
          {queue.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-bold text-foreground flex items-center gap-1.5">
                  <CheckCircle2 size={14} className="text-[#2e7c67]" />
                  Selected Photographs ({queue.length})
                </span>
                <button
                  type="button"
                  onClick={openFilePicker}
                  className="text-[11px] font-bold text-[#9a711f] hover:underline flex items-center gap-1"
                >
                  <Plus size={12} /> Add more photos
                </button>
              </div>

              <div className="grid gap-2.5 max-h-56 overflow-y-auto pr-1">
                {queue.map((item, index) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 rounded-xl border border-border bg-card p-2.5 transition hover:border-muted-foreground/40"
                  >
                    {/* Thumbnail */}
                    <div className="size-14 shrink-0 overflow-hidden rounded-lg bg-black/5 flex items-center justify-center border border-border">
                      {item.fileData || item.url ? (
                        <img
                          src={item.fileData || item.url}
                          alt={item.fileName}
                          className="size-full object-cover"
                        />
                      ) : (
                        <ImageIcon size={18} className="text-muted-foreground" />
                      )}
                    </div>

                    {/* Metadata & Caption Input */}
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-foreground truncate max-w-[200px] sm:max-w-xs">
                          {index + 1}. {item.fileName}
                        </span>
                        <span className="font-mono text-[10px] text-muted-foreground shrink-0">
                          {item.fileSizeText}
                        </span>
                      </div>
                      <input
                        type="text"
                        placeholder="Progress caption (e.g. Ceiling framing complete)..."
                        value={item.caption}
                        onChange={(e) => handleUpdateItemCaption(item.id, e.target.value)}
                        className="h-7 w-full rounded-lg border border-border/80 bg-background px-2 text-[11px] outline-none focus:border-[#9a711f]"
                      />
                    </div>

                    {/* Remove button */}
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(item.id)}
                      className="p-1.5 text-muted-foreground hover:text-rose-600 rounded-lg hover:bg-rose-50 transition shrink-0"
                      title="Remove photograph"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Batch Metadata Controls */}
          <div className="rounded-xl border border-border/80 bg-muted/20 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-foreground">
                Batch Metadata (Applies to all selected photos)
              </span>
              {queue.length > 0 && (
                <button
                  type="button"
                  onClick={handleApplyBatchMetadata}
                  className="text-[10px] font-bold text-[#173e49] hover:underline"
                >
                  Apply to all photos
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Stage */}
              <label className="block">
                <span className="mb-1 block text-[10px] font-bold flex items-center gap-1 text-muted-foreground">
                  <Layers size={11} /> Project Stage
                </span>
                <select
                  value={batchStage}
                  onChange={(e) => setBatchStage(e.target.value)}
                  className="h-8 w-full rounded-lg border border-border bg-background px-2 text-[10px] font-medium outline-none focus:border-[#9a711f]"
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
                <span className="mb-1 block text-[10px] font-bold flex items-center gap-1 text-muted-foreground">
                  <Tag size={11} /> Category
                </span>
                <select
                  value={batchCategory}
                  onChange={(e) => setBatchCategory(e.target.value as PhotoCategory)}
                  className="h-8 w-full rounded-lg border border-border bg-background px-2 text-[10px] font-medium outline-none focus:border-[#9a711f]"
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
                <span className="mb-1 block text-[10px] font-bold flex items-center gap-1 text-muted-foreground">
                  <Calendar size={11} /> Date Captured
                </span>
                <input
                  type="date"
                  value={batchDate}
                  onChange={(e) => setBatchDate(e.target.value)}
                  className="h-8 w-full rounded-lg border border-border bg-background px-2 text-[10px] font-medium outline-none focus:border-[#9a711f]"
                />
              </label>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between gap-3 pt-3 border-t border-border shrink-0">
            <span className="text-[11px] text-muted-foreground font-medium">
              {uploadProgressText || (queue.length > 0 ? `${queue.length} photograph${queue.length > 1 ? 's' : ''} ready` : 'No photos selected yet')}
            </span>

            <div className="flex items-center gap-2">
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
                disabled={isSubmitting || queue.length === 0}
                className="rounded-xl bg-[#173e49] px-5 py-2 text-[11px] font-bold text-white hover:bg-[#205160] transition flex items-center gap-2 shadow-sm disabled:opacity-50"
              >
                <Upload size={13} />
                {isSubmitting
                  ? (uploadProgressText || 'Uploading...')
                  : queue.length > 1
                    ? `Upload ${queue.length} Site Photographs`
                    : 'Upload Site Photograph'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
