import { useRef, useState } from 'react';
import { ImagePlus, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { api, apiErrorMessage } from '@/lib/api';
import type { ProductImage } from '@/types/product';

interface ImageUploadProps {
  images: ProductImage[];
  onChange: (images: ProductImage[]) => void;
  max?: number;
}

/** Wraps POST /uploads/image (multipart, field name "image", returns {url, publicId}). Requires
 * real Cloudinary credentials in backend/.env — uploads 400 until those are set. */
export function ImageUpload({ images, onChange, max = 8 }: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setIsUploading(true);
    try {
      const uploaded: ProductImage[] = [];
      for (const file of Array.from(files).slice(0, Math.max(0, max - images.length))) {
        const formData = new FormData();
        formData.append('image', file);
        const res = await api.post<{ data: ProductImage }>('/uploads/image', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        uploaded.push(res.data.data);
      }
      onChange([...images, ...uploaded]);
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Image upload failed'));
    } finally {
      setIsUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  function removeAt(index: number) {
    onChange(images.filter((_, i) => i !== index));
  }

  return (
    <div className="flex flex-wrap gap-3">
      {images.map((img, i) => (
        <div
          key={img.publicId ?? img.url}
          className="group relative h-20 w-20 overflow-hidden rounded-lg border border-slate-200"
        >
          <img src={img.url} alt="" className="h-full w-full object-cover" />
          <button
            type="button"
            onClick={() => removeAt(i)}
            aria-label={`Remove image ${i + 1}`}
            className="absolute right-1 top-1 rounded-full bg-black/60 p-0.5 text-white opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
          >
            <X className="h-3 w-3" aria-hidden />
          </button>
        </div>
      ))}
      {images.length < max && (
        <button
          type="button"
          disabled={isUploading}
          onClick={() => inputRef.current?.click()}
          aria-label="Add image"
          className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-slate-300 text-slate-400 transition-colors hover:border-brand-accent hover:text-brand-accent disabled:opacity-60"
        >
          {isUploading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <ImagePlus className="h-5 w-5" />
          )}
          <span className="text-[10px]">Add</span>
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
}
