import Image from 'next/image';
import { cn } from '@/lib/cn';

/**
 * Fills its (relatively positioned) parent with a banner's image. When the banner has a separate
 * mobile image, that one is shown below the `md` breakpoint and the main one above it; the one
 * that isn't showing never downloads (next/image lazy-loads anything display:none).
 */
export function BannerImage({
  image,
  mobileImage,
  alt = '',
  sizes,
  priority,
  className,
}: {
  image: string;
  mobileImage?: string;
  alt?: string;
  sizes: string;
  priority?: boolean;
  className?: string;
}) {
  if (!mobileImage) {
    return <Image src={image} alt={alt} fill sizes={sizes} priority={priority} className={cn('object-cover', className)} />;
  }
  return (
    <>
      <Image src={mobileImage} alt={alt} fill sizes="100vw" className={cn('object-cover md:hidden', className)} />
      <Image
        src={image}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        className={cn('hidden object-cover md:block', className)}
      />
    </>
  );
}
