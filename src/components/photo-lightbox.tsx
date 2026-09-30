import { useEffect, useState } from 'react';
import {
  X,
  Download,
  Trash2,
  Calendar,
  User,
  Tag,
  Maximize2,
  Minimize2,
  Layers,
  AlertTriangle,
} from 'lucide-react';
import type { SitePhoto, PhotoCategory } from '@/data/projects';
import { formatFullDate } from '@/lib/date';

interface PhotoLightboxProps {
  photo: SitePhoto;
  projectName?: string;
  projectCode?: string;
  canDelete?: boolean;
  onClose: () => void;
  onDelete?: (photoId: string) => void;
}

const categoryStyles: Record<PhotoCategory, { bg: string; text: string; border: string }> = {
  Progress: { bg: 'bg-[#e4f1ec]', text: 'text-[#2e7c67]', border: 'border-[#cbe4d9]' },
  'Snag / Issue': { bg: 'bg-[#fae5e1]', text: 'text-[#b2473d]', border: 'border-[#f0c8c2]' },
  Milestone: { bg: 'bg-[#f8edcf]', text: 'text-[#9a711f]', border: 'border-[#eadcb1]' },
  'Before / After': { bg: 'bg-[#e8f1f5]', text: 'text-[#2c6e8a]', border: 'border-[#c6dbe5]' },
  Inspection: { bg: 'bg-[#f0eaf7]', text: 'text-[#6b3ba6]', border: 'border-[#dccbe8]' },
  General: { bg: 'bg-[#eef0ed]', text: 'text-[#69716b]', border: 'border-[#d9ded8]' },
};

export function PhotoLightbox({
  photo,
  projectName,
  projectCode,
  canDelete = false,
  onClose,
  onDelete,
}: PhotoLightboxProps) {
  const [zoomed, setZoomed] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (confirmDelete) {
          setConfirmDelete(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [confirmDelete, onClose]);

  const catStyle = photo.category && categoryStyles[photo.category]
    ? categoryStyles[photo.category]
    : categoryStyles.General;

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = photo.url;
    link.download = `${projectCode || 'project'}-site-photo-${photo.takenDate || 'current'}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    setIsDeleting(true);
    try {
      await onDelete(photo.id);
      onClose();
    } catch (e) {
      console.error(e);
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/90 backdrop-blur-md text-white animate-in fade-in duration-200">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-black/40">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              {projectCode && (
                <span className="font-mono text-[11px] font-bold text-[#d19b35] tracking-wider uppercase">
                  {projectCode}
                </span>
              )}
              {projectName && (
                <span className="text-[13px] font-medium text-white/90 truncate max-w-[260px] md:max-w-md">
                  {projectName}
                </span>
              )}
            </div>
            <span className="text-[11px] text-white/60">
              Site Photograph • {photo.takenDate ? formatFullDate(photo.takenDate) : 'Current'}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setZoomed(!zoomed)}
            title={zoomed ? 'Fit to screen' : 'Zoom in'}
            className="grid size-9 place-items-center rounded-xl bg-white/10 hover:bg-white/20 text-white/90 transition"
          >
            {zoomed ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>

          <button
            type="button"
            onClick={handleDownload}
            title="Download photograph"
            className="grid size-9 place-items-center rounded-xl bg-white/10 hover:bg-white/20 text-white/90 transition"
          >
            <Download size={16} />
          </button>

          {canDelete && onDelete && (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              title="Delete photograph"
              className="grid size-9 place-items-center rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 transition"
            >
              <Trash2 size={16} />
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            title="Close (Esc)"
            className="grid size-9 place-items-center rounded-xl bg-white/15 hover:bg-white/30 text-white transition ml-2"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Main Image Area */}
      <div className="relative flex-1 overflow-auto flex items-center justify-center p-4 md:p-8">
        <img
          src={photo.url}
          alt={photo.caption || 'Site photograph'}
          onClick={() => setZoomed(!zoomed)}
          className={`transition-all duration-200 cursor-pointer object-contain rounded-lg shadow-2xl ${
            zoomed ? 'max-w-none scale-125' : 'max-h-[75vh] max-w-full'
          }`}
        />
      </div>

      {/* Bottom Metadata Drawer */}
      <div className="border-t border-white/10 bg-black/60 px-6 py-4">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              {photo.category && (
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${catStyle.bg} ${catStyle.text} ${catStyle.border}`}
                >
                  <Tag size={10} />
                  {photo.category}
                </span>
              )}
              {photo.stage && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-white/10 text-white/90 border border-white/15">
                  <Layers size={10} />
                  {photo.stage}
                </span>
              )}
            </div>
            <p className="text-[14px] font-medium text-white/95 leading-snug">
              {photo.caption || 'No caption provided'}
            </p>
          </div>

          <div className="flex items-center gap-5 text-[11px] text-white/60 shrink-0">
            {photo.takenDate && (
              <div className="flex items-center gap-1.5">
                <Calendar size={13} className="text-[#d19b35]" />
                <span>Captured: <strong className="text-white/90">{formatFullDate(photo.takenDate)}</strong></span>
              </div>
            )}
            {photo.uploadedBy && (
              <div className="flex items-center gap-1.5">
                <User size={13} className="text-[#3d9a7e]" />
                <span>Uploaded by: <strong className="text-white/90">{photo.uploadedBy}</strong> ({photo.role || 'Team'})</span>
              </div>
            )}
            {photo.fileSize && (
              <span className="text-[10px] text-white/40 font-mono">
                {Math.round(photo.fileSize / 1024)} KB
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/20 bg-[#173e49] p-6 text-white shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400">
              <span className="grid size-10 place-items-center rounded-xl bg-rose-500/20 text-rose-300">
                <Trash2 size={20} />
              </span>
              <h3 className="text-[16px] font-bold text-white">Delete Site Photograph?</h3>
            </div>
            <p className="mt-3 text-[12px] leading-relaxed text-white/70">
              Are you sure you want to permanently delete this site photograph? The physical image file will be unlinked from the server and cannot be recovered.
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setConfirmDelete(false)}
                className="rounded-xl border border-white/20 px-4 py-2 text-[11px] font-bold text-white/80 hover:bg-white/10 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDelete}
                className="rounded-xl bg-rose-600 px-4 py-2 text-[11px] font-bold text-white hover:bg-rose-500 transition flex items-center gap-2"
              >
                {isDeleting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
