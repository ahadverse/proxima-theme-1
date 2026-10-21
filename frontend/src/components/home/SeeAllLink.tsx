import Link from 'next/link';

/** The white "See All" button at the right of a section heading. */
export function SeeAllLink({ href }: { href: string }) {
  return (
    <Link
      href={href}
      className="inline-flex h-10 items-center rounded-lg bg-white px-5 text-sm font-medium text-slate-900 transition-all hover:bg-brand-accent hover:text-black active:scale-95 motion-reduce:transition-none"
    >
      See All
    </Link>
  );
}
