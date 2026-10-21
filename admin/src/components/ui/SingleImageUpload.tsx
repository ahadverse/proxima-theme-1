import { useRef, useState } from 'react';
import { ImagePlus, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { api, apiErrorMessage } from '@/lib/api';
import { cn } from '@/lib/cn';

interface SingleImageUploadProps {
  value?: string | null;
  onChange: (url: string) => void;
  /** Size of the preview / drop box. Defaults to a small square; banners and covers pass a wide one. */
  boxClassName?: string;
}

/** For single-string image fields (Category.image, Brand.logo) — ImageUpload is for Product's
 * {url, publicId}[] arrays instead. */
export function SingleImageUpload({ value, onChange, boxClassName = 'h-16 w-16' }: SingleImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      const res = await api.post<{ data: { url: string } }>('/uploads/image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      onChange(res.data.data.url);
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Image upload failed'));
    } finally {
      setIsUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div className="flex items-center gap-3">
      {value ? (
        <div className={cn('group relative overflow-hidden rounded-lg border border-slate-200', boxClassName)}>
          <img src={value} alt="" className="h-full w-full object-cover" />
          <button
            type="button"
            onClick={() => onChange('')}
            aria-label="Remove image"
            className="absolute right-1 top-1 rounded-full bg-black/60 p-0.5 text-white opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
          >
            <X className="h-3 w-3" aria-hidden />
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={isUploading}
          onClick={() => inputRef.current?.click()}
          aria-label="Add image"
          className={cn(
            'flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 text-slate-400 transition-colors hover:border-brand-accent hover:text-brand-accent disabled:opacity-60',
            boxClassName
          )}
        >
          {isUploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ImagePlus className="h-4 w-4" />
          )}
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
    </div>
  );
}
