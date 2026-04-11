import { useState, useRef } from 'react';
import { CloseIcon, CameraIcon } from './Icons';
import styles from './MediaCollage.module.css';

export interface MediaItem {
  id: number;
  url: string;
  type: 'image' | 'video';
  caption?: string | null;
  displayOrder?: number;
}

interface MediaCollageProps {
  media: MediaItem[];
  maxDisplay?: number;
}

export default function MediaCollage({ media, maxDisplay = 4 }: MediaCollageProps) {
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  if (!media || media.length === 0) return null;

  const sorted = [...media].sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
  const displayed = sorted.slice(0, maxDisplay);
  const remaining = sorted.length - maxDisplay;

  const gridClass =
    displayed.length === 1 ? styles.grid1 :
    displayed.length === 2 ? styles.grid2 :
    displayed.length === 3 ? styles.grid3 :
    styles.grid4;

  const openViewer = (index: number) => {
    setViewerIndex(index);
    setViewerOpen(true);
  };

  return (
    <>
      <div className={styles.collage} onClick={() => openViewer(0)}>
        <div className={`${styles.grid} ${gridClass}`}>
          {displayed.map((item, i) => (
            <div
              key={item.id}
              className={styles.mediaItem}
              onClick={(e) => { e.stopPropagation(); openViewer(i); }}
            >
              {item.type === 'video' ? (
                <>
                  <video src={item.url} muted preload="metadata" />
                  <span className={styles.videoIndicator}>▶ Video</span>
                </>
              ) : (
                <img src={item.url} alt={item.caption || ''} loading="lazy" />
              )}
              {i === maxDisplay - 1 && remaining > 0 && (
                <div className={styles.moreOverlay}>+{remaining}</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {viewerOpen && (
        <MediaViewer
          media={sorted}
          startIndex={viewerIndex}
          onClose={() => setViewerOpen(false)}
        />
      )}
    </>
  );
}

interface MediaViewerProps {
  media: MediaItem[];
  startIndex: number;
  onClose: () => void;
}

function MediaViewer({ media, startIndex, onClose }: MediaViewerProps) {
  const [index, setIndex] = useState(startIndex);
  const touchStart = useRef<number>(0);

  const item = media[index];

  const prev = () => setIndex((i) => (i > 0 ? i - 1 : media.length - 1));
  const next = () => setIndex((i) => (i < media.length - 1 ? i + 1 : 0));

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStart.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const diff = touchStart.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) next();
      else prev();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') prev();
    else if (e.key === 'ArrowRight') next();
    else if (e.key === 'Escape') onClose();
  };

  return (
    <div className={styles.viewer} onKeyDown={handleKeyDown} tabIndex={0} ref={(el) => el?.focus()}>
      <div className={styles.viewerHeader}>
        <span className={styles.viewerCounter}>{index + 1} / {media.length}</span>
        <button className={styles.viewerClose} onClick={onClose}><CloseIcon size={20} /></button>
      </div>

      <div
        className={styles.viewerBody}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {media.length > 1 && (
          <button className={`${styles.viewerNav} ${styles.viewerPrev}`} onClick={prev}>‹</button>
        )}

        {item.type === 'video' ? (
          <video className={styles.viewerVideo} src={item.url} controls autoPlay />
        ) : (
          <img className={styles.viewerMedia} src={item.url} alt={item.caption || ''} />
        )}

        {media.length > 1 && (
          <button className={`${styles.viewerNav} ${styles.viewerNext}`} onClick={next}>›</button>
        )}
      </div>

      {item.caption && (
        <div className={styles.viewerCaption}>{item.caption}</div>
      )}
    </div>
  );
}

/* Re-usable upload component */
interface MediaUploaderProps {
  files: File[];
  onFilesChange: (files: File[]) => void;
  existingMedia?: MediaItem[];
  onRemoveExisting?: (id: number) => void;
  maxFiles?: number;
  label?: string;
}

export function MediaUploader({
  files,
  onFilesChange,
  existingMedia = [],
  onRemoveExisting,
  maxFiles = 10,
  label = 'Add Photos / Videos',
}: MediaUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const newFiles = Array.from(e.target.files);
    const totalExisting = existingMedia.length + files.length;
    const allowed = newFiles.slice(0, maxFiles - totalExisting);
    onFilesChange([...files, ...allowed]);
    // Reset input so same file can be re-selected
    e.target.value = '';
  };

  const removeFile = (index: number) => {
    onFilesChange(files.filter((_, i) => i !== index));
  };

  const totalCount = existingMedia.length + files.length;

  return (
    <div>
      <label style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-gray-700)', display: 'block', marginBottom: 'var(--space-2)' }}>
        {label}
      </label>

      {totalCount < maxFiles && (
        <div className={styles.uploadArea} onClick={() => inputRef.current?.click()}>
          <div className={styles.uploadIcon}><CameraIcon size={32} /></div>
          <div className={styles.uploadText}>
            Tap to select photos or videos ({totalCount}/{maxFiles})
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
        </div>
      )}

      {(existingMedia.length > 0 || files.length > 0) && (
        <div className={styles.uploadPreviewGrid}>
          {existingMedia.map((item) => (
            <div key={item.id} className={styles.uploadPreview}>
              {item.type === 'video' ? (
                <video src={item.url} muted preload="metadata" />
              ) : (
                <img src={item.url} alt={item.caption || ''} />
              )}
              {onRemoveExisting && (
                <button className={styles.removeBtn} onClick={() => onRemoveExisting(item.id)}><CloseIcon size={14} /></button>
              )}
            </div>
          ))}
          {files.map((file, i) => (
            <div key={`new-${i}`} className={styles.uploadPreview}>
              {file.type.startsWith('video/') ? (
                <video src={URL.createObjectURL(file)} muted preload="metadata" />
              ) : (
                <img src={URL.createObjectURL(file)} alt="" />
              )}
              <button className={styles.removeBtn} onClick={() => removeFile(i)}><CloseIcon size={14} /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
