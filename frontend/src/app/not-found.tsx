import { ButtonLink } from '@/components/ui/Button';

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-24 text-center">
      <p aria-hidden className="text-gradient text-6xl font-black">
        404
      </p>
      <h1 className="mb-2 mt-4 text-xl font-bold text-white">Page Not Found</h1>
      <p className="mb-6 text-sm text-brand-text-muted">
        The page you&apos;re looking for doesn&apos;t exist or may have been moved.
      </p>
      <ButtonLink href="/">Back to Home</ButtonLink>
    </div>
  );
}
